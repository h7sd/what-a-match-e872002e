-- =====================================================
-- USERVAULT COMPLETE RLS POLICIES
-- Für Bolt AI / Externe Supabase Migration
-- =====================================================
-- 
-- ANLEITUNG:
-- 1. Stelle sicher dass alle Tabellen existieren
-- 2. Stelle sicher dass der app_role ENUM existiert
-- 3. Stelle sicher dass die Helper-Funktionen existieren
-- 4. Führe dieses Script aus
--
-- =====================================================

-- =====================================================
-- STEP 1: ENUM für Rollen (falls nicht vorhanden)
-- =====================================================
DO $$ BEGIN
  CREATE TYPE public.app_role AS ENUM ('admin', 'supporter', 'moderator');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- =====================================================
-- STEP 2: Helper Functions (KRITISCH für RLS!)
-- Nutze CREATE OR REPLACE um Abhängigkeitsfehler zu vermeiden
-- =====================================================

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

CREATE OR REPLACE FUNCTION public.is_profile_owner(p_profile_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = p_profile_id
      AND user_id = auth.uid()
  )
$$;

CREATE OR REPLACE FUNCTION public.can_record_view(p_profile_id uuid, p_ip_hash text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT NOT EXISTS (
    SELECT 1
    FROM public.profile_views
    WHERE profile_id = p_profile_id
      AND viewer_ip_hash = p_ip_hash
      AND viewed_at > NOW() - INTERVAL '1 hour'
  )
$$;

-- =====================================================
-- STEP 3: Enable RLS on ALL tables
-- =====================================================

ALTER TABLE public.admin_discord_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_webhooks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.alias_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.badge_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.badge_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.badge_steals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.banned_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.battle_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bot_command_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bot_commands ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.case_battles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.case_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.case_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_rewards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.discord_bot_verification ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.discord_integrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.discord_presence ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.friend_badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.global_badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.link_clicks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.live_chat_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.live_chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marketplace_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marketplace_purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.minigame_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profile_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profile_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profile_views ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.promo_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.promo_code_uses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.social_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_balances ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_streaks ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- STEP 4: ALL RLS POLICIES
-- =====================================================

-- =====================================================
-- TABLE: admin_discord_roles
-- =====================================================
DROP POLICY IF EXISTS "Admins can create discord roles" ON public.admin_discord_roles;
CREATE POLICY "Admins can create discord roles" ON public.admin_discord_roles
FOR INSERT WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Admins can delete discord roles" ON public.admin_discord_roles;
CREATE POLICY "Admins can delete discord roles" ON public.admin_discord_roles
FOR DELETE USING (has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Admins can view all discord roles" ON public.admin_discord_roles;
CREATE POLICY "Admins can view all discord roles" ON public.admin_discord_roles
FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role));

-- =====================================================
-- TABLE: admin_notifications
-- =====================================================
DROP POLICY IF EXISTS "Admins can insert notifications" ON public.admin_notifications;
CREATE POLICY "Admins can insert notifications" ON public.admin_notifications
FOR INSERT WITH CHECK (EXISTS (
  SELECT 1 FROM user_roles
  WHERE user_roles.user_id = auth.uid() AND user_roles.role = 'admin'::app_role
));

DROP POLICY IF EXISTS "Anyone can read active notifications" ON public.admin_notifications;
CREATE POLICY "Anyone can read active notifications" ON public.admin_notifications
FOR SELECT USING (is_active = true AND (expires_at IS NULL OR expires_at > now()));

-- =====================================================
-- TABLE: admin_webhooks
-- =====================================================
DROP POLICY IF EXISTS "Admins can create webhooks" ON public.admin_webhooks;
CREATE POLICY "Admins can create webhooks" ON public.admin_webhooks
FOR INSERT WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Admins can delete webhooks" ON public.admin_webhooks;
CREATE POLICY "Admins can delete webhooks" ON public.admin_webhooks
FOR DELETE USING (has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Admins can update webhooks" ON public.admin_webhooks;
CREATE POLICY "Admins can update webhooks" ON public.admin_webhooks
FOR UPDATE USING (has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Admins can view all webhooks" ON public.admin_webhooks;
CREATE POLICY "Admins can view all webhooks" ON public.admin_webhooks
FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role));

