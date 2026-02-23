import React, { useState, useEffect } from 'react';
import { useSupabaseProductStore } from '../stores/useSupabaseProductStore';
import { Pencil, Trash2, X, Check, Search } from 'lucide-react';
import { toast } from 'sonner';

interface CategoryManagementDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export function CategoryManagementDialog({ open, onOpenChange }: CategoryManagementDialogProps) {
    const { categories, fetchCategories, updateCategory, deleteCategory } = useSupabaseProductStore();
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editName, setEditName] = useState('');
    const [searchQuery, setSearchQuery] = useState('');

    // Fetch categories when opening Dialog if empty
    useEffect(() => {
        if (open && categories.length === 0) {
            fetchCategories();
        }
    }, [open, categories.length, fetchCategories]);

    if (!open) return null;

    const handleEdit = (id: string, currentName: string) => {
        setEditingId(id);
        setEditName(currentName);
    };

    const handleSaveEdit = async (id: string) => {
        if (!editName.trim()) {
            toast.error('اسم الفئة لا يمكن أن يكون فارغاً');
            return;
        }

        try {
            await updateCategory(id, editName.trim());
            toast.success('تم تحديث الفئة بنجاح');
            setEditingId(null);
        } catch (error) {
            toast.error('فشل في تحديث الفئة');
        }
    };

    const handleDelete = async (id: string) => {
        if (confirm('هل أنت متأكد من حذف هذه الفئة؟ سيتم إزالة الفئة من جميع المنتجات المرتبطة بها.')) {
            try {
                await deleteCategory(id);
                toast.success('تم حذف الفئة بنجاح');
            } catch (error) {
                toast.error('فشل في حذف الفئة');
            }
        }
    };

    const filteredCategories = categories.filter(c =>
        c.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={() => onOpenChange(false)}>
            <div
                className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]"
                onClick={(e) => e.stopPropagation()}
                dir="rtl"
            >
                {/* Header */}
                <div className="flex justify-between items-center px-6 py-4 border-b border-gray-100 bg-gray-50/50">
                    <h2 className="text-xl font-bold text-gray-900">إدارة الفئات</h2>
                    <button
                        onClick={() => onOpenChange(false)}
                        className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Search */}
                <div className="p-4 border-b border-gray-100">
                    <div className="relative">
                        <input
                            type="text"
                            placeholder="ابحث عن الفئة..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full bg-gray-50 border border-gray-200 rounded-xl py-2.5 px-4 pr-10 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm"
                        />
                        <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                    </div>
                </div>

                {/* List */}
                <div className="flex-1 overflow-y-auto p-4 space-y-2">
                    {filteredCategories.length === 0 ? (
                        <div className="text-center py-12 text-gray-500">لا توجد فئات مطابقة للبحث</div>
                    ) : (
                        filteredCategories.map(category => (
                            <div key={category.id} className="flex items-center justify-between p-3 rounded-xl border border-gray-100 hover:border-blue-100 bg-white group transition-all">
                                {editingId === category.id ? (
                                    <div className="flex-1 flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                                        <input
                                            type="text"
                                            value={editName}
                                            onChange={(e) => setEditName(e.target.value)}
                                            className="flex-1 border border-blue-200 bg-blue-50/50 rounded-lg px-3 py-1.5 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 text-sm font-medium text-gray-900"
                                            autoFocus
                                            onKeyDown={(e) => e.key === 'Enter' && handleSaveEdit(category.id)}
                                        />
                                        <div className="flex items-center gap-1">
                                            <button
                                                onClick={() => handleSaveEdit(category.id)}
                                                className="p-1.5 sm:p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
                                                title="حفظ"
                                            >
                                                <Check size={16} />
                                            </button>
                                            <button
                                                onClick={() => setEditingId(null)}
                                                className="p-1.5 sm:p-2 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 transition-colors"
                                                title="إلغاء"
                                            >
                                                <X size={16} />
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    <>
                                        <div className="font-medium text-gray-900 flex-1">{category.name}</div>
                                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button
                                                onClick={() => handleEdit(category.id, category.name)}
                                                className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                                title="تعديل"
                                            >
                                                <Pencil size={16} />
                                            </button>
                                            <button
                                                onClick={() => handleDelete(category.id)}
                                                className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                                title="حذف"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    </>
                                )}
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
}
