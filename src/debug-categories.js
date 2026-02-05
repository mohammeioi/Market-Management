
const inspectCategories = async () => {
    const SUPABASE_URL = "https://ebghltixenyygueymcpm.supabase.co";
    const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImViZ2hsdGl4ZW55eWd1ZXltY3BtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTUwODg0OTQsImV4cCI6MjA3MDY2NDQ5NH0.GHT4O30VRY0QNFU3OagalivbbEY-JRrPXRFOcRIbloQ";

    // 1. Fetch one category to see structure
    const url = `${SUPABASE_URL}/rest/v1/categories?select=*&limit=1`;
    console.log("Fetching categories from:", url);

    try {
        const response = await fetch(url, {
            headers: {
                "apikey": SUPABASE_KEY,
                "Authorization": `Bearer ${SUPABASE_KEY}`
            }
        });

        if (!response.ok) {
            console.error("Categories Fetch Error:", response.status);
            console.error("Body:", await response.text());
        } else {
            const data = await response.json();
            console.log("Categories Data:", JSON.stringify(data, null, 2));
        }

    } catch (e) {
        console.error("Fetch failed:", e.message);
    }

    // 2. Fetch products with categories using wildcard to see if relation works
    const url2 = `${SUPABASE_URL}/rest/v1/products?select=*,categories(*)&limit=1`;
    console.log("\nFetching products with categories(*) from:", url2);

    try {
        const response = await fetch(url2, {
            headers: {
                "apikey": SUPABASE_KEY,
                "Authorization": `Bearer ${SUPABASE_KEY}`
            }
        });

        if (!response.ok) {
            console.error("Relation Fetch Error:", response.status);
            console.error("Body:", await response.text());
        } else {
            const data = await response.json();
            console.log("Relation Data:", JSON.stringify(data, null, 2));
        }

    } catch (e) {
        console.error("Fetch failed:", e.message);
    }
};

inspectCategories();
