/*
  # Shift Management and Overtime System

  1. New Tables
    - `user_profiles_extended` - Extended user profile information
    - `work_shifts` - Weekly shift templates for users
    - `salary_config` - Salary configuration per user
    - `overtime_calculations` - Monthly overtime calculations
    - `holidays` - Company holidays configuration

  2. Security
    - Enable RLS on all new tables
    - Add policies for user access control
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

-- Work shifts configuration (weekly template)
CREATE TABLE IF NOT EXISTS work_shifts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  day_of_week integer NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6), -- 0=Sunday, 6=Saturday
  start_time time NOT NULL,
  end_time time NOT NULL,
  is_active boolean DEFAULT true,
  break_duration_minutes integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id, day_of_week)
);

-- Salary configuration
CREATE TABLE IF NOT EXISTS salary_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid UNIQUE REFERENCES profiles(id) ON DELETE CASCADE,
  gross_salary numeric(10,2) NOT NULL,
  salary_type varchar(10) NOT NULL CHECK (salary_type IN ('monthly', 'annual')),
  overtime_multiplier numeric(3,2) DEFAULT 1.5, -- 1.5x for overtime hours
  currency varchar(3) DEFAULT 'EUR',
  effective_from date DEFAULT CURRENT_DATE,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Company holidays
CREATE TABLE IF NOT EXISTS holidays (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name varchar(100) NOT NULL,
  date date NOT NULL,
  is_recurring boolean DEFAULT false, -- for annual holidays
  created_at timestamptz DEFAULT now(),
  UNIQUE(date)
);

-- Monthly overtime calculations (cached results)
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

-- Enable RLS
ALTER TABLE user_profiles_extended ENABLE ROW LEVEL SECURITY;
ALTER TABLE work_shifts ENABLE ROW LEVEL SECURITY;
ALTER TABLE salary_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE holidays ENABLE ROW LEVEL SECURITY;
ALTER TABLE overtime_calculations ENABLE ROW LEVEL SECURITY;

-- RLS Policies for user_profiles_extended
CREATE POLICY "Users can read own extended profile"
  ON user_profiles_extended
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can update own extended profile"
  ON user_profiles_extended
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can insert own extended profile"
  ON user_profiles_extended
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- RLS Policies for work_shifts
CREATE POLICY "Users can manage own work shifts"
  ON work_shifts
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- RLS Policies for salary_config
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

-- RLS Policies for holidays (read-only for all users)
CREATE POLICY "All users can read holidays"
  ON holidays
  FOR SELECT
  TO authenticated
  USING (true);

-- RLS Policies for overtime_calculations
CREATE POLICY "Users can read own overtime calculations"
  ON overtime_calculations
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Indexes for performance
CREATE INDEX idx_work_shifts_user_day ON work_shifts(user_id, day_of_week);
CREATE INDEX idx_overtime_calculations_user_period ON overtime_calculations(user_id, year, month);
CREATE INDEX idx_holidays_date ON holidays(date);

-- Functions for automatic calculations
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
  v_overtime_multiplier numeric := 1.5;
  v_regular_pay numeric := 0;
  v_overtime_pay numeric := 0;
  v_total_pay numeric := 0;
BEGIN
  -- Calculate scheduled hours for the month based on work_shifts
  SELECT COALESCE(SUM(
    CASE 
      WHEN ws.end_time > ws.start_time THEN
        EXTRACT(EPOCH FROM (ws.end_time - ws.start_time)) / 3600 - (ws.break_duration_minutes / 60.0)
      ELSE
        -- Handle overnight shifts
        EXTRACT(EPOCH FROM (ws.end_time + interval '1 day' - ws.start_time)) / 3600 - (ws.break_duration_minutes / 60.0)
    END
  ) * 4.33, 0) -- Approximate weeks per month
  INTO v_scheduled_hours
  FROM work_shifts ws
  WHERE ws.user_id = p_user_id AND ws.is_active = true;

  -- Calculate actual worked hours from time_entries
  SELECT COALESCE(SUM(
    CASE 
      WHEN te_out.timestamp IS NOT NULL THEN
        EXTRACT(EPOCH FROM (te_out.timestamp - te_in.timestamp)) / 3600
      ELSE 0
    END
  ), 0)
  INTO v_worked_hours
  FROM time_entries te_in
  LEFT JOIN time_entries te_out ON (
    te_out.user_id = te_in.user_id 
    AND te_out.entry_type = 'check_out'
    AND DATE(te_out.timestamp) = DATE(te_in.timestamp)
    AND te_out.timestamp > te_in.timestamp
  )
  WHERE te_in.user_id = p_user_id
    AND te_in.entry_type = 'check_in'
    AND EXTRACT(YEAR FROM te_in.timestamp) = p_year
    AND EXTRACT(MONTH FROM te_in.timestamp) = p_month;

  -- Calculate regular and overtime hours
  v_regular_hours := LEAST(v_worked_hours, v_scheduled_hours);
  v_overtime_hours := GREATEST(0, v_worked_hours - v_scheduled_hours);

  -- Get salary configuration
  SELECT 
    CASE 
      WHEN sc.salary_type = 'monthly' THEN sc.gross_salary / v_scheduled_hours
      ELSE (sc.gross_salary / 12) / v_scheduled_hours
    END,
    sc.overtime_multiplier
  INTO v_hourly_rate, v_overtime_multiplier
  FROM salary_config sc
  WHERE sc.user_id = p_user_id;

  -- Calculate payments
  v_regular_pay := v_regular_hours * COALESCE(v_hourly_rate, 0);
  v_overtime_pay := v_overtime_hours * COALESCE(v_hourly_rate, 0) * v_overtime_multiplier;
  v_total_pay := v_regular_pay + v_overtime_pay;

  -- Insert or update overtime calculation
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