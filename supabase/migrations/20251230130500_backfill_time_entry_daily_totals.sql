WITH segments AS (
  SELECT
    owner_id,
    task_id,
    started_at,
    COALESCE(ended_at, now()) AS ended_at
  FROM time_entry_segments
),
expanded AS (
  SELECT
    owner_id,
    task_id,
    generate_series(
      date_trunc('day', started_at),
      date_trunc('day', ended_at),
      interval '1 day'
    ) AS day_start,
    started_at,
    ended_at
  FROM segments
),
daily AS (
  SELECT
    owner_id,
    task_id,
    (day_start::date) AS entry_date,
    GREATEST(started_at, day_start) AS slice_start,
    LEAST(ended_at, day_start + interval '1 day') AS slice_end
  FROM expanded
),
totals AS (
  SELECT
    owner_id,
    task_id,
    entry_date,
    GREATEST(0, FLOOR(EXTRACT(EPOCH FROM (slice_end - slice_start))))::int AS seconds
  FROM daily
)
INSERT INTO time_entry_daily_totals (owner_id, task_id, entry_date, total_seconds)
SELECT owner_id, task_id, entry_date, SUM(seconds)::int
FROM totals
GROUP BY owner_id, task_id, entry_date
ON CONFLICT (owner_id, task_id, entry_date)
DO UPDATE SET
  total_seconds = EXCLUDED.total_seconds,
  updated_at = now();
