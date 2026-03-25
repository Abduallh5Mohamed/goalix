/*
  # Goalix Database Schema

  ## Overview
  Creates the core database structure for a fitness and goal tracking application with health metrics monitoring.

  ## New Tables
  
  ### `users`
  - `id` (uuid, primary key) - User identifier
  - `email` (text, unique) - User email address
  - `full_name` (text) - User's full name
  - `created_at` (timestamptz) - Account creation timestamp
  
  ### `goals`
  - `id` (uuid, primary key) - Goal identifier
  - `user_id` (uuid, foreign key) - References users table
  - `title` (text) - Goal title
  - `description` (text) - Goal description
  - `category` (text) - Category (fitness, health, sports, etc.)
  - `target_value` (numeric) - Target value to achieve
  - `current_value` (numeric) - Current progress value
  - `unit` (text) - Measurement unit (km, hours, calories, etc.)
  - `status` (text) - Goal status (active, completed, paused)
  - `created_at` (timestamptz) - Creation timestamp
  - `updated_at` (timestamptz) - Last update timestamp
  
  ### `health_metrics`
  - `id` (uuid, primary key) - Metric identifier
  - `user_id` (uuid, foreign key) - References users table
  - `metric_type` (text) - Type of metric (heart_rate, steps, calories, etc.)
  - `value` (numeric) - Metric value
  - `recorded_at` (timestamptz) - When the metric was recorded
  
  ### `activities`
  - `id` (uuid, primary key) - Activity identifier
  - `user_id` (uuid, foreign key) - References users table
  - `activity_type` (text) - Type of activity (running, cycling, soccer, etc.)
  - `duration_minutes` (integer) - Activity duration
  - `distance_km` (numeric) - Distance covered (if applicable)
  - `calories_burned` (integer) - Estimated calories burned
  - `notes` (text) - Activity notes
  - `activity_date` (timestamptz) - When the activity occurred
  - `created_at` (timestamptz) - Creation timestamp

  ## Security
  - Enable RLS on all tables
  - Users can only access their own data
  - Authenticated users can create, read, update, and delete their own records
*/

-- Create users table
CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text UNIQUE NOT NULL,
  full_name text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own profile"
  ON users FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON users FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Create goals table
CREATE TABLE IF NOT EXISTS goals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  title text NOT NULL,
  description text DEFAULT '',
  category text DEFAULT 'fitness',
  target_value numeric DEFAULT 0,
  current_value numeric DEFAULT 0,
  unit text DEFAULT '',
  status text DEFAULT 'active',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE goals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own goals"
  ON goals FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own goals"
  ON goals FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own goals"
  ON goals FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own goals"
  ON goals FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Create health_metrics table
CREATE TABLE IF NOT EXISTS health_metrics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  metric_type text NOT NULL,
  value numeric NOT NULL,
  recorded_at timestamptz DEFAULT now()
);

ALTER TABLE health_metrics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own health metrics"
  ON health_metrics FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own health metrics"
  ON health_metrics FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own health metrics"
  ON health_metrics FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own health metrics"
  ON health_metrics FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Create activities table
CREATE TABLE IF NOT EXISTS activities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  activity_type text NOT NULL,
  duration_minutes integer DEFAULT 0,
  distance_km numeric DEFAULT 0,
  calories_burned integer DEFAULT 0,
  notes text DEFAULT '',
  activity_date timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE activities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own activities"
  ON activities FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own activities"
  ON activities FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own activities"
  ON activities FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own activities"
  ON activities FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS goals_user_id_idx ON goals(user_id);
CREATE INDEX IF NOT EXISTS health_metrics_user_id_idx ON health_metrics(user_id);
CREATE INDEX IF NOT EXISTS activities_user_id_idx ON activities(user_id);
CREATE INDEX IF NOT EXISTS health_metrics_recorded_at_idx ON health_metrics(recorded_at);
CREATE INDEX IF NOT EXISTS activities_activity_date_idx ON activities(activity_date);