-- =====================================================
-- TABLE: alias_requests
-- =====================================================
DROP POLICY IF EXISTS "Requesters can cancel pending requests" ON public.alias_requests;
CREATE POLICY "Requesters can cancel pending requests" ON public.alias_requests
FOR DELETE USING (auth.uid() = requester_id AND status = 'pending');

DROP POLICY IF EXISTS "Target users can respond to requests" ON public.alias_requests;
CREATE POLICY "Target users can respond to requests" ON public.alias_requests
FOR UPDATE USING (auth.uid() = target_user_id);

DROP POLICY IF EXISTS "Users can create alias requests" ON public.alias_requests;
CREATE POLICY "Users can create alias requests" ON public.alias_requests
FOR INSERT WITH CHECK (auth.uid() = requester_id);

DROP POLICY IF EXISTS "Users can view requests sent to them" ON public.alias_requests;
CREATE POLICY "Users can view requests sent to them" ON public.alias_requests
FOR SELECT USING (auth.uid() = target_user_id);

DROP POLICY IF EXISTS "Users can view their own sent requests" ON public.alias_requests;
CREATE POLICY "Users can view their own sent requests" ON public.alias_requests
FOR SELECT USING (auth.uid() = requester_id);

-- =====================================================
-- TABLE: badge_events
-- =====================================================
DROP POLICY IF EXISTS "Admins can manage badge events" ON public.badge_events;
CREATE POLICY "Admins can manage badge events" ON public.badge_events
FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Everyone can view active events" ON public.badge_events;
CREATE POLICY "Everyone can view active events" ON public.badge_events
FOR SELECT USING (is_active = true OR has_role(auth.uid(), 'admin'::app_role));

