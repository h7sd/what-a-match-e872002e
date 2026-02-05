-- Increase UC numeric ranges (avoid int overflow)

-- 1) Widen balance + transaction amounts to numeric (integer values)
ALTER TABLE public.user_balances
  ALTER COLUMN balance TYPE numeric USING balance::numeric,
  ALTER COLUMN total_earned TYPE numeric USING total_earned::numeric,
  ALTER COLUMN total_spent TYPE numeric USING total_spent::numeric;

ALTER TABLE public.uv_transactions
  ALTER COLUMN amount TYPE numeric USING amount::numeric;

ALTER TABLE public.minigame_stats
  ALTER COLUMN total_earned TYPE numeric USING total_earned::numeric,
  ALTER COLUMN total_lost TYPE numeric USING total_lost::numeric;

-- 2) Update admin_give_coins to accept large integer amounts safely (as text -> numeric)
CREATE OR REPLACE FUNCTION public.admin_give_coins(
  p_user_id UUID,
  p_amount_text TEXT,
  p_reason TEXT DEFAULT 'Admin bonus'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_admin_id UUID;
  v_amount numeric;
  v_new_balance numeric;
  v_username TEXT;
BEGIN
  v_admin_id := auth.uid();

  -- Check if caller is admin
  IF NOT public.has_role(v_admin_id, 'admin') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authorized');
  END IF;

  -- Parse amount
  BEGIN
    v_amount := trim(p_amount_text)::numeric;
  EXCEPTION WHEN others THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid amount');
  END;

  -- Enforce integer currency
  IF v_amount <> trunc(v_amount) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Amount must be a whole number');
  END IF;

  -- Validate amount
  IF v_amount = 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Amount cannot be zero');
  END IF;

  -- Get username for logging
  SELECT username INTO v_username FROM public.profiles WHERE user_id = p_user_id;
  IF v_username IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'User not found');
  END IF;

  -- Upsert user balance
  INSERT INTO public.user_balances (user_id, balance, total_earned)
  VALUES (
    p_user_id,
    GREATEST(v_amount, 0),
    CASE WHEN v_amount > 0 THEN v_amount ELSE 0 END
  )
  ON CONFLICT (user_id) DO UPDATE SET
    balance = GREATEST(user_balances.balance + v_amount, 0),
    total_earned = CASE
      WHEN v_amount > 0 THEN user_balances.total_earned + v_amount
      ELSE user_balances.total_earned
    END,
    updated_at = now();

  -- Get new balance
  SELECT balance INTO v_new_balance FROM public.user_balances WHERE user_id = p_user_id;

  -- Log the transaction
  INSERT INTO public.uv_transactions (user_id, amount, transaction_type, description)
  VALUES (
    p_user_id,
    v_amount,
    CASE WHEN v_amount > 0 THEN 'earn' ELSE 'spend' END,
    COALESCE(p_reason, 'Admin bonus')
  );

  RETURN jsonb_build_object(
    'success', true,
    'message', 'Coins updated successfully',
    'new_balance', v_new_balance::text,
    'amount', v_amount::text
  );
END;
$$;

