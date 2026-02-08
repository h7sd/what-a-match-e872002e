-- =============================================================================
-- COMPLETE FIX SCRIPT FOR EXTERNAL SUPABASE (SCHEMA-TOLERANT)
-- Run this AFTER COMPLETE_SCHEMA.sql
-- This script automatically adapts to your existing schema
-- =============================================================================

-- =============================================================================
-- PART 1: DROP ALL EXISTING POLICIES (to avoid conflicts)
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
-- PART 4: ENABLE RLS ON ALL TABLES (safe - only if table exists)
-- =============================================================================
DO $$
DECLARE
  tbl TEXT;
  tables TEXT[] := ARRAY[
    'profiles', 'badges', 'global_badges', 'user_badges', 'social_links',
    'profile_views', 'profile_likes', 'profile_comments', 'discord_presence',
    'discord_integrations', 'link_clicks', 'user_roles', 'user_balances',
    'user_notifications', 'user_streaks', 'uv_transactions', 'marketplace_items',
    'marketplace_purchases', 'badge_events', 'badge_steals', 'badge_requests',
    'friend_badges', 'banned_users', 'purchases', 'promo_codes', 'promo_code_uses',
    'verification_codes', 'support_tickets', 'support_messages',
    'live_chat_conversations', 'live_chat_messages', 'admin_notifications',
    'admin_webhooks', 'admin_discord_roles', 'alias_requests', 'bot_commands',
    'bot_command_notifications', 'discord_bot_verification', 'cases', 'case_items',
    'case_battles', 'case_transactions', 'battle_participants', 'user_inventory',
    'daily_rewards', 'minigame_stats', 'spotify_integrations'
  ];
BEGIN
  FOREACH tbl IN ARRAY tables LOOP
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = tbl) THEN
      EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', tbl);
    END IF;
  END LOOP;
END $$;

-- =============================================================================
-- PART 5: CREATE POLICIES - PROFILES
-- =============================================================================
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'profiles') THEN
    -- Check if user_id column exists
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'user_id') THEN
      EXECUTE 'CREATE POLICY "profiles_public_read" ON public.profiles FOR SELECT USING (true)';
      EXECUTE 'CREATE POLICY "profiles_owner_insert" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = user_id)';
      EXECUTE 'CREATE POLICY "profiles_owner_update" ON public.profiles FOR UPDATE USING (auth.uid() = user_id)';
      EXECUTE 'CREATE POLICY "profiles_owner_delete" ON public.profiles FOR DELETE USING (auth.uid() = user_id)';
      EXECUTE 'CREATE POLICY "profiles_admin_all" ON public.profiles FOR ALL USING (public.has_role(auth.uid(), ''admin''))';
    ELSE
      -- Fallback: public read only
      EXECUTE 'CREATE POLICY "profiles_public_read" ON public.profiles FOR SELECT USING (true)';
    END IF;
  END IF;
END $$;

-- =============================================================================
-- PART 6: CREATE POLICIES - GLOBAL_BADGES
-- =============================================================================
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'global_badges') THEN
    EXECUTE 'CREATE POLICY "global_badges_public_read" ON public.global_badges FOR SELECT USING (true)';
    EXECUTE 'CREATE POLICY "global_badges_admin_all" ON public.global_badges FOR ALL USING (public.has_role(auth.uid(), ''admin''))';
  END IF;
END $$;

-- =============================================================================
-- PART 7: CREATE POLICIES - USER_BADGES
-- =============================================================================
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'user_badges') THEN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'user_badges' AND column_name = 'user_id') THEN
      EXECUTE 'CREATE POLICY "user_badges_public_read" ON public.user_badges FOR SELECT USING (true)';
      EXECUTE 'CREATE POLICY "user_badges_owner_insert" ON public.user_badges FOR INSERT WITH CHECK (auth.uid() = user_id)';
      EXECUTE 'CREATE POLICY "user_badges_owner_update" ON public.user_badges FOR UPDATE USING (auth.uid() = user_id)';
      EXECUTE 'CREATE POLICY "user_badges_owner_delete" ON public.user_badges FOR DELETE USING (auth.uid() = user_id)';
      EXECUTE 'CREATE POLICY "user_badges_admin_all" ON public.user_badges FOR ALL USING (public.has_role(auth.uid(), ''admin''))';
    ELSE
      EXECUTE 'CREATE POLICY "user_badges_public_read" ON public.user_badges FOR SELECT USING (true)';
    END IF;
  END IF;
