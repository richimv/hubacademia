require('dotenv').config({ override: true });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY; // En Render, usa la ANON KEY o la SERVICE_ROLE (ambas funcionan para validar)

if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Faltan variables de entorno SUPABASE_URL o SUPABASE_KEY en el Backend.');
}

// Cliente exclusivamente servidor: no debe persistir ni refrescar sesiones
// compartidas. Cada petición autenticada entrega su JWT de usuario a getUser().
const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: {
        autoRefreshToken: false,
        persistSession: false,
        detectSessionInUrl: false
    }
});

module.exports = supabase;
