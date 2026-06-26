-- Ejecutar en Supabase SQL Editor

-- Tabla de productos
CREATE TABLE products (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  cat TEXT DEFAULT '',
  type TEXT DEFAULT 'sofa',
  price NUMERIC DEFAULT 0,
  old NUMERIC,
  badge TEXT,
  material TEXT DEFAULT '',
  city TEXT DEFAULT '',
  rating NUMERIC DEFAULT 4.5,
  reviews INTEGER DEFAULT 0,
  tones JSONB DEFAULT '["#7E5BC4","#D8BE8C"]',
  city2 TEXT DEFAULT '2-4 días',
  dims TEXT DEFAULT '',
  weight TEXT DEFAULT '',
  warranty TEXT DEFAULT '2 años',
  "desc" TEXT DEFAULT '',
  images JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabla de asesores
CREATE TABLE asesores (
  id SERIAL PRIMARY KEY,
  nombre TEXT NOT NULL,
  telefono TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabla de leads
CREATE TABLE leads (
  id SERIAL PRIMARY KEY,
  session_id TEXT,
  nombre TEXT DEFAULT '',
  telefono TEXT DEFAULT '',
  ci TEXT DEFAULT '',
  producto_interes TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Habilitar RLS (Row Level Security)
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE asesores ENABLE ROW LEVEL SECURITY;
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;

-- Politicas: lectura publica para productos y asesores
CREATE POLICY "Productos lectura publica" ON products FOR SELECT USING (true);
CREATE POLICY "Asesores lectura publica" ON asesores FOR SELECT USING (true);

-- Politicas: escritura solo con service_key (desde el backend)
CREATE POLICY "Productos escritura backend" ON products FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Asesores escritura backend" ON asesores FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Leads escritura backend" ON leads FOR ALL USING (true) WITH CHECK (true);

-- Crear bucket para imagenes de productos
-- (Esto se hace desde el dashboard de Supabase > Storage > New Bucket)
-- Nombre: product-images
-- Public: SI
