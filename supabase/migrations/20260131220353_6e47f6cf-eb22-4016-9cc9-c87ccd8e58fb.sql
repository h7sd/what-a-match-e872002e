-- Add premium status columns to profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS is_premium boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS premium_purchased_at timestamp with time zone DEFAULT NULL,
ADD COLUMN IF NOT EXISTS paypal_order_id text DEFAULT NULL;

-- Create index for premium users
CREATE INDEX IF NOT EXISTS idx_profiles_is_premium ON public.profiles(is_premium) WHERE is_premium = true;