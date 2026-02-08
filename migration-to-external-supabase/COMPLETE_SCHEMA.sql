-- =====================================================
-- USERVAULT COMPLETE TABLE SCHEMA
-- Für externe Supabase Migration
-- =====================================================
-- 
-- Dieses Script stellt sicher, dass alle Tabellen
-- mit den korrekten Spalten existieren.
--
-- =====================================================

-- =====================================================
-- TABLE: profiles (WICHTIGSTE TABELLE!)
-- =====================================================
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  username text NOT NULL UNIQUE,
  display_name text,
  bio text,
  avatar_url text,
  background_url text,
  background_color text DEFAULT '#0a0a0a',
  accent_color text DEFAULT '#8b5cf6',
  card_color text DEFAULT 'rgba(0,0,0,0.5)',
  effects_config jsonb DEFAULT '{"glow": false, "tilt": true, "sparkles": false, "typewriter": false}'::jsonb,
  music_url text,
  views_count integer DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  background_video_url text,
  avatar_shape text DEFAULT 'circle',
  name_font text DEFAULT 'Inter',
  text_font text DEFAULT 'Inter',
  occupation text,
  location text,
  discord_user_id text,
  layout_style text DEFAULT 'stacked',
  card_style text DEFAULT 'classic',
  text_color text DEFAULT '#ffffff',
  icon_color text DEFAULT '#ffffff',
  profile_opacity integer DEFAULT 100,
  profile_blur integer DEFAULT 0,
  custom_cursor_url text,
  monochrome_icons boolean DEFAULT false,
  animated_title boolean DEFAULT false,
  swap_bio_colors boolean DEFAULT false,
  use_discord_avatar boolean DEFAULT false,
  discord_avatar_decoration boolean DEFAULT false,
  enable_profile_gradient boolean DEFAULT false,
  glow_username boolean DEFAULT false,
  glow_socials boolean DEFAULT false,
  glow_badges boolean DEFAULT false,
  background_effect text DEFAULT 'particles',
  audio_volume real DEFAULT 0.5,
  uid_number serial,
  discord_card_style text DEFAULT 'glass',
  discord_card_opacity integer DEFAULT 100,
  discord_show_badge boolean DEFAULT true,
  discord_badge_color text DEFAULT '#ec4899',
  start_screen_enabled boolean DEFAULT false,
  start_screen_text text DEFAULT 'Click anywhere to enter',
  start_screen_font text DEFAULT 'Inter',
  start_screen_color text DEFAULT '#a855f7',
  start_screen_bg_color text DEFAULT '#000000',
  show_volume_control boolean DEFAULT true,
  show_username boolean DEFAULT true,
  show_badges boolean DEFAULT true,
  show_views boolean DEFAULT true,
  card_border_enabled boolean DEFAULT true,
  card_border_color text,
  card_border_width integer DEFAULT 1,
  show_avatar boolean DEFAULT true,
  show_links boolean DEFAULT true,
  show_description boolean DEFAULT true,
  show_display_name boolean DEFAULT true,
  start_screen_animation text DEFAULT 'none',
  ascii_size integer DEFAULT 8,
  ascii_waves boolean DEFAULT true,
  icon_only_links boolean DEFAULT false,
  icon_links_opacity integer DEFAULT 100,
  email_verified boolean DEFAULT false,
  alias_username text,
  transparent_badges boolean DEFAULT false,
  og_title text,
  og_description text,
  og_image_url text,
  og_icon_url text,
  og_title_animation text DEFAULT 'none',
  alias_changed_at timestamptz,
  is_premium boolean DEFAULT false,
  premium_purchased_at timestamptz,
  paypal_order_id text,
  display_name_animation text DEFAULT 'none',
  likes_count integer DEFAULT 0,
  dislikes_count integer DEFAULT 0,
  show_likes boolean DEFAULT true,
  show_comments boolean DEFAULT true,
  og_embed_color text,
  global_badge_color text,
  use_global_badge_color boolean DEFAULT false
);

