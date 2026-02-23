import { useState, useEffect, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useSupabaseProductStore } from "@/stores/useSupabaseProductStore";
import { Product } from "@/types/pos";
import { useToast } from "@/hooks/use-toast";
import { BarcodeScanner } from "@/components/BarcodeScanner";
import { Camera, Upload, Plus } from "lucide-react";

interface ProductDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  product?: Product | null;
}

export function ProductDialog({ open, onOpenChange, product }: ProductDialogProps) {
  const { addProduct, updateProduct, categories, fetchCategories } = useSupabaseProductStore();
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    name: "",
    price: "",
    category: "",
    image: "",
    barcode: "",
    parent_id: "none"
  });
  const [showBarcodeScanner, setShowBarcodeScanner] = useState(false);
  const [isAddingNewCategory, setIsAddingNewCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch categories when dialog opens
  useEffect(() => {
    if (open) {
      fetchCategories();
    }
  }, [open, fetchCategories]);

  useEffect(() => {
    if (product) {
      setFormData({
        name: product.name,
        price: product.price.toString(),
        category: product.category,
        image: product.image,
        barcode: product.barcode || "",
        parent_id: product.parent_id || "none"
      });
      setIsAddingNewCategory(false);
      setNewCategoryName("");
    } else {
      setFormData({
        name: "",
        price: "",
        category: "",
        image: "/placeholder.svg",
        barcode: "",
        parent_id: "none"
      });
      setIsAddingNewCategory(false);
      setNewCategoryName("");
    }
  }, [product, open]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name || !formData.price || !formData.category) {
      toast({
        title: "خطأ",
        description: "يرجى ملء جميع الحقول المطلوبة",
        variant: "destructive"
      });
      return;
    }

    const productData = {
      name: formData.name,
      price: parseFloat(formData.price),
      category: formData.category,
      stock: 100, // قيمة افتراضية للمخزون
      image: formData.image || "/placeholder.svg",
      barcode: formData.barcode,
      parent_id: formData.parent_id === "none" ? null : formData.parent_id
    };

    if (product) {
      updateProduct(product.id, productData);
      toast({
        title: "تم التحديث",
        description: "تم تحديث المنتج بنجاح"
      });
    } else {
      addProduct(productData);
      toast({
        title: "تم الإضافة",
        description: "تم إضافة المنتج بنجاح"
      });
    }

    onOpenChange(false);
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleBarcodeScanned = (barcode: string) => {
    handleInputChange("barcode", barcode);
    setShowBarcodeScanner(false);
    toast({
      title: "تم مسح الباركود",
      description: `الباركود: ${barcode}`
    });
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const imageData = event.target?.result as string;
        handleInputChange("image", imageData);
      };
      reader.readAsDataURL(file);

      toast({
        title: "تم رفع الصورة",
        description: "تم رفع صورة المنتج بنجاح"
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md" dir="rtl">
        <DialogHeader>
          <DialogTitle className="text-right">
            {product ? "تعديل المنتج" : "إضافة منتج جديد"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name" className="text-right block">اسم المنتج</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => handleInputChange("name", e.target.value)}
              placeholder="أدخل اسم المنتج"
              className="text-right"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="price" className="text-right block">السعر (د.ع)</Label>
            <Input
              id="price"
              type="number"
              step="0.01"
              min="0"
              value={formData.price}
              onChange={(e) => handleInputChange("price", e.target.value)}
              placeholder="0.00"
              className="text-right"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="category" className="text-right block">الفئة</Label>
            {!isAddingNewCategory ? (
              <div className="flex gap-2">
                <Select
                  value={formData.category}
                  onValueChange={(value) => {
                    if (value === "__new__") {
                      setIsAddingNewCategory(true);
                      handleInputChange("category", "");
                    } else {
                      handleInputChange("category", value);
                    }
                  }}
                >
                  <SelectTrigger className="flex-1 text-right">
                    <SelectValue placeholder="اختر الفئة" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((cat) => (
                      <SelectItem key={cat.id} value={cat.name}>
                        {cat.icon} {cat.name}
                      </SelectItem>
                    ))}
                    <SelectItem value="__new__" className="text-primary font-medium">
                      <Plus className="inline-block mr-2" size={14} />
                      إضافة فئة جديدة
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            ) : (
              <div className="flex gap-2">
                <Input
                  id="category"
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  placeholder="أدخل اسم الفئة الجديدة"
                  className="text-right flex-1"
                  required
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    if (newCategoryName.trim()) {
                      handleInputChange("category", newCategoryName.trim());
                    }
                    setIsAddingNewCategory(false);
                    setNewCategoryName("");
                  }}
                  className="px-3"
                >
                  حفظ
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => {
                    setIsAddingNewCategory(false);
                    setNewCategoryName("");
                  }}
                  className="px-3"
                >
                  إلغاء
                </Button>
              </div>
            )}
            {formData.category && !isAddingNewCategory && (
              <p className="text-sm text-muted-foreground">الفئة المختارة: {formData.category}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="barcode" className="text-right block">الباركود (اختياري)</Label>
            <div className="flex gap-2">
              <Input
                id="barcode"
                value={formData.barcode}
                onChange={(e) => handleInputChange("barcode", e.target.value)}
                placeholder="أدخل الباركود أو امسحه"
                className="text-right flex-1"
              />
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowBarcodeScanner(true)}
                className="px-3"
              >
                <Camera size={16} />
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="parent_id" className="text-right block">تنويع لمنتج آخر (اختياري)</Label>
            <Select
              value={formData.parent_id}
              onValueChange={(value) => handleInputChange("parent_id", value)}
            >
              <SelectTrigger className="w-full text-right">
                <SelectValue placeholder="اختر المنتج الرئيسي" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">بدون (منتج رئيسي)</SelectItem>
                {useSupabaseProductStore.getState().products
                  .filter(p => !p.parent_id && p.id !== product?.id) // Only show top-level products that aren't this product
                  .map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground text-right mt-1">
              إذا تم اختيار منتج، سيظهر هذا المنتج كخيار فرعي داخله واجهة الكاشير (مثلاً كنكهة إضافية).
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="image" className="text-right block">صورة المنتج</Label>
            <div className="flex gap-2">
              <Input
                id="image"
                type="url"
                value={formData.image}
                onChange={(e) => handleInputChange("image", e.target.value)}
                placeholder="رابط الصورة"
                className="text-right flex-1"
              />
              <Button
                type="button"
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                className="px-3"
              >
                <Upload size={16} />
              </Button>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleImageUpload}
              className="hidden"
            />
          </div>

          <div className="flex gap-2 pt-4">
            <Button type="submit" className="flex-1">
              {product ? "تحديث" : "إضافة"}
            </Button>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              إلغاء
            </Button>
          </div>
        </form>

        <BarcodeScanner
          isOpen={showBarcodeScanner}
          onScan={handleBarcodeScanned}
          onClose={() => setShowBarcodeScanner(false)}
        />
      </DialogContent>
    </Dialog>
  );
}