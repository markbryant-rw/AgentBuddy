
-- Sync contact details across appraisals at the same address
-- Use the most recent non-empty value for each field

WITH best_vendor_data AS (
  SELECT DISTINCT ON (LOWER(TRIM(address)))
    LOWER(TRIM(address)) as normalized_address,
    vendor_name,
    vendor_mobile,
    vendor_email,
    latitude,
    longitude
  FROM logged_appraisals
  WHERE vendor_name IS NOT NULL AND vendor_name != ''
  ORDER BY LOWER(TRIM(address)), appraisal_date DESC
)
UPDATE logged_appraisals la
SET 
  vendor_name = COALESCE(NULLIF(la.vendor_name, ''), bvd.vendor_name),
  vendor_mobile = COALESCE(la.vendor_mobile, bvd.vendor_mobile),
  vendor_email = COALESCE(la.vendor_email, bvd.vendor_email),
  latitude = COALESCE(la.latitude, bvd.latitude),
  longitude = COALESCE(la.longitude, bvd.longitude),
  updated_at = NOW()
FROM best_vendor_data bvd
WHERE LOWER(TRIM(la.address)) = bvd.normalized_address
  AND (la.vendor_name IS NULL OR la.vendor_name = '');
