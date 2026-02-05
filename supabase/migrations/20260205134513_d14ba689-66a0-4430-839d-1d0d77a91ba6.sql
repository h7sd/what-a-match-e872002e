-- Add Discord embed color field
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS og_embed_color TEXT;

-- Add global badge color settings
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS global_badge_color TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS use_global_badge_color BOOLEAN DEFAULT false;

-- Create user_streaks table for tracking daily login streaks
CREATE TABLE IF NOT EXISTS public.user_streaks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  current_streak INTEGER NOT NULL DEFAULT 0,
  longest_streak INTEGER NOT NULL DEFAULT 0,
  last_login_date DATE,
  total_logins INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on user_streaks
ALTER TABLE public.user_streaks ENABLE ROW LEVEL SECURITY;

-- RLS policies for user_streaks
CREATE POLICY "Users can view their own streak" 
ON public.user_streaks 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own streak" 
ON public.user_streaks 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own streak" 
ON public.user_streaks 
FOR UPDATE 
USING (auth.uid() = user_id);

-- Create function to update streak on login
CREATE OR REPLACE FUNCTION public.update_user_streak(p_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_streak RECORD;
  v_today DATE := CURRENT_DATE;
  v_yesterday DATE := CURRENT_DATE - INTERVAL '1 day';
  v_new_streak INTEGER;
  v_is_new_day BOOLEAN := false;
BEGIN
  -- Get or create streak record
  SELECT * INTO v_streak FROM user_streaks WHERE user_id = p_user_id;
  
  IF v_streak IS NULL THEN
    -- First login ever
    INSERT INTO user_streaks (user_id, current_streak, longest_streak, last_login_date, total_logins)
    VALUES (p_user_id, 1, 1, v_today, 1)
    RETURNING * INTO v_streak;
    
    RETURN jsonb_build_object(
      'current_streak', 1,
      'longest_streak', 1,
      'total_logins', 1,
      'is_new_day', true,
      'streak_increased', true
    );
  END IF;
  
  -- Check if already logged in today
  IF v_streak.last_login_date = v_today THEN
    RETURN jsonb_build_object(
      'current_streak', v_streak.current_streak,
      'longest_streak', v_streak.longest_streak,
      'total_logins', v_streak.total_logins,
      'is_new_day', false,
      'streak_increased', false
    );
  END IF;
  
  v_is_new_day := true;
  
  -- Check if consecutive day
  IF v_streak.last_login_date = v_yesterday THEN
    v_new_streak := v_streak.current_streak + 1;
  ELSE
    -- Streak broken, start fresh
    v_new_streak := 1;
  END IF;
  
  -- Update streak record
  UPDATE user_streaks
  SET 
    current_streak = v_new_streak,
    longest_streak = GREATEST(longest_streak, v_new_streak),
    last_login_date = v_today,
    total_logins = total_logins + 1,
    updated_at = now()
  WHERE user_id = p_user_id
  RETURNING * INTO v_streak;
  
  RETURN jsonb_build_object(
    'current_streak', v_streak.current_streak,
    'longest_streak', v_streak.longest_streak,
    'total_logins', v_streak.total_logins,
    'is_new_day', v_is_new_day,
    'streak_increased', v_new_streak > 1 OR (v_new_streak = 1 AND v_is_new_day)
  );
END;
$$;

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_user_streaks_updated_at
BEFORE UPDATE ON public.user_streaks
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();