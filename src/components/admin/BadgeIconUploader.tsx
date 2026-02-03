import { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { Award, Loader2, Upload, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';

interface BadgeIconUploaderProps {
  currentUrl?: string;
  onUpload: (url: string) => void;
  onRemove?: () => void;
  color?: string;
}

export function BadgeIconUploader({ currentUrl, onUpload, onRemove, color = '#8B5CF6' }: BadgeIconUploaderProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isUploading, setIsUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Allowed MIME types for badge icons
  const ALLOWED_MIMES = ['image/png', 'image/jpeg', 'image/webp', 'image/gif', 'image/svg+xml'];
  const MAX_SIZE = 3 * 1024 * 1024; // 3MB for badge icons

  // Validate image file signature (magic bytes)
  async function validateImageSignature(file: File): Promise<boolean> {
    try {
      const buffer = await file.slice(0, 12).arrayBuffer();
      const bytes = new Uint8Array(buffer);
      
      // JPEG: FF D8 FF
      if (bytes[0] === 0xFF && bytes[1] === 0xD8 && bytes[2] === 0xFF) return true;
      // PNG: 89 50 4E 47
      if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4E && bytes[3] === 0x47) return true;
      // GIF: 47 49 46 38
      if (bytes[0] === 0x47 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x38) return true;
      // WebP: 52 49 46 46 ... 57 45 42 50
      if (bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46 &&
          bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50) return true;
      // SVG (text-based, check for XML/svg tag) - allow if MIME is svg
      if (file.type === 'image/svg+xml') return true;
      
      return false;
    } catch {
      return false;
    }
  }

  // Generate secure filename
  function generateSecureFilename(originalName: string): string {
    const ext = originalName.split('.').pop()?.toLowerCase() || 'png';
    const safeExt = ext.replace(/[^a-z0-9]/g, '').substring(0, 10);
    const randomPart = crypto.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    return `badge-${randomPart}.${safeExt}`;
  }

  const handleUpload = async (file: File) => {
    if (!user) {
      toast({ title: 'Not authenticated', variant: 'destructive' });
      return;
    }

    // Validate MIME type strictly
    if (!ALLOWED_MIMES.includes(file.type)) {
      toast({ title: 'Only PNG, JPEG, WebP, GIF, or SVG allowed', variant: 'destructive' });
      return;
    }

    // Validate file size
    if (file.size > MAX_SIZE) {
      toast({ title: 'File size must be under 3MB', variant: 'destructive' });
      return;
    }

    // Validate file signature (magic bytes)
    const isValid = await validateImageSignature(file);
    if (!isValid) {
      toast({ title: 'Invalid image file', variant: 'destructive' });
      return;
    }

    setIsUploading(true);
    try {
      const fileName = generateSecureFilename(file.name);
      const filePath = `${user.id}/badge-icons/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('profile-assets')
        .upload(filePath, file, { 
          upsert: true,
          contentType: file.type,
        });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('profile-assets')
        .getPublicUrl(filePath);

      onUpload(publicUrl);
      toast({ title: 'Badge icon uploaded!' });
    } catch (error: any) {
      console.error('Upload error:', error);
      toast({ title: 'Upload failed. Please try again.', variant: 'destructive' });
    } finally {
      setIsUploading(false);
    }
  };

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

  const handleRemove = () => {
    if (onRemove) {
      onRemove();
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label>Badge Icon</Label>
        {currentUrl && onRemove && (
          <Button variant="ghost" size="sm" onClick={handleRemove} className="h-6 px-2 text-xs">
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
          accept="image/*"
          onChange={handleChange}
          className="hidden"
        />

        <div className="p-4 flex items-center gap-4">
          {/* Preview */}
          <div 
            className="w-16 h-16 rounded-lg flex items-center justify-center flex-shrink-0"
            style={{ backgroundColor: `${color}20` }}
          >
            {isUploading ? (
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            ) : currentUrl ? (
              <img src={currentUrl} alt="Badge icon" className="w-10 h-10 object-contain" />
            ) : (
              <Award className="w-8 h-8" style={{ color }} />
            )}
          </div>

          {/* Upload text */}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-foreground">
              {currentUrl ? 'Click to change icon' : 'Upload badge icon'}
            </p>
            <p className="text-xs text-muted-foreground">
              PNG, JPG, GIF or SVG (max 2MB)
            </p>
          </div>

          {/* Upload icon */}
          <Upload className="w-5 h-5 text-muted-foreground flex-shrink-0" />
        </div>
      </motion.div>
    </div>
  );
}
