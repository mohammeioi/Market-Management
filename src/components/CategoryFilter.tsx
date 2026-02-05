import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Category } from "@/types/pos";

interface CategoryFilterProps {
  categories: Category[];
  selectedCategory: string | null;
  onCategorySelect: (categoryId: string | null) => void;
  productCounts?: Record<string, number>;
}

export function CategoryFilter({
  categories,
  selectedCategory,
  onCategorySelect,
  productCounts
}: CategoryFilterProps) {
  return (
    <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
      <Button
        variant={selectedCategory === null ? "default" : "outline"}
        onClick={() => onCategorySelect(null)}
        className="flex-shrink-0 gap-2"
      >
        الكل
        {productCounts && (
          <Badge variant="secondary" className="ml-1">
            {Object.values(productCounts).reduce((a, b) => a + b, 0)}
          </Badge>
        )}
      </Button>

      {categories.map((category) => (
        <Button
          key={category.id}
          variant={selectedCategory === category.id ? "default" : "outline"}
          onClick={() => onCategorySelect(category.id)}
          className="flex-shrink-0 gap-2"
        >
          <span>{category.icon}</span>
          {category.name}
          {productCounts && productCounts[category.name] > 0 && (
            <Badge variant="secondary" className="ml-1">
              {productCounts[category.name]}
            </Badge>
          )}
        </Button>
      ))}
    </div>
  );
}