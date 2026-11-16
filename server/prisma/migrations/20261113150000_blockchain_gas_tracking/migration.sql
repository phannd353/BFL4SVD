CREATE TABLE "blockchain_transaction" (
    "txHash" TEXT NOT NULL,
    "gasUsed" BIGINT,
    "jobId" TEXT NOT NULL,
    "roundId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "blockchain_transaction_pkey" PRIMARY KEY ("txHash")
);

CREATE INDEX "blockchain_transaction_jobId_idx" ON "blockchain_transaction"("jobId");
CREATE INDEX "blockchain_transaction_roundId_idx" ON "blockchain_transaction"("roundId");

ALTER TABLE "blockchain_transaction"
ADD CONSTRAINT "blockchain_transaction_jobId_fkey"
FOREIGN KEY ("jobId") REFERENCES "training_job"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "blockchain_transaction"
ADD CONSTRAINT "blockchain_transaction_roundId_fkey"
FOREIGN KEY ("roundId") REFERENCES "training_job_round"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

INSERT INTO "blockchain_transaction" ("txHash", "jobId")
SELECT "chainTxHash", "id"
FROM "training_job"
WHERE "chainTxHash" IS NOT NULL
ON CONFLICT ("txHash") DO NOTHING;

INSERT INTO "blockchain_transaction" ("txHash", "jobId", "roundId")
SELECT "chainTxHash", "jobId", "id"
FROM "training_job_round"
WHERE "chainTxHash" IS NOT NULL
ON CONFLICT ("txHash") DO UPDATE
SET "roundId" = EXCLUDED."roundId";

INSERT INTO "blockchain_transaction" ("txHash", "jobId", "roundId")
SELECT "model_update"."chainTxHash", "training_job_round"."jobId", "training_job_round"."id"
FROM "model_update"
JOIN "training_job_round"
  ON "model_update"."trainingRoundId" = "training_job_round"."id"
WHERE "model_update"."chainTxHash" IS NOT NULL
ON CONFLICT ("txHash") DO UPDATE
SET "jobId" = EXCLUDED."jobId",
    "roundId" = EXCLUDED."roundId";
