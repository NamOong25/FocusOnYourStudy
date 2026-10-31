-- Additive ledger. Keep receipts after course/task/study deletion: retries must not recreate rows.
CREATE TABLE study_plan_applications (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
    client_request_id UUID NOT NULL,
    request_hash VARCHAR(64) NOT NULL,
    applied_at TIMESTAMPTZ NOT NULL,
    response_json JSONB NOT NULL,
    CONSTRAINT uq_study_plan_application_request UNIQUE (user_id, client_request_id),
    CONSTRAINT ck_study_plan_application_hash CHECK (request_hash ~ '^[0-9a-f]{64}$'),
    CONSTRAINT ck_study_plan_application_response CHECK (jsonb_typeof(response_json) = 'object')
);
