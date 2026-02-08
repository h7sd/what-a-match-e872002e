-- =====================================================
-- MISSING TABLES FOR EXTERNAL SUPABASE MIGRATION
-- Generated: 2026-02-08
-- Run this in your external Supabase SQL Editor
-- =====================================================

-- =====================================================
-- STEP 1: Create app_role ENUM type (if not exists)
-- =====================================================
DO $$ BEGIN
  CREATE TYPE app_role AS ENUM ('admin', 'supporter', 'moderator');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- =====================================================
-- STEP 2: Helper Functions (CRITICAL for RLS!)
-- =====================================================

-- Drop existing functions first (to avoid parameter name conflicts)
DROP FUNCTION IF EXISTS public.has_role(uuid, app_role);
DROP FUNCTION IF EXISTS public.is_profile_owner(uuid);
DROP FUNCTION IF EXISTS public.can_record_view(uuid, text);
DROP FUNCTION IF EXISTS public.get_public_badges();
DROP FUNCTION IF EXISTS public.get_profile_badges(uuid);

-- has_role function
CREATE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- is_profile_owner function
CREATE FUNCTION public.is_profile_owner(p_profile_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = p_profile_id AND user_id = auth.uid()
  )
$$;

-- can_record_view function (rate limiting)
CREATE FUNCTION public.can_record_view(p_profile_id uuid, p_ip_hash text)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT NOT EXISTS (
    SELECT 1 FROM public.profile_views
    WHERE profile_id = p_profile_id
      AND viewer_ip_hash = p_ip_hash
      AND viewed_at > now() - interval '1 hour'
  )
$$;

-- get_public_badges function
CREATE FUNCTION public.get_public_badges()
RETURNS TABLE (
  id uuid,
  name text,
  description text,
  icon_url text,
  color text,
  rarity text,
  is_limited boolean,
  max_claims integer,
  claims_count integer,
  created_at timestamptz
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id, name, description, icon_url, color, rarity,
         is_limited, max_claims, claims_count, created_at
  FROM public.global_badges
  ORDER BY created_at DESC;
$$;

-- get_profile_badges function
CREATE FUNCTION public.get_profile_badges(p_profile_id uuid)
RETURNS TABLE (
  id uuid,
  name text,
  description text,
  icon_url text,
  color text,
  rarity text
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT gb.id, gb.name, gb.description, gb.icon_url, gb.color, gb.rarity
  FROM user_badges ub
  INNER JOIN global_badges gb ON ub.badge_id = gb.id
  INNER JOIN profiles p ON p.user_id = ub.user_id
  WHERE p.id = p_profile_id
    AND ub.is_enabled = true
    AND (ub.is_locked IS NULL OR ub.is_locked = false);
$$;

-- =====================================================
-- STEP 3: Missing Tables
-- =====================================================

-- admin_discord_roles
CREATE TABLE IF NOT EXISTS public.admin_discord_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  role_id text NOT NULL,
  description text,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.admin_discord_roles ENABLE ROW LEVEL SECURITY;

-- admin_notifications
CREATE TABLE IF NOT EXISTS public.admin_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type text NOT NULL DEFAULT 'info',
  message text NOT NULL,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz,
  is_active boolean NOT NULL DEFAULT true
);
ALTER TABLE public.admin_notifications ENABLE ROW LEVEL SECURITY;

-- admin_webhooks
CREATE TABLE IF NOT EXISTS public.admin_webhooks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  webhook_url text NOT NULL,
  description text,
  notification_type text NOT NULL DEFAULT 'changelog',
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.admin_webhooks ENABLE ROW LEVEL SECURITY;

-- badge_steals
CREATE TABLE IF NOT EXISTS public.badge_steals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  thief_user_id uuid NOT NULL,
  victim_user_id uuid NOT NULL,
  badge_id uuid NOT NULL REFERENCES public.global_badges(id),
  event_id uuid REFERENCES public.badge_events(id),
  stolen_at timestamptz NOT NULL DEFAULT now(),
  returns_at timestamptz NOT NULL,
  returned boolean DEFAULT false,
  returned_at timestamptz
);
ALTER TABLE public.badge_steals ENABLE ROW LEVEL SECURITY;

