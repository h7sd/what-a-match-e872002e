-- ============================================
-- USERVAULT COMPLETE DATA EXPORT
-- Generated: 2026-02-06
-- ============================================
-- 
-- ANLEITUNG:
-- 1. Geh zu https://supabase.com/dashboard/project/zdhqbovuqxioqfnshgxp
-- 2. Klick auf "SQL Editor" 
-- 3. Kopiere diesen GANZEN Inhalt und paste ihn
-- 4. Klick "Run"
--
-- WICHTIG: Führe ZUERST die Migrations aus (Schema), DANN dieses Script (Daten)
-- ============================================

-- Disable triggers temporarily for faster import
SET session_replication_role = replica;

-- ============================================
-- 1. GLOBAL BADGES
-- ============================================

INSERT INTO public.global_badges (id, name, description, icon_url, color, rarity, is_limited, max_claims, claims_count, created_by, created_at) VALUES
('ab24de9e-53e2-455a-b527-486257202e1d', 'NELSON', 'ONLY FOR NELSON', 'https://cdn.discordapp.com/attachments/1350468752667312139/1465865480005881899/IMG_1226.jpg?ex=697aa91c&is=6979579c&hm=6b6bb09224a0caf5cb3b499402634a38e04cdb1d9ca910bb7c5de21120d91eb9&', '#8b5cf6', 'legendary', true, 1, 1, '42fe6f70-12d4-406f-bf3d-72550f52420c', '2026-01-27 00:38:56.039574+00'),
('cd4718aa-2907-4f0c-aed7-260a783e534d', 'SNOW', 'Exclusive badge from the 2024 winter sale.', NULL, '#93C5FD', 'legendary', true, NULL, 6, NULL, '2026-01-27 00:43:49.800386+00'),
('b7fa6824-c8b8-45b2-afe2-8c4da5ef9f2e', 'Staff', 'Be a part of the staff team.', NULL, '#60A5FA', 'rare', false, NULL, 3, NULL, '2026-01-27 00:43:49.800386+00'),
('ac596906-b9ff-4f11-8e97-c4b06e966329', 'OG', 'Be an early supporter.', NULL, '#E5E7EB', 'rare', false, NULL, 1, NULL, '2026-01-27 00:43:49.800386+00'),
('35a07695-4b58-4833-967b-bef89684426e', 'Second Place', 'Got second place in a community event.', NULL, '#D1D5DB', 'rare', true, NULL, 1, NULL, '2026-01-27 00:43:49.800386+00'),
('49c935f4-51b6-4c94-bc7e-14231cdd54dc', 'Verified', 'Purchase or be a known content creator.', NULL, '#0142da', 'rare', false, NULL, 12, NULL, '2026-01-27 00:43:49.800386+00'),
('07fa6ac6-8682-44d9-b7ec-1a07fb957f66', 'Domain Legend', 'Add a public custom domain to the domain system.', NULL, '#FB7185', 'epic', false, NULL, 2, NULL, '2026-01-27 00:43:49.800386+00'),
('4a3a59ff-2945-4824-b848-ed43d92a1d8a', 'Donor', 'Donate at least 10€.', NULL, '#22C55E', 'rare', false, NULL, 2, NULL, '2026-01-27 00:43:49.800386+00'),
('60d08ff5-dc8d-4728-bffd-1373473c3ad8', 'Bug Hunter', 'Find and report a bug to the team.', NULL, '#F87171', 'rare', false, NULL, 7, NULL, '2026-01-27 00:43:49.800386+00'),
('91833952-ba1b-4aad-9409-e759b921f8b6', 'Christmas 2025', 'Exclusive badge from the 2025 winter sale.', NULL, '#60A5FA', 'legendary', true, NULL, 2, NULL, '2026-01-27 00:43:49.800386+00'),
('339598b1-ce3a-405e-8b5c-48f5ccaaa48e', 'Server Booster', 'Boost the community server.', NULL, '#F59E0B', 'rare', false, NULL, 2, NULL, '2026-01-27 00:43:49.800386+00'),
('2d8e696d-03e8-468b-accd-9535722c0eeb', 'Third Place', 'Got third place in a community event.', NULL, '#FDBA74', 'rare', true, NULL, 1, NULL, '2026-01-27 00:43:49.800386+00'),
('399de6d2-4044-481a-82de-ea9368935edf', 'Image Host', 'Purchase the image host.', NULL, '#FBBF24', 'rare', false, NULL, 1, NULL, '2026-01-27 00:43:49.800386+00'),
('06902f34-e1da-4015-8abb-d62b786cb0f0', 'Easter 2025', 'Exclusive badge from the 2025 easter sale.', NULL, '#34D399', 'legendary', true, NULL, 2, NULL, '2026-01-27 00:43:49.800386+00'),
('22e7ebcc-8a9f-4f8e-91c6-48c7babc0039', 'Winner', 'Win a community event.', NULL, '#FBBF24', 'epic', true, NULL, 1, NULL, '2026-01-27 00:43:49.800386+00'),
('4b3da31f-2d77-465e-b0d1-9f1c2ab9a5e6', 'uservault.cc', 'Official UserVault.cc partner', NULL, '#3B82F6', 'rare', false, NULL, 0, NULL, '2026-01-27 00:43:49.800386+00'),
('bea24cf9-0dfa-4bb3-9e2a-07a33b9c7e20', 'Helper', 'Be active and help users in the community.', NULL, '#38BDF8', 'rare', false, NULL, 0, NULL, '2026-01-27 00:43:49.800386+00'),
('5147f617-8b2e-4091-9091-82f325265b21', 'Gifter', 'Gift a user a product to another user.', NULL, '#F472B6', 'rare', false, NULL, 2, NULL, '2026-01-27 00:43:49.800386+00'),
('fd675ca0-000f-4457-977e-e024798cf991', 'HUNTER', 'The hunt badge - steal it from others!', NULL, '#FF0000', 'legendary', true, 1, 1, '42fe6f70-12d4-406f-bf3d-72550f52420c', '2026-02-04 01:50:00+00')
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  icon_url = EXCLUDED.icon_url,
  color = EXCLUDED.color,
  claims_count = EXCLUDED.claims_count;

