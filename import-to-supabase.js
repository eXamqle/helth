import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Initialize Supabase client
// Make sure to set these environment variables in .env file
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY; // Use service key for batch operations

if (!supabaseUrl || !supabaseKey) {
  console.error('ERROR: Missing required environment variables!');
  console.error('Please create a .env file with SUPABASE_URL and SUPABASE_SERVICE_KEY');
  console.error('See .env.example for reference');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function importData() {
  console.log('Reading sample-data.json...');
  const rawData = fs.readFileSync('./sample-data.json', 'utf-8');
  const jsonData = JSON.parse(rawData);

  const results = {
    stateOfMind: { success: 0, failed: 0 },
    metrics: { success: 0, failed: 0 }
  };

  // Import State of Mind data
  if (jsonData.data.stateOfMind && jsonData.data.stateOfMind.length > 0) {
    console.log(`\nImporting ${jsonData.data.stateOfMind.length} state of mind entries...`);

    const stateOfMindData = jsonData.data.stateOfMind.map(entry => ({
      id: entry.id,
      start_time: entry.start,
      end_time: entry.end,
      kind: entry.kind,
      valence: entry.valence,
      valence_classification: entry.valenceClassification,
      labels: entry.labels, // PostgreSQL array
      associations: entry.associations // PostgreSQL array
    }));

    // Batch insert in chunks of 1000 to avoid payload limits
    const chunkSize = 1000;
    for (let i = 0; i < stateOfMindData.length; i += chunkSize) {
      const chunk = stateOfMindData.slice(i, i + chunkSize);
      const { data, error } = await supabase
        .from('state_of_mind')
        .upsert(chunk, { onConflict: 'id' });

      if (error) {
        console.error(`Error inserting state of mind chunk ${i / chunkSize + 1}:`, error);
        results.stateOfMind.failed += chunk.length;
      } else {
        results.stateOfMind.success += chunk.length;
        console.log(`  Inserted chunk ${i / chunkSize + 1}: ${chunk.length} records`);
      }
    }
  }

  // Import Metrics data
  if (jsonData.data.metrics && jsonData.data.metrics.length > 0) {
    console.log(`\nProcessing ${jsonData.data.metrics.length} metric types...`);

    for (const metric of jsonData.data.metrics) {
      const metricName = metric.name;
      const metricUnits = metric.units;

      console.log(`\nImporting ${metric.data.length} entries for metric: ${metricName}...`);

      // Transform based on metric type
      let metricEntries;

      if (metricName === 'sleep_analysis') {
        // Sleep data has complex structure
        metricEntries = metric.data.map(entry => ({
          date: entry.date,
          metric_name: metricName,
          units: metricUnits,
          source: entry.source,
          sleep_start: entry.sleepStart,
          sleep_end: entry.sleepEnd,
          in_bed_start: entry.inBedStart,
          in_bed_end: entry.inBedEnd,
          total_sleep: entry.totalSleep,
          rem: entry.rem,
          core: entry.core,
          deep: entry.deep,
          awake: entry.awake,
          asleep: entry.asleep,
          in_bed: entry.inBed
        }));

        // Insert sleep data
        const chunkSize = 1000;
        for (let i = 0; i < metricEntries.length; i += chunkSize) {
          const chunk = metricEntries.slice(i, i + chunkSize);
          const { data, error } = await supabase
            .from('sleep_analysis')
            .upsert(chunk, { onConflict: 'date,metric_name' });

          if (error) {
            console.error(`  Error inserting sleep chunk ${i / chunkSize + 1}:`, error);
            results.metrics.failed += chunk.length;
          } else {
            results.metrics.success += chunk.length;
            console.log(`  Inserted chunk ${i / chunkSize + 1}: ${chunk.length} records`);
          }
        }
      } else {
        // Regular metrics (exercise, steps, etc.)
        metricEntries = metric.data.map(entry => ({
          date: entry.date,
          metric_name: metricName,
          units: metricUnits,
          quantity: entry.qty,
          source: entry.source
        }));

        // Insert regular metric data
        const chunkSize = 1000;
        for (let i = 0; i < metricEntries.length; i += chunkSize) {
          const chunk = metricEntries.slice(i, i + chunkSize);
          const { data, error } = await supabase
            .from('metrics')
            .upsert(chunk, { onConflict: 'date,metric_name' });

          if (error) {
            console.error(`  Error inserting ${metricName} chunk ${i / chunkSize + 1}:`, error);
            results.metrics.failed += chunk.length;
          } else {
            results.metrics.success += chunk.length;
            console.log(`  Inserted chunk ${i / chunkSize + 1}: ${chunk.length} records`);
          }
        }
      }
    }
  }

  // Print summary
  console.log('\n' + '='.repeat(50));
  console.log('IMPORT SUMMARY');
  console.log('='.repeat(50));
  console.log(`State of Mind: ${results.stateOfMind.success} succeeded, ${results.stateOfMind.failed} failed`);
  console.log(`Metrics: ${results.metrics.success} succeeded, ${results.metrics.failed} failed`);
  console.log('='.repeat(50));
}

// Run the import
importData()
  .then(() => {
    console.log('\nImport completed!');
    process.exit(0);
  })
  .catch(error => {
    console.error('\nFatal error during import:', error);
    process.exit(1);
  });