END $$;

-- =============================================================================
-- PART 8: CREATE POLICIES - BADGES (personal badges)
-- =============================================================================
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'badges') THEN
    EXECUTE 'CREATE POLICY "badges_public_read" ON public.badges FOR SELECT USING (true)';
    
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'badges' AND column_name = 'profile_id') THEN
      EXECUTE 'CREATE POLICY "badges_owner_insert" ON public.badges FOR INSERT WITH CHECK (public.is_profile_owner(profile_id))';
      EXECUTE 'CREATE POLICY "badges_owner_update" ON public.badges FOR UPDATE USING (public.is_profile_owner(profile_id))';
      EXECUTE 'CREATE POLICY "badges_owner_delete" ON public.badges FOR DELETE USING (public.is_profile_owner(profile_id))';
    END IF;
    
    EXECUTE 'CREATE POLICY "badges_admin_all" ON public.badges FOR ALL USING (public.has_role(auth.uid(), ''admin''))';
  END IF;
END $$;

-- =============================================================================
-- PART 9: CREATE POLICIES - SOCIAL_LINKS
-- =============================================================================
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'social_links') THEN
    EXECUTE 'CREATE POLICY "social_links_public_read" ON public.social_links FOR SELECT USING (true)';
    
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'social_links' AND column_name = 'profile_id') THEN
      EXECUTE 'CREATE POLICY "social_links_owner_insert" ON public.social_links FOR INSERT WITH CHECK (public.is_profile_owner(profile_id))';
      EXECUTE 'CREATE POLICY "social_links_owner_update" ON public.social_links FOR UPDATE USING (public.is_profile_owner(profile_id))';
      EXECUTE 'CREATE POLICY "social_links_owner_delete" ON public.social_links FOR DELETE USING (public.is_profile_owner(profile_id))';
    END IF;
  END IF;
END $$;

-- =============================================================================
-- PART 10: CREATE POLICIES - PROFILE_VIEWS
-- =============================================================================
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'profile_views') THEN
    -- Always allow insert for tracking
    EXECUTE 'CREATE POLICY "profile_views_public_insert" ON public.profile_views FOR INSERT WITH CHECK (true)';
    
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'profile_views' AND column_name = 'profile_id') THEN
      EXECUTE 'CREATE POLICY "profile_views_owner_read" ON public.profile_views FOR SELECT USING (public.is_profile_owner(profile_id) OR public.has_role(auth.uid(), ''admin''))';
    ELSE
      EXECUTE 'CREATE POLICY "profile_views_admin_read" ON public.profile_views FOR SELECT USING (public.has_role(auth.uid(), ''admin''))';
    END IF;
  END IF;
END $$;

-- =============================================================================
-- PART 11: CREATE POLICIES - PROFILE_LIKES
-- =============================================================================
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'profile_likes') THEN
    -- Access only via edge functions (SECURITY DEFINER)
    EXECUTE 'CREATE POLICY "profile_likes_deny_direct" ON public.profile_likes FOR ALL USING (false)';
  END IF;
END $$;

-- =============================================================================
-- PART 12: CREATE POLICIES - PROFILE_COMMENTS
-- =============================================================================
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'profile_comments') THEN
    -- Access only via edge functions (SECURITY DEFINER)
    EXECUTE 'CREATE POLICY "profile_comments_deny_direct" ON public.profile_comments FOR ALL USING (false)';
  END IF;
END $$;

-- =============================================================================
-- PART 13: CREATE POLICIES - DISCORD_PRESENCE
-- =============================================================================
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'discord_presence') THEN
    EXECUTE 'CREATE POLICY "discord_presence_public_read" ON public.discord_presence FOR SELECT USING (true)';
    
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'discord_presence' AND column_name = 'profile_id') THEN
      EXECUTE 'CREATE POLICY "discord_presence_owner_all" ON public.discord_presence FOR ALL USING (public.is_profile_owner(profile_id))';
    END IF;
  END IF;
END $$;

