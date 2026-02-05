import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ShoppingCart, Package, Menu, X, LogOut, ClipboardList } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { useNavigate, useLocation } from "react-router-dom";
import { ConnectionStatus } from "@/components/ConnectionStatus";

interface NavigationProps {}

export function Navigation({}: NavigationProps) {
  const [isOpen, setIsOpen] = useState(false);
  const { signOut, user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();

  const handleSignOut = async () => {
    try {
      await signOut();
      toast({
        title: "تم تسجيل الخروج",
        description: "وداعاً!"
      });
    } catch (error) {
      toast({
        title: "خطأ",
        description: "فشل في تسجيل الخروج",
        variant: "destructive"
      });
    }
  };

  const navItems = [
    { path: '/', label: 'نقاط البيع', icon: ShoppingCart },
    { path: '/orders', label: 'الطلبات', icon: ClipboardList },
    { path: '/management', label: 'إدارة المنتجات', icon: Package }
  ];

  return (
    <>
      {/* Mobile Menu Button */}
      <div className="md:hidden fixed top-4 left-4 z-50">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setIsOpen(!isOpen)}
          className="bg-background/80 backdrop-blur-sm"
        >
          {isOpen ? <X size={16} /> : <Menu size={16} />}
        </Button>
      </div>

      {/* Navigation */}
      <Card className={`
        fixed top-4 right-4 z-40 p-2 bg-background/95 backdrop-blur-sm border-border/50
        md:relative md:top-auto md:right-auto md:z-auto md:bg-background md:backdrop-blur-none
        ${isOpen ? 'block' : 'hidden md:block'}
      `}>
        <div className="flex flex-col md:flex-row gap-2">
          <nav className="flex flex-col md:flex-row gap-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;
              return (
                <Button
                  key={item.path}
                  variant={isActive ? "default" : "ghost"}
                  onClick={() => {
                    navigate(item.path);
                    setIsOpen(false);
                  }}
                  className="justify-start md:justify-center gap-2 min-w-[140px]"
                >
                  <Icon size={16} />
                  {item.label}
                </Button>
              );
            })}
          </nav>
          
          <div className="flex flex-col md:flex-row gap-1 border-t md:border-t-0 md:border-r pt-2 md:pt-0 md:pl-2">
            <div className="text-xs text-muted-foreground px-2 py-1 md:hidden">
              {user?.email}
            </div>
            <div className="flex items-center gap-2 px-2 py-1">
              <ConnectionStatus />
            </div>
            <Button
              variant="ghost"
              onClick={handleSignOut}
              className="justify-start md:justify-center gap-2 text-destructive hover:text-destructive"
            >
              <LogOut size={16} />
              تسجيل الخروج
            </Button>
          </div>
        </div>
      </Card>

      {/* Overlay for mobile */}
      {isOpen && (
        <div 
          className="md:hidden fixed inset-0 bg-black/30 z-30 backdrop-blur-sm" 
          onClick={() => setIsOpen(false)}
        />
      )}
    </>
  );
}