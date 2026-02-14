import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { ScanBarcode } from "lucide-react";
import { BarcodeScanner } from "@/components/BarcodeScanner";
import { useSupabaseProductStore } from "@/stores/useSupabaseProductStore";
import { useToast } from "@/hooks/use-toast";

export function BarcodeLookup() {
  const [showScanner, setShowScanner] = useState(false);
  const { products } = useSupabaseProductStore();
  const { toast } = useToast();

  const handleBarcodeScanned = (barcode: string) => {
    setShowScanner(false);

    // Search for product by barcode
    const product = products.find(p => p.barcode === barcode);

    if (product) {
      toast({
        title: "تم العثور على المنتج",
        description: `${product.name} - ${product.price.toLocaleString()} د.ع`,
        className: "bg-green-50 border-green-200"
      });
      // Optionally we could trigger the details dialog here if we had access to it
    } else {
      toast({
        title: "المنتج غير موجود",
        description: `لا يوجد منتج بالباركود: ${barcode}`,
        variant: "destructive"
      });
    }
  };

  return (
    <>
      <Button
        onClick={() => setShowScanner(true)}
        variant="outline"
        className="h-11 w-11 p-0 shrink-0 rounded-xl border-gray-200 hover:bg-gray-50 hover:text-primary"
        title="بحث بالباركود"
      >
        <ScanBarcode size={20} />
      </Button>

      <BarcodeScanner
        isOpen={showScanner}
        onScan={handleBarcodeScanned}
        onClose={() => setShowScanner(false)}
      />
    </>
  );
}