-- ============================================
-- 2. USER ROLES (Admin-Berechtigungen)
-- ============================================

INSERT INTO public.user_roles (id, user_id, role, created_at) VALUES
('5c2f9719-df45-4a6a-a31a-ceeed4ab6959', 'ec569229-5613-4494-aca1-ac32b090d33b', 'admin', '2026-01-27 00:24:56.356879+00'),
('4daa6ffd-9319-43fd-b34b-ca15f9c43157', '42fe6f70-12d4-406f-bf3d-72550f52420c', 'admin', '2026-01-27 02:56:38.459912+00'),
('c92e189d-8fa2-4abc-b904-f9c2a89352f8', '9e53ea5e-4260-422e-a362-7ce5cdda701a', 'admin', '2026-01-27 20:51:30.173283+00'),
('8a158725-5660-4d2c-893a-f79f081c4695', '9f95e196-8900-449e-b627-7588a210f7f5', 'admin', '2026-01-27 22:06:01.103083+00'),
('899972ba-db16-4eaa-ae6a-26fe06ae3083', '16a0c6f6-1f53-4071-b4ac-1886114e4eab', 'admin', '2026-01-31 02:53:55.40528+00'),
('8228202b-58b2-4ffa-bfde-156929dcc72f', '01de5e05-3b05-48f0-bcdf-e71625d290b4', 'supporter', '2026-02-05 15:19:26.043195+00'),
('e63f1fcd-16ab-43fc-8d45-7a71e01542f3', '756b2465-b3b6-416e-a8e4-c31ae309ccac', 'supporter', '2026-02-05 15:19:34.50263+00'),
('d8937565-d08d-46e3-b8c4-29733d1c3024', 'c2823d22-19e2-43bc-9634-3516dc29f32c', 'admin', '2026-02-06 13:38:15.02644+00')
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- 3. PROMO CODES
-- ============================================

