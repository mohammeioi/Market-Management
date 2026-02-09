import { useState, useEffect, useMemo, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Plus, Edit, Package, RefreshCw, Search, Loader2, Eye, EyeOff, Upload } from "lucide-react";
import { useSupabaseProductStore } from "@/stores/useSupabaseProductStore";
import { ProductDialog } from "./ProductDialog";
import { Product } from "@/types/pos";
import { formatCurrency } from "@/lib/currency";
import * as XLSX from "xlsx";

export function ProductManagement() {
  const { products, toggleProductAvailability, fetchProductsByCategory, addProductsBatch, loading, error, hasMore } = useSupabaseProductStore();
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

  // Filter products based on search query (client-side for management page)
  const filteredProducts = useMemo(() => {
    if (!searchQuery.trim()) return products;

    const query = searchQuery.trim().toLowerCase();
    return products.filter(product =>
      product.name.toLowerCase().includes(query) ||
      product.category?.toLowerCase().includes(query)
    );
  }, [products, searchQuery]);

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
        if (first.isIntersecting && hasMore && !loading && !searchQuery.trim()) {
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

      <div className="flex justify-between items-center">
        <div className="text-right">
          <h1 className="text-2xl font-bold text-foreground">إدارة المنتجات</h1>
          <p className="text-muted-foreground">إضافة وتعديل وحذف المنتجات</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={handleRefresh} variant="outline" className="gap-2" disabled={loading || importing}>
            <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
            تحديث
          </Button>
          <Button onClick={handleImportClick} variant="outline" className="gap-2" disabled={importing || loading}>
            {importing ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <Upload size={16} />
            )}
            استيراد من ملف
          </Button>
          <Button onClick={handleAdd} className="gap-2">
            <Plus size={16} />
            إضافة منتج جديد
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

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-right">
            <Package size={20} />
            قائمة المنتجات ({filteredProducts.length}{searchQuery && ` من ${products.length}`})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {filteredProducts.length === 0 && !loading ? (
              <div className="text-center py-8 text-muted-foreground">
                <Package size={48} className="mx-auto mb-4 opacity-50" />
                <p>لا توجد منتجات</p>
                <p className="text-sm">ابدأ بإضافة منتجات جديدة</p>
              </div>
            ) : (
              filteredProducts.map((product) => (
                <div
                  key={product.id}
                  className={`flex items-center gap-4 p-4 border rounded-lg bg-pos-surface hover:shadow-md transition-shadow ${product.isAvailable === false ? 'opacity-60 border-red-300' : ''}`}
                >
                  <div className="w-16 h-16 rounded-lg overflow-hidden bg-muted flex-shrink-0">
                    <img
                      src={product.image}
                      alt={product.name}
                      loading="lazy"
                      className="w-full h-full object-cover"
                    />
                  </div>

                  <div className="flex-1 min-w-0 text-right">
                    <h3 className="font-semibold text-foreground">{product.name}</h3>
                    <p className="text-sm text-muted-foreground">{product.category}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="outline">{formatCurrency(product.price)}</Badge>
                      <Badge
                        variant={product.stock > 10 ? "default" : product.stock > 0 ? "secondary" : "destructive"}
                      >
                        المخزون: {product.stock}
                      </Badge>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleEdit(product)}
                      className="gap-1"
                    >
                      <Edit size={14} />
                      تعديل
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleToggleAvailability(product.id)}
                      className={`gap-1 ${product.isAvailable !== false ? 'text-green-600 hover:text-green-700' : 'text-red-600 hover:text-red-700'}`}
                    >
                      {product.isAvailable !== false ? (
                        <>
                          <Eye size={14} />
                          متوفر
                        </>
                      ) : (
                        <>
                          <EyeOff size={14} />
                          غير متوفر
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Infinite scroll sentinel */}
          <div ref={loadMoreRef} className="h-4" />

          {loading && (
            <div className="flex justify-center py-8">
              <Loader2 className="animate-spin text-primary" size={32} />
            </div>
          )}
        </CardContent>
      </Card>

      <ProductDialog
        open={dialogOpen}
        onOpenChange={handleDialogClose}
        product={editingProduct}
      />
    </div>
  );
}
