/*
  # Create Shift Management and Overtime System

  1. New Tables
    - `user_profiles_extended` - Extended user profile information
    - `work_shifts` - Weekly work schedule configuration
    - `salary_config` - Salary and overtime configuration
    - `holidays` - Company holidays calendar
    - `overtime_calculations` - Monthly overtime calculations

  2. Security
    - Enable RLS on all tables
    - Add policies for user access control
    - Create indexes for performance

  3. Functions
    - Automatic overtime calculation function
*/

-- Extended user profiles table
CREATE TABLE IF NOT EXISTS user_profiles_extended (
  id uuid PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  profile_image_url text,
  phone varchar(20),
  department varchar(100),
  position varchar(100),
  hire_date date,
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE user_profiles_extended ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own extended profile"
  ON user_profiles_extended
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can insert own extended profile"
  ON user_profiles_extended
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update own extended profile"
  ON user_profiles_extended
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id);

-- Work shifts table
CREATE TABLE IF NOT EXISTS work_shifts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  day_of_week integer NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6),
  start_time time NOT NULL,
  end_time time NOT NULL,
  is_active boolean DEFAULT true,
  break_duration_minutes integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id, day_of_week)
);

ALTER TABLE work_shifts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own work shifts"
  ON work_shifts
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX idx_work_shifts_user_day ON work_shifts(user_id, day_of_week);

-- Salary configuration table
CREATE TABLE IF NOT EXISTS salary_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid UNIQUE REFERENCES profiles(id) ON DELETE CASCADE,
  gross_salary numeric(10,2) NOT NULL,
  salary_type varchar(10) NOT NULL CHECK (salary_type IN ('monthly', 'annual')),
  overtime_multiplier numeric(3,2) DEFAULT 1.5,
  currency varchar(3) DEFAULT 'EUR',
  effective_from date DEFAULT CURRENT_DATE,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE salary_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own salary config"
  ON salary_config
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own salary config"
  ON salary_config
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Holidays table
CREATE TABLE IF NOT EXISTS holidays (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name varchar(100) NOT NULL,
  date date UNIQUE NOT NULL,
  is_recurring boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE holidays ENABLE ROW LEVEL SECURITY;

CREATE POLICY "All users can read holidays"
  ON holidays
  FOR SELECT
  TO authenticated
  USING (true);

CREATE INDEX idx_holidays_date ON holidays(date);

-- Overtime calculations table
CREATE TABLE IF NOT EXISTS overtime_calculations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  year integer NOT NULL,
  month integer NOT NULL CHECK (month >= 1 AND month <= 12),
  scheduled_hours numeric(6,2) DEFAULT 0,
  worked_hours numeric(6,2) DEFAULT 0,
  regular_hours numeric(6,2) DEFAULT 0,
  overtime_hours numeric(6,2) DEFAULT 0,
  regular_pay numeric(10,2) DEFAULT 0,
  overtime_pay numeric(10,2) DEFAULT 0,
  total_pay numeric(10,2) DEFAULT 0,
  calculation_date timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, year, month)
);

ALTER TABLE overtime_calculations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own overtime calculations"
  ON overtime_calculations
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE INDEX idx_overtime_calculations_user_period ON overtime_calculations(user_id, year, month);

-- Function to calculate monthly overtime
CREATE OR REPLACE FUNCTION calculate_monthly_overtime(
  p_user_id uuid,
  p_year integer,
  p_month integer
) RETURNS void AS $$
DECLARE
  v_scheduled_hours numeric := 0;
  v_worked_hours numeric := 0;
  v_regular_hours numeric := 0;
  v_overtime_hours numeric := 0;
  v_hourly_rate numeric := 0;
  v_overtime_rate numeric := 0;
  v_regular_pay numeric := 0;
  v_overtime_pay numeric := 0;
  v_total_pay numeric := 0;
  v_salary_config record;
