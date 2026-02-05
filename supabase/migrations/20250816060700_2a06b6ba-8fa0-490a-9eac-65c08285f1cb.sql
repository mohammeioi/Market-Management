-- تعديل سياسات جدول orders للسماح للمستخدمين غير المصادقين بالوصول
DROP POLICY IF EXISTS "Enable read access for all users" ON public.orders;
DROP POLICY IF EXISTS "Anyone can create orders" ON public.orders;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON public.orders;

-- سياسات جديدة لجدول orders تسمح للجميع بالقراءة والإنشاء
CREATE POLICY "Enable read access for all users" ON public.orders
FOR SELECT USING (true);

CREATE POLICY "Enable insert for all users" ON public.orders
FOR INSERT WITH CHECK (true);

-- تعديل سياسات جدول order_items للسماح للمستخدمين غير المصادقين
DROP POLICY IF EXISTS "Users can view order items for orders they can see" ON public.order_items;
DROP POLICY IF EXISTS "Anyone can create order items" ON public.order_items;

-- سياسات جديدة لجدول order_items تسمح للجميع بالقراءة والإنشاء
CREATE POLICY "Enable read access for all users" ON public.order_items
FOR SELECT USING (true);

CREATE POLICY "Enable insert for all users" ON public.order_items
FOR INSERT WITH CHECK (true);