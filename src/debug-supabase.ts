
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = "https://ebghltixenyygueymcpm.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImViZ2hsdGl4ZW55eWd1ZXltY3BtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTUwODg0OTQsImV4cCI6MjA3MDY2NDQ5NH0.GHT4O30VRY0QNFU3OagalivbbEY-JRrPXRFOcRIbloQ";

const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  }
});

async function main() {
  console.log("Checking Supabase connection...");

  // 1. Fetch simple count
  const { count, error: countError } = await supabase
    .from('products')
    .select('*', { count: 'exact', head: true });

  if (countError) {
    console.error("Error fetching count:", countError);
    return;
  }
  console.log("Total products count:", count);

  // 2. Fetch products with categories
  console.log("Fetching products with categories...");
  const { data, error } = await supabase
    .from('products')
    .select(`
      *,
      categories(name, icon)
    `)
    .limit(5);

  if (error) {
    console.error("Error fetching products:", error);
  } else {
    console.log("Fetched products successfully:", JSON.stringify(data, null, 2));
    if (data.length === 0) {
      console.log("Warning: No products returned.");
    }
  }
  
  // 3. Check categories table
  const { count: catCount, error: catError } = await supabase
      .from('categories')
      .select('*', { count: 'exact', head: true });
    
    if(catError) {
        console.error("Error fetching categories count:", catError);
    } else {
        console.log("Total categories count:", catCount);
    }

}

main();
