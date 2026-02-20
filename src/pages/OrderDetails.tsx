import { useParams, useLocation, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowRight, Clock, Phone, Mail, Package, User, Trash2, MessageCircle, CheckCircle } from 'lucide-react';
import { useOrderStore } from '@/stores/useOrderStore';
import { useEffect, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { formatCurrency } from '@/lib/currency';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

const statusColors: Record<string, string> = {
  pending: 'bg-yellow-500',
  confirmed: 'bg-blue-500',
  preparing: 'bg-orange-500',
  ready: 'bg-green-500',
  delivered: 'bg-gray-500',
  cancelled: 'bg-red-500',
};

const statusLabels: Record<string, string> = {
  pending: 'في الانتظار',
  confirmed: 'مؤكد',
  preparing: 'قيد التحضير',
  ready: 'جاهز',
  delivered: 'تم التسليم',
  cancelled: 'ملغى',
};

// Helper component for rendering an order item with image preview dialog
const OrderItemDetail = ({ item }: { item: any }) => (
  <AlertDialog>
    <AlertDialogTrigger asChild>
      <div className="p-4 rounded-xl border border-gray-100 hover:bg-gray-50 transition-colors cursor-pointer">
        <div className="flex items-center gap-4">
          {item.product?.image ? (
            <img
              src={item.product.image}
              alt={item.product.name}
              className="w-16 h-16 rounded-lg object-cover"
            />
          ) : (
            <div className="w-16 h-16 bg-gray-100 rounded-lg flex items-center justify-center">
              <Package size={24} className="text-gray-400" />
            </div>
          )}
          <div className="flex-1">
            <h4 className="font-semibold text-gray-900">{item.product?.name}</h4>
            <p className="text-sm text-gray-500">الكمية: {item.quantity}</p>
            <p className="text-sm font-medium text-gray-900">{formatCurrency(item.unit_price)}</p>
          </div>
          <div className="text-left">
            <p className="font-bold text-gray-900">{formatCurrency(item.total_price)}</p>
          </div>
        </div>
      </div>
    </AlertDialogTrigger>
    <AlertDialogContent className="sm:max-w-md">
      <AlertDialogHeader>
        <AlertDialogTitle>{item.product?.name}</AlertDialogTitle>
      </AlertDialogHeader>
      <div className="flex flex-col items-center gap-4 py-4">
        {item.product?.image ? (
          <img
            src={item.product.image}
            alt={item.product.name}
            className="w-full max-h-64 object-contain rounded-lg"
          />
        ) : (
          <div className="w-32 h-32 bg-gray-100 rounded-lg flex items-center justify-center">
            <Package size={48} />
          </div>
        )}
        <div className="text-center space-y-2 w-full">
          <p className="text-lg font-bold">{formatCurrency(item.unit_price)}</p>
          <p className="text-sm text-gray-500">الكمية: {item.quantity}</p>
          <p className="text-sm font-semibold">الإجمالي: {formatCurrency(item.total_price)}</p>
        </div>
      </div>
    </AlertDialogContent>
  </AlertDialog>
);

export function OrderDetails() {
  const { orderId } = useParams<{ orderId: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const { orders, loading, updateOrderStatus, deleteOrder, approveOrder } = useOrderStore();
  const { toast } = useToast();
  const [deletingOrderId, setDeletingOrderId] = useState<string | null>(null);

  // Get the scanned order ID from location state or URL params
  const scannedOrderId = location.state?.scannedOrderId || orderId;

  // Find the specific order
  const order = orders.find(o => 
    o.id === scannedOrderId || 
    o.id.includes(scannedOrderId) ||
    scannedOrderId?.includes(o.id)
  );

  useEffect(() => {
    if (!order && scannedOrderId) {
      // If order not found, you might want to show an error or redirect
      console.log('Order not found:', scannedOrderId);
    }
  }, [order, scannedOrderId]);

  const handleStatusChange = async (newStatus: string) => {
    if (!order) return;
    
    try {
      await updateOrderStatus(order.id, newStatus as any);
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

  const handleApproveOrder = async () => {
    if (!order) return;
    
    try {
      const result = await approveOrder(order.id);
      if (result.success) {
        toast({
          title: "تمت الموافقة",
          description: "تمت الموافقة على الطلب بنجاح",
          className: "bg-green-500 text-white border-none"
        });
      } else {
        toast({
          title: "خطأ",
          description: result.error || "حدث خطأ أثناء الموافقة",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "خطأ",
        description: "حدث خطأ غير متوقع",
        variant: "destructive",
      });
    }
  };

  const handleDeleteOrder = async () => {
    if (!order) return;
    
    setDeletingOrderId(order.id);
    try {
      const result = await deleteOrder(order.id);
      if (result.success) {
        toast({
          title: "تم حذف الطلب",
          description: "تم حذف الطلب بنجاح",
        });
        navigate('/orders');
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

  const handleSendWhatsApp = () => {
    if (!order || !order.customer_phone) return;
    
    let phone = order.customer_phone.replace(/\D/g, '');
    if (phone.startsWith('0')) {
      phone = '964' + phone.substring(1);
    }
    if (!phone.startsWith('964') && phone.length <= 10) {
      phone = '964' + phone;
    }

    const orderNum = order.id.slice(0, 8);
    let message = `مرحباً ${order.customer_name}!\n\nبخصوص طلبك رقم #${orderNum}\n\nالحالة: ${statusLabels[order.status]}\n\nشكراً لتعاملك معنا.`;

    const whatsappUrl = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, '_blank');

    toast({
      title: "تم فتح واتساب",
      description: "يرجى الضغط على إرسال في نافذة واتساب",
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg">جاري تحميل تفاصيل الطلب...</div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="p-6" dir="rtl">
        <div className="max-w-4xl mx-auto">
          <div className="mb-6">
            <Button
              variant="ghost"
              onClick={() => navigate(-1)}
              className="flex items-center gap-2 mb-4"
            >
              <ArrowRight size={20} />
              العودة
            </Button>
          </div>
          <div className="bg-white rounded-2xl p-8 text-center shadow-sm">
            <Package className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold mb-2">الطلب غير موجود</h3>
            <p className="text-gray-500 mb-6">
              لم يتم العثور على الطلب رقم: {scannedOrderId}
            </p>
            <Button onClick={() => navigate('/orders')}>
              عرض جميع الطلبات
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const itemCount = order.order_items.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <div className="p-6" dir="rtl">
      <div className="max-w-4xl mx-auto">
        <div className="mb-6">
          <Button
            variant="ghost"
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 mb-4"
          >
            <ArrowRight size={20} />
            العودة
          </Button>
          
          {location.state?.scannedOrderId && (
            <div className="bg-blue-50 border border-blue-200 text-blue-800 px-4 py-2 rounded-lg mb-4">
              <p className="text-sm font-medium">
                تم مسح الطلب: {scannedOrderId}
              </p>
            </div>
          )}
        </div>

        <div className="bg-white rounded-[2rem] p-6 shadow-sm border border-gray-100">
          {/* Header */}
          <div className="flex justify-between items-start mb-6">
            <div className="flex gap-4">
              <div className="w-12 h-12 rounded-2xl bg-gray-50 flex items-center justify-center text-gray-900 shadow-sm">
                <Package size={24} />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">طلب #{order.id.slice(0, 8)}</h1>
                <div className="flex flex-col">
                  <p className="text-gray-600 font-medium">{order.customer_name}</p>
                  {order.customer_phone && (
                    <p className="text-gray-400 text-sm font-mono mt-0.5" dir="ltr">{order.customer_phone}</p>
                  )}
                </div>
              </div>
            </div>
            <span className="text-sm font-semibold text-gray-400 bg-gray-50 px-3 py-1 rounded-full">
              {new Date(order.created_at).toLocaleDateString('ar-SA')}
            </span>
          </div>

          {/* Status and Info */}
          <div className="flex flex-wrap gap-3 mb-6">
            <span className={cn("px-4 py-2 rounded-full text-sm font-bold", statusColors[order.status].replace('bg-', 'bg-').replace('500', '100') + " " + statusColors[order.status].replace('bg-', 'text-'))}>
              {statusLabels[order.status]}
            </span>
            <span className="px-4 py-2 rounded-full text-sm font-bold bg-gray-100 text-gray-600">
              {itemCount} عناصر
            </span>
            <span className="px-4 py-2 rounded-full text-sm font-bold bg-blue-50 text-blue-600">
              {formatCurrency(order.total_amount)}
            </span>
          </div>

          {/* Notes */}
          {order.notes && (
            <div className="bg-yellow-50 p-4 rounded-xl border border-yellow-100 mb-6">
              <p className="text-sm text-yellow-800 font-medium">
                <span className="font-bold">ملاحظات:</span> {order.notes}
              </p>
            </div>
          )}

          {/* Order Items */}
          <div className="mb-6">
            <h3 className="text-lg font-semibold mb-4">المنتجات ({order.order_items.length})</h3>
            <div className="space-y-3">
              {order.order_items.map((item, idx) => (
                <OrderItemDetail key={idx} item={item} />
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="space-y-4">
            {/* Approval Status */}
            <div>
              {!order.approved_by ? (
                <Button
                  onClick={handleApproveOrder}
                  className="w-full bg-green-600 hover:bg-green-700 text-white font-bold h-12 rounded-xl shadow-sm"
                >
                  <CheckCircle className="ml-2 h-5 w-5" />
                  موافقة على الطلب
                </Button>
              ) : (
                <div className="w-full bg-green-50 border border-green-200 text-green-700 font-bold h-12 rounded-xl flex items-center justify-center">
                  <CheckCircle className="ml-2 h-4 w-4" />
                  تمت الموافقة من قبلك
                </div>
              )}
            </div>

            <div className="flex gap-2">
              <Select
                value={order.status}
                onValueChange={handleStatusChange}
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
                      onClick={handleDeleteOrder}
                      className="bg-destructive hover:bg-destructive/90"
                    >
                      حذف
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>

            {/* WhatsApp */}
            {order.customer_phone && (
              <Button
                variant="ghost"
                className="w-full text-green-600 hover:text-green-700 hover:bg-green-50 h-10 rounded-xl"
                onClick={handleSendWhatsApp}
              >
                <MessageCircle size={16} className="ml-2" />
                تواصل عبر واتساب
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
