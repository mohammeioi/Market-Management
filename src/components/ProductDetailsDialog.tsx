import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Product } from "@/types/pos";
import { formatCurrency } from "@/lib/currency";
import { Badge } from "@/components/ui/badge";
import { Tag, Package, Barcode, Eye, ZoomIn } from "lucide-react";
import { useState } from "react";

interface ProductDetailsDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    product: Product | null;
}

export function ProductDetailsDialog({ open, onOpenChange, product }: ProductDetailsDialogProps) {
    const [showFullImage, setShowFullImage] = useState(false);

    if (!product) return null;

    const handleImageClick = () => {
        setShowFullImage(true);
    };

    return (
        <>
            <Dialog open={open} onOpenChange={onOpenChange}>
                <DialogContent className="sm:max-w-[95vw] max-h-[90vh] overflow-y-auto" dir="rtl">
                    <DialogHeader>
                        <DialogTitle className="text-right text-xl font-bold">تفاصيل المنتج</DialogTitle>
                    </DialogHeader>

                    <div className="space-y-4 sm:space-y-6">
                        {/* Image */}
                        <div className="relative w-full aspect-video rounded-lg overflow-hidden bg-gray-100 border border-gray-200 group cursor-pointer" onClick={handleImageClick}>
                            <img
                                src={product.image}
                                alt={product.name}
                                className="w-full h-full object-cover transition-transform duration-200 group-hover:scale-105"
                            />
                            <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-10 transition-all duration-200 flex items-center justify-center">
                                <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                                    <div className="bg-white rounded-full p-2 shadow-lg">
                                        <ZoomIn size={20} className="text-gray-700" />
                                    </div>
                                </div>
                            </div>
                            <div className="absolute top-2 left-2 bg-white rounded-full p-1.5 shadow-md opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                                <Eye size={16} className="text-gray-600" />
                            </div>
                        </div>

                        {/* Details */}
                        <div className="space-y-3 sm:space-y-4 text-right">
                            <div>
                                <h3 className="text-lg sm:text-2xl font-bold text-gray-900">{product.name}</h3>
                                <div className="flex items-center gap-2 mt-2 flex-wrap">
                                    <Badge variant="outline" className="flex items-center gap-1 bg-blue-50 border-blue-200 text-blue-700 text-xs sm:text-sm">
                                        <Tag size={12} />
                                        {product.category}
                                    </Badge>
                                    {product.barcode && (
                                        <Badge variant="secondary" className="flex items-center gap-1 bg-gray-50 border-gray-200 text-xs">
                                            <Barcode size={12} />
                                            <span className="hidden sm:inline">{product.barcode}</span>
                                            <span className="sm:hidden">{product.barcode.slice(0, 8)}...</span>
                                        </Badge>
                                    )}
                                </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                                <div className="p-3 sm:p-4 bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg border border-blue-200">
                                    <div className="text-right">
                                        <p className="text-xs sm:text-sm text-blue-600 mb-1 font-medium">السعر</p>
                                        <p className="text-lg sm:text-xl font-bold text-blue-900">{formatCurrency(product.price)}</p>
                                    </div>
                                </div>
                                <div className="p-3 sm:p-4 bg-gradient-to-br from-green-50 to-green-100 rounded-lg border border-green-200">
                                    <div className="text-left">
                                        <p className="text-xs sm:text-sm text-green-600 mb-1 font-medium">المخزون</p>
                                        <div className="flex items-center gap-2 justify-end">
                                            <Package size={16} className="text-green-600" />
                                            <span className={`text-base sm:text-lg font-bold ${product.stock > 0 ? 'text-green-900' : 'text-red-600'}`}>
                                                {product.stock}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-2 sm:space-y-3">
                                <p className="font-semibold text-gray-900">الحالة:</p>
                                <div className="flex gap-2 flex-wrap">
                                    <Badge variant={product.stock > 0 ? "default" : "destructive"} className="px-2 sm:px-3 py-1 text-xs sm:text-sm">
                                        {product.stock > 0 ? "✓ متوفر" : "✗ نفذ الكمية"}
                                    </Badge>
                                    {product.isAvailable === false && (
                                        <Badge variant="destructive" className="px-2 sm:px-3 py-1 text-xs sm:text-sm">
                                            ⚠ غير متاح للبيع
                                        </Badge>
                                    )}
                                    {product.isAvailable !== false && product.stock > 0 && (
                                        <Badge variant="secondary" className="bg-green-100 text-green-700 border-green-200 px-2 sm:px-3 py-1 text-xs sm:text-sm">
                                            ✓ متاح للبيع
                                        </Badge>
                                    )}
                                </div>
                            </div>

                            {/* Additional Info */}
                            {product.id && (
                                <div className="p-2 sm:p-3 bg-gray-50 rounded-lg border border-gray-200">
                                    <p className="text-xs text-gray-500 text-right">
                                        معرف المنتج: <span className="font-mono text-gray-700">{product.id.slice(0, 8)}...</span>
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Full Image Dialog */}
            <Dialog open={showFullImage} onOpenChange={setShowFullImage}>
                <DialogContent className="sm:max-w-[95vw] max-h-[95vh] p-1 sm:p-6">
                    <DialogHeader className="hidden sm:block">
                        <DialogTitle className="text-right text-xl font-bold">صورة المنتج</DialogTitle>
                    </DialogHeader>
                    <div className="flex items-center justify-center min-h-[50vh] sm:min-h-[70vh]">
                        <img
                            src={product.image}
                            alt={product.name}
                            className="max-w-full max-h-[80vh] object-contain rounded-lg"
                        />
                    </div>
                </DialogContent>
            </Dialog>
        </>
    );
}
