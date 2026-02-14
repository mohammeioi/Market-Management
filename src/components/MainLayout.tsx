import { ReactNode } from "react";
import { Navigation } from "@/components/Navigation";

interface MainLayoutProps {
    children: ReactNode;
}

export function MainLayout({ children }: MainLayoutProps) {
    return (
        <div className="min-h-screen bg-[#F8F9FA] pb-32 font-sans selection:bg-black selection:text-white" dir="rtl">
            <main className="w-full">
                {children}
            </main>
            <Navigation />
        </div>
    );
}
