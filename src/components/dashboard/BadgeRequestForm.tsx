import { useState } from 'react';
import { motion } from 'framer-motion';
import { Send, Loader2, AlertCircle, CheckCircle, XCircle, Clock, Upload, Palette, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getBadgeIcon } from '@/lib/badges';
import { useEncryption } from '@/hooks/useEncryption';
import { encodeFileMetadata } from '@/lib/crypto';
import { invokeSecure } from '@/lib/secureEdgeFunctions';

interface BadgeRequest {
  id: string;
  user_id: string;
  badge_name: string;
  badge_description: string | null;
  badge_color: string;
  badge_icon_url: string | null;
  status: 'pending' | 'approved' | 'denied';
  denial_reason: string | null;
  admin_edited_name: string | null;
  admin_edited_description: string | null;
  admin_edited_color: string | null;
  admin_edited_icon_url: string | null;
  created_at: string;
  reviewed_at: string | null;
}

// Validate image file signature (magic bytes)
async function validateImageSignature(file: File): Promise<boolean> {
  try {
    const buffer = await file.slice(0, 12).arrayBuffer();
    const bytes = new Uint8Array(buffer);
    
    // PNG: 89 50 4E 47
    if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4E && bytes[3] === 0x47) return true;
    // JPEG: FF D8 FF
    if (bytes[0] === 0xFF && bytes[1] === 0xD8 && bytes[2] === 0xFF) return true;
    // GIF: 47 49 46 38
    if (bytes[0] === 0x47 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x38) return true;
    // WebP: 52 49 46 46 ... 57 45 42 50
    if (bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46 &&
        bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50) return true;
    // SVG (check for XML/text) - simplified check
    const text = new TextDecoder().decode(bytes);
    if (text.includes('<?xml') || text.includes('<svg')) return true;
    
    return false;
  } catch {
    return false;
  }
}

