-- ============================================================
-- FIX: purchases table - restrict SELECT to owner + admins only
-- ============================================================

-- Drop existing SELECT policies on purchases
DROP POLICY IF EXISTS "Admins can view all purchases" ON public.purchases;
DROP POLICY IF EXISTS "Users can view own purchases" ON public.purchases;
DROP POLICY IF EXISTS "Deny anonymous access to purchases" ON public.purchases;

-- Create proper PERMISSIVE policies (OR logic: either condition grants access)
CREATE POLICY "Owners can view their own purchases"
ON public.purchases
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all purchases"
ON public.purchases
FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

-- Block all anonymous access (no auth.uid())
CREATE POLICY "Block anonymous access to purchases"
ON public.purchases
FOR ALL
USING (auth.uid() IS NOT NULL)
WITH CHECK (auth.uid() IS NOT NULL);

-- ============================================================
-- FIX: support_tickets table - restrict SELECT to owner + admins
-- ============================================================

-- Drop existing SELECT policies on support_tickets
DROP POLICY IF EXISTS "Admins can view all support tickets" ON public.support_tickets;
DROP POLICY IF EXISTS "Admins can update support tickets" ON public.support_tickets;

-- Create proper PERMISSIVE policies
CREATE POLICY "Ticket creators can view their own tickets"
ON public.support_tickets
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all support tickets"
ON public.support_tickets
FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update support tickets"
ON public.support_tickets
FOR UPDATE
USING (public.has_role(auth.uid(), 'admin'));