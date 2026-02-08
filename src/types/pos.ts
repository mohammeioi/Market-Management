export interface Product {
  id: string;
  name: string;
  price: number;
  category: string;
  stock: number;
  image: string;
  barcode?: string;
  isAvailable?: boolean;
}

export interface CartItem {
  product: Product;
  quantity: number;
}

export interface Category {
  id: string;
  name: string;
  icon: string;
}