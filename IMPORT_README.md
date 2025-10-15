# Health Data Import to Supabase

This script imports your health data from `sample-data.json` to Supabase in an efficient batch process.

## Setup

### 1. Install Dependencies

```bash
npm install @supabase/supabase-js
```

### 2. Create Database Tables

Go to your Supabase project dashboard:
- Navigate to the SQL Editor
- Copy and paste the contents of `supabase-schema.sql`
- Run the SQL script to create the necessary tables

### 3. Configure Environment Variables

1. Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```

2. Edit `.env` and fill in your Supabase credentials:
   - `SUPABASE_URL`: Your Supabase project URL (found in Project Settings > API)
   - `SUPABASE_SERVICE_KEY`: Your service role key (found in Project Settings > API)

   ⚠️ **Important**: Use the `service_role` key (not the `anon` key) as it bypasses Row Level Security and has full database access needed for batch imports.

### 4. Run the Import

```bash
node import-to-supabase.js
```

## What Gets Imported

The script imports three types of data:

### 1. State of Mind (`state_of_mind` table)
- Mental health and mood tracking entries
- Includes valence scores, classifications, labels, and associations

### 2. Regular Metrics (`metrics` table)
- Step counts
- Exercise time
- Other quantifiable health metrics

### 3. Sleep Analysis (`sleep_analysis` table)
- Detailed sleep tracking data
- REM, core, deep sleep phases
- Time in bed vs actual sleep time

## Features

- ✅ **Batch Processing**: Imports data in chunks of 1000 records to avoid API limits
- ✅ **Upsert Logic**: Uses `upsert` to avoid duplicates (updates if exists, inserts if new)
- ✅ **Progress Tracking**: Shows real-time progress for each chunk
- ✅ **Error Handling**: Reports successes and failures with detailed error messages
- ✅ **Large Dataset Support**: Can handle thousands of records efficiently

## Database Schema

The schema includes:
- Proper indexes for efficient querying by date and metric type
- Unique constraints to prevent duplicate entries
- Helper views for common queries (`daily_metrics_summary`, `sleep_summary`)
- PostgreSQL array support for labels and associations

## Querying Your Data

After import, you can use the helper views:

```sql
-- Get daily metrics summary
SELECT * FROM daily_metrics_summary
WHERE date >= '2025-10-01'
ORDER BY date DESC;

-- Get sleep summary
SELECT * FROM sleep_summary
WHERE date >= '2025-10-01'
ORDER BY date DESC;

-- Get state of mind entries
SELECT * FROM state_of_mind
WHERE start_time >= '2025-10-01'
ORDER BY start_time DESC;
```

## Troubleshooting

- **Authentication Error**: Make sure you're using the `service_role` key, not the `anon` key
- **Table Not Found**: Run the SQL schema script first in Supabase SQL Editor
- **Import Stuck**: Check your network connection and Supabase project status
- **Duplicate Errors**: The script uses upsert with conflict resolution, so this shouldn't happen

## Security Note

⚠️ Never commit your `.env` file to version control. The `.env.example` is safe to commit as a template.
