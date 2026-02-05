import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, XCircle, Loader2, Wifi, WifiOff } from 'lucide-react';

export function ConnectionStatus() {
  const [status, setStatus] = useState<'checking' | 'connected' | 'disconnected' | 'auth-required'>('checking');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const checkConnection = async () => {
      try {
        setStatus('checking');
        setError(null);

        // Test basic connection
        const { error: connectionError } = await supabase
          .from('products')
          .select('count', { count: 'exact', head: true });

        if (connectionError) {
          if (connectionError.message.includes('JWT')) {
            setStatus('auth-required');
            setError('يرجى تسجيل الدخول للوصول إلى البيانات');
          } else {
            setStatus('disconnected');
            setError(connectionError.message);
          }
        } else {
          setStatus('connected');
        }
      } catch (error) {
        setStatus('disconnected');
        setError(error instanceof Error ? error.message : 'خطأ غير معروف');
      }
    };

    checkConnection();

    // Re-check connection every 30 seconds
    const interval = setInterval(checkConnection, 30000);

    return () => clearInterval(interval);
  }, []);

  const getStatusColor = () => {
    switch (status) {
      case 'connected': return 'bg-green-500';
      case 'disconnected': return 'bg-red-500';
      case 'auth-required': return 'bg-yellow-500';
      case 'checking': return 'bg-blue-500';
      default: return 'bg-gray-500';
    }
  };

  const getStatusIcon = () => {
    switch (status) {
      case 'connected': return <CheckCircle className="w-4 h-4" />;
      case 'disconnected': return <WifiOff className="w-4 h-4" />;
      case 'auth-required': return <XCircle className="w-4 h-4" />;
      case 'checking': return <Loader2 className="w-4 h-4 animate-spin" />;
      default: return <Wifi className="w-4 h-4" />;
    }
  };

  const getStatusText = () => {
    switch (status) {
      case 'connected': return 'متصل';
      case 'disconnected': return 'غير متصل';
      case 'auth-required': return 'مطلوب تسجيل دخول';
      case 'checking': return 'جاري الفحص...';
      default: return 'غير معروف';
    }
  };

  return (
    <div className="flex items-center gap-2">
      <Badge variant="outline" className={`${getStatusColor()} text-white border-0`}>
        {getStatusIcon()}
        <span className="ml-1">{getStatusText()}</span>
      </Badge>
      {error && (
        <span className="text-xs text-red-500 max-w-xs truncate" title={error}>
          {error}
        </span>
      )}
    </div>
  );
}