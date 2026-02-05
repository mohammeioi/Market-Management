
const SUPABASE_URL = "https://ebghltixenyygueymcpm.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImViZ2hsdGl4ZW55eWd1ZXltY3BtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTUwODg0OTQsImV4cCI6MjA3MDY2NDQ5NH0.GHT4O30VRY0QNFU3OagalivbbEY-JRrPXRFOcRIbloQ";

async function checkCors() {
    console.log("Checking CORS for localhost:8080...");
    const url = `${SUPABASE_URL}/rest/v1/products?select=count`;

    try {
        const response = await fetch(url, {
            method: "OPTIONS",
            headers: {
                "apikey": SUPABASE_KEY,
                "Authorization": `Bearer ${SUPABASE_KEY}`,
                "Origin": "http://localhost:8080",
                "Access-Control-Request-Method": "GET"
            }
        });

        console.log("CORS Status:", response.status);
        const allowOrigin = response.headers.get("access-control-allow-origin");
        console.log("Access-Control-Allow-Origin:", allowOrigin); // Should be * or http://localhost:8080

        if (allowOrigin !== "*" && allowOrigin !== "http://localhost:8080") {
            console.log("WARNING: Origin not allowed matching request.");
        } else {
            console.log("SUCCESS: Origin allowed.");
        }

    } catch (e) {
        console.error("CORS Check failed:", e.message);
    }
}

checkCors();