-- 3) Update marketplace purchase function to use numeric balances
CREATE OR REPLACE FUNCTION public.purchase_marketplace_item(p_item_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_item RECORD;
  v_buyer_balance numeric;
  v_buyer_id UUID;
  v_badge_id UUID;
BEGIN
  v_buyer_id := auth.uid();

  IF v_buyer_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authenticated');
  END IF;

  -- Lock and get item
  SELECT * INTO v_item FROM public.marketplace_items WHERE id = p_item_id FOR UPDATE;

  IF v_item IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Item not found');
  END IF;

  IF v_item.status != 'approved' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Item is not available');
  END IF;

  IF v_item.seller_id = v_buyer_id THEN
    RETURN jsonb_build_object('success', false, 'error', 'Cannot buy your own item');
  END IF;

  -- Check stock for limited items
  IF v_item.sale_type = 'limited' AND v_item.stock_sold >= v_item.stock_limit THEN
    RETURN jsonb_build_object('success', false, 'error', 'Item is sold out');
  END IF;

  -- Check if single item already sold
  IF v_item.sale_type = 'single' AND v_item.stock_sold > 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Item already sold');
  END IF;

  -- Check already purchased (for unlimited/limited)
  IF EXISTS (SELECT 1 FROM public.marketplace_purchases WHERE item_id = p_item_id AND buyer_id = v_buyer_id) THEN
    RETURN jsonb_build_object('success', false, 'error', 'You already own this item');
  END IF;

  -- Get buyer balance
  SELECT balance INTO v_buyer_balance FROM public.user_balances WHERE user_id = v_buyer_id FOR UPDATE;

  IF v_buyer_balance IS NULL OR v_buyer_balance < (v_item.price::numeric) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Insufficient UC balance');
  END IF;

  -- Deduct from buyer
  UPDATE public.user_balances
  SET balance = balance - (v_item.price::numeric),
      total_spent = total_spent + (v_item.price::numeric),
      updated_at = now()
  WHERE user_id = v_buyer_id;

  -- Add to seller (upsert)
  INSERT INTO public.user_balances (user_id, balance, total_earned)
  VALUES (v_item.seller_id, (v_item.price::numeric), (v_item.price::numeric))
  ON CONFLICT (user_id) DO UPDATE SET
    balance = user_balances.balance + (v_item.price::numeric),
    total_earned = user_balances.total_earned + (v_item.price::numeric),
    updated_at = now();

  -- Log transactions
  INSERT INTO public.uv_transactions (user_id, amount, transaction_type, description, reference_id, reference_type)
  VALUES
    (v_buyer_id, -(v_item.price::numeric), 'spend', 'Purchased: ' || COALESCE(v_item.badge_name, v_item.template_name), p_item_id, 'marketplace_purchase'),
    (v_item.seller_id, (v_item.price::numeric), 'earn', 'Sold: ' || COALESCE(v_item.badge_name, v_item.template_name), p_item_id, 'marketplace_sale');

  -- Create purchase record
  INSERT INTO public.marketplace_purchases (buyer_id, item_id, seller_id, price)
  VALUES (v_buyer_id, p_item_id, v_item.seller_id, v_item.price);

  -- Update stock
  UPDATE public.marketplace_items
  SET stock_sold = stock_sold + 1,
      status = CASE
        WHEN sale_type = 'single' THEN 'sold_out'
        WHEN sale_type = 'limited' AND stock_sold + 1 >= stock_limit THEN 'sold_out'
        ELSE status
      END,
      updated_at = now()
  WHERE id = p_item_id;

  -- Handle badge purchases
  IF v_item.item_type = 'badge' THEN
    -- Set the bypass context to allow the trigger to pass
    PERFORM set_config('app.badge_claim_context', 'marketplace_purchase', true);

    -- Check if a matching global badge already exists
    SELECT id INTO v_badge_id FROM public.global_badges
    WHERE name = v_item.badge_name
      AND (created_by = v_item.seller_id OR icon_url = v_item.badge_icon_url)
    LIMIT 1;

    -- If no matching badge, create a new one
    IF v_badge_id IS NULL THEN
      INSERT INTO public.global_badges (name, description, icon_url, color, created_by, rarity)
      VALUES (v_item.badge_name, v_item.badge_description, v_item.badge_icon_url, v_item.badge_color, v_item.seller_id, 'marketplace')
      RETURNING id INTO v_badge_id;
    END IF;

    -- Assign to buyer (only if they don't already have it)
    INSERT INTO public.user_badges (user_id, badge_id, is_enabled)
    VALUES (v_buyer_id, v_badge_id, true)
    ON CONFLICT (user_id, badge_id) DO NOTHING;

    -- For single (unique) sale, remove from seller
    IF v_item.sale_type = 'single' THEN
      DELETE FROM public.user_badges
      WHERE user_id = v_item.seller_id
        AND badge_id = v_badge_id;
    END IF;

    -- Reset the context
    PERFORM set_config('app.badge_claim_context', '', true);
  END IF;

  RETURN jsonb_build_object('success', true, 'message', 'Purchase successful!');
END;
$$;