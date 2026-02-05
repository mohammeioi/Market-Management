import { useState, useMemo, useEffect, useRef, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { Search, Loader2 } from "lucide-react";
import { useSupabaseProductStore } from "@/stores/useSupabaseProductStore";
import { ProductCard } from "@/components/ProductCard";
import { CategoryFilter } from "@/components/CategoryFilter";
import { BarcodeLookup } from "@/components/BarcodeLookup";
import { useNavigate } from "react-router-dom";

// Debounce helper
function debounce<T extends (...args: any[]) => any>(func: T, wait: number) {
  let timeout: NodeJS.Timeout;
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

export function POSView() {
  const { products, categories, fetchCategories, fetchProductsByCategory, searchProducts, loading, hasMore } = useSupabaseProductStore();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const navigate = useNavigate();

  // Ref for infinite scroll sentinel
  const loadMoreRef = useRef<HTMLDivElement>(null);

  // Load products and categories on mount
  useEffect(() => {
    fetchCategories();
    fetchProductsByCategory(null, 0);
  }, [fetchCategories, fetchProductsByCategory]);

  // Infinite scroll using Intersection Observer
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const first = entries[0];
        if (first.isIntersecting && hasMore && !loading) {
          const nextPage = page + 1;
          setPage(nextPage);
          fetchProductsByCategory(selectedCategory, nextPage);
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
  }, [hasMore, loading, page, selectedCategory, fetchProductsByCategory]);

  const debouncedSearch = useMemo(
    () =>
      debounce((query: string) => {
        if (query.trim()) {
          searchProducts(query);
          setSelectedCategory(null); // Reset category when searching
          setPage(0);
        } else {
          fetchProductsByCategory(selectedCategory, 0);
          setPage(0);
        }
      }, 500),
    [searchProducts, fetchProductsByCategory, selectedCategory]
  );

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchTerm(value);
    debouncedSearch(value);
  };

  const handleCategorySelect = (categoryId: string | null) => {
    setSelectedCategory(categoryId);
    setSearchTerm(""); // Clear search when selecting category
    setPage(0);
    fetchProductsByCategory(categoryId, 0);
  };

  return (
    <div className="min-h-screen bg-background p-2 sm:p-4">
      <div className="max-w-7xl mx-auto">
        {/* Mobile Layout */}
        <div className="block lg:hidden space-y-4">
          {/* Header */}
          <div className="text-center">
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground mb-2">نظام نقاط البيع</h1>
            <p className="text-sm text-muted-foreground">اختر المنتجات لإضافتها</p>
          </div>

          {/* Search and Barcode */}
          <div className="space-y-3">
            <div className="relative">
              <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" size={20} />
              <Input
                placeholder="البحث عن المنتجات..."
                value={searchTerm}
                onChange={handleSearchChange}
                className="pr-10 text-right"
              />
            </div>
            <BarcodeLookup />
          </div>

          {/* Category Filter */}
          {categories.length > 0 && (
            <CategoryFilter
              categories={categories}
              selectedCategory={selectedCategory}
              onCategorySelect={handleCategorySelect}
            />
          )}

          {/* Products Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {products.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>

          {/* Infinite scroll sentinel */}
          <div ref={loadMoreRef} className="h-4" />

          {loading && (
            <div className="flex justify-center py-8">
              <Loader2 className="animate-spin text-primary" size={32} />
            </div>
          )}

          {!loading && products.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              <p className="text-base">لا توجد منتجات</p>
              <p className="text-xs mt-1">جرب البحث بكلمات أخرى أو اختر فئة مختلفة</p>
            </div>
          )}

        </div>

        {/* Desktop Layout */}
        <div className="hidden lg:block space-y-6">
          {/* Header */}
          <div className="text-right">
            <h1 className="text-3xl font-bold text-foreground mb-2">نظام نقاط البيع</h1>
            <p className="text-muted-foreground">اختر المنتجات لإضافتها</p>
          </div>

          {/* Search and Barcode Lookup */}
          <div className="grid grid-cols-3 gap-4">
            <div className="col-span-2">
              <div className="relative">
                <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" size={20} />
                <Input
                  placeholder="البحث عن المنتجات..."
                  value={searchTerm}
                  onChange={handleSearchChange}
                  className="pr-10 text-right"
                />
              </div>
            </div>
            <div className="col-span-1">
              <BarcodeLookup />
            </div>
          </div>

          {/* Category Filter */}
          {categories.length > 0 && (
            <CategoryFilter
              categories={categories}
              selectedCategory={selectedCategory}
              onCategorySelect={handleCategorySelect}
            />
          )}

          {/* Products Grid */}
          <div className="grid grid-cols-4 gap-4">
            {products.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>

          {/* Infinite scroll sentinel */}
          <div ref={loadMoreRef} className="h-4" />

          {loading && (
            <div className="flex justify-center py-12">
              <Loader2 className="animate-spin text-primary" size={48} />
            </div>
          )}

          {!loading && products.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">
              <p className="text-lg">لا توجد منتجات</p>
              <p className="text-sm">جرب البحث بكلمات أخرى أو اختر فئة مختلفة</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}