-- 1. TABLA CATEGORIAS

CREATE TABLE IF NOT EXISTS public.categorias (
    id TEXT PRIMARY KEY,
    carpeta TEXT NOT NULL,
    nombre TEXT NOT NULL,
    jp TEXT,
    intro TEXT,
    orden INT DEFAULT 0
);

-- 2. TABLA PRODUCTOS

CREATE TABLE IF NOT EXISTS public.productos (
    id SERIAL PRIMARY KEY,
    categoria_id TEXT REFERENCES public.categorias(id) ON DELETE CASCADE,
    carpeta TEXT NOT NULL,
    nombre TEXT NOT NULL,
    sub TEXT,
    jp TEXT,
    precio INT NOT NULL,
    temperatura TEXT DEFAULT '',
    tags TEXT[] DEFAULT '{}',
    disponible BOOLEAN DEFAULT TRUE,
    descripcion TEXT DEFAULT '',
    variantes JSONB DEFAULT '[]',
    orden INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. TABLA RECOMENDADOS

CREATE TABLE IF NOT EXISTS public.recomendados (
    id SERIAL PRIMARY KEY,
    nombre TEXT NOT NULL,
    sub TEXT,
    jp TEXT,
    precio INT NOT NULL,
    temperatura TEXT DEFAULT '',
    tags TEXT[] DEFAULT '{}',
    disponible BOOLEAN DEFAULT TRUE,
    descripcion TEXT DEFAULT '',
    carpeta TEXT NOT NULL,
    tiene_video BOOLEAN DEFAULT FALSE,
    orden INT DEFAULT 0
);

-- 4. POLÍTICAS DE SEGURIDAD (RLS)

ALTER TABLE public.categorias ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.productos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recomendados ENABLE ROW LEVEL SECURITY;

-- Lectura pública para cualquier persona que visite la carta
CREATE POLICY "Lectura pública de categorias" ON public.categorias FOR SELECT USING (true);
CREATE POLICY "Lectura pública de productos" ON public.productos FOR SELECT USING (true);
CREATE POLICY "Lectura pública de recomendados" ON public.recomendados FOR SELECT USING (true);

-- Edición exclusiva para el administrador autenticado
CREATE POLICY "Admin total categorias" ON public.categorias FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Admin total productos" ON public.productos FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Admin total recomendados" ON public.recomendados FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 5. INSERTAR DATOS INICIALES
INSERT INTO public.categorias (id, carpeta, nombre, jp, intro, orden) VALUES ('matcha-puro', '01-matcha-puro', 'Matcha Puro', '純抹茶', 'Solo matcha y agua, batido a mano. Elige tu matcha: Gokou, Kagoshima, Tencha, Samidori.', 1) ON CONFLICT (id) DO UPDATE SET nombre=EXCLUDED.nombre, orden=EXCLUDED.orden;
INSERT INTO public.categorias (id, carpeta, nombre, jp, intro, orden) VALUES ('mezclas', '02-creaciones-de-matcha', 'Creaciones de Matcha', '抹茶ミックス', '', 2) ON CONFLICT (id) DO UPDATE SET nombre=EXCLUDED.nombre, orden=EXCLUDED.orden;
INSERT INTO public.categorias (id, carpeta, nombre, jp, intro, orden) VALUES ('cafe', '03-cafe-de-especialidad', 'Café de Especialidad', 'スペシャルティコーヒー', 'Nuestro amigo FACTO COFFEE se suma a esta experiencia con una propuesta de tueste de precisión, para que siempre disfrutes de un sabor único en cada taza de café.', 3) ON CONFLICT (id) DO UPDATE SET nombre=EXCLUDED.nombre, orden=EXCLUDED.orden;
INSERT INTO public.categorias (id, carpeta, nombre, jp, intro, orden) VALUES ('otras', '04-otras-bebidas', 'Otras Bebidas', '他のドリンク', '', 4) ON CONFLICT (id) DO UPDATE SET nombre=EXCLUDED.nombre, orden=EXCLUDED.orden;
INSERT INTO public.categorias (id, carpeta, nombre, jp, intro, orden) VALUES ('sandos', '05-sandos', 'Sandos', 'お供に', '', 5) ON CONFLICT (id) DO UPDATE SET nombre=EXCLUDED.nombre, orden=EXCLUDED.orden;
INSERT INTO public.categorias (id, carpeta, nombre, jp, intro, orden) VALUES ('yakigashi', '06-yakigashi', 'Yakigashi', '焼き菓子', '', 6) ON CONFLICT (id) DO UPDATE SET nombre=EXCLUDED.nombre, orden=EXCLUDED.orden;
INSERT INTO public.productos (categoria_id, carpeta, nombre, sub, jp, precio, temperatura, tags, disponible, descripcion, variantes, orden) VALUES ('matcha-puro', '01-koicha', 'Koicha', 'Matcha y agua', '濃茶', 4500, 'caliente', ARRAY['caliente']::TEXT[], TRUE, 'Matcha espeso, la forma más pura de tomarlo. (Matcha y Agua)', '[]'::JSONB, 1);
INSERT INTO public.productos (categoria_id, carpeta, nombre, sub, jp, precio, temperatura, tags, disponible, descripcion, variantes, orden) VALUES ('matcha-puro', '02-usucha', 'Usucha', 'Matcha y agua', '薄茶', 4200, 'caliente', ARRAY['caliente']::TEXT[], TRUE, 'Matcha ligero, para quienes recién comienzan. (Matcha y Agua)', '[]'::JSONB, 2);
INSERT INTO public.productos (categoria_id, carpeta, nombre, sub, jp, precio, temperatura, tags, disponible, descripcion, variantes, orden) VALUES ('mezclas', '01-yuzu-coco', 'Yuzu Coco', '', '柚子', 5500, 'ambos', ARRAY['frio', 'caliente']::TEXT[], TRUE, 'Matcha, Leche de Coco y Yuzu.', '[]'::JSONB, 3);
INSERT INTO public.productos (categoria_id, carpeta, nombre, sub, jp, precio, temperatura, tags, disponible, descripcion, variantes, orden) VALUES ('mezclas', '02-matcha-tonica-naranja', 'Matcha Tónica Naranja', '', '抹茶トニック', 5200, 'frio', ARRAY['frio']::TEXT[], TRUE, 'Una bebida refrescante. (Matcha, Agua Tónica, Jugo de Naranja)', '[]'::JSONB, 4);
INSERT INTO public.productos (categoria_id, carpeta, nombre, sub, jp, precio, temperatura, tags, disponible, descripcion, variantes, orden) VALUES ('mezclas', '03-ube-matcha-latte', 'Ube Matcha Latte', 'Leche entera o vegetal', '紅芋', 5200, 'ambos', ARRAY['frio', 'caliente']::TEXT[], TRUE, 'Combinación perfecta con el tubérculo dulce y avainillado. (Ube, Matcha, Leche Entera o Vegetal)', '[]'::JSONB, 5);
INSERT INTO public.productos (categoria_id, carpeta, nombre, sub, jp, precio, temperatura, tags, disponible, descripcion, variantes, orden) VALUES ('mezclas', '04-fruit-matcha', 'Fruit Matcha', 'Leche entera o vegetal', '果物抹茶', 4800, 'ambos', ARRAY['frio', 'caliente']::TEXT[], TRUE, 'Matcha, puré de fruta, leche vegetal o entera.', '[]'::JSONB, 6);
INSERT INTO public.productos (categoria_id, carpeta, nombre, sub, jp, precio, temperatura, tags, disponible, descripcion, variantes, orden) VALUES ('mezclas', '05-chai-matcha', 'Chai Matcha', 'Leche entera o vegetal', 'チャイ抹茶', 4800, 'ambos', ARRAY['frio', 'caliente']::TEXT[], TRUE, 'Una fusión para los amantes del chai. (Matcha, Chai, Leche Entera o Vegetal)', '[]'::JSONB, 7);
INSERT INTO public.productos (categoria_id, carpeta, nombre, sub, jp, precio, temperatura, tags, disponible, descripcion, variantes, orden) VALUES ('mezclas', '06-maqui-matcha', 'Maqui Matcha', 'Leche entera o vegetal', 'マキ抹茶', 5200, 'ambos', ARRAY['frio', 'caliente']::TEXT[], TRUE, 'Una combinación perfecta de la región, sin olvidarnos de Chilito lindo. (Matcha, Syrup de Maqui, Leche Entera o Vegetal)', '[]'::JSONB, 8);
INSERT INTO public.productos (categoria_id, carpeta, nombre, sub, jp, precio, temperatura, tags, disponible, descripcion, variantes, orden) VALUES ('mezclas', '07-dirty-matcha', 'Dirty Matcha', 'Leche entera o vegetal', 'ダーティー抹茶', 5200, 'ambos', ARRAY['frio', 'caliente']::TEXT[], TRUE, 'Para quienes no se deciden entre el café y el matcha. (Matcha, Shot de Espresso, Leche Entera o Vegetal)', '[]'::JSONB, 9);
INSERT INTO public.productos (categoria_id, carpeta, nombre, sub, jp, precio, temperatura, tags, disponible, descripcion, variantes, orden) VALUES ('mezclas', '08-choco-matcha', 'Choco Matcha', 'Leche entera o vegetal', 'チョコ抹茶', 5200, 'ambos', ARRAY['frio', 'caliente']::TEXT[], TRUE, 'Capas de chocolate y matcha, acompañado de leche vegetal o entera.', '[]'::JSONB, 10);
INSERT INTO public.productos (categoria_id, carpeta, nombre, sub, jp, precio, temperatura, tags, disponible, descripcion, variantes, orden) VALUES ('mezclas', '09-tradicional-matcha-latte', 'Tradicional Matcha Latte', 'Leche entera o vegetal', '抹茶ラテ', 4800, 'ambos', ARRAY['frio', 'caliente']::TEXT[], TRUE, 'Matcha, Leche Entera o Vegetal.', '[]'::JSONB, 11);
INSERT INTO public.productos (categoria_id, carpeta, nombre, sub, jp, precio, temperatura, tags, disponible, descripcion, variantes, orden) VALUES ('cafe', '01-espresso', 'Espresso', '', 'エスプレッソ', 2500, 'ambos', ARRAY['frio', 'caliente']::TEXT[], TRUE, '', '[]'::JSONB, 12);
INSERT INTO public.productos (categoria_id, carpeta, nombre, sub, jp, precio, temperatura, tags, disponible, descripcion, variantes, orden) VALUES ('cafe', '02-cafe-con-leche-grande', 'Café con Leche Grande', '', 'カフェラテ', 4500, 'ambos', ARRAY['frio', 'caliente']::TEXT[], TRUE, '', '[]'::JSONB, 13);
INSERT INTO public.productos (categoria_id, carpeta, nombre, sub, jp, precio, temperatura, tags, disponible, descripcion, variantes, orden) VALUES ('cafe', '03-cafe-con-leche-mediano', 'Café con Leche Mediano', '', 'カフェラテ', 3800, 'ambos', ARRAY['frio', 'caliente']::TEXT[], TRUE, '', '[]'::JSONB, 14);
INSERT INTO public.productos (categoria_id, carpeta, nombre, sub, jp, precio, temperatura, tags, disponible, descripcion, variantes, orden) VALUES ('cafe', '04-filtrado', 'Filtrado', '', 'ドリップ', 4500, 'ambos', ARRAY['frio', 'caliente']::TEXT[], TRUE, '', '[]'::JSONB, 15);
INSERT INTO public.productos (categoria_id, carpeta, nombre, sub, jp, precio, temperatura, tags, disponible, descripcion, variantes, orden) VALUES ('cafe', '05-moka', 'Moka', '', 'モカ', 4900, 'ambos', ARRAY['frio', 'caliente']::TEXT[], TRUE, '', '[]'::JSONB, 16);
INSERT INTO public.productos (categoria_id, carpeta, nombre, sub, jp, precio, temperatura, tags, disponible, descripcion, variantes, orden) VALUES ('cafe', '06-cold-brew', 'Cold Brew', '', '水出し珈琲', 3200, 'frio', ARRAY['frio']::TEXT[], TRUE, 'Café infusionado en frío.', '[]'::JSONB, 17);
INSERT INTO public.productos (categoria_id, carpeta, nombre, sub, jp, precio, temperatura, tags, disponible, descripcion, variantes, orden) VALUES ('cafe', '07-iced-espresso', 'Iced Espresso', '', 'アイスエスプレッソ', 4900, 'frio', ARRAY['frio']::TEXT[], TRUE, 'Combina tu espresso con: Naranja, Tónica o Ginger.', '[]'::JSONB, 18);
INSERT INTO public.productos (categoria_id, carpeta, nombre, sub, jp, precio, temperatura, tags, disponible, descripcion, variantes, orden) VALUES ('otras', '01-chokoreto', 'Chokorēto', '', 'チョコレート', 4800, '', '{}'::TEXT[], TRUE, 'Desde los mejores granos de cacao de la selva amazónica, para disfrutar un chocolate de calidad.', '[]'::JSONB, 19);
INSERT INTO public.productos (categoria_id, carpeta, nombre, sub, jp, precio, temperatura, tags, disponible, descripcion, variantes, orden) VALUES ('otras', '02-hojicha-latte', 'Hojicha Latte', '', 'ほうじ茶', 3800, 'ambos', ARRAY['frio', 'caliente']::TEXT[], TRUE, 'Cuando se trata de poca cafeína, té con un aroma ahumado y a nuez.', '[]'::JSONB, 20);
INSERT INTO public.productos (categoria_id, carpeta, nombre, sub, jp, precio, temperatura, tags, disponible, descripcion, variantes, orden) VALUES ('otras', '03-masala-chai-latte', 'Masala Chai Latte', '', 'マサラチャイ', 3800, 'ambos', ARRAY['frio', 'caliente']::TEXT[], TRUE, 'Bebida de origen indio a base de té negro y especias.', '[]'::JSONB, 21);
INSERT INTO public.productos (categoria_id, carpeta, nombre, sub, jp, precio, temperatura, tags, disponible, descripcion, variantes, orden) VALUES ('otras', '04-sencha', 'Sencha', '', '煎茶', 2500, 'caliente', ARRAY['caliente']::TEXT[], TRUE, 'El té de todos los días en Japón, herbáceo y fresco.', '[]'::JSONB, 22);
INSERT INTO public.productos (categoria_id, carpeta, nombre, sub, jp, precio, temperatura, tags, disponible, descripcion, variantes, orden) VALUES ('otras', '05-rooibos', 'Rooibos', '', 'ルイボス', 2500, 'ambos', ARRAY['frio', 'caliente']::TEXT[], TRUE, 'Infusión sudafricana de sabor suave, dulce y reconfortante.', '[]'::JSONB, 23);
INSERT INTO public.productos (categoria_id, carpeta, nombre, sub, jp, precio, temperatura, tags, disponible, descripcion, variantes, orden) VALUES ('otras', '06-jugos-naturales', 'Jugos Naturales', '', 'ジュース', 4200, '', '{}'::TEXT[], TRUE, '', '[]'::JSONB, 24);
INSERT INTO public.productos (categoria_id, carpeta, nombre, sub, jp, precio, temperatura, tags, disponible, descripcion, variantes, orden) VALUES ('otras', '07-kohi', 'Kohi', '', 'コーヒー', 3900, '', '{}'::TEXT[], TRUE, '', '[]'::JSONB, 25);
INSERT INTO public.productos (categoria_id, carpeta, nombre, sub, jp, precio, temperatura, tags, disponible, descripcion, variantes, orden) VALUES ('otras', '08-ginger', 'Ginger', 'Chai u Original', 'ジンジャー', 3500, '', '{}'::TEXT[], TRUE, 'Opciones: Chai y Original.', '[]'::JSONB, 26);
INSERT INTO public.productos (categoria_id, carpeta, nombre, sub, jp, precio, temperatura, tags, disponible, descripcion, variantes, orden) VALUES ('sandos', '01-pulled-beef', 'Pulled Beef', '', '牛肉サンド', 9900, '', '{}'::TEXT[], TRUE, 'Pan de leche, Carne de Ternera Deshilachada, Coleslaw Tencha.', '[]'::JSONB, 27);
INSERT INTO public.productos (categoria_id, carpeta, nombre, sub, jp, precio, temperatura, tags, disponible, descripcion, variantes, orden) VALUES ('sandos', '02-pulled-pork', 'Pulled Pork', '', '豚肉サンド', 8900, '', '{}'::TEXT[], TRUE, 'Pan de leche, Carne de Cerdo Deshilachado, Coleslaw Tencha.', '[]'::JSONB, 28);
INSERT INTO public.productos (categoria_id, carpeta, nombre, sub, jp, precio, temperatura, tags, disponible, descripcion, variantes, orden) VALUES ('sandos', '03-tamago', 'Tamago', '', '卵サンド', 6900, '', '{}'::TEXT[], TRUE, 'Pan de Leche, Huevo, Mayonesa Kewpie y Cebollín.', '[]'::JSONB, 29);
INSERT INTO public.productos (categoria_id, carpeta, nombre, sub, jp, precio, temperatura, tags, disponible, descripcion, variantes, orden) VALUES ('sandos', '04-pan-de-queso', 'Pan de Queso', '', 'チーズパン', 4500, '', '{}'::TEXT[], TRUE, '', '[]'::JSONB, 30);
INSERT INTO public.productos (categoria_id, carpeta, nombre, sub, jp, precio, temperatura, tags, disponible, descripcion, variantes, orden) VALUES ('yakigashi', '01-bombones-de-chocolate', 'Bombones de Chocolate', '', 'ボンボン', 4900, '', '{}'::TEXT[], TRUE, '', '[]'::JSONB, 31);
INSERT INTO public.productos (categoria_id, carpeta, nombre, sub, jp, precio, temperatura, tags, disponible, descripcion, variantes, orden) VALUES ('yakigashi', '02-cheesecake', 'Cheesecake', '', 'チーズケーキ', 4900, '', '{}'::TEXT[], TRUE, '', '[]'::JSONB, 32);
INSERT INTO public.productos (categoria_id, carpeta, nombre, sub, jp, precio, temperatura, tags, disponible, descripcion, variantes, orden) VALUES ('yakigashi', '03-blondie', 'Blondie', '', 'ブロンディ', 3600, '', '{}'::TEXT[], TRUE, '', '[]'::JSONB, 33);
INSERT INTO public.productos (categoria_id, carpeta, nombre, sub, jp, precio, temperatura, tags, disponible, descripcion, variantes, orden) VALUES ('yakigashi', '04-cookie', 'Cookie', '', 'クッキー', 2900, '', '{}'::TEXT[], TRUE, '', '[{"nombre": "2 unidades por", "precio": 5000}]'::JSONB, 34);
INSERT INTO public.productos (categoria_id, carpeta, nombre, sub, jp, precio, temperatura, tags, disponible, descripcion, variantes, orden) VALUES ('yakigashi', '05-mochis', 'Mochis', '', '餅', 2900, '', '{}'::TEXT[], TRUE, '', '[{"nombre": "3 unidades por", "precio": 7900}]'::JSONB, 35);
INSERT INTO public.productos (categoria_id, carpeta, nombre, sub, jp, precio, temperatura, tags, disponible, descripcion, variantes, orden) VALUES ('yakigashi', '06-muffin', 'Muffin', '', 'マフィン', 2900, '', '{}'::TEXT[], TRUE, '', '[]'::JSONB, 36);
INSERT INTO public.productos (categoria_id, carpeta, nombre, sub, jp, precio, temperatura, tags, disponible, descripcion, variantes, orden) VALUES ('yakigashi', '07-canele', 'Canelé', '', 'カヌレ', 2900, '', '{}'::TEXT[], TRUE, '', '[]'::JSONB, 37);
INSERT INTO public.productos (categoria_id, carpeta, nombre, sub, jp, precio, temperatura, tags, disponible, descripcion, variantes, orden) VALUES ('yakigashi', '08-conchocolates', 'Conchocolate', '', 'チョコレート', 8900, '', '{}'::TEXT[], TRUE, '', '[]'::JSONB, 38);
INSERT INTO public.recomendados (nombre, sub, jp, precio, temperatura, tags, disponible, descripcion, carpeta, tiene_video, orden) VALUES ('Kabocha Latte', 'Edición especial', '南瓜', 4800, 'caliente', ARRAY['caliente']::TEXT[], TRUE, 'Kabocha squash asada y especiada con leche vaporizada y el toque justo de dulzor.

Ingredientes:
• Puré de zapallo kabocha asado
• Canela, jengibre y nuez moscada
• Leche a elección', 'productos/recomendados/1', TRUE, 1);
INSERT INTO public.recomendados (nombre, sub, jp, precio, temperatura, tags, disponible, descripcion, carpeta, tiene_video, orden) VALUES ('Ube Matcha Latte', 'Leche entera o vegetal', '紅芋', 5200, 'ambos', ARRAY['frio', 'caliente']::TEXT[], TRUE, 'Combinación perfecta con el tubérculo dulce y avainillado. (Ube, Matcha, Leche Entera o Vegetal)', 'productos/02-creaciones-de-matcha/03-ube-matcha-latte', FALSE, 2);
INSERT INTO public.recomendados (nombre, sub, jp, precio, temperatura, tags, disponible, descripcion, carpeta, tiene_video, orden) VALUES ('Yuzu Coco', '', '柚子', 5500, 'ambos', ARRAY['frio', 'caliente']::TEXT[], TRUE, 'Matcha, Leche de Coco y Yuzu.', 'productos/02-creaciones-de-matcha/01-yuzu-coco', FALSE, 3);