-- =====================================================
-- TABLE: global_badges
-- =====================================================
CREATE TABLE IF NOT EXISTS public.global_badges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  icon_url text,
  color text DEFAULT '#8B5CF6',
  rarity text DEFAULT 'common',
  is_limited boolean DEFAULT false,
  max_claims integer,
  claims_count integer DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid
);

-- =====================================================
-- TABLE: user_badges
-- =====================================================
CREATE TABLE IF NOT EXISTS public.user_badges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  badge_id uuid NOT NULL REFERENCES public.global_badges(id) ON DELETE CASCADE,
  claimed_at timestamptz NOT NULL DEFAULT now(),
  is_enabled boolean DEFAULT true,
  is_locked boolean DEFAULT false,
  display_order integer DEFAULT 0,
  custom_color text
);

-- =====================================================
-- TABLE: badges (Custom User Badges)
-- =====================================================
CREATE TABLE IF NOT EXISTS public.badges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  icon_url text,
  color text DEFAULT '#8B5CF6',
  created_at timestamptz NOT NULL DEFAULT now()
);

-- =====================================================
-- TABLE: friend_badges
-- =====================================================
CREATE TABLE IF NOT EXISTS public.friend_badges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id uuid NOT NULL,
  recipient_id uuid NOT NULL,
  name text NOT NULL,
  description text,
  icon_url text,
  color text DEFAULT '#8B5CF6',
  created_at timestamptz NOT NULL DEFAULT now(),
  is_enabled boolean DEFAULT true,
  display_order integer DEFAULT 0
);

-- =====================================================
-- TABLE: social_links
-- =====================================================
CREATE TABLE IF NOT EXISTS public.social_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  platform text NOT NULL,
  url text NOT NULL,
  title text,
  icon text,
  display_order integer DEFAULT 0,
  is_visible boolean DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  description text,
  style text,
  click_count integer DEFAULT 0
);

-- =====================================================
-- TABLE: discord_integrations
-- =====================================================
CREATE TABLE IF NOT EXISTS public.discord_integrations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  discord_id text,
  username text,
  discriminator text,
  avatar text,
  show_on_profile boolean DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- =====================================================
-- TABLE: discord_presence
-- =====================================================
CREATE TABLE IF NOT EXISTS public.discord_presence (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL UNIQUE REFERENCES public.profiles(id) ON DELETE CASCADE,
  discord_user_id text NOT NULL,
  username text,
  avatar text,
  status text,
  activity_name text,
  activity_type text,
  activity_details text,
  activity_state text,
  activity_large_image text,
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- =====================================================
-- TABLE: profile_views
-- =====================================================
CREATE TABLE IF NOT EXISTS public.profile_views (
  id bigserial PRIMARY KEY,
  profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  viewer_ip_hash text,
  viewer_country text,
  viewed_at timestamptz NOT NULL DEFAULT now()
);

-- =====================================================
-- TABLE: profile_likes
-- =====================================================
CREATE TABLE IF NOT EXISTS public.profile_likes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  liker_ip_hash text NOT NULL,
  liker_user_id uuid,
  is_like boolean DEFAULT true,
  encrypted_data text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- =====================================================
-- TABLE: profile_comments
-- =====================================================
CREATE TABLE IF NOT EXISTS public.profile_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  commenter_ip_hash text NOT NULL,
  commenter_user_id uuid,
  encrypted_content text NOT NULL,
  encrypted_metadata text,
  is_read boolean DEFAULT false,
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '24 hours'),
  created_at timestamptz NOT NULL DEFAULT now()
);

-- =====================================================
-- TABLE: link_clicks
-- =====================================================
CREATE TABLE IF NOT EXISTS public.link_clicks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  link_id uuid NOT NULL REFERENCES public.social_links(id) ON DELETE CASCADE,
  viewer_ip_hash text,
  viewer_country text,
  clicked_at timestamptz NOT NULL DEFAULT now()
);

