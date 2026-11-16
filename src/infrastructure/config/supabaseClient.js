require('dotenv').config({ quiet: true });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL || 'https://mock-supabase.supabase.co';
const supabaseKey = process.env.SUPABASE_KEY || process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || (process.env.NODE_ENV === 'test' ? 'mock-anon-key' : null);

if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Faltan variables de entorno SUPABASE_URL o SUPABASE_KEY en el Backend.');
}

const CLIENT_OPTIONS = {
    auth: {
        autoRefreshToken: false,
        persistSession: false,
        detectSessionInUrl: false
    }
};

const supabase = globalThis.__hubSupabaseClient || createClient(supabaseUrl, supabaseKey || 'mock-anon-key', CLIENT_OPTIONS);
globalThis.__hubSupabaseClient = supabase;

let supabaseAdmin = globalThis.__hubSupabaseAdminClient || null;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!supabaseAdmin && supabaseUrl && supabaseServiceRoleKey) {
    supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey, CLIENT_OPTIONS);
    globalThis.__hubSupabaseAdminClient = supabaseAdmin;
}

module.exports = supabase;
module.exports.supabase = supabase;
module.exports.supabaseAdmin = supabaseAdmin;
