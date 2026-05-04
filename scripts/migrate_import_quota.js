
const db = require('../infrastructure/database/db');

async function runMigration() {
    console.log('🚀 Iniciando migración: daily_import_usage...');
    try {
        await db.query(`
            ALTER TABLE public.users 
            ADD COLUMN IF NOT EXISTS daily_import_usage INTEGER DEFAULT 0;
        `);
        console.log('✅ Columna daily_import_usage añadida exitosamente.');
        process.exit(0);
    } catch (error) {
        console.error('❌ Error en la migración:', error.message);
        process.exit(1);
    }
}

runMigration();
