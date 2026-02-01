-- Add claimed_by column to support_tickets
ALTER TABLE public.support_tickets 
ADD COLUMN claimed_by UUID REFERENCES auth.users(id),
ADD COLUMN claimed_at TIMESTAMP WITH TIME ZONE;