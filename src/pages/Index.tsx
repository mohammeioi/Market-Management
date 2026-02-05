import { useAuth } from "@/contexts/AuthContext";
import { POSView } from "./POSView";
import { Navigation } from "@/components/Navigation";

const Index = () => {
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-background" dir="rtl">
      <div className="container mx-auto p-4">
        <div className="mb-6">
          <Navigation />
        </div>
        
        <POSView />
      </div>
    </div>
  );
};

export default Index;
