import { useState } from 'react';
import { useAuth } from '@/lib/auth';
import { useUserBadges, GlobalBadge } from '@/hooks/useBadges';
import { useCurrentUserProfile } from '@/hooks/useProfile';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge, Package, Upload, Coins, AlertCircle, Wand2, Library, Sparkles } from 'lucide-react';
import { useCreateMarketplaceItem } from '@/hooks/useMarketplace';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

interface CreateListingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreateListingDialog({ open, onOpenChange }: CreateListingDialogProps) {
  const { user } = useAuth();
  const { data: userBadges } = useUserBadges(user?.id || '');
  const { data: currentProfile } = useCurrentUserProfile();
  
  const [itemType, setItemType] = useState<'badge' | 'template'>('badge');
  const [badgeSource, setBadgeSource] = useState<'create' | 'existing'>('create');
  const [selectedBadgeId, setSelectedBadgeId] = useState<string>('');
  const [saleType, setSaleType] = useState<'single' | 'limited' | 'unlimited'>('unlimited');
  const [stockLimit, setStockLimit] = useState(10);
  const [price, setPrice] = useState(100);
  const [uploading, setUploading] = useState(false);
  
  // Badge fields
  const [badgeName, setBadgeName] = useState('');
  const [badgeDescription, setBadgeDescription] = useState('');
  const [badgeColor, setBadgeColor] = useState('#8B5CF6');
  const [badgeIconUrl, setBadgeIconUrl] = useState('');
  
  // Template fields
  const [templateName, setTemplateName] = useState('');
  const [templateDescription, setTemplateDescription] = useState('');
  const [templatePreviewUrl, setTemplatePreviewUrl] = useState('');
  const [exportCurrentProfile, setExportCurrentProfile] = useState(false);
  
  const createMutation = useCreateMarketplaceItem();

  // Get the selected existing badge data
  const selectedExistingBadge = userBadges?.find(ub => ub.badge_id === selectedBadgeId)?.badge;

  // Build template data from current profile (excluding personal info)
  const buildTemplateData = () => {
    if (!currentProfile) return null;
    
    // Only include style/appearance settings, NOT personal data
    return {
      // Visual settings
      background_url: currentProfile.background_url,
      background_color: currentProfile.background_color,
      background_video_url: (currentProfile as any).background_video_url,
      background_effect: (currentProfile as any).background_effect,
      accent_color: currentProfile.accent_color,
      card_color: currentProfile.card_color,
      card_style: (currentProfile as any).card_style,
      text_color: (currentProfile as any).text_color,
      icon_color: (currentProfile as any).icon_color,
      
      // Card border settings
      card_border_enabled: (currentProfile as any).card_border_enabled,
      card_border_width: (currentProfile as any).card_border_width,
      card_border_color: (currentProfile as any).card_border_color,
      
      // Typography
      name_font: (currentProfile as any).name_font,
      text_font: (currentProfile as any).text_font,
      
      // Avatar settings
      avatar_shape: (currentProfile as any).avatar_shape,
      
      // Layout
      layout_style: (currentProfile as any).layout_style,
      
      // Effects
      effects_config: currentProfile.effects_config,
      profile_opacity: (currentProfile as any).profile_opacity,
      profile_blur: (currentProfile as any).profile_blur,
      monochrome_icons: (currentProfile as any).monochrome_icons,
      animated_title: (currentProfile as any).animated_title,
      swap_bio_colors: (currentProfile as any).swap_bio_colors,
      glow_username: (currentProfile as any).glow_username,
      glow_socials: (currentProfile as any).glow_socials,
      glow_badges: (currentProfile as any).glow_badges,
      enable_profile_gradient: (currentProfile as any).enable_profile_gradient,
      icon_only_links: (currentProfile as any).icon_only_links,
      icon_links_opacity: (currentProfile as any).icon_links_opacity,
      transparent_badges: (currentProfile as any).transparent_badges,
      
      // Start screen settings
      start_screen_enabled: (currentProfile as any).start_screen_enabled,
      start_screen_font: (currentProfile as any).start_screen_font,
      start_screen_color: (currentProfile as any).start_screen_color,
      start_screen_bg_color: (currentProfile as any).start_screen_bg_color,
      start_screen_animation: (currentProfile as any).start_screen_animation,
      
      // Visibility settings
      show_volume_control: (currentProfile as any).show_volume_control,
      show_username: (currentProfile as any).show_username,
      show_badges: (currentProfile as any).show_badges,
      show_views: (currentProfile as any).show_views,
      show_avatar: (currentProfile as any).show_avatar,
      show_links: (currentProfile as any).show_links,
      show_description: (currentProfile as any).show_description,
      show_display_name: (currentProfile as any).show_display_name,
      
      // Example placeholders (buyer sees these as preview, not actual data)
      _example_display_name: "Example User",
      _example_bio: "This is an example bio for the template preview.",
      _example_username: "example",
      
      // Mark as template
      _is_template: true,
      _template_version: 1,
    };
  };

