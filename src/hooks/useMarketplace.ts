import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { toast } from 'sonner';

// Template data fields that can be applied to a profile
const TEMPLATE_APPLICABLE_FIELDS = [
  'background_url',
  'background_color',
  'background_video_url',
  'background_effect',
  'accent_color',
  'card_color',
  'card_style',
  'text_color',
  'icon_color',
  'card_border_enabled',
  'card_border_width',
  'card_border_color',
  'name_font',
  'text_font',
  'avatar_shape',
  'layout_style',
  'effects_config',
  'profile_opacity',
  'profile_blur',
  'monochrome_icons',
  'animated_title',
  'swap_bio_colors',
  'glow_username',
  'glow_socials',
  'glow_badges',
  'enable_profile_gradient',
  'icon_only_links',
  'icon_links_opacity',
  'transparent_badges',
  'start_screen_enabled',
  'start_screen_font',
  'start_screen_color',
  'start_screen_bg_color',
  'start_screen_animation',
  'show_volume_control',
  'show_username',
  'show_badges',
  'show_views',
  'show_avatar',
  'show_links',
  'show_description',
  'show_display_name',
];

export interface MarketplaceItem {
  id: string;
  seller_id: string;
  item_type: 'badge' | 'template';
  sale_type: 'single' | 'limited' | 'unlimited';
  badge_name: string | null;
  badge_description: string | null;
  badge_icon_url: string | null;
  badge_color: string | null;
  template_name: string | null;
  template_description: string | null;
  template_preview_url: string | null;
  template_data: Record<string, unknown> | null;
  price: number;
  stock_limit: number | null;
  stock_sold: number;
  status: 'pending' | 'approved' | 'denied' | 'sold_out' | 'removed';
  denial_reason: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string;
  updated_at: string;
  seller_username?: string;
}

export interface UserBalance {
  id: string;
  user_id: string;
  balance: number;
  total_earned: number;
  total_spent: number;
  created_at: string;
  updated_at: string;
}

export interface UCTransaction {
  id: string;
  user_id: string;
  amount: number;
  transaction_type: 'earn' | 'spend' | 'refund' | 'initial';
  description: string | null;
  reference_id: string | null;
  reference_type: string | null;
  created_at: string;
}

// Get user's UC balance
export function useUserBalance() {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: ['userBalance', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      
      const { data, error } = await supabase
        .from('user_balances')
        .select('*')
        .eq('user_id', user.id)
        .single();
      
      if (error && error.code !== 'PGRST116') throw error;
      
      // If no balance exists, create one with 1000 UC
      if (!data) {
        const { data: newBalance, error: insertError } = await supabase
          .from('user_balances')
          .insert({ user_id: user.id, balance: 1000, total_earned: 1000 })
          .select()
          .single();
        
        if (insertError) throw insertError;
        return newBalance as UserBalance;
      }
      
      return data as UserBalance;
    },
    enabled: !!user?.id,
  });
}

// Get UC transaction history
export function useUCTransactions() {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: ['ucTransactions', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      
      const { data, error } = await supabase
        .from('uv_transactions')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50);
      
      if (error) throw error;
      return data as UCTransaction[];
    },
    enabled: !!user?.id,
  });
}

// Get approved marketplace items
export function useMarketplaceItems(itemType?: 'badge' | 'template') {
  return useQuery({
    queryKey: ['marketplaceItems', itemType],
    queryFn: async () => {
      let query = supabase
        .from('marketplace_items')
        .select('*')
        .eq('status', 'approved')
        .order('created_at', { ascending: false });
      
      if (itemType) {
        query = query.eq('item_type', itemType);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      
      // Fetch seller usernames
      const sellerIds = [...new Set(data.map(item => item.seller_id))];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, username')
        .in('user_id', sellerIds);
      
      const usernameMap = new Map(profiles?.map(p => [p.user_id, p.username]) || []);
      
      return data.map(item => ({
        ...item,
        seller_username: usernameMap.get(item.seller_id) || 'Unknown'
      })) as MarketplaceItem[];
    },
  });
}

// Get user's own marketplace items
export function useMyMarketplaceItems() {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: ['myMarketplaceItems', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      
      const { data, error } = await supabase
        .from('marketplace_items')
        .select('*')
        .eq('seller_id', user.id)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as MarketplaceItem[];
    },
    enabled: !!user?.id,
  });
}

// Get user's purchases
export function useMyPurchases() {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: ['myPurchases', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      
      const { data, error } = await supabase
        .from('marketplace_purchases')
        .select(`
          *,
          item:marketplace_items(*)
        `)
        .eq('buyer_id', user.id)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });
}

