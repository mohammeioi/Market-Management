import { create } from 'zustand';
import { supabase } from '@/integrations/supabase/client';
import { Product, CartItem, Category } from '@/types/pos';

interface CacheItem {
  data: Product[];
  timestamp: number;
}

interface ProductStore {
  products: Product[];
  categories: Category[];
  cart: CartItem[];
  loading: boolean;
  error: string | null;
  hasMore: boolean; // For pagination

  // Product actions
  fetchProducts: () => Promise<void>; // Deprecated
  searchProducts: (query: string) => Promise<void>;
  fetchProductsByCategory: (categoryId: string | null, page?: number) => Promise<void>;
  fetchCategories: (forceRefresh?: boolean) => Promise<void>;

  addProduct: (product: Omit<Product, 'id'>) => Promise<void>;
  addProductsBatch: (products: Array<Omit<Product, 'id'>>) => Promise<{ success: number; failed: number }>;
  updateProduct: (id: string, product: Partial<Product>) => Promise<void>;
  deleteProduct: (id: string) => Promise<void>;
  toggleProductAvailability: (id: string) => Promise<void>;

  // Cart actions
  addToCart: (product: Product) => void;
  updateCartQuantity: (productId: string, quantity: number) => void;
  removeFromCart: (productId: string) => void;
  clearCart: () => void;
  getCartTotal: () => number;

  // Sales actions
  processSale: (user_id: string) => Promise<void>;
}

// Simple in-memory cache
const CACHE_DURATION = 60 * 1000; // 60 seconds
const requestCache = new Map<string, CacheItem>();

