const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = "https://ebghltixenyygueymcpm.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImViZ2hsdGl4ZW55eWd1ZXltY3BtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTUwODg0OTQsImV4cCI6MjA3MDY2NDQ5NH0.GHT4O30VRY0QNFU3OagalivbbEY-JRrPXRFOcRIbloQ";

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkOrderSchema() {
    const { data, error } = await supabase.from('orders').select('*').limit(1);
    if (error) {
        console.error('Error fetching order:', error);
    } else if (data && data.length > 0) {
        console.log('Order columns:', Object.keys(data[0]));
        console.log('Sample data:', data[0]);
    } else {
        // If no data, let's just insert a dummy and rollback? 
        // Actually we can query information_schema or just throw an error.
        console.log('No orders found, cannot determine schema from data alone.');
    }
}

checkOrderSchema();