-- =====================================================
-- TABLE: user_balances
-- =====================================================
CREATE TABLE IF NOT EXISTS public.user_balances (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  balance bigint NOT NULL DEFAULT 0,
  total_earned bigint DEFAULT 0,
  total_spent bigint DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- =====================================================
-- TABLE: user_streaks
-- =====================================================
CREATE TABLE IF NOT EXISTS public.user_streaks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  current_streak integer DEFAULT 0,
  longest_streak integer DEFAULT 0,
  last_login_date date,
  total_logins integer DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- =====================================================
-- TABLE: user_inventory
-- =====================================================
CREATE TABLE IF NOT EXISTS public.user_inventory (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  item_type text NOT NULL,
  badge_id uuid,
  coin_amount bigint,
  rarity text,
  estimated_value bigint DEFAULT 0,
  won_from_case_id uuid,
  won_at timestamptz NOT NULL DEFAULT now(),
  sold boolean DEFAULT false,
  sold_at timestamptz
);

-- =====================================================
-- TABLE: user_notifications
-- =====================================================
CREATE TABLE IF NOT EXISTS public.user_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  type text NOT NULL,
  title text NOT NULL,
  message text,
  data jsonb,
  is_read boolean DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- =====================================================
-- TABLE: user_roles
-- =====================================================
DO $$ BEGIN
  CREATE TYPE public.app_role AS ENUM ('admin', 'supporter', 'moderator');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  role app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, role)
);

-- =====================================================
-- TABLE: purchases
-- =====================================================
CREATE TABLE IF NOT EXISTS public.purchases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  username text NOT NULL,
  email text NOT NULL,
  order_id text NOT NULL UNIQUE,
  amount numeric NOT NULL,
  currency text DEFAULT 'EUR',
  payment_method text DEFAULT 'paypal',
  invoice_number text NOT NULL UNIQUE,
  status text DEFAULT 'completed',
  created_at timestamptz NOT NULL DEFAULT now()
);

-- =====================================================
-- TABLE: promo_codes
-- =====================================================
CREATE TABLE IF NOT EXISTS public.promo_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  type text DEFAULT 'discount',
  discount_percentage integer DEFAULT 0,
  max_uses integer,
  uses_count integer DEFAULT 0,
  expires_at timestamptz,
  is_active boolean DEFAULT true,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  description text
);

-- =====================================================
-- TABLE: promo_code_uses
-- =====================================================
CREATE TABLE IF NOT EXISTS public.promo_code_uses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code_id uuid NOT NULL REFERENCES public.promo_codes(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  used_at timestamptz NOT NULL DEFAULT now()
);

-- =====================================================
-- TABLE: cases
-- =====================================================
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

-- =====================================================
-- TABLE: case_items
-- =====================================================
CREATE TABLE IF NOT EXISTS public.case_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id uuid NOT NULL REFERENCES public.cases(id) ON DELETE CASCADE,
  item_type text NOT NULL,
  badge_id uuid,
  coin_amount bigint,
  rarity text NOT NULL,
  drop_rate numeric NOT NULL,
  display_value bigint DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- =====================================================
-- TABLE: case_transactions
-- =====================================================
CREATE TABLE IF NOT EXISTS public.case_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  case_id uuid NOT NULL REFERENCES public.cases(id),
  battle_id uuid,
  transaction_type text NOT NULL,
  items_won jsonb DEFAULT '[]',
  total_value bigint DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- =====================================================
-- TABLE: case_battles
-- =====================================================
CREATE TABLE IF NOT EXISTS public.case_battles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id uuid NOT NULL REFERENCES public.cases(id),
  battle_type text NOT NULL,
  entry_fee bigint NOT NULL,
  status text DEFAULT 'waiting',
  team1_total bigint DEFAULT 0,
  team2_total bigint DEFAULT 0,
  winner_team integer,
  created_at timestamptz DEFAULT now(),
  started_at timestamptz,
  completed_at timestamptz
);

