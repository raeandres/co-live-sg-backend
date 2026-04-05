-- Database initialization script
-- This script runs automatically when the PostgreSQL container is first created

-- Create extensions (if needed)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Example: Create a sample table
-- Uncomment and modify as needed for your application
-- CREATE TABLE IF NOT EXISTS users (
--     id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
--     email VARCHAR(255) UNIQUE NOT NULL,
--     name VARCHAR(255),
--     created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
--     updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
-- );

-- Example: Insert sample data
-- INSERT INTO users (email, name) VALUES 
--     ('user@example.com', 'Test User')
-- ON CONFLICT (email) DO NOTHING;

-- Verify database setup
SELECT current_database();
SELECT version();