  const handleIconUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    if (file.size > 5 * 1024 * 1024) {
      toast.error('File too large. Max 5MB.');
      return;
    }
    
    setUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${crypto.randomUUID()}.${fileExt}`;
      const filePath = `marketplace/${fileName}`;
      
      const { error: uploadError } = await supabase.storage
        .from('profile-assets')
        .upload(filePath, file);
      
      if (uploadError) throw uploadError;
      
      const { data: { publicUrl } } = supabase.storage
        .from('profile-assets')
        .getPublicUrl(filePath);
      
      if (itemType === 'badge') {
        setBadgeIconUrl(publicUrl);
      } else {
        setTemplatePreviewUrl(publicUrl);
      }
      
      toast.success('Image uploaded!');
    } catch (error: any) {
      toast.error('Upload failed: ' + error.message);
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = () => {
    if (itemType === 'badge') {
      if (badgeSource === 'create' && !badgeName.trim()) {
        toast.error('Badge name is required');
        return;
      }
      if (badgeSource === 'existing' && !selectedBadgeId) {
        toast.error('Please select a badge to sell');
        return;
      }
    }
    if (itemType === 'template' && !templateName.trim()) {
      toast.error('Template name is required');
      return;
    }
    if (price < 1 || price > 10000) {
      toast.error('Price must be between 1 and 10,000 UC');
      return;
    }
    if (saleType === 'limited' && stockLimit < 1) {
      toast.error('Stock limit must be at least 1');
      return;
    }

    // Determine badge data based on source
    let finalBadgeName = badgeName;
    let finalBadgeDescription = badgeDescription;
    let finalBadgeColor = badgeColor;
    let finalBadgeIconUrl = badgeIconUrl;
    
    if (itemType === 'badge' && badgeSource === 'existing' && selectedExistingBadge) {
      finalBadgeName = selectedExistingBadge.name;
      finalBadgeDescription = selectedExistingBadge.description || '';
      finalBadgeColor = selectedExistingBadge.color || '#8B5CF6';
      finalBadgeIconUrl = selectedExistingBadge.icon_url || '';
    }
    
    // Build template data if exporting profile
    const templateData = itemType === 'template' && exportCurrentProfile ? buildTemplateData() : null;

    createMutation.mutate({
      item_type: itemType,
      sale_type: saleType,
      stock_limit: saleType === 'limited' ? stockLimit : null,
      price,
      badge_name: itemType === 'badge' ? finalBadgeName : null,
      badge_description: itemType === 'badge' ? finalBadgeDescription : null,
      badge_color: itemType === 'badge' ? finalBadgeColor : null,
      badge_icon_url: itemType === 'badge' ? finalBadgeIconUrl : null,
      template_name: itemType === 'template' ? templateName : null,
      template_description: itemType === 'template' ? templateDescription : null,
      template_preview_url: itemType === 'template' ? templatePreviewUrl : null,
      template_data: templateData,
    }, {
      onSuccess: () => {
        onOpenChange(false);
        // Reset form
        setBadgeSource('create');
        setSelectedBadgeId('');
        setBadgeName('');
        setBadgeDescription('');
        setBadgeColor('#8B5CF6');
        setBadgeIconUrl('');
        setTemplateName('');
        setTemplateDescription('');
        setTemplatePreviewUrl('');
        setExportCurrentProfile(false);
        setPrice(100);
        setSaleType('unlimited');
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create Marketplace Listing</DialogTitle>
          <DialogDescription>
            List a badge or profile template for sale. Items require admin approval before appearing in the marketplace.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Item Type Selection */}
          <Tabs value={itemType} onValueChange={(v) => setItemType(v as 'badge' | 'template')}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="badge" className="gap-2">
                <Badge className="w-4 h-4" />
                Badge
              </TabsTrigger>
              <TabsTrigger value="template" className="gap-2">
                <Package className="w-4 h-4" />
                Template
              </TabsTrigger>
            </TabsList>

            <TabsContent value="badge" className="space-y-4 mt-4">
              {/* Badge Source Selection */}
              <div className="space-y-3">
                <Label>Badge Source</Label>
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    type="button"
                    variant={badgeSource === 'existing' ? 'default' : 'outline'}
                    className="gap-2"
                    onClick={() => setBadgeSource('existing')}
                  >
                    <Library className="w-4 h-4" />
                    My Badges
                  </Button>
                  <Button
                    type="button"
                    variant={badgeSource === 'create' ? 'default' : 'outline'}
                    className="gap-2"
                    onClick={() => setBadgeSource('create')}
                  >
                    <Wand2 className="w-4 h-4" />
                    Create New
                  </Button>
                </div>
              </div>

              {badgeSource === 'existing' ? (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Select Badge to Sell</Label>
                    {userBadges && userBadges.length > 0 ? (
                      <Select value={selectedBadgeId} onValueChange={setSelectedBadgeId}>
                        <SelectTrigger>
                          <SelectValue placeholder="Choose a badge..." />
                        </SelectTrigger>
                        <SelectContent>
                          {userBadges.map((ub) => (
                            <SelectItem key={ub.badge_id} value={ub.badge_id}>
                              <div className="flex items-center gap-2">
                                {ub.badge?.icon_url ? (
                                  <img src={ub.badge.icon_url} alt="" className="w-5 h-5 rounded object-cover" />
                                ) : (
                                  <div
                                    className="w-5 h-5 rounded"
                                    style={{ backgroundColor: ub.badge?.color || '#8B5CF6' }}
                                  />
                                )}
                                <span>{ub.badge?.name}</span>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <div className="p-3 bg-muted/50 rounded-lg text-sm text-muted-foreground text-center">
                        You don't have any badges yet. Create a new one instead!
                      </div>
                    )}
                  </div>
                  
                  {selectedExistingBadge && (
                    <div className="p-3 bg-muted/30 rounded-lg border border-border/50">
                      <div className="flex items-center gap-3">
                        {selectedExistingBadge.icon_url ? (
                          <img src={selectedExistingBadge.icon_url} alt="" className="w-10 h-10 rounded object-cover" />
                        ) : (
                          <div
                            className="w-10 h-10 rounded flex items-center justify-center"
                            style={{ backgroundColor: selectedExistingBadge.color || '#8B5CF6' }}
                          >
                            <Badge className="w-5 h-5 text-white" />
                          </div>
                        )}
                        <div>
                          <p className="font-medium">{selectedExistingBadge.name}</p>
                          {selectedExistingBadge.description && (
                            <p className="text-xs text-muted-foreground">{selectedExistingBadge.description}</p>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <>
              <div className="space-y-2">
                <Label htmlFor="badgeName">Badge Name *</Label>
                <Input
                  id="badgeName"
                  value={badgeName}
                  onChange={(e) => setBadgeName(e.target.value)}
                  placeholder="e.g. Golden Crown"
                  maxLength={32}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="badgeDescription">Description</Label>
                <Textarea
                  id="badgeDescription"
                  value={badgeDescription}
                  onChange={(e) => setBadgeDescription(e.target.value)}
                  placeholder="Describe your badge..."
                  maxLength={200}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="badgeColor">Badge Color</Label>
                  <div className="flex gap-2">
                    <Input
                      type="color"
                      id="badgeColor"
                      value={badgeColor}
                      onChange={(e) => setBadgeColor(e.target.value)}
                      className="w-12 h-10 p-1 cursor-pointer"
                    />
                    <Input
                      value={badgeColor}
                      onChange={(e) => setBadgeColor(e.target.value)}
                      className="flex-1"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Badge Icon</Label>
                  <div className="flex gap-2">
                    <Button 
                      variant="outline" 
                      className="flex-1 gap-2"
                      onClick={() => document.getElementById('iconUpload')?.click()}
                      disabled={uploading}
                    >
                      <Upload className="w-4 h-4" />
                      {uploading ? 'Uploading...' : 'Upload'}
                    </Button>
                    <input
                      id="iconUpload"
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleIconUpload}
                    />
                  </div>
                  {badgeIconUrl && (
                    <img src={badgeIconUrl} alt="Preview" className="w-10 h-10 rounded object-contain border" />
                  )}
                </div>
              </div>
                </>
              )}
            </TabsContent>

            <TabsContent value="template" className="space-y-4 mt-4">
              {/* Export Current Profile Option */}
              <div className="space-y-3">
                <Label>Template Source</Label>
                <div className="grid grid-cols-1 gap-2">
                  <Button
                    type="button"
                    variant={exportCurrentProfile ? 'default' : 'outline'}
                    className="gap-2 justify-start"
                    onClick={() => setExportCurrentProfile(true)}
                  >
                    <Sparkles className="w-4 h-4" />
                    Export My Current Profile Style
                  </Button>
                </div>
              </div>

              {exportCurrentProfile && (
                <div className="p-3 bg-green-500/10 border border-green-500/30 rounded-lg flex gap-2">
                  <Sparkles className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                  <div className="text-sm text-green-500">
                    <p className="font-medium">Profile style will be exported!</p>
                    <p className="text-xs mt-1 opacity-80">
                      Only visual settings are included. Personal data (username, UID, bio content, display name) 
                      will NOT be shared. Buyers receive example placeholder values.
                    </p>
                  </div>
                </div>
              )}

              {!exportCurrentProfile && (
                <div className="p-3 bg-muted/50 border border-border/50 rounded-lg flex gap-2">
                  <AlertCircle className="w-5 h-5 text-muted-foreground flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-muted-foreground">
                    Click "Export My Current Profile Style" to include your visual settings in this template.
                </p>
              </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="templateName">Template Name *</Label>
                <Input
                  id="templateName"
                  value={templateName}
                  onChange={(e) => setTemplateName(e.target.value)}
                  placeholder="e.g. Neon Dreams"
                  maxLength={32}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="templateDescription">Description</Label>
                <Textarea
                  id="templateDescription"
                  value={templateDescription}
                  onChange={(e) => setTemplateDescription(e.target.value)}
                  placeholder="Describe your template..."
                  maxLength={200}
                />
              </div>

              <div className="space-y-2">
                <Label>Preview Image</Label>
                <Button 
                  variant="outline" 
                  className="w-full gap-2"
                  onClick={() => document.getElementById('iconUpload')?.click()}
                  disabled={uploading}
                >
                  <Upload className="w-4 h-4" />
                  {uploading ? 'Uploading...' : 'Upload Preview'}
                </Button>
                {templatePreviewUrl && (
                  <img src={templatePreviewUrl} alt="Preview" className="w-full h-32 rounded object-cover border" />
                )}
              </div>
            </TabsContent>
          </Tabs>

          {/* Sale Type */}
          <div className="space-y-3">
            <Label>Sale Type</Label>
            <RadioGroup value={saleType} onValueChange={(v) => setSaleType(v as any)}>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="unlimited" id="unlimited" />
                <Label htmlFor="unlimited" className="font-normal cursor-pointer">
                  Unlimited - Anyone can buy, you keep the item
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="limited" id="limited" />
                <Label htmlFor="limited" className="font-normal cursor-pointer">
                  Limited - Set max copies, you keep the item
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="single" id="single" />
                <Label htmlFor="single" className="font-normal cursor-pointer">
                  Unique Sale - One buyer, you lose the item
                </Label>
              </div>
            </RadioGroup>
          </div>

          {saleType === 'limited' && (
            <div className="space-y-2">
              <Label htmlFor="stockLimit">Stock Limit</Label>
              <Input
                id="stockLimit"
                type="number"
                min={1}
                max={1000}
                value={stockLimit}
                onChange={(e) => setStockLimit(parseInt(e.target.value) || 1)}
              />
            </div>
          )}

          {/* Price */}
          <div className="space-y-2">
            <Label htmlFor="price">Price (UC)</Label>
            <div className="relative">
              <Coins className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-amber-500" />
              <Input
                id="price"
                type="number"
                min={1}
                max={10000}
                value={price}
                onChange={(e) => setPrice(parseInt(e.target.value) || 1)}
                className="pl-10"
              />
            </div>
            <p className="text-xs text-muted-foreground">Price must be between 1 and 10,000 UC</p>
          </div>

          <Button 
            onClick={handleSubmit} 
            disabled={createMutation.isPending}
            className="w-full"
          >
            {createMutation.isPending ? 'Submitting...' : 'Submit for Approval'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
