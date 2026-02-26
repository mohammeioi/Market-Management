import { Category } from "@/types/pos";
import { cn } from "@/lib/utils";
import { Lamp, Armchair, Utensils, Coffee, Box } from "lucide-react"; // Generic icons

interface CategoryFilterProps {
  categories: Category[];
  selectedCategory: string | null;
  onCategorySelect: (categoryId: string | null) => void;
}

export function CategoryFilter({
  categories,
  selectedCategory,
  onCategorySelect
}: CategoryFilterProps) {

  // Visual mapping for categories (Mock)
  const getIcon = (name: string) => {
    if (name.includes('مشروبات')) return <Coffee size={28} />;
    if (name.includes('طعام')) return <Utensils size={28} />;
    return <Box size={28} />;
  };

  return (
    <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide px-2">
      {/* 'All' Square */}
      <button
        onClick={() => onCategorySelect(null)}
        className={cn(
          "flex-shrink-0 w-24 h-24 rounded-[1.5rem] flex flex-col items-center justify-center gap-3 transition-all duration-300",
          selectedCategory === null
            ? "bg-primary text-primary-foreground shadow-neu-inset scale-95"
            : "bg-background text-muted-foreground hover:text-foreground shadow-neu hover:shadow-neu-sm"
        )}
      >
        <Lamp size={28} strokeWidth={2} />
        <span className="text-xs font-bold">الكل</span>
      </button>

      {/* Category Squares */}
      {categories.map((category) => (
        <button
          key={category.id}
          onClick={() => onCategorySelect(category.id)}
          className={cn(
            "flex-shrink-0 w-24 h-24 rounded-[1.5rem] flex flex-col items-center justify-center gap-3 transition-all duration-300",
            selectedCategory === category.id
              ? "bg-primary text-primary-foreground shadow-neu-inset scale-95"
              : "bg-background text-muted-foreground hover:text-foreground shadow-neu hover:shadow-neu-sm"
          )}
        >
          {getIcon(category.name)}
          <span className="text-xs font-bold truncate max-w-[80%]">{category.name}</span>
        </button>
      ))}
    </div>
  );
}