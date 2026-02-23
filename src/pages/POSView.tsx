import { useState, useMemo, useEffect, useRef } from "react";
import { Input } from "@/components/ui/input";
import { Search, Loader2, Menu, Home, ShoppingBag, Settings, LogOut, Wifi, WifiOff, Lock } from "lucide-react";
import { useSupabaseProductStore } from "@/stores/useSupabaseProductStore";
import { ProductCard } from "@/components/ProductCard";
import { CategoryFilter } from "@/components/CategoryFilter";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger, SheetClose } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useAttendanceStore } from "@/stores/useAttendanceStore";

// Debounce helper
function debounce<T extends (...args: any[]) => any>(func: T, wait: number) {
  let timeout: NodeJS.Timeout;
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

// Hook for online status
function useOnlineStatus() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  return isOnline;
}

export function POSView() {
  const { products, categories, fetchCategories, fetchProductsByCategory, searchProducts, loading, hasMore } = useSupabaseProductStore();
  const { profiles, loading: attendanceLoading, fetchProfiles, checkStatus, isClockedIn } = useAttendanceStore();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const navigate = useNavigate();
  const isOnline = useOnlineStatus();

  // Ref for infinite scroll sentinel
  const loadMoreRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    checkStatus();
    fetchProfiles();
  }, [checkStatus, fetchProfiles]);

  useEffect(() => {
    fetchCategories();
    fetchProductsByCategory(null, 0);
  }, [fetchCategories, fetchProductsByCategory]);

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
          searchProducts(query, false);
          setSelectedCategory(null);
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
    setSearchTerm("");
    setPage(0);
    fetchProductsByCategory(categoryId, 0);
  };

  return (
    <>
      {/* Header Section */}
      <div className="pt-12 px-6 pb-6">
        <div className="flex justify-between items-start mb-8">
          {/* Greeting */}
          <div>
            <h1 className="text-4xl font-extrabold text-gray-900 tracking-tight mb-2">مرحباً 👋</h1>
            <p className="text-gray-400 text-lg font-medium">اختر منتجاتك المفضلة</p>
          </div>

          {/* Menu Button (Sheet Trigger) */}
          <Sheet>
            <SheetTrigger asChild>
              <button className="p-3 text-gray-900 hover:bg-gray-100 rounded-full transition-colors relative z-10 border border-transparent hover:border-gray-200">
                <Menu size={28} strokeWidth={2.5} />
              </button>
            </SheetTrigger>
            <SheetContent side="right" className="w-[300px] sm:w-[540px] z-[100] overflow-y-auto">
              <SheetHeader className="text-right mb-8">
                <SheetTitle className="text-2xl font-bold">القائمة</SheetTitle>
              </SheetHeader>

              <div className="flex flex-col gap-6 text-right">

                {/* Staff List Section (Primary) */}
                <div>
                  <h3 className="text-lg font-bold text-gray-700 mb-3 flex items-center justify-end gap-2">
                    المتواجدون الآن
                    <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                  </h3>
                  <div className="flex flex-col gap-3 max-h-[300px] overflow-y-auto pr-1">
                    {attendanceLoading ? (
                      <div className="flex justify-center p-4">
                        <Loader2 className="animate-spin text-gray-400" />
                      </div>
                    ) : profiles.length === 0 ? (
                      <p className="text-gray-400 text-sm py-2">لا يوجد موظفين</p>
                    ) : (
                      profiles.map((profile) => (
                        <div key={profile.id} className="flex items-center justify-end gap-3 p-3 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors">
                          <div className="text-right">
                            <p className="font-bold text-sm text-gray-900 leading-tight">{profile.full_name || 'مستخدم'}</p>
                            <p className="text-xs text-gray-500 mt-0.5">{profile.role || 'موظف'}</p>
                          </div>
                          <div className={cn(
                            "w-3 h-3 rounded-full border-2 border-white shadow-sm ring-2 ring-gray-100",
                            profile.is_clocked_in ? "bg-green-500" : "bg-gray-300"
                          )} />
                        </div>
                      ))
                    )}
                  </div>
                </div>

                <div className="h-px bg-gray-100 my-2"></div>

                {/* Navigation Links (Secondary) */}
                <div className="flex flex-col gap-2">
                  <SheetClose asChild>
                    <Button variant="ghost" className="justify-end gap-3 text-lg h-12" onClick={() => navigate('/')}>
                      <span>الرئيسية (المنتجات)</span> <Home size={20} />
                    </Button>
                  </SheetClose>

                  <SheetClose asChild>
                    <Button
                      variant="ghost"
                      className={cn(
                        "justify-end gap-3 text-lg h-12",
                        !isClockedIn && "opacity-50"
                      )}
                      onClick={() => navigate('/orders')}
                    >
                      <span className="flex items-center gap-2">
                        {!isClockedIn && <Lock size={14} className="text-gray-400" />}
                        طلباتي
                      </span>
                      <ShoppingBag size={20} />
                    </Button>
                  </SheetClose>

                  <SheetClose asChild>
                    <Button variant="ghost" className="justify-end gap-3 text-lg h-12" onClick={() => navigate('/management')}>
                      <span>الإعدادات</span> <Settings size={20} />
                    </Button>
                  </SheetClose>
                </div>

                <div className="h-px bg-gray-100 my-2"></div>

                {/* Status Indicator */}
                <div className={cn(
                  "flex items-center justify-end gap-2 px-4 py-3 rounded-xl transition-colors",
                  isOnline ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"
                )}>
                  <span className="font-bold text-sm">
                    {isOnline ? "أنت متصل بالإنترنت" : "أنت غير متصل"}
                  </span>
                  {isOnline ? <Wifi size={18} /> : <WifiOff size={18} />}
                </div>

                <SheetClose asChild>
                  <Button variant="ghost" className="justify-end gap-3 text-lg h-12 text-red-500 hover:text-red-600 hover:bg-red-50">
                    <span>تسجيل الخروج</span> <LogOut size={20} />
                  </Button>
                </SheetClose>
              </div>
            </SheetContent>
          </Sheet>
        </div>

        {/* Search Bar */}
        <div className="relative mb-8">
          <div className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400">
            <Search size={22} />
          </div>
          <Input
            type="text"
            placeholder="ابحث عن منتج..."
            className="w-full h-14 pr-12 pl-4 text-right text-lg bg-white border-0 shadow-sm rounded-2xl ring-1 ring-gray-100 focus-visible:ring-2 focus-visible:ring-gray-900 transition-shadow"
            value={searchTerm}
            onChange={handleSearchChange}
          />
        </div>

        {/* Categories (Icon Boxes) */}
        <div className="mb-10">
          <div className="flex justify-between items-end mb-5 px-1">
            <h2 className="font-bold text-xl text-gray-900">الأقسام</h2>
          </div>
          {categories.length > 0 && (
            <CategoryFilter
              categories={categories}
              selectedCategory={selectedCategory}
              onCategorySelect={handleCategorySelect}
            />
          )}
        </div>

        {/* Products Grid (High Contrast) */}
        <div>
          <div className="flex justify-between items-end mb-5 px-1">
            <h2 className="font-bold text-xl text-gray-900">المنتجات</h2>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
            {products
              .filter(p => searchTerm.trim() ? true : !p.parent_id) // Show all during search, only parents otherwise
              .map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
          </div>

          {/* Loaders */}
          <div ref={loadMoreRef} className="h-4 w-full flex justify-center mt-10">
            {loading && <Loader2 className="animate-spin text-gray-900" size={32} />}
          </div>

          {!loading && products.length === 0 && (
            <div className="text-center py-24 opacity-30">
              <p className="text-xl font-medium">لا توجد منتجات</p>
            </div>
          )}
        </div>
      </div>
    </>
  );
}