BEGIN
  -- Get salary configuration
  SELECT * INTO v_salary_config
  FROM salary_config
  WHERE user_id = p_user_id
  ORDER BY effective_from DESC
  LIMIT 1;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'No salary configuration found for user';
  END IF;

  -- Calculate scheduled hours for the month
  SELECT COALESCE(SUM(
    CASE 
      WHEN ws.is_active THEN
        EXTRACT(EPOCH FROM (ws.end_time - ws.start_time)) / 3600 - (ws.break_duration_minutes / 60.0)
      ELSE 0
    END * (
      SELECT COUNT(*)
      FROM generate_series(
        make_date(p_year, p_month, 1),
        make_date(p_year, p_month, 1) + interval '1 month' - interval '1 day',
        '1 day'::interval
      ) AS day_series
      WHERE EXTRACT(DOW FROM day_series) = ws.day_of_week
    )
  ), 0) INTO v_scheduled_hours
  FROM work_shifts ws
  WHERE ws.user_id = p_user_id;

  -- Calculate worked hours for the month
  WITH paired_entries AS (
    SELECT 
      DATE(te_in.timestamp) as work_date,
      te_in.timestamp as check_in,
      te_out.timestamp as check_out,
      CASE 
        WHEN te_out.timestamp IS NOT NULL THEN
          EXTRACT(EPOCH FROM (te_out.timestamp - te_in.timestamp)) / 3600
        ELSE 0
      END as daily_hours
    FROM time_entries te_in
    LEFT JOIN time_entries te_out ON (
      te_out.user_id = te_in.user_id 
      AND te_out.entry_type = 'check_out'
      AND te_out.timestamp > te_in.timestamp
      AND te_out.timestamp = (
        SELECT MIN(timestamp)
        FROM time_entries te_min
        WHERE te_min.user_id = te_in.user_id
        AND te_min.entry_type = 'check_out'
        AND te_min.timestamp > te_in.timestamp
      )
    )
    WHERE te_in.user_id = p_user_id
    AND te_in.entry_type = 'check_in'
    AND EXTRACT(YEAR FROM te_in.timestamp) = p_year
    AND EXTRACT(MONTH FROM te_in.timestamp) = p_month
  )
  SELECT COALESCE(SUM(daily_hours), 0) INTO v_worked_hours
  FROM paired_entries;

  -- Calculate regular and overtime hours
  v_regular_hours := LEAST(v_worked_hours, v_scheduled_hours);
  v_overtime_hours := GREATEST(0, v_worked_hours - v_scheduled_hours);

  -- Calculate hourly rate
  IF v_scheduled_hours > 0 THEN
    v_hourly_rate := CASE 
      WHEN v_salary_config.salary_type = 'monthly' THEN
        v_salary_config.gross_salary / v_scheduled_hours
      ELSE
        (v_salary_config.gross_salary / 12) / v_scheduled_hours
    END;
  END IF;

  v_overtime_rate := v_hourly_rate * v_salary_config.overtime_multiplier;

  -- Calculate payments
  v_regular_pay := v_regular_hours * v_hourly_rate;
  v_overtime_pay := v_overtime_hours * v_overtime_rate;
  v_total_pay := v_regular_pay + v_overtime_pay;

  -- Insert or update calculation
  INSERT INTO overtime_calculations (
    user_id, year, month, scheduled_hours, worked_hours,
    regular_hours, overtime_hours, regular_pay, overtime_pay, total_pay
  ) VALUES (
    p_user_id, p_year, p_month, v_scheduled_hours, v_worked_hours,
    v_regular_hours, v_overtime_hours, v_regular_pay, v_overtime_pay, v_total_pay
  )
  ON CONFLICT (user_id, year, month)
  DO UPDATE SET
    scheduled_hours = EXCLUDED.scheduled_hours,
    worked_hours = EXCLUDED.worked_hours,
    regular_hours = EXCLUDED.regular_hours,
    overtime_hours = EXCLUDED.overtime_hours,
    regular_pay = EXCLUDED.regular_pay,
    overtime_pay = EXCLUDED.overtime_pay,
    total_pay = EXCLUDED.total_pay,
    calculation_date = now();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;