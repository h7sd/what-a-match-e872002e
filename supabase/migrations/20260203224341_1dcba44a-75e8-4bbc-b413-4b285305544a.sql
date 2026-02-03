
-- Drop and recreate the function with proper column references
CREATE OR REPLACE FUNCTION public.get_profile_badges_with_friends(p_profile_id uuid)
RETURNS TABLE(
  id uuid, 
  name text, 
  description text, 
  icon_url text, 
  color text, 
  rarity text, 
  badge_type text, 
  display_order integer, 
  custom_color text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_user_id uuid;
BEGIN
  -- Get user_id from profile
  SELECT p.user_id INTO v_user_id FROM profiles p WHERE p.id = p_profile_id;
  
  IF v_user_id IS NULL THEN
    RETURN;
  END IF;
  
  RETURN QUERY
  -- Global badges (not stolen, not locked)
  SELECT 
    gb.id as id,
    gb.name as name,
    gb.description as description,
    gb.icon_url as icon_url,
    COALESCE(ub.custom_color, gb.color) as color,
    gb.rarity as rarity,
    'global'::text as badge_type,
    COALESCE(ub.display_order, 0) as display_order,
    ub.custom_color as custom_color
  FROM user_badges ub
  INNER JOIN global_badges gb ON ub.badge_id = gb.id
  WHERE ub.user_id = v_user_id
    AND ub.is_enabled = true
    AND (ub.is_locked IS NULL OR ub.is_locked = false)
    -- Exclude badges currently stolen from this user
    AND NOT EXISTS (
      SELECT 1 FROM badge_steals bs 
      WHERE bs.victim_user_id = v_user_id 
        AND bs.badge_id = gb.id 
        AND bs.returned = false
        AND bs.returns_at > now()
    )
  
  UNION ALL
  
  -- Friend badges received (enabled only)
  SELECT 
    fb.id as id,
    fb.name as name,
    fb.description as description,
    fb.icon_url as icon_url,
    fb.color as color,
    'friend'::text as rarity,
    'friend'::text as badge_type,
    fb.display_order as display_order,
    NULL::text as custom_color
  FROM friend_badges fb
  WHERE fb.recipient_id = v_user_id
    AND fb.is_enabled = true
  
  UNION ALL
  
  -- Stolen badges (temporary)
  SELECT 
    gb.id as id,
    (gb.name || ' (stolen)')::text as name,
    gb.description as description,
    gb.icon_url as icon_url,
    gb.color as color,
    'stolen'::text as rarity,
    'stolen'::text as badge_type,
    999 as display_order,
    NULL::text as custom_color
  FROM badge_steals bs
  INNER JOIN global_badges gb ON bs.badge_id = gb.id
  WHERE bs.thief_user_id = v_user_id
    AND bs.returned = false
    AND bs.returns_at > now()
  
  ORDER BY 8 ASC, 7 ASC;  -- Order by display_order, then badge_type using column positions
END;
$function$;
