-- Remove the policy that allows public read access to products
DROP POLICY IF EXISTS "Enable read access for all users" ON public.products;

-- Ensure only authenticated users can view products (this policy should already exist)
-- But let's make sure it's properly defined
DROP POLICY IF EXISTS "Authenticated users can view products" ON public.products;
CREATE POLICY "Authenticated users can view products" 
ON public.products 
FOR SELECT 
TO authenticated
USING (auth.role() = 'authenticated'::text);