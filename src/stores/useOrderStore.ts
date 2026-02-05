import { create } from 'zustand';
import { supabase } from '@/integrations/supabase/client';
import { Order, OrderWithItems, CreateOrderRequest } from '@/types/order';
import { CartItem } from '@/types/pos';

interface OrderStore {
  orders: OrderWithItems[];
  loading: boolean;
  error: string | null;
  fetchOrders: () => Promise<void>;
  createOrder: (orderData: CreateOrderRequest) => Promise<{ success: boolean; orderId?: string; error?: string }>;
  updateOrderStatus: (orderId: string, status: Order['status']) => Promise<void>;
  deleteOrder: (orderId: string) => Promise<{ success: boolean; error?: string }>;
  createOrderFromCart: (cart: CartItem[], customerInfo: { name: string; phone?: string; email?: string; notes?: string }) => Promise<{ success: boolean; orderId?: string; error?: string }>;
}

export const useOrderStore = create<OrderStore>((set, get) => ({
  orders: [],
  loading: false,
  error: null,

  fetchOrders: async () => {
    set({ loading: true, error: null });
    try {
      const { data: orders, error } = await supabase
        .from('orders')
        .select(`
          *,
          order_items (
            *,
            product:products (
              id,
              name,
              price,
              image
            )
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      set({ orders: (orders || []) as OrderWithItems[], loading: false });
    } catch (error) {
      console.error('Error fetching orders:', error);
      set({ error: 'حدث خطأ في جلب الطلبات', loading: false });
    }
  },

  createOrder: async (orderData: CreateOrderRequest) => {
    try {
      const totalAmount = orderData.items.reduce(
        (sum, item) => sum + (item.unit_price * item.quantity),
        0
      );

      const { data: order, error: orderError } = await supabase
        .from('orders')
        .insert({
          customer_name: orderData.customer_name,
          customer_phone: orderData.customer_phone,
          customer_email: orderData.customer_email,
          total_amount: totalAmount,
          notes: orderData.notes,
        })
        .select()
        .single();

      if (orderError) throw orderError;

      const orderItems = orderData.items.map(item => ({
        order_id: order.id,
        product_id: item.product_id,
        quantity: item.quantity,
        unit_price: item.unit_price,
        total_price: item.unit_price * item.quantity,
      }));

      const { error: itemsError } = await supabase
        .from('order_items')
        .insert(orderItems);

      if (itemsError) throw itemsError;

      // Refresh orders
      get().fetchOrders();

      return { success: true, orderId: order.id };
    } catch (error) {
      console.error('Error creating order:', error);
      return { success: false, error: 'حدث خطأ في إنشاء الطلب' };
    }
  },

  updateOrderStatus: async (orderId: string, status: Order['status']) => {
    try {
      const { error } = await supabase
        .from('orders')
        .update({ status })
        .eq('id', orderId);

      if (error) throw error;

      // Update local state
      set(state => ({
        orders: state.orders.map(order =>
          order.id === orderId ? { ...order, status } : order
        )
      }));
    } catch (error) {
      console.error('Error updating order status:', error);
      set({ error: 'حدث خطأ في تحديث حالة الطلب' });
    }
  },

  deleteOrder: async (orderId: string) => {
    try {
      // Delete order items first (due to foreign key constraint)
      const { error: itemsError } = await supabase
        .from('order_items')
        .delete()
        .eq('order_id', orderId);

      if (itemsError) throw itemsError;

      // Delete the order
      const { error: orderError } = await supabase
        .from('orders')
        .delete()
        .eq('id', orderId);

      if (orderError) throw orderError;

      // Update local state
      set(state => ({
        orders: state.orders.filter(order => order.id !== orderId)
      }));

      return { success: true };
    } catch (error) {
      console.error('Error deleting order:', error);
      return { success: false, error: 'حدث خطأ في حذف الطلب' };
    }
  },

  createOrderFromCart: async (cart: CartItem[], customerInfo: { name: string; phone?: string; email?: string; notes?: string }) => {
    const orderData: CreateOrderRequest = {
      customer_name: customerInfo.name,
      customer_phone: customerInfo.phone,
      customer_email: customerInfo.email,
      notes: customerInfo.notes,
      items: cart.map(item => ({
        product_id: item.product.id,
        quantity: item.quantity,
        unit_price: item.product.price,
      })),
    };

    return get().createOrder(orderData);
  },
}));