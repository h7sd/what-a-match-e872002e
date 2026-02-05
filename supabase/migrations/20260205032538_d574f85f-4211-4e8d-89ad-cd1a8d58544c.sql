-- Add admin policies for user_balances table
CREATE POLICY "Admins can view all balances"
ON public.user_balances FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update all balances"
ON public.user_balances FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert balances for anyone"
ON public.user_balances FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Add admin policies for uv_transactions to log admin-given coins
CREATE POLICY "Admins can view all transactions"
ON public.uv_transactions FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert transactions"
ON public.uv_transactions FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Create a secure function for admins to give coins
CREATE OR REPLACE FUNCTION public.admin_give_coins(p_user_id UUID, p_amount INTEGER, p_reason TEXT DEFAULT 'Admin bonus')
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_admin_id UUID;
  v_new_balance INTEGER;
  v_username TEXT;
BEGIN
  v_admin_id := auth.uid();
  
  -- Check if caller is admin
  IF NOT public.has_role(v_admin_id, 'admin') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authorized');
  END IF;
  
  -- Validate amount
  IF p_amount = 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Amount cannot be zero');
  END IF;
  
  -- Get username for logging
  SELECT username INTO v_username FROM public.profiles WHERE user_id = p_user_id;
  
  IF v_username IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'User not found');
  END IF;
  
  -- Upsert user balance
  INSERT INTO public.user_balances (user_id, balance, total_earned)
  VALUES (p_user_id, GREATEST(p_amount, 0), CASE WHEN p_amount > 0 THEN p_amount ELSE 0 END)
  ON CONFLICT (user_id) DO UPDATE SET
    balance = GREATEST(user_balances.balance + p_amount, 0),
    total_earned = CASE 
      WHEN p_amount > 0 THEN user_balances.total_earned + p_amount 
      ELSE user_balances.total_earned 
    END,
    updated_at = now();
  
  -- Get new balance
  SELECT balance INTO v_new_balance FROM public.user_balances WHERE user_id = p_user_id;
  
  -- Log the transaction
  INSERT INTO public.uv_transactions (user_id, amount, transaction_type, description)
  VALUES (
    p_user_id, 
    p_amount, 
    CASE WHEN p_amount > 0 THEN 'earn' ELSE 'spend' END,
    COALESCE(p_reason, 'Admin bonus')
  );
  
  RETURN jsonb_build_object(
    'success', true, 
    'message', 'Coins updated successfully',
    'new_balance', v_new_balance,
    'amount', p_amount
  );
END;
$$;