-- Only active jobs must be unique; sent and failed campaigns may be submitted again.
CREATE UNIQUE INDEX "Campaign_active_idempotency_key_unique"
ON "Campaign"("idempotencyKey")
WHERE "status" IN ('PENDING', 'PROCESSING');
