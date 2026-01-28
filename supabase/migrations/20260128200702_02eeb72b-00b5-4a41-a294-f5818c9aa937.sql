-- Add alias_username column to profiles table
ALTER TABLE public.profiles 
ADD COLUMN alias_username text UNIQUE;

-- Add check constraint for alias username format (same rules as username)
ALTER TABLE public.profiles 
ADD CONSTRAINT alias_username_format CHECK (
  alias_username IS NULL OR 
  (char_length(alias_username) >= 1 AND char_length(alias_username) <= 20 AND alias_username ~ '^[a-zA-Z0-9_]+$')
);

-- Create index for faster alias lookups
CREATE INDEX idx_profiles_alias_username ON public.profiles(alias_username) WHERE alias_username IS NOT NULL;