export interface Order {
  id: string;
  customer_name: string;
  customer_phone?: string;
  customer_email?: string;
  total_amount: number;
  status: 'pending' | 'confirmed' | 'preparing' | 'ready' | 'delivered' | 'cancelled';
  notes?: string;
  order_date: string;
  user_id?: string;
  approved_by?: string;
  created_at: string;
  updated_at: string;
  is_profit_deleted?: boolean;
  source?: 'web' | 'android';
  delivery_lat?: number;
  delivery_lng?: number;
  delivery_address?: string;
}

export interface OrderItem {
  id: string;
  order_id: string;
  product_id: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  created_at: string;
  product?: {
    id: string;
    name: string;
    price: number;
    image?: string;
  };
}

export interface OrderWithItems extends Order {
  order_items: OrderItem[];
}

export interface CreateOrderRequest {
  customer_name: string;
  customer_phone?: string;
  customer_email?: string;
  notes?: string;
  items: {
    product_id: string;
    quantity: number;
    unit_price: number;
  }[];
  source?: 'web' | 'android';
  delivery_lat?: number;
  delivery_lng?: number;
  delivery_address?: string;
}