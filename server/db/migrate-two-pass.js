import { neon } from '@neondatabase/serverless';

// Run migration to add two-pass processing columns
async function migrate() {
  if (!process.env.DATABASE_URL) {
    console.error('DATABASE_URL environment variable is not set');
    process.exit(1);
  }

  const sql = neon(process.env.DATABASE_URL);

  console.log('Running two-pass migration...');

  try {
    // Add columns to database_instances table
    console.log('Adding columns to database_instances...');
    await sql`
      ALTER TABLE database_instances
      ADD COLUMN IF NOT EXISTS languages_to_remove TEXT DEFAULT 'en',
      ADD COLUMN IF NOT EXISTS enable_two_pass BOOLEAN DEFAULT true
    `;

    // Add columns to jobs table
    console.log('Adding columns to jobs...');
    await sql`
      ALTER TABLE jobs
      ADD COLUMN IF NOT EXISTS current_pass INTEGER DEFAULT 1,
      ADD COLUMN IF NOT EXISTS pass1_processed INTEGER DEFAULT 0,
      ADD COLUMN IF NOT EXISTS pass1_cleaned INTEGER DEFAULT 0,
      ADD COLUMN IF NOT EXISTS pass2_needed INTEGER DEFAULT 0,
      ADD COLUMN IF NOT EXISTS pass2_processed INTEGER DEFAULT 0
    `;

    console.log('✅ Migration completed successfully!');
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

migrate();
