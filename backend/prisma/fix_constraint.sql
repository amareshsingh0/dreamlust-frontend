-- Fix for creators_user_id_key constraint/index conflict
-- This script handles the redundant index that Prisma is trying to manage

-- Check if the constraint exists and handle it properly
DO $$
BEGIN
    -- If the constraint exists, we'll keep it (it already has an index)
    -- Prisma will recognize it and not try to recreate it
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'creators_user_id_key' 
        AND conrelid = 'creators'::regclass
    ) THEN
        -- Create the unique constraint if it doesn't exist
        ALTER TABLE creators ADD CONSTRAINT creators_user_id_key UNIQUE (user_id);
    END IF;
END $$;

