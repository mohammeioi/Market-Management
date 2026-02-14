import { useState, useEffect, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Plus, Edit, Package, RefreshCw, Search, Loader2, Eye, EyeOff, Upload, Trash2, ArrowRight } from "lucide-react";
import { useSupabaseProductStore } from "@/stores/useSupabaseProductStore";
import { ProductDialog } from "./ProductDialog";
import { Product } from "@/types/pos";
import { formatCurrency } from "@/lib/currency";
import * as XLSX from "xlsx";

export function ProductManagement() {
  const { products, toggleProductAvailability, fetchProductsByCategory, addProductsBatch, searchProducts, deleteProduct, loading, error, hasMore } = useSupabaseProductStore();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [page, setPage] = useState(0);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<{ success: number; failed: number } | null>(null);

  // Ref for infinite scroll sentinel
  const loadMoreRef = useRef<HTMLDivElement>(null);
  // Ref for file input
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Debounced server-side search
  useEffect(() => {
    const trimmed = searchQuery.trim();
    if (!trimmed) return; // handled by initial fetch / refresh

    const timer = setTimeout(() => {
      searchProducts(trimmed);
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

      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
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
          <Button onClick={handleAdd} className="gap-2 bg-gray-900 hover:bg-black text-white px-5 rounded-xl shadow-lg shadow-gray-200">
            <Plus size={18} />
            إضافة منتج
          </Button>
          <Button onClick={handleImportClick} variant="outline" className="gap-2 border-gray-200 text-gray-700 hover:bg-gray-50 rounded-xl px-4">
            {importing ? <Loader2 size={18} className="animate-spin" /> : <Upload size={18} />}
            استيراد من ملف
          </Button>
          <Button onClick={handleRefresh} variant="ghost" className="gap-2 text-gray-500 hover:text-gray-900 hover:bg-gray-50 rounded-xl px-3" disabled={loading || importing}>
            <RefreshCw size={18} className={loading ? "animate-spin" : ""} />
            تحديث
          </Button>
        </div>
      </div>

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
                group relative bg-white rounded-xl overflow-hidden
                shadow-[0_2px_15px_-4px_rgba(0,0,0,0.1)] hover:shadow-[0_8px_25px_-8px_rgba(0,0,0,0.2)]
                transition-all duration-300 border border-gray-100
                flex flex-col
                ${product.isAvailable === false ? 'opacity-75 grayscale-[0.5]' : ''}
              `}
            >
              {/* Image Section - Floating effect with Ambient Glow */}
              <div className="relative pt-6 px-6 pb-2 flex justify-center overflow-hidden">

                {/* Ambient Background Layer */}
                <div
                  className="absolute inset-0 opacity-20 blur-xl scale-150 transition-transform duration-700 group-hover:scale-125 group-hover:opacity-30"
                  style={{
                    backgroundImage: `url(${product.image || '/placeholder.svg'})`,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center'
                  }}
                />
                <div className="absolute inset-0 bg-gradient-to-b from-white/10 to-white/80 z-0" />

                <div className="relative z-10 w-40 h-40 drop-shadow-xl transition-transform duration-500 group-hover:scale-110">
                  <img
                    src={product.image || '/placeholder.svg'}
                    alt={product.name}
                    className="w-full h-full object-contain object-center"
                    loading="lazy"
                  />
                </div>

                {/* Top Right Actions (Removed) */}
              </div>

              {/* Content Section */}
              <div className="p-5 text-center flex-1 flex flex-col items-center">
                <p className="text-xs font-bold tracking-widest text-gray-400 uppercase mb-2">
                  {product.category}
                </p>

                <h3 className="font-bold text-gray-900 text-sm mb-3 min-h-[2.5rem] line-clamp-2 leading-relaxed">
                  {product.name}
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
              <div className="border-t border-gray-100 p-4 flex items-center justify-between bg-white gap-2">
                <div className="flex items-center gap-1.5 text-gray-300 text-xs font-medium">
                  <Package size={14} />
                  <span>{product.stock}</span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleToggleAvailability(product.id)}
                    className={`
                        text-xs font-bold tracking-wider uppercase transition-colors px-2 py-1
                        ${product.isAvailable !== false ? 'text-green-600 hover:text-green-700' : 'text-gray-400 hover:text-gray-600'}
                        `}
                  >
                    {product.isAvailable !== false ? 'متوفر' : 'غير متوفر'}
                  </button>

                  <div className="w-px h-4 bg-gray-200 mx-1"></div>

                  <button
                    onClick={(e) => { e.stopPropagation(); handleEdit(product); }}
                    className="w-8 h-8 rounded-full bg-gray-50 text-gray-600 hover:text-blue-600 hover:bg-blue-50 flex items-center justify-center transition-colors border border-gray-100"
                    title="تعديل"
                  >
                    <Edit size={14} />
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); handleDelete(product); }}
                    className="w-8 h-8 rounded-full bg-gray-50 text-red-400 hover:text-red-600 hover:bg-red-50 flex items-center justify-center transition-colors border border-gray-100"
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

      <ProductDialog
        open={dialogOpen}
        onOpenChange={handleDialogClose}
        product={editingProduct}
      />
    </div>
  );
}
