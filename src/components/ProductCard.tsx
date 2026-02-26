import { useState } from "react";
import { Product } from "@/types/pos";
import { formatCurrency } from "@/lib/currency";
import { Zap, ZoomIn, ChevronRight, ChevronLeft } from "lucide-react";
import { ProductDetailsDialog } from "./ProductDetailsDialog";
import { cn } from "@/lib/utils";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

interface ProductCardProps {
  product: Product;
}

export function ProductCard({ product }: ProductCardProps) {
  const [showDetails, setShowDetails] = useState(false);
  const [showFullImage, setShowFullImage] = useState(false);

  // Initialize with the parent product itself as the default selected item
  const [selectedVariant, setSelectedVariant] = useState<Product>(product);

  const handleImageClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowFullImage(true);
  };

  const handleVariantSelect = (e: React.MouseEvent, variant: Product) => {
    e.stopPropagation(); // Prevents opening the details dialog
    setSelectedVariant(variant);
  };

  // Combine parent product with its variants for the selector
  const allOptions = [product, ...(product.variants || [])];
  const hasVariants = allOptions.length > 1;

  const handleNextVariant = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    const currentIndex = allOptions.findIndex(v => v.id === selectedVariant.id);
    const nextIndex = (currentIndex + 1) % allOptions.length;
    setSelectedVariant(allOptions[nextIndex]);
  };

  const handlePrevVariant = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    const currentIndex = allOptions.findIndex(v => v.id === selectedVariant.id);
    const prevIndex = (currentIndex - 1 + allOptions.length) % allOptions.length;
    setSelectedVariant(allOptions[prevIndex]);
  };

  return (
    <>
      <div
        className={cn(
          "group relative flex flex-col items-center justify-between p-3 sm:p-5 rounded-3xl sm:rounded-[2.5rem] transition-all cursor-pointer hover:scale-[1.02] active:scale-95 aspect-[4/5] bg-background shadow-neu hover:shadow-neu-sm border-none overflow-hidden",
        )}
        onClick={() => setShowDetails(true)}
      >


        {/* Top: Removed Status Badge (Clean) */}
        <div className="w-full flex justify-between items-start z-10 w-full h-6">
          {/* Space keeper or empty */}
        </div>

        {/* Center: Large Image with Floating Arrows */}
        <div className="flex-1 flex items-center justify-center w-full my-1 sm:my-2 relative z-10">
          {hasVariants && (
            <button
              type="button"
              onClick={handlePrevVariant}
              className="absolute right-0 sm:-right-2 p-1.5 sm:p-2 rounded-full bg-background/90 backdrop-blur-md shadow-neu hover:shadow-neu-sm border-none text-gray-600 hover:text-gray-900 z-20 active:shadow-neu-inset transition-all"
            >
              <ChevronRight className="w-5 h-5 sm:w-6 sm:h-6" />
            </button>
          )}

          <div className={cn("mx-auto w-[90%] aspect-square max-w-[240px] rounded-[2rem] flex items-center justify-center text-gray-900 overflow-hidden shadow-neu-inset bg-background relative group p-1 sm:p-2")}>
            {selectedVariant.image ? (
              <>
                <img
                  src={selectedVariant.image}
                  alt=""
                  className="w-full h-full object-contain mix-blend-multiply cursor-pointer hover:scale-[1.15] transition-transform duration-300"
                  onClick={handleImageClick}
                />
                {/* Hover effect for image */}
                <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-10 transition-all duration-200 flex items-center justify-center">
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                    <div className="bg-background rounded-full p-2 shadow-neu">
                      <ZoomIn size={16} className="text-gray-700" />
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <Zap size={40} className="text-gray-300" />
            )}
          </div>

          {hasVariants && (
            <button
              type="button"
              onClick={handleNextVariant}
              className="absolute left-0 sm:-left-2 p-1.5 sm:p-2 rounded-full bg-background/90 backdrop-blur-md shadow-neu hover:shadow-neu-sm border-none text-gray-600 hover:text-gray-900 z-20 active:shadow-neu-inset transition-all"
            >
              <ChevronLeft className="w-5 h-5 sm:w-6 sm:h-6" />
            </button>
          )}
        </div>

        {/* Bottom: Title & Price */}
        <div className="w-full text-center mt-1 sm:mt-2 z-10 flex flex-col items-center gap-0.5 sm:gap-1">
          <h3 className="font-bold text-base sm:text-xl leading-tight line-clamp-1 text-gray-900 px-1">
            {selectedVariant.name}
          </h3>
          <p className={cn("text-sm sm:text-lg text-primary font-bold")}>
            {formatCurrency(selectedVariant.price)}
          </p>
          {hasVariants ? (
            <span className="text-[10px] sm:text-xs font-bold text-primary shadow-neu-inset px-3 py-1 bg-background rounded-full mt-1 border-none line-clamp-1 max-w-[90%]">
              {product.category}
            </span>
          ) : (
            <div className="h-[20px] sm:h-[24px] mt-0.5"></div>
          )}
        </div>
      </div>

      <ProductDetailsDialog
        open={showDetails}
        onOpenChange={setShowDetails}
        product={selectedVariant}
      />

      {/* Full Image Dialog */}
      <Dialog open={showFullImage} onOpenChange={setShowFullImage}>
        <DialogContent className="sm:max-w-[95vw] max-h-[95vh] p-1 sm:p-6">
          <DialogHeader className="hidden sm:block">
            <DialogTitle className="text-right text-xl font-bold">صورة المنتج</DialogTitle>
          </DialogHeader>
          <div className="flex items-center justify-center min-h-[50vh] sm:min-h-[70vh]">
            <img
              src={selectedVariant.image}
              alt={selectedVariant.name}
              className="max-w-full max-h-[80vh] object-contain rounded-lg"
            />
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}