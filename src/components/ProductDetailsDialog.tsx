import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Product } from "@/types/pos";
import { formatCurrency } from "@/lib/currency";
import { Badge } from "@/components/ui/badge";
import { Tag, Package, Barcode } from "lucide-react";

interface ProductDetailsDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    product: Product | null;
}

export function ProductDetailsDialog({ open, onOpenChange, product }: ProductDetailsDialogProps) {
    if (!product) return null;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md" dir="rtl">
                <DialogHeader>
                    <DialogTitle className="text-right text-xl font-bold">تفاصيل المنتج</DialogTitle>
                </DialogHeader>

                <div className="space-y-6">
                    {/* Image */}
                    <div className="relative w-full aspect-video rounded-lg overflow-hidden bg-gray-100 border border-gray-200">
                        <img
                            src={product.image}
                            alt={product.name}
                            className="w-full h-full object-cover"
                        />
                    </div>

                    {/* Details */}
                    <div className="space-y-4 text-right">
                        <div>
                            <h3 className="text-2xl font-bold text-gray-900">{product.name}</h3>
                            <div className="flex items-center gap-2 mt-2">
                                <Badge variant="outline" className="flex items-center gap-1">
                                    <Tag size={12} />
                                    {product.category}
                                </Badge>
                                {product.barcode && (
                                    <Badge variant="secondary" className="flex items-center gap-1">
                                        <Barcode size={12} />
                                        {product.barcode}
                                    </Badge>
                                )}
                            </div>
                        </div>

                        <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                            <div className="text-right">
                                <p className="text-sm text-gray-500 mb-1">السعر</p>
                                <p className="text-xl font-bold text-primary">{formatCurrency(product.price)}</p>
                            </div>
                            <div className="text-left">
                                <p className="text-sm text-gray-500 mb-1">المخزون</p>
                                <div className="flex items-center gap-2">
                                    <Package size={20} className="text-gray-400" />
                                    <span className={`text-lg font-bold ${product.stock > 0 ? 'text-gray-900' : 'text-red-500'}`}>
                                        {product.stock}
                                    </span>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <p className="font-semibold text-gray-900">الحالة:</p>
                            <div className="flex gap-2">
                                <Badge variant={product.stock > 0 ? "default" : "destructive"}>
                                    {product.stock > 0 ? "متوفر" : "نفذ الكمية"}
                                </Badge>
                                {product.isAvailable === false && (
                                    <Badge variant="destructive">غير متاح للبيع</Badge>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
