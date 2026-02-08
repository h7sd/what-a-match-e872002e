/*
  # Add missing foreign key indexes

  Performance improvement: Adding indexes on foreign key columns that were
  flagged as missing. These indexes improve JOIN and CASCADE performance.

  1. New Indexes
    - `badge_events.target_badge_id`
    - `badge_steals.badge_id`
    - `badge_steals.event_id`
    - `marketplace_purchases.item_id`
    - `profile_comments.profile_id`
    - `profile_likes.profile_id`
    - `user_badges.badge_id`
*/

CREATE INDEX IF NOT EXISTS idx_badge_events_target_badge_id ON badge_events(target_badge_id);
CREATE INDEX IF NOT EXISTS idx_badge_steals_badge_id ON badge_steals(badge_id);
CREATE INDEX IF NOT EXISTS idx_badge_steals_event_id ON badge_steals(event_id);
CREATE INDEX IF NOT EXISTS idx_marketplace_purchases_item_id ON marketplace_purchases(item_id);
CREATE INDEX IF NOT EXISTS idx_profile_comments_profile_id ON profile_comments(profile_id);
CREATE INDEX IF NOT EXISTS idx_profile_likes_profile_id ON profile_likes(profile_id);
CREATE INDEX IF NOT EXISTS idx_user_badges_badge_id ON user_badges(badge_id);