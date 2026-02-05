-- Update products table RLS policies to restrict access to authenticated users only
DROP POLICY IF EXISTS "Products are viewable by everyone" ON public.products;
DROP POLICY IF EXISTS "Products are editable by everyone" ON public.products;

-- Create new restricted policies for products
CREATE POLICY "Authenticated users can view products" ON public.products 
FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can create products" ON public.products 
FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update products" ON public.products 
FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can delete products" ON public.products 
FOR DELETE USING (auth.role() = 'authenticated');

-- Update categories table RLS policies to restrict access to authenticated users only
DROP POLICY IF EXISTS "Categories are viewable by everyone" ON public.categories;
DROP POLICY IF EXISTS "Categories are editable by everyone" ON public.categories;

-- Create new restricted policies for categories
CREATE POLICY "Authenticated users can view categories" ON public.categories 
FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can create categories" ON public.categories 
FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update categories" ON public.categories 
FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can delete categories" ON public.categories 
FOR DELETE USING (auth.role() = 'authenticated');