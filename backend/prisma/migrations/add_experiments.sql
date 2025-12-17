-- Add Experiment and ExperimentAssignment models for A/B testing

-- Create experiments table
CREATE TABLE IF NOT EXISTS "experiments" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "hypothesis" TEXT NOT NULL,
  "variants" JSONB NOT NULL,
  "metrics" JSONB NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'draft',
  "start_date" TIMESTAMP(6),
  "end_date" TIMESTAMP(6),
  "results" JSONB,
  "winner" TEXT,
  "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Create experiment_assignments table
CREATE TABLE IF NOT EXISTS "experiment_assignments" (
  "user_id" UUID NOT NULL,
  "experiment_id" TEXT NOT NULL,
  "variant" TEXT NOT NULL,
  "assigned_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "experiment_assignments_user_experiment_unique" UNIQUE ("user_id", "experiment_id")
);

-- Add indexes
CREATE INDEX IF NOT EXISTS "idx_experiments_status" ON "experiments"("status");
CREATE INDEX IF NOT EXISTS "idx_experiments_created_at" ON "experiments"("created_at");
CREATE INDEX IF NOT EXISTS "idx_experiment_assignments_user" ON "experiment_assignments"("user_id");
CREATE INDEX IF NOT EXISTS "idx_experiment_assignments_experiment" ON "experiment_assignments"("experiment_id");
CREATE INDEX IF NOT EXISTS "idx_experiment_assignments_variant" ON "experiment_assignments"("variant");

