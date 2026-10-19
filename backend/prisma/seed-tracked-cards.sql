INSERT INTO tracked_card (product_id, reason)
SELECT product_id, 'Initial curated featured card'
FROM products
WHERE product_id IN (
  84196, 84186, 123432, 86912, 246723,
  106999, 89163, 90139, 610516, 84195,
  115598, 518861, 42382, 138497, 90137
)
ON CONFLICT (product_id) DO UPDATE
SET active = TRUE,
    reason = EXCLUDED.reason;
