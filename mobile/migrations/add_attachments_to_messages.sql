ALTER TABLE messages
ADD COLUMN IF NOT EXISTS file_url TEXT,
ADD COLUMN IF NOT EXISTS file_type TEXT,
ADD COLUMN IF NOT EXISTS file_name TEXT;

COMMENT ON COLUMN messages.file_url IS 'URL of the attached file (image or document)';
COMMENT ON COLUMN messages.file_type IS 'Type of file: image, document, or null for text messages';
COMMENT ON COLUMN messages.file_name IS 'Original name of the uploaded file';

