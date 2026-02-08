-- =============================================================================
-- COMPLETE FIX SCRIPT FOR EXTERNAL SUPABASE
-- Run this AFTER COMPLETE_SCHEMA.sql
-- This creates ALL helper functions and RLS policies
-- =============================================================================

-- =============================================================================
-- PART 1: DROP EXISTING POLICIES (to avoid conflicts)
-- =============================================================================
DO $$ 
DECLARE
  pol RECORD;
BEGIN
  FOR pol IN 
    SELECT schemaname, tablename, policyname 
    FROM pg_policies 
    WHERE schemaname = 'public'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', 
      pol.policyname, pol.schemaname, pol.tablename);
  END LOOP;
END $$;

-- =============================================================================
-- PART 2: CREATE ENUM TYPE (if not exists)
-- =============================================================================
DO $$ BEGIN
  CREATE TYPE public.app_role AS ENUM ('admin', 'moderator', 'supporter');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- =============================================================================
-- PART 3: CORE HELPER FUNCTIONS
-- =============================================================================

-- has_role function
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- is_profile_owner function
CREATE OR REPLACE FUNCTION public.is_profile_owner(p_profile_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = p_profile_id AND user_id = auth.uid()
  )
$$;

-- update_updated_at_column function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- =============================================================================
-- PART 4: RLS - ENABLE ON ALL TABLES
-- =============================================================================
ALTER TABLE IF EXISTS public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.global_badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.user_badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.social_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.profile_views ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.profile_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.profile_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.discord_presence ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.discord_integrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.link_clicks ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.user_balances ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.user_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.user_streaks ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.uv_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.marketplace_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.marketplace_purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.badge_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.badge_steals ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.badge_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.friend_badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.banned_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.promo_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.promo_code_uses ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.verification_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.support_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.support_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.live_chat_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.live_chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.admin_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.admin_webhooks ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.admin_discord_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.alias_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.bot_commands ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.bot_command_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.discord_bot_verification ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.cases ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.case_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.case_battles ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.case_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.battle_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.user_inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.daily_rewards ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.minigame_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.spotify_integrations ENABLE ROW LEVEL SECURITY;

-- =============================================================================
-- PART 5: PROFILES POLICIES (PUBLIC READ, OWNER WRITE)
-- =============================================================================
CREATE POLICY "profiles_public_read" ON public.profiles
  FOR SELECT USING (true);

CREATE POLICY "profiles_owner_insert" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "profiles_owner_update" ON public.profiles
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "profiles_admin_all" ON public.profiles
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- =============================================================================
-- PART 6: GLOBAL_BADGES POLICIES (PUBLIC READ)
-- =============================================================================
CREATE POLICY "global_badges_public_read" ON public.global_badges
  FOR SELECT USING (true);

CREATE POLICY "global_badges_admin_all" ON public.global_badges
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- =============================================================================
-- PART 7: USER_BADGES POLICIES
-- =============================================================================
CREATE POLICY "user_badges_public_read" ON public.user_badges
  FOR SELECT USING (true);

CREATE POLICY "user_badges_owner_insert" ON public.user_badges
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "user_badges_owner_update" ON public.user_badges
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "user_badges_owner_delete" ON public.user_badges
  FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "user_badges_admin_all" ON public.user_badges
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- =============================================================================
-- PART 8: BADGES (personal) POLICIES
-- =============================================================================
CREATE POLICY "badges_public_read" ON public.badges
  FOR SELECT USING (true);

CREATE POLICY "badges_admin_all" ON public.badges
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- =============================================================================
-- PART 9: SOCIAL_LINKS POLICIES
-- =============================================================================
CREATE POLICY "social_links_public_read" ON public.social_links
  FOR SELECT USING (true);

CREATE POLICY "social_links_owner_insert" ON public.social_links
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = profile_id AND user_id = auth.uid())
  );

