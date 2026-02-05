
const SUPABASE_URL = "https://ebghltixenyygueymcpm.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImViZ2hsdGl4ZW55eWd1ZXltY3BtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTUwODg0OTQsImV4cCI6MjA3MDY2NDQ5NH0.GHT4O30VRY0QNFU3OagalivbbEY-JRrPXRFOcRIbloQ";

function decodeJwt(token) {
    try {
        const base64Url = token.split('.')[1];
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const jsonPayload = decodeURIComponent(atob(base64).split('').map(function (c) {
            return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
        }).join(''));
        return JSON.parse(jsonPayload);
    } catch (e) {
        return { error: "Failed to decode" };
    }
}

async function checkCors() {
    console.log("Decoding Key...");
    const claims = decodeJwt(SUPABASE_KEY);
    console.log("Key Claims:", JSON.stringify(claims, null, 2));

    console.log("\nChecking CORS for localhost:5173..."); // Vite default
    const url = `${SUPABASE_URL}/rest/v1/products?select=count`;

    try {
        const response = await fetch(url, {
            method: "OPTIONS",
            headers: {
                "apikey": SUPABASE_KEY,
                "Authorization": `Bearer ${SUPABASE_KEY}`,
                "Origin": "http://localhost:5173",
                "Access-Control-Request-Method": "GET"
            }
        });

        console.log("CORS Status:", response.status);
        console.log("Access-Control-Allow-Origin:", response.headers.get("access-control-allow-origin"));

        if (response.ok) {
            const getResponse = await fetch(url, {
                headers: {
                    "apikey": SUPABASE_KEY,
                    "Authorization": `Bearer ${SUPABASE_KEY}`,
                    // Node fetch doesn't send Origin automatically like browser, but we can't fully simulate browser network stack.
                    // However, if OPTIONS yielded correct headers, likely OK.
                }
            });
            console.log("GET Status:", getResponse.status);
        }

    } catch (e) {
        console.error("CORS Check failed:", e.message);
    }
}

checkCors();
