-- =====================================================
-- BADGE SYSTEM EXPANSION: Ordering, Custom Colors, Friend Badges, and Events
-- =====================================================

-- 1. Add display_order and custom_color to user_badges for drag & drop ordering and individual coloring
ALTER TABLE public.user_badges
ADD COLUMN IF NOT EXISTS display_order INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS custom_color TEXT;

-- 2. Create friend_badges table for custom badges users can give to friends (max 5)
CREATE TABLE IF NOT EXISTS public.friend_badges (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  creator_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  recipient_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL CHECK (char_length(name) BETWEEN 1 AND 32),
  description TEXT CHECK (char_length(description) <= 100),
  icon_url TEXT,
  color TEXT DEFAULT '#8B5CF6',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  is_enabled BOOLEAN DEFAULT true,
  display_order INTEGER DEFAULT 0,
  UNIQUE(creator_id, recipient_id, name)
);

-- Enable RLS on friend_badges
ALTER TABLE public.friend_badges ENABLE ROW LEVEL SECURITY;

-- Policies for friend_badges
-- Creators can manage their own created badges
CREATE POLICY "Users can view their created or received friend badges"
ON public.friend_badges FOR SELECT
USING (auth.uid() = creator_id OR auth.uid() = recipient_id);

CREATE POLICY "Users can create friend badges"
ON public.friend_badges FOR INSERT
WITH CHECK (
  auth.uid() = creator_id 
  AND auth.uid() != recipient_id
  AND (
    SELECT COUNT(*) FROM public.friend_badges 
    WHERE creator_id = auth.uid()
  ) < 5
);

CREATE POLICY "Creators can update their friend badges"
ON public.friend_badges FOR UPDATE
USING (auth.uid() = creator_id);

CREATE POLICY "Creators can delete their friend badges"
ON public.friend_badges FOR DELETE
USING (auth.uid() = creator_id);

-- Recipients can toggle visibility
CREATE POLICY "Recipients can toggle friend badge visibility"
ON public.friend_badges FOR UPDATE
USING (auth.uid() = recipient_id)
WITH CHECK (auth.uid() = recipient_id);

-- Admin full access
CREATE POLICY "Admins can manage all friend badges"
ON public.friend_badges FOR ALL
USING (public.has_role(auth.uid(), 'admin'));

-- 3. Create badge_events table for admin-controlled events (badge stealing, etc.)
CREATE TABLE IF NOT EXISTS public.badge_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  event_type TEXT NOT NULL CHECK (event_type IN ('steal', 'hunt')),
  name TEXT NOT NULL CHECK (char_length(name) BETWEEN 1 AND 64),
  description TEXT,
  target_badge_id UUID REFERENCES public.global_badges(id) ON DELETE SET NULL,
  is_active BOOLEAN DEFAULT false,
  starts_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  ends_at TIMESTAMP WITH TIME ZONE,
  steal_duration_hours INTEGER DEFAULT 168, -- 1 week default
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on badge_events
ALTER TABLE public.badge_events ENABLE ROW LEVEL SECURITY;

-- Everyone can view active events
CREATE POLICY "Everyone can view active events"
ON public.badge_events FOR SELECT
USING (is_active = true OR public.has_role(auth.uid(), 'admin'));

-- Only admins can manage events
CREATE POLICY "Admins can manage badge events"
ON public.badge_events FOR ALL
USING (public.has_role(auth.uid(), 'admin'));

-- 4. Create badge_steals table for tracking stolen badges
CREATE TABLE IF NOT EXISTS public.badge_steals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id UUID REFERENCES public.badge_events(id) ON DELETE CASCADE,
  badge_id UUID NOT NULL REFERENCES public.global_badges(id) ON DELETE CASCADE,
  thief_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  victim_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  stolen_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  returns_at TIMESTAMP WITH TIME ZONE NOT NULL,
  returned BOOLEAN DEFAULT false,
  returned_at TIMESTAMP WITH TIME ZONE,
  UNIQUE(event_id, badge_id, thief_user_id, victim_user_id, returned)
);

-- Enable RLS on badge_steals
ALTER TABLE public.badge_steals ENABLE ROW LEVEL SECURITY;

-- Users can see steals involving them (but NOT who stole from them in hunt events)
CREATE POLICY "Users can view their own steals"
ON public.badge_steals FOR SELECT
USING (
  auth.uid() = thief_user_id 
  OR (
    auth.uid() = victim_user_id 
    AND NOT EXISTS (
      SELECT 1 FROM public.badge_events e 
      WHERE e.id = event_id AND e.event_type = 'hunt'
    )
  )
  OR public.has_role(auth.uid(), 'admin')
);

-- Only admins can insert steals directly (or via edge function)
CREATE POLICY "Admins can manage badge steals"
ON public.badge_steals FOR ALL
USING (public.has_role(auth.uid(), 'admin'));

-- 5. Function to get profile badges with friend badges included
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
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
BEGIN
  -- Get user_id from profile
  SELECT user_id INTO v_user_id FROM profiles WHERE id = p_profile_id;
  
  IF v_user_id IS NULL THEN
    RETURN;
  END IF;
  
  RETURN QUERY
  -- Global badges (not stolen, not locked)
  SELECT 
    gb.id,
    gb.name,
    gb.description,
    gb.icon_url,
    COALESCE(ub.custom_color, gb.color) as color,
    gb.rarity,
    'global'::text as badge_type,
    COALESCE(ub.display_order, 0) as display_order,
    ub.custom_color
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
    fb.id,
    fb.name,
    fb.description,
    fb.icon_url,
    fb.color,
    'friend'::text as rarity,
    'friend'::text as badge_type,
    fb.display_order,
    NULL::text as custom_color
  FROM friend_badges fb
  WHERE fb.recipient_id = v_user_id
    AND fb.is_enabled = true
  
  UNION ALL
  
  -- Stolen badges (temporary)
  SELECT 
    gb.id,
    gb.name || ' (stolen)' as name,
    gb.description,
    gb.icon_url,
    gb.color,
    'stolen'::text as rarity,
    'stolen'::text as badge_type,
    999 as display_order,
    NULL::text as custom_color
  FROM badge_steals bs
  INNER JOIN global_badges gb ON bs.badge_id = gb.id
  WHERE bs.thief_user_id = v_user_id
    AND bs.returned = false
    AND bs.returns_at > now()
  
  ORDER BY display_order ASC, badge_type ASC;
