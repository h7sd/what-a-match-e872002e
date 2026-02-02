-- Add CHECK constraints for data integrity (allowing 0 for promo codes)
ALTER TABLE public.purchases
ADD CONSTRAINT purchases_amount_non_negative CHECK (amount >= 0),
ADD CONSTRAINT purchases_email_format CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'),
ADD CONSTRAINT purchases_order_id_not_empty CHECK (length(trim(order_id)) > 0),
ADD CONSTRAINT purchases_username_not_empty CHECK (length(trim(username)) > 0),
ADD CONSTRAINT purchases_currency_valid CHECK (currency IN ('USD', 'EUR', 'GBP')),
ADD CONSTRAINT purchases_status_valid CHECK (status IN ('completed', 'pending', 'refunded', 'failed'));

-- Create validation trigger to prevent duplicate orders and validate data
CREATE OR REPLACE FUNCTION public.validate_purchase_insert()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Check for duplicate order_id (prevent replay attacks)
  IF EXISTS (
    SELECT 1 FROM public.purchases 
    WHERE order_id = NEW.order_id
  ) THEN
    RAISE EXCEPTION 'Duplicate order_id detected: %', NEW.order_id;
  END IF;
  
  -- Validate user exists in profiles
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = NEW.user_id
  ) THEN
    RAISE EXCEPTION 'Invalid user_id: user does not exist';
  END IF;
  
  -- Validate username matches user's profile
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = NEW.user_id 
    AND username = NEW.username
  ) THEN
    RAISE EXCEPTION 'Username does not match user profile';
  END IF;
  
  -- For non-promo purchases, ensure amount is positive
  IF NOT (NEW.order_id LIKE 'PROMO-%') AND NEW.amount <= 0 THEN
    RAISE EXCEPTION 'Non-promo purchases must have positive amount';
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create the trigger
DROP TRIGGER IF EXISTS validate_purchase_before_insert ON public.purchases;
CREATE TRIGGER validate_purchase_before_insert
  BEFORE INSERT ON public.purchases
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_purchase_insert();

-- Add unique constraint for order_id to prevent duplicates at DB level
ALTER TABLE public.purchases
ADD CONSTRAINT purchases_order_id_unique UNIQUE (order_id);