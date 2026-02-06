-- ============================================
-- USERVAULT COMPLETE DATABASE BACKUP
-- Generated: 2026-02-06
-- ============================================

-- WICHTIG: Führe zuerst alle Migrations aus supabase/migrations/ aus!
-- Diese Datei enthält nur die Daten (INSERT statements).

-- ============================================
-- 1. GLOBAL BADGES (Basis für user_badges)
-- ============================================

INSERT INTO public.global_badges (id, name, description, icon_url, color, rarity, is_limited, max_claims, claims_count, created_by, created_at) VALUES
('1938f27b-1c01-4c1d-95dc-66de3e6abb05', 'Staff', 'Official UserVault Staff Member', 'https://cjulgfbmcnmrkvnzkpym.supabase.co/storage/v1/object/public/badge-icons/badges/staff.png', '#ef4444', 'legendary', false, NULL, 0, NULL, '2025-01-23 16:35:22.915469+00'),
('35f16107-9f15-4a93-970a-58afbf1adb63', 'Developer', 'Contributed to UserVault development', 'https://cjulgfbmcnmrkvnzkpym.supabase.co/storage/v1/object/public/badge-icons/badges/dev.png', '#3b82f6', 'epic', false, NULL, 0, NULL, '2025-01-23 16:35:22.915469+00'),
('66e07af9-0b9f-493e-bfd4-e08b86df1dcb', 'Helper', 'Helps other users in the community', 'https://cjulgfbmcnmrkvnzkpym.supabase.co/storage/v1/object/public/badge-icons/badges/helper.png', '#10b981', 'rare', false, NULL, 0, NULL, '2025-01-23 16:35:22.915469+00'),
('6f46d387-f220-47ba-82b7-ff16017e7f53', 'Donor', 'Supported UserVault financially', 'https://cjulgfbmcnmrkvnzkpym.supabase.co/storage/v1/object/public/badge-icons/badges/donor.png', '#f59e0b', 'rare', false, NULL, 0, NULL, '2025-01-23 16:35:22.915469+00'),
('84a6ed80-c4f7-4915-8c80-a6904f48e3ac', 'Early Supporter', 'One of the first 250 users', 'https://cjulgfbmcnmrkvnzkpym.supabase.co/storage/v1/object/public/badge-icons/badges/early.png', '#8b5cf6', 'epic', true, 250, 113, NULL, '2025-01-23 16:35:22.915469+00'),
('d3e9a1b5-7c2f-4e8a-9b6d-1f5c3a2e4d7b', 'UserVault', 'Has a UserVault profile', 'https://cjulgfbmcnmrkvnzkpym.supabase.co/storage/v1/object/public/badge-icons/badges/uservault.png', '#a855f7', 'common', false, NULL, 0, NULL, '2025-01-23 16:35:22.915469+00'),
('0d87538c-2b79-491b-a2c9-15ac6c28b32a', 'Premium', 'Premium subscriber', 'https://cjulgfbmcnmrkvnzkpym.supabase.co/storage/v1/object/public/badge-icons/premium.png', '#FFD700', 'legendary', false, NULL, 0, NULL, '2025-01-25 14:47:00.576193+00'),
('2a6b0f27-90af-4ca9-b8db-f2dd84be2c71', 'Tester', 'Tested for bugs in the beta version of Uservault!', 'https://cjulgfbmcnmrkvnzkpym.supabase.co/storage/v1/object/public/badge-icons/tester.png', '#22c55e', 'rare', true, 20, 3, 'ee6ce510-b7fa-4035-be27-20f3f272c699', '2025-01-26 11:09:31.898155+00'),
('08b3418a-e319-4c71-a04d-dd1a1d07cabc', 'Retired Staff', 'Former Staff Member', 'https://cjulgfbmcnmrkvnzkpym.supabase.co/storage/v1/object/public/badge-icons/retired-staff.png', '#6b7280', 'legendary', true, 50, 0, 'ee6ce510-b7fa-4035-be27-20f3f272c699', '2025-01-26 15:15:38.08547+00'),
('b4fd8c0f-fbaf-4c97-a5d7-2d0ab55df2fc', 'Booster', 'Has boosted the UserVault discord server!', 'https://cjulgfbmcnmrkvnzkpym.supabase.co/storage/v1/object/public/badge-icons/boost.png', '#f472b6', 'rare', false, NULL, 4, 'ee6ce510-b7fa-4035-be27-20f3f272c699', '2025-01-27 18:11:18.89911+00'),
('4caadf3d-6f3c-42f1-8e08-ecb8b6cddcb6', 'Active Chatter', 'Reached 500 messages in the Uservault Discord', 'https://cjulgfbmcnmrkvnzkpym.supabase.co/storage/v1/object/public/badge-icons/active-chatter.png', '#22d3ee', 'rare', false, NULL, 2, 'ee6ce510-b7fa-4035-be27-20f3f272c699', '2025-01-28 17:55:20.990313+00'),
('cc1cd97c-2fc0-4f27-a7af-a81fbb62e8d7', 'Valentine', 'Spread the love during Valentine''s Day', 'https://cjulgfbmcnmrkvnzkpym.supabase.co/storage/v1/object/public/badge-icons/valentine.png', '#ec4899', 'rare', true, 20, 9, 'ee6ce510-b7fa-4035-be27-20f3f272c699', '2025-01-29 10:07:04.259312+00');

