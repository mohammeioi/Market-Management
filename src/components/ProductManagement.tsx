import { useState, useEffect, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Plus, Edit, Package, RefreshCw, Search, Loader2, Eye, EyeOff, Upload, Trash2, ArrowRight, Bell, Copy, Link2, Check, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useSupabaseProductStore } from "@/stores/useSupabaseProductStore";
import { ProductDialog } from "./ProductDialog";
import { Product } from "@/types/pos";
import { formatCurrency } from "@/lib/currency";
import * as XLSX from "xlsx";
import { useNotificationStore } from "@/stores/useNotificationStore";
import { CategoryManagementDialog } from "./CategoryManagementDialog";
import { toast } from "sonner";
import { FolderSync } from "lucide-react";

function NotificationTokenDisplay() {
  const { pushToken } = useNotificationStore();

  if (!pushToken) return null;

  const copyToken = () => {
    navigator.clipboard.writeText(pushToken);
    toast.success("تم نسخ رمز الإشعارات");
  };

  return (
    <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 mb-6 flex items-center justify-between gap-4">
      <div className="flex items-center gap-3 overflow-hidden">
        <div className="bg-blue-100 p-2 rounded-full text-blue-600">
          <Bell size={20} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-blue-900">جاهز لاستقبال الإشعارات</p>
          <p className="text-xs text-blue-500 truncate" dir="ltr">{pushToken}</p>
        </div>
      </div>
      <Button variant="outline" size="sm" onClick={copyToken} className="shrink-0 gap-2 bg-background hover:bg-blue-50 text-blue-700 border-none shadow-neu hover:shadow-neu-sm active:shadow-neu-inset">
        <Copy size={16} />
        <span>نسخ الرمز</span>
      </Button>
    </div>
  );
}

