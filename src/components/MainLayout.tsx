import { ReactNode } from "react";
import { Navigation } from "@/components/Navigation";

interface MainLayoutProps {
    children: ReactNode;
}

export function MainLayout({ children }: MainLayoutProps) {
    return (
        <div className="min-h-screen bg-background pb-32 font-sans selection:bg-primary selection:text-primary-foreground" dir="rtl">
            <main className="w-full">
                {children}
            </main>
            <Navigation />
        </div>
    );
}