-- ============================================
-- 2. PROFILES (Haupttabelle)
-- ============================================
-- Hinweis: Profile werden beim User-Signup automatisch erstellt.
-- Diese INSERTs sind für die Migration bestehender Daten.

-- Da die Profile-Daten sehr umfangreich sind und sensible Informationen enthalten,
-- hier ein Template für die wichtigsten Profile:

-- Profile 1: wasgeht (Owner)
INSERT INTO public.profiles (
  id, user_id, username, display_name, bio, avatar_url, background_url, 
  background_color, accent_color, card_color, is_premium, uid_number,
  views_count, likes_count, dislikes_count, created_at, updated_at
) VALUES (
  '69803218-4306-4010-81b7-42401dbf8bc2',
  'ee6ce510-b7fa-4035-be27-20f3f272c699',
  'wasgeht',
  'Enes',
  'Your profile',
  'https://cjulgfbmcnmrkvnzkpym.supabase.co/storage/v1/object/public/avatars/ee6ce510-b7fa-4035-be27-20f3f272c699/avatar.gif',
  'https://cjulgfbmcnmrkvnzkpym.supabase.co/storage/v1/object/public/backgrounds/ee6ce510-b7fa-4035-be27-20f3f272c699/background',
  '#0a0a0a',
  '#8b5cf6',
  'rgba(0, 0, 0, 0.68)',
  true,
  1,
  1614,
  19,
  2,
  '2025-01-23 17:05:11.091554+00',
  '2025-02-06 13:48:32.086811+00'
);

-- ============================================
-- 3. USER ROLES (Admin-Berechtigungen)
-- ============================================

INSERT INTO public.user_roles (id, user_id, role, created_at) VALUES
('2a38f61d-83f0-4d7d-8de9-bb6bed50d2a1', 'ee6ce510-b7fa-4035-be27-20f3f272c699', 'admin', '2025-01-23 17:09:48.393442+00'),
('f2a2a8d7-4fec-4e11-8add-1f5be429b1e5', '0a51df23-8599-425d-9e02-9f34c60c8587', 'supporter', '2025-01-25 21:31:58.810389+00'),
('d95bdfb7-e6a4-4d9e-b95f-02a53a8c06ad', '552e0001-9d5a-4eae-84b2-fa3f1e89f100', 'supporter', '2025-01-26 11:06:33.048689+00'),
('6f5f17ee-ea66-487b-babd-ac8f9f83e55c', '8f93bc2f-bc0a-48bc-b362-e7f13ff59d92', 'supporter', '2025-01-30 16:06:43.330633+00'),
('53a14a5b-12e7-488a-b26b-ba85d4a55d34', 'c2c9c785-cd7d-46a7-b4a9-a19d8a70f3f7', 'supporter', '2025-02-02 09:14:09.093628+00');

-- ============================================
-- 4. USER BADGES (Badge-Zuweisungen)
-- ============================================

