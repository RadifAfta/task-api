import { pool } from '../config/db.js';

async function verifyTables() {
    try {
        const result = await pool.query(`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name LIKE 'routine%' 
            ORDER BY table_name
        `);
        
        console.log('📊 Routine tables created:');
        result.rows.forEach(row => {
            console.log(`  ✅ ${row.table_name}`);
        });
        
        process.exit(0);
    } catch (error) {
        console.error('❌ Error:', error.message);
        process.exit(1);
    }
}

verifyTables();
