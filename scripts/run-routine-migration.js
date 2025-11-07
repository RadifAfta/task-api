import fs from 'fs';
import path from 'path';
import { pool } from '../config/db.js';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function runRoutineMigration() {
    const client = await pool.connect();
    
    try {
        console.log('🗓️ Starting Daily Routine Generator migration...');
        
        // Read migration file
        const migrationPath = path.join(__dirname, '../migrations/add_daily_routine_generator.sql');
        const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
        
        // Execute migration
        await client.query('BEGIN');
        
        // Split SQL commands by semicolon and execute each one
        const commands = migrationSQL
            .split(';')
            .map(cmd => cmd.trim())
            .filter(cmd => cmd.length > 0 && !cmd.startsWith('--'));
            
        for (const command of commands) {
            if (command.trim()) {
                console.log(`Executing: ${command.substring(0, 60).replace(/\s+/g, ' ')}...`);
                await client.query(command);
            }
        }
        
        await client.query('COMMIT');
        console.log('✅ Daily Routine Generator migration completed successfully!');
        
        // Verify tables created
        console.log('\n📊 Verifying routine tables...');
        const tables = [
            'routine_templates',
            'routine_template_tasks', 
            'daily_routine_generations',
            'routine_generated_tasks'
        ];
        
        for (const tableName of tables) {
            const tableCheck = await client.query(`
                SELECT COUNT(*) as count
                FROM information_schema.tables 
                WHERE table_name = $1 AND table_schema = 'public'
            `, [tableName]);
            
            if (tableCheck.rows[0].count > 0) {
                console.log(`  ✅ Table ${tableName} created successfully`);
                
                // Get column info
                const columnInfo = await client.query(`
                    SELECT column_name, data_type, is_nullable, column_default
                    FROM information_schema.columns 
                    WHERE table_name = $1 AND table_schema = 'public'
                    ORDER BY ordinal_position
                `, [tableName]);
                
                console.log(`     Columns: ${columnInfo.rows.map(r => r.column_name).join(', ')}`);
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
            AND (indexname LIKE 'idx_routine_%' OR indexname LIKE '%routine%')
            ORDER BY tablename, indexname
        `);
        
        if (indexInfo.rows.length > 0) {
            console.log('Indexes created:');
            indexInfo.rows.forEach(row => {
                console.log(`  - ${row.indexname} on ${row.tablename}`);
            });
        }
        
        // Check triggers
        console.log('\n🔧 Checking triggers...');
        const triggerInfo = await client.query(`
            SELECT trigger_name, event_object_table 
            FROM information_schema.triggers 
            WHERE trigger_schema = 'public' 
            AND trigger_name LIKE '%routine%'
        `);
        
        if (triggerInfo.rows.length > 0) {
            console.log('Triggers created:');
            triggerInfo.rows.forEach(row => {
                console.log(`  - ${row.trigger_name} on ${row.event_object_table}`);
            });
        }
        
        console.log('\n🎉 Daily Routine Generator database setup completed!');
        console.log('\nNext steps:');
        console.log('1. Create routine models');
        console.log('2. Implement routine service');
        console.log('3. Setup API endpoints');
        console.log('4. Configure scheduler');
        
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('❌ Daily Routine Generator migration failed:');
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
runRoutineMigration()
    .then(() => {
        console.log('Daily Routine Generator migration script finished successfully.');
        process.exit(0);
    })
    .catch((error) => {
        console.error('Daily Routine Generator migration script failed:', error);
        process.exit(1);
    });