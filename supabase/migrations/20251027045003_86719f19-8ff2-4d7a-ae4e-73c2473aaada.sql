-- Extend team_members access_level enum to include 'admin'
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum 
    WHERE enumlabel = 'admin' 
    AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'access_level')
  ) THEN
    ALTER TYPE access_level ADD VALUE 'admin';
  END IF;
END $$;