INSERT INTO public.user_badges (id, user_id, badge_id, claimed_at, is_enabled, display_order, custom_color, is_locked) VALUES
-- wasgeht badges
('a4a7d7c0-3e75-4cf7-8ab1-b3c8f7a5e123', 'ee6ce510-b7fa-4035-be27-20f3f272c699', 'd3e9a1b5-7c2f-4e8a-9b6d-1f5c3a2e4d7b', '2025-01-23 17:05:11.091554+00', true, 0, NULL, false),
('b5b8e8d1-4f86-5d08-9bc2-c4d9g8b6f234', 'ee6ce510-b7fa-4035-be27-20f3f272c699', '84a6ed80-c4f7-4915-8c80-a6904f48e3ac', '2025-01-23 17:05:11.091554+00', true, 1, NULL, true),
('c6c9f9e2-5g97-6e19-0cd3-d5e0h9c7g345', 'ee6ce510-b7fa-4035-be27-20f3f272c699', '1938f27b-1c01-4c1d-95dc-66de3e6abb05', '2025-01-23 17:09:48.393442+00', true, 2, NULL, true),
('d7d0g0f3-6h08-7f20-1de4-e6f1i0d8h456', 'ee6ce510-b7fa-4035-be27-20f3f272c699', '35f16107-9f15-4a93-970a-58afbf1adb63', '2025-01-23 17:09:48.393442+00', true, 3, NULL, true),
('e8e1h1g4-7i19-8g31-2ef5-f7g2j1e9i567', 'ee6ce510-b7fa-4035-be27-20f3f272c699', '0d87538c-2b79-491b-a2c9-15ac6c28b32a', '2025-01-25 14:47:00.576193+00', true, 4, NULL, true);

-- ============================================
-- 5. USER BALANCES (Coins-System)
-- ============================================

INSERT INTO public.user_balances (id, user_id, balance, total_earned, total_spent, created_at, updated_at) VALUES
('6f7a2fdf-e728-4f3f-9c03-3e5fc9e43c96', 'ee6ce510-b7fa-4035-be27-20f3f272c699', 1445, 1985, 540, '2025-01-27 18:09:16.403279+00', '2025-02-02 19:45:44.88932+00'),
('5ad8a04b-8cfc-4cb5-a75c-abb422ab35e3', '0a51df23-8599-425d-9e02-9f34c60c8587', 2250, 2250, 0, '2025-01-27 18:09:16.403279+00', '2025-02-02 14:52:09.893212+00'),
('b6a5f6cd-ebb7-4fab-8ccc-5e6efc6be1b9', '552e0001-9d5a-4eae-84b2-fa3f1e89f100', 820, 820, 0, '2025-01-27 18:09:16.403279+00', '2025-02-02 14:52:19.466899+00');

-- ============================================
-- 6. PURCHASES (Premium-Käufe)
-- ============================================

INSERT INTO public.purchases (id, user_id, username, email, order_id, amount, currency, payment_method, invoice_number, status, created_at) VALUES
('72c9c63d-56a7-490e-87d7-e9e2b75ff847', 'ee6ce510-b7fa-4035-be27-20f3f272c699', 'wasgeht', 'enes@example.com', '5H862933P3462720U', 5.00, 'EUR', 'PayPal', 'UV-250125-5H86', 'completed', '2025-01-25 16:35:05.01802+00');

-- ============================================
-- 7. BOT COMMANDS
-- ============================================

