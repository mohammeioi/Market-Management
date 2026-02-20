import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { useAuth, AuthProvider } from "@/contexts/AuthContext";
import { AuthPage } from "@/pages/AuthPage";
import Index from "./pages/Index";
import { Orders } from "./pages/Orders";
import { UserOrdersPage } from "./pages/UserOrdersPage";
import { Management } from "./pages/Management";
import { OrderDetails } from "./pages/OrderDetails";
import NotFound from "./pages/NotFound";
import { MainLayout } from "@/components/MainLayout";

const queryClient = new QueryClient();

const AppContent = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">جاري التحميل...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <AuthPage onAuth={() => { }} />;
  }

  return (
    <BrowserRouter>
      <MainLayout>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/orders" element={<Orders />} />
          <Route path="/user-orders" element={<UserOrdersPage />} />
          <Route path="/order-details/:orderId" element={<OrderDetails />} />
          <Route path="/management" element={<Management />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </MainLayout>
    </BrowserRouter>
  );
};

import { useEffect } from "react";
import { NotificationService } from "./services/NotificationService";

const App = () => {
  useEffect(() => {
    NotificationService.init();
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <AuthProvider>
          <AppContent />
        </AuthProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
