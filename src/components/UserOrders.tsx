import React, { useEffect, useState } from 'react';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useOrderStore } from '@/stores/useOrderStore';
import { Order } from '@/types/order';
import { Clock, Phone, Mail, Package, MessageCircle } from 'lucide-react';
import { formatCurrency } from '@/lib/currency';
import { cn } from '@/lib/utils';
import { useAttendanceStore } from '@/stores/useAttendanceStore';

// Helper component for rendering an order item badge with image preview dialog and checklist
const OrderItemBadge = ({ item }: { item: any }) => {
  const [checklist, setChecklist] = useState<Record<string, boolean>>(() => {
    // Initialize checklist with all items unchecked
    const initial: Record<string, boolean> = {};
    if (item.quantity > 1) {
      for (let i = 1; i <= item.quantity; i++) {
        initial[`item_${i}`] = false;
      }
    }
    return initial;
  });

  const toggleCheck = (key: string) => {
    setChecklist(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  const checkedCount = Object.values(checklist).filter(Boolean).length;
  const isFullyChecked = item.quantity <= 1 ? true : checkedCount === item.quantity;

  return (
    <Dialog>
      <DialogTrigger asChild>
        <button className="px-3 py-1.5 rounded-xl border-none shadow-neu text-xs text-gray-600 font-medium bg-background hover:shadow-neu-sm active:shadow-neu-inset transition-all relative">
          {item.product?.name} × {item.quantity}
          {item.quantity > 1 && (
            <span className={cn(
              "absolute -top-1 -right-1 w-4 h-4 rounded-full text-xs font-bold",
              isFullyChecked ? "bg-green-500 text-white" : "bg-orange-500 text-white"
            )}>
              {checkedCount}/{item.quantity}
            </span>
          )}
        </button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            {item.product?.name}
            {item.quantity > 1 && (
              <span className={cn(
                "px-2 py-1 rounded-full text-xs font-bold",
                isFullyChecked ? "bg-green-100 text-green-700" : "bg-orange-100 text-orange-700"
              )}>
                {checkedCount}/{item.quantity} تم التحقق
              </span>
            )}
          </DialogTitle>
        </DialogHeader>
        <div className="flex flex-col items-center gap-4 py-4">
          {item.product?.image ? (
            <img
              src={item.product.image}
              alt={item.product.name}
              className="w-full max-h-48 object-contain rounded-lg shadow-sm hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => {
                // Open image in new tab for better viewing
                if (item.product.image) {
                  window.open(item.product.image, '_blank');
                }
              }}
            />
          ) : (
            <div className="w-32 h-32 bg-gray-100 rounded-lg flex items-center justify-center text-gray-400">
              <Package size={48} />
            </div>
          )}

          {/* Checklist for multiple quantities */}
          {item.quantity > 1 && (
            <div className="w-full space-y-2">
              <h4 className="text-sm font-medium text-gray-700 mb-2">قائمة التحقق:</h4>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {Array.from({ length: item.quantity }, (_, i) => (
                  <label key={i + 1} className="flex items-center gap-2 p-2 border rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
                    <input
                      type="checkbox"
                      checked={checklist[`item_${i + 1}`] || false}
                      onChange={() => toggleCheck(`item_${i + 1}`)}
                      className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                    />
                    <span className="text-sm font-medium">وحدة {i + 1}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          <div className="text-center space-y-2 w-full">
            <p className="text-lg font-bold text-blue-600">{formatCurrency(item.unit_price)}</p>
            <p className="text-sm text-gray-500">الكمية: {item.quantity}</p>
            <p className="text-lg font-semibold text-green-600">الإجمالي: {formatCurrency(item.total_price)}</p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

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

export function UserOrders() {
  const { orders, loading, fetchOrders } = useOrderStore();
  const { isClockedIn, profiles, fetchProfiles } = useAttendanceStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  useEffect(() => {
    if (isClockedIn) {
      fetchOrders();
      fetchProfiles();
    }
  }, [fetchOrders, fetchProfiles, isClockedIn]);

  // Filter orders based on search and status
  const filteredOrders = orders.filter(order => {
    const matchesSearch = searchTerm === '' ||
      order.customer_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (order.customer_phone && order.customer_phone.includes(searchTerm));

    const matchesStatus = statusFilter === 'all' || order.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const handleSendWhatsApp = (orderId: string, customerPhone: string, customerName: string, status: Order['status']) => {
    let phone = customerPhone.replace(/\D/g, '');
    if (phone.startsWith('0')) {
      phone = '964' + phone.substring(1);
    }
    if (!phone.startsWith('964') && phone.length <= 10) {
      phone = '964' + phone;
    }

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

    const whatsappUrl = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, '_blank');
  };

  // If not clocked in, show message
  if (!isClockedIn) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6 text-center px-4">
        <div className="p-6 bg-background shadow-neu-inset rounded-full">
          <Package size={64} className="text-gray-400" />
        </div>
        <div className="space-y-2">
          <h2 className="text-2xl font-bold text-gray-900">تسجيل الدخول مطلوب</h2>
          <p className="text-gray-500 max-w-sm mx-auto">
            يجب عليك تسجيل الدخول لمشاهدة الطلبات.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">الطلبات</h1>
        <Button onClick={fetchOrders} variant="outline">
          تحديث
        </Button>
      </div>

      {/* Search and Filter */}
      <div className="flex gap-4">
        <div className="flex-1">
          <Input
            placeholder="البحث بالاسم، رقم الطلب، أو الهاتف..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="text-right"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="الحالة" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">جميع الحالات</SelectItem>
            <SelectItem value="pending">في الانتظار</SelectItem>
            <SelectItem value="confirmed">مؤكد</SelectItem>
            <SelectItem value="preparing">قيد التحضير</SelectItem>
            <SelectItem value="ready">جاهز</SelectItem>
            <SelectItem value="delivered">تم التسليم</SelectItem>
            <SelectItem value="cancelled">ملغى</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Orders List */}
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="text-lg">جاري تحميل الطلبات...</div>
        </div>
      ) : filteredOrders.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-8 sm:py-12">
            <Package className="h-10 w-10 sm:h-12 sm:w-12 text-muted-foreground mb-4" />
            <h3 className="text-base sm:text-lg font-semibold mb-2">
              {searchTerm || statusFilter !== 'all' ? 'لا توجد طلبات مطابقة' : 'لا توجد طلبات'}
            </h3>
            <p className="text-sm text-muted-foreground text-center">
              {searchTerm || statusFilter !== 'all'
                ? 'لم يتم العثور على طلبات تطابق معايير البحث'
                : 'لم يتم استلام أي طلبات بعد'
              }
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3 sm:gap-4">
          {filteredOrders.map((order) => {
            const itemCount = order.order_items.reduce((sum, item) => sum + item.quantity, 0);

            return (
              <div key={order.id} className="group relative bg-background rounded-[2rem] p-6 shadow-neu hover:shadow-neu-sm transition-all border-none flex flex-col gap-4">
                {/* Header: Icon + Title + Date */}
                <div className="flex justify-between items-start">
                  <div className="flex gap-4">
                    <div className="w-12 h-12 rounded-[1.25rem] bg-background flex items-center justify-center text-primary shadow-neu">
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
                  <span className="text-xs font-semibold text-gray-500 bg-background shadow-neu-inset px-3 py-1 rounded-full">
                    {new Date(order.created_at).toLocaleDateString('ar-SA')}
                  </span>
                </div>

                {/* Tags/Pills */}
                <div className="flex flex-wrap gap-2">
                  <span className={cn("px-4 py-1.5 rounded-full text-xs font-bold border-none shadow-neu-inset bg-background", statusColors[order.status].replace('bg-', 'text-'))}>
                    {statusLabels[order.status]}
                  </span>
                  <span className="px-4 py-1.5 rounded-full text-xs font-bold bg-background shadow-neu-inset text-gray-600 border-none">
                    {itemCount} عناصر
                  </span>
                  <span className="px-4 py-1.5 rounded-full text-xs font-bold bg-background shadow-neu-inset text-primary border-none">
                    {formatCurrency(order.total_amount)}
                  </span>
                </div>

                {/* Order Items Preview */}
                <div className="flex flex-wrap gap-2">
                  {order.order_items.slice(0, 3).map((item, idx) => (
                    <OrderItemBadge key={idx} item={item} />
                  ))}

                  {order.order_items.length > 3 && (
                    <Dialog>
                      <DialogTrigger asChild>
                        <button className="px-3 py-1.5 rounded-xl border-none shadow-neu hover:shadow-neu-sm active:shadow-neu-inset text-xs text-gray-400 font-medium bg-background transition-all">
                          +{order.order_items.length - 3} المزيد
                        </button>
                      </DialogTrigger>
                      <DialogContent className="max-w-lg">
                        <DialogHeader>
                          <DialogTitle>تفاصيل الطلب #{order.id.slice(0, 8)}</DialogTitle>
                        </DialogHeader>
                        <div className="py-4">
                          <h4 className="mb-4 text-sm font-medium text-gray-500">المنتجات ({order.order_items.length})</h4>
                          <div className="flex flex-wrap gap-2">
                            {order.order_items.map((item, idx) => (
                              <OrderItemBadge key={idx} item={item} />
                            ))}
                          </div>
                        </div>
                      </DialogContent>
                    </Dialog>
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

                {/* WhatsApp Link */}
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
            );
          })}
        </div>
      )}
    </div>
  );
}
