-- Add is_profit_deleted column to orders table to allow clearing profit history without deleting actual orders
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS is_profit_deleted BOOLEAN DEFAULT false;

-- Update existing rows explicitly (optional, since default is false, but good for clarity)
UPDATE public.orders SET is_profit_deleted = false WHERE is_profit_deleted IS NULL;