-- =====================================================
-- TABLE: battle_participants
-- =====================================================
CREATE TABLE IF NOT EXISTS public.battle_participants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  battle_id uuid NOT NULL REFERENCES public.case_battles(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id),
  team integer NOT NULL,
  items_won jsonb DEFAULT '[]',
  total_value bigint DEFAULT 0,
  joined_at timestamptz DEFAULT now()
);

-- =====================================================
-- TABLE: badge_events
-- =====================================================
CREATE TABLE IF NOT EXISTS public.badge_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  event_type text NOT NULL,
  target_badge_id uuid REFERENCES public.global_badges(id),
  is_active boolean DEFAULT false,
  starts_at timestamptz NOT NULL DEFAULT now(),
  ends_at timestamptz,
  steal_duration_hours integer DEFAULT 168,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- =====================================================
-- TABLE: badge_steals
-- =====================================================
CREATE TABLE IF NOT EXISTS public.badge_steals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid REFERENCES public.badge_events(id),
  badge_id uuid NOT NULL REFERENCES public.global_badges(id),
  thief_user_id uuid NOT NULL,
  victim_user_id uuid NOT NULL,
  stolen_at timestamptz NOT NULL DEFAULT now(),
  returns_at timestamptz NOT NULL,
  returned boolean DEFAULT false,
  returned_at timestamptz
);

-- =====================================================
-- TABLE: badge_requests
-- =====================================================
CREATE TABLE IF NOT EXISTS public.badge_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  badge_name text NOT NULL,
  badge_description text,
  badge_icon_url text,
  badge_color text DEFAULT '#8B5CF6',
  status text DEFAULT 'pending',
  denial_reason text,
  admin_edited_name text,
  admin_edited_description text,
  admin_edited_icon_url text,
  admin_edited_color text,
  reviewed_by uuid,
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- =====================================================
-- TABLE: alias_requests
-- =====================================================
CREATE TABLE IF NOT EXISTS public.alias_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_id uuid NOT NULL,
  target_user_id uuid NOT NULL,
  requested_alias text NOT NULL,
  status text DEFAULT 'pending',
  response_token uuid DEFAULT gen_random_uuid(),
  responded_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- =====================================================
-- TABLE: admin_notifications
-- =====================================================
CREATE TABLE IF NOT EXISTS public.admin_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_by uuid NOT NULL,
  type text DEFAULT 'info',
  message text NOT NULL,
  is_active boolean DEFAULT true,
  expires_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- =====================================================
-- TABLE: admin_webhooks
-- =====================================================
CREATE TABLE IF NOT EXISTS public.admin_webhooks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_by uuid NOT NULL,
  name text NOT NULL,
  webhook_url text NOT NULL,
  notification_type text DEFAULT 'changelog',
  description text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- =====================================================
-- TABLE: admin_discord_roles
-- =====================================================
CREATE TABLE IF NOT EXISTS public.admin_discord_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_by uuid NOT NULL,
  name text NOT NULL,
  role_id text NOT NULL,
  description text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- =====================================================
-- TABLE: banned_users
-- =====================================================
CREATE TABLE IF NOT EXISTS public.banned_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  username text NOT NULL,
  email text,
  reason text,
  banned_by uuid NOT NULL,
  banned_at timestamptz NOT NULL DEFAULT now(),
  appeal_deadline timestamptz DEFAULT (now() + interval '30 days'),
  appeal_text text,
  appeal_submitted_at timestamptz
);

-- =====================================================
-- TABLE: support_tickets
-- =====================================================
CREATE TABLE IF NOT EXISTS public.support_tickets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  subject text NOT NULL,
  status text DEFAULT 'open',
  priority text DEFAULT 'normal',
  assigned_to uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- =====================================================