-- =============================================================================
-- PART 14: CREATE POLICIES - DISCORD_INTEGRATIONS
-- =============================================================================
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'discord_integrations') THEN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'discord_integrations' AND column_name = 'user_id') THEN
      EXECUTE 'CREATE POLICY "discord_integrations_owner_all" ON public.discord_integrations FOR ALL USING (auth.uid() = user_id)';
    END IF;
  END IF;
END $$;

-- =============================================================================
-- PART 15: CREATE POLICIES - LINK_CLICKS
-- =============================================================================
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'link_clicks') THEN
    EXECUTE 'CREATE POLICY "link_clicks_public_insert" ON public.link_clicks FOR INSERT WITH CHECK (true)';
    
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'link_clicks' AND column_name = 'link_id') THEN
      EXECUTE 'CREATE POLICY "link_clicks_owner_read" ON public.link_clicks FOR SELECT USING (
        EXISTS (SELECT 1 FROM social_links sl JOIN profiles p ON p.id = sl.profile_id WHERE sl.id = link_clicks.link_id AND p.user_id = auth.uid())
        OR public.has_role(auth.uid(), ''admin'')
      )';
    ELSE
      EXECUTE 'CREATE POLICY "link_clicks_admin_read" ON public.link_clicks FOR SELECT USING (public.has_role(auth.uid(), ''admin''))';
    END IF;
  END IF;
END $$;

-- =============================================================================
-- PART 16: CREATE POLICIES - USER_ROLES
-- =============================================================================
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'user_roles') THEN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'user_roles' AND column_name = 'user_id') THEN
      EXECUTE 'CREATE POLICY "user_roles_admin_all" ON public.user_roles FOR ALL USING (public.has_role(auth.uid(), ''admin''))';
      EXECUTE 'CREATE POLICY "user_roles_own_read" ON public.user_roles FOR SELECT USING (auth.uid() = user_id)';
    END IF;
  END IF;
END $$;

-- =============================================================================
-- PART 17: CREATE POLICIES - USER_BALANCES
-- =============================================================================
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'user_balances') THEN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'user_balances' AND column_name = 'user_id') THEN
      EXECUTE 'CREATE POLICY "user_balances_owner_read" ON public.user_balances FOR SELECT USING (auth.uid() = user_id OR public.has_role(auth.uid(), ''admin''))';
      EXECUTE 'CREATE POLICY "user_balances_admin_all" ON public.user_balances FOR ALL USING (public.has_role(auth.uid(), ''admin''))';
    END IF;
  END IF;
END $$;

-- =============================================================================
-- PART 18: CREATE POLICIES - USER_NOTIFICATIONS
-- =============================================================================
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'user_notifications') THEN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'user_notifications' AND column_name = 'user_id') THEN
      EXECUTE 'CREATE POLICY "user_notifications_owner_all" ON public.user_notifications FOR ALL USING (auth.uid() = user_id)';
      EXECUTE 'CREATE POLICY "user_notifications_admin_insert" ON public.user_notifications FOR INSERT WITH CHECK (public.has_role(auth.uid(), ''admin''))';
    END IF;
  END IF;
END $$;

-- =============================================================================
-- PART 19: CREATE POLICIES - USER_STREAKS
-- =============================================================================
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'user_streaks') THEN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'user_streaks' AND column_name = 'user_id') THEN
      EXECUTE 'CREATE POLICY "user_streaks_owner_all" ON public.user_streaks FOR ALL USING (auth.uid() = user_id)';
    END IF;
  END IF;
END $$;

-- =============================================================================
-- PART 20: CREATE POLICIES - UV_TRANSACTIONS
-- =============================================================================
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'uv_transactions') THEN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'uv_transactions' AND column_name = 'user_id') THEN
      EXECUTE 'CREATE POLICY "uv_transactions_owner_read" ON public.uv_transactions FOR SELECT USING (auth.uid() = user_id OR public.has_role(auth.uid(), ''admin''))';
    END IF;
  END IF;
END $$;

