-- Make team_id nullable in goals table to allow personal goals without team membership
ALTER TABLE goals ALTER COLUMN team_id DROP NOT NULL;