-- bot_commands
CREATE TABLE IF NOT EXISTS public.bot_commands (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  usage text,
  category text DEFAULT 'general',
  required_role text,
  cooldown_seconds integer DEFAULT 0,
  is_enabled boolean DEFAULT true,
  created_by text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE public.bot_commands ENABLE ROW LEVEL SECURITY;

-- bot_command_notifications
CREATE TABLE IF NOT EXISTS public.bot_command_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  command_name text NOT NULL,
  action text NOT NULL,
  changes jsonb,
  processed boolean NOT NULL DEFAULT false,
  processed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.bot_command_notifications ENABLE ROW LEVEL SECURITY;

-- daily_rewards
CREATE TABLE IF NOT EXISTS public.daily_rewards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  discord_user_id text NOT NULL,
  streak integer NOT NULL DEFAULT 1,
  last_claim timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.daily_rewards ENABLE ROW LEVEL SECURITY;

-- discord_bot_verification
CREATE TABLE IF NOT EXISTS public.discord_bot_verification (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  code varchar NOT NULL,
  discord_user_id text,
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '10 minutes'),
  used_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.discord_bot_verification ENABLE ROW LEVEL SECURITY;

-- friend_badges
CREATE TABLE IF NOT EXISTS public.friend_badges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id uuid NOT NULL,
  recipient_id uuid NOT NULL,
  name text NOT NULL,
  description text,
  icon_url text,
  color text DEFAULT '#8B5CF6',
  is_enabled boolean DEFAULT true,
  display_order integer DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.friend_badges ENABLE ROW LEVEL SECURITY;

-- cases
CREATE TABLE IF NOT EXISTS public.cases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  image_url text,
  price bigint NOT NULL,
  active boolean DEFAULT true,
  order_index integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.cases ENABLE ROW LEVEL SECURITY;

-- case_items
CREATE TABLE IF NOT EXISTS public.case_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id uuid NOT NULL REFERENCES public.cases(id),
  item_type text NOT NULL,
  rarity text NOT NULL,
  drop_rate numeric NOT NULL,
  display_value bigint NOT NULL DEFAULT 0,
  coin_amount bigint,
  badge_id uuid REFERENCES public.badges(id),
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.case_items ENABLE ROW LEVEL SECURITY;

-- case_battles
CREATE TABLE IF NOT EXISTS public.case_battles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id uuid NOT NULL REFERENCES public.cases(id),
  battle_type text NOT NULL,
  entry_fee bigint NOT NULL,
  status text NOT NULL DEFAULT 'waiting',
  team1_total bigint DEFAULT 0,
  team2_total bigint DEFAULT 0,
  winner_team integer,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.case_battles ENABLE ROW LEVEL SECURITY;

-- battle_participants
CREATE TABLE IF NOT EXISTS public.battle_participants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  battle_id uuid NOT NULL REFERENCES public.case_battles(id),
  user_id uuid NOT NULL REFERENCES public.profiles(id),
  team integer NOT NULL,
  items_won jsonb DEFAULT '[]',
  total_value bigint DEFAULT 0,
  joined_at timestamptz DEFAULT now()
);
ALTER TABLE public.battle_participants ENABLE ROW LEVEL SECURITY;

-- case_transactions
CREATE TABLE IF NOT EXISTS public.case_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id),
  case_id uuid NOT NULL REFERENCES public.cases(id),
  battle_id uuid,
  transaction_type text NOT NULL,
  items_won jsonb DEFAULT '[]',
  total_value bigint NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.case_transactions ENABLE ROW LEVEL SECURITY;

-- marketplace_items
CREATE TABLE IF NOT EXISTS public.marketplace_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id uuid NOT NULL,
  item_type text NOT NULL,
  sale_type text NOT NULL DEFAULT 'unlimited',
  price integer NOT NULL,
  stock_limit integer,
  stock_sold integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'pending',
  badge_name text,
  badge_description text,
  badge_icon_url text,
  badge_color text,
  template_name text,
  template_description text,
  template_preview_url text,
  template_data jsonb,
  denial_reason text,
  reviewed_by uuid,
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.marketplace_items ENABLE ROW LEVEL SECURITY;

-- marketplace_purchases
CREATE TABLE IF NOT EXISTS public.marketplace_purchases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id uuid NOT NULL REFERENCES public.marketplace_items(id),
  buyer_id uuid NOT NULL,
  seller_id uuid NOT NULL,
  price integer NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.marketplace_purchases ENABLE ROW LEVEL SECURITY;

