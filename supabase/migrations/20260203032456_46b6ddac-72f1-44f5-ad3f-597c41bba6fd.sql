-- =============================================
-- FIX: support_tickets RLS - Ensure proper isolation
-- =============================================

-- Drop existing SELECT policies to recreate them properly
DROP POLICY IF EXISTS "Ticket creators can view their own tickets" ON public.support_tickets;
DROP POLICY IF EXISTS "Admins can view all support tickets" ON public.support_tickets;

-- Create strict SELECT policies
-- Users can ONLY view their own tickets (based on user_id)
CREATE POLICY "Users can view own tickets only"
ON public.support_tickets
AS PERMISSIVE
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Admins can view all tickets
CREATE POLICY "Admins can view all tickets"
ON public.support_tickets
AS PERMISSIVE
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Add restrictive policy to block anonymous access entirely
DROP POLICY IF EXISTS "Block anonymous access to support_tickets" ON public.support_tickets;
CREATE POLICY "Block anonymous access to support_tickets"
ON public.support_tickets
AS RESTRICTIVE
FOR ALL
TO anon
USING (false)
WITH CHECK (false);