-- Migration: Add transactions table for financial module
-- Date: November 28, 2025
-- Required columns: user_id, amount, type, category, description, transaction_date

-- Create transactions table

--Enum type for transaction type
CREATE TYPE transaction_type AS ENUM ('income', 'expense');

CREATE TABLE transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  
  -- Required columns
  type transaction_type NOT NULL,
  amount BIGINT NOT NULL CHECK (amount > 0),
  
  category VARCHAR(50) NOT NULL,
  description TEXT NOT NULL,
  transaction_date DATE NOT NULL DEFAULT CURRENT_DATE,
  
  
  -- Audit fields
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  -- Constraints
  CONSTRAINT valid_transaction_date CHECK (transaction_date <= CURRENT_DATE + INTERVAL '1 day'),
  CONSTRAINT valid_amount CHECK (amount <= 999999999.99)
);

-- Create indexes for performance (seperti yang diminta)
CREATE INDEX idx_transactions_user_id ON transactions(user_id);
CREATE INDEX idx_transactions_user_date ON transactions(user_id, transaction_date DESC);
CREATE INDEX idx_transactions_type ON transactions(type);
CREATE INDEX idx_transactions_category ON transactions(category);
CREATE INDEX idx_transactions_date ON transactions(transaction_date);