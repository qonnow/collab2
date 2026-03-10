const { createClient } = require('@supabase/supabase-js');

let supabase = null;
let isConnected = false;

const connectDB = async () => {
  try {
    supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY,
    );

    
    const { error } = await supabase.from('packets').select('id').limit(1);
    if (error && !error.message.includes('does not exist')) {
      throw error;
    }
    isConnected = true;
    console.log(`Supabase Connected: ${process.env.SUPABASE_URL}`);
  } catch (error) {
    console.warn(`Supabase not available: ${error.message}`);
    console.warn('Running in DEMO mode (in-memory storage)');
    isConnected = false;
  }
};

const getSupabase = () => supabase;
const getIsConnected = () => isConnected;

module.exports = { getSupabase, connectDB, getIsConnected };