export function ProductManagement() {
  const { products, toggleProductAvailability, fetchProductsByCategory, addProductsBatch, searchProducts, deleteProduct, batchAssignCategory, loading, error, hasMore } = useSupabaseProductStore();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [page, setPage] = useState(0);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<{ success: number; failed: number } | null>(null);

  // Multi-select for batch variant assignment
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showBatchParentPicker, setShowBatchParentPicker] = useState(false);
  const [batchParentSearch, setBatchParentSearch] = useState("");
  const [batchParentOptions, setBatchParentOptions] = useState<{ id: string; name: string }[]>([]);

  // Batch Category Assignment
  const [showBatchCategoryPicker, setShowBatchCategoryPicker] = useState(false);
  const [batchCategorySearch, setBatchCategorySearch] = useState("");
  const [batchCategoryOptions, setBatchCategoryOptions] = useState<{ id: string; name: string }[]>([]);

  // Category Management Dialog
  const [showCategoryManagement, setShowCategoryManagement] = useState(false);

  // Ref for infinite scroll sentinel
  const loadMoreRef = useRef<HTMLDivElement>(null);
  // Ref for file input
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Debounced server-side search
  useEffect(() => {
    const trimmed = searchQuery.trim();
    if (!trimmed) return; // handled by initial fetch / refresh

    const timer = setTimeout(() => {
      searchProducts(trimmed, false);
    }, 400);

    return () => clearTimeout(timer);
  }, [searchQuery, searchProducts]);

  // When search is cleared, go back to paginated view
  useEffect(() => {
    if (searchQuery.trim() === '') {
      setPage(0);
      fetchProductsByCategory(null, 0);
    }
  }, [searchQuery, fetchProductsByCategory]);

  // Load products when component mounts
  useEffect(() => {
    setPage(0);
    fetchProductsByCategory(null, 0);
  }, [fetchProductsByCategory]);

  // Infinite scroll using Intersection Observer
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const first = entries[0];
        if (first.isIntersecting && hasMore && !loading && searchQuery.trim() === '') {
          const nextPage = page + 1;
          setPage(nextPage);
          fetchProductsByCategory(null, nextPage);
        }
      },
      { threshold: 0.1 }
    );

    const currentRef = loadMoreRef.current;
    if (currentRef) {
      observer.observe(currentRef);
    }

    return () => {
      if (currentRef) {
        observer.unobserve(currentRef);
      }
    };
  }, [hasMore, loading, page, fetchProductsByCategory, searchQuery]);

  const handleEdit = (product: Product) => {
    setEditingProduct(product);
    setDialogOpen(true);
  };

  const handleAdd = () => {
    setEditingProduct(null);
    setDialogOpen(true);
  };

  const handleRefresh = () => {
    setPage(0);
    fetchProductsByCategory(null, 0);
  };

  const handleDialogClose = (open: boolean) => {
    setDialogOpen(open);
    if (!open) {
      // Refresh products when dialog closes (after add/edit)
      setPage(0);
      fetchProductsByCategory(null, 0);
    }
  };

  const handleToggleAvailability = (productId: string) => {
    toggleProductAvailability(productId);
  };

  const handleDelete = useCallback(async (product: Product) => {
    const confirmed = window.confirm(`هل أنت متأكد من حذف المنتج "${product.name}"؟\nلا يمكن التراجع عن هذا الإجراء.`);
    if (confirmed) {
      await deleteProduct(product.id);
    }
  }, [deleteProduct]);

  // Toggle product selection
  const toggleSelect = useCallback((productId: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(productId)) next.delete(productId);
      else next.add(productId);
      return next;
    });
  }, []);

  // Batch search parent products
  useEffect(() => {
    if (!showBatchParentPicker) return;
    const timer = setTimeout(async () => {
      let query = supabase
        .from('products')
        .select('id, name')
        .is('parent_id', null)
        .order('name', { ascending: true })
        .limit(15);
      if (batchParentSearch.trim()) {
        query = query.ilike('name', `%${batchParentSearch}%`);
      }
      const { data } = await query;
      if (data) setBatchParentOptions(data.filter(p => !selectedIds.has(p.id)));
    }, 300);
    return () => clearTimeout(timer);
  }, [batchParentSearch, showBatchParentPicker, selectedIds]);

  // Batch assign selected products as variants of a parent
  const handleBatchAssign = async (parentId: string) => {
    try {
      const ids = Array.from(selectedIds);
      const { error } = await supabase
        .from('products')
        .update({ parent_id: parentId } as any)
        .in('id', ids);
      if (error) throw error;
      toast.success(`تم تعيين ${ids.length} منتج كتنويعات بنجاح!`);
      setSelectedIds(new Set());
      setShowBatchParentPicker(false);
      setBatchParentSearch("");
      setPage(0);
      fetchProductsByCategory(null, 0);
    } catch (err) {
      console.error('Batch assign error:', err);
      toast.error('حدث خطأ أثناء تعيين التنويعات');
    }
  };

  const handleFileImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setImporting(true);
    setImportResult(null);

    try {
      const reader = new FileReader();

      reader.onload = async (e) => {
        try {
          const data = e.target?.result;
          const workbook = XLSX.read(data, { type: 'binary' });
          const sheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[sheetName];
          const jsonData = XLSX.utils.sheet_to_json(worksheet);

          // Debug: Log raw Excel data
          console.log('📊 Raw Excel Data:', jsonData);
          console.log('📊 First row keys:', jsonData.length > 0 ? Object.keys(jsonData[0] as object) : 'No data');

          // Helper function to normalize Arabic text for comparison
          const normalizeArabic = (text: string): string => {
            return text
              .normalize('NFKC') // Unicode normalization
              .replace(/[\u064B-\u065F]/g, '') // Remove Arabic diacritics (tashkeel)
              .replace(/\u0640/g, '') // Remove tatweel
              .replace(/[أإآ]/g, 'ا') // Normalize alef variations
              .replace(/ى/g, 'ي') // Normalize alef maqsura
              .replace(/ة/g, 'ه') // Normalize taa marbuta
              .trim();
          };

          // Helper function to find value by flexible key matching
          const getValue = (row: any, keys: string[]): any => {
            // First try exact match
            for (const key of keys) {
              if (row[key] !== undefined) return row[key];
            }
            // Then try normalized Arabic match
            const rowKeys = Object.keys(row);
            for (const targetKey of keys) {
              const normalizedTarget = normalizeArabic(targetKey);
              for (const rowKey of rowKeys) {
                if (normalizeArabic(rowKey) === normalizedTarget) {
                  return row[rowKey];
                }
              }
            }
            return undefined;
          };

          // Map Excel columns to product fields (support both Arabic and English)
          const products = jsonData.map((row: any) => {
            const product = {
              name: getValue(row, ['الاسم', 'name', 'Name', 'اسم', 'اسم المنتج', 'Product Name']) || '',
              price: parseFloat(getValue(row, ['السعر', 'price', 'Price', 'سعر']) || 0),
              category: getValue(row, ['الفئة', 'category', 'Category', 'فئة', 'التصنيف']) || 'غير محدد',
              image: getValue(row, ['الصورة', 'image', 'Image', 'صورة']) || '/placeholder.svg',
              stock: parseInt(getValue(row, ['المخزون', 'stock', 'Stock', 'مخزون', 'الكمية']) || 0, 10),
              barcode: getValue(row, ['الباركود', 'barcode', 'Barcode', 'باركود']) || undefined,
            };
            console.log('📦 Parsed product:', product);
            return product;
          }).filter((p: any) => p.name && p.price > 0); // Filter out invalid products

          console.log('✅ Valid products to import:', products.length, products);

          if (products.length === 0) {
            setImportResult({ success: 0, failed: 0 });
            setImporting(false);
            return;
          }

          const result = await addProductsBatch(products);
          setImportResult(result);
        } catch (err) {
          console.error('Error processing file:', err);
          setImportResult({ success: 0, failed: -1 }); // -1 indicates file reading error
        } finally {
          setImporting(false);
        }
      };

      reader.readAsBinaryString(file);
    } catch (err) {
      console.error('Error reading file:', err);
      setImporting(false);
      setImportResult({ success: 0, failed: -1 });
    }

    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Category search effect for batch assignment
  useEffect(() => {
    if (!batchCategorySearch.trim() && showBatchCategoryPicker) {
      setBatchCategoryOptions([]);
      return;
    }
    const timer = setTimeout(async () => {
      let query = supabase
        .from('categories')
        .select('id, name')
        .order('name', { ascending: true })
        .limit(10);

      if (batchCategorySearch.trim()) {
        query = query.ilike('name', `%${batchCategorySearch}%`);
      }

      const { data } = await query;
      if (data) setBatchCategoryOptions(data);
    }, 300);

    return () => clearTimeout(timer);
  }, [batchCategorySearch, showBatchCategoryPicker]);

  const handleBatchCategoryAssign = async (categoryName: string) => {
    try {
      const ids = Array.from(selectedIds);
      await batchAssignCategory(ids, categoryName);
      toast.success(`تم نقل ${ids.length} منتج إلى فئة "${categoryName}" بنجاح!`);
      setSelectedIds(new Set());
      setShowBatchCategoryPicker(false);
      setBatchCategorySearch("");
      setPage(0);
      fetchProductsByCategory(null, 0); // Refresh products
    } catch (error) {
      toast.error('حدث خطأ أثناء نقل المنتجات');
    }
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="space-y-6">
      {/* Hidden file input for Excel/CSV import */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileImport}
        accept=".xlsx,.xls,.csv"
        className="hidden"
      />

      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-4">
        <div className="text-right">
          <div className="flex items-center gap-3 mb-1">
            <button
              onClick={() => window.history.back()}
              className="p-2 -mr-2 rounded-full hover:bg-gray-100 transition-colors text-gray-500"
              title="العودة"
            >
              <ArrowRight size={24} />
            </button>
            <h1 className="text-2xl font-bold text-gray-900">إدارة المنتجات</h1>
          </div>
          <p className="text-gray-500 text-sm mr-10">إضافة وتعديل وحذف المنتجات بسهولة</p>
        </div>

        <div className="flex flex-wrap gap-2 w-full md:w-auto">
          <div className="flex flex-row flex-wrap justify-end gap-2 sm:gap-3 w-full">
            <Button onClick={() => setShowCategoryManagement(true)} variant="outline" className="gap-2 bg-background text-gray-700 shadow-neu hover:shadow-neu-sm border-none active:shadow-neu-inset flex-none h-10 px-3 sm:px-4">
              <FolderSync size={20} />
              <span className="hidden sm:inline">إدارة الفئات</span>
            </Button>
            <Button onClick={() => fileInputRef.current?.click()} variant="outline" className="gap-2 bg-background text-gray-700 shadow-neu hover:shadow-neu-sm border-none active:shadow-neu-inset flex-none h-10 px-3 sm:px-4">
              <Upload size={20} />
              <span className="hidden sm:inline">استيراد</span>
            </Button>
            <Button onClick={handleRefresh} variant="outline" className="px-3 bg-background text-gray-700 shadow-neu hover:shadow-neu-sm border-none active:shadow-neu-inset h-10">
              <RefreshCw size={20} className="text-gray-600" />
            </Button>
            <Button onClick={handleAdd} className="gap-2 bg-primary hover:bg-primary/90 shadow-neu hover:shadow-neu-sm active:shadow-neu-inset text-primary-foreground border-none flex-none h-10 px-3 sm:px-4">
              <Plus size={20} />
              <span className="hidden sm:inline">إضافة منتج</span>
            </Button>
          </div>
        </div>
      </div>

      {/* Token Display for Testing */}
      <NotificationTokenDisplay />

      <div className="mb-8"></div>

      {/* Import result notification */}
      {importResult && (
        <div className={`px-4 py-3 rounded-lg ${importResult.failed === -1 ? 'bg-destructive/10 border border-destructive/20 text-destructive' : importResult.success > 0 ? 'bg-green-500/10 border border-green-500/20 text-green-700' : 'bg-yellow-500/10 border border-yellow-500/20 text-yellow-700'}`}>
          {importResult.failed === -1 ? (
            <span>فشل في قراءة الملف. تأكد من أن الملف بصيغة Excel أو CSV صحيحة.</span>
          ) : (
            <span>
              تم الاستيراد: {importResult.success} منتج بنجاح
              {importResult.failed > 0 && ` | فشل: ${importResult.failed} منتج`}
            </span>
          )}
          <button
            onClick={() => setImportResult(null)}
            className="mr-4 underline hover:no-underline"
          >
            إغلاق
          </button>
        </div>
      )}

      {/* حقل البحث */}
      <div className="relative">
        <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
        <Input
          type="text"
          placeholder="ابحث عن منتج بالاسم أو الفئة..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pr-10 text-right"
        />
      </div>

      {error && (
        <div className="bg-destructive/10 border border-destructive/20 text-destructive px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      {/* عنوان القائمة */}
      <div className="flex items-center gap-2 text-right">
        <Package size={20} />
        <h2 className="text-lg font-semibold">قائمة المنتجات ({products.length})</h2>
      </div>

      {products.length === 0 && !loading ? (
        <div className="text-center py-16 text-muted-foreground">
          <Package size={64} className="mx-auto mb-4 opacity-30" />
          <p className="text-lg font-medium">لا توجد منتجات</p>
          <p className="text-sm mt-1">ابدأ بإضافة منتجات جديدة</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {products.map((product) => (
            <div
              key={product.id}
              className={`
                group relative bg-background rounded-2xl overflow-hidden
                shadow-neu hover:shadow-neu-sm
                transition-all duration-300 border-none
                flex flex-col
                ${selectedIds.has(product.id) ? 'shadow-[0_0_15px_rgba(59,130,246,0.5)]' : ''}
                ${product.isAvailable === false ? 'opacity-75 grayscale-[0.5]' : ''}
              `}
            >
              {/* Selection Checkbox */}
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); toggleSelect(product.id); }}
                className={`absolute top-3 left-3 z-20 w-6 h-6 rounded-md border-2 flex items-center justify-center transition-all
                  ${selectedIds.has(product.id)
                    ? 'bg-blue-500 border-blue-500 text-white'
                    : 'bg-white/80 border-gray-300 text-transparent hover:border-blue-400'
                  }`}
              >
                <Check size={14} />
              </button>
              {/* Image Section - Floating effect with Ambient Glow */}
              <div className="relative pt-6 px-4 sm:px-6 pb-2 flex justify-center overflow-hidden">
                <div className="mx-auto w-[90%] aspect-square max-w-[200px] rounded-[2rem] flex items-center justify-center text-gray-900 overflow-hidden shadow-neu-inset bg-background relative group p-1 sm:p-2">
                  <img
                    src={product.image || '/placeholder.svg'}
                    alt={product.name}
                    className="w-full h-full object-contain mix-blend-multiply transition-transform duration-500 group-hover:scale-[1.15]"
                    loading="lazy"
                  />
                </div>
              </div>

              {/* Content Section */}
              <div className="p-5 text-center flex-1 flex flex-col items-center">
                <div className="flex gap-2 mb-2 items-center flex-wrap justify-center">
                  <p className="text-xs font-bold tracking-widest text-gray-400 uppercase">
                    {product.category}
                  </p>
                  {product.parent_id && (
                    <Badge variant="secondary" className="text-[10px] bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border-indigo-100 px-1.5 py-0">
                      تنويع
                    </Badge>
                  )}
                </div>

                <h3 className="font-bold text-gray-900 text-sm mb-3 min-h-[2.5rem] line-clamp-2 leading-relaxed">
                  {product.name}
                  {product.parent_id && (
                    <span className="block text-xs font-normal text-muted-foreground mt-1">
                      تابع لمنتج آخر
                    </span>
                  )}
                </h3>

                <p className="text-xs text-gray-400 line-clamp-2 mb-4 px-2">
                  {/* Description placeholder if actual description missing */}
                  منتج مميز بجودة عالية، متوفر الآن في المخزون.
                </p>

                <div className="mt-auto items-baseline gap-2 mb-4">
                  <span className="text-2xl font-bold text-gray-900">
                    {formatCurrency(product.price)}
                  </span>
                  {/* Optional: Original price placeholder for style match */}
                  {/* <span className="text-sm text-gray-300 line-through decoration-1">$35.00</span> */}
                </div>
              </div>

              {/* Footer Actions */}
              <div className="p-4 flex items-center justify-between bg-background gap-2 border-none">
                <div className="flex items-center gap-1.5 text-gray-300 text-xs font-medium">
                  <Package size={14} />
                  <span>{product.stock}</span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleToggleAvailability(product.id)}
                    className={`
                        text-xs font-bold tracking-wider transition-all px-3 py-1.5 rounded-full
                        ${product.isAvailable !== false
                        ? 'text-green-600 bg-background shadow-neu-inset hover:bg-green-50/50'
                        : 'text-gray-400 bg-background shadow-neu hover:shadow-neu-sm'}
                        `}
                  >
                    {product.isAvailable !== false ? 'متوفر' : 'غير متوفر'}
                  </button>

                  <div className="w-px h-5 bg-gray-200/50 mx-1"></div>

                  <button
                    onClick={(e) => { e.stopPropagation(); handleEdit(product); }}
                    className="w-8 h-8 rounded-full bg-background shadow-neu hover:shadow-neu-sm active:shadow-neu-inset text-gray-600 hover:text-blue-600 flex items-center justify-center transition-all border-none"
                    title="تعديل"
                  >
                    <Edit size={14} />
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); handleDelete(product); }}
                    className="w-8 h-8 rounded-full bg-background shadow-neu hover:shadow-neu-sm active:shadow-neu-inset text-red-500 hover:text-red-700 flex items-center justify-center transition-all border-none"
                    title="حذف"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Infinite scroll sentinel */}
      <div ref={loadMoreRef} className="h-4" />

      {loading && (
        <div className="flex justify-center py-8">
          <Loader2 className="animate-spin text-primary" size={32} />
        </div>
      )}

      {/* Floating Action Bar for selected items */}
      {selectedIds.size > 0 && (
        <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-[999] bg-gray-900 text-white px-6 py-3 rounded-2xl shadow-2xl flex items-center gap-4 animate-in slide-in-from-bottom-4">
          <span className="text-sm font-medium">{selectedIds.size} منتج محدد</span>
          <Button
            size="sm"
            variant="secondary"
            className="gap-2 rounded-xl bg-gray-700 hover:bg-gray-600 border-none"
            onClick={() => setShowBatchCategoryPicker(true)}
          >
            <FolderSync size={16} />
            نقل إلى فئة
          </Button>
          <Button
            size="sm"
            variant="secondary"
            className="gap-2 rounded-xl"
            onClick={() => setShowBatchParentPicker(true)}
          >
            <Link2 size={16} />
            تعيين كتنويعات
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="text-white hover:text-red-300 hover:bg-white/10 rounded-xl px-2"
            onClick={() => setSelectedIds(new Set())}
          >
            <X size={16} />
          </Button>
        </div>
      )}

      {/* Batch Parent Picker Dialog */}
      {showBatchParentPicker && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={() => setShowBatchParentPicker(false)}>
          <div className="bg-background rounded-2xl shadow-neu border-none w-full max-w-md p-6 space-y-4" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-right">اختر المنتج الأب</h3>
            <p className="text-sm text-gray-500 text-right">سيتم تعيين {selectedIds.size} منتج كتنويعات للمنتج اللي تختاره</p>
            <Input
              value={batchParentSearch}
              onChange={(e) => setBatchParentSearch(e.target.value)}
              placeholder="ابحث عن المنتج الرئيسي..."
              className="text-right"
              autoFocus
            />
            <div className="max-h-60 overflow-y-auto space-y-1">
              {batchParentOptions.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  className="w-full text-right px-4 py-3 rounded-lg hover:bg-blue-50 text-sm transition-colors flex items-center justify-between"
                  onClick={() => handleBatchAssign(p.id)}
                >
                  <Link2 size={14} className="text-gray-400" />
                  <span>{p.name}</span>
                </button>
              ))}
              {batchParentOptions.length === 0 && (
                <div className="text-center text-gray-400 py-4 text-sm">لا توجد نتائج</div>
              )}
            </div>
            <div className="flex justify-end">
              <Button variant="ghost" onClick={() => setShowBatchParentPicker(false)}>إلغاء</Button>
            </div>
          </div>
        </div>
      )}

      <ProductDialog
        open={dialogOpen}
        onOpenChange={handleDialogClose}
        product={editingProduct}
      />

      {/* Batch Category Picker Modal */}
      {showBatchCategoryPicker && (
        <div className="fixed inset-0 z-[1000] bg-black/50 flex items-center justify-center p-4" onClick={() => setShowBatchCategoryPicker(false)}>
          <div className="bg-background rounded-2xl shadow-neu border-none w-full max-w-md p-6 space-y-4" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-right">نقل المنتجات إلى فئة</h3>
            <p className="text-sm text-gray-500 text-right">سيتم نقل {selectedIds.size} منتج إلى الفئة التي تختارها أو تكتبها.</p>

            <div className="space-y-2">
              <Input
                value={batchCategorySearch}
                onChange={(e) => setBatchCategorySearch(e.target.value)}
                placeholder="ابحث أو اكتب اسم الفئة الجديدة..."
                className="text-right"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && batchCategorySearch.trim()) {
                    handleBatchCategoryAssign(batchCategorySearch.trim());
                  }
                }}
              />
              {batchCategorySearch.trim() && !batchCategoryOptions.some(c => c.name === batchCategorySearch.trim()) && (
                <button
                  type="button"
                  className="w-full text-right px-4 py-3 rounded-lg bg-green-50 text-green-700 text-sm font-medium hover:bg-green-100 transition-colors flex items-center justify-between"
                  onClick={() => handleBatchCategoryAssign(batchCategorySearch.trim())}
                >
                  <Plus size={14} className="text-green-500" />
                  <span>إضافة فئة جديدة: "{batchCategorySearch}"</span>
                </button>
              )}
            </div>

            <div className="max-h-60 overflow-y-auto space-y-1">
              {batchCategoryOptions.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  className="w-full text-right px-4 py-3 rounded-lg hover:bg-blue-50 text-sm transition-colors flex items-center justify-between group"
                  onClick={() => handleBatchCategoryAssign(c.name)}
                >
                  <FolderSync size={14} className="text-gray-400 group-hover:text-blue-500" />
                  <span>{c.name}</span>
                </button>
              ))}
              {batchCategoryOptions.length === 0 && !batchCategorySearch.trim() && (
                <div className="text-center text-gray-400 py-4 text-sm">اكتب للبحث عن فئة</div>
              )}
            </div>

            <div className="flex justify-end pt-2 border-t border-gray-100">
              <Button variant="ghost" onClick={() => setShowBatchCategoryPicker(false)}>إلغاء</Button>
            </div>
          </div>
        </div>
      )}

      {/* Category Management Dialog */}
      <CategoryManagementDialog
        open={showCategoryManagement}
        onOpenChange={setShowCategoryManagement}
      />
    </div>
  );
}