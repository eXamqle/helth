# Quick Start Guide

## Step-by-Step Import Process

### 1️⃣ Install Dependencies
```bash
npm install
```

### 2️⃣ Set Up Supabase Tables
1. Go to your Supabase dashboard: https://app.supabase.com
2. Select your project
3. Click "SQL Editor" in the left sidebar
4. Click "New Query"
5. Copy the entire contents of `supabase-schema.sql`
6. Paste and click "Run"

### 3️⃣ Configure Environment
```bash
# Copy the example file
cp .env.example .env

# Edit .env and add your credentials
nano .env
```

Your `.env` should look like:
```env
SUPABASE_URL=https://xxxxxxxxxxxxx.supabase.co
SUPABASE_SERVICE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

To find these values in Supabase:
- Click "Project Settings" (gear icon)
- Click "API" section
- Copy "Project URL" → `SUPABASE_URL`
- Copy "service_role" key (under "Project API keys") → `SUPABASE_SERVICE_KEY`

### 4️⃣ Run Import
```bash
npm run import
```

Or:
```bash
node import-to-supabase.js
```

### 5️⃣ Verify Import
Go to Supabase dashboard → Table Editor and check your tables:
- `state_of_mind`
- `metrics`
- `sleep_analysis`

## Expected Output

```
Reading sample-data.json...

Importing 2 state of mind entries...
  Inserted chunk 1: 2 records

Processing 3 metric types...

Importing 15 entries for metric: apple_exercise_time...
  Inserted chunk 1: 15 records

Importing 15 entries for metric: step_count...
  Inserted chunk 1: 15 records

Importing 15 entries for metric: sleep_analysis...
  Inserted chunk 1: 15 records

==================================================
IMPORT SUMMARY
==================================================
State of Mind: 2 succeeded, 0 failed
Metrics: 30 succeeded, 0 failed
==================================================

Import completed!
```

## What Happens Behind the Scenes

1. **Reads** your `sample-data.json` file
2. **Transforms** the data to match Supabase table schemas
3. **Batches** data into chunks of 1000 records
4. **Upserts** each chunk (insert new, update existing)
5. **Reports** progress and any errors

## Troubleshooting

**"Missing required environment variables"**
- Make sure you created `.env` file
- Check that variables are correctly named
- No quotes needed around values in `.env`

**"Table does not exist"**
- Run the `supabase-schema.sql` in Supabase SQL Editor first

**"Invalid API key"**
- Make sure you're using the `service_role` key, not `anon` key
- Check for any extra spaces in your `.env` file

**Import is slow**
- This is normal for large datasets
- The script processes 1000 records at a time
- You'll see progress updates

## Data Volume

Based on your `sample-data.json`:
- **~24,598 lines** of JSON data
- Estimated import time: **1-3 minutes** depending on data volume
- The script handles this efficiently with batch processing
