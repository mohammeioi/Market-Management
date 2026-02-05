import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useOrderStore } from '@/stores/useOrderStore';
import { CartItem } from '@/types/pos';
import { useToast } from '@/hooks/use-toast';
import { formatCurrency } from '@/lib/currency';

interface CustomerOrderFormProps {
  cart: CartItem[];
  onOrderComplete: () => void;
  onCancel: () => void;
}

export function CustomerOrderForm({ cart, onOrderComplete, onCancel }: CustomerOrderFormProps) {
  const [customerInfo, setCustomerInfo] = useState({
    name: '',
    phone: '',
    email: '',
    notes: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { createOrderFromCart } = useOrderStore();
  const { toast } = useToast();

  const total = cart.reduce((sum, item) => sum + (item.product.price * item.quantity), 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerInfo.name.trim()) {
      toast({
        title: "خطأ",
        description: "يرجى إدخال اسم العميل",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await createOrderFromCart(cart, customerInfo);
      
      if (result.success) {
        toast({
          title: "تم إرسال الطلب بنجاح",
          description: `رقم الطلب: ${result.orderId?.slice(0, 8)}`,
        });
        onOrderComplete();
      } else {
        toast({
          title: "خطأ",
          description: result.error || "حدث خطأ في إرسال الطلب",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "خطأ",
        description: "حدث خطأ غير متوقع",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle>معلومات العميل</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="customerName">اسم العميل *</Label>
            <Input
              id="customerName"
              value={customerInfo.name}
              onChange={(e) => setCustomerInfo(prev => ({ ...prev, name: e.target.value }))}
              placeholder="أدخل اسم العميل"
              required
            />
          </div>

          <div>
            <Label htmlFor="customerPhone">رقم الهاتف</Label>
            <Input
              id="customerPhone"
              type="tel"
              value={customerInfo.phone}
              onChange={(e) => setCustomerInfo(prev => ({ ...prev, phone: e.target.value }))}
              placeholder="أدخل رقم الهاتف"
              dir="ltr"
            />
          </div>

          <div>
            <Label htmlFor="customerEmail">البريد الإلكتروني</Label>
            <Input
              id="customerEmail"
              type="email"
              value={customerInfo.email}
              onChange={(e) => setCustomerInfo(prev => ({ ...prev, email: e.target.value }))}
              placeholder="أدخل البريد الإلكتروني"
              dir="ltr"
            />
          </div>

          <div>
            <Label htmlFor="orderNotes">ملاحظات</Label>
            <Textarea
              id="orderNotes"
              value={customerInfo.notes}
              onChange={(e) => setCustomerInfo(prev => ({ ...prev, notes: e.target.value }))}
              placeholder="ملاحظات إضافية للطلب"
              rows={3}
            />
          </div>

          <div className="bg-muted p-4 rounded-lg">
            <div className="flex justify-between items-center font-semibold">
              <span>إجمالي الطلب:</span>
              <span>{formatCurrency(total)}</span>
            </div>
            <div className="text-sm text-muted-foreground mt-1">
              {cart.length} منتج
            </div>
          </div>

          <div className="flex gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              disabled={isSubmitting}
              className="flex-1"
            >
              إلغاء
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="flex-1"
            >
              {isSubmitting ? 'جاري الإرسال...' : 'إرسال الطلب'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}