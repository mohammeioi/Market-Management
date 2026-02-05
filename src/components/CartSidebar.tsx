import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Minus, Plus, Trash2, ShoppingCart, CreditCard, ChevronUp, ChevronDown } from "lucide-react";
import { useSupabaseProductStore } from "@/stores/useSupabaseProductStore";
import { CustomerOrderForm } from "./CustomerOrderForm";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import { formatCurrency } from "@/lib/currency";

interface CartSidebarProps {
  isMobile?: boolean;
}

export function CartSidebar({ isMobile = false }: CartSidebarProps) {
  const { cart, updateCartQuantity, removeFromCart, clearCart, getCartTotal } = useSupabaseProductStore();
  const { toast } = useToast();
  const [isExpanded, setIsExpanded] = useState(false);
  const [isOrderDialogOpen, setIsOrderDialogOpen] = useState(false);

  const handleCheckout = () => {
    if (cart.length === 0) return;
    
    toast({
      title: "✅ تم إتمام الدفع بنجاح",
      description: `تم دفع ${formatCurrency(getCartTotal())} بنجاح`,
    });
    
    clearCart();
  };

  const handleOrderComplete = () => {
    clearCart();
    setIsOrderDialogOpen(false);
  };

  const handleQuantityChange = (productId: string, newQuantity: number) => {
    updateCartQuantity(productId, newQuantity);
  };

  const total = getCartTotal();

  // للموبايل: إظهار السلة مصغرة أو موسعة
  if (isMobile) {
    return (
      <Card className={`bg-pos-surface border-border/50 transition-all duration-300 ${
        isExpanded ? 'h-[70vh]' : 'h-16'
      }`} style={{ boxShadow: 'var(--shadow-card)' }}>
        <CardHeader className="pb-2 cursor-pointer" onClick={() => setIsExpanded(!isExpanded)}>
          <CardTitle className="flex items-center gap-2 text-right">
            <ShoppingCart size={20} />
            سلة المشتريات
            {cart.length > 0 && (
              <Badge variant="secondary" className="mr-auto">
                {cart.length}
              </Badge>
            )}
            <div className="flex items-center gap-1 text-sm text-muted-foreground">
              {cart.length > 0 && (
                <span>{formatCurrency(getCartTotal())}</span>
              )}
              {isExpanded ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
            </div>
          </CardTitle>
        </CardHeader>
        
        {isExpanded && (
          <CardContent className="flex flex-col h-full pt-0">
            {cart.length === 0 ? (
              <div className="flex-1 flex items-center justify-center text-center text-muted-foreground">
                <div>
                  <ShoppingCart size={48} className="mx-auto mb-4 opacity-50" />
                  <p>السلة فارغة</p>
                  <p className="text-sm">اضغط على المنتجات لإضافتها</p>
                </div>
              </div>
            ) : (
              <>
                <div className="flex-1 space-y-3 overflow-y-auto max-h-64">
                  {cart.map((item) => (
                    <div key={item.product.id} className="flex items-center gap-3 p-3 bg-pos-surface-secondary rounded-lg">
                      <div className="w-12 h-12 rounded-md overflow-hidden bg-muted flex-shrink-0">
                        <img 
                          src={item.product.image} 
                          alt={item.product.name}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium text-sm text-right truncate">
                          {item.product.name}
                        </h4>
                        <p className="text-sm text-muted-foreground text-right">
                          {formatCurrency(item.product.price)}
                        </p>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleQuantityChange(item.product.id, item.quantity - 1)}
                          disabled={item.quantity <= 1}
                          className="h-8 w-8 p-0"
                        >
                          <Minus size={12} />
                        </Button>
                        
                        <span className="w-8 text-center font-medium">
                          {item.quantity}
                        </span>
                        
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleQuantityChange(item.product.id, item.quantity + 1)}
                          className="h-8 w-8 p-0"
                        >
                          <Plus size={12} />
                        </Button>
                        
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => removeFromCart(item.product.id)}
                          className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                        >
                          <Trash2 size={12} />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
                
                <div className="border-t pt-4 mt-4 space-y-3">
                  <div className="flex justify-between items-center text-lg font-bold">
                    <span>المجموع:</span>
                    <span className="text-primary">{formatCurrency(getCartTotal())}</span>
                  </div>
                  
                  <div className="space-y-2">
                    <Dialog open={isOrderDialogOpen} onOpenChange={setIsOrderDialogOpen}>
                      <DialogTrigger asChild>
                        <Button 
                          className="w-full bg-primary hover:bg-primary/90 text-primary-foreground"
                          style={{ background: 'var(--gradient-primary)' }}
                          disabled={cart.length === 0}
                        >
                          إرسال طلب
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-md">
                        <DialogHeader>
                          <DialogTitle>إرسال طلب للعميل</DialogTitle>
                        </DialogHeader>
                        <CustomerOrderForm 
                          cart={cart}
                          onOrderComplete={handleOrderComplete}
                          onCancel={() => setIsOrderDialogOpen(false)}
                        />
                      </DialogContent>
                    </Dialog>
                    
                    <Button 
                      onClick={handleCheckout}
                      variant="outline"
                      className="w-full"
                      disabled={cart.length === 0}
                    >
                      <CreditCard size={16} className="ml-2" />
                      دفع مباشر
                    </Button>
                    
                    <Button 
                      onClick={clearCart}
                      variant="outline"
                      className="w-full"
                      disabled={cart.length === 0}
                    >
                      إفراغ السلة
                    </Button>
                  </div>
                </div>
              </>
            )}
          </CardContent>
        )}
      </Card>
    );
  }

  // للديسكتوب: العرض الكامل
  return (
    <Card className="h-full bg-pos-surface border-border/50" style={{ boxShadow: 'var(--shadow-card)' }}>
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2 text-right">
          <ShoppingCart size={20} />
          سلة المشتريات
          {cart.length > 0 && (
            <Badge variant="secondary" className="mr-auto">
              {cart.length}
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      
      <CardContent className="flex flex-col h-full">
        {cart.length === 0 ? (
          <div className="flex-1 flex items-center justify-center text-center text-muted-foreground">
            <div>
              <ShoppingCart size={48} className="mx-auto mb-4 opacity-50" />
              <p>السلة فارغة</p>
              <p className="text-sm">اضغط على المنتجات لإضافتها</p>
            </div>
          </div>
        ) : (
          <>
            <div className="flex-1 space-y-3 overflow-y-auto max-h-96">
              {cart.map((item) => (
                <div key={item.product.id} className="flex items-center gap-3 p-3 bg-pos-surface-secondary rounded-lg">
                  <div className="w-12 h-12 rounded-md overflow-hidden bg-muted flex-shrink-0">
                    <img 
                      src={item.product.image} 
                      alt={item.product.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium text-sm text-right truncate">
                      {item.product.name}
                    </h4>
                    <p className="text-sm text-muted-foreground text-right">
                      {formatCurrency(item.product.price)}
                    </p>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleQuantityChange(item.product.id, item.quantity - 1)}
                      disabled={item.quantity <= 1}
                      className="h-8 w-8 p-0"
                    >
                      <Minus size={12} />
                    </Button>
                    
                    <span className="w-8 text-center font-medium">
                      {item.quantity}
                    </span>
                    
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleQuantityChange(item.product.id, item.quantity + 1)}
                      className="h-8 w-8 p-0"
                    >
                      <Plus size={12} />
                    </Button>
                    
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => removeFromCart(item.product.id)}
                      className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                    >
                      <Trash2 size={12} />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
            
            <div className="border-t pt-4 mt-4 space-y-3">
              <div className="flex justify-between items-center text-lg font-bold">
                <span>المجموع:</span>
                <span className="text-primary">{formatCurrency(total)}</span>
              </div>
              
              <div className="space-y-2">
                <Dialog open={isOrderDialogOpen} onOpenChange={setIsOrderDialogOpen}>
                  <DialogTrigger asChild>
                    <Button 
                      className="w-full bg-primary hover:bg-primary/90 text-primary-foreground"
                      style={{ background: 'var(--gradient-primary)' }}
                      disabled={cart.length === 0}
                    >
                      إرسال طلب
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-md">
                    <DialogHeader>
                      <DialogTitle>إرسال طلب للعميل</DialogTitle>
                    </DialogHeader>
                    <CustomerOrderForm 
                      cart={cart}
                      onOrderComplete={handleOrderComplete}
                      onCancel={() => setIsOrderDialogOpen(false)}
                    />
                  </DialogContent>
                </Dialog>
                
                <Button 
                  onClick={handleCheckout}
                  variant="outline"
                  className="w-full"
                  disabled={cart.length === 0}
                >
                  <CreditCard size={16} className="ml-2" />
                  دفع مباشر
                </Button>
                
                <Button 
                  onClick={clearCart}
                  variant="outline"
                  className="w-full"
                  disabled={cart.length === 0}
                >
                  إفراغ السلة
                </Button>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}