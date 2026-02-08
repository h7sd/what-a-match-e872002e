/*
  # Clean and reimport profiles
  
  Removes all profile records and related data to start fresh.
*/

DELETE FROM profile_likes WHERE profile_id IS NOT NULL;
DELETE FROM profile_comments WHERE profile_id IS NOT NULL;
DELETE FROM social_links WHERE profile_id IS NOT NULL;
DELETE FROM profile_views WHERE profile_id IS NOT NULL;
DELETE FROM discord_presence WHERE profile_id IS NOT NULL;
DELETE FROM alias_requests WHERE id IS NOT NULL;
DELETE FROM profiles WHERE id IS NOT NULL;