-- =============================================================================
-- PART 21: CREATE POLICIES - MARKETPLACE_ITEMS
-- =============================================================================
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'marketplace_items') THEN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'marketplace_items' AND column_name = 'seller_id') THEN
      EXECUTE 'CREATE POLICY "marketplace_items_public_read" ON public.marketplace_items FOR SELECT USING (status = ''approved'' OR auth.uid() = seller_id OR public.has_role(auth.uid(), ''admin''))';
      EXECUTE 'CREATE POLICY "marketplace_items_owner_insert" ON public.marketplace_items FOR INSERT WITH CHECK (auth.uid() = seller_id)';
      EXECUTE 'CREATE POLICY "marketplace_items_owner_update" ON public.marketplace_items FOR UPDATE USING (auth.uid() = seller_id OR public.has_role(auth.uid(), ''admin''))';
      EXECUTE 'CREATE POLICY "marketplace_items_owner_delete" ON public.marketplace_items FOR DELETE USING (auth.uid() = seller_id OR public.has_role(auth.uid(), ''admin''))';
    ELSE
      EXECUTE 'CREATE POLICY "marketplace_items_public_read" ON public.marketplace_items FOR SELECT USING (true)';
    END IF;
  END IF;
END $$;

-- =============================================================================
-- PART 22: CREATE POLICIES - MARKETPLACE_PURCHASES
-- =============================================================================
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'marketplace_purchases') THEN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'marketplace_purchases' AND column_name = 'buyer_id') THEN
      EXECUTE 'CREATE POLICY "marketplace_purchases_owner_read" ON public.marketplace_purchases FOR SELECT USING (auth.uid() = buyer_id OR auth.uid() = seller_id OR public.has_role(auth.uid(), ''admin''))';
    END IF;
  END IF;
END $$;

-- =============================================================================
-- PART 23: CREATE POLICIES - BADGE_EVENTS
-- =============================================================================
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'badge_events') THEN
    EXECUTE 'CREATE POLICY "badge_events_public_read" ON public.badge_events FOR SELECT USING (true)';
    EXECUTE 'CREATE POLICY "badge_events_admin_all" ON public.badge_events FOR ALL USING (public.has_role(auth.uid(), ''admin''))';
  END IF;
END $$;

-- =============================================================================
-- PART 24: CREATE POLICIES - BADGE_STEALS
-- =============================================================================
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'badge_steals') THEN
    EXECUTE 'CREATE POLICY "badge_steals_public_read" ON public.badge_steals FOR SELECT USING (true)';
    EXECUTE 'CREATE POLICY "badge_steals_auth_insert" ON public.badge_steals FOR INSERT WITH CHECK (auth.uid() IS NOT NULL)';
  END IF;
END $$;

-- =============================================================================
-- PART 25: CREATE POLICIES - BADGE_REQUESTS
-- =============================================================================
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'badge_requests') THEN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'badge_requests' AND column_name = 'user_id') THEN
      EXECUTE 'CREATE POLICY "badge_requests_owner_read" ON public.badge_requests FOR SELECT USING (auth.uid() = user_id OR public.has_role(auth.uid(), ''admin''))';
      EXECUTE 'CREATE POLICY "badge_requests_owner_insert" ON public.badge_requests FOR INSERT WITH CHECK (auth.uid() = user_id)';
      EXECUTE 'CREATE POLICY "badge_requests_admin_update" ON public.badge_requests FOR UPDATE USING (public.has_role(auth.uid(), ''admin''))';
    END IF;
  END IF;
END $$;

-- =============================================================================
-- PART 26: CREATE POLICIES - FRIEND_BADGES
-- =============================================================================
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'friend_badges') THEN
    EXECUTE 'CREATE POLICY "friend_badges_public_read" ON public.friend_badges FOR SELECT USING (true)';
    
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'friend_badges' AND column_name = 'creator_id') THEN
      EXECUTE 'CREATE POLICY "friend_badges_creator_insert" ON public.friend_badges FOR INSERT WITH CHECK (auth.uid() = creator_id)';
      EXECUTE 'CREATE POLICY "friend_badges_creator_manage" ON public.friend_badges FOR ALL USING (auth.uid() = creator_id OR auth.uid() = recipient_id)';
    END IF;
  END IF;
END $$;

-- =============================================================================
-- PART 27: CREATE POLICIES - BANNED_USERS
-- =============================================================================
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'banned_users') THEN
    EXECUTE 'CREATE POLICY "banned_users_admin_all" ON public.banned_users FOR ALL USING (public.has_role(auth.uid(), ''admin''))';
    
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'banned_users' AND column_name = 'user_id') THEN
      EXECUTE 'CREATE POLICY "banned_users_self_read" ON public.banned_users FOR SELECT USING (auth.uid() = user_id)';
    END IF;
  END IF;