END;
$$;

-- 6. Function to steal a badge (with validation)
CREATE OR REPLACE FUNCTION public.steal_badge(
  p_victim_username text,
  p_badge_name text,
  p_event_id uuid DEFAULT NULL
)
RETURNS TABLE(success boolean, message text, stolen_badge_name text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_thief_id uuid;
  v_victim_id uuid;
  v_badge_id uuid;
  v_event badge_events%ROWTYPE;
  v_duration_hours integer;
  v_existing_steal badge_steals%ROWTYPE;
BEGIN
  v_thief_id := auth.uid();
  
  IF v_thief_id IS NULL THEN
    RETURN QUERY SELECT false, 'Not authenticated'::text, NULL::text;
    RETURN;
  END IF;
  
  -- Get victim user_id
  SELECT user_id INTO v_victim_id FROM profiles WHERE lower(username) = lower(p_victim_username);
  IF v_victim_id IS NULL THEN
    RETURN QUERY SELECT false, 'User not found'::text, NULL::text;
    RETURN;
  END IF;
  
  -- Cannot steal from yourself
  IF v_victim_id = v_thief_id THEN
    RETURN QUERY SELECT false, 'Cannot steal from yourself'::text, NULL::text;
    RETURN;
  END IF;
  
  -- Get badge
  SELECT id INTO v_badge_id FROM global_badges WHERE lower(name) = lower(p_badge_name);
  IF v_badge_id IS NULL THEN
    RETURN QUERY SELECT false, 'Badge not found'::text, NULL::text;
    RETURN;
  END IF;
  
  -- Check if victim actually has this badge
  IF NOT EXISTS (
    SELECT 1 FROM user_badges 
    WHERE user_id = v_victim_id AND badge_id = v_badge_id AND is_enabled = true
  ) THEN
    RETURN QUERY SELECT false, 'User does not have this badge'::text, NULL::text;
    RETURN;
  END IF;
  
  -- Check if there's an active steal event
  IF p_event_id IS NOT NULL THEN
    SELECT * INTO v_event FROM badge_events WHERE id = p_event_id AND is_active = true;
  ELSE
    SELECT * INTO v_event FROM badge_events WHERE is_active = true AND event_type = 'steal' LIMIT 1;
  END IF;
  
  IF v_event IS NULL THEN
    RETURN QUERY SELECT false, 'No active stealing event'::text, NULL::text;
    RETURN;
  END IF;
  
  v_duration_hours := COALESCE(v_event.steal_duration_hours, 168);
  
  -- Check if badge is already stolen
  SELECT * INTO v_existing_steal FROM badge_steals 
  WHERE badge_id = v_badge_id AND victim_user_id = v_victim_id AND returned = false AND returns_at > now();
  
  IF v_existing_steal IS NOT NULL THEN
    RETURN QUERY SELECT false, 'Badge is already stolen by someone else'::text, NULL::text;
    RETURN;
  END IF;
  
  -- Check if thief already stole in this event
  IF EXISTS (
    SELECT 1 FROM badge_steals 
    WHERE event_id = v_event.id AND thief_user_id = v_thief_id AND returned = false
  ) THEN
    RETURN QUERY SELECT false, 'You have already stolen a badge in this event'::text, NULL::text;
    RETURN;
  END IF;
  
  -- Perform the steal!
  INSERT INTO badge_steals (event_id, badge_id, thief_user_id, victim_user_id, returns_at)
  VALUES (v_event.id, v_badge_id, v_thief_id, v_victim_id, now() + (v_duration_hours || ' hours')::interval);
  
  RETURN QUERY SELECT true, 'Badge stolen successfully!'::text, p_badge_name;
END;
$$;

-- 7. Function to return stolen badges (called by scheduled cleanup or manually)
CREATE OR REPLACE FUNCTION public.return_stolen_badges()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  returned_count integer;
BEGIN
  UPDATE badge_steals
  SET returned = true, returned_at = now()
  WHERE returned = false AND returns_at <= now();
  
  GET DIAGNOSTICS returned_count = ROW_COUNT;
  RETURN returned_count;
END;
$$;

-- 8. Update the cleanup function to also return stolen badges
CREATE OR REPLACE FUNCTION public.scheduled_security_cleanup()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.cleanup_expired_verification_codes();
  PERFORM public.cleanup_expired_comments();
  PERFORM public.return_stolen_badges();
END;
$$;

-- 9. Grant access to update badge order for users
CREATE POLICY "Users can update their own badge order and color"
ON public.user_badges FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- 10. Create index for performance
CREATE INDEX IF NOT EXISTS idx_badge_steals_active ON public.badge_steals(thief_user_id, victim_user_id) WHERE returned = false;
CREATE INDEX IF NOT EXISTS idx_friend_badges_recipient ON public.friend_badges(recipient_id);
CREATE INDEX IF NOT EXISTS idx_friend_badges_creator ON public.friend_badges(creator_id);
CREATE INDEX IF NOT EXISTS idx_user_badges_order ON public.user_badges(user_id, display_order);