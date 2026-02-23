import { useAuth } from "@/contexts/AuthContext";
import { POSView } from "./POSView";
import { DailyProfits } from "@/components/DailyProfits";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

const Index = () => {
  const { user } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const checkRole = async () => {
      if (!user) return;

      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('role')
          .eq('user_id', user.id)
          .single();

        if (!error && data && data.role === 'admin') {
          setIsAdmin(true);
        }
      } catch (e) {
        console.error("Error checking role:", e);
      }
    };

    checkRole();
  }, [user]);

  return (
    <div className="w-full max-w-7xl mx-auto px-2 sm:px-4 md:px-6 lg:px-8 pt-4 pb-10">
      {isAdmin && <DailyProfits />}
      <POSView />
    </div>
  );
};

export default Index;