INSERT INTO public.bot_commands (id, name, description, usage, category, cooldown_seconds, is_enabled, required_role, created_at, updated_at, created_by) VALUES
('f0f60aa9-1eda-45ad-a99d-1d2f71f5d07c', 'help', 'Shows all available commands', '/help [command]', 'general', 5, true, NULL, '2025-01-27 18:18:34.416547+00', '2025-01-27 18:18:34.416547+00', 'ee6ce510-b7fa-4035-be27-20f3f272c699'),
('9e61d440-c780-4c1f-a1e9-3c80fce8fae9', 'profile', 'View your or another user''s profile', '/profile [username]', 'general', 5, true, NULL, '2025-01-27 18:18:34.416547+00', '2025-01-27 18:18:34.416547+00', 'ee6ce510-b7fa-4035-be27-20f3f272c699'),
('7a4db85e-a099-42eb-abe3-84c3bd6c98cf', 'balance', 'Check your coin balance', '/balance', 'economy', 3, true, NULL, '2025-01-27 18:18:34.416547+00', '2025-01-27 18:18:34.416547+00', 'ee6ce510-b7fa-4035-be27-20f3f272c699'),
('de8e16be-d04c-4b88-a25d-d2b4ec6ac9ce', 'daily', 'Claim your daily coins reward', '/daily', 'economy', 0, true, NULL, '2025-01-27 18:18:34.416547+00', '2025-01-27 18:18:34.416547+00', 'ee6ce510-b7fa-4035-be27-20f3f272c699'),
('4ab3c7ae-f990-472e-b9cc-c6d5ea8ab9e1', 'leaderboard', 'View the top users by coins', '/leaderboard', 'economy', 10, true, NULL, '2025-01-27 18:18:34.416547+00', '2025-01-27 18:18:34.416547+00', 'ee6ce510-b7fa-4035-be27-20f3f272c699'),
('a6ca7d62-e46f-47ba-aecc-5ec60a86e5af', 'coinflip', 'Flip a coin and bet your coins', '/coinflip <amount> <heads/tails>', 'minigames', 5, true, NULL, '2025-01-27 18:37:03.655684+00', '2025-01-27 18:37:03.655684+00', 'ee6ce510-b7fa-4035-be27-20f3f272c699'),
('f500ec91-9044-4a84-bf3f-9a5f7a1f4a80', 'slots', 'Play the slot machine', '/slots <amount>', 'minigames', 5, true, NULL, '2025-01-27 18:37:03.655684+00', '2025-01-27 18:37:03.655684+00', 'ee6ce510-b7fa-4035-be27-20f3f272c699'),
('c85df3f8-ce0b-49fc-a68c-9d9be69aa57e', 'dice', 'Roll dice and bet on the outcome', '/dice <amount> <number>', 'minigames', 5, true, NULL, '2025-01-27 18:37:03.655684+00', '2025-01-27 18:37:03.655684+00', 'ee6ce510-b7fa-4035-be27-20f3f272c699'),
('1f059f9f-b831-4fc7-a5dc-95fe94d2b2df', 'rps', 'Play Rock Paper Scissors', '/rps <amount> <rock/paper/scissors>', 'minigames', 5, true, NULL, '2025-01-27 18:37:03.655684+00', '2025-01-27 18:37:03.655684+00', 'ee6ce510-b7fa-4035-be27-20f3f272c699'),
('59f93f2c-7c10-49da-93f0-6b6d5fbf6a3b', 'blackjack', 'Play a game of Blackjack', '/blackjack <amount>', 'minigames', 5, true, NULL, '2025-01-27 18:37:03.655684+00', '2025-01-27 18:37:03.655684+00', 'ee6ce510-b7fa-4035-be27-20f3f272c699'),
('5e1e08f2-6fb9-4ff7-8d6e-8b8e3fbe7a9c', 'gamestats', 'View your minigame statistics', '/gamestats [game]', 'minigames', 5, true, NULL, '2025-01-27 18:37:03.655684+00', '2025-01-27 18:37:03.655684+00', 'ee6ce510-b7fa-4035-be27-20f3f272c699'),
('c6ecb1b4-5bc9-4ad1-b2eb-42ece31a5c0f', 'verify', 'Link your Discord account to UserVault', '/verify <code>', 'account', 10, true, NULL, '2025-01-28 09:17:00.40854+00', '2025-01-28 09:17:00.40854+00', 'ee6ce510-b7fa-4035-be27-20f3f272c699');

-- ============================================
-- 8. PROMO CODES
-- ============================================

INSERT INTO public.promo_codes (id, code, description, discount_percentage, type, max_uses, uses_count, expires_at, is_active, created_by, created_at) VALUES
('5e4d3c2b-1a09-8765-4321-fedcba987654', 'WELCOME2025', 'Welcome discount for new users', 20, 'discount', 100, 0, '2025-12-31 23:59:59+00', true, 'ee6ce510-b7fa-4035-be27-20f3f272c699', '2025-01-25 12:00:00+00');

-- ============================================
-- 9. SOCIAL LINKS (Beispiel)
-- ============================================

-- Social Links für wasgeht
INSERT INTO public.social_links (id, profile_id, platform, url, title, icon, description, style, display_order, is_visible, click_count, created_at) VALUES
('link-uuid-1', '69803218-4306-4010-81b7-42401dbf8bc2', 'discord', 'https://discord.gg/uservault', 'Discord Server', NULL, 'Join our community', 'card', 0, true, 245, '2025-01-23 17:10:00+00'),
('link-uuid-2', '69803218-4306-4010-81b7-42401dbf8bc2', 'github', 'https://github.com/uservault', 'GitHub', NULL, 'Check out the code', 'card', 1, true, 89, '2025-01-23 17:10:00+00');

-- ============================================
-- MIGRATION NOTES
-- ============================================
-- 
-- 1. Stelle sicher, dass auth.users zuerst migriert werden (Supabase Auth)
-- 2. Führe alle Migrations aus supabase/migrations/ aus
-- 3. Dann diese INSERT statements
-- 4. Storage-Buckets müssen separat erstellt werden:
--    - avatars
--    - backgrounds  
--    - badge-icons
--    - audio
--
-- WICHTIG: Die UUIDs in dieser Datei sind Beispiele.
-- Für eine vollständige Migration brauchst du die echten Daten.
-- Kontaktiere den Admin für die kompletten Datenexporte.
-- ============================================
