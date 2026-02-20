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
import { Clock, Phone, Mail, Package, User, Trash2, MessageCircle, CheckCircle, Fingerprint, LogOut } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { formatCurrency } from '@/lib/currency';
import { supabase } from '@/integrations/supabase/client';
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
        <button className="px-3 py-1.5 rounded-xl border border-gray-100 text-xs text-gray-600 font-medium bg-white hover:bg-gray-50 transition-colors relative">
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

  const handleApproveOrder = async (orderId: string) => {
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
            }
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [fetchOrders, toast, isClockedIn, DEBUG_MODE]);

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
        <div className="p-6 bg-gray-50 rounded-full animate-pulse">
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
            // Check if admin is clocked in via localStorage
            const attendanceKey = `attendance_${profile.user_id}`;
            const attendanceData = localStorage.getItem(attendanceKey);
            const isClockedIn = attendanceData ? JSON.parse(attendanceData).clockedIn : false;
            
            return (
              <div key={profile.id} className="relative group">
                <div className={cn(
                  "w-12 h-12 rounded-full border-2 flex items-center justify-center bg-gray-100 text-xs font-bold text-gray-600 shadow-sm transition-transform hover:scale-110 hover:z-10",
                  isClockedIn ? "border-green-500 bg-green-50 text-green-700" : "border-gray-200 grayscale"
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
                "group relative bg-white rounded-[2rem] p-6 shadow-sm hover:shadow-md transition-all border flex flex-col gap-4",
                isScannedOrder ? "border-blue-500 shadow-lg shadow-blue-200 animate-pulse" : "border-gray-100"
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
                    <OrderItemBadge key={idx} item={item} />
                  ))}

                  {order.order_items.length > 3 && (
                    <Dialog>
                      <DialogTrigger asChild>
                        <button className="px-3 py-1.5 rounded-xl border border-gray-100 text-xs text-gray-400 font-medium bg-gray-50 hover:bg-gray-100 transition-colors">
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

                {/* Actions Button (Large Blue) */}
                <div className="pt-2">
                  {/* Approval Status / Button */}
                  <div className="mb-3">
                    {!order.approved_by ? (
                      <Button
                        onClick={() => handleApproveOrder(order.id)}
                        className="w-full bg-green-600 hover:bg-green-700 text-white font-bold h-12 rounded-xl shadow-sm"
                      >
                        <CheckCircle className="mr-2 h-5 w-5" />
                        موافقة على الطلب
                      </Button>
                    ) : (
                      <div className="w-full bg-green-50 border border-green-200 text-green-700 font-bold h-10 rounded-xl flex items-center justify-center">
                        <CheckCircle className="mr-2 h-4 w-4" />
                        تمت الموافقة من قبلك
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