export const useSupabaseProductStore = create<ProductStore>(
  (set, get) => ({
    products: [],
    categories: [],
    cart: [],
    loading: false,
    error: null,
    hasMore: true,

    fetchCategories: async (forceRefresh = false) => {
      // Cache categories unless force refresh
      if (!forceRefresh && get().categories.length > 0) return;

      try {
        const { data, error } = await supabase
          .from('categories')
          .select('*')
          .order('name');

        if (error) throw error;

        const categories: Category[] = data?.map(cat => ({
          id: cat.id,
          name: cat.name,
          icon: '📦'
        })) || [];

        set({ categories });
      } catch (error) {
        console.error('Error fetching categories:', error);
      }
    },

    searchProducts: async (query: string) => {
      set({ loading: true, error: null, hasMore: false }); // Search doesn't support pagination here yet
      try {
        if (!query.trim()) {
          // If search cleared, revert to initial state (all products page 0)
          await get().fetchProductsByCategory(null, 0);
          return;
        }

        let supabaseQuery = supabase
          .from('products')
          .select('id, name, price, stock, image, barcode, is_available, categories(name)')
          .order('created_at', { ascending: false })
          .limit(20);

        const isBarcode = /^\d+$/.test(query) && query.length > 3;

        if (isBarcode) {
          supabaseQuery = supabaseQuery.eq('barcode', query);
        } else {
          supabaseQuery = supabaseQuery.ilike('name', `%${query}%`);
        }

        const { data, error } = await supabaseQuery;

        if (error) throw error;

        const formattedProducts: Product[] = (data as any)?.map((product: any) => ({
          id: product.id,
          name: product.name,
          price: product.price,
          category: product.categories?.name || 'غير محدد',
          stock: product.stock,
          image: product.image || '/placeholder.svg',
          barcode: product.barcode,
          isAvailable: product.is_available !== false
        })) || [];

        set({ products: formattedProducts, loading: false });

      } catch (error: any) {
        console.error('Error searching products:', error);
        set({ error: 'فشل في البحث عن المنتجات', loading: false });
      }
    },

    fetchProductsByCategory: async (categoryId: string | null, page = 0) => {
      const cacheKey = `products_${categoryId || 'all'}_page_${page}`;
      const cached = requestCache.get(cacheKey);

      if (cached && (Date.now() - cached.timestamp < CACHE_DURATION)) {
        // Apply cache
        const cachedProducts = cached.data;
        set(state => ({
          products: page === 0 ? cachedProducts : [...state.products, ...cachedProducts],
          loading: false,
          hasMore: cachedProducts.length === 20
        }));
        return;
      }

      set({ loading: true, error: null });
      try {
        const from = page * 20;
        const to = from + 19;

        let query = supabase
          .from('products')
          .select('id, name, price, stock, image, barcode, is_available, categories(name)')
          .order('created_at', { ascending: false })
          .range(from, to);

        if (categoryId) {
          query = query.eq('category_id', categoryId);
        }

        const { data, error } = await query;

        if (error) throw error;

        const formattedProducts: Product[] = (data as any)?.map((product: any) => ({
          id: product.id,
          name: product.name,
          price: product.price,
          category: product.categories?.name || 'غير محدد',
          stock: product.stock,
          image: product.image || '/placeholder.svg',
          barcode: product.barcode,
          isAvailable: product.is_available !== false
        })) || [];

        // Update cache
        requestCache.set(cacheKey, {
          data: formattedProducts,
          timestamp: Date.now()
        });

        set(state => ({
          products: page === 0 ? formattedProducts : [...state.products, ...formattedProducts],
          loading: false,
          hasMore: formattedProducts.length === 20
        }));

      } catch (error) {
        console.error('Error fetching products by category:', error);
        set({ error: 'فشل في تحميل المنتجات', loading: false });
      }
    },

    fetchProducts: async () => {
      await get().fetchProductsByCategory(null);
    },

    addProduct: async (productData) => {
      set({ loading: true, error: null });
      try {
        let categoryId: string;
        const { data: existingCategory } = await supabase
          .from('categories')
          .select('id')
          .eq('name', productData.category)
          .single();

        if (existingCategory) {
          categoryId = existingCategory.id;
        } else {
          const { data: newCategory, error: categoryError } = await supabase
            .from('categories')
            .insert({ name: productData.category })
            .select('id')
            .single();

          if (categoryError) throw categoryError;
          categoryId = newCategory.id;
        }

        const { data, error } = await supabase
          .from('products')
          .insert({
            name: productData.name,
            price: productData.price,
            category_id: categoryId,
            stock: productData.stock,
            image: productData.image,
            barcode: productData.barcode
          })
          .select(`*, categories(name)`)
          .single();

        if (error) throw error;

        // Invalidate cache since we added a product
        requestCache.clear();

        // Force-refresh categories so new ones appear in dropdown
        await get().fetchCategories(true);

        const newProduct: Product = {
          id: data.id,
          name: data.name,
          price: data.price,
          category: data.categories?.name || 'غير محدد',
          stock: data.stock,
          image: data.image || '/placeholder.svg',
          barcode: data.barcode
        };

        set(state => ({
          products: [newProduct, ...state.products],
          loading: false
        }));
      } catch (error) {
        console.error('Error adding product:', error);
        set({ error: 'فشل في إضافة المنتج', loading: false });
      }
    },

    addProductsBatch: async (productsData) => {
      set({ loading: true, error: null });
      let success = 0;
      let failed = 0;

      try {
        // First, collect all unique category names
        const categoryNames = [...new Set(productsData.map(p => p.category || 'غير محدد'))];

        // Get or create all categories
        const categoryMap: Record<string, string> = {};

        for (const categoryName of categoryNames) {
          const { data: existingCategory } = await supabase
            .from('categories')
            .select('id')
            .eq('name', categoryName)
            .single();

          if (existingCategory) {
            categoryMap[categoryName] = existingCategory.id;
          } else {
            const { data: newCategory, error: categoryError } = await supabase
              .from('categories')
              .insert({ name: categoryName })
              .select('id')
              .single();

            if (!categoryError && newCategory) {
              categoryMap[categoryName] = newCategory.id;
            }
          }
        }

        // Add products one by one to handle errors gracefully
        for (const productData of productsData) {
          try {
            const categoryId = categoryMap[productData.category || 'غير محدد'];

            if (!categoryId) {
              failed++;
              continue;
            }

            const { error } = await supabase
              .from('products')
              .insert({
                name: productData.name,
                price: productData.price,
                category_id: categoryId,
                stock: productData.stock || 0,
                image: productData.image || '/placeholder.svg',
                barcode: productData.barcode
              });

            if (error) {
              console.error('Error adding product:', productData.name, error);
              failed++;
            } else {
              success++;
            }
          } catch (err) {
            console.error('Error adding product:', productData.name, err);
            failed++;
          }
        }

        // Invalidate cache since we added products
        requestCache.clear();

        // Force-refresh categories so new ones appear in dropdown
        await get().fetchCategories(true);

        // Refresh products list
        await get().fetchProductsByCategory(null, 0);

        set({ loading: false });
        return { success, failed };
      } catch (error) {
        console.error('Error in batch product import:', error);
        set({ error: 'فشل في استيراد المنتجات', loading: false });
        return { success, failed };
      }
    },
    updateProduct: async (id, productData) => {
      set({ loading: true, error: null });
      try {
        let updateData: any = { ...productData };
        if (productData.category) {
          const { data: existingCategory } = await supabase
            .from('categories')
            .select('id')
            .eq('name', productData.category)
            .single();

          if (existingCategory) {
            updateData.category_id = existingCategory.id;
          } else {
            const { data: newCategory, error: categoryError } = await supabase
              .from('categories')
              .insert({ name: productData.category })
              .select('id')
              .single();

            if (categoryError) throw categoryError;
            updateData.category_id = newCategory.id;
          }
          delete updateData.category;
        }

        const { error } = await supabase
          .from('products')
          .update(updateData)
          .eq('id', id);

        if (error) throw error;

        // Invalidate cache
        requestCache.clear();

        // Force-refresh categories so new ones appear in dropdown
        await get().fetchCategories(true);

        set(state => ({
          products: state.products.map(product =>
            product.id === id ? { ...product, ...productData } : product
          ),
          loading: false
        }));
      } catch (error) {
        console.error('Error updating product:', error);
        set({ error: 'فشل في تحديث المنتج', loading: false });
      }
    },

    deleteProduct: async (id) => {
      set({ loading: true, error: null });
      try {
        // Try real DELETE first
        const { error: deleteError } = await supabase
          .from('products')
          .delete()
          .eq('id', id);

        if (deleteError) {
          console.warn('Real delete failed, trying soft delete:', deleteError.message);
          // Fall back to soft delete if FK constraint prevents real delete
          const { error: softDeleteError } = await supabase
            .from('products')
            .update({ is_deleted: true })
            .eq('id', id);

          if (softDeleteError) throw softDeleteError;
        }

        // Invalidate cache
        requestCache.clear();

        set(state => ({
          products: state.products.filter(product => product.id !== id),
          loading: false
        }));
      } catch (error) {
        console.error('Error deleting product:', error);
        set({ error: 'فشل في حذف المنتج', loading: false });
      }
    },

    toggleProductAvailability: async (id) => {
      set({ loading: true, error: null });
      try {
        // First, get the current availability status
        const currentProduct = get().products.find(p => p.id === id);
        const currentAvailability = currentProduct?.isAvailable !== false; // Default to true if undefined
        const newAvailability = !currentAvailability;

        const { error } = await supabase
          .from('products')
          .update({ is_available: newAvailability })
          .eq('id', id);

        if (error) throw error;

        // Invalidate cache
        requestCache.clear();

        // Update local state
        set(state => ({
          products: state.products.map(product =>
            product.id === id ? { ...product, isAvailable: newAvailability } : product
          ),
          loading: false
        }));
      } catch (error) {
        console.error('Error toggling product availability:', error);
        set({ error: 'فشل في تغيير حالة توفر المنتج', loading: false });
      }
    },

    addToCart: (product) => set((state) => {
      const existingItem = state.cart.find(item => item.product.id === product.id);
      if (existingItem) {
        return {
          cart: state.cart.map(item =>
            item.product.id === product.id
              ? { ...item, quantity: item.quantity + 1 }
              : item
          )
        };
      }
      return {
        cart: [...state.cart, { product, quantity: 1 }]
      };
    }),

    updateCartQuantity: (productId, quantity) => set((state) => ({
      cart: quantity > 0
        ? state.cart.map(item =>
          item.product.id === productId
            ? { ...item, quantity }
            : item
        )
        : state.cart.filter(item => item.product.id !== productId)
    })),

    removeFromCart: (productId) => set((state) => ({
      cart: state.cart.filter(item => item.product.id !== productId)
    })),

    clearCart: () => set({ cart: [] }),

    getCartTotal: () => {
      const { cart } = get();
      return cart.reduce((total, item) => total + (item.product.price * item.quantity), 0);
    },

    processSale: async (user_id: string) => {
      const { cart } = get();
      if (cart.length === 0) return;

      set({ loading: true, error: null });
      try {
        const total = get().getCartTotal();

        const { data: sale, error: saleError } = await supabase
          .from('sales')
          .insert({
            total_amount: total,
            items_count: cart.reduce((sum, item) => sum + item.quantity, 0),
            user_id,
            payment_method: 'cash'
          })
          .select('id')
          .single();

        if (saleError) throw saleError;

        const saleItems = cart.map(item => ({
          sale_id: sale.id,
          product_id: item.product.id,
          quantity: item.quantity,
          unit_price: item.product.price,
          total_price: item.product.price * item.quantity
        }));

        const { error: itemsError } = await supabase
          .from('sale_items')
          .insert(saleItems);

        if (itemsError) throw itemsError;

        for (const item of cart) {
          const { error: stockError } = await supabase
            .from('products')
            .update({
              stock: item.product.stock - item.quantity
            })
            .eq('id', item.product.id);

          if (stockError) throw stockError;
        }

        // Invalidate cache as stock changed
        requestCache.clear();

        set({ cart: [], loading: false });
        await get().fetchProducts();
      } catch (error) {
        console.error('Error processing sale:', error);
        set({ error: 'فشل في معالجة البيع', loading: false });
      }
    }
  })
);