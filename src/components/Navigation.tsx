import { useNavigate, useLocation } from "react-router-dom";
import { Home, ShoppingBag, Settings } from "lucide-react";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useOrderStore } from "@/stores/useOrderStore";
import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

export function Navigation() {
  const location = useLocation();
  const { user } = useAuth();
  const { orders, fetchOrders, subscribeToOrders } = useOrderStore();
  const [userRole, setUserRole] = useState<string | null>(null);

  useEffect(() => {
    fetchOrders();
    const unsubscribe = subscribeToOrders();
    return () => unsubscribe();
  }, [fetchOrders, subscribeToOrders]);

  useEffect(() => {
    const fetchUserRole = async () => {
      if (user) {
        const { data, error } = await supabase
          .from('profiles')
          .select('role')
          .eq('user_id', user.id)
          .single();

        if (!error && data) {
          setUserRole(data.role);
        }
      }
    };

    fetchUserRole();
  }, [user]);

  const pendingOrdersCount = orders.filter(o => o.status === 'pending' || o.status === 'confirmed' || o.status === 'preparing').length;

  // Role-based navigation items
  const navItems = userRole === 'admin' ? [
    { path: '/management', label: 'Manage', icon: Settings },
    { path: '/orders', label: 'Orders', icon: ShoppingBag, badge: pendingOrdersCount > 0 },
    { path: '/', label: 'Home', icon: Home },
  ] : [
    { path: '/user-orders', label: 'Orders', icon: ShoppingBag },
    { path: '/', label: 'Home', icon: Home },
  ];

  return (
    <div className="fixed bottom-8 left-1/2 transform -translate-x-1/2 z-50">
      <div className="flex items-center justify-center gap-6 bg-background px-8 py-4 rounded-full shadow-neu border-none">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          const Icon = item.icon;

          return (
            <Link
              key={item.path}
              to={item.path}
              className={cn(
                "relative flex items-center justify-center w-12 h-12 rounded-full transition-all duration-300",
                isActive
                  ? "bg-background text-primary shadow-neu-inset scale-95"
                  : "text-muted-foreground hover:text-foreground hover:shadow-neu"
              )}
            >
              <Icon size={22} strokeWidth={isActive ? 2.5 : 2} />

              {/* Notification Badge */}
              {item.badge && (
                <span className="absolute top-0 right-0 w-3 h-3 bg-red-500 rounded-full border-2 border-background animate-pulse" />
              )}

              {isActive && (
                <span className="absolute -bottom-8 text-[10px] font-bold text-foreground bg-background border-none px-2 py-0.5 rounded-full shadow-neu opacity-0 animate-in fade-in slide-in-from-top-1 hidden">
                  {item.label}
                </span>
              )}
            </Link>
          );
        })}
      </div>
    </div>
  );
}