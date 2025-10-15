import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('ERROR: Missing required environment variables!');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function verifyImport() {
  console.log('Verifying data import...\n');
  console.log('='.repeat(60));

  // Check state_of_mind table
  const { data: stateOfMindData, error: stateOfMindError } = await supabase
    .from('state_of_mind')
    .select('*', { count: 'exact', head: true });

  if (!stateOfMindError) {
    const { count } = await supabase
      .from('state_of_mind')
      .select('*', { count: 'exact', head: true });
    console.log(`✅ state_of_mind table: ${count} records`);
  } else {
    console.log(`❌ state_of_mind table: Error - ${stateOfMindError.message}`);
  }

  // Check metrics table
  const { data: metricsData, error: metricsError } = await supabase
    .from('metrics')
    .select('*', { count: 'exact', head: true });

  if (!metricsError) {
    const { count } = await supabase
      .from('metrics')
      .select('*', { count: 'exact', head: true });
    console.log(`✅ metrics table: ${count} records`);

    // Get breakdown by metric type
    const { data: metricTypes } = await supabase
      .from('metrics')
      .select('metric_name')
      .limit(1000);

    if (metricTypes) {
      const typeCount = {};
      metricTypes.forEach(m => {
        typeCount[m.metric_name] = (typeCount[m.metric_name] || 0) + 1;
      });

      console.log('\n  Metrics breakdown:');
      Object.entries(typeCount).forEach(([name, count]) => {
        console.log(`    - ${name}: ${count} records`);
      });
    }
  } else {
    console.log(`❌ metrics table: Error - ${metricsError.message}`);
  }

  // Check sleep_analysis table
  const { data: sleepData, error: sleepError } = await supabase
    .from('sleep_analysis')
    .select('*', { count: 'exact', head: true });

  if (!sleepError) {
    const { count } = await supabase
      .from('sleep_analysis')
      .select('*', { count: 'exact', head: true });
    console.log(`\n✅ sleep_analysis table: ${count} records`);
  } else {
    console.log(`❌ sleep_analysis table: Error - ${sleepError.message}`);
  }

  console.log('\n' + '='.repeat(60));

  // Get sample records
  console.log('\nSample Records:');
  console.log('-'.repeat(60));

  const { data: sampleState } = await supabase
    .from('state_of_mind')
    .select('*')
    .order('start_time', { ascending: false })
    .limit(1);

  if (sampleState && sampleState.length > 0) {
    console.log('\n📊 Latest State of Mind:');
    console.log(`  Date: ${sampleState[0].start_time}`);
    console.log(`  Kind: ${sampleState[0].kind}`);
    console.log(`  Valence: ${sampleState[0].valence}`);
    console.log(`  Labels: ${sampleState[0].labels?.join(', ')}`);
  }

  const { data: sampleMetric } = await supabase
    .from('metrics')
    .select('*')
    .order('date', { ascending: false })
    .limit(1);

  if (sampleMetric && sampleMetric.length > 0) {
    console.log('\n📈 Latest Metric:');
    console.log(`  Date: ${sampleMetric[0].date}`);
    console.log(`  Type: ${sampleMetric[0].metric_name}`);
    console.log(`  Value: ${sampleMetric[0].quantity} ${sampleMetric[0].units}`);
  }

  const { data: sampleSleep } = await supabase
    .from('sleep_analysis')
    .select('*')
    .order('date', { ascending: false })
    .limit(1);

  if (sampleSleep && sampleSleep.length > 0) {
    console.log('\n😴 Latest Sleep:');
    console.log(`  Date: ${sampleSleep[0].date}`);
    console.log(`  Total Sleep: ${sampleSleep[0].total_sleep?.toFixed(2)} hours`);
    console.log(`  REM: ${sampleSleep[0].rem?.toFixed(2)} hours`);
    console.log(`  Deep: ${sampleSleep[0].deep?.toFixed(2)} hours`);
  }

  console.log('\n' + '='.repeat(60));
  console.log('Verification complete!\n');
}

verifyImport()
  .then(() => process.exit(0))
  .catch(error => {
    console.error('Error during verification:', error);
    process.exit(1);
  });
