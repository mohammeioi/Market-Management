import { useAuth } from "@/contexts/AuthContext";
import { POSView } from "./POSView";
import { Navigation } from "@/components/Navigation";

const Index = () => {
  const { user } = useAuth();

  return (
    <div className="container mx-auto px-4 pt-4">
      <POSView />
    </div>
  );
};

export default Index;