CREATE POLICY "social_links_owner_update" ON public.social_links
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = profile_id AND user_id = auth.uid())
  );

CREATE POLICY "social_links_owner_delete" ON public.social_links
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = profile_id AND user_id = auth.uid())
  );

-- =============================================================================
-- PART 10: PROFILE_VIEWS POLICIES
-- =============================================================================
CREATE POLICY "profile_views_public_insert" ON public.profile_views
  FOR INSERT WITH CHECK (true);

CREATE POLICY "profile_views_owner_read" ON public.profile_views
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = profile_id AND user_id = auth.uid())
    OR public.has_role(auth.uid(), 'admin')
  );

-- =============================================================================
-- PART 11: PROFILE_LIKES POLICIES
-- =============================================================================
CREATE POLICY "profile_likes_public_read" ON public.profile_likes
  FOR SELECT USING (true);

CREATE POLICY "profile_likes_auth_insert" ON public.profile_likes
  FOR INSERT WITH CHECK (true);

CREATE POLICY "profile_likes_auth_update" ON public.profile_likes
  FOR UPDATE USING (true);

CREATE POLICY "profile_likes_auth_delete" ON public.profile_likes
  FOR DELETE USING (true);

-- =============================================================================
-- PART 12: PROFILE_COMMENTS POLICIES
-- =============================================================================
CREATE POLICY "profile_comments_owner_read" ON public.profile_comments
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = profile_id AND user_id = auth.uid())
    OR public.has_role(auth.uid(), 'admin')
  );

CREATE POLICY "profile_comments_auth_insert" ON public.profile_comments
  FOR INSERT WITH CHECK (true);

CREATE POLICY "profile_comments_owner_delete" ON public.profile_comments
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = profile_id AND user_id = auth.uid())
    OR public.has_role(auth.uid(), 'admin')
  );

-- =============================================================================
-- PART 13: DISCORD_PRESENCE POLICIES
-- =============================================================================
CREATE POLICY "discord_presence_public_read" ON public.discord_presence
  FOR SELECT USING (true);

CREATE POLICY "discord_presence_owner_all" ON public.discord_presence
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = profile_id AND user_id = auth.uid())
  );

-- =============================================================================
-- PART 14: DISCORD_INTEGRATIONS POLICIES
-- =============================================================================
CREATE POLICY "discord_integrations_owner_all" ON public.discord_integrations
  FOR ALL USING (auth.uid() = user_id);

-- =============================================================================
-- PART 15: LINK_CLICKS POLICIES
-- =============================================================================
CREATE POLICY "link_clicks_public_insert" ON public.link_clicks
  FOR INSERT WITH CHECK (true);

CREATE POLICY "link_clicks_owner_read" ON public.link_clicks
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM social_links sl
      JOIN profiles p ON p.id = sl.profile_id
      WHERE sl.id = link_clicks.link_id AND p.user_id = auth.uid()
    )
    OR public.has_role(auth.uid(), 'admin')
  );

-- =============================================================================
-- PART 16: USER_ROLES POLICIES
-- =============================================================================
CREATE POLICY "user_roles_admin_all" ON public.user_roles
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "user_roles_own_read" ON public.user_roles
  FOR SELECT USING (auth.uid() = user_id);

-- =============================================================================
-- PART 17: USER_BALANCES POLICIES
-- =============================================================================
CREATE POLICY "user_balances_owner_read" ON public.user_balances
  FOR SELECT USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "user_balances_admin_all" ON public.user_balances
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- =============================================================================
-- PART 18: USER_NOTIFICATIONS POLICIES
-- =============================================================================
CREATE POLICY "user_notifications_owner_all" ON public.user_notifications
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "user_notifications_admin_insert" ON public.user_notifications
  FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- =============================================================================
