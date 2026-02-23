fetch("https://ebghltixenyygueymcpm.supabase.co/functions/v1/push-notification", {
    method: "POST",
    headers: {
        "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImViZ2hsdGl4ZW55eWd1ZXltY3BtIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NTA4ODQ5NCwiZXhwIjoyMDcwNjY0NDk0fQ.eVfPxJm3VEW4ay_qH54_RtWEDn6KLm5SFtvPnnFMTUw",
        "Content-Type": "application/json"
    },
    body: JSON.stringify({
        type: "UPDATE",
        old_record: {
            status: "pending"
        },
        record: {
            id: "cfda9268-07b4-4b52-b9e7-567f6b0f2a7",
            user_id: "c9be20a3-e14d-4c78-ae04-da893b2e904e",
            status: "preparing",
            customer_name: "Test Customer",
            total_amount: 150.00
        }
    })
}).then(async r => {
    console.log(r.status);
    console.log(JSON.stringify(await r.json(), null, 2));
}).catch(console.error);