-- TABLE: support_messages
-- =====================================================
CREATE TABLE IF NOT EXISTS public.support_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id uuid NOT NULL REFERENCES public.support_tickets(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL,
  message text NOT NULL,
  is_staff_reply boolean DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- =====================================================
-- TABLE: live_chat_conversations
-- =====================================================
CREATE TABLE IF NOT EXISTS public.live_chat_conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  visitor_id text,
  visitor_session_token uuid DEFAULT gen_random_uuid(),
  assigned_admin_id uuid,
  status text DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- =====================================================
-- TABLE: live_chat_messages
-- =====================================================
CREATE TABLE IF NOT EXISTS public.live_chat_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES public.live_chat_conversations(id) ON DELETE CASCADE,
  sender_id uuid,
  sender_type text NOT NULL,
  message text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- =====================================================
-- TABLE: marketplace_items
-- =====================================================
CREATE TABLE IF NOT EXISTS public.marketplace_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id uuid NOT NULL,
  item_type text NOT NULL,
  badge_name text,
  badge_description text,
  badge_icon_url text,
  badge_color text,
  template_name text,
  template_description text,
  template_data jsonb,
  template_preview_url text,
  price integer NOT NULL,
  sale_type text DEFAULT 'unlimited',
  stock_limit integer,
  stock_sold integer DEFAULT 0,
  status text DEFAULT 'pending',
  denial_reason text,
  reviewed_by uuid,
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- =====================================================
-- TABLE: marketplace_purchases
-- =====================================================
CREATE TABLE IF NOT EXISTS public.marketplace_purchases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id uuid NOT NULL REFERENCES public.marketplace_items(id),
  buyer_id uuid NOT NULL,
  seller_id uuid NOT NULL,
  price integer NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- =====================================================
-- TABLE: bot_commands
-- =====================================================
CREATE TABLE IF NOT EXISTS public.bot_commands (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
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

-- =====================================================
-- TABLE: bot_command_notifications
-- =====================================================
CREATE TABLE IF NOT EXISTS public.bot_command_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  command_name text NOT NULL,
  action text NOT NULL,
  changes jsonb,
  processed boolean DEFAULT false,
  processed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- =====================================================
-- TABLE: daily_rewards
-- =====================================================
CREATE TABLE IF NOT EXISTS public.daily_rewards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  discord_user_id text NOT NULL,
  streak integer DEFAULT 1,
  last_claim timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

-- =====================================================
-- TABLE: minigame_stats
-- =====================================================
CREATE TABLE IF NOT EXISTS public.minigame_stats (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  discord_user_id text NOT NULL,
  game_type text NOT NULL,
  games_played integer DEFAULT 0,
  games_won integer DEFAULT 0,
  total_earned numeric DEFAULT 0,
  total_lost numeric DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- =====================================================
-- TABLE: discord_bot_verification
-- =====================================================
CREATE TABLE IF NOT EXISTS public.discord_bot_verification (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  code varchar NOT NULL,
  discord_user_id text,
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '10 minutes'),
  used_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- =====================================================
-- INDEXES für Performance
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_profiles_username ON public.profiles(username);
CREATE INDEX IF NOT EXISTS idx_profiles_user_id ON public.profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_profiles_uid_number ON public.profiles(uid_number);
CREATE INDEX IF NOT EXISTS idx_user_badges_user_id ON public.user_badges(user_id);
CREATE INDEX IF NOT EXISTS idx_user_badges_badge_id ON public.user_badges(badge_id);
CREATE INDEX IF NOT EXISTS idx_social_links_profile_id ON public.social_links(profile_id);
CREATE INDEX IF NOT EXISTS idx_profile_views_profile_id ON public.profile_views(profile_id);
CREATE INDEX IF NOT EXISTS idx_discord_presence_profile_id ON public.discord_presence(profile_id);

-- =====================================================
-- DONE!
-- =====================================================
-- Jetzt führe ALL_RLS_POLICIES.sql aus um die Policies zu setzen.
-- =====================================================