-- PART 19: USER_STREAKS POLICIES
-- =============================================================================
CREATE POLICY "user_streaks_owner_read" ON public.user_streaks
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "user_streaks_owner_insert" ON public.user_streaks
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "user_streaks_owner_update" ON public.user_streaks
  FOR UPDATE USING (auth.uid() = user_id);

-- =============================================================================
-- PART 20: UV_TRANSACTIONS POLICIES
-- =============================================================================
CREATE POLICY "uv_transactions_owner_read" ON public.uv_transactions
  FOR SELECT USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

-- =============================================================================
-- PART 21: MARKETPLACE_ITEMS POLICIES
-- =============================================================================
CREATE POLICY "marketplace_items_public_read" ON public.marketplace_items
  FOR SELECT USING (status = 'approved' OR auth.uid() = seller_id OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "marketplace_items_owner_insert" ON public.marketplace_items
  FOR INSERT WITH CHECK (auth.uid() = seller_id);

CREATE POLICY "marketplace_items_owner_update" ON public.marketplace_items
  FOR UPDATE USING (auth.uid() = seller_id OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "marketplace_items_owner_delete" ON public.marketplace_items
  FOR DELETE USING (auth.uid() = seller_id OR public.has_role(auth.uid(), 'admin'));

-- =============================================================================
-- PART 22: MARKETPLACE_PURCHASES POLICIES
-- =============================================================================
CREATE POLICY "marketplace_purchases_owner_read" ON public.marketplace_purchases
  FOR SELECT USING (
    auth.uid() = buyer_id 
    OR auth.uid() = seller_id 
    OR public.has_role(auth.uid(), 'admin')
  );

-- =============================================================================
-- PART 23: BADGE_EVENTS POLICIES
-- =============================================================================
CREATE POLICY "badge_events_public_read" ON public.badge_events
  FOR SELECT USING (true);

CREATE POLICY "badge_events_admin_all" ON public.badge_events
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- =============================================================================
-- PART 24: BADGE_STEALS POLICIES
-- =============================================================================
CREATE POLICY "badge_steals_public_read" ON public.badge_steals
  FOR SELECT USING (true);

CREATE POLICY "badge_steals_auth_insert" ON public.badge_steals
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- =============================================================================
-- PART 25: BADGE_REQUESTS POLICIES
-- =============================================================================
CREATE POLICY "badge_requests_owner_read" ON public.badge_requests
  FOR SELECT USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "badge_requests_owner_insert" ON public.badge_requests
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "badge_requests_admin_update" ON public.badge_requests
  FOR UPDATE USING (public.has_role(auth.uid(), 'admin'));

-- =============================================================================
-- PART 26: FRIEND_BADGES POLICIES
-- =============================================================================
CREATE POLICY "friend_badges_public_read" ON public.friend_badges
  FOR SELECT USING (true);

CREATE POLICY "friend_badges_creator_insert" ON public.friend_badges
  FOR INSERT WITH CHECK (auth.uid() = creator_id);

CREATE POLICY "friend_badges_creator_update" ON public.friend_badges
  FOR UPDATE USING (auth.uid() = creator_id);

CREATE POLICY "friend_badges_creator_delete" ON public.friend_badges
  FOR DELETE USING (auth.uid() = creator_id);

CREATE POLICY "friend_badges_recipient_update" ON public.friend_badges
  FOR UPDATE USING (auth.uid() = recipient_id);

-- =============================================================================
-- PART 27: BANNED_USERS POLICIES
-- =============================================================================
CREATE POLICY "banned_users_admin_all" ON public.banned_users
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "banned_users_self_read" ON public.banned_users
  FOR SELECT USING (auth.uid() = user_id);

-- =============================================================================
-- PART 28: PURCHASES POLICIES
-- =============================================================================
CREATE POLICY "purchases_owner_read" ON public.purchases
  FOR SELECT USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

-- =============================================================================
-- PART 29: PROMO_CODES POLICIES
-- =============================================================================
CREATE POLICY "promo_codes_admin_all" ON public.promo_codes
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "promo_codes_auth_read_active" ON public.promo_codes
  FOR SELECT USING (is_active = true AND auth.uid() IS NOT NULL);

-- =============================================================================
-- PART 30: PROMO_CODE_USES POLICIES
-- =============================================================================
CREATE POLICY "promo_code_uses_owner_read" ON public.promo_code_uses
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "promo_code_uses_auth_insert" ON public.promo_code_uses
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- =============================================================================
-- PART 31: VERIFICATION_CODES POLICIES
-- =============================================================================
CREATE POLICY "verification_codes_admin_all" ON public.verification_codes
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- =============================================================================
-- PART 32: SUPPORT_TICKETS POLICIES
-- =============================================================================
CREATE POLICY "support_tickets_owner_read" ON public.support_tickets
  FOR SELECT USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "support_tickets_auth_insert" ON public.support_tickets
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "support_tickets_admin_update" ON public.support_tickets
  FOR UPDATE USING (public.has_role(auth.uid(), 'admin'));

-- =============================================================================
-- PART 33: SUPPORT_MESSAGES POLICIES
-- =============================================================================
CREATE POLICY "support_messages_ticket_owner" ON public.support_messages
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM support_tickets st
      WHERE st.id = ticket_id AND (st.user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'))
    )
  );

CREATE POLICY "support_messages_auth_insert" ON public.support_messages
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM support_tickets st
      WHERE st.id = ticket_id AND (st.user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'))
    )
  );

