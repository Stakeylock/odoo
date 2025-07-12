const { createClient } = require('@supabase/supabase-js');
require('dotenv').config(); 

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('ERROR: SUPABASE_URL or SUPABASE_KEY environment variables are not set.');
    console.error('Please ensure your .env file is correctly configured and loaded.');
}

const supabase = createClient(supabaseUrl, supabaseKey);

module.exports = {
    supabase
};