// Create marketplace item
export function useCreateMarketplaceItem() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  
  return useMutation({
    mutationFn: async (item: Partial<MarketplaceItem>) => {
      if (!user?.id) throw new Error('Not authenticated');
      
      // Use any to bypass strict typing - the DB handles validation
      const { data, error } = await (supabase
        .from('marketplace_items') as any)
        .insert({
          item_type: item.item_type || 'badge',
          price: item.price || 100,
          sale_type: item.sale_type || 'unlimited',
          seller_id: user.id,
          status: 'pending',
          badge_name: item.badge_name ?? null,
          badge_description: item.badge_description ?? null,
          badge_icon_url: item.badge_icon_url ?? null,
          badge_color: item.badge_color ?? null,
          template_name: item.template_name ?? null,
          template_description: item.template_description ?? null,
          template_preview_url: item.template_preview_url ?? null,
          template_data: item.template_data ?? null,
          stock_limit: item.stock_limit ?? null,
        })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['myMarketplaceItems'] });
      toast.success('Item submitted for approval!');
    },
    onError: (error) => {
      toast.error('Failed to submit item: ' + error.message);
    }
  });
}

// Apply a purchased template to user's profile
export function useApplyTemplate() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  
  return useMutation({
    mutationFn: async (itemId: string) => {
      if (!user?.id) throw new Error('Not authenticated');
      
      // Get the purchased item with template data
      const { data: purchase, error: purchaseError } = await supabase
        .from('marketplace_purchases')
        .select('*, item:marketplace_items(*)')
        .eq('buyer_id', user.id)
        .eq('item_id', itemId)
        .single();
      
      if (purchaseError || !purchase) {
        throw new Error('You have not purchased this template');
      }
      
      const item = purchase.item as MarketplaceItem;
      
      if (item.item_type !== 'template') {
        throw new Error('This is not a template');
      }
      
      const templateData = item.template_data as Record<string, unknown> | null;
      
      if (!templateData) {
        throw new Error('Template has no style data');
      }
      
      // Filter to only applicable fields (exclude personal data and meta fields)
      const updates: Record<string, unknown> = {};
      for (const field of TEMPLATE_APPLICABLE_FIELDS) {
        if (templateData[field] !== undefined) {
          updates[field] = templateData[field];
        }
      }
      
      if (Object.keys(updates).length === 0) {
        throw new Error('Template has no applicable style settings');
      }
      
      // Apply to user's profile
      const { error: updateError } = await supabase
        .from('profiles')
        .update(updates)
        .eq('user_id', user.id);
      
      if (updateError) throw updateError;
      
      return { applied: Object.keys(updates).length };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['profile'] });
      toast.success(`Template applied! ${data.applied} settings updated.`);
    },
    onError: (error) => {
      toast.error(error.message);
    }
  });
}

// Purchase marketplace item
export function usePurchaseItem() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (itemId: string) => {
      const { data, error } = await supabase.rpc('purchase_marketplace_item', {
        p_item_id: itemId
      });
      
      if (error) throw error;
      
      const result = data as { success: boolean; error?: string; message?: string };
      if (!result.success) {
        throw new Error(result.error || 'Purchase failed');
      }
      
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['userBalance'] });
      queryClient.invalidateQueries({ queryKey: ['ucTransactions'] });
      queryClient.invalidateQueries({ queryKey: ['marketplaceItems'] });
      queryClient.invalidateQueries({ queryKey: ['myPurchases'] });
      queryClient.invalidateQueries({ queryKey: ['userBadges'] });
      toast.success('Purchase successful! 🎉');
    },
    onError: (error) => {
      toast.error(error.message);
    }
  });
}

// Get pending items for admin
export function usePendingMarketplaceItems() {
  return useQuery({
    queryKey: ['pendingMarketplaceItems'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('marketplace_items')
        .select('*')
        .eq('status', 'pending')
        .order('created_at', { ascending: true });
      
      if (error) throw error;
      
      // Fetch seller usernames
      const sellerIds = [...new Set(data.map(item => item.seller_id))];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, username')
        .in('user_id', sellerIds);
      
      const usernameMap = new Map(profiles?.map(p => [p.user_id, p.username]) || []);
      
      return data.map(item => ({
        ...item,
        seller_username: usernameMap.get(item.seller_id) || 'Unknown'
      })) as MarketplaceItem[];
    },
  });
}

// Admin: Approve/Deny item
export function useReviewMarketplaceItem() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  
  return useMutation({
    mutationFn: async ({ itemId, action, reason }: { itemId: string; action: 'approved' | 'denied'; reason?: string }) => {
      const updateData: Record<string, unknown> = {
        status: action,
        denial_reason: action === 'denied' ? reason : null,
        reviewed_by: user?.id,
        reviewed_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      
      const { error } = await supabase
        .from('marketplace_items')
        .update(updateData)
        .eq('id', itemId);
      
      if (error) throw error;
    },
    onSuccess: (_, { action }) => {
      queryClient.invalidateQueries({ queryKey: ['pendingMarketplaceItems'] });
      queryClient.invalidateQueries({ queryKey: ['marketplaceItems'] });
      toast.success(action === 'approved' ? 'Item approved!' : 'Item denied');
    },
    onError: (error: Error) => {
      toast.error('Failed to review item: ' + error.message);
    }
  });
}
