import { useState, useRef, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Camera, X, Sparkles } from "lucide-react";
import BarcodeScannerComponent from 'react-qr-barcode-scanner';
import { Capacitor } from '@capacitor/core';
import { Camera as CapacitorCamera, CameraResultType, CameraSource } from '@capacitor/camera';
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface BarcodeScannerProps {
  onScan: (barcode: string) => void;
  onClose: () => void;
  isOpen: boolean;
}

export function BarcodeScanner({ onScan, onClose, isOpen }: BarcodeScannerProps) {
  const [scanning, setScanning] = useState(false);
  const [aiProcessing, setAiProcessing] = useState(false);
  const { toast } = useToast();

  const handleScan = (result: string) => {
    if (result) {
      onScan(result);
      setScanning(false);
    }
  };

  const handleError = (error: any) => {
    console.error('Barcode scanner error:', error);
  };

  const analyzeImageWithAI = async (imageData: string) => {
    setAiProcessing(true);
    try {
      const { data, error } = await supabase.functions.invoke('ai-barcode-detection', {
        body: { imageData }
      });

      if (error) throw error;

      if (data.barcode) {
        onScan(data.barcode);
        setScanning(false);
        setAiProcessing(false);
        
        if (data.product) {
          toast({
            title: "تم العثور على المنتج",
            description: `${data.product.name}\nالسعر: ${data.product.price.toLocaleString()} د.ع\nالمخزون: ${data.product.stock}`,
            duration: 5000,
          });
        } else {
          toast({
            title: "تم تحديد الباركود",
            description: `الباركود: ${data.barcode}\nولكن المنتج غير موجود في قاعدة البيانات`,
            variant: "destructive"
          });
        }
      } else {
        toast({
          title: "لم يتم العثور على باركود",
          description: data.message || "لم يتمكن الذكاء الاصطناعي من تحديد باركود في الصورة",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('خطأ في تحليل الصورة:', error);
      toast({
        title: "خطأ في التحليل",
        description: "فشل في تحليل الصورة بالذكاء الاصطناعي",
        variant: "destructive"
      });
    } finally {
      setAiProcessing(false);
    }
  };

  const startScanning = async () => {
    if (Capacitor.isNativePlatform()) {
      try {
        const image = await CapacitorCamera.getPhoto({
          quality: 90,
          allowEditing: false,
          resultType: CameraResultType.DataUrl,
          source: CameraSource.Camera,
        });
        
        if (image.dataUrl) {
          await analyzeImageWithAI(image.dataUrl);
        }
      } catch (error) {
        console.error('خطأ في الكاميرا:', error);
        toast({
          title: "خطأ في الكاميرا",
          description: "فشل في التقاط الصورة",
          variant: "destructive"
        });
      }
    } else {
      setScanning(true);
    }
  };

  const captureAndAnalyze = async () => {
    try {
      const video = document.querySelector('video');
      if (!video) return;

      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      ctx.drawImage(video, 0, 0);
      const imageData = canvas.toDataURL('image/jpeg', 0.8);
      
      await analyzeImageWithAI(imageData);
    } catch (error) {
      console.error('خطأ في التقاط الصورة:', error);
      toast({
        title: "خطأ في التقاط الصورة",
        description: "فشل في التقاط وتحليل الصورة",
        variant: "destructive"
      });
    }
  };

  const stopScanning = () => {
    setScanning(false);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-md bg-background">
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">قارئ الباركود</h3>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X size={16} />
            </Button>
          </div>

          {!scanning ? (
            <div className="text-center space-y-4">
              <Camera size={48} className="mx-auto text-muted-foreground" />
              <p className="text-muted-foreground">اضغط لبدء مسح الباركود</p>
              <Button onClick={startScanning} className="w-full" disabled={aiProcessing}>
                <Camera size={16} className="mr-2" />
                {aiProcessing ? "جاري التحليل..." : "بدء المسح"}
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="aspect-square bg-black rounded-lg overflow-hidden">
                <BarcodeScannerComponent
                  width="100%"
                  height="100%"
                  onUpdate={(err, result) => {
                    if (result) {
                      handleScan(result.getText());
                    }
                    if (err) {
                      handleError(err);
                    }
                  }}
                />
              </div>
              
              <div className="flex gap-2">
                <Button variant="outline" onClick={stopScanning} className="flex-1" disabled={aiProcessing}>
                  إيقاف
                </Button>
                <Button 
                  onClick={captureAndAnalyze} 
                  className="flex-1"
                  disabled={aiProcessing}
                >
                  <Sparkles size={16} className="mr-2" />
                  {aiProcessing ? "جاري التحليل..." : "تحليل بالذكاء الاصطناعي"}
                </Button>
                <Button variant="ghost" onClick={onClose} className="flex-1" disabled={aiProcessing}>
                  إلغاء
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}