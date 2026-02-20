import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { ProductManagement } from "@/components/ProductManagement";
import { useState } from "react";
import { NotificationService } from "@/services/NotificationService";
import { toast } from "sonner";

export function Management() {
  const navigate = useNavigate();
  const [showDebug, setShowDebug] = useState(false);
  const [token, setToken] = useState(NotificationService.getStoredToken());

  return (
    <div className="p-6 space-y-8" dir="rtl">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">إدارة المنتجات</h1>
          <Button variant="outline" onClick={() => setShowDebug(!showDebug)}>
            {showDebug ? 'إخفاء أدوات المطور' : 'أدوات المطور'}
          </Button>
        </div>

        {showDebug && (
          <div className="bg-gray-100 p-4 rounded-lg mb-6 ltr">
            <h3 className="font-bold mb-2">Notification Debugger</h3>
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2">
                <span>Push Token:</span>
                <span className={token ? "text-green-600 font-mono" : "text-red-600"}>
                  {token ? "Present" : "Missing"}
                </span>
                {token && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      navigator.clipboard.writeText(token);
                      toast.success("Token copied");
                    }}
                  >
                    Copy
                  </Button>
                )}
              </div>
              <div className="flex gap-2 mt-4">
                <Button size="sm" onClick={() => NotificationService.testLocalNotification()}>
                  Test Local Notification
                </Button>
                <Button size="sm" variant="secondary" onClick={() => NotificationService.init()}>
                  Re-Init Service
                </Button>
                <Button size="sm" variant="secondary" onClick={() => {
                  const t = NotificationService.getStoredToken();
                  setToken(t);
                  toast.info("Refreshed: " + (t ? "Yes" : "No"));
                }}>
                  Refresh Status
                </Button>
              </div>
            </div>
          </div>
        )}

        <ProductManagement />
      </div>
    </div>
  );
}