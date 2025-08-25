/*
  # Remove unique constraint for multiple shifts per day

  1. Changes
    - Remove unique constraint `work_shifts_user_id_day_of_week_key`
    - Remove unique index `work_shifts_user_id_day_of_week_key`
    - Keep the composite index for performance on queries

  This allows users to have multiple work shifts on the same day of the week.
*/

-- Remove the unique constraint
ALTER TABLE work_shifts DROP CONSTRAINT IF EXISTS work_shifts_user_id_day_of_week_key;

-- Remove the unique index (if it exists separately)
DROP INDEX IF EXISTS work_shifts_user_id_day_of_week_key;

-- Keep the non-unique index for query performance
CREATE INDEX IF NOT EXISTS idx_work_shifts_user_day_performance 
ON work_shifts (user_id, day_of_week);