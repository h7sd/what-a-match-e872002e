-- Create purchases table to track all premium purchases
CREATE TABLE public.purchases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  username TEXT NOT NULL,
  email TEXT NOT NULL,
  order_id TEXT NOT NULL UNIQUE,
  amount DECIMAL(10,2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'EUR',
  payment_method TEXT NOT NULL DEFAULT 'PayPal',
  invoice_number TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'completed',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.purchases ENABLE ROW LEVEL SECURITY;

-- Only admins can view purchases
CREATE POLICY "Admins can view all purchases"
ON public.purchases
FOR SELECT
USING (has_role(auth.uid(), 'admin'));

-- Only service role can insert (from edge function)
CREATE POLICY "Service role can insert purchases"
ON public.purchases
FOR INSERT
WITH CHECK (true);

-- Create index for faster queries
CREATE INDEX idx_purchases_created_at ON public.purchases(created_at DESC);
CREATE INDEX idx_purchases_user_id ON public.purchases(user_id);