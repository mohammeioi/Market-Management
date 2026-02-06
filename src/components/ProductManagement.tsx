import { useState, useEffect, useMemo, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Plus, Edit, Package, RefreshCw, Search, Loader2, Eye, EyeOff } from "lucide-react";
import { useSupabaseProductStore } from "@/stores/useSupabaseProductStore";
import { ProductDialog } from "./ProductDialog";
import { Product } from "@/types/pos";
import { formatCurrency } from "@/lib/currency";

export function ProductManagement() {
  const { products, toggleProductAvailability, fetchProductsByCategory, loading, error, hasMore } = useSupabaseProductStore();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [page, setPage] = useState(0);

  // Ref for infinite scroll sentinel
  const loadMoreRef = useRef<HTMLDivElement>(null);

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

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div className="text-right">
          <h1 className="text-2xl font-bold text-foreground">إدارة المنتجات</h1>
          <p className="text-muted-foreground">إضافة وتعديل وحذف المنتجات</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={handleRefresh} variant="outline" className="gap-2" disabled={loading}>
            <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
            تحديث
          </Button>
          <Button onClick={handleAdd} className="gap-2">
            <Plus size={16} />
            إضافة منتج جديد
          </Button>
        </div>
      </div>

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
