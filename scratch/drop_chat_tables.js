const db = require('../src/infrastructure/database/db');

async function dropTables() {
    try {
        console.log('🔥 Eliminando tablas obsoletas del chat general (chat_messages, conversations, feedback)...');
        await db.query('DROP TABLE IF EXISTS public.chat_messages CASCADE;');
        console.log('✅ Tabla chat_messages eliminada.');
        await db.query('DROP TABLE IF EXISTS public.conversations CASCADE;');
        console.log('✅ Tabla conversations eliminada.');
        await db.query('DROP TABLE IF EXISTS public.feedback CASCADE;');
        console.log('✅ Tabla feedback eliminada.');
        console.log('🎉 Todas las tablas obsoletas del chat general fueron eliminadas exitosamente.');
    } catch (err) {
        console.error('❌ Error al eliminar las tablas:', err.message);
    } process.exit(0);
}

dropTables();
