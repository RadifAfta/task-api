import fs from 'fs';
import path from 'path';
import { pool } from '../config/db.js';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function runReminderMigration() {
    const client = await pool.connect();
    
    try {
        console.log('🔔 Starting Smart Reminder System migration...');
        
        // Read migration file
        const migrationPath = path.join(__dirname, '../migrations/add_reminder_system.sql');
        const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
        
        // Execute migration as a single transaction
        await client.query('BEGIN');
        
        console.log('Executing migration SQL...');
        await client.query(migrationSQL);
        
        await client.query('COMMIT');
        console.log('✅ Smart Reminder System migration completed successfully!');
        
        // Verify tables created
        console.log('\n📊 Verifying reminder tables...');
        const tables = [
            'user_telegram_config',
            'reminder_settings',
            'notification_logs',
            'scheduled_reminders'
        ];
        
        for (const tableName of tables) {
            const tableCheck = await client.query(`
                SELECT COUNT(*) as count
                FROM information_schema.tables 
                WHERE table_name = $1 AND table_schema = 'public'
            `, [tableName]);
            
            if (tableCheck.rows[0].count > 0) {
                console.log(`  ✅ Table ${tableName} created successfully`);
                
                // Get column count
                const columnInfo = await client.query(`
                    SELECT COUNT(*) as col_count
                    FROM information_schema.columns 
                    WHERE table_name = $1 AND table_schema = 'public'
                `, [tableName]);
                
                console.log(`     Columns: ${columnInfo.rows[0].col_count}`);
            } else {
                console.log(`  ❌ Table ${tableName} not found`);
            }
        }
        
        // Check indexes
        console.log('\n📋 Checking indexes...');
        const indexInfo = await client.query(`
            SELECT indexname, tablename 
            FROM pg_indexes 
            WHERE schemaname = 'public' 
            AND (indexname LIKE '%reminder%' OR indexname LIKE '%telegram%' OR indexname LIKE '%notification%')
            ORDER BY tablename, indexname
        `);
        
        if (indexInfo.rows.length > 0) {
            console.log(`Created ${indexInfo.rows.length} indexes for reminder system`);
        }
        
        // Check triggers
        console.log('\n🔧 Checking triggers...');
        const triggerInfo = await client.query(`
            SELECT trigger_name, event_object_table 
            FROM information_schema.triggers 
            WHERE trigger_schema = 'public' 
            AND (trigger_name LIKE '%reminder%' OR trigger_name LIKE '%telegram%')
        `);
        
        if (triggerInfo.rows.length > 0) {
            console.log('Triggers created:');
            triggerInfo.rows.forEach(row => {
                console.log(`  - ${row.trigger_name} on ${row.event_object_table}`);
            });
        }
        
        // Check functions
        console.log('\n⚙️ Checking functions...');
        const functionInfo = await client.query(`
            SELECT routine_name
            FROM information_schema.routines
            WHERE routine_schema = 'public'
            AND (routine_name LIKE '%reminder%' OR routine_name LIKE '%notification%')
        `);
        
        if (functionInfo.rows.length > 0) {
            console.log('Functions created:');
            functionInfo.rows.forEach(row => {
                console.log(`  - ${row.routine_name}()`);
            });
        }
        
        console.log('\n🎉 Smart Reminder System database setup completed!');
        console.log('\nNext steps:');
        console.log('1. Get Telegram Bot Token from @BotFather');
        console.log('2. Add TELEGRAM_BOT_TOKEN to .env file');
        console.log('3. Implement Telegram Bot service');
        console.log('4. Setup reminder scheduler');
        console.log('5. Test bot connection');
        
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('❌ Smart Reminder System migration failed:');
        console.error('Error:', error.message);
        
        if (error.code) {
            console.error('Error Code:', error.code);
        }
        
        if (error.detail) {
            console.error('Detail:', error.detail);
        }
        
        throw error;
    } finally {
        client.release();
        await pool.end();
    }
}

// Run migration
runReminderMigration()
    .then(() => {
        console.log('Smart Reminder System migration script finished successfully.');
        process.exit(0);
    })
    .catch((error) => {
        console.error('Smart Reminder System migration script failed:', error);
        process.exit(1);
    });