-- =============================================================================
-- PART 34: LIVE_CHAT_CONVERSATIONS POLICIES
-- =============================================================================
CREATE POLICY "live_chat_conversations_user_own" ON public.live_chat_conversations
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "live_chat_conversations_admin_all" ON public.live_chat_conversations
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- =============================================================================
-- PART 35: LIVE_CHAT_MESSAGES POLICIES
-- =============================================================================
CREATE POLICY "live_chat_messages_conversation_access" ON public.live_chat_messages
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM live_chat_conversations c
      WHERE c.id = conversation_id 
      AND (c.user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'))
    )
  );

CREATE POLICY "live_chat_messages_auth_insert" ON public.live_chat_messages
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM live_chat_conversations c
      WHERE c.id = conversation_id 
      AND (c.user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'))
    )
  );

-- =============================================================================
-- PART 36: ADMIN TABLES POLICIES
-- =============================================================================
CREATE POLICY "admin_notifications_public_read" ON public.admin_notifications
  FOR SELECT USING (is_active = true);

CREATE POLICY "admin_notifications_admin_all" ON public.admin_notifications
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "admin_webhooks_admin_all" ON public.admin_webhooks
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "admin_discord_roles_admin_all" ON public.admin_discord_roles
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- =============================================================================
-- PART 37: ALIAS_REQUESTS POLICIES
-- =============================================================================
CREATE POLICY "alias_requests_owner_read" ON public.alias_requests
  FOR SELECT USING (
    auth.uid() = requester_id 
    OR auth.uid() = target_user_id 
    OR public.has_role(auth.uid(), 'admin')
  );

CREATE POLICY "alias_requests_auth_insert" ON public.alias_requests
  FOR INSERT WITH CHECK (auth.uid() = requester_id);

CREATE POLICY "alias_requests_target_update" ON public.alias_requests
  FOR UPDATE USING (auth.uid() = target_user_id OR public.has_role(auth.uid(), 'admin'));

-- =============================================================================
-- PART 38: BOT_COMMANDS POLICIES
-- =============================================================================
CREATE POLICY "bot_commands_public_read" ON public.bot_commands
  FOR SELECT USING (true);