END $$;

-- =============================================================================
-- PART 28: CREATE POLICIES - PURCHASES
-- =============================================================================
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'purchases') THEN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'purchases' AND column_name = 'user_id') THEN
      EXECUTE 'CREATE POLICY "purchases_owner_read" ON public.purchases FOR SELECT USING (auth.uid() = user_id OR public.has_role(auth.uid(), ''admin''))';
    END IF;
  END IF;
END $$;

-- =============================================================================
-- PART 29: CREATE POLICIES - PROMO_CODES
-- =============================================================================
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'promo_codes') THEN
    EXECUTE 'CREATE POLICY "promo_codes_admin_all" ON public.promo_codes FOR ALL USING (public.has_role(auth.uid(), ''admin''))';
    EXECUTE 'CREATE POLICY "promo_codes_auth_read" ON public.promo_codes FOR SELECT USING (is_active = true AND auth.uid() IS NOT NULL)';
  END IF;
END $$;

-- =============================================================================
-- PART 30: CREATE POLICIES - PROMO_CODE_USES
-- =============================================================================
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'promo_code_uses') THEN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'promo_code_uses' AND column_name = 'user_id') THEN
      EXECUTE 'CREATE POLICY "promo_code_uses_owner" ON public.promo_code_uses FOR ALL USING (auth.uid() = user_id)';
    END IF;
  END IF;
END $$;

-- =============================================================================
-- PART 31: CREATE POLICIES - VERIFICATION_CODES
-- =============================================================================
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'verification_codes') THEN
    EXECUTE 'CREATE POLICY "verification_codes_admin_all" ON public.verification_codes FOR ALL USING (public.has_role(auth.uid(), ''admin''))';
  END IF;
END $$;

-- =============================================================================
-- PART 32: CREATE POLICIES - SUPPORT_TICKETS
-- =============================================================================
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'support_tickets') THEN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'support_tickets' AND column_name = 'user_id') THEN
      EXECUTE 'CREATE POLICY "support_tickets_owner_read" ON public.support_tickets FOR SELECT USING (auth.uid() = user_id OR public.has_role(auth.uid(), ''admin''))';
      EXECUTE 'CREATE POLICY "support_tickets_auth_insert" ON public.support_tickets FOR INSERT WITH CHECK (auth.uid() IS NOT NULL)';
      EXECUTE 'CREATE POLICY "support_tickets_admin_update" ON public.support_tickets FOR UPDATE USING (public.has_role(auth.uid(), ''admin''))';
    END IF;
  END IF;
END $$;

-- =============================================================================
-- PART 33: CREATE POLICIES - SUPPORT_MESSAGES
-- =============================================================================
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'support_messages') THEN
    EXECUTE 'CREATE POLICY "support_messages_access" ON public.support_messages FOR ALL USING (
      EXISTS (SELECT 1 FROM support_tickets st WHERE st.id = ticket_id AND (st.user_id = auth.uid() OR public.has_role(auth.uid(), ''admin'')))
    )';
  END IF;
END $$;

-- =============================================================================
-- PART 34: CREATE POLICIES - LIVE_CHAT_CONVERSATIONS
-- =============================================================================
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'live_chat_conversations') THEN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'live_chat_conversations' AND column_name = 'user_id') THEN
      EXECUTE 'CREATE POLICY "live_chat_conversations_user" ON public.live_chat_conversations FOR ALL USING (auth.uid() = user_id)';
    END IF;
    EXECUTE 'CREATE POLICY "live_chat_conversations_admin" ON public.live_chat_conversations FOR ALL USING (public.has_role(auth.uid(), ''admin''))';
  END IF;
END $$;

-- =============================================================================
-- PART 35: CREATE POLICIES - LIVE_CHAT_MESSAGES
-- =============================================================================
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'live_chat_messages') THEN
    EXECUTE 'CREATE POLICY "live_chat_messages_access" ON public.live_chat_messages FOR ALL USING (
      EXISTS (SELECT 1 FROM live_chat_conversations c WHERE c.id = conversation_id AND (c.user_id = auth.uid() OR public.has_role(auth.uid(), ''admin'')))
    )';
  END IF;
END $$;

