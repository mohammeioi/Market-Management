import { useState } from "react";
import { Product } from "@/types/pos";
import { formatCurrency } from "@/lib/currency";
import { Zap } from "lucide-react";
import { ProductDetailsDialog } from "./ProductDetailsDialog";
import { cn } from "@/lib/utils";

interface ProductCardProps {
  product: Product;
}

export function ProductCard({ product }: ProductCardProps) {
  const [showDetails, setShowDetails] = useState(false);

  return (
    <>
      <div
        className={cn(
          "group relative flex flex-col items-center justify-between p-5 rounded-[2.5rem] transition-all cursor-pointer hover:scale-[1.02] active:scale-95 aspect-[4/5] bg-white shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-xl border border-gray-100/50 overflow-hidden",
        )}
        onClick={() => setShowDetails(true)}
      >
        {/* Ambient Background Layer */}
        <div
          className="absolute inset-0 opacity-20 blur-xl scale-150 transition-transform duration-700 group-hover:scale-125 group-hover:opacity-30"
          style={{
            backgroundImage: `url(${product.image || ''})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center'
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-white/10 to-white/90 z-0" />

        {/* Top: Removed Status Badge (Clean) */}
        <div className="w-full flex justify-between items-start z-10 w-full h-6">
          {/* Space keeper or empty */}
        </div>

        {/* Center: Large Image */}
        <div className="flex-1 flex items-center justify-center w-full my-2 relative z-10">
          <div className={cn("w-32 h-32 rounded-2xl flex items-center justify-center text-gray-900 overflow-hidden shadow-sm bg-transparent")}>
            {product.image ? (
              <img src={product.image} alt="" className="w-full h-full object-cover mix-blend-multiply drop-shadow-lg" />
            ) : (
              <Zap size={40} className="text-gray-300" />
            )}
          </div>
        </div>

        {/* Bottom: Title & Price */}
        <div className="w-full text-center mt-2 z-10 space-y-1">
          <h3 className="font-bold text-lg leading-tight line-clamp-1 text-gray-900">
            {product.name}
          </h3>
          <p className={cn("text-base text-gray-500 font-medium")}>
            {formatCurrency(product.price)}
          </p>
        </div>
      </div>

      <ProductDetailsDialog
        open={showDetails}
        onOpenChange={setShowDetails}
        product={product}
      />
    </>
  );
}