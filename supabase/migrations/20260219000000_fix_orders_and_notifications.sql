-- 1. FIX ORDER DELETION: Add DELETE policies for orders and order_items
-- Allow authenticated users (staff/admins) to delete orders
CREATE POLICY "Authenticated users can delete orders" 
ON public.orders 
FOR DELETE 
USING (auth.role() = 'authenticated');

-- Allow authenticated users to delete order items (CASCADE usually handles this, but good for direct deletion)
CREATE POLICY "Authenticated users can delete order items" 
ON public.order_items 
FOR DELETE 
USING (auth.role() = 'authenticated');


-- 2. FIX NOTIFICATIONS: Ensure schema and permissions for tokens and attendance
-- Ensure is_clocked_in column exists in profiles (idempotent)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'is_clocked_in') THEN
        ALTER TABLE public.profiles ADD COLUMN is_clocked_in BOOLEAN DEFAULT false;
    END IF;
END $$;

-- Create user_fcm_tokens table if it doesn't exist (it seemed to be referenced but I didn't see a migration for it)
CREATE TABLE IF NOT EXISTS public.user_fcm_tokens (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    token TEXT NOT NULL,
    device_name TEXT,
    last_updated TIMESTAMP WITH TIME ZONE DEFAULT now(),
    UNIQUE(user_id, token)
);

-- Enable RLS for user_fcm_tokens
ALTER TABLE public.user_fcm_tokens ENABLE ROW LEVEL SECURITY;

-- Add RLS policies for user_fcm_tokens
-- Users can view their own tokens
DROP POLICY IF EXISTS "Users can view own tokens" ON public.user_fcm_tokens;
CREATE POLICY "Users can view own tokens" 
ON public.user_fcm_tokens FOR SELECT 
USING (auth.uid() = user_id);

-- Users can insert/update their own token
DROP POLICY IF EXISTS "Users can insert own tokens" ON public.user_fcm_tokens;
CREATE POLICY "Users can insert own tokens" 
ON public.user_fcm_tokens FOR INSERT 
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own tokens" ON public.user_fcm_tokens;
CREATE POLICY "Users can update own tokens" 
ON public.user_fcm_tokens FOR UPDATE 
USING (auth.uid() = user_id);

-- Users can delete their own tokens
DROP POLICY IF EXISTS "Users can delete own tokens" ON public.user_fcm_tokens;
CREATE POLICY "Users can delete own tokens" 
ON public.user_fcm_tokens FOR DELETE 
USING (auth.uid() = user_id);

-- Admins can view all tokens (needed for sending notifications)
DROP POLICY IF EXISTS "Admins can view all tokens" ON public.user_fcm_tokens;
CREATE POLICY "Admins can view all tokens" 
ON public.user_fcm_tokens FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.user_id = auth.uid() 
    AND profiles.role = 'admin'
  )
);
