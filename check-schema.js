import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase credentials');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkOrderSchema() {
    const { data, error } = await supabase.from('orders').select('*').limit(1);
    if (error) {
        console.error('Error fetching order:', error);
    } else if (data && data.length > 0) {
        console.log('Order columns:', Object.keys(data[0]));
        console.log('Sample data:', data[0]);
    } else {
        console.log('No orders found, cannot determine schema from data alone.');
    }
}

checkOrderSchema();
