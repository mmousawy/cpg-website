-- Trigger to automatically set sort_order for new photos
-- New photos get sort_order = 0, existing photos get incremented

CREATE OR REPLACE FUNCTION set_photo_sort_order()
RETURNS TRIGGER AS $$
BEGIN
  -- Increment sort_order of all existing photos for this user
  UPDATE photos
  SET sort_order = COALESCE(sort_order, 0) + 1
  WHERE user_id = NEW.user_id
    AND id != NEW.id;
  
  -- Set the new photo's sort_order to 0 (front of list)
  NEW.sort_order := 0;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create the trigger
DROP TRIGGER IF EXISTS photo_sort_order_trigger ON photos;
CREATE TRIGGER photo_sort_order_trigger
  BEFORE INSERT ON photos
  FOR EACH ROW
  EXECUTE FUNCTION set_photo_sort_order();

-- Also update existing photos that have NULL sort_order
-- Give them a sort_order based on created_at (older = higher number = later in list)
UPDATE photos p
SET sort_order = sub.new_order
FROM (
  SELECT 
    id,
    ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY created_at DESC) - 1 AS new_order
  FROM photos
  WHERE sort_order IS NULL
) sub
WHERE p.id = sub.id;

