-- Create wish_lists table
CREATE TABLE wish_lists (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create wish_items table
CREATE TABLE wish_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  wish_list_id UUID NOT NULL REFERENCES wish_lists(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  link TEXT,
  is_bought BOOLEAN DEFAULT FALSE,
  priority INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX idx_wish_items_list_id ON wish_items(wish_list_id);
CREATE INDEX idx_wish_items_bought ON wish_items(is_bought);
CREATE INDEX idx_wish_items_priority ON wish_items(wish_list_id, priority);

-- Enable Row Level Security (RLS)
ALTER TABLE wish_lists ENABLE ROW LEVEL SECURITY;
ALTER TABLE wish_items ENABLE ROW LEVEL SECURITY;

-- Create policies for public read access
CREATE POLICY "Allow public read access to wish_lists" ON wish_lists
  FOR SELECT USING (true);

CREATE POLICY "Allow public read access to wish_items" ON wish_items
  FOR SELECT USING (true);

-- Create policies for public insert access (anyone can add lists and items)
CREATE POLICY "Allow public insert access to wish_lists" ON wish_lists
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow public insert access to wish_items" ON wish_items
  FOR INSERT WITH CHECK (true);

-- Create policies for public update access (anyone can mark items as bought/unbought)
CREATE POLICY "Allow public update access to wish_lists" ON wish_lists
  FOR UPDATE USING (true);

CREATE POLICY "Allow public update access to wish_items" ON wish_items
  FOR UPDATE USING (true);

-- Note: DELETE policies are intentionally omitted - only admins can delete
-- Admin delete operations will be handled through the application layer
-- You can add admin-specific delete policies if needed:
-- CREATE POLICY "Allow admin delete access to wish_lists" ON wish_lists
--   FOR DELETE USING (auth.role() = 'admin');
-- CREATE POLICY "Allow admin delete access to wish_items" ON wish_items
--   FOR DELETE USING (auth.role() = 'admin');

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers to automatically update updated_at
CREATE TRIGGER update_wish_lists_updated_at 
  BEFORE UPDATE ON wish_lists 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_wish_items_updated_at 
  BEFORE UPDATE ON wish_items 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
