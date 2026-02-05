
const listProducts = async () => {
    const SUPABASE_URL = "https://ebghltixenyygueymcpm.supabase.co";
    const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImViZ2hsdGl4ZW55eWd1ZXltY3BtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTUwODg0OTQsImV4cCI6MjA3MDY2NDQ5NH0.GHT4O30VRY0QNFU3OagalivbbEY-JRrPXRFOcRIbloQ";

    const url = `${SUPABASE_URL}/rest/v1/products?select=*,categories(name,icon)&limit=5`;

    console.log("Fetching from:", url);

    try {
        const response = await fetch(url, {
            headers: {
                "apikey": SUPABASE_KEY,
                "Authorization": `Bearer ${SUPABASE_KEY}`
            }
        });

        if (!response.ok) {
            console.error("Error:", response.status, response.statusText);
            const text = await response.text();
            console.error("Body:", text);
            return;
        }

        const data = await response.json();
        console.log("Success! Data length:", data.length);
        console.log(JSON.stringify(data, null, 2));

    } catch (e) {
        console.error("Fetch failed:", e.message);
    }
};

listProducts();