-- minigame_stats
CREATE TABLE IF NOT EXISTS public.minigame_stats (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  discord_user_id text NOT NULL,
  game_type text NOT NULL,
  games_played integer NOT NULL DEFAULT 0,
  games_won integer NOT NULL DEFAULT 0,
  total_earned numeric NOT NULL DEFAULT 0,
  total_lost numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.minigame_stats ENABLE ROW LEVEL SECURITY;

-- profile_comments
CREATE TABLE IF NOT EXISTS public.profile_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL REFERENCES public.profiles(id),
  commenter_user_id uuid,
  commenter_ip_hash text NOT NULL,
  encrypted_content text NOT NULL,
  encrypted_metadata text,
  is_read boolean NOT NULL DEFAULT false,
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '24 hours'),
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.profile_comments ENABLE ROW LEVEL SECURITY;

-- profile_likes
CREATE TABLE IF NOT EXISTS public.profile_likes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL REFERENCES public.profiles(id),
  liker_user_id uuid,
  liker_ip_hash text NOT NULL,
  is_like boolean NOT NULL DEFAULT true,
  encrypted_data text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.profile_likes ENABLE ROW LEVEL SECURITY;

-- user_balances
CREATE TABLE IF NOT EXISTS public.user_balances (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  balance bigint NOT NULL DEFAULT 0,
  lifetime_earned bigint NOT NULL DEFAULT 0,
  lifetime_spent bigint NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.user_balances ENABLE ROW LEVEL SECURITY;

-- user_inventory
CREATE TABLE IF NOT EXISTS public.user_inventory (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  item_type text NOT NULL,
  item_id uuid,
  item_data jsonb,
  quantity integer NOT NULL DEFAULT 1,
  acquired_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.user_inventory ENABLE ROW LEVEL SECURITY;

-- user_streaks
CREATE TABLE IF NOT EXISTS public.user_streaks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  current_streak integer NOT NULL DEFAULT 0,
  longest_streak integer NOT NULL DEFAULT 0,
  last_activity_date date,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.user_streaks ENABLE ROW LEVEL SECURITY;

-- uv_transactions
CREATE TABLE IF NOT EXISTS public.uv_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  amount bigint NOT NULL,
  transaction_type text NOT NULL,
  description text,
  reference_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.uv_transactions ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- STEP 4: RLS Policies
-- =====================================================

-- admin_discord_roles policies
DROP POLICY IF EXISTS "Admins can create discord roles" ON public.admin_discord_roles;
DROP POLICY IF EXISTS "Admins can delete discord roles" ON public.admin_discord_roles;
DROP POLICY IF EXISTS "Admins can view all discord roles" ON public.admin_discord_roles;
CREATE POLICY "Admins can create discord roles" ON public.admin_discord_roles FOR INSERT WITH CHECK (has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete discord roles" ON public.admin_discord_roles FOR DELETE USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can view all discord roles" ON public.admin_discord_roles FOR SELECT USING (has_role(auth.uid(), 'admin'));

-- admin_notifications policies
DROP POLICY IF EXISTS "Admins can insert notifications" ON public.admin_notifications;
DROP POLICY IF EXISTS "Anyone can read active notifications" ON public.admin_notifications;
CREATE POLICY "Admins can insert notifications" ON public.admin_notifications FOR INSERT 
  WITH CHECK (EXISTS (SELECT 1 FROM user_roles WHERE user_roles.user_id = auth.uid() AND user_roles.role = 'admin'));
CREATE POLICY "Anyone can read active notifications" ON public.admin_notifications FOR SELECT 
  USING (is_active = true AND (expires_at IS NULL OR expires_at > now()));

-- admin_webhooks policies
DROP POLICY IF EXISTS "Admins can manage webhooks" ON public.admin_webhooks;
CREATE POLICY "Admins can manage webhooks" ON public.admin_webhooks FOR ALL USING (has_role(auth.uid(), 'admin'));

-- badge_steals policies
DROP POLICY IF EXISTS "Admins can manage badge steals" ON public.badge_steals;
DROP POLICY IF EXISTS "Users can view their own steals" ON public.badge_steals;
CREATE POLICY "Admins can manage badge steals" ON public.badge_steals FOR ALL USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "Users can view their own steals" ON public.badge_steals FOR SELECT 
  USING (auth.uid() = thief_user_id OR (auth.uid() = victim_user_id AND NOT EXISTS (
    SELECT 1 FROM badge_events e WHERE e.id = badge_steals.event_id AND e.event_type = 'hunt'
  )) OR has_role(auth.uid(), 'admin'));

-- bot_commands policies
DROP POLICY IF EXISTS "Admins can manage commands" ON public.bot_commands;
DROP POLICY IF EXISTS "Anyone can read commands" ON public.bot_commands;
CREATE POLICY "Admins can manage commands" ON public.bot_commands FOR ALL USING (has_role(auth.uid(), 'admin')) WITH CHECK (has_role(auth.uid(), 'admin'));
CREATE POLICY "Anyone can read commands" ON public.bot_commands FOR SELECT USING (true);

-- bot_command_notifications policies
DROP POLICY IF EXISTS "Allow public read for bot polling" ON public.bot_command_notifications;
DROP POLICY IF EXISTS "Service role can manage notifications" ON public.bot_command_notifications;
CREATE POLICY "Allow public read for bot polling" ON public.bot_command_notifications FOR SELECT USING (true);
CREATE POLICY "Service role can manage notifications" ON public.bot_command_notifications FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');

-- daily_rewards policies
DROP POLICY IF EXISTS "Anyone can view daily rewards" ON public.daily_rewards;
DROP POLICY IF EXISTS "Service role can manage daily rewards" ON public.daily_rewards;
CREATE POLICY "Anyone can view daily rewards" ON public.daily_rewards FOR SELECT USING (true);
CREATE POLICY "Service role can manage daily rewards" ON public.daily_rewards FOR ALL USING (auth.role() = 'service_role');

-- discord_bot_verification policies
DROP POLICY IF EXISTS "Users can view their own verification codes" ON public.discord_bot_verification;
DROP POLICY IF EXISTS "Users can delete their own verification codes" ON public.discord_bot_verification;
CREATE POLICY "Users can view their own verification codes" ON public.discord_bot_verification FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own verification codes" ON public.discord_bot_verification FOR DELETE USING (auth.uid() = user_id);

-- friend_badges policies
DROP POLICY IF EXISTS "Admins can manage all friend badges" ON public.friend_badges;
DROP POLICY IF EXISTS "Users can create friend badges" ON public.friend_badges;
DROP POLICY IF EXISTS "Creators can update their friend badges" ON public.friend_badges;
DROP POLICY IF EXISTS "Creators can delete their friend badges" ON public.friend_badges;
DROP POLICY IF EXISTS "Recipients can toggle friend badge visibility" ON public.friend_badges;
DROP POLICY IF EXISTS "Users can view their created or received friend badges" ON public.friend_badges;
CREATE POLICY "Admins can manage all friend badges" ON public.friend_badges FOR ALL USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "Users can create friend badges" ON public.friend_badges FOR INSERT 
  WITH CHECK (auth.uid() = creator_id AND auth.uid() <> recipient_id AND (SELECT count(*) FROM friend_badges WHERE creator_id = auth.uid()) < 5);
CREATE POLICY "Creators can update their friend badges" ON public.friend_badges FOR UPDATE USING (auth.uid() = creator_id);
CREATE POLICY "Creators can delete their friend badges" ON public.friend_badges FOR DELETE USING (auth.uid() = creator_id);
CREATE POLICY "Recipients can toggle friend badge visibility" ON public.friend_badges FOR UPDATE USING (auth.uid() = recipient_id) WITH CHECK (auth.uid() = recipient_id);
CREATE POLICY "Users can view their created or received friend badges" ON public.friend_badges FOR SELECT USING (auth.uid() = creator_id OR auth.uid() = recipient_id);

-- cases policies
DROP POLICY IF EXISTS "Anyone can view active cases" ON public.cases;
CREATE POLICY "Anyone can view active cases" ON public.cases FOR SELECT USING (active = true);

-- case_items policies
DROP POLICY IF EXISTS "Anyone can view case items" ON public.case_items;
CREATE POLICY "Anyone can view case items" ON public.case_items FOR SELECT 
  USING (EXISTS (SELECT 1 FROM cases WHERE cases.id = case_items.case_id AND cases.active = true));

-- case_battles policies
DROP POLICY IF EXISTS "Anyone can view battles" ON public.case_battles;
CREATE POLICY "Anyone can view battles" ON public.case_battles FOR SELECT USING (true);

-- battle_participants policies
DROP POLICY IF EXISTS "Anyone can view battle participants" ON public.battle_participants;
CREATE POLICY "Anyone can view battle participants" ON public.battle_participants FOR SELECT USING (true);

-- case_transactions policies
DROP POLICY IF EXISTS "Users can view own transactions" ON public.case_transactions;
CREATE POLICY "Users can view own transactions" ON public.case_transactions FOR SELECT USING (auth.uid() = user_id);

-- marketplace_items policies
DROP POLICY IF EXISTS "Admins can manage all items" ON public.marketplace_items;
DROP POLICY IF EXISTS "Anyone can view approved items" ON public.marketplace_items;
DROP POLICY IF EXISTS "Users can create items" ON public.marketplace_items;
DROP POLICY IF EXISTS "Sellers can update own pending items" ON public.marketplace_items;
CREATE POLICY "Admins can manage all items" ON public.marketplace_items FOR ALL 
  USING (EXISTS (SELECT 1 FROM user_roles WHERE user_roles.user_id = auth.uid() AND user_roles.role = 'admin'));
CREATE POLICY "Anyone can view approved items" ON public.marketplace_items FOR SELECT USING (status = 'approved' OR seller_id = auth.uid());
CREATE POLICY "Users can create items" ON public.marketplace_items FOR INSERT WITH CHECK (auth.uid() = seller_id);
CREATE POLICY "Sellers can update own pending items" ON public.marketplace_items FOR UPDATE USING (auth.uid() = seller_id AND status = 'pending');

-- marketplace_purchases policies
DROP POLICY IF EXISTS "Users can create purchases" ON public.marketplace_purchases;
DROP POLICY IF EXISTS "Users can view own purchases" ON public.marketplace_purchases;
CREATE POLICY "Users can create purchases" ON public.marketplace_purchases FOR INSERT WITH CHECK (auth.uid() = buyer_id);
CREATE POLICY "Users can view own purchases" ON public.marketplace_purchases FOR SELECT USING (auth.uid() = buyer_id OR auth.uid() = seller_id);

-- minigame_stats policies
DROP POLICY IF EXISTS "Anyone can view minigame stats" ON public.minigame_stats;
DROP POLICY IF EXISTS "Service role can manage minigame stats" ON public.minigame_stats;
CREATE POLICY "Anyone can view minigame stats" ON public.minigame_stats FOR SELECT USING (true);
CREATE POLICY "Service role can manage minigame stats" ON public.minigame_stats FOR ALL USING (auth.role() = 'service_role');

-- profile_comments policies
DROP POLICY IF EXISTS "No direct access to profile_comments" ON public.profile_comments;
CREATE POLICY "No direct access to profile_comments" ON public.profile_comments FOR ALL USING (false) WITH CHECK (false);

-- profile_likes policies
DROP POLICY IF EXISTS "No direct read access to profile_likes" ON public.profile_likes;
DROP POLICY IF EXISTS "No direct insert to profile_likes" ON public.profile_likes;
DROP POLICY IF EXISTS "No direct update to profile_likes" ON public.profile_likes;
DROP POLICY IF EXISTS "No direct delete to profile_likes" ON public.profile_likes;
CREATE POLICY "No direct read access to profile_likes" ON public.profile_likes FOR SELECT USING (false);
CREATE POLICY "No direct insert to profile_likes" ON public.profile_likes FOR INSERT WITH CHECK (false);
CREATE POLICY "No direct update to profile_likes" ON public.profile_likes FOR UPDATE USING (false);
CREATE POLICY "No direct delete to profile_likes" ON public.profile_likes FOR DELETE USING (false);

-- user_balances policies
DROP POLICY IF EXISTS "Users can view own balance" ON public.user_balances;
DROP POLICY IF EXISTS "Service role can manage balances" ON public.user_balances;
CREATE POLICY "Users can view own balance" ON public.user_balances FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Service role can manage balances" ON public.user_balances FOR ALL USING (auth.role() = 'service_role');

-- user_inventory policies
DROP POLICY IF EXISTS "Users can view own inventory" ON public.user_inventory;
DROP POLICY IF EXISTS "Service role can manage inventory" ON public.user_inventory;
CREATE POLICY "Users can view own inventory" ON public.user_inventory FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Service role can manage inventory" ON public.user_inventory FOR ALL USING (auth.role() = 'service_role');

-- user_streaks policies
DROP POLICY IF EXISTS "Users can view own streaks" ON public.user_streaks;
DROP POLICY IF EXISTS "Service role can manage streaks" ON public.user_streaks;
CREATE POLICY "Users can view own streaks" ON public.user_streaks FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Service role can manage streaks" ON public.user_streaks FOR ALL USING (auth.role() = 'service_role');

-- uv_transactions policies
DROP POLICY IF EXISTS "Users can view own transactions" ON public.uv_transactions;
DROP POLICY IF EXISTS "Service role can manage transactions" ON public.uv_transactions;
CREATE POLICY "Users can view own transactions" ON public.uv_transactions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Service role can manage transactions" ON public.uv_transactions FOR ALL USING (auth.role() = 'service_role');

-- =====================================================
-- DONE!
-- =====================================================
SELECT 'Migration complete! All missing tables and policies created.' AS status;