CREATE POLICY "bot_commands_admin_all" ON public.bot_commands
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- =============================================================================
-- PART 39: BOT_COMMAND_NOTIFICATIONS POLICIES
-- =============================================================================
CREATE POLICY "bot_command_notifications_admin_all" ON public.bot_command_notifications
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- =============================================================================
-- PART 40: DISCORD_BOT_VERIFICATION POLICIES
-- =============================================================================
CREATE POLICY "discord_bot_verification_owner_all" ON public.discord_bot_verification
  FOR ALL USING (auth.uid() = user_id);

-- =============================================================================
-- PART 41: CASES & GAMBLING POLICIES
-- =============================================================================
CREATE POLICY "cases_public_read" ON public.cases
  FOR SELECT USING (active = true OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "cases_admin_all" ON public.cases
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "case_items_public_read" ON public.case_items
  FOR SELECT USING (true);

CREATE POLICY "case_items_admin_all" ON public.case_items
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "case_battles_public_read" ON public.case_battles
  FOR SELECT USING (true);

CREATE POLICY "case_battles_auth_insert" ON public.case_battles
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "case_transactions_owner_read" ON public.case_transactions
  FOR SELECT USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "battle_participants_public_read" ON public.battle_participants
  FOR SELECT USING (true);

CREATE POLICY "battle_participants_auth_insert" ON public.battle_participants
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- =============================================================================
-- PART 42: USER_INVENTORY POLICIES
-- =============================================================================
CREATE POLICY "user_inventory_owner_read" ON public.user_inventory
  FOR SELECT USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "user_inventory_owner_update" ON public.user_inventory
  FOR UPDATE USING (auth.uid() = user_id);

-- =============================================================================
-- PART 43: DAILY_REWARDS POLICIES
-- =============================================================================
CREATE POLICY "daily_rewards_owner_all" ON public.daily_rewards
  FOR ALL USING (auth.uid() = user_id);

-- =============================================================================
-- PART 44: MINIGAME_STATS POLICIES
-- =============================================================================
CREATE POLICY "minigame_stats_owner_read" ON public.minigame_stats
  FOR SELECT USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

-- =============================================================================
-- PART 45: SPOTIFY_INTEGRATIONS POLICIES
-- =============================================================================
CREATE POLICY "spotify_integrations_owner_all" ON public.spotify_integrations
  FOR ALL USING (auth.uid() = user_id);

-- =============================================================================
-- PART 46: CREATE PUBLIC VIEW FOR SPOTIFY (hides tokens)
-- =============================================================================
DROP VIEW IF EXISTS public.spotify_integrations_public;
CREATE VIEW public.spotify_integrations_public 
WITH (security_invoker=on) AS
  SELECT id, user_id, show_on_profile, created_at, updated_at
  FROM public.spotify_integrations;

-- =============================================================================
-- PART 47: RPC FUNCTIONS FOR PUBLIC DATA ACCESS
-- =============================================================================

-- Get public profile by username
CREATE OR REPLACE FUNCTION public.get_public_profile(p_username text)
RETURNS TABLE (
  id uuid,
  username text,
  display_name text,
  bio text,
  avatar_url text,
  background_url text,
  background_video_url text,
  accent_color text,
  text_color text,
  card_color text,
  background_color text,
  is_premium boolean,
  views_count integer,
  likes_count integer,
  dislikes_count integer,
  show_badges boolean,
  show_links boolean,
  show_avatar boolean,
  show_views boolean,
  show_likes boolean,
  show_comments boolean,
  created_at timestamptz
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT 
    p.id,
    p.username,
    p.display_name,
    p.bio,
    p.avatar_url,
    p.background_url,
    p.background_video_url,
    p.accent_color,
    p.text_color,
    p.card_color,
    p.background_color,
    p.is_premium,
    p.views_count,
    p.likes_count,
    p.dislikes_count,
    p.show_badges,
    p.show_links,
    p.show_avatar,
    p.show_views,
    p.show_likes,
    p.show_comments,
    p.created_at
  FROM profiles p
  WHERE LOWER(p.username) = LOWER(p_username)
     OR LOWER(p.alias_username) = LOWER(p_username);
$$;

-- Get profile badges
CREATE OR REPLACE FUNCTION public.get_profile_badges(p_profile_id uuid)
RETURNS TABLE (
  id uuid,
  name text,
  description text,
  icon_url text,
  color text,
  rarity text
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT 
    gb.id,
    gb.name,
    gb.description,
    gb.icon_url,
    gb.color,
    gb.rarity
  FROM user_badges ub
  INNER JOIN global_badges gb ON ub.badge_id = gb.id
  INNER JOIN profiles p ON p.user_id = ub.user_id
  WHERE p.id = p_profile_id
    AND ub.is_enabled = true
    AND COALESCE(ub.is_locked, false) = false
  ORDER BY ub.display_order NULLS LAST, ub.claimed_at;
$$;

-- Get profile badges with friend badges
CREATE OR REPLACE FUNCTION public.get_profile_badges_with_friends(p_profile_id uuid)
RETURNS TABLE (
  id uuid,
  name text,
  description text,
  icon_url text,
  color text,
  rarity text,
  custom_color text,
  display_order integer,
  badge_type text
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  -- Global badges
  SELECT 
    gb.id,
    gb.name,
    gb.description,
    gb.icon_url,
    COALESCE(ub.custom_color, gb.color) as color,
    gb.rarity,
    ub.custom_color,
    ub.display_order,
    'global'::text as badge_type
  FROM user_badges ub
  INNER JOIN global_badges gb ON ub.badge_id = gb.id
  INNER JOIN profiles p ON p.user_id = ub.user_id
  WHERE p.id = p_profile_id
    AND ub.is_enabled = true
    AND COALESCE(ub.is_locked, false) = false
  
  UNION ALL
  
  -- Friend badges
  SELECT 
    fb.id,
    fb.name,
    fb.description,
    fb.icon_url,
    fb.color,
    'friend'::text as rarity,
    fb.color as custom_color,
    fb.display_order,
    'friend'::text as badge_type
  FROM friend_badges fb
  INNER JOIN profiles p ON p.user_id = fb.recipient_id
  WHERE p.id = p_profile_id
    AND fb.is_enabled = true
  
  ORDER BY display_order NULLS LAST;
$$;

-- Get profile like counts
CREATE OR REPLACE FUNCTION public.get_profile_like_counts(p_profile_id uuid)
RETURNS TABLE (likes_count integer, dislikes_count integer)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT p.likes_count, p.dislikes_count
  FROM profiles p
  WHERE p.id = p_profile_id;
$$;

-- Get profile comments count
CREATE OR REPLACE FUNCTION public.get_profile_comments_count(p_profile_id uuid)
RETURNS integer
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT COUNT(*)::integer
  FROM profile_comments
  WHERE profile_id = p_profile_id
    AND expires_at > now();
$$;

-- Get public badges list
CREATE OR REPLACE FUNCTION public.get_public_badges()
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
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT 
    id,
    name,
    description,
    icon_url,
    color,
    rarity,
    is_limited,
    max_claims,
    claims_count,
    created_at
  FROM global_badges
  ORDER BY created_at DESC;
$$;

-- Get discord presence for profile
CREATE OR REPLACE FUNCTION public.get_profile_discord_presence(p_profile_id uuid)
RETURNS TABLE (
  status text,
  activity_name text,
  activity_type text,
  activity_state text,
  activity_details text,
  activity_large_image text,
  username text,
  avatar text,
  discord_user_id text
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT 
    dp.status,
    dp.activity_name,
    dp.activity_type,
    dp.activity_state,
    dp.activity_details,
    dp.activity_large_image,
    dp.username,
    dp.avatar,
    dp.discord_user_id
  FROM discord_presence dp
  WHERE dp.profile_id = p_profile_id;
$$;

-- =============================================================================
-- DONE! All helper functions and RLS policies have been created.
-- =============================================================================
