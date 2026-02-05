-- Drop and recreate the function with improved badge handling and template support
CREATE OR REPLACE FUNCTION public.purchase_marketplace_item(p_item_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_item RECORD;
  v_buyer_balance INTEGER;
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
  
  IF v_buyer_balance IS NULL OR v_buyer_balance < v_item.price THEN
    RETURN jsonb_build_object('success', false, 'error', 'Insufficient UC balance');
  END IF;
  
  -- Deduct from buyer
  UPDATE public.user_balances 
  SET balance = balance - v_item.price, 
      total_spent = total_spent + v_item.price,
      updated_at = now()
  WHERE user_id = v_buyer_id;
  
  -- Add to seller (upsert)
  INSERT INTO public.user_balances (user_id, balance, total_earned)
  VALUES (v_item.seller_id, v_item.price, v_item.price)
  ON CONFLICT (user_id) DO UPDATE SET 
    balance = user_balances.balance + v_item.price,
    total_earned = user_balances.total_earned + v_item.price,
    updated_at = now();
  
  -- Log transactions
  INSERT INTO public.uv_transactions (user_id, amount, transaction_type, description, reference_id, reference_type)
  VALUES 
    (v_buyer_id, -v_item.price, 'spend', 'Purchased: ' || COALESCE(v_item.badge_name, v_item.template_name), p_item_id, 'marketplace_purchase'),
    (v_item.seller_id, v_item.price, 'earn', 'Sold: ' || COALESCE(v_item.badge_name, v_item.template_name), p_item_id, 'marketplace_sale');
  
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
  END IF;
  
  -- Handle template purchases - template_data is stored in the item and can be applied by buyer
  -- The template data is already in marketplace_items.template_data, buyer just needs to read it
  
  RETURN jsonb_build_object('success', true, 'message', 'Purchase successful!');
END;
$$;