-- =====================================================
-- TABLE: badge_requests
-- =====================================================
DROP POLICY IF EXISTS "Admins can update any badge request" ON public.badge_requests;
CREATE POLICY "Admins can update any badge request" ON public.badge_requests
FOR UPDATE USING (has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Admins can view all badge requests" ON public.badge_requests;
CREATE POLICY "Admins can view all badge requests" ON public.badge_requests
FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Users can create their own badge request" ON public.badge_requests;
CREATE POLICY "Users can create their own badge request" ON public.badge_requests
FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own badge request" ON public.badge_requests;
CREATE POLICY "Users can delete their own badge request" ON public.badge_requests
FOR DELETE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own pending request" ON public.badge_requests;
CREATE POLICY "Users can update their own pending request" ON public.badge_requests
FOR UPDATE USING (auth.uid() = user_id AND status = 'denied');

DROP POLICY IF EXISTS "Users can view their own badge requests" ON public.badge_requests;
CREATE POLICY "Users can view their own badge requests" ON public.badge_requests
FOR SELECT USING (auth.uid() = user_id);

-- =====================================================
-- TABLE: badge_steals
-- =====================================================
DROP POLICY IF EXISTS "Admins can manage badge steals" ON public.badge_steals;
CREATE POLICY "Admins can manage badge steals" ON public.badge_steals
FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Users can view their own steals" ON public.badge_steals;
CREATE POLICY "Users can view their own steals" ON public.badge_steals
FOR SELECT USING (
  auth.uid() = thief_user_id 
  OR (auth.uid() = victim_user_id AND NOT EXISTS (
    SELECT 1 FROM badge_events e
    WHERE e.id = badge_steals.event_id AND e.event_type = 'hunt'
  ))
  OR has_role(auth.uid(), 'admin'::app_role)
);

-- =====================================================
-- TABLE: badges (Custom user badges)
-- =====================================================
DROP POLICY IF EXISTS "Badges are viewable by everyone" ON public.badges;
CREATE POLICY "Badges are viewable by everyone" ON public.badges
FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can create badges for their profile" ON public.badges;
CREATE POLICY "Users can create badges for their profile" ON public.badges
FOR INSERT WITH CHECK (is_profile_owner(profile_id));

DROP POLICY IF EXISTS "Users can delete their own badges" ON public.badges;
CREATE POLICY "Users can delete their own badges" ON public.badges
FOR DELETE USING (is_profile_owner(profile_id));

DROP POLICY IF EXISTS "Users can update their own badges" ON public.badges;
CREATE POLICY "Users can update their own badges" ON public.badges
FOR UPDATE USING (is_profile_owner(profile_id));

-- =====================================================
-- TABLE: banned_users
-- =====================================================
DROP POLICY IF EXISTS "Deny anon access to banned_users" ON public.banned_users;
CREATE POLICY "Deny anon access to banned_users" ON public.banned_users
FOR ALL USING (false) WITH CHECK (false);

DROP POLICY IF EXISTS "Only admins can access banned_users" ON public.banned_users;
CREATE POLICY "Only admins can access banned_users" ON public.banned_users
FOR ALL USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- =====================================================
-- TABLE: battle_participants
-- =====================================================
DROP POLICY IF EXISTS "Anyone can view battle participants" ON public.battle_participants;
CREATE POLICY "Anyone can view battle participants" ON public.battle_participants
FOR SELECT USING (true);

-- =====================================================
-- TABLE: bot_command_notifications
-- =====================================================
DROP POLICY IF EXISTS "Allow public read for bot polling" ON public.bot_command_notifications;
CREATE POLICY "Allow public read for bot polling" ON public.bot_command_notifications
FOR SELECT USING (true);

DROP POLICY IF EXISTS "Service role can manage notifications" ON public.bot_command_notifications;
CREATE POLICY "Service role can manage notifications" ON public.bot_command_notifications
FOR ALL USING (auth.role() = 'service_role')
WITH CHECK (auth.role() = 'service_role');

-- =====================================================
-- TABLE: bot_commands
-- =====================================================
DROP POLICY IF EXISTS "Admins can manage commands" ON public.bot_commands;
CREATE POLICY "Admins can manage commands" ON public.bot_commands
FOR ALL USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Anyone can read commands" ON public.bot_commands;
CREATE POLICY "Anyone can read commands" ON public.bot_commands
FOR SELECT USING (true);

-- =====================================================
-- TABLE: case_battles
-- =====================================================
DROP POLICY IF EXISTS "Anyone can view battles" ON public.case_battles;
CREATE POLICY "Anyone can view battles" ON public.case_battles
FOR SELECT USING (true);

-- =====================================================
-- TABLE: case_items
-- =====================================================
DROP POLICY IF EXISTS "Anyone can view case items" ON public.case_items;
CREATE POLICY "Anyone can view case items" ON public.case_items
FOR SELECT USING (EXISTS (
  SELECT 1 FROM cases WHERE cases.id = case_items.case_id AND cases.active = true
));

-- =====================================================
-- TABLE: case_transactions
-- =====================================================
DROP POLICY IF EXISTS "Users can view own transactions" ON public.case_transactions;
CREATE POLICY "Users can view own transactions" ON public.case_transactions
FOR SELECT USING (auth.uid() = user_id);

-- =====================================================
-- TABLE: cases
-- =====================================================
DROP POLICY IF EXISTS "Anyone can view active cases" ON public.cases;
CREATE POLICY "Anyone can view active cases" ON public.cases
FOR SELECT USING (active = true);

-- =====================================================
-- TABLE: daily_rewards
-- =====================================================
DROP POLICY IF EXISTS "Anyone can view daily rewards" ON public.daily_rewards;
CREATE POLICY "Anyone can view daily rewards" ON public.daily_rewards
FOR SELECT USING (true);

DROP POLICY IF EXISTS "Service role can manage daily rewards" ON public.daily_rewards;
CREATE POLICY "Service role can manage daily rewards" ON public.daily_rewards
FOR ALL USING (auth.role() = 'service_role');

-- =====================================================
-- TABLE: discord_bot_verification
-- =====================================================
DROP POLICY IF EXISTS "Users can delete their own verification codes" ON public.discord_bot_verification;
CREATE POLICY "Users can delete their own verification codes" ON public.discord_bot_verification
FOR DELETE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can view their own verification codes" ON public.discord_bot_verification;
CREATE POLICY "Users can view their own verification codes" ON public.discord_bot_verification
FOR SELECT USING (auth.uid() = user_id);

-- =====================================================
-- TABLE: discord_integrations
-- =====================================================
DROP POLICY IF EXISTS "Users can create their discord integration" ON public.discord_integrations;
CREATE POLICY "Users can create their discord integration" ON public.discord_integrations
FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their discord integration" ON public.discord_integrations;
CREATE POLICY "Users can delete their discord integration" ON public.discord_integrations
FOR DELETE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their discord integration" ON public.discord_integrations;
CREATE POLICY "Users can update their discord integration" ON public.discord_integrations
FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can view their own discord integration" ON public.discord_integrations;
CREATE POLICY "Users can view their own discord integration" ON public.discord_integrations
FOR SELECT USING (auth.uid() = user_id);

-- =====================================================
-- TABLE: discord_presence
-- =====================================================
DROP POLICY IF EXISTS "Users can manage their discord presence" ON public.discord_presence;
CREATE POLICY "Users can manage their discord presence" ON public.discord_presence
FOR ALL USING (is_profile_owner(profile_id));

DROP POLICY IF EXISTS "Users can view their own discord presence" ON public.discord_presence;
CREATE POLICY "Users can view their own discord presence" ON public.discord_presence
FOR SELECT USING (
  EXISTS (SELECT 1 FROM profiles p WHERE p.id = discord_presence.profile_id AND p.user_id = auth.uid())
  OR has_role(auth.uid(), 'admin'::app_role)
);

-- =====================================================
-- TABLE: friend_badges
-- =====================================================
DROP POLICY IF EXISTS "Admins can manage all friend badges" ON public.friend_badges;
CREATE POLICY "Admins can manage all friend badges" ON public.friend_badges
FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Creators can delete their friend badges" ON public.friend_badges;
CREATE POLICY "Creators can delete their friend badges" ON public.friend_badges
FOR DELETE USING (auth.uid() = creator_id);

DROP POLICY IF EXISTS "Creators can update their friend badges" ON public.friend_badges;
CREATE POLICY "Creators can update their friend badges" ON public.friend_badges
FOR UPDATE USING (auth.uid() = creator_id);

DROP POLICY IF EXISTS "Recipients can toggle friend badge visibility" ON public.friend_badges;
CREATE POLICY "Recipients can toggle friend badge visibility" ON public.friend_badges
FOR UPDATE USING (auth.uid() = recipient_id) WITH CHECK (auth.uid() = recipient_id);

DROP POLICY IF EXISTS "Users can create friend badges" ON public.friend_badges;
CREATE POLICY "Users can create friend badges" ON public.friend_badges
FOR INSERT WITH CHECK (
  auth.uid() = creator_id 
  AND auth.uid() <> recipient_id 
  AND (SELECT count(*) FROM friend_badges WHERE creator_id = auth.uid()) < 5
);

DROP POLICY IF EXISTS "Users can view their created or received friend badges" ON public.friend_badges;
CREATE POLICY "Users can view their created or received friend badges" ON public.friend_badges
FOR SELECT USING (auth.uid() = creator_id OR auth.uid() = recipient_id);

-- =====================================================
-- TABLE: global_badges
-- =====================================================
DROP POLICY IF EXISTS "Admins can manage global badges" ON public.global_badges;
CREATE POLICY "Admins can manage global badges" ON public.global_badges
FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Global badges are viewable by everyone" ON public.global_badges;
CREATE POLICY "Global badges are viewable by everyone" ON public.global_badges
FOR SELECT USING (true);

-- =====================================================
-- TABLE: link_clicks
-- =====================================================
DROP POLICY IF EXISTS "Profile owners can view their link clicks" ON public.link_clicks;
CREATE POLICY "Profile owners can view their link clicks" ON public.link_clicks
FOR SELECT USING (EXISTS (
  SELECT 1 FROM social_links sl
  WHERE sl.id = link_clicks.link_id AND is_profile_owner(sl.profile_id)
));

DROP POLICY IF EXISTS "Service role can record link clicks" ON public.link_clicks;
CREATE POLICY "Service role can record link clicks" ON public.link_clicks
FOR INSERT WITH CHECK (auth.role() = 'service_role');

-- =====================================================
-- TABLE: live_chat_conversations
-- =====================================================
DROP POLICY IF EXISTS "Admins can update conversations" ON public.live_chat_conversations;
CREATE POLICY "Admins can update conversations" ON public.live_chat_conversations
FOR UPDATE USING (has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Admins can view all conversations" ON public.live_chat_conversations;
CREATE POLICY "Admins can view all conversations" ON public.live_chat_conversations
FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Anyone can create conversations" ON public.live_chat_conversations;
CREATE POLICY "Anyone can create conversations" ON public.live_chat_conversations
FOR INSERT WITH CHECK (
  (auth.uid() IS NOT NULL AND user_id = auth.uid()) 
  OR (user_id IS NULL AND visitor_id IS NOT NULL AND length(visitor_id) > 0)
);

DROP POLICY IF EXISTS "Users can update their conversations" ON public.live_chat_conversations;
CREATE POLICY "Users can update their conversations" ON public.live_chat_conversations
FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can view their own conversations" ON public.live_chat_conversations;
CREATE POLICY "Users can view their own conversations" ON public.live_chat_conversations
FOR SELECT USING (auth.uid() = user_id);

-- =====================================================
-- TABLE: live_chat_messages
-- =====================================================
DROP POLICY IF EXISTS "Admins can view all messages" ON public.live_chat_messages;
CREATE POLICY "Admins can view all messages" ON public.live_chat_messages
FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Participants can send messages" ON public.live_chat_messages;
CREATE POLICY "Participants can send messages" ON public.live_chat_messages
FOR INSERT WITH CHECK (EXISTS (
  SELECT 1 FROM live_chat_conversations c
  WHERE c.id = live_chat_messages.conversation_id 
  AND (c.user_id = auth.uid() OR (auth.uid() IS NULL AND c.visitor_id IS NOT NULL) OR has_role(auth.uid(), 'admin'::app_role))
));

DROP POLICY IF EXISTS "Users can view their conversation messages" ON public.live_chat_messages;
CREATE POLICY "Users can view their conversation messages" ON public.live_chat_messages
FOR SELECT USING (EXISTS (
  SELECT 1 FROM live_chat_conversations c
  WHERE c.id = live_chat_messages.conversation_id AND c.user_id = auth.uid()
));

-- =====================================================
-- TABLE: marketplace_items
-- =====================================================
DROP POLICY IF EXISTS "Admins can manage all items" ON public.marketplace_items;
CREATE POLICY "Admins can manage all items" ON public.marketplace_items
FOR ALL USING (EXISTS (
  SELECT 1 FROM user_roles
  WHERE user_roles.user_id = auth.uid() AND user_roles.role = 'admin'::app_role
));

DROP POLICY IF EXISTS "Anyone can view approved items" ON public.marketplace_items;
CREATE POLICY "Anyone can view approved items" ON public.marketplace_items
FOR SELECT USING (status = 'approved' OR seller_id = auth.uid());

DROP POLICY IF EXISTS "Sellers can update own pending items" ON public.marketplace_items;
CREATE POLICY "Sellers can update own pending items" ON public.marketplace_items
FOR UPDATE USING (auth.uid() = seller_id AND status = 'pending');

DROP POLICY IF EXISTS "Users can create items" ON public.marketplace_items;
CREATE POLICY "Users can create items" ON public.marketplace_items
FOR INSERT WITH CHECK (auth.uid() = seller_id);

-- =====================================================
-- TABLE: marketplace_purchases
-- =====================================================
DROP POLICY IF EXISTS "Users can create purchases" ON public.marketplace_purchases;
CREATE POLICY "Users can create purchases" ON public.marketplace_purchases
FOR INSERT WITH CHECK (auth.uid() = buyer_id);

DROP POLICY IF EXISTS "Users can view own purchases" ON public.marketplace_purchases;
CREATE POLICY "Users can view own purchases" ON public.marketplace_purchases
FOR SELECT USING (auth.uid() = buyer_id OR auth.uid() = seller_id);

-- =====================================================
-- TABLE: minigame_stats
-- =====================================================
DROP POLICY IF EXISTS "Anyone can view minigame stats" ON public.minigame_stats;
CREATE POLICY "Anyone can view minigame stats" ON public.minigame_stats
FOR SELECT USING (true);

DROP POLICY IF EXISTS "Service role can manage minigame stats" ON public.minigame_stats;
CREATE POLICY "Service role can manage minigame stats" ON public.minigame_stats
FOR ALL USING (auth.role() = 'service_role');

-- =====================================================
-- TABLE: profile_comments (Nur Service Role!)
-- =====================================================
DROP POLICY IF EXISTS "No direct access to profile_comments" ON public.profile_comments;
CREATE POLICY "No direct access to profile_comments" ON public.profile_comments
FOR ALL USING (false) WITH CHECK (false);

-- =====================================================
-- TABLE: profile_likes (Nur Service Role!)
-- =====================================================
DROP POLICY IF EXISTS "No direct read access to profile_likes" ON public.profile_likes;
CREATE POLICY "No direct read access to profile_likes" ON public.profile_likes
FOR SELECT USING (false);

DROP POLICY IF EXISTS "No direct insert to profile_likes" ON public.profile_likes;
CREATE POLICY "No direct insert to profile_likes" ON public.profile_likes
FOR INSERT WITH CHECK (false);

DROP POLICY IF EXISTS "No direct update to profile_likes" ON public.profile_likes;
CREATE POLICY "No direct update to profile_likes" ON public.profile_likes
FOR UPDATE USING (false);

DROP POLICY IF EXISTS "No direct delete to profile_likes" ON public.profile_likes;
CREATE POLICY "No direct delete to profile_likes" ON public.profile_likes
FOR DELETE USING (false);

-- =====================================================
-- TABLE: profile_views
-- =====================================================
DROP POLICY IF EXISTS "Profile owners can view their analytics" ON public.profile_views;
CREATE POLICY "Profile owners can view their analytics" ON public.profile_views
FOR SELECT USING (is_profile_owner(profile_id));

DROP POLICY IF EXISTS "Rate limited profile views" ON public.profile_views;
CREATE POLICY "Rate limited profile views" ON public.profile_views
FOR INSERT WITH CHECK (viewer_ip_hash IS NULL OR can_record_view(profile_id, viewer_ip_hash));

-- =====================================================
-- TABLE: profiles
-- =====================================================
DROP POLICY IF EXISTS "Admins can update any profile" ON public.profiles;
CREATE POLICY "Admins can update any profile" ON public.profiles
FOR UPDATE USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
CREATE POLICY "Admins can view all profiles" ON public.profiles
FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Authenticated users can search profiles" ON public.profiles;
CREATE POLICY "Authenticated users can search profiles" ON public.profiles
FOR SELECT USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Public can view profiles" ON public.profiles;
CREATE POLICY "Public can view profiles" ON public.profiles
FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can create their own profile" ON public.profiles;
CREATE POLICY "Users can create their own profile" ON public.profiles
FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own profile" ON public.profiles;
CREATE POLICY "Users can delete their own profile" ON public.profiles
FOR DELETE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
CREATE POLICY "Users can update their own profile" ON public.profiles
FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
CREATE POLICY "Users can view own profile" ON public.profiles
FOR SELECT USING (auth.uid() = user_id);

-- =====================================================
-- TABLE: promo_codes
-- =====================================================
DROP POLICY IF EXISTS "Admins can manage promo codes" ON public.promo_codes;
CREATE POLICY "Admins can manage promo codes" ON public.promo_codes
FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Anyone can view active promo codes" ON public.promo_codes;
CREATE POLICY "Anyone can view active promo codes" ON public.promo_codes
FOR SELECT USING (is_active = true);

-- =====================================================
-- TABLE: promo_code_uses
-- =====================================================
DROP POLICY IF EXISTS "Users can view their own promo code uses" ON public.promo_code_uses;
CREATE POLICY "Users can view their own promo code uses" ON public.promo_code_uses
FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can create promo code uses" ON public.promo_code_uses;
CREATE POLICY "Users can create promo code uses" ON public.promo_code_uses
FOR INSERT WITH CHECK (auth.uid() = user_id);

-- =====================================================
-- TABLE: purchases
-- =====================================================
DROP POLICY IF EXISTS "Admins can view all purchases" ON public.purchases;
CREATE POLICY "Admins can view all purchases" ON public.purchases
FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Users can view their own purchases" ON public.purchases;
CREATE POLICY "Users can view their own purchases" ON public.purchases
FOR SELECT USING (auth.uid() = user_id);

-- =====================================================
-- TABLE: social_links
-- =====================================================
DROP POLICY IF EXISTS "Social links are viewable by everyone" ON public.social_links;
CREATE POLICY "Social links are viewable by everyone" ON public.social_links
FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can manage their social links" ON public.social_links;
CREATE POLICY "Users can manage their social links" ON public.social_links
FOR ALL USING (is_profile_owner(profile_id));

-- =====================================================
-- TABLE: support_tickets
-- =====================================================
DROP POLICY IF EXISTS "Admins can view all tickets" ON public.support_tickets;
CREATE POLICY "Admins can view all tickets" ON public.support_tickets
FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Admins can update tickets" ON public.support_tickets;
CREATE POLICY "Admins can update tickets" ON public.support_tickets
FOR UPDATE USING (has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Users can create support tickets" ON public.support_tickets;
CREATE POLICY "Users can create support tickets" ON public.support_tickets
FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can view their own tickets" ON public.support_tickets;
CREATE POLICY "Users can view their own tickets" ON public.support_tickets
FOR SELECT USING (auth.uid() = user_id);

-- =====================================================
-- TABLE: support_messages
-- =====================================================
DROP POLICY IF EXISTS "Admins can view all messages" ON public.support_messages;
CREATE POLICY "Admins can view all messages" ON public.support_messages
FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Admins can create messages" ON public.support_messages;
CREATE POLICY "Admins can create messages" ON public.support_messages
FOR INSERT WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Users can view messages on their tickets" ON public.support_messages;
CREATE POLICY "Users can view messages on their tickets" ON public.support_messages
FOR SELECT USING (EXISTS (
  SELECT 1 FROM support_tickets st
  WHERE st.id = support_messages.ticket_id AND st.user_id = auth.uid()
));

DROP POLICY IF EXISTS "Users can create messages on their tickets" ON public.support_messages;
CREATE POLICY "Users can create messages on their tickets" ON public.support_messages
FOR INSERT WITH CHECK (EXISTS (
  SELECT 1 FROM support_tickets st
  WHERE st.id = support_messages.ticket_id AND st.user_id = auth.uid()
));

-- =====================================================
-- TABLE: user_badges
-- =====================================================
DROP POLICY IF EXISTS "Admins can manage all user badges" ON public.user_badges;
CREATE POLICY "Admins can manage all user badges" ON public.user_badges
FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Users can manage their own badges" ON public.user_badges;
CREATE POLICY "Users can manage their own badges" ON public.user_badges
FOR ALL USING (is_profile_owner(profile_id));

-- =====================================================
-- TABLE: user_balances
-- =====================================================
DROP POLICY IF EXISTS "Admins can manage all balances" ON public.user_balances;
CREATE POLICY "Admins can manage all balances" ON public.user_balances
FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Users can view their own balance" ON public.user_balances;
CREATE POLICY "Users can view their own balance" ON public.user_balances
FOR SELECT USING (auth.uid() = user_id);

-- =====================================================
-- TABLE: user_inventory
-- =====================================================
DROP POLICY IF EXISTS "Users can view their own inventory" ON public.user_inventory;
CREATE POLICY "Users can view their own inventory" ON public.user_inventory
FOR SELECT USING (auth.uid() = user_id);

-- =====================================================
-- TABLE: user_notifications
-- =====================================================
DROP POLICY IF EXISTS "Users can view their own notifications" ON public.user_notifications;
CREATE POLICY "Users can view their own notifications" ON public.user_notifications
FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own notifications" ON public.user_notifications;
CREATE POLICY "Users can update their own notifications" ON public.user_notifications
FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Service role can create notifications" ON public.user_notifications;
CREATE POLICY "Service role can create notifications" ON public.user_notifications
FOR INSERT WITH CHECK (auth.role() = 'service_role');

-- =====================================================
-- TABLE: user_roles
-- =====================================================
DROP POLICY IF EXISTS "Admins can manage roles" ON public.user_roles;
CREATE POLICY "Admins can manage roles" ON public.user_roles
FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Users can view their own roles" ON public.user_roles;
CREATE POLICY "Users can view their own roles" ON public.user_roles
FOR SELECT USING (auth.uid() = user_id);

-- =====================================================
-- TABLE: user_streaks
-- =====================================================
DROP POLICY IF EXISTS "Users can view their own streaks" ON public.user_streaks;
CREATE POLICY "Users can view their own streaks" ON public.user_streaks
FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own streaks" ON public.user_streaks;
CREATE POLICY "Users can update their own streaks" ON public.user_streaks
FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can create their own streaks" ON public.user_streaks;
CREATE POLICY "Users can create their own streaks" ON public.user_streaks
FOR INSERT WITH CHECK (auth.uid() = user_id);

-- =====================================================
-- DONE!
-- =====================================================
-- Alle RLS Policies wurden erstellt.
-- Stelle sicher, dass die Service Role für Edge Functions
-- korrekt konfiguriert ist.
-- =====================================================
