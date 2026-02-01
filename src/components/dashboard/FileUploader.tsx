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

const typeConfig = {
  background: {
    icon: ImageIcon,
    label: 'Background',
    accept: 'image/*,video/mp4,video/quicktime,.mov',
    folder: 'backgrounds',
    color: 'text-primary',
  },
  audio: {
    icon: Music,
    label: 'Audio',
    accept: 'audio/*',
    folder: 'audio',
    color: 'text-green-400',
  },
  avatar: {
    icon: User,
    label: 'Profile Avatar',
    accept: 'image/*',
    folder: 'avatars',
    color: 'text-pink-400',
  },
  cursor: {
    icon: MousePointer2,
    label: 'Custom Cursor',
    accept: 'image/png,image/gif,.cur,.ani',
    folder: 'cursors',
    color: 'text-purple-400',
  },
};

export function FileUploader({ type, currentUrl, onUpload, onRemove }: FileUploaderProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isUploading, setIsUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const config = typeConfig[type];
  const Icon = config.icon;

  const lowerUrl = (currentUrl || '').toLowerCase();
  const isNonPreviewableCursor =
    type === 'cursor' && (lowerUrl.endsWith('.cur') || lowerUrl.endsWith('.ani'));

  const handleUpload = async (file: File) => {
    if (!user) {
      toast({ title: 'Not authenticated', variant: 'destructive' });
      return;
    }

    setIsUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}.${fileExt}`;
      const filePath = `${user.id}/${config.folder}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('profile-assets')
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('profile-assets')
        .getPublicUrl(filePath);

      onUpload(publicUrl);
      toast({ title: `${config.label} uploaded!` });
    } catch (error: any) {
      console.error('Upload error:', error);
      toast({ title: error.message || 'Upload failed', variant: 'destructive' });
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
            <p className="text-xs text-primary font-medium">Cursor uploaded ✓</p>
            <p className="mt-1 text-[10px] text-muted-foreground">
              .cur/.ani preview not supported — use GIF/PNG for animated cursors
            </p>
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
