import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { useOrderStore } from '@/stores/useOrderStore';
import { Order } from '@/types/order';
import { Clock, Phone, Mail, Package, User, Trash2, MessageCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { formatCurrency } from '@/lib/currency';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';

const statusColors = {
  pending: 'bg-yellow-500',
  confirmed: 'bg-blue-500',
  preparing: 'bg-orange-500',
  ready: 'bg-green-500',
  delivered: 'bg-gray-500',
  cancelled: 'bg-red-500',
};

const statusLabels = {
  pending: 'في الانتظار',
  confirmed: 'مؤكد',
  preparing: 'قيد التحضير',
  ready: 'جاهز',
  delivered: 'تم التسليم',
  cancelled: 'ملغى',
};

export function OrderManagement() {
  const { orders, loading, fetchOrders, updateOrderStatus, deleteOrder } = useOrderStore();
  const { toast } = useToast();
  const [deletingOrderId, setDeletingOrderId] = useState<string | null>(null);

  useEffect(() => {
    fetchOrders();

    // Supabase Realtime subscription - refresh only when a new order arrives
    const channel = supabase
      .channel('orders-realtime')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'orders',
        },
        (payload) => {
          console.log('طلب جديد وصل:', payload);
          fetchOrders();
          toast({
            title: "🔔 طلب جديد!",
            description: "تم استلام طلب جديد وتحديث القائمة تلقائياً",
            duration: 4000,
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchOrders, toast]);

  const handleStatusChange = async (orderId: string, newStatus: Order['status']) => {
    try {
      await updateOrderStatus(orderId, newStatus);
      toast({
        title: "تم تحديث حالة الطلب",
        description: `تم تغيير الحالة إلى: ${statusLabels[newStatus]}`,
      });
    } catch (error) {
      toast({
        title: "خطأ",
        description: "حدث خطأ في تحديث حالة الطلب",
        variant: "destructive",
      });
    }
  };


  const handleDeleteOrder = async (orderId: string) => {
    setDeletingOrderId(orderId);
    try {
      const result = await deleteOrder(orderId);
      if (result.success) {
        toast({
          title: "تم حذف الطلب",
          description: "تم حذف الطلب بنجاح",
        });
      } else {
        toast({
          title: "خطأ",
          description: result.error || "حدث خطأ في حذف الطلب",
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
      setDeletingOrderId(null);
    }
  };

  const handleSendWhatsApp = (orderId: string, customerPhone: string, customerName: string, status: Order['status']) => {
    // تنسيق رقم الهاتف - إزالة الأصفار من البداية وإضافة رمز العراق
    let phone = customerPhone.replace(/\D/g, '');
    if (phone.startsWith('0')) {
      phone = '964' + phone.substring(1);
    }
    if (!phone.startsWith('964') && phone.length <= 10) {
      phone = '964' + phone;
    }

    // إنشاء نص الرسالة حسب حالة الطلب
    const orderNum = orderId.slice(0, 8);
    let message = '';

    switch (status) {
      case 'pending':
        message = `مرحباً ${customerName}!\n\nتم استلام طلبك رقم #${orderNum} وهو قيد المراجعة.\n\nسنقوم بتأكيده قريباً.\n\nشكراً لتعاملك معنا.`;
        break;
      case 'confirmed':
        message = `مرحباً ${customerName}!\n\nتم تأكيد طلبك رقم #${orderNum} بنجاح.\n\nسنبدأ بتحضيره قريباً.\n\nشكراً لتعاملك معنا.`;
        break;
      case 'preparing':
        message = `مرحباً ${customerName}!\n\nطلبك رقم #${orderNum} قيد التحضير الآن.\n\nسيكون جاهزاً قريباً.\n\nشكراً لصبرك.`;
        break;
      case 'ready':
        message = `مرحباً ${customerName}!\n\nطلبك رقم #${orderNum} جاهز الآن!\n\nيمكنك استلامه في أي وقت.\n\nشكراً لتعاملك معنا.`;
        break;
      case 'delivered':
        message = `مرحباً ${customerName}!\n\nتم تسليم طلبك رقم #${orderNum} بنجاح.\n\nنتمنى أن تكون راضياً عن الخدمة.\n\nشكراً لتعاملك معنا.`;
        break;
      case 'cancelled':
        message = `مرحباً ${customerName}!\n\nنأسف لإبلاغك بأن طلبك رقم #${orderNum} تم إلغاؤه.\n\nإذا كان لديك أي استفسار، لا تتردد بالتواصل معنا.\n\nشكراً لتفهمك.`;
        break;
      default:
        message = `مرحباً ${customerName}!\n\nبخصوص طلبك رقم #${orderNum}\n\nشكراً لتعاملك معنا.`;
    }

    // فتح رابط واتساب
    const whatsappUrl = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, '_blank');

    toast({
      title: "تم فتح واتساب",
      description: "يرجى الضغط على إرسال في نافذة واتساب",
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg">جاري تحميل الطلبات...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">إدارة الطلبات</h1>
        <Button onClick={fetchOrders} variant="outline">
          تحديث
        </Button>
      </div>

      {orders.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-8 sm:py-12">
            <Package className="h-10 w-10 sm:h-12 sm:w-12 text-muted-foreground mb-4" />
            <h3 className="text-base sm:text-lg font-semibold mb-2">لا توجد طلبات</h3>
            <p className="text-sm text-muted-foreground text-center">
              لم يتم استلام أي طلبات بعد
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3 sm:gap-4">
          {orders.map((order) => {
            const itemCount = order.order_items.reduce((sum, item) => sum + item.quantity, 0);

            return (
              <div key={order.id} className="group relative bg-white rounded-[2rem] p-6 shadow-sm hover:shadow-md transition-all border border-gray-100 flex flex-col gap-4">
                {/* Header: Icon + Title + Date */}
                <div className="flex justify-between items-start">
                  <div className="flex gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-gray-50 flex items-center justify-center text-gray-900 shadow-sm">
                      <Package size={24} />
                    </div>
                    <div>
                      <h3 className="font-bold text-lg text-gray-900">طلب #{order.id.slice(0, 8)}</h3>
                      <div className="flex flex-col">
                        <p className="text-gray-500 text-sm font-medium">{order.customer_name}</p>
                        {order.customer_phone && (
                          <p className="text-gray-400 text-xs font-mono mt-0.5" dir="ltr">{order.customer_phone}</p>
                        )}
                      </div>
                    </div>
                  </div>
                  <span className="text-xs font-semibold text-gray-400 bg-gray-50 px-2 py-1 rounded-full">
                    {new Date(order.created_at).toLocaleDateString('ar-SA')}
                  </span>
                </div>

                {/* Tags/Pills */}
                <div className="flex flex-wrap gap-2">
                  <span className={cn("px-3 py-1 rounded-full text-xs font-bold", statusColors[order.status].replace('bg-', 'bg-').replace('500', '100') + " " + statusColors[order.status].replace('bg-', 'text-'))}>
                    {statusLabels[order.status]}
                  </span>
                  <span className="px-3 py-1 rounded-full text-xs font-bold bg-gray-100 text-gray-600">
                    {itemCount} عناصر
                  </span>
                  <span className="px-3 py-1 rounded-full text-xs font-bold bg-blue-50 text-blue-600">
                    {formatCurrency(order.total_amount)}
                  </span>
                </div>

                {/* Order Items Preview (Skills style) */}
                <div className="flex flex-wrap gap-2">
                  {order.order_items.slice(0, 3).map((item, idx) => (
                    <span key={idx} className="px-3 py-1.5 rounded-xl border border-gray-100 text-xs text-gray-600 font-medium bg-white">
                      {item.product?.name} × {item.quantity}
                    </span>
                  ))}
                  {order.order_items.length > 3 && (
                    <span className="px-3 py-1.5 rounded-xl border border-gray-100 text-xs text-gray-400 font-medium bg-gray-50">
                      +{order.order_items.length - 3} المزيد
                    </span>
                  )}
                </div>

                {/* Notes Section */}
                {order.notes && (
                  <div className="bg-yellow-50 p-3 rounded-xl border border-yellow-100">
                    <p className="text-xs text-yellow-800 font-medium flex items-center gap-2">
                      <span className="font-bold">ملاحظات:</span> {order.notes}
                    </p>
                  </div>
                )}

                {/* Actions Button (Large Blue) */}
                <div className="pt-2">
                  <div className="flex gap-2">
                    <Select
                      value={order.status}
                      onValueChange={(value: Order['status']) =>
                        handleStatusChange(order.id, value)
                      }
                    >
                      <SelectTrigger className="flex-1 h-12 rounded-xl bg-gray-900 text-white hover:bg-gray-800 border-none font-bold">
                        <SelectValue placeholder="تغيير الحالة" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pending">في الانتظار</SelectItem>
                        <SelectItem value="confirmed">مؤكد</SelectItem>
                        <SelectItem value="preparing">قيد التحضير</SelectItem>
                        <SelectItem value="ready">جاهز</SelectItem>
                        <SelectItem value="delivered">تم التسليم</SelectItem>
                        <SelectItem value="cancelled">ملغى</SelectItem>
                      </SelectContent>
                    </Select>

                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <button className="h-12 w-12 rounded-xl border border-gray-200 flex items-center justify-center text-gray-400 hover:text-red-500 hover:border-red-200 transition-colors">
                          <Trash2 size={20} />
                        </button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>حذف الطلب</AlertDialogTitle>
                          <AlertDialogDescription>
                            هل أنت متأكد من حذف هذا الطلب؟
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>إلغاء</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => handleDeleteOrder(order.id)}
                            className="bg-destructive hover:bg-destructive/90"
                          >
                            حذف
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>

                  {/* WhatsApp Link if available */}
                  {order.customer_phone && (
                    <Button
                      variant="ghost"
                      className="w-full mt-2 text-green-600 hover:text-green-700 hover:bg-green-50 h-10 rounded-xl"
                      onClick={() => handleSendWhatsApp(order.id, order.customer_phone!, order.customer_name, order.status)}
                    >
                      <MessageCircle size={16} className="ml-2" />
                      تواصل عبر واتساب
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}