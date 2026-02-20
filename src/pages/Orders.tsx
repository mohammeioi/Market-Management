import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import { OrderManagement } from "@/components/OrderManagement";
import { useEffect } from "react";

export function Orders() {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    // Check if there's a scanned order ID in the navigation state
    if (location.state?.scannedOrderId) {
      console.log('Scanned Order ID:', location.state.scannedOrderId);
      // The OrderManagement component will handle highlighting/filtering the scanned order
    }
  }, [location.state]);

  return (
    <div className="p-6" dir="rtl">
      <div className="max-w-6xl mx-auto">
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
                تم مسح الطلب رقم: {location.state.scannedOrderId.slice(0, 8)}
              </p>
            </div>
          )}
        </div>
        <OrderManagement scannedOrderId={location.state?.scannedOrderId} />
      </div>
    </div>
  );
}