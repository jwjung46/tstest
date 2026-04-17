-- billing_events.processing_status is already a TEXT column.
-- This backfill reserves the ignored state for accepted webhook deliveries that
-- are durably recorded but intentionally not reconciled in Stage 2.

UPDATE billing_events
SET
  processing_status = 'ignored',
  last_error_message = COALESCE(
    last_error_message,
    'Backfilled to ignored after Stage 2 durable webhook ingestion update.'
  )
WHERE source_type = 'webhook'
  AND processing_status = 'failed'
  AND event_type <> 'PAYMENT_STATUS_CHANGED';