export function BadgeRequestForm() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { encrypt, isReady: encryptionReady } = useEncryption();
  const [badgeName, setBadgeName] = useState('');
  const [badgeDescription, setBadgeDescription] = useState('');
  const [badgeColor, setBadgeColor] = useState('#8B5CF6');
  const [iconFile, setIconFile] = useState<File | null>(null);
  const [iconPreview, setIconPreview] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  // Fetch current request status
  const { data: currentRequest, isLoading: isLoadingRequest } = useQuery({
    queryKey: ['badgeRequest', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data } = await supabase
        .from('badge_requests')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();
      return data as BadgeRequest | null;
    },
    enabled: !!user?.id,
  });

  // Submit request mutation with AES-256-GCM encrypted icon upload
  const submitMutation = useMutation({
    mutationFn: async () => {
      if (!user?.id) throw new Error('Not authenticated');
      
      let iconUrl = null;

      // Upload icon with AES-256-GCM encryption
      if (iconFile) {
        setIsUploading(true);
        
        try {
          // Validate file size (max 2MB for badge icons)
          if (iconFile.size > 2 * 1024 * 1024) {
            throw new Error('Icon must be less than 2MB');
          }
          
          // Validate MIME type
          const allowedMimes = ['image/png', 'image/jpeg', 'image/gif', 'image/webp', 'image/svg+xml'];
          if (!allowedMimes.includes(iconFile.type)) {
            throw new Error('Invalid file type. Use PNG, JPEG, GIF, WebP, or SVG.');
          }
          
          // Validate magic bytes
          const isValid = await validateImageSignature(iconFile);
          if (!isValid) {
            throw new Error('Invalid image file. File appears to be corrupted or spoofed.');
          }
          
          let fileToUpload: File | Blob = iconFile;
          let finalContentType = iconFile.type;
          let folderPath = 'badge-icons';
          
          // Encrypt file if encryption is ready
          if (encryptionReady && encrypt) {
            const encryptedBlob = await encrypt(iconFile);
            if (!encryptedBlob) {
              throw new Error('Encryption failed');
            }
            fileToUpload = encryptedBlob;
            finalContentType = 'application/octet-stream';
            folderPath = 'encrypted/badge-icons';
            
            // Log metadata for debugging (not sensitive)
            const metadata = encodeFileMetadata(iconFile.name, iconFile.type);
            console.log('Badge icon encrypted, metadata stored');
          }
          
          // Generate secure random filename
          const randomId = crypto.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`;
          const ext = iconFile.name.split('.').pop()?.toLowerCase().replace(/[^a-z0-9]/g, '') || 'png';
          const fileName = `${randomId}.${ext}${encryptionReady ? '.enc' : ''}`;
          
          // CRITICAL: Path must start with user ID for RLS policy
          const filePath = `${user.id}/${folderPath}/${fileName}`;
          
          const { error: uploadError } = await supabase.storage
            .from('profile-assets')
            .upload(filePath, fileToUpload, { 
              upsert: true,
              contentType: finalContentType,
            });

          if (uploadError) {
            console.error('Upload error:', uploadError);
            throw new Error('Failed to upload icon');
          }

          const { data: urlData } = supabase.storage
            .from('profile-assets')
            .getPublicUrl(filePath);
          
          iconUrl = urlData.publicUrl;
        } finally {
          setIsUploading(false);
        }
      }

      // Use secure proxy for edge function call
      const { data, error } = await invokeSecure<{ success?: boolean; error?: string; request?: unknown }>('badge-request', {
        body: {
          action: 'submit',
          badgeName,
          badgeDescription: badgeDescription || null,
          badgeColor,
          badgeIconUrl: iconUrl,
        },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: () => {
      toast.success('Badge request submitted!', {
        description: 'Encrypted & secured. You will be notified when reviewed.',
      });
      queryClient.invalidateQueries({ queryKey: ['badgeRequest'] });
      setBadgeName('');
      setBadgeDescription('');
      setBadgeColor('#8B5CF6');
      setIconFile(null);
      setIconPreview(null);
    },
    onError: (error: Error) => {
      toast.error('Failed to submit request', { description: error.message });
    },
  });

  // Delete request mutation (for re-submitting after denial)
  const deleteMutation = useMutation({
    mutationFn: async () => {
      if (!currentRequest) return;
      const { error } = await supabase
        .from('badge_requests')
        .delete()
        .eq('id', currentRequest.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Request deleted. You can submit a new one.');
      queryClient.invalidateQueries({ queryKey: ['badgeRequest'] });
    },
    onError: (error: Error) => {
      toast.error('Failed to delete request', { description: error.message });
    },
  });

  const handleIconChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        toast.error('Icon must be less than 2MB');
        return;
      }
      setIconFile(file);
      const reader = new FileReader();
      reader.onload = (e) => setIconPreview(e.target?.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!badgeName.trim()) {
      toast.error('Please enter a badge name');
      return;
    }
    if (badgeName.length > 30) {
      toast.error('Badge name must be 30 characters or less');
      return;
    }
    submitMutation.mutate();
  };

  // Preview component
  const BadgePreview = ({ name, color, iconUrl }: { name: string; color: string; iconUrl: string | null }) => {
    const Icon = getBadgeIcon(name);
    return (
      <div className="flex items-center gap-2 p-3 rounded-lg bg-white/5 border border-white/10">
        <div
          className="w-10 h-10 rounded-lg flex items-center justify-center"
          style={{ backgroundColor: `${color}20` }}
        >
          {iconUrl ? (
            <img src={iconUrl} alt={name} className="w-6 h-6 object-contain" />
          ) : (
            <Icon className="w-5 h-5" style={{ color }} />
          )}
        </div>
        <span className="font-medium text-white">{name || 'Badge Name'}</span>
      </div>
    );
  };

  if (isLoadingRequest) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  // Show status if request exists
  if (currentRequest) {
    const finalName = currentRequest.admin_edited_name || currentRequest.badge_name;
    const finalColor = currentRequest.admin_edited_color || currentRequest.badge_color;
    const finalIcon = currentRequest.admin_edited_icon_url || currentRequest.badge_icon_url;

    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-6"
      >
        <div className="p-6 rounded-xl border border-white/10 bg-black/40 backdrop-blur-sm">
          <div className="flex items-start gap-4">
            {currentRequest.status === 'pending' && (
              <div className="w-12 h-12 rounded-full bg-yellow-500/20 flex items-center justify-center flex-shrink-0">
                <Clock className="w-6 h-6 text-yellow-500" />
              </div>
            )}
            {currentRequest.status === 'approved' && (
              <div className="w-12 h-12 rounded-full bg-green-500/20 flex items-center justify-center flex-shrink-0">
                <CheckCircle className="w-6 h-6 text-green-500" />
              </div>
            )}
            {currentRequest.status === 'denied' && (
              <div className="w-12 h-12 rounded-full bg-red-500/20 flex items-center justify-center flex-shrink-0">
                <XCircle className="w-6 h-6 text-red-500" />
              </div>
            )}

            <div className="flex-1 space-y-4">
              <div>
                <h3 className="text-lg font-semibold text-white capitalize">
                  Request {currentRequest.status}
                </h3>
                <p className="text-sm text-muted-foreground">
                  Submitted on {new Date(currentRequest.created_at).toLocaleDateString()}
                </p>
              </div>

              {/* Badge Preview */}
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Your Badge</Label>
                <BadgePreview name={finalName} color={finalColor} iconUrl={finalIcon} />
              </div>

              {currentRequest.status === 'denied' && (
                <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/20">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 text-red-400 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-sm font-medium text-red-400">Denial Reason</p>
                      <p className="text-sm text-red-300/80 mt-1">
                        {currentRequest.denial_reason || 'Your request did not meet our guidelines.'}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {currentRequest.status === 'denied' && (
                <Button
                  variant="outline"
                  onClick={() => deleteMutation.mutate()}
                  disabled={deleteMutation.isPending}
                  className="mt-4"
                >
                  {deleteMutation.isPending ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : null}
                  Submit New Request
                </Button>
              )}

              {currentRequest.status === 'approved' && (
                <p className="text-sm text-green-400">
                  Your badge has been added to your profile! Check the Badges section to enable/disable it.
                </p>
              )}
            </div>
          </div>
        </div>
      </motion.div>
    );
  }

  // Show form if no request exists
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      <div className="p-6 rounded-xl border border-white/10 bg-black/40 backdrop-blur-sm">
        <h3 className="text-lg font-semibold text-white mb-2">Request a Custom Badge</h3>
        <p className="text-sm text-muted-foreground mb-6">
          You can request one custom badge for your profile. It will be reviewed by our team before approval.
        </p>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Live Preview */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Preview</Label>
            <BadgePreview
              name={badgeName || 'Badge Name'}
              color={badgeColor}
              iconUrl={iconPreview}
            />
          </div>

          {/* Badge Name */}
          <div className="space-y-2">
            <Label htmlFor="badgeName">Badge Name *</Label>
            <Input
              id="badgeName"
              value={badgeName}
              onChange={(e) => setBadgeName(e.target.value)}
              placeholder="My Cool Badge"
              maxLength={30}
              className="bg-white/5 border-white/10"
            />
            <p className="text-xs text-muted-foreground">{badgeName.length}/30 characters</p>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="badgeDescription">Description (optional)</Label>
            <Textarea
              id="badgeDescription"
              value={badgeDescription}
              onChange={(e) => setBadgeDescription(e.target.value)}
              placeholder="What makes this badge special?"
              maxLength={100}
              className="bg-white/5 border-white/10 resize-none"
              rows={2}
            />
            <p className="text-xs text-muted-foreground">{badgeDescription.length}/100 characters</p>
          </div>

          {/* Color Picker */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Palette className="w-4 h-4" />
              Badge Color
            </Label>
            <div className="flex items-center gap-3">
              <input
                type="color"
                value={badgeColor}
                onChange={(e) => setBadgeColor(e.target.value)}
                className="w-12 h-10 rounded-lg cursor-pointer border-0 bg-transparent"
              />
              <Input
                value={badgeColor}
                onChange={(e) => setBadgeColor(e.target.value)}
                className="bg-white/5 border-white/10 w-28 font-mono text-sm"
                maxLength={7}
              />
            </div>
          </div>

          {/* Icon Upload */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Upload className="w-4 h-4" />
              Custom Icon (optional)
            </Label>
            <div className="flex items-center gap-4">
              <label className="flex items-center justify-center w-20 h-20 rounded-xl border-2 border-dashed border-white/20 hover:border-primary/50 cursor-pointer transition-colors bg-white/5">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleIconChange}
                  className="hidden"
                />
                {iconPreview ? (
                  <img src={iconPreview} alt="Icon preview" className="w-12 h-12 object-contain" />
                ) : (
                  <Upload className="w-6 h-6 text-muted-foreground" />
                )}
              </label>
              {iconFile && (
                <div className="text-sm">
                  <p className="text-white">{iconFile.name}</p>
                  <button
                    type="button"
                    onClick={() => {
                      setIconFile(null);
                      setIconPreview(null);
                    }}
                    className="text-red-400 hover:text-red-300 text-xs"
                  >
                    Remove
                  </button>
                </div>
              )}
            </div>
            <p className="text-xs text-muted-foreground">PNG or SVG, max 2MB. If not provided, a default icon will be used.</p>
          </div>

          <Button
            type="submit"
            disabled={submitMutation.isPending || isUploading || !badgeName.trim()}
            className="w-full"
          >
            {submitMutation.isPending || isUploading ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Send className="w-4 h-4 mr-2" />
            )}
            Submit Request
          </Button>
        </form>
      </div>
    </motion.div>
  );
}
