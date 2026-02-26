import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useOrderStore } from '@/stores/useOrderStore';
import { Order } from '@/types/order';
import { Clock, Phone, Mail, Package, User, Trash2, MessageCircle, CheckCircle, Fingerprint, LogOut, ChevronDown, ChevronUp, Smartphone, Globe, MapPin } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { formatCurrency } from '@/lib/currency';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import { useAttendanceStore } from '@/stores/useAttendanceStore';

// CSS for ripple effect
const rippleStyles = `
  .ripple {
    position: absolute;
    border-radius: 50%;
    background: rgba(255, 255, 255, 0.6);
    transform: scale(0);
    animation: ripple-animation 0.6s ease-out;
    pointer-events: none;
  }
  
  .ripple-icon {
    position: absolute;
    border-radius: 50%;
    background: rgba(255, 255, 255, 0.8);
    transform: scale(0);
    animation: ripple-icon-animation 0.8s ease-out;
    pointer-events: none;
    z-index: 20;
  }
  
  @keyframes ripple-animation {
    to {
      transform: scale(4);
      opacity: 0;
    }
  }
  
  @keyframes ripple-icon-animation {
    0% {
      transform: scale(0);
      opacity: 1;
      background: rgba(255, 255, 255, 0.8);
    }
    50% {
      transform: scale(2);
      opacity: 0.6;
      background: rgba(34, 197, 94, 0.4);
    }
    100% {
      transform: scale(3);
      opacity: 0;
      background: rgba(34, 197, 94, 0.2);
    }
  }
  
  .check-icon {
    position: relative;
    transition: all 0.3s ease;
  }
  
  .check-icon:hover {
    transform: scale(1.1);
  }
`;

// Inject styles into head
if (typeof document !== 'undefined' && !document.getElementById('ripple-styles')) {
  const styleSheet = document.createElement('style');
  styleSheet.id = 'ripple-styles';
  styleSheet.textContent = rippleStyles;
  document.head.appendChild(styleSheet);
}

