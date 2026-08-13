ALTER TYPE payment_status ADD VALUE IF NOT EXISTS 'processing';
ALTER TYPE payment_status ADD VALUE IF NOT EXISTS 'cancelled';
ALTER TYPE payment_status ADD VALUE IF NOT EXISTS 'refunded';
ALTER TYPE payment_status ADD VALUE IF NOT EXISTS 'failed';

ALTER TABLE payments ADD COLUMN IF NOT EXISTS competence VARCHAR(20) NOT NULL;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS gateway_id TEXT;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS gateway_status TEXT;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS transaction_id TEXT;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS payment_method TEXT;

ALTER TABLE payments ADD CONSTRAINT unique_contract_competence UNIQUE (contract_id, competence);

-- Habilitando emissões em tempo real do banco de dados (Realtime/WebSockets)
ALTER PUBLICATION supabase_realtime ADD TABLE payments;
