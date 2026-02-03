import { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { ImageIcon, Music, User, MousePointer2, Loader2, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';

interface FileUploaderProps {
  type: 'background' | 'audio' | 'avatar' | 'cursor';
  currentUrl?: string | null;
  onUpload: (url: string) => void;
  onRemove?: () => void;
}

// Secure upload configuration with size limits and allowed MIME types
const typeConfig = {
  background: {
    icon: ImageIcon,
    label: 'Background',
    accept: 'image/jpeg,image/png,image/webp,image/gif,video/mp4,video/quicktime',
    folder: 'backgrounds',
    color: 'text-primary',
    maxSize: 15 * 1024 * 1024, // 15MB for backgrounds
    allowedMimes: ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'video/mp4', 'video/quicktime'],
  },
  audio: {
    icon: Music,
    label: 'Audio',
    accept: 'audio/mpeg,audio/mp3,audio/wav,audio/ogg,audio/aac',
    folder: 'audio',
    color: 'text-green-400',
    maxSize: 25 * 1024 * 1024, // 25MB for audio
    allowedMimes: ['audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/ogg', 'audio/aac', 'audio/x-m4a'],
  },
  avatar: {
    icon: User,
    label: 'Profile Avatar',
    accept: 'image/jpeg,image/png,image/webp,image/gif',
    folder: 'avatars',
    color: 'text-pink-400',
    maxSize: 5 * 1024 * 1024, // 5MB for avatars
    allowedMimes: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
  },
  cursor: {
    icon: MousePointer2,
    label: 'Custom Cursor',
    accept: 'image/png,image/gif',
    folder: 'cursors',
    color: 'text-purple-400',
    maxSize: 1 * 1024 * 1024, // 1MB for cursors
    allowedMimes: ['image/png', 'image/gif', 'image/x-icon'],
  },
};

// Sanitize filename to prevent path traversal and injection
function sanitizeFilename(filename: string): string {
  // Remove path components and dangerous characters
  const base = filename.split('/').pop()?.split('\\').pop() || 'file';
  // Only allow alphanumeric, dash, underscore, and dot
  return base.replace(/[^a-zA-Z0-9._-]/g, '_').substring(0, 100);
}

// Generate cryptographically random filename
function generateSecureFilename(originalName: string): string {
  const ext = originalName.split('.').pop()?.toLowerCase() || 'bin';
  const safeExt = ext.replace(/[^a-z0-9]/g, '').substring(0, 10);
  // Use crypto for random bytes, fallback to timestamp + random
  const randomPart = crypto.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  return `${randomPart}.${safeExt}`;
}

export function FileUploader({ type, currentUrl, onUpload, onRemove }: FileUploaderProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isUploading, setIsUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const config = typeConfig[type];
  const Icon = config.icon;

  const lowerUrl = (currentUrl || '').toLowerCase();
  const isCurFile = type === 'cursor' && lowerUrl.endsWith('.cur');
  const isAniFile = type === 'cursor' && lowerUrl.endsWith('.ani');
  const isNonPreviewableCursor = isCurFile || isAniFile;

  const handleUpload = async (file: File) => {
    if (!user) {
      toast({ title: 'Not authenticated', variant: 'destructive' });
      return;
    }

    // Validate file size
    if (file.size > config.maxSize) {
      const maxMB = Math.round(config.maxSize / (1024 * 1024));
      toast({ title: `File too large. Maximum ${maxMB}MB allowed.`, variant: 'destructive' });
      return;
    }

    // Validate MIME type strictly
    if (!config.allowedMimes.includes(file.type)) {
      toast({ title: 'Invalid file type. Please use an allowed format.', variant: 'destructive' });
      return;
    }

    // Additional validation: check file signature (magic bytes) for images
    if (file.type.startsWith('image/')) {
      const isValid = await validateImageSignature(file);
      if (!isValid) {
        toast({ title: 'Invalid image file. File appears to be corrupted or spoofed.', variant: 'destructive' });
        return;
      }
    }

    setIsUploading(true);
    try {
      // Generate secure random filename to prevent enumeration
      const fileName = generateSecureFilename(file.name);
      const filePath = `${user.id}/${config.folder}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('profile-assets')
        .upload(filePath, file, { 
          upsert: true,
          contentType: file.type, // Explicitly set content type
        });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('profile-assets')
        .getPublicUrl(filePath);

      onUpload(publicUrl);
      toast({ title: `${config.label} uploaded!` });
    } catch (error: any) {
      console.error('Upload error:', error);
      toast({ title: 'Upload failed. Please try again.', variant: 'destructive' });
    } finally {
      setIsUploading(false);
    }
  };

  // Validate image file signature (magic bytes)
  async function validateImageSignature(file: File): Promise<boolean> {
    try {
      const buffer = await file.slice(0, 12).arrayBuffer();
      const bytes = new Uint8Array(buffer);
      
      // Check common image signatures
      // JPEG: FF D8 FF
      if (bytes[0] === 0xFF && bytes[1] === 0xD8 && bytes[2] === 0xFF) return true;
      // PNG: 89 50 4E 47
      if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4E && bytes[3] === 0x47) return true;
      // GIF: 47 49 46 38
      if (bytes[0] === 0x47 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x38) return true;
      // WebP: 52 49 46 46 ... 57 45 42 50
      if (bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46 &&
          bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50) return true;
      // ICO: 00 00 01 00
      if (bytes[0] === 0x00 && bytes[1] === 0x00 && bytes[2] === 0x01 && bytes[3] === 0x00) return true;
      
      return false;
    } catch {
      return false;
    }
  }

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleUpload(e.dataTransfer.files[0]);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleUpload(e.target.files[0]);
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className={`text-sm font-medium ${config.color}`}>{config.label}</span>
        {currentUrl && onRemove && (
          <Button variant="ghost" size="sm" onClick={onRemove} className="h-6 px-2 text-xs">
            <X className="w-3 h-3 mr-1" />
            Remove
          </Button>
        )}
      </div>
      
      <motion.div
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        className={`
          relative cursor-pointer rounded-xl border-2 border-dashed 
          transition-all duration-200 overflow-hidden
          ${dragActive 
            ? 'border-primary bg-primary/10' 
            : currentUrl 
              ? 'border-border bg-secondary/20' 
              : 'border-border/50 hover:border-border bg-secondary/10'
          }
        `}
      >
        <input
          ref={inputRef}
          type="file"
          accept={config.accept}
          onChange={handleChange}
          className="hidden"
        />

        {currentUrl && type !== 'audio' && !isNonPreviewableCursor ? (
          <div className={`relative ${type === 'avatar' ? 'aspect-square' : type === 'cursor' ? 'aspect-square' : 'aspect-video'}`}>
            {type === 'background' && (currentUrl.includes('.mp4') || currentUrl.includes('.mov') || currentUrl.includes('.MOV')) ? (
              <video src={currentUrl} className="w-full h-full object-cover" muted autoPlay loop />
            ) : type === 'cursor' ? (
              <div className="w-full h-full flex items-center justify-center bg-secondary/30 p-4">
                <img src={currentUrl} alt={config.label} className="max-w-full max-h-full object-contain" style={{ imageRendering: 'pixelated' }} />
              </div>
            ) : (
              <img src={currentUrl} alt={config.label} className="w-full h-full object-cover" />
            )}
            <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
              <p className="text-xs text-white">Click to change</p>
            </div>
          </div>
        ) : currentUrl && isNonPreviewableCursor ? (
          <div className="py-8 px-4 flex flex-col items-center justify-center text-center">
            <Icon className={`w-8 h-8 mb-2 ${config.color}`} />
            {isAniFile ? (
              <>
                <p className="text-xs text-destructive font-medium">⚠️ .ani wird NICHT unterstützt</p>
                <p className="mt-1 text-[10px] text-muted-foreground">
                  Moderne Browser unterstützen .ani nicht. Bitte verwende GIF oder PNG!
                </p>
              </>
            ) : (
              <>
                <p className="text-xs text-primary font-medium">Cursor uploaded ✓</p>
                <p className="mt-1 text-[10px] text-muted-foreground">
                  .cur funktioniert — für animierte Cursor nutze GIF/PNG
                </p>
              </>
            )}
          </div>
        ) : (
          <div className="py-8 px-4 flex flex-col items-center justify-center text-center">
            {isUploading ? (
              <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
            ) : (
              <>
                <Icon className={`w-8 h-8 mb-2 ${config.color} opacity-50`} />
                <p className="text-xs text-muted-foreground">
                  {currentUrl && type === 'audio' ? 'Audio uploaded ✓' : 'Click to upload a file'}
                </p>
              </>
            )}
          </div>
        )}
      </motion.div>
    </div>
  );
}
