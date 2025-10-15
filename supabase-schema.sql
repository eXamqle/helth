-- Create table for State of Mind data
CREATE TABLE IF NOT EXISTS state_of_mind (
    id TEXT PRIMARY KEY,
    start_time TIMESTAMPTZ NOT NULL,
    end_time TIMESTAMPTZ NOT NULL,
    kind TEXT NOT NULL,
    valence NUMERIC,
    valence_classification TEXT,
    labels TEXT[],
    associations TEXT[],
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for efficient querying
CREATE INDEX IF NOT EXISTS idx_state_of_mind_start_time ON state_of_mind(start_time);
CREATE INDEX IF NOT EXISTS idx_state_of_mind_kind ON state_of_mind(kind);

-- Create table for regular metrics (exercise, steps, etc.)
CREATE TABLE IF NOT EXISTS metrics (
    id SERIAL PRIMARY KEY,
    date TIMESTAMPTZ NOT NULL,
    metric_name TEXT NOT NULL,
    units TEXT,
    quantity NUMERIC,
    source TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(date, metric_name)
);

-- Create indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_metrics_date ON metrics(date);
CREATE INDEX IF NOT EXISTS idx_metrics_name ON metrics(metric_name);
CREATE INDEX IF NOT EXISTS idx_metrics_date_name ON metrics(date, metric_name);

-- Create table for sleep analysis (more complex structure)
CREATE TABLE IF NOT EXISTS sleep_analysis (
    id SERIAL PRIMARY KEY,
    date TIMESTAMPTZ NOT NULL,
    metric_name TEXT NOT NULL DEFAULT 'sleep_analysis',
    units TEXT,
    source TEXT,
    sleep_start TIMESTAMPTZ,
    sleep_end TIMESTAMPTZ,
    in_bed_start TIMESTAMPTZ,
    in_bed_end TIMESTAMPTZ,
    total_sleep NUMERIC,
    rem NUMERIC,
    core NUMERIC,
    deep NUMERIC,
    awake NUMERIC,
    asleep NUMERIC,
    in_bed NUMERIC,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(date, metric_name)
);

-- Create indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_sleep_analysis_date ON sleep_analysis(date);
CREATE INDEX IF NOT EXISTS idx_sleep_analysis_sleep_start ON sleep_analysis(sleep_start);

-- Optional: Create views for easier querying
CREATE OR REPLACE VIEW daily_metrics_summary AS
SELECT
    date,
    MAX(CASE WHEN metric_name = 'step_count' THEN quantity END) as steps,
    MAX(CASE WHEN metric_name = 'apple_exercise_time' THEN quantity END) as exercise_minutes
FROM metrics
GROUP BY date
ORDER BY date DESC;

CREATE OR REPLACE VIEW sleep_summary AS
SELECT
    date,
    total_sleep,
    rem,
    core,
    deep,
    awake,
    sleep_start,
    sleep_end,
    EXTRACT(EPOCH FROM (sleep_end::timestamp - sleep_start::timestamp))/3600 as hours_in_bed
FROM sleep_analysis
ORDER BY date DESC;

-- Add comments for documentation
COMMENT ON TABLE state_of_mind IS 'Stores mental health and mood tracking data';
COMMENT ON TABLE metrics IS 'Stores general health metrics like steps and exercise';
COMMENT ON TABLE sleep_analysis IS 'Stores detailed sleep tracking data';