// Helper component for rendering an expandable order items list
const OrderItemsAccordion = ({ items, orderId }: { items: any[], orderId: string }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [checklist, setChecklist] = useState<Record<string, boolean>>({});

  const toggleCheck = (index: number) => {
    setChecklist(prev => ({
      ...prev,
      [`${orderId}_${index}`]: !prev[`${orderId}_${index}`]
    }));
  };

  const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);
  const checkedItems = Object.values(checklist).filter(Boolean).length;
  const isFullyChecked = checkedItems === items.length && items.length > 0;

  return (
    <div className={cn(
      "w-full mt-2 border-none rounded-xl overflow-hidden transition-all shadow-neu",
      isFullyChecked ? "bg-green-50/50 shadow-neu-inset" : "bg-background"
    )}>
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className={cn(
          "w-full px-4 py-3 flex items-center justify-between text-sm font-bold transition-colors",
          isFullyChecked ? "bg-green-50 text-green-700 hover:bg-green-100" : "text-blue-700 bg-blue-50/50 hover:bg-blue-50"
        )}
      >
        <span className="flex items-center gap-2">
          {isFullyChecked ? (
            <CheckCircle size={18} className="text-green-500" />
          ) : (
            <Package size={16} className={isExpanded ? "text-blue-600" : "text-blue-400"} />
          )}
          تفاصيل الطلب ({totalItems} عناصر)
        </span>
        <div className="flex items-center gap-3">
          {checkedItems > 0 && <span className="text-xs font-medium opacity-75">{checkedItems}/{items.length} محزم</span>}
          {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </div>
      </button>

      {
        isExpanded && (
          <div className="p-1.5 bg-background shadow-neu-inset rounded-2xl flex flex-col gap-1.5 border-none mt-2">
            {items.map((item, idx) => (
              <label
                key={idx}
                className={cn(
                  "flex items-center gap-2 p-2 rounded-lg border-none cursor-pointer transition-all bg-background select-none",
                  checklist[`${orderId}_${idx}`] ? "shadow-neu-inset bg-green-50/40" : "shadow-neu hover:shadow-neu-sm"
                )}
              >
                <div className="flex items-center justify-center p-0.5">
                  <input
                    type="checkbox"
                    checked={checklist[`${orderId}_${idx}`] || false}
                    onChange={() => toggleCheck(idx)}
                    className="w-4 h-4 text-green-600 rounded border-gray-300 focus:ring-green-500 shadow-sm transition-all"
                  />
                </div>

                {item.product?.image ? (
                  <div className="w-8 h-8 rounded-lg bg-background flex-shrink-0 overflow-hidden border-none p-0.5 shadow-neu-inset">
                    <img src={item.product.image} alt={item.product.name} className="w-full h-full object-contain" />
                  </div>
                ) : (
                  <div className="w-8 h-8 rounded-lg bg-background flex items-center justify-center text-gray-400 flex-shrink-0 border-none shadow-neu-inset">
                    <Package size={14} />
                  </div>
                )}

                <div className="flex-1 min-w-0 flex items-center justify-between">
                  <div className="flex flex-col">
                    <p className={cn(
                      "text-xs font-bold truncate transition-all duration-300",
                      checklist[`${orderId}_${idx}`] ? "text-gray-500 line-through decoration-2 decoration-green-500/50" : "text-gray-900"
                    )}>
                      {item.product?.name}
                    </p>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className={cn(
                        "text-[10px] font-semibold px-2 py-0.5 rounded-md transition-colors bg-background border-none shadow-neu-inset",
                        checklist[`${orderId}_${idx}`] ? "text-green-600" : "text-gray-500"
                      )}>
                        الكمية: {item.quantity}
                      </span>
                      {item.quantity > 1 && (
                        <span className="text-[10px] font-medium text-gray-400">
                          ({formatCurrency(item.unit_price)} للقطعة)
                        </span>
                      )}
                    </div>
                  </div>
                  <span className="text-xs font-bold text-blue-600 mr-2 whitespace-nowrap">
                    {formatCurrency(item.total_price)}
                  </span>
                </div>
              </label>
            ))}
          </div>
        )
      }
    </div >
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

import { Capacitor } from '@capacitor/core';
// BiometricAuth imported dynamically inside handleClockIn to avoid web crash

export function OrderManagement({ scannedOrderId }: { scannedOrderId?: string }) {
  // Production mode - real attendance system
  const DEBUG_MODE = false;

  const navigate = useNavigate();
  const { orders, loading, fetchOrders, updateOrderStatus, deleteOrder, approveOrder } = useOrderStore();
  const { isClockedIn, clockIn, clockOut, profiles, fetchProfiles, checkStatus, userPin, updatePin } = useAttendanceStore();
  const { toast } = useToast();
  const [deletingOrderId, setDeletingOrderId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Debug logging
  console.log('OrderManagement render:', { isClockedIn, loading, ordersCount: orders.length, profilesCount: profiles.length, DEBUG_MODE });

  // PIN Verification State
  const [pinDialogOpen, setPinDialogOpen] = useState(false);
  const [pinInput, setPinInput] = useState('');

  // Web Audio API for reliable notification sound
  const audioCtxRef = useRef<AudioContext | null>(null);
  const audioBufferRef = useRef<AudioBuffer | null>(null);

  // Create PIN State
  const [createPinDialogOpen, setCreatePinDialogOpen] = useState(false);
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');

  useEffect(() => {
    console.log('OrderManagement useEffect - checking status and fetching profiles');
    const init = async () => {
      try {
        await checkStatus();
        await fetchProfiles();
        // Always fetch orders on mount regardless of attendance status
        await fetchOrders();
      } catch (err) {
        console.error('Initialization error:', err);
        setError('Failed to initialize attendance system');
      }
    };
    init();
  }, [checkStatus, fetchProfiles, fetchOrders]);

  // If there's an error, show error screen
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6 text-center px-4">
        <div className="p-6 bg-red-50 rounded-full">
          <Package size={64} className="text-red-500" />
        </div>
        <div className="space-y-2">
          <h2 className="text-2xl font-bold text-gray-900">حدث خطأ</h2>
          <p className="text-gray-500 max-w-sm mx-auto">
            {error}
          </p>
        </div>
        <Button onClick={() => window.location.reload()} variant="outline">
          إعادة تحميل الصفحة
        </Button>
      </div>
    );
  }

  const performClockIn = async () => {
    // Request browser notification permission on web
    if (!Capacitor.isNativePlatform() && 'Notification' in window && Notification.permission === 'default') {
      await Notification.requestPermission();
    }

    // Init Web Audio API and pre-load sound (user gesture unlocks AudioContext)
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      audioCtxRef.current = ctx;
      const response = await fetch('/notification_sound.mp3');
      const arrayBuffer = await response.arrayBuffer();
      audioBufferRef.current = await ctx.decodeAudioData(arrayBuffer);
      console.log('🔊 Notification sound loaded successfully');
    } catch (e) {
      console.warn('Audio pre-load failed:', e);
    }

    const result = await clockIn();
    if (result.success) {
      toast({
        title: "تم تسجيل الحضور",
        description: "أهلاً بك! يمكنك الآن إدارة الطلبات.",
        className: "bg-green-500 text-white border-none"
      });
    } else {
      toast({
        title: "خطأ",
        description: result.error || "حدث خطأ أثناء تسجيل الحضور",
        variant: "destructive",
      });
    }
  };

  const verifyPin = async () => {
    // Default PIN fallback is removed as per request for Real PIN
    // But we gracefully handle if userPin is missing (should not happen due to check in handleClockIn)
    const correctPin = userPin;

    if (pinInput === correctPin) {
      setPinDialogOpen(false);
      await performClockIn();
    } else {
      toast({
        title: "رمز غير صحيح",
        description: "برجاء التأكد من الرمز السري والمحاولة مرة أخرى",
        variant: "destructive"
      });
    }
  };

  const handleCreatePin = async () => {
    if (newPin.length < 4) {
      toast({
        title: "رمز قصير جداً",
        description: "يجب أن يتكون الرمز من 4 أرقام على الأقل",
        variant: "destructive"
      });
      return;
    }
    if (newPin !== confirmPin) {
      toast({
        title: "الرموز غير متطابقة",
        description: "تأكد من إدخال نفس الرمز في الخانتين",
        variant: "destructive"
      });
      return;
    }

    const result = await updatePin(newPin);
    if (result.success) {
      setCreatePinDialogOpen(false);
      toast({
        title: "تم إنشاء الرمز",
        description: "تم حفظ الرمز السري بنجاح. جاري تسجيل الدخول...",
        className: "bg-green-500 text-white border-none"
      });
      // Proceed to clock in immediately after creating PIN
      await performClockIn();
    } else {
      toast({
        title: "خطأ",
        description: result.error || "فشل إنشاء الرمز",
        variant: "destructive"
      });
    }
  };

  const handleClockIn = async () => {
    try {
      // Check if we are on a native platform (Android/iOS)
      if (Capacitor.isNativePlatform()) {
        // Dynamically import biometric auth only on native platforms
        const { BiometricAuth } = await import('@aparajita/capacitor-biometric-auth');
        const bioResult = await BiometricAuth.checkBiometry();

        if (bioResult.isAvailable) {
          await BiometricAuth.authenticate({
            reason: 'يرجى تأكيد الهوية لتسجيل الدخول',
            androidTitle: 'تسجيل الحضور',
            androidSubtitle: 'استخدم البصمة أو رمز PIN',
            cancelTitle: 'إلغاء',
            allowDeviceCredential: true, // Allows PIN/Pattern fallback
          });
        }
        // If biometric success, proceed to clock in
        await performClockIn();
      } else {
        // Web Platform: Check if user has a PIN
        if (!userPin) {
          // User needs to create a PIN first
          setNewPin('');
          setConfirmPin('');
          setCreatePinDialogOpen(true);
        } else {
          // User has PIN, ask for verification
          setPinInput('');
          setPinDialogOpen(true);
        }
      }
    } catch (error: any) {
      const isBiometryError = error?.constructor?.name === 'BiometryError';
      if (isBiometryError) {
        // Handle biometric specific errors
        console.error('Biometric Error:', error);
        toast({
          title: "فشل التحقق",
          description: "لم يتم التحقق من الهوية بنجاح. حاول مرة أخرى.",
          variant: "destructive",
        });
      } else {
        console.error('Clock In Error:', error);
        toast({
          title: "خطأ",
          description: "حدث خطأ غير متوقع",
          variant: "destructive",
        });
      }
    }
  };

  const handleClockOut = async () => {
    const result = await clockOut();
    if (result.success) {
      toast({
        title: "تم تسجيل الخروج",
        description: "تم تسجيل انصرافك بنجاح.",
      });
      // Removed navigation to home page - user stays on orders page
    }
  };

  const handleApproveOrder = async (orderId: string, event?: React.MouseEvent) => {
    // Create ripple effect on the check icon
    if (event) {
      const button = event.currentTarget as HTMLElement;
      const checkIcon = button.querySelector('.check-icon') as HTMLElement;

      if (checkIcon) {
        const ripple = document.createElement('span');
        const rect = checkIcon.getBoundingClientRect();
        const size = 40; // Fixed size for the icon ripple
        const x = event.clientX - rect.left - size / 2;
        const y = event.clientY - rect.top - size / 2;

        ripple.style.width = ripple.style.height = size + 'px';
        ripple.style.left = x + 'px';
        ripple.style.top = y + 'px';
        ripple.classList.add('ripple-icon');

        checkIcon.appendChild(ripple);

        setTimeout(() => {
          ripple.remove();
        }, 600);
      }
    }

    try {
      const result = await approveOrder(orderId);
      if (result.success) {
        toast({
          title: "تمت الموافقة",
          description: "تمت الموافقة على الطلب بنجاح وأصبح في قائمتك",
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

  // Set up real-time order subscription
  useEffect(() => {
    if (DEBUG_MODE || isClockedIn) {
      const channel = supabase
        .channel('orders')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'orders'
          },
          (payload) => {
            console.log('Order change received:', payload);
            fetchOrders();

            // Play notification sound for new orders
            if (payload.eventType === 'INSERT') {
              try {
                if (audioCtxRef.current && audioBufferRef.current) {
                  if (audioCtxRef.current.state === 'suspended') {
                    audioCtxRef.current.resume();
                  }
                  const source = audioCtxRef.current.createBufferSource();
                  source.buffer = audioBufferRef.current;
                  source.connect(audioCtxRef.current.destination);
                  source.start(0);
                }
              } catch (e) {
                console.warn('Audio playback error:', e);
              }

              // Browser notification (Web only)
              if (!Capacitor.isNativePlatform() && 'Notification' in window && Notification.permission === 'granted') {
                const orderData = payload.new as any;
                const notification = new Notification('🔔 طلب جديد!', {
                  body: `طلب جديد من ${orderData?.customer_name || 'عميل'} بقيمة ${orderData?.total_amount || ''}`,
                  icon: '/favicon.ico',
                  tag: 'new-order-' + orderData?.id,
                });
                // Auto close after 5 seconds
                setTimeout(() => notification.close(), 5000);
                // Focus window when clicking notification
                notification.onclick = () => {
                  window.focus();
                  notification.close();
                };
              }
            } else if (payload.eventType === 'UPDATE') {
              const oldData = payload.old as any;
              const newData = payload.new as any;

              if (newData.status && oldData.status && newData.status !== oldData.status) {
                const getStatusText = (status: string) => {
                  switch (status) {
                    case 'pending': return 'قيد الانتظار';
                    case 'processing': return 'قيد التجهيز';
                    case 'completed': return 'مكتمل';
                    case 'cancelled': return 'ملغي';
                    default: return status;
                  }
                };

                // Browser notification (Web only)
                if (!Capacitor.isNativePlatform() && 'Notification' in window && Notification.permission === 'granted') {
                  const notification = new Notification('🔄 تحديث حالة الطلب!', {
                    body: `تم تحديث حالة طلب ${newData.customer_name || 'العميل'} إلى: ${getStatusText(newData.status)}`,
                    icon: '/favicon.ico',
                    tag: 'update-order-' + newData.id,
                  });
                  // Auto close after 5 seconds
                  setTimeout(() => notification.close(), 5000);
                  // Focus window when clicking notification
                  notification.onclick = () => {
                    window.focus();
                    notification.close();
                  };
                }

                // Also show a toast in app
                toast({
                  title: 'تحديث حالة الطلب',
                  description: `طلب ${newData.customer_name || 'العميل'} أصبح ${getStatusText(newData.status)}`,
                });
              }
            }
          }
        )
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'order_items'
          },
          async (payload) => {
            console.log('Order item added:', payload);
            fetchOrders();

            const newItem = payload.new as any;

            // Play notification sound
            try {
              if (audioCtxRef.current && audioBufferRef.current) {
                if (audioCtxRef.current.state === 'suspended') {
                  audioCtxRef.current.resume();
                }
                const source = audioCtxRef.current.createBufferSource();
                source.buffer = audioBufferRef.current;
                source.connect(audioCtxRef.current.destination);
                source.start(0);
              }
            } catch (e) {
              console.warn('Audio playback error:', e);
            }

            // Fetch product name and order for better notification
            const { data: productData } = await supabase
              .from('products')
              .select('name')
              .eq('id', newItem.product_id)
              .single();

            const { data: orderData } = await supabase
              .from('orders')
              .select('customer_name')
              .eq('id', newItem.order_id)
              .single();

            const productName = productData?.name || 'منتج جديد';
            const customerName = orderData?.customer_name || 'عميل';

            // Browser notification (Web only)
            if (!Capacitor.isNativePlatform() && 'Notification' in window && Notification.permission === 'granted') {
              const notification = new Notification('📦 منتج إضافي للطلب!', {
                body: `قام ${customerName} بإضافة: ${productName} (الكمية: ${newItem.quantity}) إلى طلبه`,
                icon: '/favicon.ico',
                tag: 'new-item-' + newItem.id,
              });
              // Auto close after 5 seconds
              setTimeout(() => notification.close(), 5000);
              // Focus window when clicking notification
              notification.onclick = () => {
                window.focus();
                notification.close();
              };
            }

            // Also show a toast in app
            toast({
              title: 'إضافة للطلب الحالي',
              description: `قام ${customerName} بإضافة ${productName} للطلب`,
            });
          }
        )
        .subscribe();

      const profilesChannel = supabase
        .channel('profiles-updates')
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'profiles'
          },
          (payload) => {
            console.log('Profile update received:', payload);
            fetchProfiles();
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
        supabase.removeChannel(profilesChannel);
      };
    }
  }, [fetchOrders, fetchProfiles, toast, isClockedIn, DEBUG_MODE]);

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

    toast({
      title: "تم فتح واتساب",
      description: "يرجى الضغط على إرسال في نافذة واتساب",
    });
  };

  if (DEBUG_MODE) {
    console.log('DEBUG MODE: Showing orders interface regardless of attendance');
    // Continue to render the orders interface
  } else if (!isClockedIn && profiles.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6 text-center px-4">
        <div className="p-6 bg-background shadow-neu rounded-full animate-pulse border-none">
          <Fingerprint size={64} className="text-gray-400" />
        </div>
        <div className="space-y-2">
          <h2 className="text-2xl font-bold text-gray-900">جاري التحميل...</h2>
          <p className="text-gray-500 max-w-sm mx-auto">
            يرجى الانتظار بينما يتم التحقق من حالة الحضور.
          </p>
        </div>
        {/* Fallback button to bypass attendance check */}
        <Button
          onClick={() => {
            console.log('Bypassing attendance check for debugging');
            setError(null);
          }}
          variant="outline"
          className="mt-4"
        >
          تجاوز التحقق من الحضور
        </Button>
      </div>
    );
  }

  if (!DEBUG_MODE && !isClockedIn) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6 text-center px-4">
        <div className="p-6 bg-red-50 rounded-full animate-pulse">
          <Fingerprint size={64} className="text-red-500" />
        </div>
        <div className="space-y-2">
          <h2 className="text-2xl font-bold text-gray-900">تسجيل الحضور مطلوب</h2>
          <p className="text-gray-500 max-w-sm mx-auto">
            يجب عليك تسجيل بصمتك (الحضور) للتمكن من إدارة الطلبات والدخول للنظام.
          </p>
        </div>
        <Button
          onClick={handleClockIn}
          size="lg"
          className="bg-red-600 hover:bg-red-700 text-white rounded-2xl h-14 px-8 text-lg font-bold shadow-lg shadow-red-200"
        >
          <Fingerprint className="mr-2 h-6 w-6" />
          بصمة الدخول
        </Button>

        {/* PIN Verification Dialog */}
        <Dialog open={pinDialogOpen} onOpenChange={setPinDialogOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="text-center">أدخل رمز الدخول</DialogTitle>
            </DialogHeader>
            <div className="flex flex-col items-center gap-4 py-4">
              <div className="w-full">
                <Input
                  type="password"
                  placeholder="أدخل الرمز"
                  className="text-center text-lg tracking-widest"
                  value={pinInput}
                  onChange={(e) => setPinInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') verifyPin();
                  }}
                />
              </div>
              <Button onClick={verifyPin} className="w-full">
                تأكيد الدخول
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Create PIN Dialog */}
        <Dialog open={createPinDialogOpen} onOpenChange={setCreatePinDialogOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="text-center">إنشاء رمز دخول جديد</DialogTitle>
            </DialogHeader>
            <div className="flex flex-col items-center gap-4 py-4">
              <p className="text-sm text-gray-500 text-center">
                لم تقم بإعداد رمز للدخول بعد. قم بإنشاء رمز جديد لاستخدامه عند الدخول من المتصفح.
              </p>
              <div className="w-full space-y-3">
                <Input
                  type="password"
                  placeholder="الرمز الجديد (4 أرقام على الأقل)"
                  className="text-center text-lg tracking-widest"
                  value={newPin}
                  onChange={(e) => setNewPin(e.target.value)}
                />
                <Input
                  type="password"
                  placeholder="تأكيد الرمز"
                  className="text-center text-lg tracking-widest"
                  value={confirmPin}
                  onChange={(e) => setConfirmPin(e.target.value)}
                />
              </div>
              <Button onClick={handleCreatePin} className="w-full">
                حفظ وتسجيل الدخول
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Presence Bar (Circles) - Admins Only */}
      <div className="flex items-center gap-3 overflow-x-auto pb-4 scrollbar-hide">
        <div className="flex -space-x-3 space-x-reverse min-h-[50px] items-center px-2">
          {profiles.filter(profile => profile.role === 'admin').map((profile) => {
            // Check if admin is clocked in from database or locally
            const attendanceKey = `attendance_${profile.user_id}`;
            const attendanceData = localStorage.getItem(attendanceKey);
            const isClockedInLocal = attendanceData ? JSON.parse(attendanceData).clockedIn : false;
            const isClockedIn = profile.is_clocked_in === true || isClockedInLocal;

            return (
              <div key={profile.id} className="relative group">
                <div className={cn(
                  "w-12 h-12 rounded-full border-none flex items-center justify-center bg-background text-xs font-bold transition-transform hover:scale-110 hover:z-10",
                  isClockedIn ? "shadow-neu-inset text-green-600" : "shadow-neu text-gray-400 grayscale"
                )}>
                  {profile.full_name ? profile.full_name.charAt(0).toUpperCase() : '?'}
                </div>
                {isClockedIn && (
                  <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white rounded-full"></span>
                )}
              </div>
            );
          })}
        </div>
        <div className="h-8 w-px bg-gray-200 mx-2"></div>
        <Button
          onClick={handleClockOut}
          variant="outline"
          size="sm"
          className="text-red-500 hover:text-red-600 hover:bg-red-50 border-red-100 rounded-xl"
        >
          <LogOut size={14} className="mr-1" />
          مغادرة
        </Button>
      </div>

      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">إدارة الطلبات</h1>
        <Button onClick={fetchOrders} variant="outline">
          تحديث
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="text-lg">جاري تحميل الطلبات...</div>
        </div>
      ) : orders.length === 0 ? (
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
            const isScannedOrder = scannedOrderId && order.id.includes(scannedOrderId);

            return (
              <div key={order.id} className={cn(
                "group relative bg-background rounded-[2rem] p-6 shadow-neu hover:shadow-neu-sm transition-all border-none flex flex-col gap-4",
                isScannedOrder ? "ring-2 ring-primary shadow-neu-inset animate-pulse" : ""
              )}>
                {/* Scanned Order Badge */}
                {isScannedOrder && (
                  <div className="absolute -top-2 -right-2 bg-blue-500 text-white px-3 py-1 rounded-full text-xs font-bold z-10">
                    تم المسح
                  </div>
                )}
                {/* Header: Icon + Title + Date */}
                <div className="flex justify-between items-start">
                  <div className="flex gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-background flex items-center justify-center text-primary shadow-neu-inset border-none">
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
                  <div className="flex flex-col items-end gap-2">
                    <span className="text-xs font-semibold text-gray-400 bg-background shadow-neu-inset px-3 py-1 rounded-full border-none">
                      {new Date(order.created_at).toLocaleDateString('ar-SA')}
                    </span>
                    {order.source && (
                      <span className={cn(
                        "flex items-center gap-1 text-[10px] font-bold px-3 py-1 rounded-full shadow-neu-inset bg-background border-none",
                        order.source === 'android' ? "text-green-600" : "text-blue-600"
                      )}>
                        {order.source === 'android' ? <Smartphone size={12} /> : <Globe size={12} />}
                        {order.source === 'android' ? 'موبايل' : 'موقع'}
                      </span>
                    )}
                  </div>
                </div>

                {/* Tags/Pills */}
                <div className="flex flex-wrap gap-2 items-center">
                  <span className={cn("px-4 py-1.5 rounded-full text-xs font-bold shadow-neu-inset bg-background border-none", statusColors[order.status].replace('bg-', 'text-'))}>
                    {statusLabels[order.status]}
                  </span>
                  <span className="px-4 py-1.5 rounded-full text-xs font-bold bg-background shadow-neu-inset text-gray-600 border-none">
                    {itemCount} عناصر
                  </span>
                  <span className="px-4 py-1.5 rounded-full text-xs font-bold bg-background shadow-neu-inset text-primary border-none">
                    {formatCurrency(order.total_amount)}
                  </span>
                  {/* Removed Location button as requested */}
                </div>

                {/* Order Items Expandable Checklist */}
                <OrderItemsAccordion items={order.order_items} orderId={order.id} />

                {/* Notes Section */}
                {order.notes && (
                  <div className="bg-background shadow-neu-inset p-3 sm:p-4 rounded-xl border-none">
                    <p className="text-xs text-yellow-600 font-bold flex items-center gap-2">
                      <span className="font-extrabold text-yellow-500">ملاحظات:</span> {order.notes}
                    </p>
                  </div>
                )}

                {/* Actions Button (Large Blue) */}
                <div className="pt-2">
                  {/* Approval Status / Button */}
                  <div className="mb-3">
                    {!order.approved_by ? (
                      <Button
                        onClick={(event) => handleApproveOrder(order.id, event)}
                        className="w-full bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white font-bold h-12 rounded-xl shadow-lg hover:shadow-green-500/25 transform transition-all duration-300 hover:scale-105 active:scale-95 relative overflow-hidden group"
                      >
                        {/* Shimmer effect on hover */}
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700 ease-out"></div>

                        {/* Click ripple effect */}
                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                          <div className="ripple-container"></div>
                        </div>

                        <CheckCircle className="mr-2 h-5 w-5 relative z-10 check-icon" />
                        <span className="relative z-10">موافقة على الطلب</span>
                      </Button>
                    ) : (
                      <div className="w-full bg-gradient-to-r from-green-50 to-green-100 border border-green-200 text-green-700 font-bold h-10 rounded-xl flex items-center justify-center relative overflow-hidden">
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-green-200/30 to-transparent -translate-x-full animate-pulse"></div>
                        <CheckCircle className="mr-2 h-4 w-4 relative z-10" />
                        <span className="relative z-10">تمت الموافقة من قبلك</span>
                      </div>
                    )}
                  </div>

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
      {/* PIN Verification Dialog - Rendered here too in case checks happen while on this screen */}
      <Dialog open={pinDialogOpen} onOpenChange={setPinDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-center">أدخل رمز الدخول</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col items-center gap-4 py-4">
            <div className="w-full">
              <Input
                type="password"
                placeholder="أدخل الرمز"
                className="text-center text-lg tracking-widest"
                value={pinInput}
                onChange={(e) => setPinInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') verifyPin();
                }}
              />
            </div>
            <Button onClick={verifyPin} className="w-full">
              تأكيد الدخول
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}