INSERT INTO public.promo_codes (id, code, description, discount_percentage, type, max_uses, uses_count, expires_at, is_active, created_by, created_at) VALUES
('6112b7eb-c013-40aa-90cb-1bd2968e708c', 'BETA2026', 'FOR ALL', 25, 'discount', NULL, 3, NULL, true, '42fe6f70-12d4-406f-bf3d-72550f52420c', '2026-01-31 23:10:53.876536+00'),
('ebbf5e79-86aa-46f9-92ae-ea801a711f84', 'USERVAULT26', NULL, 100, 'discount', 1, 1, NULL, true, '42fe6f70-12d4-406f-bf3d-72550f52420c', '2026-02-01 18:47:35.417158+00'),
('aed4960f-0a8d-4747-ab5c-2fdb235a8dc2', 'HALTESTELLE10', NULL, 35, 'discount', 10, 3, NULL, true, 'ec569229-5613-4494-aca1-ac32b090d33b', '2026-02-01 22:30:04.635613+00'),
('d49aae36-2158-4e4d-98e7-1fb0efa7317c', 'HALTESTELLE', NULL, 15, 'discount', NULL, 0, NULL, true, 'ec569229-5613-4494-aca1-ac32b090d33b', '2026-02-01 22:30:25.785324+00'),
('d0661cec-27de-4dcc-ab0a-669d5310b3dc', 'HALTESTELLETEAM', NULL, 100, 'gift', 5, 5, NULL, false, 'ec569229-5613-4494-aca1-ac32b090d33b', '2026-02-01 22:39:01.979357+00'),
('9377d36e-6dd0-490b-995d-6fc1d4e63074', 'NICOISTNICHTNETT', NULL, 50, 'discount', NULL, 0, NULL, true, '42fe6f70-12d4-406f-bf3d-72550f52420c', '2026-02-03 19:35:14.793427+00')
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- 4. BADGE EVENTS
-- ============================================

INSERT INTO public.badge_events (id, name, description, event_type, target_badge_id, is_active, starts_at, ends_at, steal_duration_hours, created_by, created_at) VALUES
('7ea3d555-6ccd-454c-9a01-63967ff3035c', '#1 HUNTER EVENT ON USERVAULT.CC', NULL, 'hunt', 'fd675ca0-000f-4457-977e-e024798cf991', true, '2026-02-04 01:56:29.916816+00', NULL, 168, '42fe6f70-12d4-406f-bf3d-72550f52420c', '2026-02-04 01:56:29.916816+00')
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- 5. DISCORD INTEGRATIONS
-- ============================================

INSERT INTO public.discord_integrations (id, user_id, discord_id, username, discriminator, avatar, show_on_profile, created_at, updated_at) VALUES
('ad6c40d5-ba23-435f-92ac-d3d0093c1a63', '42fe6f70-12d4-406f-bf3d-72550f52420c', '809976264856830022', 'crck2rich', '0', '51493596f2df5006035ecafe35f343bd', true, '2026-02-05 20:05:27.162501+00', '2026-02-05 20:05:27.119+00'),
('8dd5933f-3dd6-4296-a290-aa592c4e5d6c', '1d2e0965-a7a2-4100-a509-ee7c77ebf295', '573100833235927050', 's', '0', '5cbe772fec5c093119b14742cbf0d362', true, '2026-02-05 20:19:53.216898+00', '2026-02-05 20:19:53.163+00')
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- HINWEIS ZU PROFILES
-- ============================================
-- Die Profile-Daten sind zu umfangreich für dieses Script.
-- Profile werden automatisch erstellt wenn sich User anmelden.
-- 
-- Für eine VOLLSTÄNDIGE Migration brauchst du:
-- 1. Auth-User Export (nur über Supabase CLI möglich)
-- 2. Profile-Daten separat exportieren
--
-- Nutze das AdminDatabaseExport Tool im Dashboard für vollständigen Export!
-- ============================================

-- Re-enable triggers
SET session_replication_role = DEFAULT;

-- ============================================
-- STORAGE BUCKETS
-- ============================================

INSERT INTO storage.buckets (id, name, public) VALUES 
('avatars', 'avatars', true),
('backgrounds', 'backgrounds', true),
('badge-icons', 'badge-icons', true),
('audio', 'audio', true),
('profile-assets', 'profile-assets', true)
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- FERTIG!
-- ============================================