-- =============================================================================
-- PART 36: CREATE POLICIES - ADMIN TABLES
-- =============================================================================
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'admin_notifications') THEN
    EXECUTE 'CREATE POLICY "admin_notifications_public_read" ON public.admin_notifications FOR SELECT USING (is_active = true)';
    EXECUTE 'CREATE POLICY "admin_notifications_admin_all" ON public.admin_notifications FOR ALL USING (public.has_role(auth.uid(), ''admin''))';
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'admin_webhooks') THEN
    EXECUTE 'CREATE POLICY "admin_webhooks_admin_all" ON public.admin_webhooks FOR ALL USING (public.has_role(auth.uid(), ''admin''))';
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'admin_discord_roles') THEN
    EXECUTE 'CREATE POLICY "admin_discord_roles_admin_all" ON public.admin_discord_roles FOR ALL USING (public.has_role(auth.uid(), ''admin''))';
  END IF;
END $$;

-- =============================================================================
-- PART 37: CREATE POLICIES - ALIAS_REQUESTS
-- =============================================================================
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'alias_requests') THEN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'alias_requests' AND column_name = 'requester_id') THEN
      EXECUTE 'CREATE POLICY "alias_requests_access" ON public.alias_requests FOR ALL USING (auth.uid() = requester_id OR auth.uid() = target_user_id OR public.has_role(auth.uid(), ''admin''))';
    END IF;
  END IF;
END $$;

-- =============================================================================
-- PART 38: CREATE POLICIES - BOT_COMMANDS
-- =============================================================================
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'bot_commands') THEN
    EXECUTE 'CREATE POLICY "bot_commands_public_read" ON public.bot_commands FOR SELECT USING (true)';
    EXECUTE 'CREATE POLICY "bot_commands_admin_all" ON public.bot_commands FOR ALL USING (public.has_role(auth.uid(), ''admin''))';
  END IF;
END $$;

-- =============================================================================
-- PART 39: CREATE POLICIES - BOT_COMMAND_NOTIFICATIONS
-- =============================================================================
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'bot_command_notifications') THEN
    EXECUTE 'CREATE POLICY "bot_command_notifications_admin" ON public.bot_command_notifications FOR ALL USING (public.has_role(auth.uid(), ''admin''))';
  END IF;
END $$;

-- =============================================================================
-- PART 40: CREATE POLICIES - DISCORD_BOT_VERIFICATION
-- =============================================================================
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'discord_bot_verification') THEN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'discord_bot_verification' AND column_name = 'user_id') THEN
      EXECUTE 'CREATE POLICY "discord_bot_verification_owner" ON public.discord_bot_verification FOR ALL USING (auth.uid() = user_id)';
    END IF;
  END IF;
END $$;

-- =============================================================================
-- PART 41: CREATE POLICIES - CASES & GAMBLING
-- =============================================================================
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'cases') THEN
    EXECUTE 'CREATE POLICY "cases_public_read" ON public.cases FOR SELECT USING (active = true OR public.has_role(auth.uid(), ''admin''))';
    EXECUTE 'CREATE POLICY "cases_admin_all" ON public.cases FOR ALL USING (public.has_role(auth.uid(), ''admin''))';
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'case_items') THEN
    EXECUTE 'CREATE POLICY "case_items_public_read" ON public.case_items FOR SELECT USING (true)';
    EXECUTE 'CREATE POLICY "case_items_admin_all" ON public.case_items FOR ALL USING (public.has_role(auth.uid(), ''admin''))';
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'case_battles') THEN
    EXECUTE 'CREATE POLICY "case_battles_public_read" ON public.case_battles FOR SELECT USING (true)';
    EXECUTE 'CREATE POLICY "case_battles_auth_insert" ON public.case_battles FOR INSERT WITH CHECK (auth.uid() IS NOT NULL)';
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'case_transactions') THEN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'case_transactions' AND column_name = 'user_id') THEN
      EXECUTE 'CREATE POLICY "case_transactions_owner" ON public.case_transactions FOR SELECT USING (auth.uid() = user_id OR public.has_role(auth.uid(), ''admin''))';
    END IF;
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'battle_participants') THEN
    EXECUTE 'CREATE POLICY "battle_participants_public_read" ON public.battle_participants FOR SELECT USING (true)';
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'battle_participants' AND column_name = 'user_id') THEN
      EXECUTE 'CREATE POLICY "battle_participants_auth_insert" ON public.battle_participants FOR INSERT WITH CHECK (auth.uid() = user_id)';
    END IF;
  END IF;
