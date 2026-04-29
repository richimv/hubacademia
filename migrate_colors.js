const db = require('./infrastructure/database/db');

async function migrate() {
    try {
        console.log("Adding color to decks...");
        await db.query(`ALTER TABLE public.decks ADD COLUMN IF NOT EXISTS color CHARACTER VARYING(50) DEFAULT NULL;`);
        console.log("Adding color to user_notes...");
        await db.query(`ALTER TABLE public.user_notes ADD COLUMN IF NOT EXISTS color CHARACTER VARYING(50) DEFAULT NULL;`);
        console.log("Migration successful.");
        process.exit(0);
    } catch (e) {
        console.error("Migration failed:", e);
        process.exit(1);
    }
}
migrate();
