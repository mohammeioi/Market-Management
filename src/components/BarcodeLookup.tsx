import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Camera } from "lucide-react";
import { BarcodeScanner } from "@/components/BarcodeScanner";
import { useProductStore } from "@/stores/useProductStore";
import { useToast } from "@/hooks/use-toast";

export function BarcodeLookup() {
  const [showScanner, setShowScanner] = useState(false);
  const { products } = useProductStore();
  const { toast } = useToast();

  const handleBarcodeScanned = (barcode: string) => {
    setShowScanner(false);
    
    // البحث عن المنتج بالباركود
    const product = products.find(p => p.barcode === barcode);
    
    if (product) {
      toast({
        title: "تم العثور على المنتج",
        description: `${product.name} - ${product.price.toLocaleString()} د.ع`,
      });
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
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="text-right flex items-center gap-2">
            <Camera size={20} />
            البحث بالباركود
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Button 
            onClick={() => setShowScanner(true)}
            className="w-full"
          >
            <Camera size={16} className="mr-2" />
            مسح الباركود للبحث عن السعر
          </Button>
        </CardContent>
      </Card>

      <BarcodeScanner
        isOpen={showScanner}
        onScan={handleBarcodeScanned}
        onClose={() => setShowScanner(false)}
      />
    </>
  );
}