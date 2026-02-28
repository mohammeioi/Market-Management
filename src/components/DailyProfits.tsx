import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Order } from "@/types/order";
import { formatCurrency } from "@/lib/currency";
import { DollarSign, History, Trash2, TrendingUp, ChevronDown, ChevronUp, BarChart3, Receipt } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
    Dialog,
    DialogContent,
    DialogTrigger,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

export const DailyProfits = () => {
    const [profits, setProfits] = useState<{ date: string, total_amount: number, total_orders: number }[]>([]);
    const [loading, setLoading] = useState(true);
    const [showHistory, setShowHistory] = useState(false);
    const { toast } = useToast();

    const fetchProfits = async () => {
        try {
            setLoading(true);
            const { data, error } = await supabase
                .from('daily_profits')
                .select('date, total_amount, total_orders')
                .order('date', { ascending: false });

            if (error) throw error;
            setProfits(data || []);
        } catch (error: any) {
            console.error('Error fetching profits:', error);
            toast({
                title: 'خطأ',
                description: 'حدث خطأ أثناء جلب بيانات الأرباح',
                variant: 'destructive',
            });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchProfits();

        // Setup realtime subscription for new delivered orders
        const channel = supabase
            .channel('profits-changes')
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'daily_profits',
                },
                () => {
                    fetchProfits();
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, []);

    // Helper to get local date string YYYY-MM-DD
    const getLocalDateStr = (isoString?: string) => {
        const date = isoString ? new Date(isoString) : new Date();
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    };

    const today = getLocalDateStr();

    const todayProfits = profits.find(p => p.date === today);
    const historyProfits = profits.filter(p => p.date !== today);

    const todayTotal = todayProfits?.total_amount || 0;
    const historyTotal = historyProfits.reduce((sum, p) => sum + p.total_amount, 0);
    const grandTotal = todayTotal + historyTotal;

    // Group history by date (already grouped in DB, just formatting)
    const groupedHistory = historyProfits.reduce((acc, p) => {
        acc[p.date] = p.total_amount;
        return acc;
    }, {} as Record<string, number>);

    const sortedHistoryDates = Object.keys(groupedHistory).sort((a, b) => new Date(b).getTime() - new Date(a).getTime());

    const handleClearHistory = async () => {
        try {
            if (historyProfits.length === 0) return;

            const historyIds = historyProfits.map(o => o.id);

            const { error } = await supabase
                .from('daily_profits')
                .delete()
                .neq('date', today);

            if (error) throw error;

            toast({
                title: 'تم مسح السجل',
                description: 'تم مسح سجل الأرباح القديمة بنجاح',
            });

            fetchProfits();
        } catch (error: any) {
            console.error('Error clearing history:', error);
            toast({
                title: 'خطأ',
                description: 'حدث خطأ أثناء مسح السجل',
                variant: 'destructive',
            });
        }
    };

    if (loading) {
        return (
            <div className="flex items-center gap-3 bg-gray-50 border border-gray-100 px-4 py-2.5 rounded-2xl animate-pulse w-max mb-6">
                <div className="w-8 h-8 rounded-xl bg-gray-200"></div>
                <div className="space-y-2">
                    <div className="h-3 w-16 bg-gray-200 rounded"></div>
                    <div className="h-4 w-24 bg-gray-200 rounded"></div>
                </div>
            </div>
        );
    }

    return (
        <Dialog>
            <DialogTrigger asChild>
                <button className="group relative flex items-center justify-end gap-4 bg-background transition-all px-4 py-3 rounded-3xl mb-8 border-none shadow-neu hover:shadow-neu-sm active:shadow-neu-inset w-full sm:w-auto">
                    <div className="flex flex-col text-right">
                        <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-0.5">أرباح اليوم المكتملة</span>
                        <span className="text-xl font-black text-gray-900 leading-none" dir="ltr">
                            {formatCurrency(todayTotal)}
                        </span>
                    </div>
                    <div className="w-12 h-12 bg-gradient-to-br from-green-100 to-emerald-50 text-green-600 rounded-2xl flex shrink-0 items-center justify-center shadow-inner group-hover:scale-105 transition-transform duration-300">
                        <BarChart3 size={24} strokeWidth={2.5} />
                    </div>
                    <div className="absolute left-4 opacity-0 group-hover:opacity-100 transition-opacity text-green-600 bg-background p-1.5 rounded-full shadow-neu">
                        <Receipt size={16} />
                    </div>
                </button>
            </DialogTrigger>

            <DialogContent className="sm:max-w-md p-0 overflow-hidden bg-background border-none shadow-neu rounded-[2rem]">
                <div className="w-full bg-background">
                    {/* Today's Profit Header inside Dialog */}
                    <div className="p-6 bg-gradient-to-br from-green-50 to-emerald-50/30 border-b border-green-100/50">
                        <div className="flex justify-center mb-4">
                            <div className="w-16 h-16 bg-green-100 text-green-600 rounded-2xl flex items-center justify-center shadow-inner">
                                <DollarSign size={32} strokeWidth={3} />
                            </div>
                        </div>
                        <div className="text-center mb-6">
                            <h2 className="text-gray-500 font-bold mb-1">أرباح اليوم المكتملة</h2>
                            <h3 className="text-4xl font-black text-green-600">
                                {formatCurrency(todayTotal)}
                            </h3>
                        </div>

                        {/* Grand Total */}
                        <div className="flex items-center justify-between bg-background p-4 rounded-xl border-none shadow-neu-inset">
                            <div className="flex items-center gap-2 text-gray-700">
                                <TrendingUp size={20} className="text-blue-500" />
                                <span className="font-bold">المجموع الكلي:</span>
                            </div>
                            <span className="font-black text-xl text-gray-900">
                                {formatCurrency(grandTotal)}
                            </span>
                        </div>
                    </div>

                    {/* History Section Toggle */}
                    <button
                        onClick={() => setShowHistory(!showHistory)}
                        className="w-full flex items-center justify-between p-4 bg-background transition-all border-none"
                    >
                        <div className="flex items-center gap-2 text-gray-700 font-bold">
                            <History size={20} className="text-blue-500" />
                            <span>سجل الأرباح السابقة</span>
                        </div>
                        <div className="flex items-center gap-3">
                            <span className="font-bold text-gray-900 text-lg">{formatCurrency(historyTotal)}</span>
                            {showHistory ? <ChevronUp size={20} className="text-gray-400" /> : <ChevronDown size={20} className="text-gray-400" />}
                        </div>
                    </button>

                    {/* History Content */}
                    <div className={cn(
                        "transition-all duration-300 overflow-hidden bg-gray-50",
                        showHistory ? "max-h-[300px] overflow-y-auto" : "max-h-0"
                    )}>
                        <div className="p-4">
                            {sortedHistoryDates.length > 0 ? (
                                <div className="space-y-3">
                                    <div className="flex justify-between items-center mb-4 px-1">
                                        <span className="text-sm font-bold text-gray-500">تفاصيل الأيام</span>
                                        <AlertDialog>
                                            <AlertDialogTrigger asChild>
                                                <button className="flex items-center gap-1.5 text-xs font-bold text-red-600 hover:text-red-700 bg-red-50 hover:bg-red-100 px-3 py-1.5 rounded-lg transition-colors">
                                                    <Trash2 size={14} />
                                                    مسح السجل
                                                </button>
                                            </AlertDialogTrigger>
                                            <AlertDialogContent>
                                                <AlertDialogHeader>
                                                    <AlertDialogTitle>هل أنت متأكد من مسح سجل الأرباح؟</AlertDialogTitle>
                                                    <AlertDialogDescription>
                                                        سيتم تصفير أرباح الأيام السابقة ولن يتم احتسابها ضمن المجموع. الطلبات الأصلية لن يتم حذفها وستبقى محفوظة في النظام.
                                                    </AlertDialogDescription>
                                                </AlertDialogHeader>
                                                <AlertDialogFooter className="flex-row-reverse sm:justify-start gap-2">
                                                    <AlertDialogAction onClick={handleClearHistory} className="bg-red-600 hover:bg-red-700">
                                                        تأكيد ومسح
                                                    </AlertDialogAction>
                                                    <AlertDialogCancel className="mt-0">إلغاء</AlertDialogCancel>
                                                </AlertDialogFooter>
                                            </AlertDialogContent>
                                        </AlertDialog>
                                    </div>

                                    {sortedHistoryDates.map((date) => (
                                        <div key={date} className="flex justify-between items-center bg-background p-3.5 rounded-xl border-none shadow-neu">
                                            <span className="font-bold text-gray-600 text-sm" dir="ltr">{date}</span>
                                            <span className="font-black text-gray-900">{formatCurrency(groupedHistory[date])}</span>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center py-8">
                                    <History size={36} className="mx-auto text-gray-200 mb-3" />
                                    <p className="text-gray-400 font-medium text-sm">لا يوجد سجل أرباح للأيام السابقة</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
};
