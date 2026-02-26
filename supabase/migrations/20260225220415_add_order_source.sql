-- Add source column to track where the order was placed from
ALTER TABLE public.orders 
ADD COLUMN source text DEFAULT 'web';
