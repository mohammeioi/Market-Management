import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Product, CartItem } from '@/types/pos';

interface ProductStore {
  products: Product[];
  cart: CartItem[];
  addProduct: (product: Omit<Product, 'id'>) => void;
  updateProduct: (id: string, product: Partial<Product>) => void;
  deleteProduct: (id: string) => void;
  addToCart: (product: Product) => void;
  updateCartQuantity: (productId: string, quantity: number) => void;
  removeFromCart: (productId: string) => void;
  clearCart: () => void;
  getCartTotal: () => number;
}

const defaultProducts: Product[] = [
  {
    id: '1',
    name: 'قهوة عربية',
    price: 15,
    category: 'مشروبات ساخنة',
    stock: 50,
    image: '/placeholder.svg'
  },
  {
    id: '2',
    name: 'شاي أحمر',
    price: 10,
    category: 'مشروبات ساخنة',
    stock: 40,
    image: '/placeholder.svg'
  },
  {
    id: '3',
    name: 'كعك الشوكولاتة',
    price: 25,
    category: 'حلويات',
    stock: 20,
    image: '/placeholder.svg'
  },
  {
    id: '4',
    name: 'عصير برتقال طازج',
    price: 18,
    category: 'مشروبات باردة',
    stock: 30,
    image: '/placeholder.svg'
  },
  {
    id: '5',
    name: 'ساندويش تونة',
    price: 35,
    category: 'وجبات خفيفة',
    stock: 15,
    image: '/placeholder.svg'
  },
  {
    id: '6',
    name: 'كرواسان بالجبن',
    price: 22,
    category: 'وجبات خفيفة',
    stock: 25,
    image: '/placeholder.svg'
  }
];

export const useProductStore = create<ProductStore>()(
  persist(
    (set, get) => ({
      products: defaultProducts,
      cart: [],
      
      addProduct: (productData) => set((state) => ({
        products: [...state.products, {
          ...productData,
          id: Date.now().toString()
        }]
      })),
      
      updateProduct: (id, productData) => set((state) => ({
        products: state.products.map(product =>
          product.id === id ? { ...product, ...productData } : product
        )
      })),
      
      deleteProduct: (id) => set((state) => ({
        products: state.products.filter(product => product.id !== id)
      })),
      
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
      }
    }),
    {
      name: 'pos-storage'
    }
  )
);