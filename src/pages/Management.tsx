import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { ProductManagement } from "@/components/ProductManagement";

export function Management() {
  const navigate = useNavigate();

  return (
    <div className="p-6" dir="rtl">
      <div className="max-w-6xl mx-auto">
        <ProductManagement />
      </div>
    </div>
  );
}