ALTER TABLE messages
ADD COLUMN IF NOT EXISTS downloaded_at TIMESTAMP WITH TIME ZONE;

CREATE INDEX IF NOT EXISTS idx_messages_downloaded_at ON messages(downloaded_at);