END $$;

-- =============================================================================
-- PART 42: CREATE POLICIES - USER_INVENTORY
-- =============================================================================
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'user_inventory') THEN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'user_inventory' AND column_name = 'user_id') THEN
      EXECUTE 'CREATE POLICY "user_inventory_owner" ON public.user_inventory FOR ALL USING (auth.uid() = user_id OR public.has_role(auth.uid(), ''admin''))';
    END IF;
  END IF;
END $$;

-- =============================================================================
-- PART 43: CREATE POLICIES - DAILY_REWARDS
-- =============================================================================
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'daily_rewards') THEN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'daily_rewards' AND column_name = 'user_id') THEN
      EXECUTE 'CREATE POLICY "daily_rewards_owner" ON public.daily_rewards FOR ALL USING (auth.uid() = user_id)';
    END IF;
  END IF;
END $$;

-- =============================================================================
-- PART 44: CREATE POLICIES - MINIGAME_STATS
-- =============================================================================
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'minigame_stats') THEN
    EXECUTE 'CREATE POLICY "minigame_stats_public_read" ON public.minigame_stats FOR SELECT USING (true)';
  END IF;
END $$;

-- =============================================================================
-- PART 45: CREATE POLICIES - SPOTIFY_INTEGRATIONS
-- =============================================================================
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'spotify_integrations'
  ) THEN
    -- Some external schemas miss the user_id column; backend code expects it.
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'spotify_integrations'
        AND column_name = 'user_id'
    ) THEN
      EXECUTE 'ALTER TABLE public.spotify_integrations ADD COLUMN IF NOT EXISTS user_id uuid';

      -- Best-effort migration: older drafts used profile_id.
      IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'spotify_integrations'
          AND column_name = 'profile_id'
      ) THEN
        EXECUTE 'UPDATE public.spotify_integrations SET user_id = profile_id WHERE user_id IS NULL';
      END IF;
    END IF;

    EXECUTE 'DROP POLICY IF EXISTS "spotify_integrations_owner" ON public.spotify_integrations';
    EXECUTE 'CREATE POLICY "spotify_integrations_owner" ON public.spotify_integrations FOR ALL USING (auth.uid() = user_id)';
  END IF;
END $$;

-- =============================================================================
-- PART 46: CREATE PUBLIC VIEW FOR SPOTIFY (hides tokens)
-- =============================================================================
DO $$
DECLARE
  has_user_id boolean;
  has_profile_id boolean;
  select_sql text;
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'spotify_integrations'
  ) THEN
    has_user_id := EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'spotify_integrations'
        AND column_name = 'user_id'
    );

    has_profile_id := EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'spotify_integrations'
        AND column_name = 'profile_id'
    );

    EXECUTE 'DROP VIEW IF EXISTS public.spotify_integrations_public';

    IF has_user_id THEN
      select_sql := 'SELECT id, user_id, show_on_profile, created_at, updated_at FROM public.spotify_integrations';
    ELSIF has_profile_id THEN
      select_sql := 'SELECT id, profile_id as user_id, show_on_profile, created_at, updated_at FROM public.spotify_integrations';
    ELSE
      select_sql := 'SELECT id, NULL::uuid as user_id, show_on_profile, created_at, updated_at FROM public.spotify_integrations';
    END IF;

    EXECUTE 'CREATE VIEW public.spotify_integrations_public WITH (security_invoker=on) AS ' || select_sql;
  END IF;
END $$;

-- =============================================================================
-- PART 47: RPC FUNCTIONS FOR PUBLIC DATA ACCESS
-- =============================================================================

-- Get public profile by username
CREATE OR REPLACE FUNCTION public.get_public_profile(p_username text)
RETURNS SETOF public.profiles
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT * FROM profiles
  WHERE LOWER(username) = LOWER(p_username)
     OR LOWER(alias_username) = LOWER(p_username)
  LIMIT 1;
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
    id, name, description, icon_url, color, rarity,
    is_limited, max_claims, claims_count, created_at
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
-- The script automatically adapts to your existing schema.
-- =============================================================================
