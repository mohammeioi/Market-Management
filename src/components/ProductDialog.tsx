import { useState, useEffect, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
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

  // Parent product search state
  const [parentSearch, setParentSearch] = useState("");
  const [parentOptions, setParentOptions] = useState<{ id: string; name: string }[]>([]);
  const [showParentDropdown, setShowParentDropdown] = useState(false);
  const [selectedParentName, setSelectedParentName] = useState("");

  // Fetch categories when dialog opens
  useEffect(() => {
    if (open) {
      fetchCategories();
      // Load initial parent options
      const loadInitialParents = async () => {
        const { data } = await supabase
          .from('products')
          .select('id, name')
          .is('parent_id', null)
          .order('name', { ascending: true })
          .limit(15);
        if (data) setParentOptions(data.filter(p => p.id !== product?.id));
      };
      loadInitialParents();
    }
  }, [open, fetchCategories, product]);

  // Search parent products from Supabase on typing
  useEffect(() => {
    if (!parentSearch.trim()) return;
    const timer = setTimeout(async () => {
      const { data } = await supabase
        .from('products')
        .select('id, name')
        .is('parent_id', null)
        .ilike('name', `%${parentSearch}%`)
        .order('name', { ascending: true })
        .limit(15);
      if (data) setParentOptions(data.filter(p => p.id !== product?.id));
    }, 300);
    return () => clearTimeout(timer);
  }, [parentSearch, product]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('#parent_search') && !target.closest('.parent-dropdown')) {
        setShowParentDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

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
      // Set parent search name if editing a variant
      if (product.parent_id) {
        supabase.from('products').select('name').eq('id', product.parent_id).single().then(({ data }) => {
          if (data) {
            setSelectedParentName(data.name);
            setParentSearch(data.name);
          }
        });
      } else {
        setSelectedParentName("");
        setParentSearch("");
      }
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
      setSelectedParentName("");
      setParentSearch("");
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
          <DialogTitle className="text-right text-xl font-bold pb-2 pr-6">
            {product ? "تعديل المنتج" : "إضافة منتج جديد"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="name" className="text-right block text-sm font-semibold mb-1.5 text-foreground/90">اسم المنتج</Label>
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
            <Label htmlFor="price" className="text-right block text-sm font-semibold mb-1.5 text-foreground/90">السعر (د.ع)</Label>
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
            <Label htmlFor="category" className="text-right block text-sm font-semibold mb-1.5 text-foreground/90">الفئة</Label>
            {!isAddingNewCategory ? (
              <div className="flex gap-3">
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
                  <SelectTrigger className="flex-1 text-right h-11 rounded-xl shadow-neu-inset bg-background border-none px-4">
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
              <div className="flex gap-3">
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
                  className="h-11 px-6 rounded-xl shadow-neu bg-background border-none transition-all font-bold"
                  onClick={() => {
                    if (newCategoryName.trim()) {
                      handleInputChange("category", newCategoryName.trim());
                    }
                    setIsAddingNewCategory(false);
                    setNewCategoryName("");
                  }}
                >
                  حفظ
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  className="h-11 px-4 rounded-xl border-none transition-all font-bold"
                  onClick={() => {
                    setIsAddingNewCategory(false);
                    setNewCategoryName("");
                  }}
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
            <Label htmlFor="barcode" className="text-right block text-sm font-semibold mb-1.5 text-foreground/90">الباركود (اختياري)</Label>
            <div className="flex gap-3">
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
                className="h-11 w-11 p-0 flex shrink-0 items-center justify-center rounded-xl shadow-neu bg-background border-none transition-all hover:shadow-neu-pressed"
              >
                <Camera size={16} />
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="parent_id" className="text-right block text-sm font-semibold mb-1.5 text-foreground/90">تنويع لمنتج آخر (اختياري)</Label>
            <div className="relative">
              <Input
                id="parent_search"
                value={parentSearch}
                onChange={(e) => {
                  setParentSearch(e.target.value);
                  setShowParentDropdown(true);
                }}
                onFocus={() => setShowParentDropdown(true)}
                placeholder="ابحث عن المنتج الرئيسي..."
                className="text-right w-full"
                autoComplete="off"
              />
              {showParentDropdown && (
                <div className="parent-dropdown absolute z-50 w-full mt-1 bg-background border-none rounded-xl shadow-neu max-h-48 overflow-y-auto">
                  <button
                    type="button"
                    className={`w-full text-right px-3 py-2 hover:bg-primary/5 hover:text-primary transition-colors text-sm ${formData.parent_id === 'none' ? 'bg-primary/10 font-bold' : ''}`}
                    onClick={() => {
                      handleInputChange("parent_id", "none");
                      setParentSearch("");
                      setSelectedParentName("");
                      setShowParentDropdown(false);
                    }}
                  >
                    بدون (منتج رئيسي)
                  </button>
                  {parentOptions.map((p) => (
                    <button
                      type="button"
                      key={p.id}
                      className={`w-full text-right px-3 py-2 hover:bg-primary/5 hover:text-primary transition-colors text-sm ${formData.parent_id === p.id ? 'bg-primary/10 font-bold' : ''}`}
                      onClick={() => {
                        handleInputChange("parent_id", p.id);
                        setSelectedParentName(p.name);
                        setParentSearch(p.name);
                        setShowParentDropdown(false);
                      }}
                    >
                      {p.name}
                    </button>
                  ))}
                  {parentSearch.trim() && parentOptions.length === 0 && (
                    <div className="px-3 py-2 text-sm text-gray-400 text-center">لا توجد نتائج</div>
                  )}
                </div>
              )}
            </div>
            {selectedParentName && formData.parent_id !== 'none' && (
              <p className="text-sm text-blue-600 text-right">المنتج الأب: {selectedParentName}</p>
            )}
            <p className="text-xs text-muted-foreground text-right mt-1">
              إذا تم اختيار منتج، سيظهر هذا المنتج كخيار فرعي داخله واجهة الكاشير (مثلاً كنكهة إضافية).
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="image" className="text-right block text-sm font-semibold mb-1.5 text-foreground/90">صورة المنتج</Label>
            <div className="flex gap-3">
              <Input
                id="image"
                type="url"
                value={formData.image}
                onChange={(e) => handleInputChange("image", e.target.value)}
                placeholder="رابط الصورة"
                className="text-left flex-1"
                dir="ltr"
              />
              <Button
                type="button"
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                className="h-11 w-11 p-0 flex shrink-0 items-center justify-center rounded-xl shadow-neu bg-background border-none transition-all hover:shadow-neu-pressed"
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

          <div className="flex gap-4 pt-6 mt-4">
            <Button type="submit" className="flex-1 h-11 rounded-xl shadow-neu hover:opacity-90 transition-all font-bold text-base">
              {product ? "تحديث" : "إضافة"}
            </Button>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="h-11 px-8 rounded-xl shadow-neu bg-background border-none transition-all font-bold">
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