import { useState } from 'react';
import { motion } from 'framer-motion';
import { Plus, Trash2, Edit2, Award, Loader2, ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { BadgeIconUploader } from './BadgeIconUploader';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import {
  useGlobalBadges,
  useCreateGlobalBadge,
  useUpdateGlobalBadge,
  useDeleteGlobalBadge,
  GlobalBadge,
} from '@/hooks/useBadges';

export function AdminBadgeManager() {
  const { data: badges = [], isLoading } = useGlobalBadges();
  const createBadge = useCreateGlobalBadge();
  const updateBadge = useUpdateGlobalBadge();
  const deleteBadge = useDeleteGlobalBadge();
  const { toast } = useToast();

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [editingBadge, setEditingBadge] = useState<GlobalBadge | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    icon_url: '',
    color: '#8B5CF6',
    rarity: 'common',
    is_limited: false,
    max_claims: null as number | null,
  });

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      icon_url: '',
      color: '#8B5CF6',
      rarity: 'common',
      is_limited: false,
      max_claims: null,
    });
    setEditingBadge(null);
  };

  const openEditDialog = (badge: GlobalBadge) => {
    setEditingBadge(badge);
    setFormData({
      name: badge.name,
      description: badge.description || '',
      icon_url: badge.icon_url || '',
      color: badge.color || '#8B5CF6',
      rarity: badge.rarity || 'common',
      is_limited: badge.is_limited || false,
      max_claims: badge.max_claims,
    });
    setIsDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      if (editingBadge) {
        await updateBadge.mutateAsync({
          id: editingBadge.id,
          name: formData.name,
          description: formData.description || null,
          icon_url: formData.icon_url || null,
          color: formData.color,
          rarity: formData.rarity,
          is_limited: formData.is_limited,
          max_claims: formData.max_claims,
        });
        toast({ title: 'Badge updated!' });
      } else {
        await createBadge.mutateAsync({
          name: formData.name,
          description: formData.description || null,
          icon_url: formData.icon_url || null,
          color: formData.color,
          rarity: formData.rarity,
          is_limited: formData.is_limited,
          max_claims: formData.max_claims,
        });
        toast({ title: 'Badge created!' });
      }
      setIsDialogOpen(false);
      resetForm();
    } catch (error: any) {
      toast({ title: error.message, variant: 'destructive' });
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this badge?')) return;
    
    try {
      await deleteBadge.mutateAsync(id);
      toast({ title: 'Badge deleted' });
    } catch (error: any) {
      toast({ title: error.message, variant: 'destructive' });
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <CollapsibleTrigger asChild>
            <button className="flex items-center gap-2 hover:opacity-80 transition-opacity">
              <Award className="w-5 h-5 text-primary" />
              <h3 className="font-semibold">Badge Management</h3>
              {isExpanded ? (
                <ChevronUp className="w-4 h-4 text-muted-foreground" />
              ) : (
                <ChevronDown className="w-4 h-4 text-muted-foreground" />
              )}
              <span className="text-xs text-muted-foreground">({badges.length} badges)</span>
            </button>
          </CollapsibleTrigger>
          <Dialog open={isDialogOpen} onOpenChange={(open) => {
            setIsDialogOpen(open);
            if (!open) resetForm();
          }}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="w-4 h-4 mr-2" />
                Create Badge
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>
                  {editingBadge ? 'Edit Badge' : 'Create New Badge'}
                </DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label>Name</Label>
                  <Input
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Badge name"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label>Description</Label>
                  <Textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Badge description"
                  />
                </div>

                <BadgeIconUploader
                  currentUrl={formData.icon_url}
                  onUpload={(url) => setFormData({ ...formData, icon_url: url })}
                  onRemove={() => setFormData({ ...formData, icon_url: '' })}
                  color={formData.color}
                />

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Color</Label>
                    <div className="flex gap-2">
                      <Input
                        type="color"
                        value={formData.color}
                        onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                        className="w-12 h-10 p-1"
                      />
                      <Input
                        value={formData.color}
                        onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Rarity</Label>
                    <Select
                      value={formData.rarity}
                      onValueChange={(value) => setFormData({ ...formData, rarity: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="common">Common</SelectItem>
                        <SelectItem value="uncommon">Uncommon</SelectItem>
                        <SelectItem value="rare">Rare</SelectItem>
                        <SelectItem value="epic">Epic</SelectItem>
                        <SelectItem value="legendary">Legendary</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="flex items-center justify-between p-3 rounded-lg bg-secondary/30">
                  <div>
                    <Label>Limited Badge</Label>
                    <p className="text-xs text-muted-foreground">Restrict claims</p>
                  </div>
                  <Switch
                    checked={formData.is_limited}
                    onCheckedChange={(checked) => setFormData({ ...formData, is_limited: checked })}
                  />
                </div>

                {formData.is_limited && (
                  <div className="space-y-2">
                    <Label>Max Claims</Label>
                    <Input
                      type="number"
                      value={formData.max_claims || ''}
                      onChange={(e) => setFormData({ ...formData, max_claims: parseInt(e.target.value) || null })}
                      placeholder="Unlimited"
                    />
                  </div>
                )}

                <Button type="submit" className="w-full" disabled={createBadge.isPending || updateBadge.isPending}>
                  {(createBadge.isPending || updateBadge.isPending) && (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  )}
                  {editingBadge ? 'Update Badge' : 'Create Badge'}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <CollapsibleContent>
          <div className="grid gap-4 pt-2">
            {badges.map((badge) => (
              <motion.div
                key={badge.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="glass-card p-4 flex items-center gap-4"
              >
                <div
                  className="w-12 h-12 rounded-lg flex items-center justify-center"
                  style={{ backgroundColor: `${badge.color}20` }}
                >
                  {badge.icon_url ? (
                    <img src={badge.icon_url} alt={badge.name} className="w-8 h-8" />
                  ) : (
                    <Award className="w-6 h-6" style={{ color: badge.color || '#8B5CF6' }} />
                  )}
                </div>

                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h4 className="font-medium">{badge.name}</h4>
                    <span
                      className="text-xs px-2 py-0.5 rounded-full capitalize"
                      style={{
                        backgroundColor: `${badge.color}20`,
                        color: badge.color || '#8B5CF6',
                      }}
                    >
                      {badge.rarity}
                    </span>
                    {badge.is_limited && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-yellow-500/20 text-yellow-500">
                        Limited
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {badge.description || 'No description'}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Claims: {badge.claims_count || 0}
                    {badge.is_limited && badge.max_claims && ` / ${badge.max_claims}`}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <Button variant="ghost" size="icon" onClick={() => openEditDialog(badge)}>
                    <Edit2 className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDelete(badge.id)}
                    disabled={deleteBadge.isPending}
                  >
                    <Trash2 className="w-4 h-4 text-destructive" />
                  </Button>
                </div>
              </motion.div>
            ))}

            {badges.length === 0 && (
              <div className="text-center py-12 text-muted-foreground">
                <Award className="w-12 h-12 mx-auto mb-4 opacity-20" />
                <p>No badges yet. Create your first badge!</p>
              </div>
            )}
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}
