import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Product } from "@/types/pos";
import { useSupabaseProductStore } from "@/stores/useSupabaseProductStore";
import { formatCurrency } from "@/lib/currency";

interface ProductCardProps {
  product: Product;
}

export function ProductCard({ product }: ProductCardProps) {
  const addToCart = useSupabaseProductStore(state => state.addToCart);

  const handleAddToCart = () => {
    if (product.stock > 0) {
      addToCart(product);
    }
  };

  return (
    <Card
      className={`
        cursor-pointer transition-all duration-200 hover:shadow-lg hover:scale-105
        ${product.stock === 0 ? 'opacity-50 cursor-not-allowed' : ''}
        bg-pos-surface border-border/50 hover:border-primary/30
      `}
      onClick={handleAddToCart}
      style={{
        boxShadow: 'var(--shadow-card)',
        transition: 'var(--transition-smooth)'
      }}
    >
      <CardContent className="p-4">
        <div className="aspect-square mb-3 overflow-hidden rounded-lg bg-muted">
          <img
            src={product.image}
            alt={product.name}
            loading="lazy"
            decoding="async"
            className="w-full h-full object-cover"
          />
        </div>

        <div className="space-y-2">
          <h3 className="font-semibold text-foreground text-right text-sm leading-tight">
            {product.name}
          </h3>

          <div className="flex items-center justify-between">
            <div className="flex flex-col items-start">
              <span className="text-lg font-bold text-primary">
                {formatCurrency(product.price)}
              </span>
              <Badge
                variant={product.stock > 10 ? "default" : product.stock > 0 ? "secondary" : "destructive"}
                className="text-xs"
              >
                {product.stock > 0 ? `متوفر (${product.stock})` : 'غير متوفر'}
              </Badge>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}