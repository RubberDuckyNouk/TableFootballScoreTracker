const fs = require('fs');
const path = require('path');

/**
 * Simple migration runner
 * Automatically runs SQL migrations from the migrations/ folder
 */
async function runMigrations(pool) {
    console.log('🔄 Starting database migrations...');

    try {
        // Create migrations tracking table if it doesn't exist
        await pool.query(`
            CREATE TABLE IF NOT EXISTS schema_migrations (
                id SERIAL PRIMARY KEY,
                migration_name VARCHAR(255) NOT NULL UNIQUE,
                applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // Get list of applied migrations
        const appliedResult = await pool.query(
            'SELECT migration_name FROM schema_migrations ORDER BY migration_name'
        );
        const appliedMigrations = new Set(appliedResult.rows.map(row => row.migration_name));

        // Get list of migration files
        const migrationsDir = path.join(__dirname, 'migrations');

        // Create migrations directory if it doesn't exist
        if (!fs.existsSync(migrationsDir)) {
            fs.mkdirSync(migrationsDir);
            console.log('✅ Migrations directory created');
            return;
        }

        const migrationFiles = fs.readdirSync(migrationsDir)
            .filter(file => file.endsWith('.sql'))
            .sort();

        if (migrationFiles.length === 0) {
            console.log('✅ No migrations to run');
            return;
        }

        // Run pending migrations
        let migrationsRun = 0;
        for (const file of migrationFiles) {
            if (!appliedMigrations.has(file)) {
                console.log(`   Running migration: ${file}`);

                const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8');

                // Run migration in a transaction
                await pool.query('BEGIN');
                try {
                    await pool.query(sql);
                    await pool.query(
                        'INSERT INTO schema_migrations (migration_name) VALUES ($1)',
                        [file]
                    );
                    await pool.query('COMMIT');
                    console.log(`   ✅ Migration applied: ${file}`);
                    migrationsRun++;
                } catch (error) {
                    await pool.query('ROLLBACK');
                    throw error;
                }
            }
        }

        if (migrationsRun === 0) {
            console.log('✅ All migrations already applied');
        } else {
            console.log(`✅ Successfully applied ${migrationsRun} migration(s)`);
        }

    } catch (error) {
        console.error('❌ Migration error:', error);
        throw error;
    }
}

module.exports = { runMigrations };
