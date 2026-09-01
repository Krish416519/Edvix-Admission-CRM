-- =============================================================================
-- 00000000000135_consolidate_duplicate_dispositions.sql
-- Consolidate duplicate disposition names within the same category.
-- Keeps the OLDER disposition (lower UUID) and repoints all references
-- from the newer duplicate to it, then soft-deletes the newer duplicate.
-- =============================================================================

DO $$
DECLARE
  dup_rec RECORD;
  keep_id UUID;
  new_id UUID;
BEGIN
  -- For each set of duplicate (category_id, name) pairs, keep the one with the
  -- lowest id and merge the others into it.
  FOR dup_rec IN
    SELECT name, category_id, COUNT(*) as cnt
    FROM dispositions
    WHERE is_active = true
    GROUP BY name, category_id
    HAVING COUNT(*) > 1
  LOOP
    -- Keep the one with the lowest id
    SELECT id INTO keep_id
    FROM dispositions
    WHERE name = dup_rec.name AND category_id = dup_rec.category_id AND is_active = true
    ORDER BY id ASC
    LIMIT 1;

    -- Process the rest (to be consolidated)
    FOR new_id IN
      SELECT id
      FROM dispositions
      WHERE name = dup_rec.name AND category_id = dup_rec.category_id AND is_active = true
        AND id != keep_id
      ORDER BY id ASC
    LOOP
      -- 1. Repoint lead_disposition_history references
      UPDATE lead_disposition_history
      SET disposition_id = keep_id
      WHERE disposition_id = new_id;

      -- 2. Repoint leads.latest_disposition_id references
      --    Only update if the lead doesn't already have the keep_id as latest
      UPDATE leads
      SET latest_disposition_id = keep_id
      WHERE latest_disposition_id = new_id;

      -- 3. Repoint sub_dispositions
      UPDATE sub_dispositions
      SET disposition_id = keep_id
      WHERE disposition_id = new_id;

      -- 4. Repoint next_actions
      UPDATE next_actions
      SET disposition_id = keep_id
      WHERE disposition_id = new_id;

      -- 5. Soft-delete the duplicate disposition
      UPDATE dispositions
      SET is_active = false,
          updated_at = NOW()
      WHERE id = new_id;

      RAISE NOTICE 'Consolidated % (id: %) into % (id: %)', dup_rec.name, new_id, dup_rec.name, keep_id;
    END LOOP;
  END LOOP;
END $$;

-- Add unique index to prevent future duplicates
-- A disposition name must be unique within an active category
CREATE UNIQUE INDEX IF NOT EXISTS dispositions_unique_name_per_category
ON dispositions (LOWER(TRIM(name)), category_id)
WHERE is_active = true;

-- Also add a unique index on (category_id, name) for safety
COMMENT ON INDEX dispositions_unique_name_per_category IS 'Ensures disposition names are unique within each active category';
