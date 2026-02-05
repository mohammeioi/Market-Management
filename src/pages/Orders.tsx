import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { OrderManagement } from "@/components/OrderManagement";

export function Orders() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background p-6" dir="rtl">
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
        </div>
        <OrderManagement />
      </div>
    </div>
  );
}