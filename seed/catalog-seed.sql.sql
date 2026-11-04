-- PC Builder Store demo catalog seed (150 products)

-- Idempotent: safe to re-run. Prices/stock are DEMO values, not live retailer data.

-- Target: PostgreSQL after applying the approved 35-table migration.

BEGIN;


INSERT INTO product_types (type_code, type_name, description, is_build_component, is_active)
VALUES
('ACCESSORY', 'Accessory', 'Seeded product type', FALSE, TRUE),
('CASE', 'PC Case', 'Seeded product type', TRUE, TRUE),
('COOLER', 'CPU Cooler', 'Seeded product type', TRUE, TRUE),
('CPU', 'Processor', 'Seeded product type', TRUE, TRUE),
('GPU', 'Graphics Card', 'Seeded product type', TRUE, TRUE),
('MOTHERBOARD', 'Motherboard', 'Seeded product type', TRUE, TRUE),
('PC', 'Complete PC', 'Seeded product type', FALSE, TRUE),
('PSU', 'Power Supply', 'Seeded product type', TRUE, TRUE),
('RAM', 'Memory', 'Seeded product type', TRUE, TRUE),
('STORAGE', 'Storage', 'Seeded product type', TRUE, TRUE)ON CONFLICT (type_code) DO UPDATE SET
 type_name=EXCLUDED.type_name, is_active=TRUE;


INSERT INTO categories (category_code, category_name, description, is_active)
VALUES
('ACCESSORY', 'Phụ kiện', 'Danh mục demo catalog PC Builder Store', TRUE),
('CASE', 'Vỏ case', 'Danh mục demo catalog PC Builder Store', TRUE),
('COOLER', 'Tản nhiệt CPU', 'Danh mục demo catalog PC Builder Store', TRUE),
('CPU', 'CPU', 'Danh mục demo catalog PC Builder Store', TRUE),
('GPU', 'Card đồ họa', 'Danh mục demo catalog PC Builder Store', TRUE),
('MAINBOARD', 'Bo mạch chủ', 'Danh mục demo catalog PC Builder Store', TRUE),
('PREBUILT_PC', 'PC lắp sẵn', 'Danh mục demo catalog PC Builder Store', TRUE),
('PSU', 'Nguồn máy tính', 'Danh mục demo catalog PC Builder Store', TRUE),
('RAM', 'RAM', 'Danh mục demo catalog PC Builder Store', TRUE),
('STORAGE', 'Ổ cứng / SSD', 'Danh mục demo catalog PC Builder Store', TRUE)ON CONFLICT (category_code) DO UPDATE SET
 category_name=EXCLUDED.category_name, is_active=TRUE;


INSERT INTO brands (brand_name, is_active)
VALUES
('ADATA', TRUE),
('AMD', TRUE),
('AOC', TRUE),
('ASRock', TRUE),
('ASUS', TRUE),
('AULA', TRUE),
('Antec', TRUE),
('Arctic', TRUE),
('Cooler Master', TRUE),
('Corsair', TRUE),
('Crucial', TRUE),
('DeepCool', TRUE),
('FSP', TRUE),
('Fractal Design', TRUE),
('G.Skill', TRUE),
('Gigabyte', TRUE),
('HyperX', TRUE),
('ID-Cooling', TRUE),
('Intel', TRUE),
('Keychron', TRUE),
('Kingston', TRUE),
('Lexar', TRUE),
('Lian Li', TRUE),
('Logitech', TRUE),
('MSI', TRUE),
('Montech', TRUE),
('NZXT', TRUE),
('Noctua', TRUE),
('PC Builder', TRUE),
('Patriot', TRUE),
('PowerColor', TRUE),
('Razer', TRUE),
('Samsung', TRUE),
('Sapphire', TRUE),
('Seagate', TRUE),
('Seasonic', TRUE),
('TeamGroup', TRUE),
('Thermalright', TRUE),
('Thermaltake', TRUE),
('WD', TRUE),
('Zotac', TRUE)ON CONFLICT (brand_name) DO UPDATE SET is_active=TRUE;

INSERT INTO product_attribute_definitions
 (product_type_id, attribute_code, attribute_name, data_type, unit, is_filterable, is_build_critical)
SELECT pt.product_type_id, 'accessory_type', 'Accessory Type', 'TEXT', NULL, FALSE, FALSE
FROM product_types pt WHERE pt.type_code='ACCESSORY'
ON CONFLICT (product_type_id, attribute_code) DO UPDATE SET
 attribute_name=EXCLUDED.attribute_name,
 data_type=EXCLUDED.data_type,
 unit=EXCLUDED.unit,
 is_filterable=EXCLUDED.is_filterable,
 is_build_critical=EXCLUDED.is_build_critical;

INSERT INTO product_attribute_definitions
 (product_type_id, attribute_code, attribute_name, data_type, unit, is_filterable, is_build_critical)
SELECT pt.product_type_id, 'max_cooler_height_mm', 'Max Cooler Height Mm', 'INTEGER', 'mm', FALSE, TRUE
FROM product_types pt WHERE pt.type_code='CASE'
ON CONFLICT (product_type_id, attribute_code) DO UPDATE SET
 attribute_name=EXCLUDED.attribute_name,
 data_type=EXCLUDED.data_type,
 unit=EXCLUDED.unit,
 is_filterable=EXCLUDED.is_filterable,
 is_build_critical=EXCLUDED.is_build_critical;

INSERT INTO product_attribute_definitions
 (product_type_id, attribute_code, attribute_name, data_type, unit, is_filterable, is_build_critical)
SELECT pt.product_type_id, 'max_gpu_length_mm', 'Max Gpu Length Mm', 'INTEGER', 'mm', FALSE, TRUE
FROM product_types pt WHERE pt.type_code='CASE'
ON CONFLICT (product_type_id, attribute_code) DO UPDATE SET
 attribute_name=EXCLUDED.attribute_name,
 data_type=EXCLUDED.data_type,
 unit=EXCLUDED.unit,
 is_filterable=EXCLUDED.is_filterable,
 is_build_critical=EXCLUDED.is_build_critical;

INSERT INTO product_attribute_definitions
 (product_type_id, attribute_code, attribute_name, data_type, unit, is_filterable, is_build_critical)
SELECT pt.product_type_id, 'motherboard_form_factors', 'Motherboard Form Factors', 'JSON', NULL, FALSE, TRUE
FROM product_types pt WHERE pt.type_code='CASE'
ON CONFLICT (product_type_id, attribute_code) DO UPDATE SET
 attribute_name=EXCLUDED.attribute_name,
 data_type=EXCLUDED.data_type,
 unit=EXCLUDED.unit,
 is_filterable=EXCLUDED.is_filterable,
 is_build_critical=EXCLUDED.is_build_critical;

INSERT INTO product_attribute_definitions
 (product_type_id, attribute_code, attribute_name, data_type, unit, is_filterable, is_build_critical)
SELECT pt.product_type_id, 'cooler_height_mm', 'Cooler Height Mm', 'INTEGER', 'mm', FALSE, TRUE
FROM product_types pt WHERE pt.type_code='COOLER'
ON CONFLICT (product_type_id, attribute_code) DO UPDATE SET
 attribute_name=EXCLUDED.attribute_name,
 data_type=EXCLUDED.data_type,
 unit=EXCLUDED.unit,
 is_filterable=EXCLUDED.is_filterable,
 is_build_critical=EXCLUDED.is_build_critical;

INSERT INTO product_attribute_definitions
 (product_type_id, attribute_code, attribute_name, data_type, unit, is_filterable, is_build_critical)
SELECT pt.product_type_id, 'supported_sockets', 'Supported Sockets', 'JSON', NULL, FALSE, TRUE
FROM product_types pt WHERE pt.type_code='COOLER'
ON CONFLICT (product_type_id, attribute_code) DO UPDATE SET
 attribute_name=EXCLUDED.attribute_name,
 data_type=EXCLUDED.data_type,
 unit=EXCLUDED.unit,
 is_filterable=EXCLUDED.is_filterable,
 is_build_critical=EXCLUDED.is_build_critical;

INSERT INTO product_attribute_definitions
 (product_type_id, attribute_code, attribute_name, data_type, unit, is_filterable, is_build_critical)
SELECT pt.product_type_id, 'core_count', 'Core Count', 'INTEGER', 'cores', TRUE, FALSE
FROM product_types pt WHERE pt.type_code='CPU'
ON CONFLICT (product_type_id, attribute_code) DO UPDATE SET
 attribute_name=EXCLUDED.attribute_name,
 data_type=EXCLUDED.data_type,
 unit=EXCLUDED.unit,
 is_filterable=EXCLUDED.is_filterable,
 is_build_critical=EXCLUDED.is_build_critical;

INSERT INTO product_attribute_definitions
 (product_type_id, attribute_code, attribute_name, data_type, unit, is_filterable, is_build_critical)
SELECT pt.product_type_id, 'socket', 'Socket', 'TEXT', NULL, TRUE, TRUE
FROM product_types pt WHERE pt.type_code='CPU'
ON CONFLICT (product_type_id, attribute_code) DO UPDATE SET
 attribute_name=EXCLUDED.attribute_name,
 data_type=EXCLUDED.data_type,
 unit=EXCLUDED.unit,
 is_filterable=EXCLUDED.is_filterable,
 is_build_critical=EXCLUDED.is_build_critical;

INSERT INTO product_attribute_definitions
 (product_type_id, attribute_code, attribute_name, data_type, unit, is_filterable, is_build_critical)
SELECT pt.product_type_id, 'tdp_watt', 'Tdp Watt', 'INTEGER', 'W', FALSE, FALSE
FROM product_types pt WHERE pt.type_code='CPU'
ON CONFLICT (product_type_id, attribute_code) DO UPDATE SET
 attribute_name=EXCLUDED.attribute_name,
 data_type=EXCLUDED.data_type,
 unit=EXCLUDED.unit,
 is_filterable=EXCLUDED.is_filterable,
 is_build_critical=EXCLUDED.is_build_critical;

INSERT INTO product_attribute_definitions
 (product_type_id, attribute_code, attribute_name, data_type, unit, is_filterable, is_build_critical)
SELECT pt.product_type_id, 'thread_count', 'Thread Count', 'INTEGER', 'threads', TRUE, FALSE
FROM product_types pt WHERE pt.type_code='CPU'
ON CONFLICT (product_type_id, attribute_code) DO UPDATE SET
 attribute_name=EXCLUDED.attribute_name,
 data_type=EXCLUDED.data_type,
 unit=EXCLUDED.unit,
 is_filterable=EXCLUDED.is_filterable,
 is_build_critical=EXCLUDED.is_build_critical;

INSERT INTO product_attribute_definitions
 (product_type_id, attribute_code, attribute_name, data_type, unit, is_filterable, is_build_critical)
SELECT pt.product_type_id, 'vram_gb', 'Vram Gb', 'INTEGER', 'GB', TRUE, FALSE
FROM product_types pt WHERE pt.type_code='GPU'
ON CONFLICT (product_type_id, attribute_code) DO UPDATE SET
 attribute_name=EXCLUDED.attribute_name,
 data_type=EXCLUDED.data_type,
 unit=EXCLUDED.unit,
 is_filterable=EXCLUDED.is_filterable,
 is_build_critical=EXCLUDED.is_build_critical;

INSERT INTO product_attribute_definitions
 (product_type_id, attribute_code, attribute_name, data_type, unit, is_filterable, is_build_critical)
SELECT pt.product_type_id, 'form_factor', 'Form Factor', 'TEXT', NULL, TRUE, TRUE
FROM product_types pt WHERE pt.type_code='MOTHERBOARD'
ON CONFLICT (product_type_id, attribute_code) DO UPDATE SET
 attribute_name=EXCLUDED.attribute_name,
 data_type=EXCLUDED.data_type,
 unit=EXCLUDED.unit,
 is_filterable=EXCLUDED.is_filterable,
 is_build_critical=EXCLUDED.is_build_critical;

INSERT INTO product_attribute_definitions
 (product_type_id, attribute_code, attribute_name, data_type, unit, is_filterable, is_build_critical)
SELECT pt.product_type_id, 'memory_type', 'Memory Type', 'TEXT', NULL, TRUE, TRUE
FROM product_types pt WHERE pt.type_code='MOTHERBOARD'
ON CONFLICT (product_type_id, attribute_code) DO UPDATE SET
 attribute_name=EXCLUDED.attribute_name,
 data_type=EXCLUDED.data_type,
 unit=EXCLUDED.unit,
 is_filterable=EXCLUDED.is_filterable,
 is_build_critical=EXCLUDED.is_build_critical;

INSERT INTO product_attribute_definitions
 (product_type_id, attribute_code, attribute_name, data_type, unit, is_filterable, is_build_critical)
SELECT pt.product_type_id, 'socket', 'Socket', 'TEXT', NULL, TRUE, TRUE
FROM product_types pt WHERE pt.type_code='MOTHERBOARD'
ON CONFLICT (product_type_id, attribute_code) DO UPDATE SET
 attribute_name=EXCLUDED.attribute_name,
 data_type=EXCLUDED.data_type,
 unit=EXCLUDED.unit,
 is_filterable=EXCLUDED.is_filterable,
 is_build_critical=EXCLUDED.is_build_critical;

INSERT INTO product_attribute_definitions
 (product_type_id, attribute_code, attribute_name, data_type, unit, is_filterable, is_build_critical)
SELECT pt.product_type_id, 'bom_status', 'Bom Status', 'TEXT', NULL, FALSE, FALSE
FROM product_types pt WHERE pt.type_code='PC'
ON CONFLICT (product_type_id, attribute_code) DO UPDATE SET
 attribute_name=EXCLUDED.attribute_name,
 data_type=EXCLUDED.data_type,
 unit=EXCLUDED.unit,
 is_filterable=EXCLUDED.is_filterable,
 is_build_critical=EXCLUDED.is_build_critical;

INSERT INTO product_attribute_definitions
 (product_type_id, attribute_code, attribute_name, data_type, unit, is_filterable, is_build_critical)
SELECT pt.product_type_id, 'configuration_summary', 'Configuration Summary', 'JSON', NULL, FALSE, FALSE
FROM product_types pt WHERE pt.type_code='PC'
ON CONFLICT (product_type_id, attribute_code) DO UPDATE SET
 attribute_name=EXCLUDED.attribute_name,
 data_type=EXCLUDED.data_type,
 unit=EXCLUDED.unit,
 is_filterable=EXCLUDED.is_filterable,
 is_build_critical=EXCLUDED.is_build_critical;

INSERT INTO product_attribute_definitions
 (product_type_id, attribute_code, attribute_name, data_type, unit, is_filterable, is_build_critical)
SELECT pt.product_type_id, 'efficiency_rating', 'Efficiency Rating', 'TEXT', NULL, TRUE, FALSE
FROM product_types pt WHERE pt.type_code='PSU'
ON CONFLICT (product_type_id, attribute_code) DO UPDATE SET
 attribute_name=EXCLUDED.attribute_name,
 data_type=EXCLUDED.data_type,
 unit=EXCLUDED.unit,
 is_filterable=EXCLUDED.is_filterable,
 is_build_critical=EXCLUDED.is_build_critical;

INSERT INTO product_attribute_definitions
 (product_type_id, attribute_code, attribute_name, data_type, unit, is_filterable, is_build_critical)
SELECT pt.product_type_id, 'modularity', 'Modularity', 'TEXT', NULL, TRUE, FALSE
FROM product_types pt WHERE pt.type_code='PSU'
ON CONFLICT (product_type_id, attribute_code) DO UPDATE SET
 attribute_name=EXCLUDED.attribute_name,
 data_type=EXCLUDED.data_type,
 unit=EXCLUDED.unit,
 is_filterable=EXCLUDED.is_filterable,
 is_build_critical=EXCLUDED.is_build_critical;

INSERT INTO product_attribute_definitions
 (product_type_id, attribute_code, attribute_name, data_type, unit, is_filterable, is_build_critical)
SELECT pt.product_type_id, 'wattage', 'Wattage', 'INTEGER', 'W', TRUE, TRUE
FROM product_types pt WHERE pt.type_code='PSU'
ON CONFLICT (product_type_id, attribute_code) DO UPDATE SET
 attribute_name=EXCLUDED.attribute_name,
 data_type=EXCLUDED.data_type,
 unit=EXCLUDED.unit,
 is_filterable=EXCLUDED.is_filterable,
 is_build_critical=EXCLUDED.is_build_critical;

INSERT INTO product_attribute_definitions
 (product_type_id, attribute_code, attribute_name, data_type, unit, is_filterable, is_build_critical)
SELECT pt.product_type_id, 'capacity_gb', 'Capacity Gb', 'INTEGER', 'GB', TRUE, FALSE
FROM product_types pt WHERE pt.type_code='RAM'
ON CONFLICT (product_type_id, attribute_code) DO UPDATE SET
 attribute_name=EXCLUDED.attribute_name,
 data_type=EXCLUDED.data_type,
 unit=EXCLUDED.unit,
 is_filterable=EXCLUDED.is_filterable,
 is_build_critical=EXCLUDED.is_build_critical;

INSERT INTO product_attribute_definitions
 (product_type_id, attribute_code, attribute_name, data_type, unit, is_filterable, is_build_critical)
SELECT pt.product_type_id, 'memory_type', 'Memory Type', 'TEXT', NULL, TRUE, TRUE
FROM product_types pt WHERE pt.type_code='RAM'
ON CONFLICT (product_type_id, attribute_code) DO UPDATE SET
 attribute_name=EXCLUDED.attribute_name,
 data_type=EXCLUDED.data_type,
 unit=EXCLUDED.unit,
 is_filterable=EXCLUDED.is_filterable,
 is_build_critical=EXCLUDED.is_build_critical;

INSERT INTO product_attribute_definitions
 (product_type_id, attribute_code, attribute_name, data_type, unit, is_filterable, is_build_critical)
SELECT pt.product_type_id, 'speed_mhz', 'Speed Mhz', 'INTEGER', 'MHz', TRUE, FALSE
FROM product_types pt WHERE pt.type_code='RAM'
ON CONFLICT (product_type_id, attribute_code) DO UPDATE SET
 attribute_name=EXCLUDED.attribute_name,
 data_type=EXCLUDED.data_type,
 unit=EXCLUDED.unit,
 is_filterable=EXCLUDED.is_filterable,
 is_build_critical=EXCLUDED.is_build_critical;

INSERT INTO product_attribute_definitions
 (product_type_id, attribute_code, attribute_name, data_type, unit, is_filterable, is_build_critical)
SELECT pt.product_type_id, 'capacity_gb', 'Capacity Gb', 'INTEGER', 'GB', TRUE, FALSE
FROM product_types pt WHERE pt.type_code='STORAGE'
ON CONFLICT (product_type_id, attribute_code) DO UPDATE SET
 attribute_name=EXCLUDED.attribute_name,
 data_type=EXCLUDED.data_type,
 unit=EXCLUDED.unit,
 is_filterable=EXCLUDED.is_filterable,
 is_build_critical=EXCLUDED.is_build_critical;

INSERT INTO product_attribute_definitions
 (product_type_id, attribute_code, attribute_name, data_type, unit, is_filterable, is_build_critical)
SELECT pt.product_type_id, 'form_factor', 'Form Factor', 'TEXT', NULL, TRUE, TRUE
FROM product_types pt WHERE pt.type_code='STORAGE'
ON CONFLICT (product_type_id, attribute_code) DO UPDATE SET
 attribute_name=EXCLUDED.attribute_name,
 data_type=EXCLUDED.data_type,
 unit=EXCLUDED.unit,
 is_filterable=EXCLUDED.is_filterable,
 is_build_critical=EXCLUDED.is_build_critical;

INSERT INTO product_attribute_definitions
 (product_type_id, attribute_code, attribute_name, data_type, unit, is_filterable, is_build_critical)
SELECT pt.product_type_id, 'interface', 'Interface', 'TEXT', NULL, TRUE, TRUE
FROM product_types pt WHERE pt.type_code='STORAGE'
ON CONFLICT (product_type_id, attribute_code) DO UPDATE SET
 attribute_name=EXCLUDED.attribute_name,
 data_type=EXCLUDED.data_type,
 unit=EXCLUDED.unit,
 is_filterable=EXCLUDED.is_filterable,
 is_build_critical=EXCLUDED.is_build_critical;

INSERT INTO products
 (product_type_id, category_id, brand_id, model_code, product_name, short_description, description, product_status)
SELECT pt.product_type_id, c.category_id, b.brand_id, 'BX8071512100F', 'Core i3-12100F',
       'Core i3-12100F - catalog tham khảo PC Builder Store.', 'Nguồn tham khảo: https://www.intel.com/content/www/us/en/products/details/processors/core.html',
       'ACTIVE'
FROM product_types pt
JOIN categories c ON c.category_code='CPU'
LEFT JOIN brands b ON b.brand_name='Intel'
WHERE pt.type_code='CPU'
ON CONFLICT (model_code) DO UPDATE SET
 product_type_id=EXCLUDED.product_type_id,
 category_id=EXCLUDED.category_id,
 brand_id=EXCLUDED.brand_id,
 product_name=EXCLUDED.product_name,
 short_description=EXCLUDED.short_description,
 description=EXCLUDED.description,
 product_status='ACTIVE';

INSERT INTO product_offers
 (product_id, offer_code, condition_code, price, currency_code, stock_quantity,
  reserved_quantity, warranty_months, offer_status)
SELECT p.product_id, 'DEMO-BX8071512100F', 'NEW',
       4500000, 'VND',
       5, 0, 36, 'ACTIVE'
FROM products p WHERE p.model_code='BX8071512100F'
ON CONFLICT (offer_code) DO UPDATE SET
 product_id=EXCLUDED.product_id,
 condition_code=EXCLUDED.condition_code,
 price=EXCLUDED.price,
 currency_code=EXCLUDED.currency_code,
 stock_quantity=EXCLUDED.stock_quantity,
 warranty_months=EXCLUDED.warranty_months,
 offer_status='ACTIVE';

INSERT INTO product_attribute_values
 (product_id, attribute_definition_id, value_text)
SELECT p.product_id, ad.attribute_definition_id, 'LGA1700'
FROM products p
JOIN product_types pt ON pt.type_code='CPU'
JOIN product_attribute_definitions ad
 ON ad.product_type_id=pt.product_type_id AND ad.attribute_code='socket'
WHERE p.model_code='BX8071512100F'
ON CONFLICT (product_id, attribute_definition_id) DO UPDATE SET
 value_text=EXCLUDED.value_text, value_decimal=NULL, value_integer=NULL, value_boolean=NULL, value_json=NULL;

INSERT INTO product_attribute_values
 (product_id, attribute_definition_id, value_integer)
SELECT p.product_id, ad.attribute_definition_id, 4
FROM products p
JOIN product_types pt ON pt.type_code='CPU'
JOIN product_attribute_definitions ad
 ON ad.product_type_id=pt.product_type_id AND ad.attribute_code='core_count'
WHERE p.model_code='BX8071512100F'
ON CONFLICT (product_id, attribute_definition_id) DO UPDATE SET
 value_integer=EXCLUDED.value_integer, value_text=NULL, value_decimal=NULL, value_boolean=NULL, value_json=NULL;

INSERT INTO product_attribute_values
 (product_id, attribute_definition_id, value_integer)
SELECT p.product_id, ad.attribute_definition_id, 8
FROM products p
JOIN product_types pt ON pt.type_code='CPU'
JOIN product_attribute_definitions ad
 ON ad.product_type_id=pt.product_type_id AND ad.attribute_code='thread_count'
WHERE p.model_code='BX8071512100F'
ON CONFLICT (product_id, attribute_definition_id) DO UPDATE SET
 value_integer=EXCLUDED.value_integer, value_text=NULL, value_decimal=NULL, value_boolean=NULL, value_json=NULL;

INSERT INTO product_attribute_values
 (product_id, attribute_definition_id, value_integer)
SELECT p.product_id, ad.attribute_definition_id, 58
FROM products p
JOIN product_types pt ON pt.type_code='CPU'
JOIN product_attribute_definitions ad
 ON ad.product_type_id=pt.product_type_id AND ad.attribute_code='tdp_watt'
WHERE p.model_code='BX8071512100F'
ON CONFLICT (product_id, attribute_definition_id) DO UPDATE SET
 value_integer=EXCLUDED.value_integer, value_text=NULL, value_decimal=NULL, value_boolean=NULL, value_json=NULL;

INSERT INTO products
 (product_type_id, category_id, brand_id, model_code, product_name, short_description, description, product_status)
SELECT pt.product_type_id, c.category_id, b.brand_id, 'BX8071512400F', 'Core i5-12400F',
       'Core i5-12400F - catalog tham khảo PC Builder Store.', 'Nguồn tham khảo: https://www.intel.com/content/www/us/en/products/details/processors/core.html',
       'ACTIVE'
FROM product_types pt
JOIN categories c ON c.category_code='CPU'
LEFT JOIN brands b ON b.brand_name='Intel'
WHERE pt.type_code='CPU'
ON CONFLICT (model_code) DO UPDATE SET
 product_type_id=EXCLUDED.product_type_id,
 category_id=EXCLUDED.category_id,
 brand_id=EXCLUDED.brand_id,
 product_name=EXCLUDED.product_name,
 short_description=EXCLUDED.short_description,
 description=EXCLUDED.description,
 product_status='ACTIVE';

INSERT INTO product_offers
 (product_id, offer_code, condition_code, price, currency_code, stock_quantity,
  reserved_quantity, warranty_months, offer_status)
SELECT p.product_id, 'DEMO-BX8071512400F', 'NEW',
       4500000, 'VND',
       5, 0, 36, 'ACTIVE'
FROM products p WHERE p.model_code='BX8071512400F'
ON CONFLICT (offer_code) DO UPDATE SET
 product_id=EXCLUDED.product_id,
 condition_code=EXCLUDED.condition_code,
 price=EXCLUDED.price,
 currency_code=EXCLUDED.currency_code,
 stock_quantity=EXCLUDED.stock_quantity,
 warranty_months=EXCLUDED.warranty_months,
 offer_status='ACTIVE';

INSERT INTO product_attribute_values
 (product_id, attribute_definition_id, value_text)
SELECT p.product_id, ad.attribute_definition_id, 'LGA1700'
FROM products p
JOIN product_types pt ON pt.type_code='CPU'
JOIN product_attribute_definitions ad
 ON ad.product_type_id=pt.product_type_id AND ad.attribute_code='socket'
WHERE p.model_code='BX8071512400F'
ON CONFLICT (product_id, attribute_definition_id) DO UPDATE SET
 value_text=EXCLUDED.value_text, value_decimal=NULL, value_integer=NULL, value_boolean=NULL, value_json=NULL;

INSERT INTO product_attribute_values
 (product_id, attribute_definition_id, value_integer)
SELECT p.product_id, ad.attribute_definition_id, 6
FROM products p
JOIN product_types pt ON pt.type_code='CPU'
JOIN product_attribute_definitions ad
 ON ad.product_type_id=pt.product_type_id AND ad.attribute_code='core_count'
WHERE p.model_code='BX8071512400F'
ON CONFLICT (product_id, attribute_definition_id) DO UPDATE SET
 value_integer=EXCLUDED.value_integer, value_text=NULL, value_decimal=NULL, value_boolean=NULL, value_json=NULL;

INSERT INTO product_attribute_values
 (product_id, attribute_definition_id, value_integer)
SELECT p.product_id, ad.attribute_definition_id, 12
FROM products p
JOIN product_types pt ON pt.type_code='CPU'
JOIN product_attribute_definitions ad
 ON ad.product_type_id=pt.product_type_id AND ad.attribute_code='thread_count'
WHERE p.model_code='BX8071512400F'
ON CONFLICT (product_id, attribute_definition_id) DO UPDATE SET
 value_integer=EXCLUDED.value_integer, value_text=NULL, value_decimal=NULL, value_boolean=NULL, value_json=NULL;

INSERT INTO product_attribute_values
 (product_id, attribute_definition_id, value_integer)
SELECT p.product_id, ad.attribute_definition_id, 65
FROM products p
JOIN product_types pt ON pt.type_code='CPU'
JOIN product_attribute_definitions ad
 ON ad.product_type_id=pt.product_type_id AND ad.attribute_code='tdp_watt'
WHERE p.model_code='BX8071512400F'
ON CONFLICT (product_id, attribute_definition_id) DO UPDATE SET
 value_integer=EXCLUDED.value_integer, value_text=NULL, value_decimal=NULL, value_boolean=NULL, value_json=NULL;

INSERT INTO products
 (product_type_id, category_id, brand_id, model_code, product_name, short_description, description, product_status)
SELECT pt.product_type_id, c.category_id, b.brand_id, 'BX8071513400F', 'Core i5-13400F',
       'Core i5-13400F - catalog tham khảo PC Builder Store.', 'Nguồn tham khảo: https://www.intel.com/content/www/us/en/products/details/processors/core.html',
       'ACTIVE'
FROM product_types pt
JOIN categories c ON c.category_code='CPU'
LEFT JOIN brands b ON b.brand_name='Intel'
WHERE pt.type_code='CPU'
ON CONFLICT (model_code) DO UPDATE SET
 product_type_id=EXCLUDED.product_type_id,
 category_id=EXCLUDED.category_id,
 brand_id=EXCLUDED.brand_id,
 product_name=EXCLUDED.product_name,
 short_description=EXCLUDED.short_description,
 description=EXCLUDED.description,
 product_status='ACTIVE';

INSERT INTO product_offers
 (product_id, offer_code, condition_code, price, currency_code, stock_quantity,
  reserved_quantity, warranty_months, offer_status)
SELECT p.product_id, 'DEMO-BX8071513400F', 'NEW',
       4500000, 'VND',
       5, 0, 36, 'ACTIVE'
FROM products p WHERE p.model_code='BX8071513400F'
ON CONFLICT (offer_code) DO UPDATE SET
 product_id=EXCLUDED.product_id,
 condition_code=EXCLUDED.condition_code,
 price=EXCLUDED.price,
 currency_code=EXCLUDED.currency_code,
 stock_quantity=EXCLUDED.stock_quantity,
 warranty_months=EXCLUDED.warranty_months,
 offer_status='ACTIVE';

INSERT INTO product_attribute_values
 (product_id, attribute_definition_id, value_text)
SELECT p.product_id, ad.attribute_definition_id, 'LGA1700'
FROM products p
JOIN product_types pt ON pt.type_code='CPU'
JOIN product_attribute_definitions ad
 ON ad.product_type_id=pt.product_type_id AND ad.attribute_code='socket'
WHERE p.model_code='BX8071513400F'
ON CONFLICT (product_id, attribute_definition_id) DO UPDATE SET
 value_text=EXCLUDED.value_text, value_decimal=NULL, value_integer=NULL, value_boolean=NULL, value_json=NULL;

INSERT INTO product_attribute_values
 (product_id, attribute_definition_id, value_integer)
SELECT p.product_id, ad.attribute_definition_id, 10
FROM products p
JOIN product_types pt ON pt.type_code='CPU'
JOIN product_attribute_definitions ad
 ON ad.product_type_id=pt.product_type_id AND ad.attribute_code='core_count'
WHERE p.model_code='BX8071513400F'
ON CONFLICT (product_id, attribute_definition_id) DO UPDATE SET
 value_integer=EXCLUDED.value_integer, value_text=NULL, value_decimal=NULL, value_boolean=NULL, value_json=NULL;

INSERT INTO product_attribute_values
 (product_id, attribute_definition_id, value_integer)
SELECT p.product_id, ad.attribute_definition_id, 16
FROM products p
JOIN product_types pt ON pt.type_code='CPU'
JOIN product_attribute_definitions ad
 ON ad.product_type_id=pt.product_type_id AND ad.attribute_code='thread_count'
WHERE p.model_code='BX8071513400F'
ON CONFLICT (product_id, attribute_definition_id) DO UPDATE SET
 value_integer=EXCLUDED.value_integer, value_text=NULL, value_decimal=NULL, value_boolean=NULL, value_json=NULL;

INSERT INTO product_attribute_values
 (product_id, attribute_definition_id, value_integer)
SELECT p.product_id, ad.attribute_definition_id, 65
FROM products p
JOIN product_types pt ON pt.type_code='CPU'
JOIN product_attribute_definitions ad
 ON ad.product_type_id=pt.product_type_id AND ad.attribute_code='tdp_watt'
WHERE p.model_code='BX8071513400F'
ON CONFLICT (product_id, attribute_definition_id) DO UPDATE SET
 value_integer=EXCLUDED.value_integer, value_text=NULL, value_decimal=NULL, value_boolean=NULL, value_json=NULL;

INSERT INTO products
 (product_type_id, category_id, brand_id, model_code, product_name, short_description, description, product_status)
SELECT pt.product_type_id, c.category_id, b.brand_id, 'BX8071514400F', 'Core i5-14400F',
       'Core i5-14400F - catalog tham khảo PC Builder Store.', 'Nguồn tham khảo: https://www.intel.vn/content/www/vn/vi/products/sku/236777/intel-core-i5-processor-14400f-20m-cache-up-to-4-70-ghz/specifications.html',
       'ACTIVE'
FROM product_types pt
JOIN categories c ON c.category_code='CPU'
LEFT JOIN brands b ON b.brand_name='Intel'
WHERE pt.type_code='CPU'
ON CONFLICT (model_code) DO UPDATE SET
 product_type_id=EXCLUDED.product_type_id,
 category_id=EXCLUDED.category_id,
 brand_id=EXCLUDED.brand_id,
 product_name=EXCLUDED.product_name,
 short_description=EXCLUDED.short_description,
 description=EXCLUDED.description,
 product_status='ACTIVE';

INSERT INTO product_offers
 (product_id, offer_code, condition_code, price, currency_code, stock_quantity,
  reserved_quantity, warranty_months, offer_status)
SELECT p.product_id, 'DEMO-BX8071514400F', 'NEW',
       4500000, 'VND',
       5, 0, 36, 'ACTIVE'
FROM products p WHERE p.model_code='BX8071514400F'
ON CONFLICT (offer_code) DO UPDATE SET
 product_id=EXCLUDED.product_id,
 condition_code=EXCLUDED.condition_code,
 price=EXCLUDED.price,
 currency_code=EXCLUDED.currency_code,
 stock_quantity=EXCLUDED.stock_quantity,
 warranty_months=EXCLUDED.warranty_months,
 offer_status='ACTIVE';

INSERT INTO product_attribute_values
 (product_id, attribute_definition_id, value_text)
SELECT p.product_id, ad.attribute_definition_id, 'LGA1700'
FROM products p
JOIN product_types pt ON pt.type_code='CPU'
JOIN product_attribute_definitions ad
 ON ad.product_type_id=pt.product_type_id AND ad.attribute_code='socket'
WHERE p.model_code='BX8071514400F'
ON CONFLICT (product_id, attribute_definition_id) DO UPDATE SET
 value_text=EXCLUDED.value_text, value_decimal=NULL, value_integer=NULL, value_boolean=NULL, value_json=NULL;

INSERT INTO product_attribute_values
 (product_id, attribute_definition_id, value_integer)
SELECT p.product_id, ad.attribute_definition_id, 10
FROM products p
JOIN product_types pt ON pt.type_code='CPU'
JOIN product_attribute_definitions ad
 ON ad.product_type_id=pt.product_type_id AND ad.attribute_code='core_count'
WHERE p.model_code='BX8071514400F'
ON CONFLICT (product_id, attribute_definition_id) DO UPDATE SET
 value_integer=EXCLUDED.value_integer, value_text=NULL, value_decimal=NULL, value_boolean=NULL, value_json=NULL;

INSERT INTO product_attribute_values
 (product_id, attribute_definition_id, value_integer)
SELECT p.product_id, ad.attribute_definition_id, 16
FROM products p
JOIN product_types pt ON pt.type_code='CPU'
JOIN product_attribute_definitions ad
 ON ad.product_type_id=pt.product_type_id AND ad.attribute_code='thread_count'
WHERE p.model_code='BX8071514400F'
ON CONFLICT (product_id, attribute_definition_id) DO UPDATE SET
 value_integer=EXCLUDED.value_integer, value_text=NULL, value_decimal=NULL, value_boolean=NULL, value_json=NULL;

INSERT INTO product_attribute_values
 (product_id, attribute_definition_id, value_integer)
SELECT p.product_id, ad.attribute_definition_id, 65
FROM products p
JOIN product_types pt ON pt.type_code='CPU'
JOIN product_attribute_definitions ad
 ON ad.product_type_id=pt.product_type_id AND ad.attribute_code='tdp_watt'
WHERE p.model_code='BX8071514400F'
ON CONFLICT (product_id, attribute_definition_id) DO UPDATE SET
 value_integer=EXCLUDED.value_integer, value_text=NULL, value_decimal=NULL, value_boolean=NULL, value_json=NULL;

INSERT INTO products
 (product_type_id, category_id, brand_id, model_code, product_name, short_description, description, product_status)
SELECT pt.product_type_id, c.category_id, b.brand_id, 'BX8071514500', 'Core i5-14500',
       'Core i5-14500 - catalog tham khảo PC Builder Store.', 'Nguồn tham khảo: https://www.intel.com/content/www/us/en/products/details/processors/core.html',
       'ACTIVE'
FROM product_types pt
JOIN categories c ON c.category_code='CPU'
LEFT JOIN brands b ON b.brand_name='Intel'
WHERE pt.type_code='CPU'
ON CONFLICT (model_code) DO UPDATE SET
 product_type_id=EXCLUDED.product_type_id,
 category_id=EXCLUDED.category_id,
 brand_id=EXCLUDED.brand_id,
 product_name=EXCLUDED.product_name,
 short_description=EXCLUDED.short_description,
 description=EXCLUDED.description,
 product_status='ACTIVE';

INSERT INTO product_offers
 (product_id, offer_code, condition_code, price, currency_code, stock_quantity,
  reserved_quantity, warranty_months, offer_status)
SELECT p.product_id, 'DEMO-BX8071514500', 'NEW',
       4500000, 'VND',
       5, 0, 36, 'ACTIVE'
FROM products p WHERE p.model_code='BX8071514500'
ON CONFLICT (offer_code) DO UPDATE SET
 product_id=EXCLUDED.product_id,
 condition_code=EXCLUDED.condition_code,
 price=EXCLUDED.price,
 currency_code=EXCLUDED.currency_code,
 stock_quantity=EXCLUDED.stock_quantity,
 warranty_months=EXCLUDED.warranty_months,
 offer_status='ACTIVE';

INSERT INTO product_attribute_values
 (product_id, attribute_definition_id, value_text)
SELECT p.product_id, ad.attribute_definition_id, 'LGA1700'
FROM products p
JOIN product_types pt ON pt.type_code='CPU'
JOIN product_attribute_definitions ad
 ON ad.product_type_id=pt.product_type_id AND ad.attribute_code='socket'
WHERE p.model_code='BX8071514500'
ON CONFLICT (product_id, attribute_definition_id) DO UPDATE SET
 value_text=EXCLUDED.value_text, value_decimal=NULL, value_integer=NULL, value_boolean=NULL, value_json=NULL;

INSERT INTO product_attribute_values
 (product_id, attribute_definition_id, value_integer)
SELECT p.product_id, ad.attribute_definition_id, 14
FROM products p
JOIN product_types pt ON pt.type_code='CPU'
JOIN product_attribute_definitions ad
 ON ad.product_type_id=pt.product_type_id AND ad.attribute_code='core_count'
WHERE p.model_code='BX8071514500'
ON CONFLICT (product_id, attribute_definition_id) DO UPDATE SET
 value_integer=EXCLUDED.value_integer, value_text=NULL, value_decimal=NULL, value_boolean=NULL, value_json=NULL;

INSERT INTO product_attribute_values
 (product_id, attribute_definition_id, value_integer)
SELECT p.product_id, ad.attribute_definition_id, 20
FROM products p
JOIN product_types pt ON pt.type_code='CPU'
JOIN product_attribute_definitions ad
 ON ad.product_type_id=pt.product_type_id AND ad.attribute_code='thread_count'
WHERE p.model_code='BX8071514500'
ON CONFLICT (product_id, attribute_definition_id) DO UPDATE SET
 value_integer=EXCLUDED.value_integer, value_text=NULL, value_decimal=NULL, value_boolean=NULL, value_json=NULL;

INSERT INTO product_attribute_values
 (product_id, attribute_definition_id, value_integer)
SELECT p.product_id, ad.attribute_definition_id, 65
FROM products p
JOIN product_types pt ON pt.type_code='CPU'
JOIN product_attribute_definitions ad
 ON ad.product_type_id=pt.product_type_id AND ad.attribute_code='tdp_watt'
WHERE p.model_code='BX8071514500'
ON CONFLICT (product_id, attribute_definition_id) DO UPDATE SET
 value_integer=EXCLUDED.value_integer, value_text=NULL, value_decimal=NULL, value_boolean=NULL, value_json=NULL;

INSERT INTO products
 (product_type_id, category_id, brand_id, model_code, product_name, short_description, description, product_status)
SELECT pt.product_type_id, c.category_id, b.brand_id, 'BX8071514600K', 'Core i5-14600K',
       'Core i5-14600K - catalog tham khảo PC Builder Store.', 'Nguồn tham khảo: https://www.intel.com/content/www/us/en/products/details/processors/core.html',
       'ACTIVE'
FROM product_types pt
JOIN categories c ON c.category_code='CPU'
LEFT JOIN brands b ON b.brand_name='Intel'
WHERE pt.type_code='CPU'
ON CONFLICT (model_code) DO UPDATE SET
 product_type_id=EXCLUDED.product_type_id,
 category_id=EXCLUDED.category_id,
 brand_id=EXCLUDED.brand_id,
 product_name=EXCLUDED.product_name,
 short_description=EXCLUDED.short_description,
 description=EXCLUDED.description,
 product_status='ACTIVE';

INSERT INTO product_offers
 (product_id, offer_code, condition_code, price, currency_code, stock_quantity,
  reserved_quantity, warranty_months, offer_status)
SELECT p.product_id, 'DEMO-BX8071514600K', 'NEW',
       4500000, 'VND',
       5, 0, 36, 'ACTIVE'
FROM products p WHERE p.model_code='BX8071514600K'
ON CONFLICT (offer_code) DO UPDATE SET
 product_id=EXCLUDED.product_id,
 condition_code=EXCLUDED.condition_code,
 price=EXCLUDED.price,
 currency_code=EXCLUDED.currency_code,
 stock_quantity=EXCLUDED.stock_quantity,
 warranty_months=EXCLUDED.warranty_months,
 offer_status='ACTIVE';

INSERT INTO product_attribute_values
 (product_id, attribute_definition_id, value_text)
SELECT p.product_id, ad.attribute_definition_id, 'LGA1700'
FROM products p
JOIN product_types pt ON pt.type_code='CPU'
JOIN product_attribute_definitions ad
 ON ad.product_type_id=pt.product_type_id AND ad.attribute_code='socket'
WHERE p.model_code='BX8071514600K'
ON CONFLICT (product_id, attribute_definition_id) DO UPDATE SET
 value_text=EXCLUDED.value_text, value_decimal=NULL, value_integer=NULL, value_boolean=NULL, value_json=NULL;

INSERT INTO product_attribute_values
 (product_id, attribute_definition_id, value_integer)
SELECT p.product_id, ad.attribute_definition_id, 14
FROM products p
JOIN product_types pt ON pt.type_code='CPU'
JOIN product_attribute_definitions ad
 ON ad.product_type_id=pt.product_type_id AND ad.attribute_code='core_count'
WHERE p.model_code='BX8071514600K'
ON CONFLICT (product_id, attribute_definition_id) DO UPDATE SET
 value_integer=EXCLUDED.value_integer, value_text=NULL, value_decimal=NULL, value_boolean=NULL, value_json=NULL;

INSERT INTO product_attribute_values
 (product_id, attribute_definition_id, value_integer)
SELECT p.product_id, ad.attribute_definition_id, 20
FROM products p
JOIN product_types pt ON pt.type_code='CPU'
JOIN product_attribute_definitions ad
 ON ad.product_type_id=pt.product_type_id AND ad.attribute_code='thread_count'
WHERE p.model_code='BX8071514600K'
ON CONFLICT (product_id, attribute_definition_id) DO UPDATE SET
 value_integer=EXCLUDED.value_integer, value_text=NULL, value_decimal=NULL, value_boolean=NULL, value_json=NULL;

INSERT INTO product_attribute_values
 (product_id, attribute_definition_id, value_integer)
SELECT p.product_id, ad.attribute_definition_id, 125
FROM products p
JOIN product_types pt ON pt.type_code='CPU'
JOIN product_attribute_definitions ad
 ON ad.product_type_id=pt.product_type_id AND ad.attribute_code='tdp_watt'
WHERE p.model_code='BX8071514600K'
ON CONFLICT (product_id, attribute_definition_id) DO UPDATE SET
 value_integer=EXCLUDED.value_integer, value_text=NULL, value_decimal=NULL, value_boolean=NULL, value_json=NULL;

INSERT INTO products
 (product_type_id, category_id, brand_id, model_code, product_name, short_description, description, product_status)
SELECT pt.product_type_id, c.category_id, b.brand_id, 'BX8071514600KF', 'Core i5-14600KF',
       'Core i5-14600KF - catalog tham khảo PC Builder Store.', 'Nguồn tham khảo: https://www.intel.com/content/www/us/en/products/details/processors/core.html',
       'ACTIVE'
FROM product_types pt
JOIN categories c ON c.category_code='CPU'
LEFT JOIN brands b ON b.brand_name='Intel'
WHERE pt.type_code='CPU'
ON CONFLICT (model_code) DO UPDATE SET
 product_type_id=EXCLUDED.product_type_id,
 category_id=EXCLUDED.category_id,
 brand_id=EXCLUDED.brand_id,
 product_name=EXCLUDED.product_name,
 short_description=EXCLUDED.short_description,
 description=EXCLUDED.description,
 product_status='ACTIVE';

INSERT INTO product_offers
 (product_id, offer_code, condition_code, price, currency_code, stock_quantity,
  reserved_quantity, warranty_months, offer_status)
SELECT p.product_id, 'DEMO-BX8071514600KF', 'NEW',
       4500000, 'VND',
       5, 0, 36, 'ACTIVE'
FROM products p WHERE p.model_code='BX8071514600KF'
ON CONFLICT (offer_code) DO UPDATE SET
 product_id=EXCLUDED.product_id,
 condition_code=EXCLUDED.condition_code,
 price=EXCLUDED.price,
 currency_code=EXCLUDED.currency_code,
 stock_quantity=EXCLUDED.stock_quantity,
 warranty_months=EXCLUDED.warranty_months,
 offer_status='ACTIVE';

INSERT INTO product_attribute_values
 (product_id, attribute_definition_id, value_text)
SELECT p.product_id, ad.attribute_definition_id, 'LGA1700'
FROM products p
JOIN product_types pt ON pt.type_code='CPU'
JOIN product_attribute_definitions ad
 ON ad.product_type_id=pt.product_type_id AND ad.attribute_code='socket'
WHERE p.model_code='BX8071514600KF'
ON CONFLICT (product_id, attribute_definition_id) DO UPDATE SET
 value_text=EXCLUDED.value_text, value_decimal=NULL, value_integer=NULL, value_boolean=NULL, value_json=NULL;

INSERT INTO product_attribute_values
 (product_id, attribute_definition_id, value_integer)
SELECT p.product_id, ad.attribute_definition_id, 14
FROM products p
JOIN product_types pt ON pt.type_code='CPU'
JOIN product_attribute_definitions ad
 ON ad.product_type_id=pt.product_type_id AND ad.attribute_code='core_count'
WHERE p.model_code='BX8071514600KF'
ON CONFLICT (product_id, attribute_definition_id) DO UPDATE SET
 value_integer=EXCLUDED.value_integer, value_text=NULL, value_decimal=NULL, value_boolean=NULL, value_json=NULL;

INSERT INTO product_attribute_values
 (product_id, attribute_definition_id, value_integer)
SELECT p.product_id, ad.attribute_definition_id, 20
FROM products p
JOIN product_types pt ON pt.type_code='CPU'
JOIN product_attribute_definitions ad
 ON ad.product_type_id=pt.product_type_id AND ad.attribute_code='thread_count'
WHERE p.model_code='BX8071514600KF'
ON CONFLICT (product_id, attribute_definition_id) DO UPDATE SET
 value_integer=EXCLUDED.value_integer, value_text=NULL, value_decimal=NULL, value_boolean=NULL, value_json=NULL;

INSERT INTO product_attribute_values
 (product_id, attribute_definition_id, value_integer)
SELECT p.product_id, ad.attribute_definition_id, 125
FROM products p
JOIN product_types pt ON pt.type_code='CPU'
JOIN product_attribute_definitions ad
 ON ad.product_type_id=pt.product_type_id AND ad.attribute_code='tdp_watt'
WHERE p.model_code='BX8071514600KF'
ON CONFLICT (product_id, attribute_definition_id) DO UPDATE SET
 value_integer=EXCLUDED.value_integer, value_text=NULL, value_decimal=NULL, value_boolean=NULL, value_json=NULL;

INSERT INTO products
 (product_type_id, category_id, brand_id, model_code, product_name, short_description, description, product_status)
SELECT pt.product_type_id, c.category_id, b.brand_id, 'BX8071513700K', 'Core i7-13700K',
       'Core i7-13700K - catalog tham khảo PC Builder Store.', 'Nguồn tham khảo: https://www.intel.com/content/www/us/en/products/details/processors/core.html',
       'ACTIVE'
FROM product_types pt
JOIN categories c ON c.category_code='CPU'
LEFT JOIN brands b ON b.brand_name='Intel'
WHERE pt.type_code='CPU'
ON CONFLICT (model_code) DO UPDATE SET
 product_type_id=EXCLUDED.product_type_id,
 category_id=EXCLUDED.category_id,
 brand_id=EXCLUDED.brand_id,
 product_name=EXCLUDED.product_name,
 short_description=EXCLUDED.short_description,
 description=EXCLUDED.description,
 product_status='ACTIVE';

INSERT INTO product_offers
 (product_id, offer_code, condition_code, price, currency_code, stock_quantity,
  reserved_quantity, warranty_months, offer_status)
SELECT p.product_id, 'DEMO-BX8071513700K', 'NEW',
       4500000, 'VND',
       5, 0, 36, 'ACTIVE'
FROM products p WHERE p.model_code='BX8071513700K'
ON CONFLICT (offer_code) DO UPDATE SET
 product_id=EXCLUDED.product_id,
 condition_code=EXCLUDED.condition_code,
 price=EXCLUDED.price,
 currency_code=EXCLUDED.currency_code,
 stock_quantity=EXCLUDED.stock_quantity,
 warranty_months=EXCLUDED.warranty_months,
 offer_status='ACTIVE';

INSERT INTO product_attribute_values
 (product_id, attribute_definition_id, value_text)
SELECT p.product_id, ad.attribute_definition_id, 'LGA1700'
FROM products p
JOIN product_types pt ON pt.type_code='CPU'
JOIN product_attribute_definitions ad
 ON ad.product_type_id=pt.product_type_id AND ad.attribute_code='socket'
WHERE p.model_code='BX8071513700K'
ON CONFLICT (product_id, attribute_definition_id) DO UPDATE SET
 value_text=EXCLUDED.value_text, value_decimal=NULL, value_integer=NULL, value_boolean=NULL, value_json=NULL;

INSERT INTO product_attribute_values
 (product_id, attribute_definition_id, value_integer)
SELECT p.product_id, ad.attribute_definition_id, 16
FROM products p
JOIN product_types pt ON pt.type_code='CPU'
JOIN product_attribute_definitions ad
 ON ad.product_type_id=pt.product_type_id AND ad.attribute_code='core_count'
WHERE p.model_code='BX8071513700K'
ON CONFLICT (product_id, attribute_definition_id) DO UPDATE SET
 value_integer=EXCLUDED.value_integer, value_text=NULL, value_decimal=NULL, value_boolean=NULL, value_json=NULL;

INSERT INTO product_attribute_values
 (product_id, attribute_definition_id, value_integer)
SELECT p.product_id, ad.attribute_definition_id, 24
FROM products p
JOIN product_types pt ON pt.type_code='CPU'
JOIN product_attribute_definitions ad
 ON ad.product_type_id=pt.product_type_id AND ad.attribute_code='thread_count'
WHERE p.model_code='BX8071513700K'
ON CONFLICT (product_id, attribute_definition_id) DO UPDATE SET
 value_integer=EXCLUDED.value_integer, value_text=NULL, value_decimal=NULL, value_boolean=NULL, value_json=NULL;

INSERT INTO product_attribute_values
 (product_id, attribute_definition_id, value_integer)
SELECT p.product_id, ad.attribute_definition_id, 125
FROM products p
JOIN product_types pt ON pt.type_code='CPU'
JOIN product_attribute_definitions ad
 ON ad.product_type_id=pt.product_type_id AND ad.attribute_code='tdp_watt'
WHERE p.model_code='BX8071513700K'
ON CONFLICT (product_id, attribute_definition_id) DO UPDATE SET
 value_integer=EXCLUDED.value_integer, value_text=NULL, value_decimal=NULL, value_boolean=NULL, value_json=NULL;

INSERT INTO products
 (product_type_id, category_id, brand_id, model_code, product_name, short_description, description, product_status)
SELECT pt.product_type_id, c.category_id, b.brand_id, 'BX8071514700K', 'Core i7-14700K',
       'Core i7-14700K - catalog tham khảo PC Builder Store.', 'Nguồn tham khảo: https://www.intel.com/content/www/us/en/products/details/processors/core.html',
       'ACTIVE'
FROM product_types pt
JOIN categories c ON c.category_code='CPU'
LEFT JOIN brands b ON b.brand_name='Intel'
WHERE pt.type_code='CPU'
ON CONFLICT (model_code) DO UPDATE SET
 product_type_id=EXCLUDED.product_type_id,
 category_id=EXCLUDED.category_id,
 brand_id=EXCLUDED.brand_id,
 product_name=EXCLUDED.product_name,
 short_description=EXCLUDED.short_description,
 description=EXCLUDED.description,
 product_status='ACTIVE';

INSERT INTO product_offers
 (product_id, offer_code, condition_code, price, currency_code, stock_quantity,
  reserved_quantity, warranty_months, offer_status)
SELECT p.product_id, 'DEMO-BX8071514700K', 'NEW',
       4500000, 'VND',
       5, 0, 36, 'ACTIVE'
FROM products p WHERE p.model_code='BX8071514700K'
ON CONFLICT (offer_code) DO UPDATE SET
 product_id=EXCLUDED.product_id,
 condition_code=EXCLUDED.condition_code,
 price=EXCLUDED.price,
 currency_code=EXCLUDED.currency_code,
 stock_quantity=EXCLUDED.stock_quantity,
 warranty_months=EXCLUDED.warranty_months,
 offer_status='ACTIVE';

INSERT INTO product_attribute_values
 (product_id, attribute_definition_id, value_text)
SELECT p.product_id, ad.attribute_definition_id, 'LGA1700'
FROM products p
JOIN product_types pt ON pt.type_code='CPU'
JOIN product_attribute_definitions ad
 ON ad.product_type_id=pt.product_type_id AND ad.attribute_code='socket'
WHERE p.model_code='BX8071514700K'
ON CONFLICT (product_id, attribute_definition_id) DO UPDATE SET
 value_text=EXCLUDED.value_text, value_decimal=NULL, value_integer=NULL, value_boolean=NULL, value_json=NULL;

INSERT INTO product_attribute_values
 (product_id, attribute_definition_id, value_integer)
SELECT p.product_id, ad.attribute_definition_id, 20
FROM products p
JOIN product_types pt ON pt.type_code='CPU'
JOIN product_attribute_definitions ad
 ON ad.product_type_id=pt.product_type_id AND ad.attribute_code='core_count'
WHERE p.model_code='BX8071514700K'
ON CONFLICT (product_id, attribute_definition_id) DO UPDATE SET
 value_integer=EXCLUDED.value_integer, value_text=NULL, value_decimal=NULL, value_boolean=NULL, value_json=NULL;

INSERT INTO product_attribute_values
 (product_id, attribute_definition_id, value_integer)
SELECT p.product_id, ad.attribute_definition_id, 28
FROM products p
JOIN product_types pt ON pt.type_code='CPU'
JOIN product_attribute_definitions ad
 ON ad.product_type_id=pt.product_type_id AND ad.attribute_code='thread_count'
WHERE p.model_code='BX8071514700K'
ON CONFLICT (product_id, attribute_definition_id) DO UPDATE SET
 value_integer=EXCLUDED.value_integer, value_text=NULL, value_decimal=NULL, value_boolean=NULL, value_json=NULL;

INSERT INTO product_attribute_values
 (product_id, attribute_definition_id, value_integer)
SELECT p.product_id, ad.attribute_definition_id, 125
FROM products p
JOIN product_types pt ON pt.type_code='CPU'
JOIN product_attribute_definitions ad
 ON ad.product_type_id=pt.product_type_id AND ad.attribute_code='tdp_watt'
WHERE p.model_code='BX8071514700K'
ON CONFLICT (product_id, attribute_definition_id) DO UPDATE SET
 value_integer=EXCLUDED.value_integer, value_text=NULL, value_decimal=NULL, value_boolean=NULL, value_json=NULL;

INSERT INTO products
 (product_type_id, category_id, brand_id, model_code, product_name, short_description, description, product_status)
SELECT pt.product_type_id, c.category_id, b.brand_id, 'BX8071514900K', 'Core i9-14900K',
       'Core i9-14900K - catalog tham khảo PC Builder Store.', 'Nguồn tham khảo: https://www.intel.com/content/www/us/en/products/details/processors/core.html',
       'ACTIVE'
FROM product_types pt
JOIN categories c ON c.category_code='CPU'
LEFT JOIN brands b ON b.brand_name='Intel'
WHERE pt.type_code='CPU'
ON CONFLICT (model_code) DO UPDATE SET
 product_type_id=EXCLUDED.product_type_id,
 category_id=EXCLUDED.category_id,
 brand_id=EXCLUDED.brand_id,
 product_name=EXCLUDED.product_name,
 short_description=EXCLUDED.short_description,
 description=EXCLUDED.description,
 product_status='ACTIVE';

INSERT INTO product_offers
 (product_id, offer_code, condition_code, price, currency_code, stock_quantity,
  reserved_quantity, warranty_months, offer_status)
SELECT p.product_id, 'DEMO-BX8071514900K', 'NEW',
       4500000, 'VND',
       5, 0, 36, 'ACTIVE'
FROM products p WHERE p.model_code='BX8071514900K'
ON CONFLICT (offer_code) DO UPDATE SET
 product_id=EXCLUDED.product_id,
 condition_code=EXCLUDED.condition_code,
 price=EXCLUDED.price,
 currency_code=EXCLUDED.currency_code,
 stock_quantity=EXCLUDED.stock_quantity,
 warranty_months=EXCLUDED.warranty_months,
 offer_status='ACTIVE';

INSERT INTO product_attribute_values
 (product_id, attribute_definition_id, value_text)
SELECT p.product_id, ad.attribute_definition_id, 'LGA1700'
FROM products p
JOIN product_types pt ON pt.type_code='CPU'
JOIN product_attribute_definitions ad
 ON ad.product_type_id=pt.product_type_id AND ad.attribute_code='socket'
WHERE p.model_code='BX8071514900K'
ON CONFLICT (product_id, attribute_definition_id) DO UPDATE SET
 value_text=EXCLUDED.value_text, value_decimal=NULL, value_integer=NULL, value_boolean=NULL, value_json=NULL;

INSERT INTO product_attribute_values
 (product_id, attribute_definition_id, value_integer)
SELECT p.product_id, ad.attribute_definition_id, 24
FROM products p
JOIN product_types pt ON pt.type_code='CPU'
JOIN product_attribute_definitions ad
 ON ad.product_type_id=pt.product_type_id AND ad.attribute_code='core_count'
WHERE p.model_code='BX8071514900K'
ON CONFLICT (product_id, attribute_definition_id) DO UPDATE SET
 value_integer=EXCLUDED.value_integer, value_text=NULL, value_decimal=NULL, value_boolean=NULL, value_json=NULL;

INSERT INTO product_attribute_values
 (product_id, attribute_definition_id, value_integer)
SELECT p.product_id, ad.attribute_definition_id, 32
FROM products p
JOIN product_types pt ON pt.type_code='CPU'
JOIN product_attribute_definitions ad
 ON ad.product_type_id=pt.product_type_id AND ad.attribute_code='thread_count'
WHERE p.model_code='BX8071514900K'
ON CONFLICT (product_id, attribute_definition_id) DO UPDATE SET
 value_integer=EXCLUDED.value_integer, value_text=NULL, value_decimal=NULL, value_boolean=NULL, value_json=NULL;

INSERT INTO product_attribute_values
 (product_id, attribute_definition_id, value_integer)
SELECT p.product_id, ad.attribute_definition_id, 125
FROM products p
JOIN product_types pt ON pt.type_code='CPU'
JOIN product_attribute_definitions ad
 ON ad.product_type_id=pt.product_type_id AND ad.attribute_code='tdp_watt'
WHERE p.model_code='BX8071514900K'
ON CONFLICT (product_id, attribute_definition_id) DO UPDATE SET
 value_integer=EXCLUDED.value_integer, value_text=NULL, value_decimal=NULL, value_boolean=NULL, value_json=NULL;

INSERT INTO products
 (product_type_id, category_id, brand_id, model_code, product_name, short_description, description, product_status)
SELECT pt.product_type_id, c.category_id, b.brand_id, '100-100000927BOX', 'Ryzen 5 5600',
       'Ryzen 5 5600 - catalog tham khảo PC Builder Store.', 'Nguồn tham khảo: https://www.amd.com/en/products/processors/desktops/ryzen.html',
       'ACTIVE'
FROM product_types pt
JOIN categories c ON c.category_code='CPU'
LEFT JOIN brands b ON b.brand_name='AMD'
WHERE pt.type_code='CPU'
ON CONFLICT (model_code) DO UPDATE SET
 product_type_id=EXCLUDED.product_type_id,
 category_id=EXCLUDED.category_id,
 brand_id=EXCLUDED.brand_id,
 product_name=EXCLUDED.product_name,
 short_description=EXCLUDED.short_description,
 description=EXCLUDED.description,
 product_status='ACTIVE';

INSERT INTO product_offers
 (product_id, offer_code, condition_code, price, currency_code, stock_quantity,
  reserved_quantity, warranty_months, offer_status)
SELECT p.product_id, 'DEMO-100-100000927BOX', 'NEW',
       4500000, 'VND',
       5, 0, 36, 'ACTIVE'
FROM products p WHERE p.model_code='100-100000927BOX'
ON CONFLICT (offer_code) DO UPDATE SET
 product_id=EXCLUDED.product_id,
 condition_code=EXCLUDED.condition_code,
 price=EXCLUDED.price,
 currency_code=EXCLUDED.currency_code,
 stock_quantity=EXCLUDED.stock_quantity,
 warranty_months=EXCLUDED.warranty_months,
 offer_status='ACTIVE';

INSERT INTO product_attribute_values
 (product_id, attribute_definition_id, value_text)
SELECT p.product_id, ad.attribute_definition_id, 'AM4'
FROM products p
JOIN product_types pt ON pt.type_code='CPU'
JOIN product_attribute_definitions ad
 ON ad.product_type_id=pt.product_type_id AND ad.attribute_code='socket'
WHERE p.model_code='100-100000927BOX'
ON CONFLICT (product_id, attribute_definition_id) DO UPDATE SET
 value_text=EXCLUDED.value_text, value_decimal=NULL, value_integer=NULL, value_boolean=NULL, value_json=NULL;

INSERT INTO product_attribute_values
 (product_id, attribute_definition_id, value_integer)
SELECT p.product_id, ad.attribute_definition_id, 6
FROM products p
JOIN product_types pt ON pt.type_code='CPU'
JOIN product_attribute_definitions ad
 ON ad.product_type_id=pt.product_type_id AND ad.attribute_code='core_count'
WHERE p.model_code='100-100000927BOX'
ON CONFLICT (product_id, attribute_definition_id) DO UPDATE SET
 value_integer=EXCLUDED.value_integer, value_text=NULL, value_decimal=NULL, value_boolean=NULL, value_json=NULL;

INSERT INTO product_attribute_values
 (product_id, attribute_definition_id, value_integer)
SELECT p.product_id, ad.attribute_definition_id, 12
FROM products p
JOIN product_types pt ON pt.type_code='CPU'
JOIN product_attribute_definitions ad
 ON ad.product_type_id=pt.product_type_id AND ad.attribute_code='thread_count'
WHERE p.model_code='100-100000927BOX'
ON CONFLICT (product_id, attribute_definition_id) DO UPDATE SET
 value_integer=EXCLUDED.value_integer, value_text=NULL, value_decimal=NULL, value_boolean=NULL, value_json=NULL;

INSERT INTO product_attribute_values
 (product_id, attribute_definition_id, value_integer)
SELECT p.product_id, ad.attribute_definition_id, 65
FROM products p
JOIN product_types pt ON pt.type_code='CPU'
JOIN product_attribute_definitions ad
 ON ad.product_type_id=pt.product_type_id AND ad.attribute_code='tdp_watt'
WHERE p.model_code='100-100000927BOX'
ON CONFLICT (product_id, attribute_definition_id) DO UPDATE SET
 value_integer=EXCLUDED.value_integer, value_text=NULL, value_decimal=NULL, value_boolean=NULL, value_json=NULL;

INSERT INTO products
 (product_type_id, category_id, brand_id, model_code, product_name, short_description, description, product_status)
SELECT pt.product_type_id, c.category_id, b.brand_id, '100-100000065BOX', 'Ryzen 5 5600X',
       'Ryzen 5 5600X - catalog tham khảo PC Builder Store.', 'Nguồn tham khảo: https://www.amd.com/en/products/processors/desktops/ryzen.html',
       'ACTIVE'
FROM product_types pt
JOIN categories c ON c.category_code='CPU'
LEFT JOIN brands b ON b.brand_name='AMD'
WHERE pt.type_code='CPU'
ON CONFLICT (model_code) DO UPDATE SET
 product_type_id=EXCLUDED.product_type_id,
 category_id=EXCLUDED.category_id,
 brand_id=EXCLUDED.brand_id,
 product_name=EXCLUDED.product_name,
 short_description=EXCLUDED.short_description,
 description=EXCLUDED.description,
 product_status='ACTIVE';

INSERT INTO product_offers
 (product_id, offer_code, condition_code, price, currency_code, stock_quantity,
  reserved_quantity, warranty_months, offer_status)
SELECT p.product_id, 'DEMO-100-100000065BOX', 'NEW',
       4500000, 'VND',
       5, 0, 36, 'ACTIVE'
FROM products p WHERE p.model_code='100-100000065BOX'
ON CONFLICT (offer_code) DO UPDATE SET
 product_id=EXCLUDED.product_id,
 condition_code=EXCLUDED.condition_code,
 price=EXCLUDED.price,
 currency_code=EXCLUDED.currency_code,
 stock_quantity=EXCLUDED.stock_quantity,
 warranty_months=EXCLUDED.warranty_months,
 offer_status='ACTIVE';

INSERT INTO product_attribute_values
 (product_id, attribute_definition_id, value_text)
SELECT p.product_id, ad.attribute_definition_id, 'AM4'
FROM products p
JOIN product_types pt ON pt.type_code='CPU'
JOIN product_attribute_definitions ad
 ON ad.product_type_id=pt.product_type_id AND ad.attribute_code='socket'
WHERE p.model_code='100-100000065BOX'
ON CONFLICT (product_id, attribute_definition_id) DO UPDATE SET
 value_text=EXCLUDED.value_text, value_decimal=NULL, value_integer=NULL, value_boolean=NULL, value_json=NULL;

INSERT INTO product_attribute_values
 (product_id, attribute_definition_id, value_integer)
SELECT p.product_id, ad.attribute_definition_id, 6
FROM products p
JOIN product_types pt ON pt.type_code='CPU'
JOIN product_attribute_definitions ad
 ON ad.product_type_id=pt.product_type_id AND ad.attribute_code='core_count'
WHERE p.model_code='100-100000065BOX'
ON CONFLICT (product_id, attribute_definition_id) DO UPDATE SET
 value_integer=EXCLUDED.value_integer, value_text=NULL, value_decimal=NULL, value_boolean=NULL, value_json=NULL;

INSERT INTO product_attribute_values
 (product_id, attribute_definition_id, value_integer)
SELECT p.product_id, ad.attribute_definition_id, 12
FROM products p
JOIN product_types pt ON pt.type_code='CPU'
JOIN product_attribute_definitions ad
 ON ad.product_type_id=pt.product_type_id AND ad.attribute_code='thread_count'
WHERE p.model_code='100-100000065BOX'
ON CONFLICT (product_id, attribute_definition_id) DO UPDATE SET
 value_integer=EXCLUDED.value_integer, value_text=NULL, value_decimal=NULL, value_boolean=NULL, value_json=NULL;

INSERT INTO product_attribute_values
 (product_id, attribute_definition_id, value_integer)
SELECT p.product_id, ad.attribute_definition_id, 65
FROM products p
JOIN product_types pt ON pt.type_code='CPU'
JOIN product_attribute_definitions ad
 ON ad.product_type_id=pt.product_type_id AND ad.attribute_code='tdp_watt'
WHERE p.model_code='100-100000065BOX'
ON CONFLICT (product_id, attribute_definition_id) DO UPDATE SET
 value_integer=EXCLUDED.value_integer, value_text=NULL, value_decimal=NULL, value_boolean=NULL, value_json=NULL;

INSERT INTO products
 (product_type_id, category_id, brand_id, model_code, product_name, short_description, description, product_status)
SELECT pt.product_type_id, c.category_id, b.brand_id, '100-100001015BOX', 'Ryzen 5 7600',
       'Ryzen 5 7600 - catalog tham khảo PC Builder Store.', 'Nguồn tham khảo: https://www.amd.com/en/products/processors/desktops/ryzen/7000-series/amd-ryzen-5-7600.html',
       'ACTIVE'
FROM product_types pt
JOIN categories c ON c.category_code='CPU'
LEFT JOIN brands b ON b.brand_name='AMD'
WHERE pt.type_code='CPU'
ON CONFLICT (model_code) DO UPDATE SET
 product_type_id=EXCLUDED.product_type_id,
 category_id=EXCLUDED.category_id,
 brand_id=EXCLUDED.brand_id,
 product_name=EXCLUDED.product_name,
 short_description=EXCLUDED.short_description,
 description=EXCLUDED.description,
 product_status='ACTIVE';

INSERT INTO product_offers
 (product_id, offer_code, condition_code, price, currency_code, stock_quantity,
  reserved_quantity, warranty_months, offer_status)
SELECT p.product_id, 'DEMO-100-100001015BOX', 'NEW',
       4500000, 'VND',
       5, 0, 36, 'ACTIVE'
FROM products p WHERE p.model_code='100-100001015BOX'
ON CONFLICT (offer_code) DO UPDATE SET
 product_id=EXCLUDED.product_id,
 condition_code=EXCLUDED.condition_code,
 price=EXCLUDED.price,
 currency_code=EXCLUDED.currency_code,
 stock_quantity=EXCLUDED.stock_quantity,
 warranty_months=EXCLUDED.warranty_months,
 offer_status='ACTIVE';

INSERT INTO product_attribute_values
 (product_id, attribute_definition_id, value_text)
SELECT p.product_id, ad.attribute_definition_id, 'AM5'
FROM products p
JOIN product_types pt ON pt.type_code='CPU'
JOIN product_attribute_definitions ad
 ON ad.product_type_id=pt.product_type_id AND ad.attribute_code='socket'
WHERE p.model_code='100-100001015BOX'
ON CONFLICT (product_id, attribute_definition_id) DO UPDATE SET
 value_text=EXCLUDED.value_text, value_decimal=NULL, value_integer=NULL, value_boolean=NULL, value_json=NULL;

INSERT INTO product_attribute_values
 (product_id, attribute_definition_id, value_integer)
SELECT p.product_id, ad.attribute_definition_id, 6
FROM products p
JOIN product_types pt ON pt.type_code='CPU'
JOIN product_attribute_definitions ad
 ON ad.product_type_id=pt.product_type_id AND ad.attribute_code='core_count'
WHERE p.model_code='100-100001015BOX'
ON CONFLICT (product_id, attribute_definition_id) DO UPDATE SET
 value_integer=EXCLUDED.value_integer, value_text=NULL, value_decimal=NULL, value_boolean=NULL, value_json=NULL;

INSERT INTO product_attribute_values
 (product_id, attribute_definition_id, value_integer)
SELECT p.product_id, ad.attribute_definition_id, 12
FROM products p
JOIN product_types pt ON pt.type_code='CPU'
JOIN product_attribute_definitions ad
 ON ad.product_type_id=pt.product_type_id AND ad.attribute_code='thread_count'
WHERE p.model_code='100-100001015BOX'
ON CONFLICT (product_id, attribute_definition_id) DO UPDATE SET
 value_integer=EXCLUDED.value_integer, value_text=NULL, value_decimal=NULL, value_boolean=NULL, value_json=NULL;

INSERT INTO product_attribute_values
 (product_id, attribute_definition_id, value_integer)
SELECT p.product_id, ad.attribute_definition_id, 65
FROM products p
JOIN product_types pt ON pt.type_code='CPU'
JOIN product_attribute_definitions ad
 ON ad.product_type_id=pt.product_type_id AND ad.attribute_code='tdp_watt'
WHERE p.model_code='100-100001015BOX'
ON CONFLICT (product_id, attribute_definition_id) DO UPDATE SET
 value_integer=EXCLUDED.value_integer, value_text=NULL, value_decimal=NULL, value_boolean=NULL, value_json=NULL;

INSERT INTO products
 (product_type_id, category_id, brand_id, model_code, product_name, short_description, description, product_status)
SELECT pt.product_type_id, c.category_id, b.brand_id, '100-100000592BOX', 'Ryzen 7 7700',
       'Ryzen 7 7700 - catalog tham khảo PC Builder Store.', 'Nguồn tham khảo: https://www.amd.com/en/products/processors/desktops/ryzen.html',
       'ACTIVE'
FROM product_types pt
JOIN categories c ON c.category_code='CPU'
LEFT JOIN brands b ON b.brand_name='AMD'
WHERE pt.type_code='CPU'
ON CONFLICT (model_code) DO UPDATE SET
 product_type_id=EXCLUDED.product_type_id,
 category_id=EXCLUDED.category_id,
 brand_id=EXCLUDED.brand_id,
 product_name=EXCLUDED.product_name,
 short_description=EXCLUDED.short_description,
 description=EXCLUDED.description,
 product_status='ACTIVE';

INSERT INTO product_offers
 (product_id, offer_code, condition_code, price, currency_code, stock_quantity,
  reserved_quantity, warranty_months, offer_status)
SELECT p.product_id, 'DEMO-100-100000592BOX', 'NEW',
       4500000, 'VND',
       5, 0, 36, 'ACTIVE'
FROM products p WHERE p.model_code='100-100000592BOX'
ON CONFLICT (offer_code) DO UPDATE SET
 product_id=EXCLUDED.product_id,
 condition_code=EXCLUDED.condition_code,
 price=EXCLUDED.price,
 currency_code=EXCLUDED.currency_code,
 stock_quantity=EXCLUDED.stock_quantity,
 warranty_months=EXCLUDED.warranty_months,
 offer_status='ACTIVE';

INSERT INTO product_attribute_values
 (product_id, attribute_definition_id, value_text)
SELECT p.product_id, ad.attribute_definition_id, 'AM5'
FROM products p
JOIN product_types pt ON pt.type_code='CPU'
JOIN product_attribute_definitions ad
 ON ad.product_type_id=pt.product_type_id AND ad.attribute_code='socket'
WHERE p.model_code='100-100000592BOX'
ON CONFLICT (product_id, attribute_definition_id) DO UPDATE SET
 value_text=EXCLUDED.value_text, value_decimal=NULL, value_integer=NULL, value_boolean=NULL, value_json=NULL;

INSERT INTO product_attribute_values
 (product_id, attribute_definition_id, value_integer)
SELECT p.product_id, ad.attribute_definition_id, 8
FROM products p
JOIN product_types pt ON pt.type_code='CPU'
JOIN product_attribute_definitions ad
 ON ad.product_type_id=pt.product_type_id AND ad.attribute_code='core_count'
WHERE p.model_code='100-100000592BOX'
ON CONFLICT (product_id, attribute_definition_id) DO UPDATE SET
 value_integer=EXCLUDED.value_integer, value_text=NULL, value_decimal=NULL, value_boolean=NULL, value_json=NULL;

INSERT INTO product_attribute_values
 (product_id, attribute_definition_id, value_integer)
SELECT p.product_id, ad.attribute_definition_id, 16
FROM products p
JOIN product_types pt ON pt.type_code='CPU'
JOIN product_attribute_definitions ad
 ON ad.product_type_id=pt.product_type_id AND ad.attribute_code='thread_count'
WHERE p.model_code='100-100000592BOX'
ON CONFLICT (product_id, attribute_definition_id) DO UPDATE SET
 value_integer=EXCLUDED.value_integer, value_text=NULL, value_decimal=NULL, value_boolean=NULL, value_json=NULL;

INSERT INTO product_attribute_values
 (product_id, attribute_definition_id, value_integer)
SELECT p.product_id, ad.attribute_definition_id, 65
FROM products p
JOIN product_types pt ON pt.type_code='CPU'
JOIN product_attribute_definitions ad
 ON ad.product_type_id=pt.product_type_id AND ad.attribute_code='tdp_watt'
WHERE p.model_code='100-100000592BOX'
ON CONFLICT (product_id, attribute_definition_id) DO UPDATE SET
 value_integer=EXCLUDED.value_integer, value_text=NULL, value_decimal=NULL, value_boolean=NULL, value_json=NULL;

INSERT INTO products
 (product_type_id, category_id, brand_id, model_code, product_name, short_description, description, product_status)
SELECT pt.product_type_id, c.category_id, b.brand_id, '100-100000910WOF', 'Ryzen 7 7800X3D',
       'Ryzen 7 7800X3D - catalog tham khảo PC Builder Store.', 'Nguồn tham khảo: https://www.amd.com/en/products/processors/desktops/ryzen.html',
       'ACTIVE'
FROM product_types pt
JOIN categories c ON c.category_code='CPU'
LEFT JOIN brands b ON b.brand_name='AMD'
WHERE pt.type_code='CPU'
ON CONFLICT (model_code) DO UPDATE SET
 product_type_id=EXCLUDED.product_type_id,
 category_id=EXCLUDED.category_id,
 brand_id=EXCLUDED.brand_id,
 product_name=EXCLUDED.product_name,
 short_description=EXCLUDED.short_description,
 description=EXCLUDED.description,
 product_status='ACTIVE';

INSERT INTO product_offers
 (product_id, offer_code, condition_code, price, currency_code, stock_quantity,
  reserved_quantity, warranty_months, offer_status)
SELECT p.product_id, 'DEMO-100-100000910WOF', 'NEW',
       4500000, 'VND',
       5, 0, 36, 'ACTIVE'
FROM products p WHERE p.model_code='100-100000910WOF'
ON CONFLICT (offer_code) DO UPDATE SET
 product_id=EXCLUDED.product_id,
 condition_code=EXCLUDED.condition_code,
 price=EXCLUDED.price,
 currency_code=EXCLUDED.currency_code,
 stock_quantity=EXCLUDED.stock_quantity,
 warranty_months=EXCLUDED.warranty_months,
 offer_status='ACTIVE';

INSERT INTO product_attribute_values
 (product_id, attribute_definition_id, value_text)
SELECT p.product_id, ad.attribute_definition_id, 'AM5'
FROM products p
JOIN product_types pt ON pt.type_code='CPU'
JOIN product_attribute_definitions ad
 ON ad.product_type_id=pt.product_type_id AND ad.attribute_code='socket'
WHERE p.model_code='100-100000910WOF'
ON CONFLICT (product_id, attribute_definition_id) DO UPDATE SET
 value_text=EXCLUDED.value_text, value_decimal=NULL, value_integer=NULL, value_boolean=NULL, value_json=NULL;

INSERT INTO product_attribute_values
 (product_id, attribute_definition_id, value_integer)
SELECT p.product_id, ad.attribute_definition_id, 8
FROM products p
JOIN product_types pt ON pt.type_code='CPU'
JOIN product_attribute_definitions ad
 ON ad.product_type_id=pt.product_type_id AND ad.attribute_code='core_count'
WHERE p.model_code='100-100000910WOF'
ON CONFLICT (product_id, attribute_definition_id) DO UPDATE SET
 value_integer=EXCLUDED.value_integer, value_text=NULL, value_decimal=NULL, value_boolean=NULL, value_json=NULL;

INSERT INTO product_attribute_values
 (product_id, attribute_definition_id, value_integer)
SELECT p.product_id, ad.attribute_definition_id, 16
FROM products p
JOIN product_types pt ON pt.type_code='CPU'
JOIN product_attribute_definitions ad
 ON ad.product_type_id=pt.product_type_id AND ad.attribute_code='thread_count'
WHERE p.model_code='100-100000910WOF'
ON CONFLICT (product_id, attribute_definition_id) DO UPDATE SET
 value_integer=EXCLUDED.value_integer, value_text=NULL, value_decimal=NULL, value_boolean=NULL, value_json=NULL;

INSERT INTO product_attribute_values
 (product_id, attribute_definition_id, value_integer)
SELECT p.product_id, ad.attribute_definition_id, 120
FROM products p
JOIN product_types pt ON pt.type_code='CPU'
JOIN product_attribute_definitions ad
 ON ad.product_type_id=pt.product_type_id AND ad.attribute_code='tdp_watt'
WHERE p.model_code='100-100000910WOF'
ON CONFLICT (product_id, attribute_definition_id) DO UPDATE SET
 value_integer=EXCLUDED.value_integer, value_text=NULL, value_decimal=NULL, value_boolean=NULL, value_json=NULL;

INSERT INTO products
 (product_type_id, category_id, brand_id, model_code, product_name, short_description, description, product_status)
SELECT pt.product_type_id, c.category_id, b.brand_id, 'DUAL-RTX4060-O8G', 'Dual GeForce RTX 4060 OC 8GB',
       'Dual GeForce RTX 4060 OC 8GB - catalog tham khảo PC Builder Store.', 'Nguồn tham khảo: https://www.asus.com/',
       'ACTIVE'
FROM product_types pt
JOIN categories c ON c.category_code='GPU'
LEFT JOIN brands b ON b.brand_name='ASUS'
WHERE pt.type_code='GPU'
ON CONFLICT (model_code) DO UPDATE SET
 product_type_id=EXCLUDED.product_type_id,
 category_id=EXCLUDED.category_id,
 brand_id=EXCLUDED.brand_id,
 product_name=EXCLUDED.product_name,
 short_description=EXCLUDED.short_description,
 description=EXCLUDED.description,
 product_status='ACTIVE';

INSERT INTO product_offers
 (product_id, offer_code, condition_code, price, currency_code, stock_quantity,
  reserved_quantity, warranty_months, offer_status)
SELECT p.product_id, 'DEMO-DUAL-RTX4060-O8G', 'NEW',
       28000000, 'VND',
       5, 0, 36, 'ACTIVE'
FROM products p WHERE p.model_code='DUAL-RTX4060-O8G'
ON CONFLICT (offer_code) DO UPDATE SET
 product_id=EXCLUDED.product_id,
 condition_code=EXCLUDED.condition_code,
 price=EXCLUDED.price,
 currency_code=EXCLUDED.currency_code,
 stock_quantity=EXCLUDED.stock_quantity,
 warranty_months=EXCLUDED.warranty_months,
 offer_status='ACTIVE';

INSERT INTO product_attribute_values
 (product_id, attribute_definition_id, value_integer)
SELECT p.product_id, ad.attribute_definition_id, 8
FROM products p
JOIN product_types pt ON pt.type_code='GPU'
JOIN product_attribute_definitions ad
 ON ad.product_type_id=pt.product_type_id AND ad.attribute_code='vram_gb'
WHERE p.model_code='DUAL-RTX4060-O8G'
ON CONFLICT (product_id, attribute_definition_id) DO UPDATE SET
 value_integer=EXCLUDED.value_integer, value_text=NULL, value_decimal=NULL, value_boolean=NULL, value_json=NULL;

INSERT INTO products
 (product_type_id, category_id, brand_id, model_code, product_name, short_description, description, product_status)
SELECT pt.product_type_id, c.category_id, b.brand_id, 'RTX4060VENTUS2XBLACK8GOC', 'GeForce RTX 4060 Ventus 2X Black 8G OC',
       'GeForce RTX 4060 Ventus 2X Black 8G OC - catalog tham khảo PC Builder Store.', 'Nguồn tham khảo: https://www.msi.com/',
       'ACTIVE'
FROM product_types pt
JOIN categories c ON c.category_code='GPU'
LEFT JOIN brands b ON b.brand_name='MSI'
WHERE pt.type_code='GPU'
ON CONFLICT (model_code) DO UPDATE SET
 product_type_id=EXCLUDED.product_type_id,
 category_id=EXCLUDED.category_id,
 brand_id=EXCLUDED.brand_id,
 product_name=EXCLUDED.product_name,
 short_description=EXCLUDED.short_description,
 description=EXCLUDED.description,
 product_status='ACTIVE';

INSERT INTO product_offers
 (product_id, offer_code, condition_code, price, currency_code, stock_quantity,
  reserved_quantity, warranty_months, offer_status)
SELECT p.product_id, 'DEMO-RTX4060VENTUS2XBLACK8GOC', 'NEW',
       28000000, 'VND',
       5, 0, 36, 'ACTIVE'
FROM products p WHERE p.model_code='RTX4060VENTUS2XBLACK8GOC'
ON CONFLICT (offer_code) DO UPDATE SET
 product_id=EXCLUDED.product_id,
 condition_code=EXCLUDED.condition_code,
 price=EXCLUDED.price,
 currency_code=EXCLUDED.currency_code,
 stock_quantity=EXCLUDED.stock_quantity,
 warranty_months=EXCLUDED.warranty_months,
 offer_status='ACTIVE';

INSERT INTO product_attribute_values
 (product_id, attribute_definition_id, value_integer)
SELECT p.product_id, ad.attribute_definition_id, 8
FROM products p
JOIN product_types pt ON pt.type_code='GPU'
JOIN product_attribute_definitions ad
 ON ad.product_type_id=pt.product_type_id AND ad.attribute_code='vram_gb'
WHERE p.model_code='RTX4060VENTUS2XBLACK8GOC'
ON CONFLICT (product_id, attribute_definition_id) DO UPDATE SET
 value_integer=EXCLUDED.value_integer, value_text=NULL, value_decimal=NULL, value_boolean=NULL, value_json=NULL;

INSERT INTO products
 (product_type_id, category_id, brand_id, model_code, product_name, short_description, description, product_status)
SELECT pt.product_type_id, c.category_id, b.brand_id, 'GV-N4060WF2OC-8GD', 'GeForce RTX 4060 Windforce OC 8G',
       'GeForce RTX 4060 Windforce OC 8G - catalog tham khảo PC Builder Store.', 'Nguồn tham khảo: https://www.gigabyte.com/',
       'ACTIVE'
FROM product_types pt
JOIN categories c ON c.category_code='GPU'
LEFT JOIN brands b ON b.brand_name='Gigabyte'
WHERE pt.type_code='GPU'
ON CONFLICT (model_code) DO UPDATE SET
 product_type_id=EXCLUDED.product_type_id,
 category_id=EXCLUDED.category_id,
 brand_id=EXCLUDED.brand_id,
 product_name=EXCLUDED.product_name,
 short_description=EXCLUDED.short_description,
 description=EXCLUDED.description,
 product_status='ACTIVE';

INSERT INTO product_offers
 (product_id, offer_code, condition_code, price, currency_code, stock_quantity,
  reserved_quantity, warranty_months, offer_status)
SELECT p.product_id, 'DEMO-GV-N4060WF2OC-8GD', 'NEW',
       28000000, 'VND',
       5, 0, 36, 'ACTIVE'
FROM products p WHERE p.model_code='GV-N4060WF2OC-8GD'
ON CONFLICT (offer_code) DO UPDATE SET
 product_id=EXCLUDED.product_id,
 condition_code=EXCLUDED.condition_code,
 price=EXCLUDED.price,
 currency_code=EXCLUDED.currency_code,
 stock_quantity=EXCLUDED.stock_quantity,
 warranty_months=EXCLUDED.warranty_months,
 offer_status='ACTIVE';

INSERT INTO product_attribute_values
 (product_id, attribute_definition_id, value_integer)
SELECT p.product_id, ad.attribute_definition_id, 8
FROM products p
JOIN product_types pt ON pt.type_code='GPU'
JOIN product_attribute_definitions ad
 ON ad.product_type_id=pt.product_type_id AND ad.attribute_code='vram_gb'
WHERE p.model_code='GV-N4060WF2OC-8GD'
ON CONFLICT (product_id, attribute_definition_id) DO UPDATE SET
 value_integer=EXCLUDED.value_integer, value_text=NULL, value_decimal=NULL, value_boolean=NULL, value_json=NULL;

INSERT INTO products
 (product_type_id, category_id, brand_id, model_code, product_name, short_description, description, product_status)
SELECT pt.product_type_id, c.category_id, b.brand_id, 'ZT-D40600E-10M', 'Gaming GeForce RTX 4060 Twin Edge 8GB',
       'Gaming GeForce RTX 4060 Twin Edge 8GB - catalog tham khảo PC Builder Store.', 'Nguồn tham khảo: https://phongvu.vn/c/linh-kien-may-tinh',
       'ACTIVE'
FROM product_types pt
JOIN categories c ON c.category_code='GPU'
LEFT JOIN brands b ON b.brand_name='Zotac'
WHERE pt.type_code='GPU'
ON CONFLICT (model_code) DO UPDATE SET
 product_type_id=EXCLUDED.product_type_id,
 category_id=EXCLUDED.category_id,
 brand_id=EXCLUDED.brand_id,
 product_name=EXCLUDED.product_name,
 short_description=EXCLUDED.short_description,
 description=EXCLUDED.description,
 product_status='ACTIVE';

INSERT INTO product_offers
 (product_id, offer_code, condition_code, price, currency_code, stock_quantity,
  reserved_quantity, warranty_months, offer_status)
SELECT p.product_id, 'DEMO-ZT-D40600E-10M', 'NEW',
       28000000, 'VND',
       5, 0, 36, 'ACTIVE'
FROM products p WHERE p.model_code='ZT-D40600E-10M'
ON CONFLICT (offer_code) DO UPDATE SET
 product_id=EXCLUDED.product_id,
 condition_code=EXCLUDED.condition_code,
 price=EXCLUDED.price,
 currency_code=EXCLUDED.currency_code,
 stock_quantity=EXCLUDED.stock_quantity,
 warranty_months=EXCLUDED.warranty_months,
 offer_status='ACTIVE';

INSERT INTO product_attribute_values
 (product_id, attribute_definition_id, value_integer)
SELECT p.product_id, ad.attribute_definition_id, 8
FROM products p
JOIN product_types pt ON pt.type_code='GPU'
JOIN product_attribute_definitions ad
 ON ad.product_type_id=pt.product_type_id AND ad.attribute_code='vram_gb'
WHERE p.model_code='ZT-D40600E-10M'
ON CONFLICT (product_id, attribute_definition_id) DO UPDATE SET
 value_integer=EXCLUDED.value_integer, value_text=NULL, value_decimal=NULL, value_boolean=NULL, value_json=NULL;

INSERT INTO products
 (product_type_id, category_id, brand_id, model_code, product_name, short_description, description, product_status)
SELECT pt.product_type_id, c.category_id, b.brand_id, 'DUAL-RTX4060TI-O8G', 'Dual GeForce RTX 4060 Ti OC 8GB',
       'Dual GeForce RTX 4060 Ti OC 8GB - catalog tham khảo PC Builder Store.', 'Nguồn tham khảo: https://www.asus.com/',
       'ACTIVE'
FROM product_types pt
JOIN categories c ON c.category_code='GPU'
LEFT JOIN brands b ON b.brand_name='ASUS'
WHERE pt.type_code='GPU'
ON CONFLICT (model_code) DO UPDATE SET
 product_type_id=EXCLUDED.product_type_id,
 category_id=EXCLUDED.category_id,
 brand_id=EXCLUDED.brand_id,
 product_name=EXCLUDED.product_name,
 short_description=EXCLUDED.short_description,
 description=EXCLUDED.description,
 product_status='ACTIVE';

INSERT INTO product_offers
 (product_id, offer_code, condition_code, price, currency_code, stock_quantity,
  reserved_quantity, warranty_months, offer_status)
SELECT p.product_id, 'DEMO-DUAL-RTX4060TI-O8G', 'NEW',
       28000000, 'VND',
       5, 0, 36, 'ACTIVE'
FROM products p WHERE p.model_code='DUAL-RTX4060TI-O8G'
ON CONFLICT (offer_code) DO UPDATE SET
 product_id=EXCLUDED.product_id,
 condition_code=EXCLUDED.condition_code,
 price=EXCLUDED.price,
 currency_code=EXCLUDED.currency_code,
 stock_quantity=EXCLUDED.stock_quantity,
 warranty_months=EXCLUDED.warranty_months,
 offer_status='ACTIVE';

INSERT INTO product_attribute_values
 (product_id, attribute_definition_id, value_integer)
SELECT p.product_id, ad.attribute_definition_id, 8
FROM products p
JOIN product_types pt ON pt.type_code='GPU'
JOIN product_attribute_definitions ad
 ON ad.product_type_id=pt.product_type_id AND ad.attribute_code='vram_gb'
WHERE p.model_code='DUAL-RTX4060TI-O8G'
ON CONFLICT (product_id, attribute_definition_id) DO UPDATE SET
 value_integer=EXCLUDED.value_integer, value_text=NULL, value_decimal=NULL, value_boolean=NULL, value_json=NULL;

INSERT INTO products
 (product_type_id, category_id, brand_id, model_code, product_name, short_description, description, product_status)
SELECT pt.product_type_id, c.category_id, b.brand_id, 'RTX4060TIVENTUS2XBLACK8GOC', 'GeForce RTX 4060 Ti Ventus 2X Black 8G OC',
       'GeForce RTX 4060 Ti Ventus 2X Black 8G OC - catalog tham khảo PC Builder Store.', 'Nguồn tham khảo: https://www.msi.com/',
       'ACTIVE'
FROM product_types pt
JOIN categories c ON c.category_code='GPU'
LEFT JOIN brands b ON b.brand_name='MSI'
WHERE pt.type_code='GPU'
ON CONFLICT (model_code) DO UPDATE SET
 product_type_id=EXCLUDED.product_type_id,
 category_id=EXCLUDED.category_id,
 brand_id=EXCLUDED.brand_id,
 product_name=EXCLUDED.product_name,
 short_description=EXCLUDED.short_description,
 description=EXCLUDED.description,
 product_status='ACTIVE';

INSERT INTO product_offers
 (product_id, offer_code, condition_code, price, currency_code, stock_quantity,
  reserved_quantity, warranty_months, offer_status)
SELECT p.product_id, 'DEMO-RTX4060TIVENTUS2XBLACK8GOC', 'NEW',
       28000000, 'VND',
       5, 0, 36, 'ACTIVE'
FROM products p WHERE p.model_code='RTX4060TIVENTUS2XBLACK8GOC'
ON CONFLICT (offer_code) DO UPDATE SET
 product_id=EXCLUDED.product_id,
 condition_code=EXCLUDED.condition_code,
 price=EXCLUDED.price,
 currency_code=EXCLUDED.currency_code,
 stock_quantity=EXCLUDED.stock_quantity,
 warranty_months=EXCLUDED.warranty_months,
 offer_status='ACTIVE';

INSERT INTO product_attribute_values
 (product_id, attribute_definition_id, value_integer)
SELECT p.product_id, ad.attribute_definition_id, 8
FROM products p
JOIN product_types pt ON pt.type_code='GPU'
JOIN product_attribute_definitions ad
 ON ad.product_type_id=pt.product_type_id AND ad.attribute_code='vram_gb'
WHERE p.model_code='RTX4060TIVENTUS2XBLACK8GOC'
ON CONFLICT (product_id, attribute_definition_id) DO UPDATE SET
 value_integer=EXCLUDED.value_integer, value_text=NULL, value_decimal=NULL, value_boolean=NULL, value_json=NULL;

INSERT INTO products
 (product_type_id, category_id, brand_id, model_code, product_name, short_description, description, product_status)
SELECT pt.product_type_id, c.category_id, b.brand_id, 'GV-N406TEAGLE-OC-8GD', 'GeForce RTX 4060 Ti Eagle OC 8G',
       'GeForce RTX 4060 Ti Eagle OC 8G - catalog tham khảo PC Builder Store.', 'Nguồn tham khảo: https://www.gigabyte.com/',
       'ACTIVE'
FROM product_types pt
JOIN categories c ON c.category_code='GPU'
LEFT JOIN brands b ON b.brand_name='Gigabyte'
WHERE pt.type_code='GPU'
ON CONFLICT (model_code) DO UPDATE SET
 product_type_id=EXCLUDED.product_type_id,
 category_id=EXCLUDED.category_id,
 brand_id=EXCLUDED.brand_id,
 product_name=EXCLUDED.product_name,
 short_description=EXCLUDED.short_description,
 description=EXCLUDED.description,
 product_status='ACTIVE';

INSERT INTO product_offers
 (product_id, offer_code, condition_code, price, currency_code, stock_quantity,
  reserved_quantity, warranty_months, offer_status)
SELECT p.product_id, 'DEMO-GV-N406TEAGLE-OC-8GD', 'NEW',
       28000000, 'VND',
       5, 0, 36, 'ACTIVE'
FROM products p WHERE p.model_code='GV-N406TEAGLE-OC-8GD'
ON CONFLICT (offer_code) DO UPDATE SET
 product_id=EXCLUDED.product_id,
 condition_code=EXCLUDED.condition_code,
 price=EXCLUDED.price,
 currency_code=EXCLUDED.currency_code,
 stock_quantity=EXCLUDED.stock_quantity,
 warranty_months=EXCLUDED.warranty_months,
 offer_status='ACTIVE';

INSERT INTO product_attribute_values
 (product_id, attribute_definition_id, value_integer)
SELECT p.product_id, ad.attribute_definition_id, 8
FROM products p
JOIN product_types pt ON pt.type_code='GPU'
JOIN product_attribute_definitions ad
 ON ad.product_type_id=pt.product_type_id AND ad.attribute_code='vram_gb'
WHERE p.model_code='GV-N406TEAGLE-OC-8GD'
ON CONFLICT (product_id, attribute_definition_id) DO UPDATE SET
 value_integer=EXCLUDED.value_integer, value_text=NULL, value_decimal=NULL, value_boolean=NULL, value_json=NULL;

INSERT INTO products
 (product_type_id, category_id, brand_id, model_code, product_name, short_description, description, product_status)
SELECT pt.product_type_id, c.category_id, b.brand_id, 'DUAL-RTX4070S-O12G', 'Dual GeForce RTX 4070 SUPER OC 12GB',
       'Dual GeForce RTX 4070 SUPER OC 12GB - catalog tham khảo PC Builder Store.', 'Nguồn tham khảo: https://www.asus.com/',
       'ACTIVE'
FROM product_types pt
JOIN categories c ON c.category_code='GPU'
LEFT JOIN brands b ON b.brand_name='ASUS'
WHERE pt.type_code='GPU'
ON CONFLICT (model_code) DO UPDATE SET
 product_type_id=EXCLUDED.product_type_id,
 category_id=EXCLUDED.category_id,
 brand_id=EXCLUDED.brand_id,
 product_name=EXCLUDED.product_name,
 short_description=EXCLUDED.short_description,
 description=EXCLUDED.description,
 product_status='ACTIVE';

INSERT INTO product_offers
 (product_id, offer_code, condition_code, price, currency_code, stock_quantity,
  reserved_quantity, warranty_months, offer_status)
SELECT p.product_id, 'DEMO-DUAL-RTX4070S-O12G', 'NEW',
       28000000, 'VND',
       5, 0, 36, 'ACTIVE'
FROM products p WHERE p.model_code='DUAL-RTX4070S-O12G'
ON CONFLICT (offer_code) DO UPDATE SET
 product_id=EXCLUDED.product_id,
 condition_code=EXCLUDED.condition_code,
 price=EXCLUDED.price,
 currency_code=EXCLUDED.currency_code,
 stock_quantity=EXCLUDED.stock_quantity,
 warranty_months=EXCLUDED.warranty_months,
 offer_status='ACTIVE';

INSERT INTO product_attribute_values
 (product_id, attribute_definition_id, value_integer)
SELECT p.product_id, ad.attribute_definition_id, 12
FROM products p
JOIN product_types pt ON pt.type_code='GPU'
JOIN product_attribute_definitions ad
 ON ad.product_type_id=pt.product_type_id AND ad.attribute_code='vram_gb'
WHERE p.model_code='DUAL-RTX4070S-O12G'
ON CONFLICT (product_id, attribute_definition_id) DO UPDATE SET
 value_integer=EXCLUDED.value_integer, value_text=NULL, value_decimal=NULL, value_boolean=NULL, value_json=NULL;

INSERT INTO products
 (product_type_id, category_id, brand_id, model_code, product_name, short_description, description, product_status)
SELECT pt.product_type_id, c.category_id, b.brand_id, 'RTX4070SUPERVENTUS2X12GOC', 'GeForce RTX 4070 SUPER Ventus 2X OC',
       'GeForce RTX 4070 SUPER Ventus 2X OC - catalog tham khảo PC Builder Store.', 'Nguồn tham khảo: https://www.msi.com/',
       'ACTIVE'
FROM product_types pt
JOIN categories c ON c.category_code='GPU'
LEFT JOIN brands b ON b.brand_name='MSI'
WHERE pt.type_code='GPU'
ON CONFLICT (model_code) DO UPDATE SET
 product_type_id=EXCLUDED.product_type_id,
 category_id=EXCLUDED.category_id,
 brand_id=EXCLUDED.brand_id,
 product_name=EXCLUDED.product_name,
 short_description=EXCLUDED.short_description,
 description=EXCLUDED.description,
 product_status='ACTIVE';

INSERT INTO product_offers
 (product_id, offer_code, condition_code, price, currency_code, stock_quantity,
  reserved_quantity, warranty_months, offer_status)
SELECT p.product_id, 'DEMO-RTX4070SUPERVENTUS2X12GOC', 'NEW',
       28000000, 'VND',
       5, 0, 36, 'ACTIVE'
FROM products p WHERE p.model_code='RTX4070SUPERVENTUS2X12GOC'
ON CONFLICT (offer_code) DO UPDATE SET
 product_id=EXCLUDED.product_id,
 condition_code=EXCLUDED.condition_code,
 price=EXCLUDED.price,
 currency_code=EXCLUDED.currency_code,
 stock_quantity=EXCLUDED.stock_quantity,
 warranty_months=EXCLUDED.warranty_months,
 offer_status='ACTIVE';

INSERT INTO product_attribute_values
 (product_id, attribute_definition_id, value_integer)
SELECT p.product_id, ad.attribute_definition_id, 12
FROM products p
JOIN product_types pt ON pt.type_code='GPU'
JOIN product_attribute_definitions ad
 ON ad.product_type_id=pt.product_type_id AND ad.attribute_code='vram_gb'
WHERE p.model_code='RTX4070SUPERVENTUS2X12GOC'
ON CONFLICT (product_id, attribute_definition_id) DO UPDATE SET
 value_integer=EXCLUDED.value_integer, value_text=NULL, value_decimal=NULL, value_boolean=NULL, value_json=NULL;

INSERT INTO products
 (product_type_id, category_id, brand_id, model_code, product_name, short_description, description, product_status)
SELECT pt.product_type_id, c.category_id, b.brand_id, 'GV-N407SWF3OC-12GD', 'GeForce RTX 4070 SUPER Windforce OC 12G',
       'GeForce RTX 4070 SUPER Windforce OC 12G - catalog tham khảo PC Builder Store.', 'Nguồn tham khảo: https://www.gigabyte.com/',
       'ACTIVE'
FROM product_types pt
JOIN categories c ON c.category_code='GPU'
LEFT JOIN brands b ON b.brand_name='Gigabyte'
WHERE pt.type_code='GPU'
ON CONFLICT (model_code) DO UPDATE SET
 product_type_id=EXCLUDED.product_type_id,
 category_id=EXCLUDED.category_id,
 brand_id=EXCLUDED.brand_id,
 product_name=EXCLUDED.product_name,
 short_description=EXCLUDED.short_description,
 description=EXCLUDED.description,
 product_status='ACTIVE';

INSERT INTO product_offers
 (product_id, offer_code, condition_code, price, currency_code, stock_quantity,
  reserved_quantity, warranty_months, offer_status)
SELECT p.product_id, 'DEMO-GV-N407SWF3OC-12GD', 'NEW',
       28000000, 'VND',
       5, 0, 36, 'ACTIVE'
FROM products p WHERE p.model_code='GV-N407SWF3OC-12GD'
ON CONFLICT (offer_code) DO UPDATE SET
 product_id=EXCLUDED.product_id,
 condition_code=EXCLUDED.condition_code,
 price=EXCLUDED.price,
 currency_code=EXCLUDED.currency_code,
 stock_quantity=EXCLUDED.stock_quantity,
 warranty_months=EXCLUDED.warranty_months,
 offer_status='ACTIVE';

INSERT INTO product_attribute_values
 (product_id, attribute_definition_id, value_integer)
SELECT p.product_id, ad.attribute_definition_id, 12
FROM products p
JOIN product_types pt ON pt.type_code='GPU'
JOIN product_attribute_definitions ad
 ON ad.product_type_id=pt.product_type_id AND ad.attribute_code='vram_gb'
WHERE p.model_code='GV-N407SWF3OC-12GD'
ON CONFLICT (product_id, attribute_definition_id) DO UPDATE SET
 value_integer=EXCLUDED.value_integer, value_text=NULL, value_decimal=NULL, value_boolean=NULL, value_json=NULL;

INSERT INTO products
 (product_type_id, category_id, brand_id, model_code, product_name, short_description, description, product_status)
SELECT pt.product_type_id, c.category_id, b.brand_id, '11324-01-20G', 'Pulse Radeon RX 7600 8GB',
       'Pulse Radeon RX 7600 8GB - catalog tham khảo PC Builder Store.', 'Nguồn tham khảo: https://phongvu.vn/c/linh-kien-may-tinh',
       'ACTIVE'
FROM product_types pt
JOIN categories c ON c.category_code='GPU'
LEFT JOIN brands b ON b.brand_name='Sapphire'
WHERE pt.type_code='GPU'
ON CONFLICT (model_code) DO UPDATE SET
 product_type_id=EXCLUDED.product_type_id,
 category_id=EXCLUDED.category_id,
 brand_id=EXCLUDED.brand_id,
 product_name=EXCLUDED.product_name,
 short_description=EXCLUDED.short_description,
 description=EXCLUDED.description,
 product_status='ACTIVE';

INSERT INTO product_offers
 (product_id, offer_code, condition_code, price, currency_code, stock_quantity,
  reserved_quantity, warranty_months, offer_status)
SELECT p.product_id, 'DEMO-11324-01-20G', 'NEW',
       28000000, 'VND',
       5, 0, 36, 'ACTIVE'
FROM products p WHERE p.model_code='11324-01-20G'
ON CONFLICT (offer_code) DO UPDATE SET
 product_id=EXCLUDED.product_id,
 condition_code=EXCLUDED.condition_code,
 price=EXCLUDED.price,
 currency_code=EXCLUDED.currency_code,
 stock_quantity=EXCLUDED.stock_quantity,
 warranty_months=EXCLUDED.warranty_months,
 offer_status='ACTIVE';

INSERT INTO product_attribute_values
 (product_id, attribute_definition_id, value_integer)
SELECT p.product_id, ad.attribute_definition_id, 8
FROM products p
JOIN product_types pt ON pt.type_code='GPU'
JOIN product_attribute_definitions ad
 ON ad.product_type_id=pt.product_type_id AND ad.attribute_code='vram_gb'
WHERE p.model_code='11324-01-20G'
ON CONFLICT (product_id, attribute_definition_id) DO UPDATE SET
 value_integer=EXCLUDED.value_integer, value_text=NULL, value_decimal=NULL, value_boolean=NULL, value_json=NULL;

INSERT INTO products
 (product_type_id, category_id, brand_id, model_code, product_name, short_description, description, product_status)
SELECT pt.product_type_id, c.category_id, b.brand_id, 'RX7600-8G-F', 'Fighter Radeon RX 7600 8GB',
       'Fighter Radeon RX 7600 8GB - catalog tham khảo PC Builder Store.', 'Nguồn tham khảo: https://phongvu.vn/c/linh-kien-may-tinh',
       'ACTIVE'
FROM product_types pt
JOIN categories c ON c.category_code='GPU'
LEFT JOIN brands b ON b.brand_name='PowerColor'
WHERE pt.type_code='GPU'
ON CONFLICT (model_code) DO UPDATE SET
 product_type_id=EXCLUDED.product_type_id,
 category_id=EXCLUDED.category_id,
 brand_id=EXCLUDED.brand_id,
 product_name=EXCLUDED.product_name,
 short_description=EXCLUDED.short_description,
 description=EXCLUDED.description,
 product_status='ACTIVE';

INSERT INTO product_offers
 (product_id, offer_code, condition_code, price, currency_code, stock_quantity,
  reserved_quantity, warranty_months, offer_status)
SELECT p.product_id, 'DEMO-RX7600-8G-F', 'NEW',
       28000000, 'VND',
       5, 0, 36, 'ACTIVE'
FROM products p WHERE p.model_code='RX7600-8G-F'
ON CONFLICT (offer_code) DO UPDATE SET
 product_id=EXCLUDED.product_id,
 condition_code=EXCLUDED.condition_code,
 price=EXCLUDED.price,
 currency_code=EXCLUDED.currency_code,
 stock_quantity=EXCLUDED.stock_quantity,
 warranty_months=EXCLUDED.warranty_months,
 offer_status='ACTIVE';

INSERT INTO product_attribute_values
 (product_id, attribute_definition_id, value_integer)
SELECT p.product_id, ad.attribute_definition_id, 8
FROM products p
JOIN product_types pt ON pt.type_code='GPU'
JOIN product_attribute_definitions ad
 ON ad.product_type_id=pt.product_type_id AND ad.attribute_code='vram_gb'
WHERE p.model_code='RX7600-8G-F'
ON CONFLICT (product_id, attribute_definition_id) DO UPDATE SET
 value_integer=EXCLUDED.value_integer, value_text=NULL, value_decimal=NULL, value_boolean=NULL, value_json=NULL;

INSERT INTO products
 (product_type_id, category_id, brand_id, model_code, product_name, short_description, description, product_status)
SELECT pt.product_type_id, c.category_id, b.brand_id, '11335-04-20G', 'Pulse Radeon RX 7700 XT 12GB',
       'Pulse Radeon RX 7700 XT 12GB - catalog tham khảo PC Builder Store.', 'Nguồn tham khảo: https://phongvu.vn/c/linh-kien-may-tinh',
       'ACTIVE'
FROM product_types pt
JOIN categories c ON c.category_code='GPU'
LEFT JOIN brands b ON b.brand_name='Sapphire'
WHERE pt.type_code='GPU'
ON CONFLICT (model_code) DO UPDATE SET
 product_type_id=EXCLUDED.product_type_id,
 category_id=EXCLUDED.category_id,
 brand_id=EXCLUDED.brand_id,
 product_name=EXCLUDED.product_name,
 short_description=EXCLUDED.short_description,
 description=EXCLUDED.description,
 product_status='ACTIVE';

INSERT INTO product_offers
 (product_id, offer_code, condition_code, price, currency_code, stock_quantity,
  reserved_quantity, warranty_months, offer_status)
SELECT p.product_id, 'DEMO-11335-04-20G', 'NEW',
       28000000, 'VND',
       5, 0, 36, 'ACTIVE'
FROM products p WHERE p.model_code='11335-04-20G'
ON CONFLICT (offer_code) DO UPDATE SET
 product_id=EXCLUDED.product_id,
 condition_code=EXCLUDED.condition_code,
 price=EXCLUDED.price,
 currency_code=EXCLUDED.currency_code,
 stock_quantity=EXCLUDED.stock_quantity,
 warranty_months=EXCLUDED.warranty_months,
 offer_status='ACTIVE';

INSERT INTO product_attribute_values
 (product_id, attribute_definition_id, value_integer)
SELECT p.product_id, ad.attribute_definition_id, 12
FROM products p
JOIN product_types pt ON pt.type_code='GPU'
JOIN product_attribute_definitions ad
 ON ad.product_type_id=pt.product_type_id AND ad.attribute_code='vram_gb'
WHERE p.model_code='11335-04-20G'
ON CONFLICT (product_id, attribute_definition_id) DO UPDATE SET
 value_integer=EXCLUDED.value_integer, value_text=NULL, value_decimal=NULL, value_boolean=NULL, value_json=NULL;

INSERT INTO products
 (product_type_id, category_id, brand_id, model_code, product_name, short_description, description, product_status)
SELECT pt.product_type_id, c.category_id, b.brand_id, 'RX7800XT-SL-16GO', 'Radeon RX 7800 XT Steel Legend 16GB',
       'Radeon RX 7800 XT Steel Legend 16GB - catalog tham khảo PC Builder Store.', 'Nguồn tham khảo: https://www.asrock.com/',
       'ACTIVE'
FROM product_types pt
JOIN categories c ON c.category_code='GPU'
LEFT JOIN brands b ON b.brand_name='ASRock'
WHERE pt.type_code='GPU'
ON CONFLICT (model_code) DO UPDATE SET
 product_type_id=EXCLUDED.product_type_id,
 category_id=EXCLUDED.category_id,
 brand_id=EXCLUDED.brand_id,
 product_name=EXCLUDED.product_name,
 short_description=EXCLUDED.short_description,
 description=EXCLUDED.description,
 product_status='ACTIVE';

INSERT INTO product_offers
 (product_id, offer_code, condition_code, price, currency_code, stock_quantity,
  reserved_quantity, warranty_months, offer_status)
SELECT p.product_id, 'DEMO-RX7800XT-SL-16GO', 'NEW',
       28000000, 'VND',
       5, 0, 36, 'ACTIVE'
FROM products p WHERE p.model_code='RX7800XT-SL-16GO'
ON CONFLICT (offer_code) DO UPDATE SET
 product_id=EXCLUDED.product_id,
 condition_code=EXCLUDED.condition_code,
 price=EXCLUDED.price,
 currency_code=EXCLUDED.currency_code,
 stock_quantity=EXCLUDED.stock_quantity,
 warranty_months=EXCLUDED.warranty_months,
 offer_status='ACTIVE';

INSERT INTO product_attribute_values
 (product_id, attribute_definition_id, value_integer)
SELECT p.product_id, ad.attribute_definition_id, 16
FROM products p
JOIN product_types pt ON pt.type_code='GPU'
JOIN product_attribute_definitions ad
 ON ad.product_type_id=pt.product_type_id AND ad.attribute_code='vram_gb'
WHERE p.model_code='RX7800XT-SL-16GO'
ON CONFLICT (product_id, attribute_definition_id) DO UPDATE SET
 value_integer=EXCLUDED.value_integer, value_text=NULL, value_decimal=NULL, value_boolean=NULL, value_json=NULL;

INSERT INTO products
 (product_type_id, category_id, brand_id, model_code, product_name, short_description, description, product_status)
SELECT pt.product_type_id, c.category_id, b.brand_id, '11330-01-20G', 'Nitro+ Radeon RX 7800 XT 16GB',
       'Nitro+ Radeon RX 7800 XT 16GB - catalog tham khảo PC Builder Store.', 'Nguồn tham khảo: https://phongvu.vn/c/linh-kien-may-tinh',
       'ACTIVE'
FROM product_types pt
JOIN categories c ON c.category_code='GPU'
LEFT JOIN brands b ON b.brand_name='Sapphire'
WHERE pt.type_code='GPU'
ON CONFLICT (model_code) DO UPDATE SET
 product_type_id=EXCLUDED.product_type_id,
 category_id=EXCLUDED.category_id,
 brand_id=EXCLUDED.brand_id,
 product_name=EXCLUDED.product_name,
 short_description=EXCLUDED.short_description,
 description=EXCLUDED.description,
 product_status='ACTIVE';

INSERT INTO product_offers
 (product_id, offer_code, condition_code, price, currency_code, stock_quantity,
  reserved_quantity, warranty_months, offer_status)
SELECT p.product_id, 'DEMO-11330-01-20G', 'NEW',
       28000000, 'VND',
       5, 0, 36, 'ACTIVE'
FROM products p WHERE p.model_code='11330-01-20G'
ON CONFLICT (offer_code) DO UPDATE SET
 product_id=EXCLUDED.product_id,
 condition_code=EXCLUDED.condition_code,
 price=EXCLUDED.price,
 currency_code=EXCLUDED.currency_code,
 stock_quantity=EXCLUDED.stock_quantity,
 warranty_months=EXCLUDED.warranty_months,
 offer_status='ACTIVE';

INSERT INTO product_attribute_values
 (product_id, attribute_definition_id, value_integer)
SELECT p.product_id, ad.attribute_definition_id, 16
FROM products p
JOIN product_types pt ON pt.type_code='GPU'
JOIN product_attribute_definitions ad
 ON ad.product_type_id=pt.product_type_id AND ad.attribute_code='vram_gb'
WHERE p.model_code='11330-01-20G'
ON CONFLICT (product_id, attribute_definition_id) DO UPDATE SET
 value_integer=EXCLUDED.value_integer, value_text=NULL, value_decimal=NULL, value_boolean=NULL, value_json=NULL;

INSERT INTO products
 (product_type_id, category_id, brand_id, model_code, product_name, short_description, description, product_status)
SELECT pt.product_type_id, c.category_id, b.brand_id, 'PRIME-B760M-A-D4', 'PRIME B760M-A D4',
       'PRIME B760M-A D4 - catalog tham khảo PC Builder Store.', 'Nguồn tham khảo: https://www.asus.com/',
       'ACTIVE'
FROM product_types pt
JOIN categories c ON c.category_code='MAINBOARD'
LEFT JOIN brands b ON b.brand_name='ASUS'
WHERE pt.type_code='MOTHERBOARD'
ON CONFLICT (model_code) DO UPDATE SET
 product_type_id=EXCLUDED.product_type_id,
 category_id=EXCLUDED.category_id,
 brand_id=EXCLUDED.brand_id,
 product_name=EXCLUDED.product_name,
 short_description=EXCLUDED.short_description,
 description=EXCLUDED.description,
 product_status='ACTIVE';

INSERT INTO product_offers
 (product_id, offer_code, condition_code, price, currency_code, stock_quantity,
  reserved_quantity, warranty_months, offer_status)
SELECT p.product_id, 'DEMO-PRIME-B760M-A-D4', 'NEW',
       4000000, 'VND',
       5, 0, 36, 'ACTIVE'
FROM products p WHERE p.model_code='PRIME-B760M-A-D4'
ON CONFLICT (offer_code) DO UPDATE SET
 product_id=EXCLUDED.product_id,
 condition_code=EXCLUDED.condition_code,
 price=EXCLUDED.price,
 currency_code=EXCLUDED.currency_code,
 stock_quantity=EXCLUDED.stock_quantity,
 warranty_months=EXCLUDED.warranty_months,
 offer_status='ACTIVE';

INSERT INTO product_attribute_values
 (product_id, attribute_definition_id, value_text)
SELECT p.product_id, ad.attribute_definition_id, 'LGA1700'
FROM products p
JOIN product_types pt ON pt.type_code='MOTHERBOARD'
JOIN product_attribute_definitions ad
 ON ad.product_type_id=pt.product_type_id AND ad.attribute_code='socket'
WHERE p.model_code='PRIME-B760M-A-D4'
ON CONFLICT (product_id, attribute_definition_id) DO UPDATE SET
 value_text=EXCLUDED.value_text, value_decimal=NULL, value_integer=NULL, value_boolean=NULL, value_json=NULL;

INSERT INTO product_attribute_values
 (product_id, attribute_definition_id, value_text)
SELECT p.product_id, ad.attribute_definition_id, 'DDR4'
FROM products p
JOIN product_types pt ON pt.type_code='MOTHERBOARD'
JOIN product_attribute_definitions ad
 ON ad.product_type_id=pt.product_type_id AND ad.attribute_code='memory_type'
WHERE p.model_code='PRIME-B760M-A-D4'
ON CONFLICT (product_id, attribute_definition_id) DO UPDATE SET
 value_text=EXCLUDED.value_text, value_decimal=NULL, value_integer=NULL, value_boolean=NULL, value_json=NULL;

INSERT INTO product_attribute_values
 (product_id, attribute_definition_id, value_text)
SELECT p.product_id, ad.attribute_definition_id, 'mATX'
FROM products p
JOIN product_types pt ON pt.type_code='MOTHERBOARD'
JOIN product_attribute_definitions ad
 ON ad.product_type_id=pt.product_type_id AND ad.attribute_code='form_factor'
WHERE p.model_code='PRIME-B760M-A-D4'
ON CONFLICT (product_id, attribute_definition_id) DO UPDATE SET
 value_text=EXCLUDED.value_text, value_decimal=NULL, value_integer=NULL, value_boolean=NULL, value_json=NULL;

INSERT INTO products
 (product_type_id, category_id, brand_id, model_code, product_name, short_description, description, product_status)
SELECT pt.product_type_id, c.category_id, b.brand_id, 'PRO-B760M-A-WIFI-DDR4', 'PRO B760M-A WIFI DDR4',
       'PRO B760M-A WIFI DDR4 - catalog tham khảo PC Builder Store.', 'Nguồn tham khảo: https://www.msi.com/',
       'ACTIVE'
FROM product_types pt
JOIN categories c ON c.category_code='MAINBOARD'
LEFT JOIN brands b ON b.brand_name='MSI'
WHERE pt.type_code='MOTHERBOARD'
ON CONFLICT (model_code) DO UPDATE SET
 product_type_id=EXCLUDED.product_type_id,
 category_id=EXCLUDED.category_id,
 brand_id=EXCLUDED.brand_id,
 product_name=EXCLUDED.product_name,
 short_description=EXCLUDED.short_description,
 description=EXCLUDED.description,
 product_status='ACTIVE';

INSERT INTO product_offers
 (product_id, offer_code, condition_code, price, currency_code, stock_quantity,
  reserved_quantity, warranty_months, offer_status)
SELECT p.product_id, 'DEMO-PRO-B760M-A-WIFI-DDR4', 'NEW',
       4000000, 'VND',
       5, 0, 36, 'ACTIVE'
FROM products p WHERE p.model_code='PRO-B760M-A-WIFI-DDR4'
ON CONFLICT (offer_code) DO UPDATE SET
 product_id=EXCLUDED.product_id,
 condition_code=EXCLUDED.condition_code,
 price=EXCLUDED.price,
 currency_code=EXCLUDED.currency_code,
 stock_quantity=EXCLUDED.stock_quantity,
 warranty_months=EXCLUDED.warranty_months,
 offer_status='ACTIVE';

INSERT INTO product_attribute_values
 (product_id, attribute_definition_id, value_text)
SELECT p.product_id, ad.attribute_definition_id, 'LGA1700'
FROM products p
JOIN product_types pt ON pt.type_code='MOTHERBOARD'
JOIN product_attribute_definitions ad
 ON ad.product_type_id=pt.product_type_id AND ad.attribute_code='socket'
WHERE p.model_code='PRO-B760M-A-WIFI-DDR4'
ON CONFLICT (product_id, attribute_definition_id) DO UPDATE SET
 value_text=EXCLUDED.value_text, value_decimal=NULL, value_integer=NULL, value_boolean=NULL, value_json=NULL;

INSERT INTO product_attribute_values
 (product_id, attribute_definition_id, value_text)
SELECT p.product_id, ad.attribute_definition_id, 'DDR4'
FROM products p
JOIN product_types pt ON pt.type_code='MOTHERBOARD'
JOIN product_attribute_definitions ad
 ON ad.product_type_id=pt.product_type_id AND ad.attribute_code='memory_type'
WHERE p.model_code='PRO-B760M-A-WIFI-DDR4'
ON CONFLICT (product_id, attribute_definition_id) DO UPDATE SET
 value_text=EXCLUDED.value_text, value_decimal=NULL, value_integer=NULL, value_boolean=NULL, value_json=NULL;

INSERT INTO product_attribute_values
 (product_id, attribute_definition_id, value_text)
SELECT p.product_id, ad.attribute_definition_id, 'mATX'
FROM products p
JOIN product_types pt ON pt.type_code='MOTHERBOARD'
JOIN product_attribute_definitions ad
 ON ad.product_type_id=pt.product_type_id AND ad.attribute_code='form_factor'
WHERE p.model_code='PRO-B760M-A-WIFI-DDR4'
ON CONFLICT (product_id, attribute_definition_id) DO UPDATE SET
 value_text=EXCLUDED.value_text, value_decimal=NULL, value_integer=NULL, value_boolean=NULL, value_json=NULL;

INSERT INTO products
 (product_type_id, category_id, brand_id, model_code, product_name, short_description, description, product_status)
SELECT pt.product_type_id, c.category_id, b.brand_id, 'B760M-DS3H-DDR4', 'B760M DS3H DDR4',
       'B760M DS3H DDR4 - catalog tham khảo PC Builder Store.', 'Nguồn tham khảo: https://www.gigabyte.com/',
       'ACTIVE'
FROM product_types pt
JOIN categories c ON c.category_code='MAINBOARD'
LEFT JOIN brands b ON b.brand_name='Gigabyte'
WHERE pt.type_code='MOTHERBOARD'
ON CONFLICT (model_code) DO UPDATE SET
 product_type_id=EXCLUDED.product_type_id,
 category_id=EXCLUDED.category_id,
 brand_id=EXCLUDED.brand_id,
 product_name=EXCLUDED.product_name,
 short_description=EXCLUDED.short_description,
 description=EXCLUDED.description,
 product_status='ACTIVE';

INSERT INTO product_offers
 (product_id, offer_code, condition_code, price, currency_code, stock_quantity,
  reserved_quantity, warranty_months, offer_status)
SELECT p.product_id, 'DEMO-B760M-DS3H-DDR4', 'NEW',
       4000000, 'VND',
       5, 0, 36, 'ACTIVE'
FROM products p WHERE p.model_code='B760M-DS3H-DDR4'
ON CONFLICT (offer_code) DO UPDATE SET
 product_id=EXCLUDED.product_id,
 condition_code=EXCLUDED.condition_code,
 price=EXCLUDED.price,
 currency_code=EXCLUDED.currency_code,
 stock_quantity=EXCLUDED.stock_quantity,
 warranty_months=EXCLUDED.warranty_months,
 offer_status='ACTIVE';

INSERT INTO product_attribute_values
 (product_id, attribute_definition_id, value_text)
SELECT p.product_id, ad.attribute_definition_id, 'LGA1700'
FROM products p
JOIN product_types pt ON pt.type_code='MOTHERBOARD'
JOIN product_attribute_definitions ad
 ON ad.product_type_id=pt.product_type_id AND ad.attribute_code='socket'
WHERE p.model_code='B760M-DS3H-DDR4'
ON CONFLICT (product_id, attribute_definition_id) DO UPDATE SET
 value_text=EXCLUDED.value_text, value_decimal=NULL, value_integer=NULL, value_boolean=NULL, value_json=NULL;

INSERT INTO product_attribute_values
 (product_id, attribute_definition_id, value_text)
SELECT p.product_id, ad.attribute_definition_id, 'DDR4'
FROM products p
JOIN product_types pt ON pt.type_code='MOTHERBOARD'
JOIN product_attribute_definitions ad
 ON ad.product_type_id=pt.product_type_id AND ad.attribute_code='memory_type'
WHERE p.model_code='B760M-DS3H-DDR4'
ON CONFLICT (product_id, attribute_definition_id) DO UPDATE SET
 value_text=EXCLUDED.value_text, value_decimal=NULL, value_integer=NULL, value_boolean=NULL, value_json=NULL;

INSERT INTO product_attribute_values
 (product_id, attribute_definition_id, value_text)
SELECT p.product_id, ad.attribute_definition_id, 'mATX'
FROM products p
JOIN product_types pt ON pt.type_code='MOTHERBOARD'
JOIN product_attribute_definitions ad
 ON ad.product_type_id=pt.product_type_id AND ad.attribute_code='form_factor'
WHERE p.model_code='B760M-DS3H-DDR4'
ON CONFLICT (product_id, attribute_definition_id) DO UPDATE SET
 value_text=EXCLUDED.value_text, value_decimal=NULL, value_integer=NULL, value_boolean=NULL, value_json=NULL;

INSERT INTO products
 (product_type_id, category_id, brand_id, model_code, product_name, short_description, description, product_status)
SELECT pt.product_type_id, c.category_id, b.brand_id, 'B760M-PRO-RS-D4', 'B760M Pro RS/D4',
       'B760M Pro RS/D4 - catalog tham khảo PC Builder Store.', 'Nguồn tham khảo: https://www.asrock.com/',
       'ACTIVE'
FROM product_types pt
JOIN categories c ON c.category_code='MAINBOARD'
LEFT JOIN brands b ON b.brand_name='ASRock'
WHERE pt.type_code='MOTHERBOARD'
ON CONFLICT (model_code) DO UPDATE SET
 product_type_id=EXCLUDED.product_type_id,
 category_id=EXCLUDED.category_id,
 brand_id=EXCLUDED.brand_id,
 product_name=EXCLUDED.product_name,
 short_description=EXCLUDED.short_description,
 description=EXCLUDED.description,
 product_status='ACTIVE';

INSERT INTO product_offers
 (product_id, offer_code, condition_code, price, currency_code, stock_quantity,
  reserved_quantity, warranty_months, offer_status)
SELECT p.product_id, 'DEMO-B760M-PRO-RS-D4', 'NEW',
       4000000, 'VND',
       5, 0, 36, 'ACTIVE'
FROM products p WHERE p.model_code='B760M-PRO-RS-D4'
ON CONFLICT (offer_code) DO UPDATE SET
 product_id=EXCLUDED.product_id,
 condition_code=EXCLUDED.condition_code,
 price=EXCLUDED.price,
 currency_code=EXCLUDED.currency_code,
 stock_quantity=EXCLUDED.stock_quantity,
 warranty_months=EXCLUDED.warranty_months,
 offer_status='ACTIVE';

INSERT INTO product_attribute_values
 (product_id, attribute_definition_id, value_text)
SELECT p.product_id, ad.attribute_definition_id, 'LGA1700'
FROM products p
JOIN product_types pt ON pt.type_code='MOTHERBOARD'
JOIN product_attribute_definitions ad
 ON ad.product_type_id=pt.product_type_id AND ad.attribute_code='socket'
WHERE p.model_code='B760M-PRO-RS-D4'
ON CONFLICT (product_id, attribute_definition_id) DO UPDATE SET
 value_text=EXCLUDED.value_text, value_decimal=NULL, value_integer=NULL, value_boolean=NULL, value_json=NULL;

INSERT INTO product_attribute_values
 (product_id, attribute_definition_id, value_text)
SELECT p.product_id, ad.attribute_definition_id, 'DDR4'
FROM products p
JOIN product_types pt ON pt.type_code='MOTHERBOARD'
JOIN product_attribute_definitions ad
 ON ad.product_type_id=pt.product_type_id AND ad.attribute_code='memory_type'
WHERE p.model_code='B760M-PRO-RS-D4'
ON CONFLICT (product_id, attribute_definition_id) DO UPDATE SET
 value_text=EXCLUDED.value_text, value_decimal=NULL, value_integer=NULL, value_boolean=NULL, value_json=NULL;

INSERT INTO product_attribute_values
 (product_id, attribute_definition_id, value_text)
SELECT p.product_id, ad.attribute_definition_id, 'mATX'
FROM products p
JOIN product_types pt ON pt.type_code='MOTHERBOARD'
JOIN product_attribute_definitions ad
 ON ad.product_type_id=pt.product_type_id AND ad.attribute_code='form_factor'
WHERE p.model_code='B760M-PRO-RS-D4'
ON CONFLICT (product_id, attribute_definition_id) DO UPDATE SET
 value_text=EXCLUDED.value_text, value_decimal=NULL, value_integer=NULL, value_boolean=NULL, value_json=NULL;

INSERT INTO products
 (product_type_id, category_id, brand_id, model_code, product_name, short_description, description, product_status)
SELECT pt.product_type_id, c.category_id, b.brand_id, 'TUF-B760-PLUS-WIFI-D4', 'TUF Gaming B760-PLUS WIFI D4',
       'TUF Gaming B760-PLUS WIFI D4 - catalog tham khảo PC Builder Store.', 'Nguồn tham khảo: https://www.asus.com/',
       'ACTIVE'
FROM product_types pt
JOIN categories c ON c.category_code='MAINBOARD'
LEFT JOIN brands b ON b.brand_name='ASUS'
WHERE pt.type_code='MOTHERBOARD'
ON CONFLICT (model_code) DO UPDATE SET
 product_type_id=EXCLUDED.product_type_id,
 category_id=EXCLUDED.category_id,
 brand_id=EXCLUDED.brand_id,
 product_name=EXCLUDED.product_name,
 short_description=EXCLUDED.short_description,
 description=EXCLUDED.description,
 product_status='ACTIVE';

INSERT INTO product_offers
 (product_id, offer_code, condition_code, price, currency_code, stock_quantity,
  reserved_quantity, warranty_months, offer_status)
SELECT p.product_id, 'DEMO-TUF-B760-PLUS-WIFI-D4', 'NEW',
       4000000, 'VND',
       5, 0, 36, 'ACTIVE'
FROM products p WHERE p.model_code='TUF-B760-PLUS-WIFI-D4'
ON CONFLICT (offer_code) DO UPDATE SET
 product_id=EXCLUDED.product_id,
 condition_code=EXCLUDED.condition_code,
 price=EXCLUDED.price,
 currency_code=EXCLUDED.currency_code,
 stock_quantity=EXCLUDED.stock_quantity,
 warranty_months=EXCLUDED.warranty_months,
 offer_status='ACTIVE';

INSERT INTO product_attribute_values
 (product_id, attribute_definition_id, value_text)
SELECT p.product_id, ad.attribute_definition_id, 'LGA1700'
FROM products p
JOIN product_types pt ON pt.type_code='MOTHERBOARD'
JOIN product_attribute_definitions ad
 ON ad.product_type_id=pt.product_type_id AND ad.attribute_code='socket'
WHERE p.model_code='TUF-B760-PLUS-WIFI-D4'
ON CONFLICT (product_id, attribute_definition_id) DO UPDATE SET
 value_text=EXCLUDED.value_text, value_decimal=NULL, value_integer=NULL, value_boolean=NULL, value_json=NULL;

INSERT INTO product_attribute_values
 (product_id, attribute_definition_id, value_text)
SELECT p.product_id, ad.attribute_definition_id, 'DDR4'
FROM products p
JOIN product_types pt ON pt.type_code='MOTHERBOARD'
JOIN product_attribute_definitions ad
 ON ad.product_type_id=pt.product_type_id AND ad.attribute_code='memory_type'
WHERE p.model_code='TUF-B760-PLUS-WIFI-D4'
ON CONFLICT (product_id, attribute_definition_id) DO UPDATE SET
 value_text=EXCLUDED.value_text, value_decimal=NULL, value_integer=NULL, value_boolean=NULL, value_json=NULL;

INSERT INTO product_attribute_values
 (product_id, attribute_definition_id, value_text)
SELECT p.product_id, ad.attribute_definition_id, 'ATX'
FROM products p
JOIN product_types pt ON pt.type_code='MOTHERBOARD'
JOIN product_attribute_definitions ad
 ON ad.product_type_id=pt.product_type_id AND ad.attribute_code='form_factor'
WHERE p.model_code='TUF-B760-PLUS-WIFI-D4'
ON CONFLICT (product_id, attribute_definition_id) DO UPDATE SET
 value_text=EXCLUDED.value_text, value_decimal=NULL, value_integer=NULL, value_boolean=NULL, value_json=NULL;

INSERT INTO products
 (product_type_id, category_id, brand_id, model_code, product_name, short_description, description, product_status)
SELECT pt.product_type_id, c.category_id, b.brand_id, 'MAG-B760-TOMAHAWK-WIFI', 'MAG B760 Tomahawk WIFI',
       'MAG B760 Tomahawk WIFI - catalog tham khảo PC Builder Store.', 'Nguồn tham khảo: https://www.msi.com/',
       'ACTIVE'
FROM product_types pt
JOIN categories c ON c.category_code='MAINBOARD'
LEFT JOIN brands b ON b.brand_name='MSI'
WHERE pt.type_code='MOTHERBOARD'
ON CONFLICT (model_code) DO UPDATE SET
 product_type_id=EXCLUDED.product_type_id,
 category_id=EXCLUDED.category_id,
 brand_id=EXCLUDED.brand_id,
 product_name=EXCLUDED.product_name,
 short_description=EXCLUDED.short_description,
 description=EXCLUDED.description,
 product_status='ACTIVE';

INSERT INTO product_offers
 (product_id, offer_code, condition_code, price, currency_code, stock_quantity,
  reserved_quantity, warranty_months, offer_status)
SELECT p.product_id, 'DEMO-MAG-B760-TOMAHAWK-WIFI', 'NEW',
       4000000, 'VND',
       5, 0, 36, 'ACTIVE'
FROM products p WHERE p.model_code='MAG-B760-TOMAHAWK-WIFI'
ON CONFLICT (offer_code) DO UPDATE SET
 product_id=EXCLUDED.product_id,
 condition_code=EXCLUDED.condition_code,
 price=EXCLUDED.price,
 currency_code=EXCLUDED.currency_code,
 stock_quantity=EXCLUDED.stock_quantity,
 warranty_months=EXCLUDED.warranty_months,
 offer_status='ACTIVE';

INSERT INTO product_attribute_values
 (product_id, attribute_definition_id, value_text)
SELECT p.product_id, ad.attribute_definition_id, 'LGA1700'
FROM products p
JOIN product_types pt ON pt.type_code='MOTHERBOARD'
JOIN product_attribute_definitions ad
 ON ad.product_type_id=pt.product_type_id AND ad.attribute_code='socket'
WHERE p.model_code='MAG-B760-TOMAHAWK-WIFI'
ON CONFLICT (product_id, attribute_definition_id) DO UPDATE SET
 value_text=EXCLUDED.value_text, value_decimal=NULL, value_integer=NULL, value_boolean=NULL, value_json=NULL;

INSERT INTO product_attribute_values
 (product_id, attribute_definition_id, value_text)
SELECT p.product_id, ad.attribute_definition_id, 'DDR5'
FROM products p
JOIN product_types pt ON pt.type_code='MOTHERBOARD'
JOIN product_attribute_definitions ad
 ON ad.product_type_id=pt.product_type_id AND ad.attribute_code='memory_type'
WHERE p.model_code='MAG-B760-TOMAHAWK-WIFI'
ON CONFLICT (product_id, attribute_definition_id) DO UPDATE SET
 value_text=EXCLUDED.value_text, value_decimal=NULL, value_integer=NULL, value_boolean=NULL, value_json=NULL;

INSERT INTO product_attribute_values
 (product_id, attribute_definition_id, value_text)
SELECT p.product_id, ad.attribute_definition_id, 'ATX'
FROM products p
JOIN product_types pt ON pt.type_code='MOTHERBOARD'
JOIN product_attribute_definitions ad
 ON ad.product_type_id=pt.product_type_id AND ad.attribute_code='form_factor'
WHERE p.model_code='MAG-B760-TOMAHAWK-WIFI'
ON CONFLICT (product_id, attribute_definition_id) DO UPDATE SET
 value_text=EXCLUDED.value_text, value_decimal=NULL, value_integer=NULL, value_boolean=NULL, value_json=NULL;

INSERT INTO products
 (product_type_id, category_id, brand_id, model_code, product_name, short_description, description, product_status)
SELECT pt.product_type_id, c.category_id, b.brand_id, 'B760-AORUS-ELITE-AX', 'B760 AORUS ELITE AX',
       'B760 AORUS ELITE AX - catalog tham khảo PC Builder Store.', 'Nguồn tham khảo: https://www.gigabyte.com/',
       'ACTIVE'
FROM product_types pt
JOIN categories c ON c.category_code='MAINBOARD'
LEFT JOIN brands b ON b.brand_name='Gigabyte'
WHERE pt.type_code='MOTHERBOARD'
ON CONFLICT (model_code) DO UPDATE SET
 product_type_id=EXCLUDED.product_type_id,
 category_id=EXCLUDED.category_id,
 brand_id=EXCLUDED.brand_id,
 product_name=EXCLUDED.product_name,
 short_description=EXCLUDED.short_description,
 description=EXCLUDED.description,
 product_status='ACTIVE';

INSERT INTO product_offers
 (product_id, offer_code, condition_code, price, currency_code, stock_quantity,
  reserved_quantity, warranty_months, offer_status)
SELECT p.product_id, 'DEMO-B760-AORUS-ELITE-AX', 'NEW',
       4000000, 'VND',
       5, 0, 36, 'ACTIVE'
FROM products p WHERE p.model_code='B760-AORUS-ELITE-AX'
ON CONFLICT (offer_code) DO UPDATE SET
 product_id=EXCLUDED.product_id,
 condition_code=EXCLUDED.condition_code,
 price=EXCLUDED.price,
 currency_code=EXCLUDED.currency_code,
 stock_quantity=EXCLUDED.stock_quantity,
 warranty_months=EXCLUDED.warranty_months,
 offer_status='ACTIVE';

INSERT INTO product_attribute_values
 (product_id, attribute_definition_id, value_text)
SELECT p.product_id, ad.attribute_definition_id, 'LGA1700'
FROM products p
JOIN product_types pt ON pt.type_code='MOTHERBOARD'
JOIN product_attribute_definitions ad
 ON ad.product_type_id=pt.product_type_id AND ad.attribute_code='socket'
WHERE p.model_code='B760-AORUS-ELITE-AX'
ON CONFLICT (product_id, attribute_definition_id) DO UPDATE SET
 value_text=EXCLUDED.value_text, value_decimal=NULL, value_integer=NULL, value_boolean=NULL, value_json=NULL;

INSERT INTO product_attribute_values
 (product_id, attribute_definition_id, value_text)
SELECT p.product_id, ad.attribute_definition_id, 'DDR5'
FROM products p
JOIN product_types pt ON pt.type_code='MOTHERBOARD'
JOIN product_attribute_definitions ad
 ON ad.product_type_id=pt.product_type_id AND ad.attribute_code='memory_type'
WHERE p.model_code='B760-AORUS-ELITE-AX'
ON CONFLICT (product_id, attribute_definition_id) DO UPDATE SET
 value_text=EXCLUDED.value_text, value_decimal=NULL, value_integer=NULL, value_boolean=NULL, value_json=NULL;

INSERT INTO product_attribute_values
 (product_id, attribute_definition_id, value_text)
SELECT p.product_id, ad.attribute_definition_id, 'ATX'
FROM products p
JOIN product_types pt ON pt.type_code='MOTHERBOARD'
JOIN product_attribute_definitions ad
 ON ad.product_type_id=pt.product_type_id AND ad.attribute_code='form_factor'
WHERE p.model_code='B760-AORUS-ELITE-AX'
ON CONFLICT (product_id, attribute_definition_id) DO UPDATE SET
 value_text=EXCLUDED.value_text, value_decimal=NULL, value_integer=NULL, value_boolean=NULL, value_json=NULL;

INSERT INTO products
 (product_type_id, category_id, brand_id, model_code, product_name, short_description, description, product_status)
SELECT pt.product_type_id, c.category_id, b.brand_id, 'TUF-Z790-PLUS-WIFI', 'TUF Gaming Z790-PLUS WIFI',
       'TUF Gaming Z790-PLUS WIFI - catalog tham khảo PC Builder Store.', 'Nguồn tham khảo: https://www.asus.com/',
       'ACTIVE'
FROM product_types pt
JOIN categories c ON c.category_code='MAINBOARD'
LEFT JOIN brands b ON b.brand_name='ASUS'
WHERE pt.type_code='MOTHERBOARD'
ON CONFLICT (model_code) DO UPDATE SET
 product_type_id=EXCLUDED.product_type_id,
 category_id=EXCLUDED.category_id,
 brand_id=EXCLUDED.brand_id,
 product_name=EXCLUDED.product_name,
 short_description=EXCLUDED.short_description,
 description=EXCLUDED.description,
 product_status='ACTIVE';

INSERT INTO product_offers
 (product_id, offer_code, condition_code, price, currency_code, stock_quantity,
  reserved_quantity, warranty_months, offer_status)
SELECT p.product_id, 'DEMO-TUF-Z790-PLUS-WIFI', 'NEW',
       4000000, 'VND',
       5, 0, 36, 'ACTIVE'
FROM products p WHERE p.model_code='TUF-Z790-PLUS-WIFI'
ON CONFLICT (offer_code) DO UPDATE SET
 product_id=EXCLUDED.product_id,
 condition_code=EXCLUDED.condition_code,
 price=EXCLUDED.price,
 currency_code=EXCLUDED.currency_code,
 stock_quantity=EXCLUDED.stock_quantity,
 warranty_months=EXCLUDED.warranty_months,
 offer_status='ACTIVE';

INSERT INTO product_attribute_values
 (product_id, attribute_definition_id, value_text)
SELECT p.product_id, ad.attribute_definition_id, 'LGA1700'
FROM products p
JOIN product_types pt ON pt.type_code='MOTHERBOARD'
JOIN product_attribute_definitions ad
 ON ad.product_type_id=pt.product_type_id AND ad.attribute_code='socket'
WHERE p.model_code='TUF-Z790-PLUS-WIFI'
ON CONFLICT (product_id, attribute_definition_id) DO UPDATE SET
 value_text=EXCLUDED.value_text, value_decimal=NULL, value_integer=NULL, value_boolean=NULL, value_json=NULL;

INSERT INTO product_attribute_values
 (product_id, attribute_definition_id, value_text)
SELECT p.product_id, ad.attribute_definition_id, 'DDR5'
FROM products p
JOIN product_types pt ON pt.type_code='MOTHERBOARD'
JOIN product_attribute_definitions ad
 ON ad.product_type_id=pt.product_type_id AND ad.attribute_code='memory_type'
WHERE p.model_code='TUF-Z790-PLUS-WIFI'
ON CONFLICT (product_id, attribute_definition_id) DO UPDATE SET
 value_text=EXCLUDED.value_text, value_decimal=NULL, value_integer=NULL, value_boolean=NULL, value_json=NULL;

INSERT INTO product_attribute_values
 (product_id, attribute_definition_id, value_text)
SELECT p.product_id, ad.attribute_definition_id, 'ATX'
FROM products p
JOIN product_types pt ON pt.type_code='MOTHERBOARD'
JOIN product_attribute_definitions ad
 ON ad.product_type_id=pt.product_type_id AND ad.attribute_code='form_factor'
WHERE p.model_code='TUF-Z790-PLUS-WIFI'
ON CONFLICT (product_id, attribute_definition_id) DO UPDATE SET
 value_text=EXCLUDED.value_text, value_decimal=NULL, value_integer=NULL, value_boolean=NULL, value_json=NULL;

INSERT INTO products
 (product_type_id, category_id, brand_id, model_code, product_name, short_description, description, product_status)
SELECT pt.product_type_id, c.category_id, b.brand_id, 'PRO-Z790-A-MAX-WIFI', 'PRO Z790-A MAX WIFI',
       'PRO Z790-A MAX WIFI - catalog tham khảo PC Builder Store.', 'Nguồn tham khảo: https://www.msi.com/',
       'ACTIVE'
FROM product_types pt
JOIN categories c ON c.category_code='MAINBOARD'
LEFT JOIN brands b ON b.brand_name='MSI'
WHERE pt.type_code='MOTHERBOARD'
ON CONFLICT (model_code) DO UPDATE SET
 product_type_id=EXCLUDED.product_type_id,
 category_id=EXCLUDED.category_id,
 brand_id=EXCLUDED.brand_id,
 product_name=EXCLUDED.product_name,
 short_description=EXCLUDED.short_description,
 description=EXCLUDED.description,
 product_status='ACTIVE';

INSERT INTO product_offers
 (product_id, offer_code, condition_code, price, currency_code, stock_quantity,
  reserved_quantity, warranty_months, offer_status)
SELECT p.product_id, 'DEMO-PRO-Z790-A-MAX-WIFI', 'NEW',
       4000000, 'VND',
       5, 0, 36, 'ACTIVE'
FROM products p WHERE p.model_code='PRO-Z790-A-MAX-WIFI'
ON CONFLICT (offer_code) DO UPDATE SET
 product_id=EXCLUDED.product_id,
 condition_code=EXCLUDED.condition_code,
 price=EXCLUDED.price,
 currency_code=EXCLUDED.currency_code,
 stock_quantity=EXCLUDED.stock_quantity,
 warranty_months=EXCLUDED.warranty_months,
 offer_status='ACTIVE';

INSERT INTO product_attribute_values
 (product_id, attribute_definition_id, value_text)
SELECT p.product_id, ad.attribute_definition_id, 'LGA1700'
FROM products p
JOIN product_types pt ON pt.type_code='MOTHERBOARD'
JOIN product_attribute_definitions ad
 ON ad.product_type_id=pt.product_type_id AND ad.attribute_code='socket'
WHERE p.model_code='PRO-Z790-A-MAX-WIFI'
ON CONFLICT (product_id, attribute_definition_id) DO UPDATE SET
 value_text=EXCLUDED.value_text, value_decimal=NULL, value_integer=NULL, value_boolean=NULL, value_json=NULL;

INSERT INTO product_attribute_values
 (product_id, attribute_definition_id, value_text)
SELECT p.product_id, ad.attribute_definition_id, 'DDR5'
FROM products p
JOIN product_types pt ON pt.type_code='MOTHERBOARD'
JOIN product_attribute_definitions ad
 ON ad.product_type_id=pt.product_type_id AND ad.attribute_code='memory_type'
WHERE p.model_code='PRO-Z790-A-MAX-WIFI'
ON CONFLICT (product_id, attribute_definition_id) DO UPDATE SET
 value_text=EXCLUDED.value_text, value_decimal=NULL, value_integer=NULL, value_boolean=NULL, value_json=NULL;

INSERT INTO product_attribute_values
 (product_id, attribute_definition_id, value_text)
SELECT p.product_id, ad.attribute_definition_id, 'ATX'
FROM products p
JOIN product_types pt ON pt.type_code='MOTHERBOARD'
JOIN product_attribute_definitions ad
 ON ad.product_type_id=pt.product_type_id AND ad.attribute_code='form_factor'
WHERE p.model_code='PRO-Z790-A-MAX-WIFI'
ON CONFLICT (product_id, attribute_definition_id) DO UPDATE SET
 value_text=EXCLUDED.value_text, value_decimal=NULL, value_integer=NULL, value_boolean=NULL, value_json=NULL;

INSERT INTO products
 (product_type_id, category_id, brand_id, model_code, product_name, short_description, description, product_status)
SELECT pt.product_type_id, c.category_id, b.brand_id, 'Z790-STEEL-LEGEND-WIFI', 'Z790 Steel Legend WiFi',
       'Z790 Steel Legend WiFi - catalog tham khảo PC Builder Store.', 'Nguồn tham khảo: https://www.asrock.com/',
       'ACTIVE'
FROM product_types pt
JOIN categories c ON c.category_code='MAINBOARD'
LEFT JOIN brands b ON b.brand_name='ASRock'
WHERE pt.type_code='MOTHERBOARD'
ON CONFLICT (model_code) DO UPDATE SET
 product_type_id=EXCLUDED.product_type_id,
 category_id=EXCLUDED.category_id,
 brand_id=EXCLUDED.brand_id,
 product_name=EXCLUDED.product_name,
 short_description=EXCLUDED.short_description,
 description=EXCLUDED.description,
 product_status='ACTIVE';

INSERT INTO product_offers
 (product_id, offer_code, condition_code, price, currency_code, stock_quantity,
  reserved_quantity, warranty_months, offer_status)
SELECT p.product_id, 'DEMO-Z790-STEEL-LEGEND-WIFI', 'NEW',
       4000000, 'VND',
       5, 0, 36, 'ACTIVE'
FROM products p WHERE p.model_code='Z790-STEEL-LEGEND-WIFI'
ON CONFLICT (offer_code) DO UPDATE SET
 product_id=EXCLUDED.product_id,
 condition_code=EXCLUDED.condition_code,
 price=EXCLUDED.price,
 currency_code=EXCLUDED.currency_code,
 stock_quantity=EXCLUDED.stock_quantity,
 warranty_months=EXCLUDED.warranty_months,
 offer_status='ACTIVE';

INSERT INTO product_attribute_values
 (product_id, attribute_definition_id, value_text)
SELECT p.product_id, ad.attribute_definition_id, 'LGA1700'
FROM products p
JOIN product_types pt ON pt.type_code='MOTHERBOARD'
JOIN product_attribute_definitions ad
 ON ad.product_type_id=pt.product_type_id AND ad.attribute_code='socket'
WHERE p.model_code='Z790-STEEL-LEGEND-WIFI'
ON CONFLICT (product_id, attribute_definition_id) DO UPDATE SET
 value_text=EXCLUDED.value_text, value_decimal=NULL, value_integer=NULL, value_boolean=NULL, value_json=NULL;

INSERT INTO product_attribute_values
 (product_id, attribute_definition_id, value_text)
SELECT p.product_id, ad.attribute_definition_id, 'DDR5'
FROM products p
JOIN product_types pt ON pt.type_code='MOTHERBOARD'
JOIN product_attribute_definitions ad
 ON ad.product_type_id=pt.product_type_id AND ad.attribute_code='memory_type'
WHERE p.model_code='Z790-STEEL-LEGEND-WIFI'
ON CONFLICT (product_id, attribute_definition_id) DO UPDATE SET
 value_text=EXCLUDED.value_text, value_decimal=NULL, value_integer=NULL, value_boolean=NULL, value_json=NULL;

INSERT INTO product_attribute_values
 (product_id, attribute_definition_id, value_text)
SELECT p.product_id, ad.attribute_definition_id, 'ATX'
FROM products p
JOIN product_types pt ON pt.type_code='MOTHERBOARD'
JOIN product_attribute_definitions ad
 ON ad.product_type_id=pt.product_type_id AND ad.attribute_code='form_factor'
WHERE p.model_code='Z790-STEEL-LEGEND-WIFI'
ON CONFLICT (product_id, attribute_definition_id) DO UPDATE SET
 value_text=EXCLUDED.value_text, value_decimal=NULL, value_integer=NULL, value_boolean=NULL, value_json=NULL;

INSERT INTO products
 (product_type_id, category_id, brand_id, model_code, product_name, short_description, description, product_status)
SELECT pt.product_type_id, c.category_id, b.brand_id, 'PRIME-B650M-A-WIFI-II', 'PRIME B650M-A WIFI II',
       'PRIME B650M-A WIFI II - catalog tham khảo PC Builder Store.', 'Nguồn tham khảo: https://www.asus.com/',
       'ACTIVE'
FROM product_types pt
JOIN categories c ON c.category_code='MAINBOARD'
LEFT JOIN brands b ON b.brand_name='ASUS'
WHERE pt.type_code='MOTHERBOARD'
ON CONFLICT (model_code) DO UPDATE SET
 product_type_id=EXCLUDED.product_type_id,
 category_id=EXCLUDED.category_id,
 brand_id=EXCLUDED.brand_id,
 product_name=EXCLUDED.product_name,
 short_description=EXCLUDED.short_description,
 description=EXCLUDED.description,
 product_status='ACTIVE';

INSERT INTO product_offers
 (product_id, offer_code, condition_code, price, currency_code, stock_quantity,
  reserved_quantity, warranty_months, offer_status)
SELECT p.product_id, 'DEMO-PRIME-B650M-A-WIFI-II', 'NEW',
       4000000, 'VND',
       5, 0, 36, 'ACTIVE'
FROM products p WHERE p.model_code='PRIME-B650M-A-WIFI-II'
ON CONFLICT (offer_code) DO UPDATE SET
 product_id=EXCLUDED.product_id,
 condition_code=EXCLUDED.condition_code,
 price=EXCLUDED.price,
 currency_code=EXCLUDED.currency_code,
 stock_quantity=EXCLUDED.stock_quantity,
 warranty_months=EXCLUDED.warranty_months,
 offer_status='ACTIVE';

INSERT INTO product_attribute_values
 (product_id, attribute_definition_id, value_text)
SELECT p.product_id, ad.attribute_definition_id, 'AM5'
FROM products p
JOIN product_types pt ON pt.type_code='MOTHERBOARD'
JOIN product_attribute_definitions ad
 ON ad.product_type_id=pt.product_type_id AND ad.attribute_code='socket'
WHERE p.model_code='PRIME-B650M-A-WIFI-II'
ON CONFLICT (product_id, attribute_definition_id) DO UPDATE SET
 value_text=EXCLUDED.value_text, value_decimal=NULL, value_integer=NULL, value_boolean=NULL, value_json=NULL;

INSERT INTO product_attribute_values
 (product_id, attribute_definition_id, value_text)
SELECT p.product_id, ad.attribute_definition_id, 'DDR5'
FROM products p
JOIN product_types pt ON pt.type_code='MOTHERBOARD'
JOIN product_attribute_definitions ad
 ON ad.product_type_id=pt.product_type_id AND ad.attribute_code='memory_type'
WHERE p.model_code='PRIME-B650M-A-WIFI-II'
ON CONFLICT (product_id, attribute_definition_id) DO UPDATE SET
 value_text=EXCLUDED.value_text, value_decimal=NULL, value_integer=NULL, value_boolean=NULL, value_json=NULL;

INSERT INTO product_attribute_values
 (product_id, attribute_definition_id, value_text)
SELECT p.product_id, ad.attribute_definition_id, 'mATX'
FROM products p
JOIN product_types pt ON pt.type_code='MOTHERBOARD'
JOIN product_attribute_definitions ad
 ON ad.product_type_id=pt.product_type_id AND ad.attribute_code='form_factor'
WHERE p.model_code='PRIME-B650M-A-WIFI-II'
ON CONFLICT (product_id, attribute_definition_id) DO UPDATE SET
 value_text=EXCLUDED.value_text, value_decimal=NULL, value_integer=NULL, value_boolean=NULL, value_json=NULL;

INSERT INTO products
 (product_type_id, category_id, brand_id, model_code, product_name, short_description, description, product_status)
SELECT pt.product_type_id, c.category_id, b.brand_id, 'PRO-B650M-A-WIFI', 'PRO B650M-A WIFI',
       'PRO B650M-A WIFI - catalog tham khảo PC Builder Store.', 'Nguồn tham khảo: https://www.msi.com/',
       'ACTIVE'
FROM product_types pt
JOIN categories c ON c.category_code='MAINBOARD'
LEFT JOIN brands b ON b.brand_name='MSI'
WHERE pt.type_code='MOTHERBOARD'
ON CONFLICT (model_code) DO UPDATE SET
 product_type_id=EXCLUDED.product_type_id,
 category_id=EXCLUDED.category_id,
 brand_id=EXCLUDED.brand_id,
 product_name=EXCLUDED.product_name,
 short_description=EXCLUDED.short_description,
 description=EXCLUDED.description,
 product_status='ACTIVE';

INSERT INTO product_offers
 (product_id, offer_code, condition_code, price, currency_code, stock_quantity,
  reserved_quantity, warranty_months, offer_status)
SELECT p.product_id, 'DEMO-PRO-B650M-A-WIFI', 'NEW',
       4000000, 'VND',
       5, 0, 36, 'ACTIVE'
FROM products p WHERE p.model_code='PRO-B650M-A-WIFI'
ON CONFLICT (offer_code) DO UPDATE SET
 product_id=EXCLUDED.product_id,
 condition_code=EXCLUDED.condition_code,
 price=EXCLUDED.price,
 currency_code=EXCLUDED.currency_code,
 stock_quantity=EXCLUDED.stock_quantity,
 warranty_months=EXCLUDED.warranty_months,
 offer_status='ACTIVE';

INSERT INTO product_attribute_values
 (product_id, attribute_definition_id, value_text)
SELECT p.product_id, ad.attribute_definition_id, 'AM5'
FROM products p
JOIN product_types pt ON pt.type_code='MOTHERBOARD'
JOIN product_attribute_definitions ad
 ON ad.product_type_id=pt.product_type_id AND ad.attribute_code='socket'
WHERE p.model_code='PRO-B650M-A-WIFI'
ON CONFLICT (product_id, attribute_definition_id) DO UPDATE SET
 value_text=EXCLUDED.value_text, value_decimal=NULL, value_integer=NULL, value_boolean=NULL, value_json=NULL;

INSERT INTO product_attribute_values
 (product_id, attribute_definition_id, value_text)
SELECT p.product_id, ad.attribute_definition_id, 'DDR5'
FROM products p
JOIN product_types pt ON pt.type_code='MOTHERBOARD'
JOIN product_attribute_definitions ad
 ON ad.product_type_id=pt.product_type_id AND ad.attribute_code='memory_type'
WHERE p.model_code='PRO-B650M-A-WIFI'
ON CONFLICT (product_id, attribute_definition_id) DO UPDATE SET
 value_text=EXCLUDED.value_text, value_decimal=NULL, value_integer=NULL, value_boolean=NULL, value_json=NULL;

INSERT INTO product_attribute_values
 (product_id, attribute_definition_id, value_text)
SELECT p.product_id, ad.attribute_definition_id, 'mATX'
FROM products p
JOIN product_types pt ON pt.type_code='MOTHERBOARD'
JOIN product_attribute_definitions ad
 ON ad.product_type_id=pt.product_type_id AND ad.attribute_code='form_factor'
WHERE p.model_code='PRO-B650M-A-WIFI'
ON CONFLICT (product_id, attribute_definition_id) DO UPDATE SET
 value_text=EXCLUDED.value_text, value_decimal=NULL, value_integer=NULL, value_boolean=NULL, value_json=NULL;

INSERT INTO products
 (product_type_id, category_id, brand_id, model_code, product_name, short_description, description, product_status)
SELECT pt.product_type_id, c.category_id, b.brand_id, 'B650-AORUS-ELITE-AX', 'B650 AORUS ELITE AX',
       'B650 AORUS ELITE AX - catalog tham khảo PC Builder Store.', 'Nguồn tham khảo: https://www.gigabyte.com/',
       'ACTIVE'
FROM product_types pt
JOIN categories c ON c.category_code='MAINBOARD'
LEFT JOIN brands b ON b.brand_name='Gigabyte'
WHERE pt.type_code='MOTHERBOARD'
ON CONFLICT (model_code) DO UPDATE SET
 product_type_id=EXCLUDED.product_type_id,
 category_id=EXCLUDED.category_id,
 brand_id=EXCLUDED.brand_id,
 product_name=EXCLUDED.product_name,
 short_description=EXCLUDED.short_description,
 description=EXCLUDED.description,
 product_status='ACTIVE';

INSERT INTO product_offers
 (product_id, offer_code, condition_code, price, currency_code, stock_quantity,
  reserved_quantity, warranty_months, offer_status)
SELECT p.product_id, 'DEMO-B650-AORUS-ELITE-AX', 'NEW',
       4000000, 'VND',
       5, 0, 36, 'ACTIVE'
FROM products p WHERE p.model_code='B650-AORUS-ELITE-AX'
ON CONFLICT (offer_code) DO UPDATE SET
 product_id=EXCLUDED.product_id,
 condition_code=EXCLUDED.condition_code,
 price=EXCLUDED.price,
 currency_code=EXCLUDED.currency_code,
 stock_quantity=EXCLUDED.stock_quantity,
 warranty_months=EXCLUDED.warranty_months,
 offer_status='ACTIVE';

INSERT INTO product_attribute_values
 (product_id, attribute_definition_id, value_text)
SELECT p.product_id, ad.attribute_definition_id, 'AM5'
FROM products p
JOIN product_types pt ON pt.type_code='MOTHERBOARD'
JOIN product_attribute_definitions ad
 ON ad.product_type_id=pt.product_type_id AND ad.attribute_code='socket'
WHERE p.model_code='B650-AORUS-ELITE-AX'
ON CONFLICT (product_id, attribute_definition_id) DO UPDATE SET
 value_text=EXCLUDED.value_text, value_decimal=NULL, value_integer=NULL, value_boolean=NULL, value_json=NULL;

INSERT INTO product_attribute_values
 (product_id, attribute_definition_id, value_text)
SELECT p.product_id, ad.attribute_definition_id, 'DDR5'
FROM products p
JOIN product_types pt ON pt.type_code='MOTHERBOARD'
JOIN product_attribute_definitions ad
 ON ad.product_type_id=pt.product_type_id AND ad.attribute_code='memory_type'
WHERE p.model_code='B650-AORUS-ELITE-AX'
ON CONFLICT (product_id, attribute_definition_id) DO UPDATE SET
 value_text=EXCLUDED.value_text, value_decimal=NULL, value_integer=NULL, value_boolean=NULL, value_json=NULL;

INSERT INTO product_attribute_values
 (product_id, attribute_definition_id, value_text)
SELECT p.product_id, ad.attribute_definition_id, 'ATX'
FROM products p
JOIN product_types pt ON pt.type_code='MOTHERBOARD'
JOIN product_attribute_definitions ad
 ON ad.product_type_id=pt.product_type_id AND ad.attribute_code='form_factor'
WHERE p.model_code='B650-AORUS-ELITE-AX'
ON CONFLICT (product_id, attribute_definition_id) DO UPDATE SET
 value_text=EXCLUDED.value_text, value_decimal=NULL, value_integer=NULL, value_boolean=NULL, value_json=NULL;

INSERT INTO products
 (product_type_id, category_id, brand_id, model_code, product_name, short_description, description, product_status)
SELECT pt.product_type_id, c.category_id, b.brand_id, 'B650M-PRO-RS', 'B650M Pro RS',
       'B650M Pro RS - catalog tham khảo PC Builder Store.', 'Nguồn tham khảo: https://www.asrock.com/',
       'ACTIVE'
FROM product_types pt
JOIN categories c ON c.category_code='MAINBOARD'
LEFT JOIN brands b ON b.brand_name='ASRock'
WHERE pt.type_code='MOTHERBOARD'
ON CONFLICT (model_code) DO UPDATE SET
 product_type_id=EXCLUDED.product_type_id,
 category_id=EXCLUDED.category_id,
 brand_id=EXCLUDED.brand_id,
 product_name=EXCLUDED.product_name,
 short_description=EXCLUDED.short_description,
 description=EXCLUDED.description,
 product_status='ACTIVE';

INSERT INTO product_offers
 (product_id, offer_code, condition_code, price, currency_code, stock_quantity,
  reserved_quantity, warranty_months, offer_status)
SELECT p.product_id, 'DEMO-B650M-PRO-RS', 'NEW',
       4000000, 'VND',
       5, 0, 36, 'ACTIVE'
FROM products p WHERE p.model_code='B650M-PRO-RS'
ON CONFLICT (offer_code) DO UPDATE SET
 product_id=EXCLUDED.product_id,
 condition_code=EXCLUDED.condition_code,
 price=EXCLUDED.price,
 currency_code=EXCLUDED.currency_code,
 stock_quantity=EXCLUDED.stock_quantity,
 warranty_months=EXCLUDED.warranty_months,
 offer_status='ACTIVE';

INSERT INTO product_attribute_values
 (product_id, attribute_definition_id, value_text)
SELECT p.product_id, ad.attribute_definition_id, 'AM5'
FROM products p
JOIN product_types pt ON pt.type_code='MOTHERBOARD'
JOIN product_attribute_definitions ad
 ON ad.product_type_id=pt.product_type_id AND ad.attribute_code='socket'
WHERE p.model_code='B650M-PRO-RS'
ON CONFLICT (product_id, attribute_definition_id) DO UPDATE SET
 value_text=EXCLUDED.value_text, value_decimal=NULL, value_integer=NULL, value_boolean=NULL, value_json=NULL;

INSERT INTO product_attribute_values
 (product_id, attribute_definition_id, value_text)
SELECT p.product_id, ad.attribute_definition_id, 'DDR5'
FROM products p
JOIN product_types pt ON pt.type_code='MOTHERBOARD'
JOIN product_attribute_definitions ad
 ON ad.product_type_id=pt.product_type_id AND ad.attribute_code='memory_type'
WHERE p.model_code='B650M-PRO-RS'
ON CONFLICT (product_id, attribute_definition_id) DO UPDATE SET
 value_text=EXCLUDED.value_text, value_decimal=NULL, value_integer=NULL, value_boolean=NULL, value_json=NULL;

INSERT INTO product_attribute_values
 (product_id, attribute_definition_id, value_text)
SELECT p.product_id, ad.attribute_definition_id, 'mATX'
FROM products p
JOIN product_types pt ON pt.type_code='MOTHERBOARD'
JOIN product_attribute_definitions ad
 ON ad.product_type_id=pt.product_type_id AND ad.attribute_code='form_factor'
WHERE p.model_code='B650M-PRO-RS'
ON CONFLICT (product_id, attribute_definition_id) DO UPDATE SET
 value_text=EXCLUDED.value_text, value_decimal=NULL, value_integer=NULL, value_boolean=NULL, value_json=NULL;

INSERT INTO products
 (product_type_id, category_id, brand_id, model_code, product_name, short_description, description, product_status)
SELECT pt.product_type_id, c.category_id, b.brand_id, 'TUF-X670E-PLUS-WIFI', 'TUF Gaming X670E-PLUS WIFI',
       'TUF Gaming X670E-PLUS WIFI - catalog tham khảo PC Builder Store.', 'Nguồn tham khảo: https://www.asus.com/',
       'ACTIVE'
FROM product_types pt
JOIN categories c ON c.category_code='MAINBOARD'
LEFT JOIN brands b ON b.brand_name='ASUS'
WHERE pt.type_code='MOTHERBOARD'
ON CONFLICT (model_code) DO UPDATE SET
 product_type_id=EXCLUDED.product_type_id,
 category_id=EXCLUDED.category_id,
 brand_id=EXCLUDED.brand_id,
 product_name=EXCLUDED.product_name,
 short_description=EXCLUDED.short_description,
 description=EXCLUDED.description,
 product_status='ACTIVE';

INSERT INTO product_offers
 (product_id, offer_code, condition_code, price, currency_code, stock_quantity,
  reserved_quantity, warranty_months, offer_status)
SELECT p.product_id, 'DEMO-TUF-X670E-PLUS-WIFI', 'NEW',
       4000000, 'VND',
       5, 0, 36, 'ACTIVE'
FROM products p WHERE p.model_code='TUF-X670E-PLUS-WIFI'
ON CONFLICT (offer_code) DO UPDATE SET
 product_id=EXCLUDED.product_id,
 condition_code=EXCLUDED.condition_code,
 price=EXCLUDED.price,
 currency_code=EXCLUDED.currency_code,
 stock_quantity=EXCLUDED.stock_quantity,
 warranty_months=EXCLUDED.warranty_months,
 offer_status='ACTIVE';

INSERT INTO product_attribute_values
 (product_id, attribute_definition_id, value_text)
SELECT p.product_id, ad.attribute_definition_id, 'AM5'
FROM products p
JOIN product_types pt ON pt.type_code='MOTHERBOARD'
JOIN product_attribute_definitions ad
 ON ad.product_type_id=pt.product_type_id AND ad.attribute_code='socket'
WHERE p.model_code='TUF-X670E-PLUS-WIFI'
ON CONFLICT (product_id, attribute_definition_id) DO UPDATE SET
 value_text=EXCLUDED.value_text, value_decimal=NULL, value_integer=NULL, value_boolean=NULL, value_json=NULL;

INSERT INTO product_attribute_values
 (product_id, attribute_definition_id, value_text)
SELECT p.product_id, ad.attribute_definition_id, 'DDR5'
FROM products p
JOIN product_types pt ON pt.type_code='MOTHERBOARD'
JOIN product_attribute_definitions ad
 ON ad.product_type_id=pt.product_type_id AND ad.attribute_code='memory_type'
WHERE p.model_code='TUF-X670E-PLUS-WIFI'
ON CONFLICT (product_id, attribute_definition_id) DO UPDATE SET
 value_text=EXCLUDED.value_text, value_decimal=NULL, value_integer=NULL, value_boolean=NULL, value_json=NULL;

INSERT INTO product_attribute_values
 (product_id, attribute_definition_id, value_text)
SELECT p.product_id, ad.attribute_definition_id, 'ATX'
FROM products p
JOIN product_types pt ON pt.type_code='MOTHERBOARD'
JOIN product_attribute_definitions ad
 ON ad.product_type_id=pt.product_type_id AND ad.attribute_code='form_factor'
WHERE p.model_code='TUF-X670E-PLUS-WIFI'
ON CONFLICT (product_id, attribute_definition_id) DO UPDATE SET
 value_text=EXCLUDED.value_text, value_decimal=NULL, value_integer=NULL, value_boolean=NULL, value_json=NULL;

INSERT INTO products
 (product_type_id, category_id, brand_id, model_code, product_name, short_description, description, product_status)
SELECT pt.product_type_id, c.category_id, b.brand_id, 'KF432C16BB/8', 'FURY Beast DDR4 8GB 3200',
       'FURY Beast DDR4 8GB 3200 - catalog tham khảo PC Builder Store.', 'Nguồn tham khảo: https://www.kingston.com/',
       'ACTIVE'
FROM product_types pt
JOIN categories c ON c.category_code='RAM'
LEFT JOIN brands b ON b.brand_name='Kingston'
WHERE pt.type_code='RAM'
ON CONFLICT (model_code) DO UPDATE SET
 product_type_id=EXCLUDED.product_type_id,
 category_id=EXCLUDED.category_id,
 brand_id=EXCLUDED.brand_id,
 product_name=EXCLUDED.product_name,
 short_description=EXCLUDED.short_description,
 description=EXCLUDED.description,
 product_status='ACTIVE';

INSERT INTO product_offers
 (product_id, offer_code, condition_code, price, currency_code, stock_quantity,
  reserved_quantity, warranty_months, offer_status)
SELECT p.product_id, 'DEMO-KF432C16BB/8', 'NEW',
       1500000, 'VND',
       5, 0, 36, 'ACTIVE'
FROM products p WHERE p.model_code='KF432C16BB/8'
ON CONFLICT (offer_code) DO UPDATE SET
 product_id=EXCLUDED.product_id,
 condition_code=EXCLUDED.condition_code,
 price=EXCLUDED.price,
 currency_code=EXCLUDED.currency_code,
 stock_quantity=EXCLUDED.stock_quantity,
 warranty_months=EXCLUDED.warranty_months,
 offer_status='ACTIVE';

INSERT INTO product_attribute_values
 (product_id, attribute_definition_id, value_text)
SELECT p.product_id, ad.attribute_definition_id, 'DDR4'
FROM products p
JOIN product_types pt ON pt.type_code='RAM'
JOIN product_attribute_definitions ad
 ON ad.product_type_id=pt.product_type_id AND ad.attribute_code='memory_type'
WHERE p.model_code='KF432C16BB/8'
ON CONFLICT (product_id, attribute_definition_id) DO UPDATE SET
 value_text=EXCLUDED.value_text, value_decimal=NULL, value_integer=NULL, value_boolean=NULL, value_json=NULL;

INSERT INTO product_attribute_values
 (product_id, attribute_definition_id, value_integer)
SELECT p.product_id, ad.attribute_definition_id, 8
FROM products p
JOIN product_types pt ON pt.type_code='RAM'
JOIN product_attribute_definitions ad
 ON ad.product_type_id=pt.product_type_id AND ad.attribute_code='capacity_gb'
WHERE p.model_code='KF432C16BB/8'
ON CONFLICT (product_id, attribute_definition_id) DO UPDATE SET
 value_integer=EXCLUDED.value_integer, value_text=NULL, value_decimal=NULL, value_boolean=NULL, value_json=NULL;

INSERT INTO product_attribute_values
 (product_id, attribute_definition_id, value_integer)
SELECT p.product_id, ad.attribute_definition_id, 3200
FROM products p
JOIN product_types pt ON pt.type_code='RAM'
JOIN product_attribute_definitions ad
 ON ad.product_type_id=pt.product_type_id AND ad.attribute_code='speed_mhz'
WHERE p.model_code='KF432C16BB/8'
ON CONFLICT (product_id, attribute_definition_id) DO UPDATE SET
 value_integer=EXCLUDED.value_integer, value_text=NULL, value_decimal=NULL, value_boolean=NULL, value_json=NULL;

INSERT INTO products
 (product_type_id, category_id, brand_id, model_code, product_name, short_description, description, product_status)
SELECT pt.product_type_id, c.category_id, b.brand_id, 'KF432C16BB/16', 'FURY Beast DDR4 16GB 3200',
       'FURY Beast DDR4 16GB 3200 - catalog tham khảo PC Builder Store.', 'Nguồn tham khảo: https://www.kingston.com/',
       'ACTIVE'
FROM product_types pt
JOIN categories c ON c.category_code='RAM'
LEFT JOIN brands b ON b.brand_name='Kingston'
WHERE pt.type_code='RAM'
ON CONFLICT (model_code) DO UPDATE SET
 product_type_id=EXCLUDED.product_type_id,
 category_id=EXCLUDED.category_id,
 brand_id=EXCLUDED.brand_id,
 product_name=EXCLUDED.product_name,
 short_description=EXCLUDED.short_description,
 description=EXCLUDED.description,
 product_status='ACTIVE';

INSERT INTO product_offers
 (product_id, offer_code, condition_code, price, currency_code, stock_quantity,
  reserved_quantity, warranty_months, offer_status)
SELECT p.product_id, 'DEMO-KF432C16BB/16', 'NEW',
       1500000, 'VND',
       5, 0, 36, 'ACTIVE'
FROM products p WHERE p.model_code='KF432C16BB/16'
ON CONFLICT (offer_code) DO UPDATE SET
 product_id=EXCLUDED.product_id,
 condition_code=EXCLUDED.condition_code,
 price=EXCLUDED.price,
 currency_code=EXCLUDED.currency_code,
 stock_quantity=EXCLUDED.stock_quantity,
 warranty_months=EXCLUDED.warranty_months,
 offer_status='ACTIVE';

INSERT INTO product_attribute_values
 (product_id, attribute_definition_id, value_text)
SELECT p.product_id, ad.attribute_definition_id, 'DDR4'
FROM products p
JOIN product_types pt ON pt.type_code='RAM'
JOIN product_attribute_definitions ad
 ON ad.product_type_id=pt.product_type_id AND ad.attribute_code='memory_type'
WHERE p.model_code='KF432C16BB/16'
ON CONFLICT (product_id, attribute_definition_id) DO UPDATE SET
 value_text=EXCLUDED.value_text, value_decimal=NULL, value_integer=NULL, value_boolean=NULL, value_json=NULL;

INSERT INTO product_attribute_values
 (product_id, attribute_definition_id, value_integer)
SELECT p.product_id, ad.attribute_definition_id, 16
FROM products p
JOIN product_types pt ON pt.type_code='RAM'
JOIN product_attribute_definitions ad
 ON ad.product_type_id=pt.product_type_id AND ad.attribute_code='capacity_gb'
WHERE p.model_code='KF432C16BB/16'
ON CONFLICT (product_id, attribute_definition_id) DO UPDATE SET
 value_integer=EXCLUDED.value_integer, value_text=NULL, value_decimal=NULL, value_boolean=NULL, value_json=NULL;

INSERT INTO product_attribute_values
 (product_id, attribute_definition_id, value_integer)
SELECT p.product_id, ad.attribute_definition_id, 3200
FROM products p
JOIN product_types pt ON pt.type_code='RAM'
JOIN product_attribute_definitions ad
 ON ad.product_type_id=pt.product_type_id AND ad.attribute_code='speed_mhz'
WHERE p.model_code='KF432C16BB/16'
ON CONFLICT (product_id, attribute_definition_id) DO UPDATE SET
 value_integer=EXCLUDED.value_integer, value_text=NULL, value_decimal=NULL, value_boolean=NULL, value_json=NULL;

INSERT INTO products
 (product_type_id, category_id, brand_id, model_code, product_name, short_description, description, product_status)
SELECT pt.product_type_id, c.category_id, b.brand_id, 'KF432C16BBK2/32', 'FURY Beast DDR4 32GB Kit',
       'FURY Beast DDR4 32GB Kit - catalog tham khảo PC Builder Store.', 'Nguồn tham khảo: https://www.kingston.com/',
       'ACTIVE'
FROM product_types pt
JOIN categories c ON c.category_code='RAM'
LEFT JOIN brands b ON b.brand_name='Kingston'
WHERE pt.type_code='RAM'
ON CONFLICT (model_code) DO UPDATE SET
 product_type_id=EXCLUDED.product_type_id,
 category_id=EXCLUDED.category_id,
 brand_id=EXCLUDED.brand_id,
 product_name=EXCLUDED.product_name,
 short_description=EXCLUDED.short_description,
 description=EXCLUDED.description,
 product_status='ACTIVE';

INSERT INTO product_offers
 (product_id, offer_code, condition_code, price, currency_code, stock_quantity,
  reserved_quantity, warranty_months, offer_status)
SELECT p.product_id, 'DEMO-KF432C16BBK2/32', 'NEW',
       1500000, 'VND',
       5, 0, 36, 'ACTIVE'
FROM products p WHERE p.model_code='KF432C16BBK2/32'
ON CONFLICT (offer_code) DO UPDATE SET
 product_id=EXCLUDED.product_id,
 condition_code=EXCLUDED.condition_code,
 price=EXCLUDED.price,
 currency_code=EXCLUDED.currency_code,
 stock_quantity=EXCLUDED.stock_quantity,
 warranty_months=EXCLUDED.warranty_months,
 offer_status='ACTIVE';

INSERT INTO product_attribute_values
 (product_id, attribute_definition_id, value_text)
SELECT p.product_id, ad.attribute_definition_id, 'DDR4'
FROM products p
JOIN product_types pt ON pt.type_code='RAM'
JOIN product_attribute_definitions ad
 ON ad.product_type_id=pt.product_type_id AND ad.attribute_code='memory_type'
WHERE p.model_code='KF432C16BBK2/32'
ON CONFLICT (product_id, attribute_definition_id) DO UPDATE SET
 value_text=EXCLUDED.value_text, value_decimal=NULL, value_integer=NULL, value_boolean=NULL, value_json=NULL;

INSERT INTO product_attribute_values
 (product_id, attribute_definition_id, value_integer)
SELECT p.product_id, ad.attribute_definition_id, 32
FROM products p
JOIN product_types pt ON pt.type_code='RAM'
JOIN product_attribute_definitions ad
 ON ad.product_type_id=pt.product_type_id AND ad.attribute_code='capacity_gb'
WHERE p.model_code='KF432C16BBK2/32'
ON CONFLICT (product_id, attribute_definition_id) DO UPDATE SET
 value_integer=EXCLUDED.value_integer, value_text=NULL, value_decimal=NULL, value_boolean=NULL, value_json=NULL;

INSERT INTO product_attribute_values
 (product_id, attribute_definition_id, value_integer)
SELECT p.product_id, ad.attribute_definition_id, 3200
FROM products p
JOIN product_types pt ON pt.type_code='RAM'
JOIN product_attribute_definitions ad
 ON ad.product_type_id=pt.product_type_id AND ad.attribute_code='speed_mhz'
WHERE p.model_code='KF432C16BBK2/32'
ON CONFLICT (product_id, attribute_definition_id) DO UPDATE SET
 value_integer=EXCLUDED.value_integer, value_text=NULL, value_decimal=NULL, value_boolean=NULL, value_json=NULL;

INSERT INTO products
 (product_type_id, category_id, brand_id, model_code, product_name, short_description, description, product_status)
SELECT pt.product_type_id, c.category_id, b.brand_id, 'CMK16GX4M1E3200C16', 'Vengeance LPX DDR4 16GB 3200',
       'Vengeance LPX DDR4 16GB 3200 - catalog tham khảo PC Builder Store.', 'Nguồn tham khảo: https://www.corsair.com/',
       'ACTIVE'
FROM product_types pt
JOIN categories c ON c.category_code='RAM'
LEFT JOIN brands b ON b.brand_name='Corsair'
WHERE pt.type_code='RAM'
ON CONFLICT (model_code) DO UPDATE SET
 product_type_id=EXCLUDED.product_type_id,
 category_id=EXCLUDED.category_id,
 brand_id=EXCLUDED.brand_id,
 product_name=EXCLUDED.product_name,
 short_description=EXCLUDED.short_description,
 description=EXCLUDED.description,
 product_status='ACTIVE';

INSERT INTO product_offers
 (product_id, offer_code, condition_code, price, currency_code, stock_quantity,
  reserved_quantity, warranty_months, offer_status)
SELECT p.product_id, 'DEMO-CMK16GX4M1E3200C16', 'NEW',
       1500000, 'VND',
       5, 0, 36, 'ACTIVE'
FROM products p WHERE p.model_code='CMK16GX4M1E3200C16'
ON CONFLICT (offer_code) DO UPDATE SET
 product_id=EXCLUDED.product_id,
 condition_code=EXCLUDED.condition_code,
 price=EXCLUDED.price,
 currency_code=EXCLUDED.currency_code,
 stock_quantity=EXCLUDED.stock_quantity,
 warranty_months=EXCLUDED.warranty_months,
 offer_status='ACTIVE';

INSERT INTO product_attribute_values
 (product_id, attribute_definition_id, value_text)
SELECT p.product_id, ad.attribute_definition_id, 'DDR4'
FROM products p
JOIN product_types pt ON pt.type_code='RAM'
JOIN product_attribute_definitions ad
 ON ad.product_type_id=pt.product_type_id AND ad.attribute_code='memory_type'
WHERE p.model_code='CMK16GX4M1E3200C16'
ON CONFLICT (product_id, attribute_definition_id) DO UPDATE SET
 value_text=EXCLUDED.value_text, value_decimal=NULL, value_integer=NULL, value_boolean=NULL, value_json=NULL;

INSERT INTO product_attribute_values
 (product_id, attribute_definition_id, value_integer)
SELECT p.product_id, ad.attribute_definition_id, 16
FROM products p
JOIN product_types pt ON pt.type_code='RAM'
JOIN product_attribute_definitions ad
 ON ad.product_type_id=pt.product_type_id AND ad.attribute_code='capacity_gb'
WHERE p.model_code='CMK16GX4M1E3200C16'
ON CONFLICT (product_id, attribute_definition_id) DO UPDATE SET
 value_integer=EXCLUDED.value_integer, value_text=NULL, value_decimal=NULL, value_boolean=NULL, value_json=NULL;

INSERT INTO product_attribute_values
 (product_id, attribute_definition_id, value_integer)
SELECT p.product_id, ad.attribute_definition_id, 3200
FROM products p
JOIN product_types pt ON pt.type_code='RAM'
JOIN product_attribute_definitions ad
 ON ad.product_type_id=pt.product_type_id AND ad.attribute_code='speed_mhz'
WHERE p.model_code='CMK16GX4M1E3200C16'
ON CONFLICT (product_id, attribute_definition_id) DO UPDATE SET
 value_integer=EXCLUDED.value_integer, value_text=NULL, value_decimal=NULL, value_boolean=NULL, value_json=NULL;

INSERT INTO products
 (product_type_id, category_id, brand_id, model_code, product_name, short_description, description, product_status)
SELECT pt.product_type_id, c.category_id, b.brand_id, 'CMK32GX4M2E3200C16', 'Vengeance LPX DDR4 32GB Kit',
       'Vengeance LPX DDR4 32GB Kit - catalog tham khảo PC Builder Store.', 'Nguồn tham khảo: https://www.corsair.com/',
       'ACTIVE'
FROM product_types pt
JOIN categories c ON c.category_code='RAM'
LEFT JOIN brands b ON b.brand_name='Corsair'
WHERE pt.type_code='RAM'
ON CONFLICT (model_code) DO UPDATE SET
 product_type_id=EXCLUDED.product_type_id,
 category_id=EXCLUDED.category_id,
 brand_id=EXCLUDED.brand_id,
 product_name=EXCLUDED.product_name,
 short_description=EXCLUDED.short_description,
 description=EXCLUDED.description,
 product_status='ACTIVE';

INSERT INTO product_offers
 (product_id, offer_code, condition_code, price, currency_code, stock_quantity,
  reserved_quantity, warranty_months, offer_status)
SELECT p.product_id, 'DEMO-CMK32GX4M2E3200C16', 'NEW',
       1500000, 'VND',
       5, 0, 36, 'ACTIVE'
FROM products p WHERE p.model_code='CMK32GX4M2E3200C16'
ON CONFLICT (offer_code) DO UPDATE SET
 product_id=EXCLUDED.product_id,
 condition_code=EXCLUDED.condition_code,
 price=EXCLUDED.price,
 currency_code=EXCLUDED.currency_code,
 stock_quantity=EXCLUDED.stock_quantity,
 warranty_months=EXCLUDED.warranty_months,
 offer_status='ACTIVE';

INSERT INTO product_attribute_values
 (product_id, attribute_definition_id, value_text)
SELECT p.product_id, ad.attribute_definition_id, 'DDR4'
FROM products p
JOIN product_types pt ON pt.type_code='RAM'
JOIN product_attribute_definitions ad
 ON ad.product_type_id=pt.product_type_id AND ad.attribute_code='memory_type'
WHERE p.model_code='CMK32GX4M2E3200C16'
ON CONFLICT (product_id, attribute_definition_id) DO UPDATE SET
 value_text=EXCLUDED.value_text, value_decimal=NULL, value_integer=NULL, value_boolean=NULL, value_json=NULL;

INSERT INTO product_attribute_values
 (product_id, attribute_definition_id, value_integer)
SELECT p.product_id, ad.attribute_definition_id, 32
FROM products p
JOIN product_types pt ON pt.type_code='RAM'
JOIN product_attribute_definitions ad
 ON ad.product_type_id=pt.product_type_id AND ad.attribute_code='capacity_gb'
WHERE p.model_code='CMK32GX4M2E3200C16'
ON CONFLICT (product_id, attribute_definition_id) DO UPDATE SET
 value_integer=EXCLUDED.value_integer, value_text=NULL, value_decimal=NULL, value_boolean=NULL, value_json=NULL;

INSERT INTO product_attribute_values
 (product_id, attribute_definition_id, value_integer)
SELECT p.product_id, ad.attribute_definition_id, 3200
FROM products p
JOIN product_types pt ON pt.type_code='RAM'
JOIN product_attribute_definitions ad
 ON ad.product_type_id=pt.product_type_id AND ad.attribute_code='speed_mhz'
WHERE p.model_code='CMK32GX4M2E3200C16'
ON CONFLICT (product_id, attribute_definition_id) DO UPDATE SET
 value_integer=EXCLUDED.value_integer, value_text=NULL, value_decimal=NULL, value_boolean=NULL, value_json=NULL;

INSERT INTO products
 (product_type_id, category_id, brand_id, model_code, product_name, short_description, description, product_status)
SELECT pt.product_type_id, c.category_id, b.brand_id, 'F4-3200C16S-16GVK', 'Ripjaws V DDR4 16GB 3200',
       'Ripjaws V DDR4 16GB 3200 - catalog tham khảo PC Builder Store.', 'Nguồn tham khảo: https://phongvu.vn/c/linh-kien-may-tinh',
       'ACTIVE'
FROM product_types pt
JOIN categories c ON c.category_code='RAM'
LEFT JOIN brands b ON b.brand_name='G.Skill'
WHERE pt.type_code='RAM'
ON CONFLICT (model_code) DO UPDATE SET
 product_type_id=EXCLUDED.product_type_id,
 category_id=EXCLUDED.category_id,
 brand_id=EXCLUDED.brand_id,
 product_name=EXCLUDED.product_name,
 short_description=EXCLUDED.short_description,
 description=EXCLUDED.description,
 product_status='ACTIVE';

INSERT INTO product_offers
 (product_id, offer_code, condition_code, price, currency_code, stock_quantity,
  reserved_quantity, warranty_months, offer_status)
SELECT p.product_id, 'DEMO-F4-3200C16S-16GVK', 'NEW',
       1500000, 'VND',
       5, 0, 36, 'ACTIVE'
FROM products p WHERE p.model_code='F4-3200C16S-16GVK'
ON CONFLICT (offer_code) DO UPDATE SET
 product_id=EXCLUDED.product_id,
 condition_code=EXCLUDED.condition_code,
 price=EXCLUDED.price,
 currency_code=EXCLUDED.currency_code,
 stock_quantity=EXCLUDED.stock_quantity,
 warranty_months=EXCLUDED.warranty_months,
 offer_status='ACTIVE';

INSERT INTO product_attribute_values
 (product_id, attribute_definition_id, value_text)
SELECT p.product_id, ad.attribute_definition_id, 'DDR4'
FROM products p
JOIN product_types pt ON pt.type_code='RAM'
JOIN product_attribute_definitions ad
 ON ad.product_type_id=pt.product_type_id AND ad.attribute_code='memory_type'
WHERE p.model_code='F4-3200C16S-16GVK'
ON CONFLICT (product_id, attribute_definition_id) DO UPDATE SET
 value_text=EXCLUDED.value_text, value_decimal=NULL, value_integer=NULL, value_boolean=NULL, value_json=NULL;

INSERT INTO product_attribute_values
 (product_id, attribute_definition_id, value_integer)
SELECT p.product_id, ad.attribute_definition_id, 16
FROM products p
JOIN product_types pt ON pt.type_code='RAM'
JOIN product_attribute_definitions ad
 ON ad.product_type_id=pt.product_type_id AND ad.attribute_code='capacity_gb'
WHERE p.model_code='F4-3200C16S-16GVK'
ON CONFLICT (product_id, attribute_definition_id) DO UPDATE SET
 value_integer=EXCLUDED.value_integer, value_text=NULL, value_decimal=NULL, value_boolean=NULL, value_json=NULL;

INSERT INTO product_attribute_values
 (product_id, attribute_definition_id, value_integer)
SELECT p.product_id, ad.attribute_definition_id, 3200
FROM products p
JOIN product_types pt ON pt.type_code='RAM'
JOIN product_attribute_definitions ad
 ON ad.product_type_id=pt.product_type_id AND ad.attribute_code='speed_mhz'
WHERE p.model_code='F4-3200C16S-16GVK'
ON CONFLICT (product_id, attribute_definition_id) DO UPDATE SET
 value_integer=EXCLUDED.value_integer, value_text=NULL, value_decimal=NULL, value_boolean=NULL, value_json=NULL;

INSERT INTO products
 (product_type_id, category_id, brand_id, model_code, product_name, short_description, description, product_status)
SELECT pt.product_type_id, c.category_id, b.brand_id, 'F4-3200C16D-32GVK', 'Ripjaws V DDR4 32GB Kit',
       'Ripjaws V DDR4 32GB Kit - catalog tham khảo PC Builder Store.', 'Nguồn tham khảo: https://phongvu.vn/c/linh-kien-may-tinh',
       'ACTIVE'
FROM product_types pt
JOIN categories c ON c.category_code='RAM'
LEFT JOIN brands b ON b.brand_name='G.Skill'
WHERE pt.type_code='RAM'
ON CONFLICT (model_code) DO UPDATE SET
 product_type_id=EXCLUDED.product_type_id,
 category_id=EXCLUDED.category_id,
 brand_id=EXCLUDED.brand_id,
 product_name=EXCLUDED.product_name,
 short_description=EXCLUDED.short_description,
 description=EXCLUDED.description,
 product_status='ACTIVE';

INSERT INTO product_offers
 (product_id, offer_code, condition_code, price, currency_code, stock_quantity,
  reserved_quantity, warranty_months, offer_status)
SELECT p.product_id, 'DEMO-F4-3200C16D-32GVK', 'NEW',
       1500000, 'VND',
       5, 0, 36, 'ACTIVE'
FROM products p WHERE p.model_code='F4-3200C16D-32GVK'
ON CONFLICT (offer_code) DO UPDATE SET
 product_id=EXCLUDED.product_id,
 condition_code=EXCLUDED.condition_code,
 price=EXCLUDED.price,
 currency_code=EXCLUDED.currency_code,
 stock_quantity=EXCLUDED.stock_quantity,
 warranty_months=EXCLUDED.warranty_months,
 offer_status='ACTIVE';

INSERT INTO product_attribute_values
 (product_id, attribute_definition_id, value_text)
SELECT p.product_id, ad.attribute_definition_id, 'DDR4'
FROM products p
JOIN product_types pt ON pt.type_code='RAM'
JOIN product_attribute_definitions ad
 ON ad.product_type_id=pt.product_type_id AND ad.attribute_code='memory_type'
WHERE p.model_code='F4-3200C16D-32GVK'
ON CONFLICT (product_id, attribute_definition_id) DO UPDATE SET
 value_text=EXCLUDED.value_text, value_decimal=NULL, value_integer=NULL, value_boolean=NULL, value_json=NULL;

INSERT INTO product_attribute_values
 (product_id, attribute_definition_id, value_integer)
SELECT p.product_id, ad.attribute_definition_id, 32
FROM products p
JOIN product_types pt ON pt.type_code='RAM'
JOIN product_attribute_definitions ad
 ON ad.product_type_id=pt.product_type_id AND ad.attribute_code='capacity_gb'
WHERE p.model_code='F4-3200C16D-32GVK'
ON CONFLICT (product_id, attribute_definition_id) DO UPDATE SET
 value_integer=EXCLUDED.value_integer, value_text=NULL, value_decimal=NULL, value_boolean=NULL, value_json=NULL;

INSERT INTO product_attribute_values
 (product_id, attribute_definition_id, value_integer)
SELECT p.product_id, ad.attribute_definition_id, 3200
FROM products p
JOIN product_types pt ON pt.type_code='RAM'
JOIN product_attribute_definitions ad
 ON ad.product_type_id=pt.product_type_id AND ad.attribute_code='speed_mhz'
WHERE p.model_code='F4-3200C16D-32GVK'
ON CONFLICT (product_id, attribute_definition_id) DO UPDATE SET
 value_integer=EXCLUDED.value_integer, value_text=NULL, value_decimal=NULL, value_boolean=NULL, value_json=NULL;

INSERT INTO products
 (product_type_id, category_id, brand_id, model_code, product_name, short_description, description, product_status)
SELECT pt.product_type_id, c.category_id, b.brand_id, 'TLZGD416G3200HC16F01', 'T-Force Vulcan Z DDR4 16GB',
       'T-Force Vulcan Z DDR4 16GB - catalog tham khảo PC Builder Store.', 'Nguồn tham khảo: https://phongvu.vn/c/linh-kien-may-tinh',
       'ACTIVE'
FROM product_types pt
JOIN categories c ON c.category_code='RAM'
LEFT JOIN brands b ON b.brand_name='TeamGroup'
WHERE pt.type_code='RAM'
ON CONFLICT (model_code) DO UPDATE SET
 product_type_id=EXCLUDED.product_type_id,
 category_id=EXCLUDED.category_id,
 brand_id=EXCLUDED.brand_id,
 product_name=EXCLUDED.product_name,
 short_description=EXCLUDED.short_description,
 description=EXCLUDED.description,
 product_status='ACTIVE';

INSERT INTO product_offers
 (product_id, offer_code, condition_code, price, currency_code, stock_quantity,
  reserved_quantity, warranty_months, offer_status)
SELECT p.product_id, 'DEMO-TLZGD416G3200HC16F01', 'NEW',
       1500000, 'VND',
       5, 0, 36, 'ACTIVE'
FROM products p WHERE p.model_code='TLZGD416G3200HC16F01'
ON CONFLICT (offer_code) DO UPDATE SET
 product_id=EXCLUDED.product_id,
 condition_code=EXCLUDED.condition_code,
 price=EXCLUDED.price,
 currency_code=EXCLUDED.currency_code,
 stock_quantity=EXCLUDED.stock_quantity,
 warranty_months=EXCLUDED.warranty_months,
 offer_status='ACTIVE';

INSERT INTO product_attribute_values
 (product_id, attribute_definition_id, value_text)
SELECT p.product_id, ad.attribute_definition_id, 'DDR4'
FROM products p
JOIN product_types pt ON pt.type_code='RAM'
JOIN product_attribute_definitions ad
 ON ad.product_type_id=pt.product_type_id AND ad.attribute_code='memory_type'
WHERE p.model_code='TLZGD416G3200HC16F01'
ON CONFLICT (product_id, attribute_definition_id) DO UPDATE SET
 value_text=EXCLUDED.value_text, value_decimal=NULL, value_integer=NULL, value_boolean=NULL, value_json=NULL;

INSERT INTO product_attribute_values
 (product_id, attribute_definition_id, value_integer)
SELECT p.product_id, ad.attribute_definition_id, 16
FROM products p
JOIN product_types pt ON pt.type_code='RAM'
JOIN product_attribute_definitions ad
 ON ad.product_type_id=pt.product_type_id AND ad.attribute_code='capacity_gb'
WHERE p.model_code='TLZGD416G3200HC16F01'
ON CONFLICT (product_id, attribute_definition_id) DO UPDATE SET
 value_integer=EXCLUDED.value_integer, value_text=NULL, value_decimal=NULL, value_boolean=NULL, value_json=NULL;

INSERT INTO product_attribute_values
 (product_id, attribute_definition_id, value_integer)
SELECT p.product_id, ad.attribute_definition_id, 3200
FROM products p
JOIN product_types pt ON pt.type_code='RAM'
JOIN product_attribute_definitions ad
 ON ad.product_type_id=pt.product_type_id AND ad.attribute_code='speed_mhz'
WHERE p.model_code='TLZGD416G3200HC16F01'
ON CONFLICT (product_id, attribute_definition_id) DO UPDATE SET
 value_integer=EXCLUDED.value_integer, value_text=NULL, value_decimal=NULL, value_boolean=NULL, value_json=NULL;

INSERT INTO products
 (product_type_id, category_id, brand_id, model_code, product_name, short_description, description, product_status)
SELECT pt.product_type_id, c.category_id, b.brand_id, 'TF3D432G3200HC16CDC01', 'T-Force Delta RGB DDR4 32GB Kit',
       'T-Force Delta RGB DDR4 32GB Kit - catalog tham khảo PC Builder Store.', 'Nguồn tham khảo: https://phongvu.vn/c/linh-kien-may-tinh',
       'ACTIVE'
FROM product_types pt
JOIN categories c ON c.category_code='RAM'
LEFT JOIN brands b ON b.brand_name='TeamGroup'
WHERE pt.type_code='RAM'
ON CONFLICT (model_code) DO UPDATE SET
 product_type_id=EXCLUDED.product_type_id,
 category_id=EXCLUDED.category_id,
 brand_id=EXCLUDED.brand_id,
 product_name=EXCLUDED.product_name,
 short_description=EXCLUDED.short_description,
 description=EXCLUDED.description,
 product_status='ACTIVE';

INSERT INTO product_offers
 (product_id, offer_code, condition_code, price, currency_code, stock_quantity,
  reserved_quantity, warranty_months, offer_status)
SELECT p.product_id, 'DEMO-TF3D432G3200HC16CDC01', 'NEW',
       1500000, 'VND',
       5, 0, 36, 'ACTIVE'
FROM products p WHERE p.model_code='TF3D432G3200HC16CDC01'
ON CONFLICT (offer_code) DO UPDATE SET
 product_id=EXCLUDED.product_id,
 condition_code=EXCLUDED.condition_code,
 price=EXCLUDED.price,
 currency_code=EXCLUDED.currency_code,
 stock_quantity=EXCLUDED.stock_quantity,
 warranty_months=EXCLUDED.warranty_months,
 offer_status='ACTIVE';

INSERT INTO product_attribute_values
 (product_id, attribute_definition_id, value_text)
SELECT p.product_id, ad.attribute_definition_id, 'DDR4'
FROM products p
JOIN product_types pt ON pt.type_code='RAM'
JOIN product_attribute_definitions ad
 ON ad.product_type_id=pt.product_type_id AND ad.attribute_code='memory_type'
WHERE p.model_code='TF3D432G3200HC16CDC01'
ON CONFLICT (product_id, attribute_definition_id) DO UPDATE SET
 value_text=EXCLUDED.value_text, value_decimal=NULL, value_integer=NULL, value_boolean=NULL, value_json=NULL;

INSERT INTO product_attribute_values
 (product_id, attribute_definition_id, value_integer)
SELECT p.product_id, ad.attribute_definition_id, 32
FROM products p
JOIN product_types pt ON pt.type_code='RAM'
JOIN product_attribute_definitions ad
 ON ad.product_type_id=pt.product_type_id AND ad.attribute_code='capacity_gb'
WHERE p.model_code='TF3D432G3200HC16CDC01'
ON CONFLICT (product_id, attribute_definition_id) DO UPDATE SET
 value_integer=EXCLUDED.value_integer, value_text=NULL, value_decimal=NULL, value_boolean=NULL, value_json=NULL;

INSERT INTO product_attribute_values
 (product_id, attribute_definition_id, value_integer)
SELECT p.product_id, ad.attribute_definition_id, 3200
FROM products p
JOIN product_types pt ON pt.type_code='RAM'
JOIN product_attribute_definitions ad
 ON ad.product_type_id=pt.product_type_id AND ad.attribute_code='speed_mhz'
WHERE p.model_code='TF3D432G3200HC16CDC01'
ON CONFLICT (product_id, attribute_definition_id) DO UPDATE SET
 value_integer=EXCLUDED.value_integer, value_text=NULL, value_decimal=NULL, value_boolean=NULL, value_json=NULL;

INSERT INTO products
 (product_type_id, category_id, brand_id, model_code, product_name, short_description, description, product_status)
SELECT pt.product_type_id, c.category_id, b.brand_id, 'CP2K16G4DFRA32A', 'Pro DDR4 32GB Kit',
       'Pro DDR4 32GB Kit - catalog tham khảo PC Builder Store.', 'Nguồn tham khảo: https://www.crucial.com/',
       'ACTIVE'
FROM product_types pt
JOIN categories c ON c.category_code='RAM'
LEFT JOIN brands b ON b.brand_name='Crucial'
WHERE pt.type_code='RAM'
ON CONFLICT (model_code) DO UPDATE SET
 product_type_id=EXCLUDED.product_type_id,
 category_id=EXCLUDED.category_id,
 brand_id=EXCLUDED.brand_id,
 product_name=EXCLUDED.product_name,
 short_description=EXCLUDED.short_description,
 description=EXCLUDED.description,
 product_status='ACTIVE';

INSERT INTO product_offers
 (product_id, offer_code, condition_code, price, currency_code, stock_quantity,
  reserved_quantity, warranty_months, offer_status)
SELECT p.product_id, 'DEMO-CP2K16G4DFRA32A', 'NEW',
       1500000, 'VND',
       5, 0, 36, 'ACTIVE'
FROM products p WHERE p.model_code='CP2K16G4DFRA32A'
ON CONFLICT (offer_code) DO UPDATE SET
 product_id=EXCLUDED.product_id,
 condition_code=EXCLUDED.condition_code,
 price=EXCLUDED.price,
 currency_code=EXCLUDED.currency_code,
 stock_quantity=EXCLUDED.stock_quantity,
 warranty_months=EXCLUDED.warranty_months,
 offer_status='ACTIVE';

INSERT INTO product_attribute_values
 (product_id, attribute_definition_id, value_text)
SELECT p.product_id, ad.attribute_definition_id, 'DDR4'
FROM products p
JOIN product_types pt ON pt.type_code='RAM'
JOIN product_attribute_definitions ad
 ON ad.product_type_id=pt.product_type_id AND ad.attribute_code='memory_type'
WHERE p.model_code='CP2K16G4DFRA32A'
ON CONFLICT (product_id, attribute_definition_id) DO UPDATE SET
 value_text=EXCLUDED.value_text, value_decimal=NULL, value_integer=NULL, value_boolean=NULL, value_json=NULL;

INSERT INTO product_attribute_values
 (product_id, attribute_definition_id, value_integer)
SELECT p.product_id, ad.attribute_definition_id, 32
FROM products p
JOIN product_types pt ON pt.type_code='RAM'
JOIN product_attribute_definitions ad
 ON ad.product_type_id=pt.product_type_id AND ad.attribute_code='capacity_gb'
WHERE p.model_code='CP2K16G4DFRA32A'
ON CONFLICT (product_id, attribute_definition_id) DO UPDATE SET
 value_integer=EXCLUDED.value_integer, value_text=NULL, value_decimal=NULL, value_boolean=NULL, value_json=NULL;

INSERT INTO product_attribute_values
 (product_id, attribute_definition_id, value_integer)
SELECT p.product_id, ad.attribute_definition_id, 3200
FROM products p
JOIN product_types pt ON pt.type_code='RAM'
JOIN product_attribute_definitions ad
 ON ad.product_type_id=pt.product_type_id AND ad.attribute_code='speed_mhz'
WHERE p.model_code='CP2K16G4DFRA32A'
ON CONFLICT (product_id, attribute_definition_id) DO UPDATE SET
 value_integer=EXCLUDED.value_integer, value_text=NULL, value_decimal=NULL, value_boolean=NULL, value_json=NULL;

INSERT INTO products
 (product_type_id, category_id, brand_id, model_code, product_name, short_description, description, product_status)
SELECT pt.product_type_id, c.category_id, b.brand_id, 'KF556C40BB-16', 'FURY Beast DDR5 16GB 5600',
       'FURY Beast DDR5 16GB 5600 - catalog tham khảo PC Builder Store.', 'Nguồn tham khảo: https://www.kingston.com/',
       'ACTIVE'
FROM product_types pt
JOIN categories c ON c.category_code='RAM'
LEFT JOIN brands b ON b.brand_name='Kingston'
WHERE pt.type_code='RAM'
ON CONFLICT (model_code) DO UPDATE SET
 product_type_id=EXCLUDED.product_type_id,
 category_id=EXCLUDED.category_id,
 brand_id=EXCLUDED.brand_id,
 product_name=EXCLUDED.product_name,
 short_description=EXCLUDED.short_description,
 description=EXCLUDED.description,
 product_status='ACTIVE';

INSERT INTO product_offers
 (product_id, offer_code, condition_code, price, currency_code, stock_quantity,
  reserved_quantity, warranty_months, offer_status)
SELECT p.product_id, 'DEMO-KF556C40BB-16', 'NEW',
       1500000, 'VND',
       5, 0, 36, 'ACTIVE'
FROM products p WHERE p.model_code='KF556C40BB-16'
ON CONFLICT (offer_code) DO UPDATE SET
 product_id=EXCLUDED.product_id,
 condition_code=EXCLUDED.condition_code,
 price=EXCLUDED.price,
 currency_code=EXCLUDED.currency_code,
 stock_quantity=EXCLUDED.stock_quantity,
 warranty_months=EXCLUDED.warranty_months,
 offer_status='ACTIVE';

INSERT INTO product_attribute_values
 (product_id, attribute_definition_id, value_text)
SELECT p.product_id, ad.attribute_definition_id, 'DDR5'
FROM products p
JOIN product_types pt ON pt.type_code='RAM'
JOIN product_attribute_definitions ad
 ON ad.product_type_id=pt.product_type_id AND ad.attribute_code='memory_type'
WHERE p.model_code='KF556C40BB-16'
ON CONFLICT (product_id, attribute_definition_id) DO UPDATE SET
 value_text=EXCLUDED.value_text, value_decimal=NULL, value_integer=NULL, value_boolean=NULL, value_json=NULL;

INSERT INTO product_attribute_values
 (product_id, attribute_definition_id, value_integer)
SELECT p.product_id, ad.attribute_definition_id, 16
FROM products p
JOIN product_types pt ON pt.type_code='RAM'
JOIN product_attribute_definitions ad
 ON ad.product_type_id=pt.product_type_id AND ad.attribute_code='capacity_gb'
WHERE p.model_code='KF556C40BB-16'
ON CONFLICT (product_id, attribute_definition_id) DO UPDATE SET
 value_integer=EXCLUDED.value_integer, value_text=NULL, value_decimal=NULL, value_boolean=NULL, value_json=NULL;

INSERT INTO product_attribute_values
 (product_id, attribute_definition_id, value_integer)
SELECT p.product_id, ad.attribute_definition_id, 5600
FROM products p
JOIN product_types pt ON pt.type_code='RAM'
JOIN product_attribute_definitions ad
 ON ad.product_type_id=pt.product_type_id AND ad.attribute_code='speed_mhz'
WHERE p.model_code='KF556C40BB-16'
ON CONFLICT (product_id, attribute_definition_id) DO UPDATE SET
 value_integer=EXCLUDED.value_integer, value_text=NULL, value_decimal=NULL, value_boolean=NULL, value_json=NULL;

INSERT INTO products
 (product_type_id, category_id, brand_id, model_code, product_name, short_description, description, product_status)
SELECT pt.product_type_id, c.category_id, b.brand_id, 'KF560C36BBEK2-32', 'FURY Beast DDR5 32GB 6000 Kit',
       'FURY Beast DDR5 32GB 6000 Kit - catalog tham khảo PC Builder Store.', 'Nguồn tham khảo: https://www.kingston.com/',
       'ACTIVE'
FROM product_types pt
JOIN categories c ON c.category_code='RAM'
LEFT JOIN brands b ON b.brand_name='Kingston'
WHERE pt.type_code='RAM'
ON CONFLICT (model_code) DO UPDATE SET
 product_type_id=EXCLUDED.product_type_id,
 category_id=EXCLUDED.category_id,
 brand_id=EXCLUDED.brand_id,
 product_name=EXCLUDED.product_name,
 short_description=EXCLUDED.short_description,
 description=EXCLUDED.description,
 product_status='ACTIVE';

INSERT INTO product_offers
 (product_id, offer_code, condition_code, price, currency_code, stock_quantity,
  reserved_quantity, warranty_months, offer_status)
SELECT p.product_id, 'DEMO-KF560C36BBEK2-32', 'NEW',
       1500000, 'VND',
       5, 0, 36, 'ACTIVE'
FROM products p WHERE p.model_code='KF560C36BBEK2-32'
ON CONFLICT (offer_code) DO UPDATE SET
 product_id=EXCLUDED.product_id,
 condition_code=EXCLUDED.condition_code,
 price=EXCLUDED.price,
 currency_code=EXCLUDED.currency_code,
 stock_quantity=EXCLUDED.stock_quantity,
 warranty_months=EXCLUDED.warranty_months,
 offer_status='ACTIVE';

INSERT INTO product_attribute_values
 (product_id, attribute_definition_id, value_text)
SELECT p.product_id, ad.attribute_definition_id, 'DDR5'
FROM products p
JOIN product_types pt ON pt.type_code='RAM'
JOIN product_attribute_definitions ad
 ON ad.product_type_id=pt.product_type_id AND ad.attribute_code='memory_type'
WHERE p.model_code='KF560C36BBEK2-32'
ON CONFLICT (product_id, attribute_definition_id) DO UPDATE SET
 value_text=EXCLUDED.value_text, value_decimal=NULL, value_integer=NULL, value_boolean=NULL, value_json=NULL;

INSERT INTO product_attribute_values
 (product_id, attribute_definition_id, value_integer)
SELECT p.product_id, ad.attribute_definition_id, 32
FROM products p
JOIN product_types pt ON pt.type_code='RAM'
JOIN product_attribute_definitions ad
 ON ad.product_type_id=pt.product_type_id AND ad.attribute_code='capacity_gb'
WHERE p.model_code='KF560C36BBEK2-32'
ON CONFLICT (product_id, attribute_definition_id) DO UPDATE SET
 value_integer=EXCLUDED.value_integer, value_text=NULL, value_decimal=NULL, value_boolean=NULL, value_json=NULL;

INSERT INTO product_attribute_values
 (product_id, attribute_definition_id, value_integer)
SELECT p.product_id, ad.attribute_definition_id, 6000
FROM products p
JOIN product_types pt ON pt.type_code='RAM'
JOIN product_attribute_definitions ad
 ON ad.product_type_id=pt.product_type_id AND ad.attribute_code='speed_mhz'
WHERE p.model_code='KF560C36BBEK2-32'
ON CONFLICT (product_id, attribute_definition_id) DO UPDATE SET
 value_integer=EXCLUDED.value_integer, value_text=NULL, value_decimal=NULL, value_boolean=NULL, value_json=NULL;

INSERT INTO products
 (product_type_id, category_id, brand_id, model_code, product_name, short_description, description, product_status)
SELECT pt.product_type_id, c.category_id, b.brand_id, 'CMK32GX5M2E6000C36', 'Vengeance DDR5 32GB 6000 Kit',
       'Vengeance DDR5 32GB 6000 Kit - catalog tham khảo PC Builder Store.', 'Nguồn tham khảo: https://www.corsair.com/',
       'ACTIVE'
FROM product_types pt
JOIN categories c ON c.category_code='RAM'
LEFT JOIN brands b ON b.brand_name='Corsair'
WHERE pt.type_code='RAM'
ON CONFLICT (model_code) DO UPDATE SET
 product_type_id=EXCLUDED.product_type_id,
 category_id=EXCLUDED.category_id,
 brand_id=EXCLUDED.brand_id,
 product_name=EXCLUDED.product_name,
 short_description=EXCLUDED.short_description,
 description=EXCLUDED.description,
 product_status='ACTIVE';

INSERT INTO product_offers
 (product_id, offer_code, condition_code, price, currency_code, stock_quantity,
  reserved_quantity, warranty_months, offer_status)
SELECT p.product_id, 'DEMO-CMK32GX5M2E6000C36', 'NEW',
       1500000, 'VND',
       5, 0, 36, 'ACTIVE'
FROM products p WHERE p.model_code='CMK32GX5M2E6000C36'
ON CONFLICT (offer_code) DO UPDATE SET
 product_id=EXCLUDED.product_id,
 condition_code=EXCLUDED.condition_code,
 price=EXCLUDED.price,
 currency_code=EXCLUDED.currency_code,
 stock_quantity=EXCLUDED.stock_quantity,
 warranty_months=EXCLUDED.warranty_months,
 offer_status='ACTIVE';

INSERT INTO product_attribute_values
 (product_id, attribute_definition_id, value_text)
SELECT p.product_id, ad.attribute_definition_id, 'DDR5'
FROM products p
JOIN product_types pt ON pt.type_code='RAM'
JOIN product_attribute_definitions ad
 ON ad.product_type_id=pt.product_type_id AND ad.attribute_code='memory_type'
WHERE p.model_code='CMK32GX5M2E6000C36'
ON CONFLICT (product_id, attribute_definition_id) DO UPDATE SET
 value_text=EXCLUDED.value_text, value_decimal=NULL, value_integer=NULL, value_boolean=NULL, value_json=NULL;

INSERT INTO product_attribute_values
 (product_id, attribute_definition_id, value_integer)
SELECT p.product_id, ad.attribute_definition_id, 32
FROM products p
JOIN product_types pt ON pt.type_code='RAM'
JOIN product_attribute_definitions ad
 ON ad.product_type_id=pt.product_type_id AND ad.attribute_code='capacity_gb'
WHERE p.model_code='CMK32GX5M2E6000C36'
ON CONFLICT (product_id, attribute_definition_id) DO UPDATE SET
 value_integer=EXCLUDED.value_integer, value_text=NULL, value_decimal=NULL, value_boolean=NULL, value_json=NULL;

INSERT INTO product_attribute_values
 (product_id, attribute_definition_id, value_integer)
SELECT p.product_id, ad.attribute_definition_id, 6000
FROM products p
JOIN product_types pt ON pt.type_code='RAM'
JOIN product_attribute_definitions ad
 ON ad.product_type_id=pt.product_type_id AND ad.attribute_code='speed_mhz'
WHERE p.model_code='CMK32GX5M2E6000C36'
ON CONFLICT (product_id, attribute_definition_id) DO UPDATE SET
 value_integer=EXCLUDED.value_integer, value_text=NULL, value_decimal=NULL, value_boolean=NULL, value_json=NULL;

INSERT INTO products
 (product_type_id, category_id, brand_id, model_code, product_name, short_description, description, product_status)
SELECT pt.product_type_id, c.category_id, b.brand_id, 'CMH32GX5M2B6000C36', 'Vengeance RGB DDR5 32GB Kit',
       'Vengeance RGB DDR5 32GB Kit - catalog tham khảo PC Builder Store.', 'Nguồn tham khảo: https://www.corsair.com/',
       'ACTIVE'
FROM product_types pt
JOIN categories c ON c.category_code='RAM'
LEFT JOIN brands b ON b.brand_name='Corsair'
WHERE pt.type_code='RAM'
ON CONFLICT (model_code) DO UPDATE SET
 product_type_id=EXCLUDED.product_type_id,
 category_id=EXCLUDED.category_id,
 brand_id=EXCLUDED.brand_id,
 product_name=EXCLUDED.product_name,
 short_description=EXCLUDED.short_description,
 description=EXCLUDED.description,
 product_status='ACTIVE';

INSERT INTO product_offers
 (product_id, offer_code, condition_code, price, currency_code, stock_quantity,
  reserved_quantity, warranty_months, offer_status)
SELECT p.product_id, 'DEMO-CMH32GX5M2B6000C36', 'NEW',
       1500000, 'VND',
       5, 0, 36, 'ACTIVE'
FROM products p WHERE p.model_code='CMH32GX5M2B6000C36'
ON CONFLICT (offer_code) DO UPDATE SET
 product_id=EXCLUDED.product_id,
 condition_code=EXCLUDED.condition_code,
 price=EXCLUDED.price,
 currency_code=EXCLUDED.currency_code,
 stock_quantity=EXCLUDED.stock_quantity,
 warranty_months=EXCLUDED.warranty_months,
 offer_status='ACTIVE';

INSERT INTO product_attribute_values
 (product_id, attribute_definition_id, value_text)
SELECT p.product_id, ad.attribute_definition_id, 'DDR5'
FROM products p
JOIN product_types pt ON pt.type_code='RAM'
JOIN product_attribute_definitions ad
 ON ad.product_type_id=pt.product_type_id AND ad.attribute_code='memory_type'
WHERE p.model_code='CMH32GX5M2B6000C36'
ON CONFLICT (product_id, attribute_definition_id) DO UPDATE SET
 value_text=EXCLUDED.value_text, value_decimal=NULL, value_integer=NULL, value_boolean=NULL, value_json=NULL;

INSERT INTO product_attribute_values
 (product_id, attribute_definition_id, value_integer)
SELECT p.product_id, ad.attribute_definition_id, 32
FROM products p
JOIN product_types pt ON pt.type_code='RAM'
JOIN product_attribute_definitions ad
 ON ad.product_type_id=pt.product_type_id AND ad.attribute_code='capacity_gb'
WHERE p.model_code='CMH32GX5M2B6000C36'
ON CONFLICT (product_id, attribute_definition_id) DO UPDATE SET
 value_integer=EXCLUDED.value_integer, value_text=NULL, value_decimal=NULL, value_boolean=NULL, value_json=NULL;

INSERT INTO product_attribute_values
 (product_id, attribute_definition_id, value_integer)
SELECT p.product_id, ad.attribute_definition_id, 6000
FROM products p
JOIN product_types pt ON pt.type_code='RAM'
JOIN product_attribute_definitions ad
 ON ad.product_type_id=pt.product_type_id AND ad.attribute_code='speed_mhz'
WHERE p.model_code='CMH32GX5M2B6000C36'
ON CONFLICT (product_id, attribute_definition_id) DO UPDATE SET
 value_integer=EXCLUDED.value_integer, value_text=NULL, value_decimal=NULL, value_boolean=NULL, value_json=NULL;

INSERT INTO products
 (product_type_id, category_id, brand_id, model_code, product_name, short_description, description, product_status)
SELECT pt.product_type_id, c.category_id, b.brand_id, 'F5-6000J3636F16GX2-FX5', 'Flare X5 DDR5 32GB 6000 Kit',
       'Flare X5 DDR5 32GB 6000 Kit - catalog tham khảo PC Builder Store.', 'Nguồn tham khảo: https://phongvu.vn/c/linh-kien-may-tinh',
       'ACTIVE'
FROM product_types pt
JOIN categories c ON c.category_code='RAM'
LEFT JOIN brands b ON b.brand_name='G.Skill'
WHERE pt.type_code='RAM'
ON CONFLICT (model_code) DO UPDATE SET
 product_type_id=EXCLUDED.product_type_id,
 category_id=EXCLUDED.category_id,
 brand_id=EXCLUDED.brand_id,
 product_name=EXCLUDED.product_name,
 short_description=EXCLUDED.short_description,
 description=EXCLUDED.description,
 product_status='ACTIVE';

INSERT INTO product_offers
 (product_id, offer_code, condition_code, price, currency_code, stock_quantity,
  reserved_quantity, warranty_months, offer_status)
SELECT p.product_id, 'DEMO-F5-6000J3636F16GX2-FX5', 'NEW',
       1500000, 'VND',
       5, 0, 36, 'ACTIVE'
FROM products p WHERE p.model_code='F5-6000J3636F16GX2-FX5'
ON CONFLICT (offer_code) DO UPDATE SET
 product_id=EXCLUDED.product_id,
 condition_code=EXCLUDED.condition_code,
 price=EXCLUDED.price,
 currency_code=EXCLUDED.currency_code,
 stock_quantity=EXCLUDED.stock_quantity,
 warranty_months=EXCLUDED.warranty_months,
 offer_status='ACTIVE';

INSERT INTO product_attribute_values
 (product_id, attribute_definition_id, value_text)
SELECT p.product_id, ad.attribute_definition_id, 'DDR5'
FROM products p
JOIN product_types pt ON pt.type_code='RAM'
JOIN product_attribute_definitions ad
 ON ad.product_type_id=pt.product_type_id AND ad.attribute_code='memory_type'
WHERE p.model_code='F5-6000J3636F16GX2-FX5'
ON CONFLICT (product_id, attribute_definition_id) DO UPDATE SET
 value_text=EXCLUDED.value_text, value_decimal=NULL, value_integer=NULL, value_boolean=NULL, value_json=NULL;

INSERT INTO product_attribute_values
 (product_id, attribute_definition_id, value_integer)
SELECT p.product_id, ad.attribute_definition_id, 32
FROM products p
JOIN product_types pt ON pt.type_code='RAM'
JOIN product_attribute_definitions ad
 ON ad.product_type_id=pt.product_type_id AND ad.attribute_code='capacity_gb'
WHERE p.model_code='F5-6000J3636F16GX2-FX5'
ON CONFLICT (product_id, attribute_definition_id) DO UPDATE SET
 value_integer=EXCLUDED.value_integer, value_text=NULL, value_decimal=NULL, value_boolean=NULL, value_json=NULL;

INSERT INTO product_attribute_values
 (product_id, attribute_definition_id, value_integer)
SELECT p.product_id, ad.attribute_definition_id, 6000
FROM products p
JOIN product_types pt ON pt.type_code='RAM'
JOIN product_attribute_definitions ad
 ON ad.product_type_id=pt.product_type_id AND ad.attribute_code='speed_mhz'
WHERE p.model_code='F5-6000J3636F16GX2-FX5'
ON CONFLICT (product_id, attribute_definition_id) DO UPDATE SET
 value_integer=EXCLUDED.value_integer, value_text=NULL, value_decimal=NULL, value_boolean=NULL, value_json=NULL;

INSERT INTO products
 (product_type_id, category_id, brand_id, model_code, product_name, short_description, description, product_status)
SELECT pt.product_type_id, c.category_id, b.brand_id, 'F5-6000J3038F16GX2-TZ5NR', 'Trident Z5 Neo RGB DDR5 32GB Kit',
       'Trident Z5 Neo RGB DDR5 32GB Kit - catalog tham khảo PC Builder Store.', 'Nguồn tham khảo: https://phongvu.vn/c/linh-kien-may-tinh',
       'ACTIVE'
FROM product_types pt
JOIN categories c ON c.category_code='RAM'
LEFT JOIN brands b ON b.brand_name='G.Skill'
WHERE pt.type_code='RAM'
ON CONFLICT (model_code) DO UPDATE SET
 product_type_id=EXCLUDED.product_type_id,
 category_id=EXCLUDED.category_id,
 brand_id=EXCLUDED.brand_id,
 product_name=EXCLUDED.product_name,
 short_description=EXCLUDED.short_description,
 description=EXCLUDED.description,
 product_status='ACTIVE';

INSERT INTO product_offers
 (product_id, offer_code, condition_code, price, currency_code, stock_quantity,
  reserved_quantity, warranty_months, offer_status)
SELECT p.product_id, 'DEMO-F5-6000J3038F16GX2-TZ5NR', 'NEW',
       1500000, 'VND',
       5, 0, 36, 'ACTIVE'
FROM products p WHERE p.model_code='F5-6000J3038F16GX2-TZ5NR'
ON CONFLICT (offer_code) DO UPDATE SET
 product_id=EXCLUDED.product_id,
 condition_code=EXCLUDED.condition_code,
 price=EXCLUDED.price,
 currency_code=EXCLUDED.currency_code,
 stock_quantity=EXCLUDED.stock_quantity,
 warranty_months=EXCLUDED.warranty_months,
 offer_status='ACTIVE';

INSERT INTO product_attribute_values
 (product_id, attribute_definition_id, value_text)
SELECT p.product_id, ad.attribute_definition_id, 'DDR5'
FROM products p
JOIN product_types pt ON pt.type_code='RAM'
JOIN product_attribute_definitions ad
 ON ad.product_type_id=pt.product_type_id AND ad.attribute_code='memory_type'
WHERE p.model_code='F5-6000J3038F16GX2-TZ5NR'
ON CONFLICT (product_id, attribute_definition_id) DO UPDATE SET
 value_text=EXCLUDED.value_text, value_decimal=NULL, value_integer=NULL, value_boolean=NULL, value_json=NULL;

INSERT INTO product_attribute_values
 (product_id, attribute_definition_id, value_integer)
SELECT p.product_id, ad.attribute_definition_id, 32
FROM products p
JOIN product_types pt ON pt.type_code='RAM'
JOIN product_attribute_definitions ad
 ON ad.product_type_id=pt.product_type_id AND ad.attribute_code='capacity_gb'
WHERE p.model_code='F5-6000J3038F16GX2-TZ5NR'
ON CONFLICT (product_id, attribute_definition_id) DO UPDATE SET
 value_integer=EXCLUDED.value_integer, value_text=NULL, value_decimal=NULL, value_boolean=NULL, value_json=NULL;

INSERT INTO product_attribute_values
 (product_id, attribute_definition_id, value_integer)
SELECT p.product_id, ad.attribute_definition_id, 6000
FROM products p
JOIN product_types pt ON pt.type_code='RAM'
JOIN product_attribute_definitions ad
 ON ad.product_type_id=pt.product_type_id AND ad.attribute_code='speed_mhz'
WHERE p.model_code='F5-6000J3038F16GX2-TZ5NR'
ON CONFLICT (product_id, attribute_definition_id) DO UPDATE SET
 value_integer=EXCLUDED.value_integer, value_text=NULL, value_decimal=NULL, value_boolean=NULL, value_json=NULL;

INSERT INTO products
 (product_type_id, category_id, brand_id, model_code, product_name, short_description, description, product_status)
SELECT pt.product_type_id, c.category_id, b.brand_id, 'FF3D532G6000HC38ADC01', 'T-Force Delta RGB DDR5 32GB Kit',
       'T-Force Delta RGB DDR5 32GB Kit - catalog tham khảo PC Builder Store.', 'Nguồn tham khảo: https://phongvu.vn/c/linh-kien-may-tinh',
       'ACTIVE'
FROM product_types pt
JOIN categories c ON c.category_code='RAM'
LEFT JOIN brands b ON b.brand_name='TeamGroup'
WHERE pt.type_code='RAM'
ON CONFLICT (model_code) DO UPDATE SET
 product_type_id=EXCLUDED.product_type_id,
 category_id=EXCLUDED.category_id,
 brand_id=EXCLUDED.brand_id,
 product_name=EXCLUDED.product_name,
 short_description=EXCLUDED.short_description,
 description=EXCLUDED.description,
 product_status='ACTIVE';

INSERT INTO product_offers
 (product_id, offer_code, condition_code, price, currency_code, stock_quantity,
  reserved_quantity, warranty_months, offer_status)
SELECT p.product_id, 'DEMO-FF3D532G6000HC38ADC01', 'NEW',
       1500000, 'VND',
       5, 0, 36, 'ACTIVE'
FROM products p WHERE p.model_code='FF3D532G6000HC38ADC01'
ON CONFLICT (offer_code) DO UPDATE SET
 product_id=EXCLUDED.product_id,
 condition_code=EXCLUDED.condition_code,
 price=EXCLUDED.price,
 currency_code=EXCLUDED.currency_code,
 stock_quantity=EXCLUDED.stock_quantity,
 warranty_months=EXCLUDED.warranty_months,
 offer_status='ACTIVE';

INSERT INTO product_attribute_values
 (product_id, attribute_definition_id, value_text)
SELECT p.product_id, ad.attribute_definition_id, 'DDR5'
FROM products p
JOIN product_types pt ON pt.type_code='RAM'
JOIN product_attribute_definitions ad
 ON ad.product_type_id=pt.product_type_id AND ad.attribute_code='memory_type'
WHERE p.model_code='FF3D532G6000HC38ADC01'
ON CONFLICT (product_id, attribute_definition_id) DO UPDATE SET
 value_text=EXCLUDED.value_text, value_decimal=NULL, value_integer=NULL, value_boolean=NULL, value_json=NULL;

INSERT INTO product_attribute_values
 (product_id, attribute_definition_id, value_integer)
SELECT p.product_id, ad.attribute_definition_id, 32
FROM products p
JOIN product_types pt ON pt.type_code='RAM'
JOIN product_attribute_definitions ad
 ON ad.product_type_id=pt.product_type_id AND ad.attribute_code='capacity_gb'
WHERE p.model_code='FF3D532G6000HC38ADC01'
ON CONFLICT (product_id, attribute_definition_id) DO UPDATE SET
 value_integer=EXCLUDED.value_integer, value_text=NULL, value_decimal=NULL, value_boolean=NULL, value_json=NULL;

INSERT INTO product_attribute_values
 (product_id, attribute_definition_id, value_integer)
SELECT p.product_id, ad.attribute_definition_id, 6000
FROM products p
JOIN product_types pt ON pt.type_code='RAM'
JOIN product_attribute_definitions ad
 ON ad.product_type_id=pt.product_type_id AND ad.attribute_code='speed_mhz'
WHERE p.model_code='FF3D532G6000HC38ADC01'
ON CONFLICT (product_id, attribute_definition_id) DO UPDATE SET
 value_integer=EXCLUDED.value_integer, value_text=NULL, value_decimal=NULL, value_boolean=NULL, value_json=NULL;

INSERT INTO products
 (product_type_id, category_id, brand_id, model_code, product_name, short_description, description, product_status)
SELECT pt.product_type_id, c.category_id, b.brand_id, 'AX5U6000C4016G-DCLABK', 'XPG Lancer DDR5 32GB 6000 Kit',
       'XPG Lancer DDR5 32GB 6000 Kit - catalog tham khảo PC Builder Store.', 'Nguồn tham khảo: https://phongvu.vn/c/linh-kien-may-tinh',
       'ACTIVE'
FROM product_types pt
JOIN categories c ON c.category_code='RAM'
LEFT JOIN brands b ON b.brand_name='ADATA'
WHERE pt.type_code='RAM'
ON CONFLICT (model_code) DO UPDATE SET
 product_type_id=EXCLUDED.product_type_id,
 category_id=EXCLUDED.category_id,
 brand_id=EXCLUDED.brand_id,
 product_name=EXCLUDED.product_name,
 short_description=EXCLUDED.short_description,
 description=EXCLUDED.description,
 product_status='ACTIVE';

INSERT INTO product_offers
 (product_id, offer_code, condition_code, price, currency_code, stock_quantity,
  reserved_quantity, warranty_months, offer_status)
SELECT p.product_id, 'DEMO-AX5U6000C4016G-DCLABK', 'NEW',
       1500000, 'VND',
       5, 0, 36, 'ACTIVE'
FROM products p WHERE p.model_code='AX5U6000C4016G-DCLABK'
ON CONFLICT (offer_code) DO UPDATE SET
 product_id=EXCLUDED.product_id,
 condition_code=EXCLUDED.condition_code,
 price=EXCLUDED.price,
 currency_code=EXCLUDED.currency_code,
 stock_quantity=EXCLUDED.stock_quantity,
 warranty_months=EXCLUDED.warranty_months,
 offer_status='ACTIVE';

INSERT INTO product_attribute_values
 (product_id, attribute_definition_id, value_text)
SELECT p.product_id, ad.attribute_definition_id, 'DDR5'
FROM products p
JOIN product_types pt ON pt.type_code='RAM'
JOIN product_attribute_definitions ad
 ON ad.product_type_id=pt.product_type_id AND ad.attribute_code='memory_type'
WHERE p.model_code='AX5U6000C4016G-DCLABK'
ON CONFLICT (product_id, attribute_definition_id) DO UPDATE SET
 value_text=EXCLUDED.value_text, value_decimal=NULL, value_integer=NULL, value_boolean=NULL, value_json=NULL;

INSERT INTO product_attribute_values
 (product_id, attribute_definition_id, value_integer)
SELECT p.product_id, ad.attribute_definition_id, 32
FROM products p
JOIN product_types pt ON pt.type_code='RAM'
JOIN product_attribute_definitions ad
 ON ad.product_type_id=pt.product_type_id AND ad.attribute_code='capacity_gb'
WHERE p.model_code='AX5U6000C4016G-DCLABK'
ON CONFLICT (product_id, attribute_definition_id) DO UPDATE SET
 value_integer=EXCLUDED.value_integer, value_text=NULL, value_decimal=NULL, value_boolean=NULL, value_json=NULL;

INSERT INTO product_attribute_values
 (product_id, attribute_definition_id, value_integer)
SELECT p.product_id, ad.attribute_definition_id, 6000
FROM products p
JOIN product_types pt ON pt.type_code='RAM'
JOIN product_attribute_definitions ad
 ON ad.product_type_id=pt.product_type_id AND ad.attribute_code='speed_mhz'
WHERE p.model_code='AX5U6000C4016G-DCLABK'
ON CONFLICT (product_id, attribute_definition_id) DO UPDATE SET
 value_integer=EXCLUDED.value_integer, value_text=NULL, value_decimal=NULL, value_boolean=NULL, value_json=NULL;

INSERT INTO products
 (product_type_id, category_id, brand_id, model_code, product_name, short_description, description, product_status)
SELECT pt.product_type_id, c.category_id, b.brand_id, 'CP2K16G56C46U5', 'Pro DDR5 32GB 5600 Kit',
       'Pro DDR5 32GB 5600 Kit - catalog tham khảo PC Builder Store.', 'Nguồn tham khảo: https://www.crucial.com/',
       'ACTIVE'
FROM product_types pt
JOIN categories c ON c.category_code='RAM'
LEFT JOIN brands b ON b.brand_name='Crucial'
WHERE pt.type_code='RAM'
ON CONFLICT (model_code) DO UPDATE SET
 product_type_id=EXCLUDED.product_type_id,
 category_id=EXCLUDED.category_id,
 brand_id=EXCLUDED.brand_id,
 product_name=EXCLUDED.product_name,
 short_description=EXCLUDED.short_description,
 description=EXCLUDED.description,
 product_status='ACTIVE';

INSERT INTO product_offers
 (product_id, offer_code, condition_code, price, currency_code, stock_quantity,
  reserved_quantity, warranty_months, offer_status)
SELECT p.product_id, 'DEMO-CP2K16G56C46U5', 'NEW',
       1500000, 'VND',
       5, 0, 36, 'ACTIVE'
FROM products p WHERE p.model_code='CP2K16G56C46U5'
ON CONFLICT (offer_code) DO UPDATE SET
 product_id=EXCLUDED.product_id,
 condition_code=EXCLUDED.condition_code,
 price=EXCLUDED.price,
 currency_code=EXCLUDED.currency_code,
 stock_quantity=EXCLUDED.stock_quantity,
 warranty_months=EXCLUDED.warranty_months,
 offer_status='ACTIVE';

INSERT INTO product_attribute_values
 (product_id, attribute_definition_id, value_text)
SELECT p.product_id, ad.attribute_definition_id, 'DDR5'
FROM products p
JOIN product_types pt ON pt.type_code='RAM'
JOIN product_attribute_definitions ad
 ON ad.product_type_id=pt.product_type_id AND ad.attribute_code='memory_type'
WHERE p.model_code='CP2K16G56C46U5'
ON CONFLICT (product_id, attribute_definition_id) DO UPDATE SET
 value_text=EXCLUDED.value_text, value_decimal=NULL, value_integer=NULL, value_boolean=NULL, value_json=NULL;

INSERT INTO product_attribute_values
 (product_id, attribute_definition_id, value_integer)
SELECT p.product_id, ad.attribute_definition_id, 32
FROM products p
JOIN product_types pt ON pt.type_code='RAM'
JOIN product_attribute_definitions ad
 ON ad.product_type_id=pt.product_type_id AND ad.attribute_code='capacity_gb'
WHERE p.model_code='CP2K16G56C46U5'
ON CONFLICT (product_id, attribute_definition_id) DO UPDATE SET
 value_integer=EXCLUDED.value_integer, value_text=NULL, value_decimal=NULL, value_boolean=NULL, value_json=NULL;

INSERT INTO product_attribute_values
 (product_id, attribute_definition_id, value_integer)
SELECT p.product_id, ad.attribute_definition_id, 5600
FROM products p
JOIN product_types pt ON pt.type_code='RAM'
JOIN product_attribute_definitions ad
 ON ad.product_type_id=pt.product_type_id AND ad.attribute_code='speed_mhz'
WHERE p.model_code='CP2K16G56C46U5'
ON CONFLICT (product_id, attribute_definition_id) DO UPDATE SET
 value_integer=EXCLUDED.value_integer, value_text=NULL, value_decimal=NULL, value_boolean=NULL, value_json=NULL;

INSERT INTO products
 (product_type_id, category_id, brand_id, model_code, product_name, short_description, description, product_status)
SELECT pt.product_type_id, c.category_id, b.brand_id, 'PVV532G600C36K', 'Viper Venom DDR5 32GB 6000 Kit',
       'Viper Venom DDR5 32GB 6000 Kit - catalog tham khảo PC Builder Store.', 'Nguồn tham khảo: https://phongvu.vn/c/linh-kien-may-tinh',
       'ACTIVE'
FROM product_types pt
JOIN categories c ON c.category_code='RAM'
LEFT JOIN brands b ON b.brand_name='Patriot'
WHERE pt.type_code='RAM'
ON CONFLICT (model_code) DO UPDATE SET
 product_type_id=EXCLUDED.product_type_id,
 category_id=EXCLUDED.category_id,
 brand_id=EXCLUDED.brand_id,
 product_name=EXCLUDED.product_name,
 short_description=EXCLUDED.short_description,
 description=EXCLUDED.description,
 product_status='ACTIVE';

INSERT INTO product_offers
 (product_id, offer_code, condition_code, price, currency_code, stock_quantity,
  reserved_quantity, warranty_months, offer_status)
SELECT p.product_id, 'DEMO-PVV532G600C36K', 'NEW',
       1500000, 'VND',
       5, 0, 36, 'ACTIVE'
FROM products p WHERE p.model_code='PVV532G600C36K'
ON CONFLICT (offer_code) DO UPDATE SET
 product_id=EXCLUDED.product_id,
 condition_code=EXCLUDED.condition_code,
 price=EXCLUDED.price,
 currency_code=EXCLUDED.currency_code,
 stock_quantity=EXCLUDED.stock_quantity,
 warranty_months=EXCLUDED.warranty_months,
 offer_status='ACTIVE';

INSERT INTO product_attribute_values
 (product_id, attribute_definition_id, value_text)
SELECT p.product_id, ad.attribute_definition_id, 'DDR5'
FROM products p
JOIN product_types pt ON pt.type_code='RAM'
JOIN product_attribute_definitions ad
 ON ad.product_type_id=pt.product_type_id AND ad.attribute_code='memory_type'
WHERE p.model_code='PVV532G600C36K'
ON CONFLICT (product_id, attribute_definition_id) DO UPDATE SET
 value_text=EXCLUDED.value_text, value_decimal=NULL, value_integer=NULL, value_boolean=NULL, value_json=NULL;

INSERT INTO product_attribute_values
 (product_id, attribute_definition_id, value_integer)
SELECT p.product_id, ad.attribute_definition_id, 32
FROM products p
JOIN product_types pt ON pt.type_code='RAM'
JOIN product_attribute_definitions ad
 ON ad.product_type_id=pt.product_type_id AND ad.attribute_code='capacity_gb'
WHERE p.model_code='PVV532G600C36K'
ON CONFLICT (product_id, attribute_definition_id) DO UPDATE SET
 value_integer=EXCLUDED.value_integer, value_text=NULL, value_decimal=NULL, value_boolean=NULL, value_json=NULL;

INSERT INTO product_attribute_values
 (product_id, attribute_definition_id, value_integer)
SELECT p.product_id, ad.attribute_definition_id, 6000
FROM products p
JOIN product_types pt ON pt.type_code='RAM'
JOIN product_attribute_definitions ad
 ON ad.product_type_id=pt.product_type_id AND ad.attribute_code='speed_mhz'
WHERE p.model_code='PVV532G600C36K'
ON CONFLICT (product_id, attribute_definition_id) DO UPDATE SET
 value_integer=EXCLUDED.value_integer, value_text=NULL, value_decimal=NULL, value_boolean=NULL, value_json=NULL;

INSERT INTO products
 (product_type_id, category_id, brand_id, model_code, product_name, short_description, description, product_status)
SELECT pt.product_type_id, c.category_id, b.brand_id, 'MZ-V9S1T0B/AM', '990 EVO Plus 1TB',
       '990 EVO Plus 1TB - catalog tham khảo PC Builder Store.', 'Nguồn tham khảo: https://news.samsung.com/global/samsung-launches-990-evo-plus-ssd-with-best-in-class-performance-speeds-supported-by-pcie-4-0',
       'ACTIVE'
FROM product_types pt
JOIN categories c ON c.category_code='STORAGE'
LEFT JOIN brands b ON b.brand_name='Samsung'
WHERE pt.type_code='STORAGE'
ON CONFLICT (model_code) DO UPDATE SET
 product_type_id=EXCLUDED.product_type_id,
 category_id=EXCLUDED.category_id,
 brand_id=EXCLUDED.brand_id,
 product_name=EXCLUDED.product_name,
 short_description=EXCLUDED.short_description,
 description=EXCLUDED.description,
 product_status='ACTIVE';

INSERT INTO product_offers
 (product_id, offer_code, condition_code, price, currency_code, stock_quantity,
  reserved_quantity, warranty_months, offer_status)
SELECT p.product_id, 'DEMO-MZ-V9S1T0B/AM', 'NEW',
       2200000, 'VND',
       5, 0, 36, 'ACTIVE'
FROM products p WHERE p.model_code='MZ-V9S1T0B/AM'
ON CONFLICT (offer_code) DO UPDATE SET
 product_id=EXCLUDED.product_id,
 condition_code=EXCLUDED.condition_code,
 price=EXCLUDED.price,
 currency_code=EXCLUDED.currency_code,
 stock_quantity=EXCLUDED.stock_quantity,
 warranty_months=EXCLUDED.warranty_months,
 offer_status='ACTIVE';

INSERT INTO product_attribute_values
 (product_id, attribute_definition_id, value_integer)
SELECT p.product_id, ad.attribute_definition_id, 1024
FROM products p
JOIN product_types pt ON pt.type_code='STORAGE'
JOIN product_attribute_definitions ad
 ON ad.product_type_id=pt.product_type_id AND ad.attribute_code='capacity_gb'
WHERE p.model_code='MZ-V9S1T0B/AM'
ON CONFLICT (product_id, attribute_definition_id) DO UPDATE SET
 value_integer=EXCLUDED.value_integer, value_text=NULL, value_decimal=NULL, value_boolean=NULL, value_json=NULL;

INSERT INTO product_attribute_values
 (product_id, attribute_definition_id, value_text)
SELECT p.product_id, ad.attribute_definition_id, 'NVMe PCIe 4.0 x4 / 5.0 x2'
FROM products p
JOIN product_types pt ON pt.type_code='STORAGE'
JOIN product_attribute_definitions ad
 ON ad.product_type_id=pt.product_type_id AND ad.attribute_code='interface'
WHERE p.model_code='MZ-V9S1T0B/AM'
ON CONFLICT (product_id, attribute_definition_id) DO UPDATE SET
 value_text=EXCLUDED.value_text, value_decimal=NULL, value_integer=NULL, value_boolean=NULL, value_json=NULL;

INSERT INTO product_attribute_values
 (product_id, attribute_definition_id, value_text)
SELECT p.product_id, ad.attribute_definition_id, 'M.2 2280'
FROM products p
JOIN product_types pt ON pt.type_code='STORAGE'
JOIN product_attribute_definitions ad
 ON ad.product_type_id=pt.product_type_id AND ad.attribute_code='form_factor'
WHERE p.model_code='MZ-V9S1T0B/AM'
ON CONFLICT (product_id, attribute_definition_id) DO UPDATE SET
 value_text=EXCLUDED.value_text, value_decimal=NULL, value_integer=NULL, value_boolean=NULL, value_json=NULL;

INSERT INTO products
 (product_type_id, category_id, brand_id, model_code, product_name, short_description, description, product_status)
SELECT pt.product_type_id, c.category_id, b.brand_id, 'MZ-V9S2T0B/AM', '990 EVO Plus 2TB',
       '990 EVO Plus 2TB - catalog tham khảo PC Builder Store.', 'Nguồn tham khảo: https://news.samsung.com/global/samsung-launches-990-evo-plus-ssd-with-best-in-class-performance-speeds-supported-by-pcie-4-0',
       'ACTIVE'
FROM product_types pt
JOIN categories c ON c.category_code='STORAGE'
LEFT JOIN brands b ON b.brand_name='Samsung'
WHERE pt.type_code='STORAGE'
ON CONFLICT (model_code) DO UPDATE SET
 product_type_id=EXCLUDED.product_type_id,
 category_id=EXCLUDED.category_id,
 brand_id=EXCLUDED.brand_id,
 product_name=EXCLUDED.product_name,
 short_description=EXCLUDED.short_description,
 description=EXCLUDED.description,
 product_status='ACTIVE';

INSERT INTO product_offers
 (product_id, offer_code, condition_code, price, currency_code, stock_quantity,
  reserved_quantity, warranty_months, offer_status)
SELECT p.product_id, 'DEMO-MZ-V9S2T0B/AM', 'NEW',
       2200000, 'VND',
       5, 0, 36, 'ACTIVE'
FROM products p WHERE p.model_code='MZ-V9S2T0B/AM'
ON CONFLICT (offer_code) DO UPDATE SET
 product_id=EXCLUDED.product_id,
 condition_code=EXCLUDED.condition_code,
 price=EXCLUDED.price,
 currency_code=EXCLUDED.currency_code,
 stock_quantity=EXCLUDED.stock_quantity,
 warranty_months=EXCLUDED.warranty_months,
 offer_status='ACTIVE';

INSERT INTO product_attribute_values
 (product_id, attribute_definition_id, value_integer)
SELECT p.product_id, ad.attribute_definition_id, 2048
FROM products p
JOIN product_types pt ON pt.type_code='STORAGE'
JOIN product_attribute_definitions ad
 ON ad.product_type_id=pt.product_type_id AND ad.attribute_code='capacity_gb'
WHERE p.model_code='MZ-V9S2T0B/AM'
ON CONFLICT (product_id, attribute_definition_id) DO UPDATE SET
 value_integer=EXCLUDED.value_integer, value_text=NULL, value_decimal=NULL, value_boolean=NULL, value_json=NULL;

INSERT INTO product_attribute_values
 (product_id, attribute_definition_id, value_text)
SELECT p.product_id, ad.attribute_definition_id, 'NVMe PCIe 4.0 x4 / 5.0 x2'
FROM products p
JOIN product_types pt ON pt.type_code='STORAGE'
JOIN product_attribute_definitions ad
 ON ad.product_type_id=pt.product_type_id AND ad.attribute_code='interface'
WHERE p.model_code='MZ-V9S2T0B/AM'
ON CONFLICT (product_id, attribute_definition_id) DO UPDATE SET
 value_text=EXCLUDED.value_text, value_decimal=NULL, value_integer=NULL, value_boolean=NULL, value_json=NULL;

INSERT INTO product_attribute_values
 (product_id, attribute_definition_id, value_text)
SELECT p.product_id, ad.attribute_definition_id, 'M.2 2280'
FROM products p
JOIN product_types pt ON pt.type_code='STORAGE'
JOIN product_attribute_definitions ad
 ON ad.product_type_id=pt.product_type_id AND ad.attribute_code='form_factor'
WHERE p.model_code='MZ-V9S2T0B/AM'
ON CONFLICT (product_id, attribute_definition_id) DO UPDATE SET
 value_text=EXCLUDED.value_text, value_decimal=NULL, value_integer=NULL, value_boolean=NULL, value_json=NULL;

INSERT INTO products
 (product_type_id, category_id, brand_id, model_code, product_name, short_description, description, product_status)
SELECT pt.product_type_id, c.category_id, b.brand_id, 'MZ-V9P1T0B/AM', '990 PRO 1TB',
       '990 PRO 1TB - catalog tham khảo PC Builder Store.', 'Nguồn tham khảo: https://semiconductor.samsung.com/consumer-storage/',
       'ACTIVE'
FROM product_types pt
JOIN categories c ON c.category_code='STORAGE'
LEFT JOIN brands b ON b.brand_name='Samsung'
WHERE pt.type_code='STORAGE'
ON CONFLICT (model_code) DO UPDATE SET
 product_type_id=EXCLUDED.product_type_id,
 category_id=EXCLUDED.category_id,
 brand_id=EXCLUDED.brand_id,
 product_name=EXCLUDED.product_name,
 short_description=EXCLUDED.short_description,
 description=EXCLUDED.description,
 product_status='ACTIVE';

INSERT INTO product_offers
 (product_id, offer_code, condition_code, price, currency_code, stock_quantity,
  reserved_quantity, warranty_months, offer_status)
SELECT p.product_id, 'DEMO-MZ-V9P1T0B/AM', 'NEW',
       2200000, 'VND',
       5, 0, 36, 'ACTIVE'
FROM products p WHERE p.model_code='MZ-V9P1T0B/AM'
ON CONFLICT (offer_code) DO UPDATE SET
 product_id=EXCLUDED.product_id,
 condition_code=EXCLUDED.condition_code,
 price=EXCLUDED.price,
 currency_code=EXCLUDED.currency_code,
 stock_quantity=EXCLUDED.stock_quantity,
 warranty_months=EXCLUDED.warranty_months,
 offer_status='ACTIVE';

INSERT INTO product_attribute_values
 (product_id, attribute_definition_id, value_integer)
SELECT p.product_id, ad.attribute_definition_id, 1024
FROM products p
JOIN product_types pt ON pt.type_code='STORAGE'
JOIN product_attribute_definitions ad
 ON ad.product_type_id=pt.product_type_id AND ad.attribute_code='capacity_gb'
WHERE p.model_code='MZ-V9P1T0B/AM'
ON CONFLICT (product_id, attribute_definition_id) DO UPDATE SET
 value_integer=EXCLUDED.value_integer, value_text=NULL, value_decimal=NULL, value_boolean=NULL, value_json=NULL;

INSERT INTO product_attribute_values
 (product_id, attribute_definition_id, value_text)
SELECT p.product_id, ad.attribute_definition_id, 'NVMe PCIe 4.0 x4'
FROM products p
JOIN product_types pt ON pt.type_code='STORAGE'
JOIN product_attribute_definitions ad
 ON ad.product_type_id=pt.product_type_id AND ad.attribute_code='interface'
WHERE p.model_code='MZ-V9P1T0B/AM'
ON CONFLICT (product_id, attribute_definition_id) DO UPDATE SET
 value_text=EXCLUDED.value_text, value_decimal=NULL, value_integer=NULL, value_boolean=NULL, value_json=NULL;

INSERT INTO product_attribute_values
 (product_id, attribute_definition_id, value_text)
SELECT p.product_id, ad.attribute_definition_id, 'M.2 2280'
FROM products p
JOIN product_types pt ON pt.type_code='STORAGE'
JOIN product_attribute_definitions ad
 ON ad.product_type_id=pt.product_type_id AND ad.attribute_code='form_factor'
WHERE p.model_code='MZ-V9P1T0B/AM'
ON CONFLICT (product_id, attribute_definition_id) DO UPDATE SET
 value_text=EXCLUDED.value_text, value_decimal=NULL, value_integer=NULL, value_boolean=NULL, value_json=NULL;

INSERT INTO products
 (product_type_id, category_id, brand_id, model_code, product_name, short_description, description, product_status)
SELECT pt.product_type_id, c.category_id, b.brand_id, 'MZ-V9P2T0B/AM', '990 PRO 2TB',
       '990 PRO 2TB - catalog tham khảo PC Builder Store.', 'Nguồn tham khảo: https://semiconductor.samsung.com/consumer-storage/',
       'ACTIVE'
FROM product_types pt
JOIN categories c ON c.category_code='STORAGE'
LEFT JOIN brands b ON b.brand_name='Samsung'
WHERE pt.type_code='STORAGE'
ON CONFLICT (model_code) DO UPDATE SET
 product_type_id=EXCLUDED.product_type_id,
 category_id=EXCLUDED.category_id,
 brand_id=EXCLUDED.brand_id,
 product_name=EXCLUDED.product_name,
 short_description=EXCLUDED.short_description,
 description=EXCLUDED.description,
 product_status='ACTIVE';

INSERT INTO product_offers
 (product_id, offer_code, condition_code, price, currency_code, stock_quantity,
  reserved_quantity, warranty_months, offer_status)
SELECT p.product_id, 'DEMO-MZ-V9P2T0B/AM', 'NEW',
       2200000, 'VND',
       5, 0, 36, 'ACTIVE'
FROM products p WHERE p.model_code='MZ-V9P2T0B/AM'
ON CONFLICT (offer_code) DO UPDATE SET
 product_id=EXCLUDED.product_id,
 condition_code=EXCLUDED.condition_code,
 price=EXCLUDED.price,
 currency_code=EXCLUDED.currency_code,
 stock_quantity=EXCLUDED.stock_quantity,
 warranty_months=EXCLUDED.warranty_months,
 offer_status='ACTIVE';

INSERT INTO product_attribute_values
 (product_id, attribute_definition_id, value_integer)
SELECT p.product_id, ad.attribute_definition_id, 2048
FROM products p
JOIN product_types pt ON pt.type_code='STORAGE'
JOIN product_attribute_definitions ad
 ON ad.product_type_id=pt.product_type_id AND ad.attribute_code='capacity_gb'
WHERE p.model_code='MZ-V9P2T0B/AM'
ON CONFLICT (product_id, attribute_definition_id) DO UPDATE SET
 value_integer=EXCLUDED.value_integer, value_text=NULL, value_decimal=NULL, value_boolean=NULL, value_json=NULL;

INSERT INTO product_attribute_values
 (product_id, attribute_definition_id, value_text)
SELECT p.product_id, ad.attribute_definition_id, 'NVMe PCIe 4.0 x4'
FROM products p
JOIN product_types pt ON pt.type_code='STORAGE'
JOIN product_attribute_definitions ad
 ON ad.product_type_id=pt.product_type_id AND ad.attribute_code='interface'
WHERE p.model_code='MZ-V9P2T0B/AM'
ON CONFLICT (product_id, attribute_definition_id) DO UPDATE SET
 value_text=EXCLUDED.value_text, value_decimal=NULL, value_integer=NULL, value_boolean=NULL, value_json=NULL;

INSERT INTO product_attribute_values
 (product_id, attribute_definition_id, value_text)
SELECT p.product_id, ad.attribute_definition_id, 'M.2 2280'
FROM products p
JOIN product_types pt ON pt.type_code='STORAGE'
JOIN product_attribute_definitions ad
 ON ad.product_type_id=pt.product_type_id AND ad.attribute_code='form_factor'
WHERE p.model_code='MZ-V9P2T0B/AM'
ON CONFLICT (product_id, attribute_definition_id) DO UPDATE SET
 value_text=EXCLUDED.value_text, value_decimal=NULL, value_integer=NULL, value_boolean=NULL, value_json=NULL;

INSERT INTO products
 (product_type_id, category_id, brand_id, model_code, product_name, short_description, description, product_status)
SELECT pt.product_type_id, c.category_id, b.brand_id, 'WDS100T2X0E', 'WD_BLACK SN850X 1TB',
       'WD_BLACK SN850X 1TB - catalog tham khảo PC Builder Store.', 'Nguồn tham khảo: https://www.westerndigital.com/',
       'ACTIVE'
FROM product_types pt
JOIN categories c ON c.category_code='STORAGE'
LEFT JOIN brands b ON b.brand_name='WD'
WHERE pt.type_code='STORAGE'
ON CONFLICT (model_code) DO UPDATE SET
 product_type_id=EXCLUDED.product_type_id,
 category_id=EXCLUDED.category_id,
 brand_id=EXCLUDED.brand_id,
 product_name=EXCLUDED.product_name,
 short_description=EXCLUDED.short_description,
 description=EXCLUDED.description,
 product_status='ACTIVE';

INSERT INTO product_offers
 (product_id, offer_code, condition_code, price, currency_code, stock_quantity,
  reserved_quantity, warranty_months, offer_status)
SELECT p.product_id, 'DEMO-WDS100T2X0E', 'NEW',
       2200000, 'VND',
       5, 0, 36, 'ACTIVE'
FROM products p WHERE p.model_code='WDS100T2X0E'
ON CONFLICT (offer_code) DO UPDATE SET
 product_id=EXCLUDED.product_id,
 condition_code=EXCLUDED.condition_code,
 price=EXCLUDED.price,
 currency_code=EXCLUDED.currency_code,
 stock_quantity=EXCLUDED.stock_quantity,
 warranty_months=EXCLUDED.warranty_months,
 offer_status='ACTIVE';

INSERT INTO product_attribute_values
 (product_id, attribute_definition_id, value_integer)
SELECT p.product_id, ad.attribute_definition_id, 1024
FROM products p
JOIN product_types pt ON pt.type_code='STORAGE'
JOIN product_attribute_definitions ad
 ON ad.product_type_id=pt.product_type_id AND ad.attribute_code='capacity_gb'
WHERE p.model_code='WDS100T2X0E'
ON CONFLICT (product_id, attribute_definition_id) DO UPDATE SET
 value_integer=EXCLUDED.value_integer, value_text=NULL, value_decimal=NULL, value_boolean=NULL, value_json=NULL;

INSERT INTO product_attribute_values
 (product_id, attribute_definition_id, value_text)
SELECT p.product_id, ad.attribute_definition_id, 'NVMe PCIe 4.0 x4'
FROM products p
JOIN product_types pt ON pt.type_code='STORAGE'
JOIN product_attribute_definitions ad
 ON ad.product_type_id=pt.product_type_id AND ad.attribute_code='interface'
WHERE p.model_code='WDS100T2X0E'
ON CONFLICT (product_id, attribute_definition_id) DO UPDATE SET
 value_text=EXCLUDED.value_text, value_decimal=NULL, value_integer=NULL, value_boolean=NULL, value_json=NULL;

INSERT INTO product_attribute_values
 (product_id, attribute_definition_id, value_text)
SELECT p.product_id, ad.attribute_definition_id, 'M.2 2280'
FROM products p
JOIN product_types pt ON pt.type_code='STORAGE'
JOIN product_attribute_definitions ad
 ON ad.product_type_id=pt.product_type_id AND ad.attribute_code='form_factor'
WHERE p.model_code='WDS100T2X0E'
ON CONFLICT (product_id, attribute_definition_id) DO UPDATE SET
 value_text=EXCLUDED.value_text, value_decimal=NULL, value_integer=NULL, value_boolean=NULL, value_json=NULL;

INSERT INTO products
 (product_type_id, category_id, brand_id, model_code, product_name, short_description, description, product_status)
SELECT pt.product_type_id, c.category_id, b.brand_id, 'WDS200T2X0E', 'WD_BLACK SN850X 2TB',
       'WD_BLACK SN850X 2TB - catalog tham khảo PC Builder Store.', 'Nguồn tham khảo: https://www.westerndigital.com/',
       'ACTIVE'
FROM product_types pt
JOIN categories c ON c.category_code='STORAGE'
LEFT JOIN brands b ON b.brand_name='WD'
WHERE pt.type_code='STORAGE'
ON CONFLICT (model_code) DO UPDATE SET
 product_type_id=EXCLUDED.product_type_id,
 category_id=EXCLUDED.category_id,
 brand_id=EXCLUDED.brand_id,
 product_name=EXCLUDED.product_name,
 short_description=EXCLUDED.short_description,
 description=EXCLUDED.description,
 product_status='ACTIVE';

INSERT INTO product_offers
 (product_id, offer_code, condition_code, price, currency_code, stock_quantity,
  reserved_quantity, warranty_months, offer_status)
SELECT p.product_id, 'DEMO-WDS200T2X0E', 'NEW',
       2200000, 'VND',
       5, 0, 36, 'ACTIVE'
FROM products p WHERE p.model_code='WDS200T2X0E'
ON CONFLICT (offer_code) DO UPDATE SET
 product_id=EXCLUDED.product_id,
 condition_code=EXCLUDED.condition_code,
 price=EXCLUDED.price,
 currency_code=EXCLUDED.currency_code,
 stock_quantity=EXCLUDED.stock_quantity,
 warranty_months=EXCLUDED.warranty_months,
 offer_status='ACTIVE';

INSERT INTO product_attribute_values
 (product_id, attribute_definition_id, value_integer)
SELECT p.product_id, ad.attribute_definition_id, 2048
FROM products p
JOIN product_types pt ON pt.type_code='STORAGE'
JOIN product_attribute_definitions ad
 ON ad.product_type_id=pt.product_type_id AND ad.attribute_code='capacity_gb'
WHERE p.model_code='WDS200T2X0E'
ON CONFLICT (product_id, attribute_definition_id) DO UPDATE SET
 value_integer=EXCLUDED.value_integer, value_text=NULL, value_decimal=NULL, value_boolean=NULL, value_json=NULL;

INSERT INTO product_attribute_values
 (product_id, attribute_definition_id, value_text)
SELECT p.product_id, ad.attribute_definition_id, 'NVMe PCIe 4.0 x4'
FROM products p
JOIN product_types pt ON pt.type_code='STORAGE'
JOIN product_attribute_definitions ad
 ON ad.product_type_id=pt.product_type_id AND ad.attribute_code='interface'
WHERE p.model_code='WDS200T2X0E'
ON CONFLICT (product_id, attribute_definition_id) DO UPDATE SET
 value_text=EXCLUDED.value_text, value_decimal=NULL, value_integer=NULL, value_boolean=NULL, value_json=NULL;

INSERT INTO product_attribute_values
 (product_id, attribute_definition_id, value_text)
SELECT p.product_id, ad.attribute_definition_id, 'M.2 2280'
FROM products p
JOIN product_types pt ON pt.type_code='STORAGE'
JOIN product_attribute_definitions ad
 ON ad.product_type_id=pt.product_type_id AND ad.attribute_code='form_factor'
WHERE p.model_code='WDS200T2X0E'
ON CONFLICT (product_id, attribute_definition_id) DO UPDATE SET
 value_text=EXCLUDED.value_text, value_decimal=NULL, value_integer=NULL, value_boolean=NULL, value_json=NULL;

INSERT INTO products
 (product_type_id, category_id, brand_id, model_code, product_name, short_description, description, product_status)
SELECT pt.product_type_id, c.category_id, b.brand_id, 'SKC3000S/1024G', 'KC3000 1TB',
       'KC3000 1TB - catalog tham khảo PC Builder Store.', 'Nguồn tham khảo: https://www.kingston.com/',
       'ACTIVE'
FROM product_types pt
JOIN categories c ON c.category_code='STORAGE'
LEFT JOIN brands b ON b.brand_name='Kingston'
WHERE pt.type_code='STORAGE'
ON CONFLICT (model_code) DO UPDATE SET
 product_type_id=EXCLUDED.product_type_id,
 category_id=EXCLUDED.category_id,
 brand_id=EXCLUDED.brand_id,
 product_name=EXCLUDED.product_name,
 short_description=EXCLUDED.short_description,
 description=EXCLUDED.description,
 product_status='ACTIVE';

INSERT INTO product_offers
 (product_id, offer_code, condition_code, price, currency_code, stock_quantity,
  reserved_quantity, warranty_months, offer_status)
SELECT p.product_id, 'DEMO-SKC3000S/1024G', 'NEW',
       2200000, 'VND',
       5, 0, 36, 'ACTIVE'
FROM products p WHERE p.model_code='SKC3000S/1024G'
ON CONFLICT (offer_code) DO UPDATE SET
 product_id=EXCLUDED.product_id,
 condition_code=EXCLUDED.condition_code,
 price=EXCLUDED.price,
 currency_code=EXCLUDED.currency_code,
 stock_quantity=EXCLUDED.stock_quantity,
 warranty_months=EXCLUDED.warranty_months,
 offer_status='ACTIVE';

INSERT INTO product_attribute_values
 (product_id, attribute_definition_id, value_integer)
SELECT p.product_id, ad.attribute_definition_id, 1024
FROM products p
JOIN product_types pt ON pt.type_code='STORAGE'
JOIN product_attribute_definitions ad
 ON ad.product_type_id=pt.product_type_id AND ad.attribute_code='capacity_gb'
WHERE p.model_code='SKC3000S/1024G'
ON CONFLICT (product_id, attribute_definition_id) DO UPDATE SET
 value_integer=EXCLUDED.value_integer, value_text=NULL, value_decimal=NULL, value_boolean=NULL, value_json=NULL;

INSERT INTO product_attribute_values
 (product_id, attribute_definition_id, value_text)
SELECT p.product_id, ad.attribute_definition_id, 'NVMe PCIe 4.0 x4'
FROM products p
JOIN product_types pt ON pt.type_code='STORAGE'
JOIN product_attribute_definitions ad
 ON ad.product_type_id=pt.product_type_id AND ad.attribute_code='interface'
WHERE p.model_code='SKC3000S/1024G'
ON CONFLICT (product_id, attribute_definition_id) DO UPDATE SET
 value_text=EXCLUDED.value_text, value_decimal=NULL, value_integer=NULL, value_boolean=NULL, value_json=NULL;

INSERT INTO product_attribute_values
 (product_id, attribute_definition_id, value_text)
SELECT p.product_id, ad.attribute_definition_id, 'M.2 2280'
FROM products p
JOIN product_types pt ON pt.type_code='STORAGE'
JOIN product_attribute_definitions ad
 ON ad.product_type_id=pt.product_type_id AND ad.attribute_code='form_factor'
WHERE p.model_code='SKC3000S/1024G'
ON CONFLICT (product_id, attribute_definition_id) DO UPDATE SET
 value_text=EXCLUDED.value_text, value_decimal=NULL, value_integer=NULL, value_boolean=NULL, value_json=NULL;

INSERT INTO products
 (product_type_id, category_id, brand_id, model_code, product_name, short_description, description, product_status)
SELECT pt.product_type_id, c.category_id, b.brand_id, 'SKC3000D/2048G', 'KC3000 2TB',
       'KC3000 2TB - catalog tham khảo PC Builder Store.', 'Nguồn tham khảo: https://www.kingston.com/',
       'ACTIVE'
FROM product_types pt
JOIN categories c ON c.category_code='STORAGE'
LEFT JOIN brands b ON b.brand_name='Kingston'
WHERE pt.type_code='STORAGE'
ON CONFLICT (model_code) DO UPDATE SET
 product_type_id=EXCLUDED.product_type_id,
 category_id=EXCLUDED.category_id,
 brand_id=EXCLUDED.brand_id,
 product_name=EXCLUDED.product_name,
 short_description=EXCLUDED.short_description,
 description=EXCLUDED.description,
 product_status='ACTIVE';

INSERT INTO product_offers
 (product_id, offer_code, condition_code, price, currency_code, stock_quantity,
  reserved_quantity, warranty_months, offer_status)
SELECT p.product_id, 'DEMO-SKC3000D/2048G', 'NEW',
       2200000, 'VND',
       5, 0, 36, 'ACTIVE'
FROM products p WHERE p.model_code='SKC3000D/2048G'
ON CONFLICT (offer_code) DO UPDATE SET
 product_id=EXCLUDED.product_id,
 condition_code=EXCLUDED.condition_code,
 price=EXCLUDED.price,
 currency_code=EXCLUDED.currency_code,
 stock_quantity=EXCLUDED.stock_quantity,
 warranty_months=EXCLUDED.warranty_months,
 offer_status='ACTIVE';

INSERT INTO product_attribute_values
 (product_id, attribute_definition_id, value_integer)
SELECT p.product_id, ad.attribute_definition_id, 2048
FROM products p
JOIN product_types pt ON pt.type_code='STORAGE'
JOIN product_attribute_definitions ad
 ON ad.product_type_id=pt.product_type_id AND ad.attribute_code='capacity_gb'
WHERE p.model_code='SKC3000D/2048G'
ON CONFLICT (product_id, attribute_definition_id) DO UPDATE SET
 value_integer=EXCLUDED.value_integer, value_text=NULL, value_decimal=NULL, value_boolean=NULL, value_json=NULL;

INSERT INTO product_attribute_values
 (product_id, attribute_definition_id, value_text)
SELECT p.product_id, ad.attribute_definition_id, 'NVMe PCIe 4.0 x4'
FROM products p
JOIN product_types pt ON pt.type_code='STORAGE'
JOIN product_attribute_definitions ad
 ON ad.product_type_id=pt.product_type_id AND ad.attribute_code='interface'
WHERE p.model_code='SKC3000D/2048G'
ON CONFLICT (product_id, attribute_definition_id) DO UPDATE SET
 value_text=EXCLUDED.value_text, value_decimal=NULL, value_integer=NULL, value_boolean=NULL, value_json=NULL;

INSERT INTO product_attribute_values
 (product_id, attribute_definition_id, value_text)
SELECT p.product_id, ad.attribute_definition_id, 'M.2 2280'
FROM products p
JOIN product_types pt ON pt.type_code='STORAGE'
JOIN product_attribute_definitions ad
 ON ad.product_type_id=pt.product_type_id AND ad.attribute_code='form_factor'
WHERE p.model_code='SKC3000D/2048G'
ON CONFLICT (product_id, attribute_definition_id) DO UPDATE SET
 value_text=EXCLUDED.value_text, value_decimal=NULL, value_integer=NULL, value_boolean=NULL, value_json=NULL;

INSERT INTO products
 (product_type_id, category_id, brand_id, model_code, product_name, short_description, description, product_status)
SELECT pt.product_type_id, c.category_id, b.brand_id, 'SNV3S/1000G', 'NV3 1TB',
       'NV3 1TB - catalog tham khảo PC Builder Store.', 'Nguồn tham khảo: https://www.kingston.com/',
       'ACTIVE'
FROM product_types pt
JOIN categories c ON c.category_code='STORAGE'
LEFT JOIN brands b ON b.brand_name='Kingston'
WHERE pt.type_code='STORAGE'
ON CONFLICT (model_code) DO UPDATE SET
 product_type_id=EXCLUDED.product_type_id,
 category_id=EXCLUDED.category_id,
 brand_id=EXCLUDED.brand_id,
 product_name=EXCLUDED.product_name,
 short_description=EXCLUDED.short_description,
 description=EXCLUDED.description,
 product_status='ACTIVE';

INSERT INTO product_offers
 (product_id, offer_code, condition_code, price, currency_code, stock_quantity,
  reserved_quantity, warranty_months, offer_status)
SELECT p.product_id, 'DEMO-SNV3S/1000G', 'NEW',
       2200000, 'VND',
       5, 0, 36, 'ACTIVE'
FROM products p WHERE p.model_code='SNV3S/1000G'
ON CONFLICT (offer_code) DO UPDATE SET
 product_id=EXCLUDED.product_id,
 condition_code=EXCLUDED.condition_code,
 price=EXCLUDED.price,
 currency_code=EXCLUDED.currency_code,
 stock_quantity=EXCLUDED.stock_quantity,
 warranty_months=EXCLUDED.warranty_months,
 offer_status='ACTIVE';

INSERT INTO product_attribute_values
 (product_id, attribute_definition_id, value_integer)
SELECT p.product_id, ad.attribute_definition_id, 1024
FROM products p
JOIN product_types pt ON pt.type_code='STORAGE'
JOIN product_attribute_definitions ad
 ON ad.product_type_id=pt.product_type_id AND ad.attribute_code='capacity_gb'
WHERE p.model_code='SNV3S/1000G'
ON CONFLICT (product_id, attribute_definition_id) DO UPDATE SET
 value_integer=EXCLUDED.value_integer, value_text=NULL, value_decimal=NULL, value_boolean=NULL, value_json=NULL;

INSERT INTO product_attribute_values
 (product_id, attribute_definition_id, value_text)
SELECT p.product_id, ad.attribute_definition_id, 'NVMe PCIe 4.0 x4'
FROM products p
JOIN product_types pt ON pt.type_code='STORAGE'
JOIN product_attribute_definitions ad
 ON ad.product_type_id=pt.product_type_id AND ad.attribute_code='interface'
WHERE p.model_code='SNV3S/1000G'
ON CONFLICT (product_id, attribute_definition_id) DO UPDATE SET
 value_text=EXCLUDED.value_text, value_decimal=NULL, value_integer=NULL, value_boolean=NULL, value_json=NULL;

INSERT INTO product_attribute_values
 (product_id, attribute_definition_id, value_text)
SELECT p.product_id, ad.attribute_definition_id, 'M.2 2280'
FROM products p
JOIN product_types pt ON pt.type_code='STORAGE'
JOIN product_attribute_definitions ad
 ON ad.product_type_id=pt.product_type_id AND ad.attribute_code='form_factor'
WHERE p.model_code='SNV3S/1000G'
ON CONFLICT (product_id, attribute_definition_id) DO UPDATE SET
 value_text=EXCLUDED.value_text, value_decimal=NULL, value_integer=NULL, value_boolean=NULL, value_json=NULL;

INSERT INTO products
 (product_type_id, category_id, brand_id, model_code, product_name, short_description, description, product_status)
SELECT pt.product_type_id, c.category_id, b.brand_id, 'SNV3S/2000G', 'NV3 2TB',
       'NV3 2TB - catalog tham khảo PC Builder Store.', 'Nguồn tham khảo: https://www.kingston.com/',
       'ACTIVE'
FROM product_types pt
JOIN categories c ON c.category_code='STORAGE'
LEFT JOIN brands b ON b.brand_name='Kingston'
WHERE pt.type_code='STORAGE'
ON CONFLICT (model_code) DO UPDATE SET
 product_type_id=EXCLUDED.product_type_id,
 category_id=EXCLUDED.category_id,
 brand_id=EXCLUDED.brand_id,
 product_name=EXCLUDED.product_name,
 short_description=EXCLUDED.short_description,
 description=EXCLUDED.description,
 product_status='ACTIVE';

INSERT INTO product_offers
 (product_id, offer_code, condition_code, price, currency_code, stock_quantity,
  reserved_quantity, warranty_months, offer_status)
SELECT p.product_id, 'DEMO-SNV3S/2000G', 'NEW',
       2200000, 'VND',
       5, 0, 36, 'ACTIVE'
FROM products p WHERE p.model_code='SNV3S/2000G'
ON CONFLICT (offer_code) DO UPDATE SET
 product_id=EXCLUDED.product_id,
 condition_code=EXCLUDED.condition_code,
 price=EXCLUDED.price,
 currency_code=EXCLUDED.currency_code,
 stock_quantity=EXCLUDED.stock_quantity,
 warranty_months=EXCLUDED.warranty_months,
 offer_status='ACTIVE';

INSERT INTO product_attribute_values
 (product_id, attribute_definition_id, value_integer)
SELECT p.product_id, ad.attribute_definition_id, 2048
FROM products p
JOIN product_types pt ON pt.type_code='STORAGE'
JOIN product_attribute_definitions ad
 ON ad.product_type_id=pt.product_type_id AND ad.attribute_code='capacity_gb'
WHERE p.model_code='SNV3S/2000G'
ON CONFLICT (product_id, attribute_definition_id) DO UPDATE SET
 value_integer=EXCLUDED.value_integer, value_text=NULL, value_decimal=NULL, value_boolean=NULL, value_json=NULL;

INSERT INTO product_attribute_values
 (product_id, attribute_definition_id, value_text)
SELECT p.product_id, ad.attribute_definition_id, 'NVMe PCIe 4.0 x4'
FROM products p
JOIN product_types pt ON pt.type_code='STORAGE'
JOIN product_attribute_definitions ad
 ON ad.product_type_id=pt.product_type_id AND ad.attribute_code='interface'
WHERE p.model_code='SNV3S/2000G'
ON CONFLICT (product_id, attribute_definition_id) DO UPDATE SET
 value_text=EXCLUDED.value_text, value_decimal=NULL, value_integer=NULL, value_boolean=NULL, value_json=NULL;

INSERT INTO product_attribute_values
 (product_id, attribute_definition_id, value_text)
SELECT p.product_id, ad.attribute_definition_id, 'M.2 2280'
FROM products p
JOIN product_types pt ON pt.type_code='STORAGE'
JOIN product_attribute_definitions ad
 ON ad.product_type_id=pt.product_type_id AND ad.attribute_code='form_factor'
WHERE p.model_code='SNV3S/2000G'
ON CONFLICT (product_id, attribute_definition_id) DO UPDATE SET
 value_text=EXCLUDED.value_text, value_decimal=NULL, value_integer=NULL, value_boolean=NULL, value_json=NULL;

INSERT INTO products
 (product_type_id, category_id, brand_id, model_code, product_name, short_description, description, product_status)
SELECT pt.product_type_id, c.category_id, b.brand_id, 'CT1000P3PSSD8', 'P3 Plus 1TB',
       'P3 Plus 1TB - catalog tham khảo PC Builder Store.', 'Nguồn tham khảo: https://www.crucial.com/',
       'ACTIVE'
FROM product_types pt
JOIN categories c ON c.category_code='STORAGE'
LEFT JOIN brands b ON b.brand_name='Crucial'
WHERE pt.type_code='STORAGE'
ON CONFLICT (model_code) DO UPDATE SET
 product_type_id=EXCLUDED.product_type_id,
 category_id=EXCLUDED.category_id,
 brand_id=EXCLUDED.brand_id,
 product_name=EXCLUDED.product_name,
 short_description=EXCLUDED.short_description,
 description=EXCLUDED.description,
 product_status='ACTIVE';

INSERT INTO product_offers
 (product_id, offer_code, condition_code, price, currency_code, stock_quantity,
  reserved_quantity, warranty_months, offer_status)
SELECT p.product_id, 'DEMO-CT1000P3PSSD8', 'NEW',
       2200000, 'VND',
       5, 0, 36, 'ACTIVE'
FROM products p WHERE p.model_code='CT1000P3PSSD8'
ON CONFLICT (offer_code) DO UPDATE SET
 product_id=EXCLUDED.product_id,
 condition_code=EXCLUDED.condition_code,
 price=EXCLUDED.price,
 currency_code=EXCLUDED.currency_code,
 stock_quantity=EXCLUDED.stock_quantity,
 warranty_months=EXCLUDED.warranty_months,
 offer_status='ACTIVE';

INSERT INTO product_attribute_values
 (product_id, attribute_definition_id, value_integer)
SELECT p.product_id, ad.attribute_definition_id, 1024
FROM products p
JOIN product_types pt ON pt.type_code='STORAGE'
JOIN product_attribute_definitions ad
 ON ad.product_type_id=pt.product_type_id AND ad.attribute_code='capacity_gb'
WHERE p.model_code='CT1000P3PSSD8'
ON CONFLICT (product_id, attribute_definition_id) DO UPDATE SET
 value_integer=EXCLUDED.value_integer, value_text=NULL, value_decimal=NULL, value_boolean=NULL, value_json=NULL;

INSERT INTO product_attribute_values
 (product_id, attribute_definition_id, value_text)
SELECT p.product_id, ad.attribute_definition_id, 'NVMe PCIe 4.0 x4'
FROM products p
JOIN product_types pt ON pt.type_code='STORAGE'
JOIN product_attribute_definitions ad
 ON ad.product_type_id=pt.product_type_id AND ad.attribute_code='interface'
WHERE p.model_code='CT1000P3PSSD8'
ON CONFLICT (product_id, attribute_definition_id) DO UPDATE SET
 value_text=EXCLUDED.value_text, value_decimal=NULL, value_integer=NULL, value_boolean=NULL, value_json=NULL;

INSERT INTO product_attribute_values
 (product_id, attribute_definition_id, value_text)
SELECT p.product_id, ad.attribute_definition_id, 'M.2 2280'
FROM products p
JOIN product_types pt ON pt.type_code='STORAGE'
JOIN product_attribute_definitions ad
 ON ad.product_type_id=pt.product_type_id AND ad.attribute_code='form_factor'
WHERE p.model_code='CT1000P3PSSD8'
ON CONFLICT (product_id, attribute_definition_id) DO UPDATE SET
 value_text=EXCLUDED.value_text, value_decimal=NULL, value_integer=NULL, value_boolean=NULL, value_json=NULL;

INSERT INTO products
 (product_type_id, category_id, brand_id, model_code, product_name, short_description, description, product_status)
SELECT pt.product_type_id, c.category_id, b.brand_id, 'CT2000P3PSSD8', 'P3 Plus 2TB',
       'P3 Plus 2TB - catalog tham khảo PC Builder Store.', 'Nguồn tham khảo: https://www.crucial.com/',
       'ACTIVE'
FROM product_types pt
JOIN categories c ON c.category_code='STORAGE'
LEFT JOIN brands b ON b.brand_name='Crucial'
WHERE pt.type_code='STORAGE'
ON CONFLICT (model_code) DO UPDATE SET
 product_type_id=EXCLUDED.product_type_id,
 category_id=EXCLUDED.category_id,
 brand_id=EXCLUDED.brand_id,
 product_name=EXCLUDED.product_name,
 short_description=EXCLUDED.short_description,
 description=EXCLUDED.description,
 product_status='ACTIVE';

INSERT INTO product_offers
 (product_id, offer_code, condition_code, price, currency_code, stock_quantity,
  reserved_quantity, warranty_months, offer_status)
SELECT p.product_id, 'DEMO-CT2000P3PSSD8', 'NEW',
       2200000, 'VND',
       5, 0, 36, 'ACTIVE'
FROM products p WHERE p.model_code='CT2000P3PSSD8'
ON CONFLICT (offer_code) DO UPDATE SET
 product_id=EXCLUDED.product_id,
 condition_code=EXCLUDED.condition_code,
 price=EXCLUDED.price,
 currency_code=EXCLUDED.currency_code,
 stock_quantity=EXCLUDED.stock_quantity,
 warranty_months=EXCLUDED.warranty_months,
 offer_status='ACTIVE';

INSERT INTO product_attribute_values
 (product_id, attribute_definition_id, value_integer)
SELECT p.product_id, ad.attribute_definition_id, 2048
FROM products p
JOIN product_types pt ON pt.type_code='STORAGE'
JOIN product_attribute_definitions ad
 ON ad.product_type_id=pt.product_type_id AND ad.attribute_code='capacity_gb'
WHERE p.model_code='CT2000P3PSSD8'
ON CONFLICT (product_id, attribute_definition_id) DO UPDATE SET
 value_integer=EXCLUDED.value_integer, value_text=NULL, value_decimal=NULL, value_boolean=NULL, value_json=NULL;

INSERT INTO product_attribute_values
 (product_id, attribute_definition_id, value_text)
SELECT p.product_id, ad.attribute_definition_id, 'NVMe PCIe 4.0 x4'
FROM products p
JOIN product_types pt ON pt.type_code='STORAGE'
JOIN product_attribute_definitions ad
 ON ad.product_type_id=pt.product_type_id AND ad.attribute_code='interface'
WHERE p.model_code='CT2000P3PSSD8'
ON CONFLICT (product_id, attribute_definition_id) DO UPDATE SET
 value_text=EXCLUDED.value_text, value_decimal=NULL, value_integer=NULL, value_boolean=NULL, value_json=NULL;

INSERT INTO product_attribute_values
 (product_id, attribute_definition_id, value_text)
SELECT p.product_id, ad.attribute_definition_id, 'M.2 2280'
FROM products p
JOIN product_types pt ON pt.type_code='STORAGE'
JOIN product_attribute_definitions ad
 ON ad.product_type_id=pt.product_type_id AND ad.attribute_code='form_factor'
WHERE p.model_code='CT2000P3PSSD8'
ON CONFLICT (product_id, attribute_definition_id) DO UPDATE SET
 value_text=EXCLUDED.value_text, value_decimal=NULL, value_integer=NULL, value_boolean=NULL, value_json=NULL;

INSERT INTO products
 (product_type_id, category_id, brand_id, model_code, product_name, short_description, description, product_status)
SELECT pt.product_type_id, c.category_id, b.brand_id, 'CT1000T500SSD8', 'T500 1TB',
       'T500 1TB - catalog tham khảo PC Builder Store.', 'Nguồn tham khảo: https://www.crucial.com/',
       'ACTIVE'
FROM product_types pt
JOIN categories c ON c.category_code='STORAGE'
LEFT JOIN brands b ON b.brand_name='Crucial'
WHERE pt.type_code='STORAGE'
ON CONFLICT (model_code) DO UPDATE SET
 product_type_id=EXCLUDED.product_type_id,
 category_id=EXCLUDED.category_id,
 brand_id=EXCLUDED.brand_id,
 product_name=EXCLUDED.product_name,
 short_description=EXCLUDED.short_description,
 description=EXCLUDED.description,
 product_status='ACTIVE';

INSERT INTO product_offers
 (product_id, offer_code, condition_code, price, currency_code, stock_quantity,
  reserved_quantity, warranty_months, offer_status)
SELECT p.product_id, 'DEMO-CT1000T500SSD8', 'NEW',
       2200000, 'VND',
       5, 0, 36, 'ACTIVE'
FROM products p WHERE p.model_code='CT1000T500SSD8'
ON CONFLICT (offer_code) DO UPDATE SET
 product_id=EXCLUDED.product_id,
 condition_code=EXCLUDED.condition_code,
 price=EXCLUDED.price,
 currency_code=EXCLUDED.currency_code,
 stock_quantity=EXCLUDED.stock_quantity,
 warranty_months=EXCLUDED.warranty_months,
 offer_status='ACTIVE';

INSERT INTO product_attribute_values
 (product_id, attribute_definition_id, value_integer)
SELECT p.product_id, ad.attribute_definition_id, 1024
FROM products p
JOIN product_types pt ON pt.type_code='STORAGE'
JOIN product_attribute_definitions ad
 ON ad.product_type_id=pt.product_type_id AND ad.attribute_code='capacity_gb'
WHERE p.model_code='CT1000T500SSD8'
ON CONFLICT (product_id, attribute_definition_id) DO UPDATE SET
 value_integer=EXCLUDED.value_integer, value_text=NULL, value_decimal=NULL, value_boolean=NULL, value_json=NULL;

INSERT INTO product_attribute_values
 (product_id, attribute_definition_id, value_text)
SELECT p.product_id, ad.attribute_definition_id, 'NVMe PCIe 4.0 x4'
FROM products p
JOIN product_types pt ON pt.type_code='STORAGE'
JOIN product_attribute_definitions ad
 ON ad.product_type_id=pt.product_type_id AND ad.attribute_code='interface'
WHERE p.model_code='CT1000T500SSD8'
ON CONFLICT (product_id, attribute_definition_id) DO UPDATE SET
 value_text=EXCLUDED.value_text, value_decimal=NULL, value_integer=NULL, value_boolean=NULL, value_json=NULL;

INSERT INTO product_attribute_values
 (product_id, attribute_definition_id, value_text)
SELECT p.product_id, ad.attribute_definition_id, 'M.2 2280'
FROM products p
JOIN product_types pt ON pt.type_code='STORAGE'
JOIN product_attribute_definitions ad
 ON ad.product_type_id=pt.product_type_id AND ad.attribute_code='form_factor'
WHERE p.model_code='CT1000T500SSD8'
ON CONFLICT (product_id, attribute_definition_id) DO UPDATE SET
 value_text=EXCLUDED.value_text, value_decimal=NULL, value_integer=NULL, value_boolean=NULL, value_json=NULL;

INSERT INTO products
 (product_type_id, category_id, brand_id, model_code, product_name, short_description, description, product_status)
SELECT pt.product_type_id, c.category_id, b.brand_id, 'CT2000T500SSD8', 'T500 2TB',
       'T500 2TB - catalog tham khảo PC Builder Store.', 'Nguồn tham khảo: https://www.crucial.com/',
       'ACTIVE'
FROM product_types pt
JOIN categories c ON c.category_code='STORAGE'
LEFT JOIN brands b ON b.brand_name='Crucial'
WHERE pt.type_code='STORAGE'
ON CONFLICT (model_code) DO UPDATE SET
 product_type_id=EXCLUDED.product_type_id,
 category_id=EXCLUDED.category_id,
 brand_id=EXCLUDED.brand_id,
 product_name=EXCLUDED.product_name,
 short_description=EXCLUDED.short_description,
 description=EXCLUDED.description,
 product_status='ACTIVE';

INSERT INTO product_offers
 (product_id, offer_code, condition_code, price, currency_code, stock_quantity,
  reserved_quantity, warranty_months, offer_status)
SELECT p.product_id, 'DEMO-CT2000T500SSD8', 'NEW',
       2200000, 'VND',
       5, 0, 36, 'ACTIVE'
FROM products p WHERE p.model_code='CT2000T500SSD8'
ON CONFLICT (offer_code) DO UPDATE SET
 product_id=EXCLUDED.product_id,
 condition_code=EXCLUDED.condition_code,
 price=EXCLUDED.price,
 currency_code=EXCLUDED.currency_code,
 stock_quantity=EXCLUDED.stock_quantity,
 warranty_months=EXCLUDED.warranty_months,
 offer_status='ACTIVE';

INSERT INTO product_attribute_values
 (product_id, attribute_definition_id, value_integer)
SELECT p.product_id, ad.attribute_definition_id, 2048
FROM products p
JOIN product_types pt ON pt.type_code='STORAGE'
JOIN product_attribute_definitions ad
 ON ad.product_type_id=pt.product_type_id AND ad.attribute_code='capacity_gb'
WHERE p.model_code='CT2000T500SSD8'
ON CONFLICT (product_id, attribute_definition_id) DO UPDATE SET
 value_integer=EXCLUDED.value_integer, value_text=NULL, value_decimal=NULL, value_boolean=NULL, value_json=NULL;

INSERT INTO product_attribute_values
 (product_id, attribute_definition_id, value_text)
SELECT p.product_id, ad.attribute_definition_id, 'NVMe PCIe 4.0 x4'
FROM products p
JOIN product_types pt ON pt.type_code='STORAGE'
JOIN product_attribute_definitions ad
 ON ad.product_type_id=pt.product_type_id AND ad.attribute_code='interface'
WHERE p.model_code='CT2000T500SSD8'
ON CONFLICT (product_id, attribute_definition_id) DO UPDATE SET
 value_text=EXCLUDED.value_text, value_decimal=NULL, value_integer=NULL, value_boolean=NULL, value_json=NULL;

INSERT INTO product_attribute_values
 (product_id, attribute_definition_id, value_text)
SELECT p.product_id, ad.attribute_definition_id, 'M.2 2280'
FROM products p
JOIN product_types pt ON pt.type_code='STORAGE'
JOIN product_attribute_definitions ad
 ON ad.product_type_id=pt.product_type_id AND ad.attribute_code='form_factor'
WHERE p.model_code='CT2000T500SSD8'
ON CONFLICT (product_id, attribute_definition_id) DO UPDATE SET
 value_text=EXCLUDED.value_text, value_decimal=NULL, value_integer=NULL, value_boolean=NULL, value_json=NULL;

INSERT INTO products
 (product_type_id, category_id, brand_id, model_code, product_name, short_description, description, product_status)
SELECT pt.product_type_id, c.category_id, b.brand_id, 'ALEG-960M-1TCS', 'LEGEND 960 MAX 1TB',
       'LEGEND 960 MAX 1TB - catalog tham khảo PC Builder Store.', 'Nguồn tham khảo: https://phongvu.vn/c/linh-kien-may-tinh',
       'ACTIVE'
FROM product_types pt
JOIN categories c ON c.category_code='STORAGE'
LEFT JOIN brands b ON b.brand_name='ADATA'
WHERE pt.type_code='STORAGE'
ON CONFLICT (model_code) DO UPDATE SET
 product_type_id=EXCLUDED.product_type_id,
 category_id=EXCLUDED.category_id,
 brand_id=EXCLUDED.brand_id,
 product_name=EXCLUDED.product_name,
 short_description=EXCLUDED.short_description,
 description=EXCLUDED.description,
 product_status='ACTIVE';

INSERT INTO product_offers
 (product_id, offer_code, condition_code, price, currency_code, stock_quantity,
  reserved_quantity, warranty_months, offer_status)
SELECT p.product_id, 'DEMO-ALEG-960M-1TCS', 'NEW',
       2200000, 'VND',
       5, 0, 36, 'ACTIVE'
FROM products p WHERE p.model_code='ALEG-960M-1TCS'
ON CONFLICT (offer_code) DO UPDATE SET
 product_id=EXCLUDED.product_id,
 condition_code=EXCLUDED.condition_code,
 price=EXCLUDED.price,
 currency_code=EXCLUDED.currency_code,
 stock_quantity=EXCLUDED.stock_quantity,
 warranty_months=EXCLUDED.warranty_months,
 offer_status='ACTIVE';

INSERT INTO product_attribute_values
 (product_id, attribute_definition_id, value_integer)
SELECT p.product_id, ad.attribute_definition_id, 1024
FROM products p
JOIN product_types pt ON pt.type_code='STORAGE'
JOIN product_attribute_definitions ad
 ON ad.product_type_id=pt.product_type_id AND ad.attribute_code='capacity_gb'
WHERE p.model_code='ALEG-960M-1TCS'
ON CONFLICT (product_id, attribute_definition_id) DO UPDATE SET
 value_integer=EXCLUDED.value_integer, value_text=NULL, value_decimal=NULL, value_boolean=NULL, value_json=NULL;

INSERT INTO product_attribute_values
 (product_id, attribute_definition_id, value_text)
SELECT p.product_id, ad.attribute_definition_id, 'NVMe PCIe 4.0 x4'
FROM products p
JOIN product_types pt ON pt.type_code='STORAGE'
JOIN product_attribute_definitions ad
 ON ad.product_type_id=pt.product_type_id AND ad.attribute_code='interface'
WHERE p.model_code='ALEG-960M-1TCS'
ON CONFLICT (product_id, attribute_definition_id) DO UPDATE SET
 value_text=EXCLUDED.value_text, value_decimal=NULL, value_integer=NULL, value_boolean=NULL, value_json=NULL;

INSERT INTO product_attribute_values
 (product_id, attribute_definition_id, value_text)
SELECT p.product_id, ad.attribute_definition_id, 'M.2 2280'
FROM products p
JOIN product_types pt ON pt.type_code='STORAGE'
JOIN product_attribute_definitions ad
 ON ad.product_type_id=pt.product_type_id AND ad.attribute_code='form_factor'
WHERE p.model_code='ALEG-960M-1TCS'
ON CONFLICT (product_id, attribute_definition_id) DO UPDATE SET
 value_text=EXCLUDED.value_text, value_decimal=NULL, value_integer=NULL, value_boolean=NULL, value_json=NULL;

INSERT INTO products
 (product_type_id, category_id, brand_id, model_code, product_name, short_description, description, product_status)
SELECT pt.product_type_id, c.category_id, b.brand_id, 'ALEG-960M-2TCS', 'LEGEND 960 MAX 2TB',
       'LEGEND 960 MAX 2TB - catalog tham khảo PC Builder Store.', 'Nguồn tham khảo: https://phongvu.vn/c/linh-kien-may-tinh',
       'ACTIVE'
FROM product_types pt
JOIN categories c ON c.category_code='STORAGE'
LEFT JOIN brands b ON b.brand_name='ADATA'
WHERE pt.type_code='STORAGE'
ON CONFLICT (model_code) DO UPDATE SET
 product_type_id=EXCLUDED.product_type_id,
 category_id=EXCLUDED.category_id,
 brand_id=EXCLUDED.brand_id,
 product_name=EXCLUDED.product_name,
 short_description=EXCLUDED.short_description,
 description=EXCLUDED.description,
 product_status='ACTIVE';

INSERT INTO product_offers
 (product_id, offer_code, condition_code, price, currency_code, stock_quantity,
  reserved_quantity, warranty_months, offer_status)
SELECT p.product_id, 'DEMO-ALEG-960M-2TCS', 'NEW',
       2200000, 'VND',
       5, 0, 36, 'ACTIVE'
FROM products p WHERE p.model_code='ALEG-960M-2TCS'
ON CONFLICT (offer_code) DO UPDATE SET
 product_id=EXCLUDED.product_id,
 condition_code=EXCLUDED.condition_code,
 price=EXCLUDED.price,
 currency_code=EXCLUDED.currency_code,
 stock_quantity=EXCLUDED.stock_quantity,
 warranty_months=EXCLUDED.warranty_months,
 offer_status='ACTIVE';

INSERT INTO product_attribute_values
 (product_id, attribute_definition_id, value_integer)
SELECT p.product_id, ad.attribute_definition_id, 2048
FROM products p
JOIN product_types pt ON pt.type_code='STORAGE'
JOIN product_attribute_definitions ad
 ON ad.product_type_id=pt.product_type_id AND ad.attribute_code='capacity_gb'
WHERE p.model_code='ALEG-960M-2TCS'
ON CONFLICT (product_id, attribute_definition_id) DO UPDATE SET
 value_integer=EXCLUDED.value_integer, value_text=NULL, value_decimal=NULL, value_boolean=NULL, value_json=NULL;

INSERT INTO product_attribute_values
 (product_id, attribute_definition_id, value_text)
SELECT p.product_id, ad.attribute_definition_id, 'NVMe PCIe 4.0 x4'
FROM products p
JOIN product_types pt ON pt.type_code='STORAGE'
JOIN product_attribute_definitions ad
 ON ad.product_type_id=pt.product_type_id AND ad.attribute_code='interface'
WHERE p.model_code='ALEG-960M-2TCS'
ON CONFLICT (product_id, attribute_definition_id) DO UPDATE SET
 value_text=EXCLUDED.value_text, value_decimal=NULL, value_integer=NULL, value_boolean=NULL, value_json=NULL;

INSERT INTO product_attribute_values
 (product_id, attribute_definition_id, value_text)
SELECT p.product_id, ad.attribute_definition_id, 'M.2 2280'
FROM products p
JOIN product_types pt ON pt.type_code='STORAGE'
JOIN product_attribute_definitions ad
 ON ad.product_type_id=pt.product_type_id AND ad.attribute_code='form_factor'
WHERE p.model_code='ALEG-960M-2TCS'
ON CONFLICT (product_id, attribute_definition_id) DO UPDATE SET
 value_text=EXCLUDED.value_text, value_decimal=NULL, value_integer=NULL, value_boolean=NULL, value_json=NULL;

INSERT INTO products
 (product_type_id, category_id, brand_id, model_code, product_name, short_description, description, product_status)
SELECT pt.product_type_id, c.category_id, b.brand_id, 'LNM790X001T-RNNNG', 'NM790 1TB',
       'NM790 1TB - catalog tham khảo PC Builder Store.', 'Nguồn tham khảo: https://phongvu.vn/c/linh-kien-may-tinh',
       'ACTIVE'
FROM product_types pt
JOIN categories c ON c.category_code='STORAGE'
LEFT JOIN brands b ON b.brand_name='Lexar'
WHERE pt.type_code='STORAGE'
ON CONFLICT (model_code) DO UPDATE SET
 product_type_id=EXCLUDED.product_type_id,
 category_id=EXCLUDED.category_id,
 brand_id=EXCLUDED.brand_id,
 product_name=EXCLUDED.product_name,
 short_description=EXCLUDED.short_description,
 description=EXCLUDED.description,
 product_status='ACTIVE';

INSERT INTO product_offers
 (product_id, offer_code, condition_code, price, currency_code, stock_quantity,
  reserved_quantity, warranty_months, offer_status)
SELECT p.product_id, 'DEMO-LNM790X001T-RNNNG', 'NEW',
       2200000, 'VND',
       5, 0, 36, 'ACTIVE'
FROM products p WHERE p.model_code='LNM790X001T-RNNNG'
ON CONFLICT (offer_code) DO UPDATE SET
 product_id=EXCLUDED.product_id,
 condition_code=EXCLUDED.condition_code,
 price=EXCLUDED.price,
 currency_code=EXCLUDED.currency_code,
 stock_quantity=EXCLUDED.stock_quantity,
 warranty_months=EXCLUDED.warranty_months,
 offer_status='ACTIVE';

INSERT INTO product_attribute_values
 (product_id, attribute_definition_id, value_integer)
SELECT p.product_id, ad.attribute_definition_id, 1024
FROM products p
JOIN product_types pt ON pt.type_code='STORAGE'
JOIN product_attribute_definitions ad
 ON ad.product_type_id=pt.product_type_id AND ad.attribute_code='capacity_gb'
WHERE p.model_code='LNM790X001T-RNNNG'
ON CONFLICT (product_id, attribute_definition_id) DO UPDATE SET
 value_integer=EXCLUDED.value_integer, value_text=NULL, value_decimal=NULL, value_boolean=NULL, value_json=NULL;

INSERT INTO product_attribute_values
 (product_id, attribute_definition_id, value_text)
SELECT p.product_id, ad.attribute_definition_id, 'NVMe PCIe 4.0 x4'
FROM products p
JOIN product_types pt ON pt.type_code='STORAGE'
JOIN product_attribute_definitions ad
 ON ad.product_type_id=pt.product_type_id AND ad.attribute_code='interface'
WHERE p.model_code='LNM790X001T-RNNNG'
ON CONFLICT (product_id, attribute_definition_id) DO UPDATE SET
 value_text=EXCLUDED.value_text, value_decimal=NULL, value_integer=NULL, value_boolean=NULL, value_json=NULL;

INSERT INTO product_attribute_values
 (product_id, attribute_definition_id, value_text)
SELECT p.product_id, ad.attribute_definition_id, 'M.2 2280'
FROM products p
JOIN product_types pt ON pt.type_code='STORAGE'
JOIN product_attribute_definitions ad
 ON ad.product_type_id=pt.product_type_id AND ad.attribute_code='form_factor'
WHERE p.model_code='LNM790X001T-RNNNG'
ON CONFLICT (product_id, attribute_definition_id) DO UPDATE SET
 value_text=EXCLUDED.value_text, value_decimal=NULL, value_integer=NULL, value_boolean=NULL, value_json=NULL;

INSERT INTO products
 (product_type_id, category_id, brand_id, model_code, product_name, short_description, description, product_status)
SELECT pt.product_type_id, c.category_id, b.brand_id, 'LNM790X002T-RNNNG', 'NM790 2TB',
       'NM790 2TB - catalog tham khảo PC Builder Store.', 'Nguồn tham khảo: https://phongvu.vn/c/linh-kien-may-tinh',
       'ACTIVE'
FROM product_types pt
JOIN categories c ON c.category_code='STORAGE'
LEFT JOIN brands b ON b.brand_name='Lexar'
WHERE pt.type_code='STORAGE'
ON CONFLICT (model_code) DO UPDATE SET
 product_type_id=EXCLUDED.product_type_id,
 category_id=EXCLUDED.category_id,
 brand_id=EXCLUDED.brand_id,
 product_name=EXCLUDED.product_name,
 short_description=EXCLUDED.short_description,
 description=EXCLUDED.description,
 product_status='ACTIVE';

INSERT INTO product_offers
 (product_id, offer_code, condition_code, price, currency_code, stock_quantity,
  reserved_quantity, warranty_months, offer_status)
SELECT p.product_id, 'DEMO-LNM790X002T-RNNNG', 'NEW',
       2200000, 'VND',
       5, 0, 36, 'ACTIVE'
FROM products p WHERE p.model_code='LNM790X002T-RNNNG'
ON CONFLICT (offer_code) DO UPDATE SET
 product_id=EXCLUDED.product_id,
 condition_code=EXCLUDED.condition_code,
 price=EXCLUDED.price,
 currency_code=EXCLUDED.currency_code,
 stock_quantity=EXCLUDED.stock_quantity,
 warranty_months=EXCLUDED.warranty_months,
 offer_status='ACTIVE';

INSERT INTO product_attribute_values
 (product_id, attribute_definition_id, value_integer)
SELECT p.product_id, ad.attribute_definition_id, 2048
FROM products p
JOIN product_types pt ON pt.type_code='STORAGE'
JOIN product_attribute_definitions ad
 ON ad.product_type_id=pt.product_type_id AND ad.attribute_code='capacity_gb'
WHERE p.model_code='LNM790X002T-RNNNG'
ON CONFLICT (product_id, attribute_definition_id) DO UPDATE SET
 value_integer=EXCLUDED.value_integer, value_text=NULL, value_decimal=NULL, value_boolean=NULL, value_json=NULL;

INSERT INTO product_attribute_values
 (product_id, attribute_definition_id, value_text)
SELECT p.product_id, ad.attribute_definition_id, 'NVMe PCIe 4.0 x4'
FROM products p
JOIN product_types pt ON pt.type_code='STORAGE'
JOIN product_attribute_definitions ad
 ON ad.product_type_id=pt.product_type_id AND ad.attribute_code='interface'
WHERE p.model_code='LNM790X002T-RNNNG'
ON CONFLICT (product_id, attribute_definition_id) DO UPDATE SET
 value_text=EXCLUDED.value_text, value_decimal=NULL, value_integer=NULL, value_boolean=NULL, value_json=NULL;

INSERT INTO product_attribute_values
 (product_id, attribute_definition_id, value_text)
SELECT p.product_id, ad.attribute_definition_id, 'M.2 2280'
FROM products p
JOIN product_types pt ON pt.type_code='STORAGE'
JOIN product_attribute_definitions ad
 ON ad.product_type_id=pt.product_type_id AND ad.attribute_code='form_factor'
WHERE p.model_code='LNM790X002T-RNNNG'
ON CONFLICT (product_id, attribute_definition_id) DO UPDATE SET
 value_text=EXCLUDED.value_text, value_decimal=NULL, value_integer=NULL, value_boolean=NULL, value_json=NULL;

INSERT INTO products
 (product_type_id, category_id, brand_id, model_code, product_name, short_description, description, product_status)
SELECT pt.product_type_id, c.category_id, b.brand_id, 'ZP1000GM3A013', 'FireCuda 530 1TB',
       'FireCuda 530 1TB - catalog tham khảo PC Builder Store.', 'Nguồn tham khảo: https://www.seagate.com/',
       'ACTIVE'
FROM product_types pt
JOIN categories c ON c.category_code='STORAGE'
LEFT JOIN brands b ON b.brand_name='Seagate'
WHERE pt.type_code='STORAGE'
ON CONFLICT (model_code) DO UPDATE SET
 product_type_id=EXCLUDED.product_type_id,
 category_id=EXCLUDED.category_id,
 brand_id=EXCLUDED.brand_id,
 product_name=EXCLUDED.product_name,
 short_description=EXCLUDED.short_description,
 description=EXCLUDED.description,
 product_status='ACTIVE';

INSERT INTO product_offers
 (product_id, offer_code, condition_code, price, currency_code, stock_quantity,
  reserved_quantity, warranty_months, offer_status)
SELECT p.product_id, 'DEMO-ZP1000GM3A013', 'NEW',
       2200000, 'VND',
       5, 0, 36, 'ACTIVE'
FROM products p WHERE p.model_code='ZP1000GM3A013'
ON CONFLICT (offer_code) DO UPDATE SET
 product_id=EXCLUDED.product_id,
 condition_code=EXCLUDED.condition_code,
 price=EXCLUDED.price,
 currency_code=EXCLUDED.currency_code,
 stock_quantity=EXCLUDED.stock_quantity,
 warranty_months=EXCLUDED.warranty_months,
 offer_status='ACTIVE';

INSERT INTO product_attribute_values
 (product_id, attribute_definition_id, value_integer)
SELECT p.product_id, ad.attribute_definition_id, 1024
FROM products p
JOIN product_types pt ON pt.type_code='STORAGE'
JOIN product_attribute_definitions ad
 ON ad.product_type_id=pt.product_type_id AND ad.attribute_code='capacity_gb'
WHERE p.model_code='ZP1000GM3A013'
ON CONFLICT (product_id, attribute_definition_id) DO UPDATE SET
 value_integer=EXCLUDED.value_integer, value_text=NULL, value_decimal=NULL, value_boolean=NULL, value_json=NULL;

INSERT INTO product_attribute_values
 (product_id, attribute_definition_id, value_text)
SELECT p.product_id, ad.attribute_definition_id, 'NVMe PCIe 4.0 x4'
FROM products p
JOIN product_types pt ON pt.type_code='STORAGE'
JOIN product_attribute_definitions ad
 ON ad.product_type_id=pt.product_type_id AND ad.attribute_code='interface'
WHERE p.model_code='ZP1000GM3A013'
ON CONFLICT (product_id, attribute_definition_id) DO UPDATE SET
 value_text=EXCLUDED.value_text, value_decimal=NULL, value_integer=NULL, value_boolean=NULL, value_json=NULL;

INSERT INTO product_attribute_values
 (product_id, attribute_definition_id, value_text)
SELECT p.product_id, ad.attribute_definition_id, 'M.2 2280'
FROM products p
JOIN product_types pt ON pt.type_code='STORAGE'
JOIN product_attribute_definitions ad
 ON ad.product_type_id=pt.product_type_id AND ad.attribute_code='form_factor'
WHERE p.model_code='ZP1000GM3A013'
ON CONFLICT (product_id, attribute_definition_id) DO UPDATE SET
 value_text=EXCLUDED.value_text, value_decimal=NULL, value_integer=NULL, value_boolean=NULL, value_json=NULL;

INSERT INTO products
 (product_type_id, category_id, brand_id, model_code, product_name, short_description, description, product_status)
SELECT pt.product_type_id, c.category_id, b.brand_id, 'ZP2000GM3A013', 'FireCuda 530 2TB',
       'FireCuda 530 2TB - catalog tham khảo PC Builder Store.', 'Nguồn tham khảo: https://www.seagate.com/',
       'ACTIVE'
FROM product_types pt
JOIN categories c ON c.category_code='STORAGE'
LEFT JOIN brands b ON b.brand_name='Seagate'
WHERE pt.type_code='STORAGE'
ON CONFLICT (model_code) DO UPDATE SET
 product_type_id=EXCLUDED.product_type_id,
 category_id=EXCLUDED.category_id,
 brand_id=EXCLUDED.brand_id,
 product_name=EXCLUDED.product_name,
 short_description=EXCLUDED.short_description,
 description=EXCLUDED.description,
 product_status='ACTIVE';

INSERT INTO product_offers
 (product_id, offer_code, condition_code, price, currency_code, stock_quantity,
  reserved_quantity, warranty_months, offer_status)
SELECT p.product_id, 'DEMO-ZP2000GM3A013', 'NEW',
       2200000, 'VND',
       5, 0, 36, 'ACTIVE'
FROM products p WHERE p.model_code='ZP2000GM3A013'
ON CONFLICT (offer_code) DO UPDATE SET
 product_id=EXCLUDED.product_id,
 condition_code=EXCLUDED.condition_code,
 price=EXCLUDED.price,
 currency_code=EXCLUDED.currency_code,
 stock_quantity=EXCLUDED.stock_quantity,
 warranty_months=EXCLUDED.warranty_months,
 offer_status='ACTIVE';

INSERT INTO product_attribute_values
 (product_id, attribute_definition_id, value_integer)
SELECT p.product_id, ad.attribute_definition_id, 2048
FROM products p
JOIN product_types pt ON pt.type_code='STORAGE'
JOIN product_attribute_definitions ad
 ON ad.product_type_id=pt.product_type_id AND ad.attribute_code='capacity_gb'
WHERE p.model_code='ZP2000GM3A013'
ON CONFLICT (product_id, attribute_definition_id) DO UPDATE SET
 value_integer=EXCLUDED.value_integer, value_text=NULL, value_decimal=NULL, value_boolean=NULL, value_json=NULL;

INSERT INTO product_attribute_values
 (product_id, attribute_definition_id, value_text)
SELECT p.product_id, ad.attribute_definition_id, 'NVMe PCIe 4.0 x4'
FROM products p
JOIN product_types pt ON pt.type_code='STORAGE'
JOIN product_attribute_definitions ad
 ON ad.product_type_id=pt.product_type_id AND ad.attribute_code='interface'
WHERE p.model_code='ZP2000GM3A013'
ON CONFLICT (product_id, attribute_definition_id) DO UPDATE SET
 value_text=EXCLUDED.value_text, value_decimal=NULL, value_integer=NULL, value_boolean=NULL, value_json=NULL;

INSERT INTO product_attribute_values
 (product_id, attribute_definition_id, value_text)
SELECT p.product_id, ad.attribute_definition_id, 'M.2 2280'
FROM products p
JOIN product_types pt ON pt.type_code='STORAGE'
JOIN product_attribute_definitions ad
 ON ad.product_type_id=pt.product_type_id AND ad.attribute_code='form_factor'
WHERE p.model_code='ZP2000GM3A013'
ON CONFLICT (product_id, attribute_definition_id) DO UPDATE SET
 value_text=EXCLUDED.value_text, value_decimal=NULL, value_integer=NULL, value_boolean=NULL, value_json=NULL;

INSERT INTO products
 (product_type_id, category_id, brand_id, model_code, product_name, short_description, description, product_status)
SELECT pt.product_type_id, c.category_id, b.brand_id, 'CP-9020248', 'RM750e 750W Gold',
       'RM750e 750W Gold - catalog tham khảo PC Builder Store.', 'Nguồn tham khảo: https://www.corsair.com/',
       'ACTIVE'
FROM product_types pt
JOIN categories c ON c.category_code='PSU'
LEFT JOIN brands b ON b.brand_name='Corsair'
WHERE pt.type_code='PSU'
ON CONFLICT (model_code) DO UPDATE SET
 product_type_id=EXCLUDED.product_type_id,
 category_id=EXCLUDED.category_id,
 brand_id=EXCLUDED.brand_id,
 product_name=EXCLUDED.product_name,
 short_description=EXCLUDED.short_description,
 description=EXCLUDED.description,
 product_status='ACTIVE';

INSERT INTO product_offers
 (product_id, offer_code, condition_code, price, currency_code, stock_quantity,
  reserved_quantity, warranty_months, offer_status)
SELECT p.product_id, 'DEMO-CP-9020248', 'NEW',
       2000000, 'VND',
       5, 0, 36, 'ACTIVE'
FROM products p WHERE p.model_code='CP-9020248'
ON CONFLICT (offer_code) DO UPDATE SET
 product_id=EXCLUDED.product_id,
 condition_code=EXCLUDED.condition_code,
 price=EXCLUDED.price,
 currency_code=EXCLUDED.currency_code,
 stock_quantity=EXCLUDED.stock_quantity,
 warranty_months=EXCLUDED.warranty_months,
 offer_status='ACTIVE';

INSERT INTO product_attribute_values
 (product_id, attribute_definition_id, value_integer)
SELECT p.product_id, ad.attribute_definition_id, 750
FROM products p
JOIN product_types pt ON pt.type_code='PSU'
JOIN product_attribute_definitions ad
 ON ad.product_type_id=pt.product_type_id AND ad.attribute_code='wattage'
WHERE p.model_code='CP-9020248'
ON CONFLICT (product_id, attribute_definition_id) DO UPDATE SET
 value_integer=EXCLUDED.value_integer, value_text=NULL, value_decimal=NULL, value_boolean=NULL, value_json=NULL;

INSERT INTO product_attribute_values
 (product_id, attribute_definition_id, value_text)
SELECT p.product_id, ad.attribute_definition_id, '80 PLUS Gold'
FROM products p
JOIN product_types pt ON pt.type_code='PSU'
JOIN product_attribute_definitions ad
 ON ad.product_type_id=pt.product_type_id AND ad.attribute_code='efficiency_rating'
WHERE p.model_code='CP-9020248'
ON CONFLICT (product_id, attribute_definition_id) DO UPDATE SET
 value_text=EXCLUDED.value_text, value_decimal=NULL, value_integer=NULL, value_boolean=NULL, value_json=NULL;

INSERT INTO product_attribute_values
 (product_id, attribute_definition_id, value_text)
SELECT p.product_id, ad.attribute_definition_id, 'Fully Modular'
FROM products p
JOIN product_types pt ON pt.type_code='PSU'
JOIN product_attribute_definitions ad
 ON ad.product_type_id=pt.product_type_id AND ad.attribute_code='modularity'
WHERE p.model_code='CP-9020248'
ON CONFLICT (product_id, attribute_definition_id) DO UPDATE SET
 value_text=EXCLUDED.value_text, value_decimal=NULL, value_integer=NULL, value_boolean=NULL, value_json=NULL;

INSERT INTO products
 (product_type_id, category_id, brand_id, model_code, product_name, short_description, description, product_status)
SELECT pt.product_type_id, c.category_id, b.brand_id, 'CP-9020263', 'RM850e 850W Gold',
       'RM850e 850W Gold - catalog tham khảo PC Builder Store.', 'Nguồn tham khảo: https://www.corsair.com/',
       'ACTIVE'
FROM product_types pt
JOIN categories c ON c.category_code='PSU'
LEFT JOIN brands b ON b.brand_name='Corsair'
WHERE pt.type_code='PSU'
ON CONFLICT (model_code) DO UPDATE SET
 product_type_id=EXCLUDED.product_type_id,
 category_id=EXCLUDED.category_id,
 brand_id=EXCLUDED.brand_id,
 product_name=EXCLUDED.product_name,
 short_description=EXCLUDED.short_description,
 description=EXCLUDED.description,
 product_status='ACTIVE';

INSERT INTO product_offers
 (product_id, offer_code, condition_code, price, currency_code, stock_quantity,
  reserved_quantity, warranty_months, offer_status)
SELECT p.product_id, 'DEMO-CP-9020263', 'NEW',
       2000000, 'VND',
       5, 0, 36, 'ACTIVE'
FROM products p WHERE p.model_code='CP-9020263'
ON CONFLICT (offer_code) DO UPDATE SET
 product_id=EXCLUDED.product_id,
 condition_code=EXCLUDED.condition_code,
 price=EXCLUDED.price,
 currency_code=EXCLUDED.currency_code,
 stock_quantity=EXCLUDED.stock_quantity,
 warranty_months=EXCLUDED.warranty_months,
 offer_status='ACTIVE';

INSERT INTO product_attribute_values
 (product_id, attribute_definition_id, value_integer)
SELECT p.product_id, ad.attribute_definition_id, 850
FROM products p
JOIN product_types pt ON pt.type_code='PSU'
JOIN product_attribute_definitions ad
 ON ad.product_type_id=pt.product_type_id AND ad.attribute_code='wattage'
WHERE p.model_code='CP-9020263'
ON CONFLICT (product_id, attribute_definition_id) DO UPDATE SET
 value_integer=EXCLUDED.value_integer, value_text=NULL, value_decimal=NULL, value_boolean=NULL, value_json=NULL;

INSERT INTO product_attribute_values
 (product_id, attribute_definition_id, value_text)
SELECT p.product_id, ad.attribute_definition_id, '80 PLUS Gold'
FROM products p
JOIN product_types pt ON pt.type_code='PSU'
JOIN product_attribute_definitions ad
 ON ad.product_type_id=pt.product_type_id AND ad.attribute_code='efficiency_rating'
WHERE p.model_code='CP-9020263'
ON CONFLICT (product_id, attribute_definition_id) DO UPDATE SET
 value_text=EXCLUDED.value_text, value_decimal=NULL, value_integer=NULL, value_boolean=NULL, value_json=NULL;

INSERT INTO product_attribute_values
 (product_id, attribute_definition_id, value_text)
SELECT p.product_id, ad.attribute_definition_id, 'Fully Modular'
FROM products p
JOIN product_types pt ON pt.type_code='PSU'
JOIN product_attribute_definitions ad
 ON ad.product_type_id=pt.product_type_id AND ad.attribute_code='modularity'
WHERE p.model_code='CP-9020263'
ON CONFLICT (product_id, attribute_definition_id) DO UPDATE SET
 value_text=EXCLUDED.value_text, value_decimal=NULL, value_integer=NULL, value_boolean=NULL, value_json=NULL;

INSERT INTO products
 (product_type_id, category_id, brand_id, model_code, product_name, short_description, description, product_status)
SELECT pt.product_type_id, c.category_id, b.brand_id, 'MAG-A650BN', 'MAG A650BN 650W Bronze',
       'MAG A650BN 650W Bronze - catalog tham khảo PC Builder Store.', 'Nguồn tham khảo: https://www.msi.com/',
       'ACTIVE'
FROM product_types pt
JOIN categories c ON c.category_code='PSU'
LEFT JOIN brands b ON b.brand_name='MSI'
WHERE pt.type_code='PSU'
ON CONFLICT (model_code) DO UPDATE SET
 product_type_id=EXCLUDED.product_type_id,
 category_id=EXCLUDED.category_id,
 brand_id=EXCLUDED.brand_id,
 product_name=EXCLUDED.product_name,
 short_description=EXCLUDED.short_description,
 description=EXCLUDED.description,
 product_status='ACTIVE';

INSERT INTO product_offers
 (product_id, offer_code, condition_code, price, currency_code, stock_quantity,
  reserved_quantity, warranty_months, offer_status)
SELECT p.product_id, 'DEMO-MAG-A650BN', 'NEW',
       2000000, 'VND',
       5, 0, 36, 'ACTIVE'
FROM products p WHERE p.model_code='MAG-A650BN'
ON CONFLICT (offer_code) DO UPDATE SET
 product_id=EXCLUDED.product_id,
 condition_code=EXCLUDED.condition_code,
 price=EXCLUDED.price,
 currency_code=EXCLUDED.currency_code,
 stock_quantity=EXCLUDED.stock_quantity,
 warranty_months=EXCLUDED.warranty_months,
 offer_status='ACTIVE';

INSERT INTO product_attribute_values
 (product_id, attribute_definition_id, value_integer)
SELECT p.product_id, ad.attribute_definition_id, 650
FROM products p
JOIN product_types pt ON pt.type_code='PSU'
JOIN product_attribute_definitions ad
 ON ad.product_type_id=pt.product_type_id AND ad.attribute_code='wattage'
WHERE p.model_code='MAG-A650BN'
ON CONFLICT (product_id, attribute_definition_id) DO UPDATE SET
 value_integer=EXCLUDED.value_integer, value_text=NULL, value_decimal=NULL, value_boolean=NULL, value_json=NULL;

INSERT INTO product_attribute_values
 (product_id, attribute_definition_id, value_text)
SELECT p.product_id, ad.attribute_definition_id, '80 PLUS Bronze'
FROM products p
JOIN product_types pt ON pt.type_code='PSU'
JOIN product_attribute_definitions ad
 ON ad.product_type_id=pt.product_type_id AND ad.attribute_code='efficiency_rating'
WHERE p.model_code='MAG-A650BN'
ON CONFLICT (product_id, attribute_definition_id) DO UPDATE SET
 value_text=EXCLUDED.value_text, value_decimal=NULL, value_integer=NULL, value_boolean=NULL, value_json=NULL;

INSERT INTO product_attribute_values
 (product_id, attribute_definition_id, value_text)
SELECT p.product_id, ad.attribute_definition_id, 'Non-Modular'
FROM products p
JOIN product_types pt ON pt.type_code='PSU'
JOIN product_attribute_definitions ad
 ON ad.product_type_id=pt.product_type_id AND ad.attribute_code='modularity'
WHERE p.model_code='MAG-A650BN'
ON CONFLICT (product_id, attribute_definition_id) DO UPDATE SET
 value_text=EXCLUDED.value_text, value_decimal=NULL, value_integer=NULL, value_boolean=NULL, value_json=NULL;

INSERT INTO products
 (product_type_id, category_id, brand_id, model_code, product_name, short_description, description, product_status)
SELECT pt.product_type_id, c.category_id, b.brand_id, 'MAG-A750GL-PCIE5', 'MAG A750GL PCIE5 750W Gold',
       'MAG A750GL PCIE5 750W Gold - catalog tham khảo PC Builder Store.', 'Nguồn tham khảo: https://www.msi.com/',
       'ACTIVE'
FROM product_types pt
JOIN categories c ON c.category_code='PSU'
LEFT JOIN brands b ON b.brand_name='MSI'
WHERE pt.type_code='PSU'
ON CONFLICT (model_code) DO UPDATE SET
 product_type_id=EXCLUDED.product_type_id,
 category_id=EXCLUDED.category_id,
 brand_id=EXCLUDED.brand_id,
 product_name=EXCLUDED.product_name,
 short_description=EXCLUDED.short_description,
 description=EXCLUDED.description,
 product_status='ACTIVE';

INSERT INTO product_offers
 (product_id, offer_code, condition_code, price, currency_code, stock_quantity,
  reserved_quantity, warranty_months, offer_status)
SELECT p.product_id, 'DEMO-MAG-A750GL-PCIE5', 'NEW',
       2000000, 'VND',
       5, 0, 36, 'ACTIVE'
FROM products p WHERE p.model_code='MAG-A750GL-PCIE5'
ON CONFLICT (offer_code) DO UPDATE SET
 product_id=EXCLUDED.product_id,
 condition_code=EXCLUDED.condition_code,
 price=EXCLUDED.price,
 currency_code=EXCLUDED.currency_code,
 stock_quantity=EXCLUDED.stock_quantity,
 warranty_months=EXCLUDED.warranty_months,
 offer_status='ACTIVE';

INSERT INTO product_attribute_values
 (product_id, attribute_definition_id, value_integer)
SELECT p.product_id, ad.attribute_definition_id, 750
FROM products p
JOIN product_types pt ON pt.type_code='PSU'
JOIN product_attribute_definitions ad
 ON ad.product_type_id=pt.product_type_id AND ad.attribute_code='wattage'
WHERE p.model_code='MAG-A750GL-PCIE5'
ON CONFLICT (product_id, attribute_definition_id) DO UPDATE SET
 value_integer=EXCLUDED.value_integer, value_text=NULL, value_decimal=NULL, value_boolean=NULL, value_json=NULL;

INSERT INTO product_attribute_values
 (product_id, attribute_definition_id, value_text)
SELECT p.product_id, ad.attribute_definition_id, '80 PLUS Gold'
FROM products p
JOIN product_types pt ON pt.type_code='PSU'
JOIN product_attribute_definitions ad
 ON ad.product_type_id=pt.product_type_id AND ad.attribute_code='efficiency_rating'
WHERE p.model_code='MAG-A750GL-PCIE5'
ON CONFLICT (product_id, attribute_definition_id) DO UPDATE SET
 value_text=EXCLUDED.value_text, value_decimal=NULL, value_integer=NULL, value_boolean=NULL, value_json=NULL;

INSERT INTO product_attribute_values
 (product_id, attribute_definition_id, value_text)
SELECT p.product_id, ad.attribute_definition_id, 'Fully Modular'
FROM products p
JOIN product_types pt ON pt.type_code='PSU'
JOIN product_attribute_definitions ad
 ON ad.product_type_id=pt.product_type_id AND ad.attribute_code='modularity'
WHERE p.model_code='MAG-A750GL-PCIE5'
ON CONFLICT (product_id, attribute_definition_id) DO UPDATE SET
 value_text=EXCLUDED.value_text, value_decimal=NULL, value_integer=NULL, value_boolean=NULL, value_json=NULL;

INSERT INTO products
 (product_type_id, category_id, brand_id, model_code, product_name, short_description, description, product_status)
SELECT pt.product_type_id, c.category_id, b.brand_id, 'MAG-A850GL-PCIE5', 'MAG A850GL PCIE5 850W Gold',
       'MAG A850GL PCIE5 850W Gold - catalog tham khảo PC Builder Store.', 'Nguồn tham khảo: https://www.msi.com/',
       'ACTIVE'
FROM product_types pt
JOIN categories c ON c.category_code='PSU'
LEFT JOIN brands b ON b.brand_name='MSI'
WHERE pt.type_code='PSU'
ON CONFLICT (model_code) DO UPDATE SET
 product_type_id=EXCLUDED.product_type_id,
 category_id=EXCLUDED.category_id,
 brand_id=EXCLUDED.brand_id,
 product_name=EXCLUDED.product_name,
 short_description=EXCLUDED.short_description,
 description=EXCLUDED.description,
 product_status='ACTIVE';

INSERT INTO product_offers
 (product_id, offer_code, condition_code, price, currency_code, stock_quantity,
  reserved_quantity, warranty_months, offer_status)
SELECT p.product_id, 'DEMO-MAG-A850GL-PCIE5', 'NEW',
       2000000, 'VND',
       5, 0, 36, 'ACTIVE'
FROM products p WHERE p.model_code='MAG-A850GL-PCIE5'
ON CONFLICT (offer_code) DO UPDATE SET
 product_id=EXCLUDED.product_id,
 condition_code=EXCLUDED.condition_code,
 price=EXCLUDED.price,
 currency_code=EXCLUDED.currency_code,
 stock_quantity=EXCLUDED.stock_quantity,
 warranty_months=EXCLUDED.warranty_months,
 offer_status='ACTIVE';

INSERT INTO product_attribute_values
 (product_id, attribute_definition_id, value_integer)
SELECT p.product_id, ad.attribute_definition_id, 850
FROM products p
JOIN product_types pt ON pt.type_code='PSU'
JOIN product_attribute_definitions ad
 ON ad.product_type_id=pt.product_type_id AND ad.attribute_code='wattage'
WHERE p.model_code='MAG-A850GL-PCIE5'
ON CONFLICT (product_id, attribute_definition_id) DO UPDATE SET
 value_integer=EXCLUDED.value_integer, value_text=NULL, value_decimal=NULL, value_boolean=NULL, value_json=NULL;

INSERT INTO product_attribute_values
 (product_id, attribute_definition_id, value_text)
SELECT p.product_id, ad.attribute_definition_id, '80 PLUS Gold'
FROM products p
JOIN product_types pt ON pt.type_code='PSU'
JOIN product_attribute_definitions ad
 ON ad.product_type_id=pt.product_type_id AND ad.attribute_code='efficiency_rating'
WHERE p.model_code='MAG-A850GL-PCIE5'
ON CONFLICT (product_id, attribute_definition_id) DO UPDATE SET
 value_text=EXCLUDED.value_text, value_decimal=NULL, value_integer=NULL, value_boolean=NULL, value_json=NULL;

INSERT INTO product_attribute_values
 (product_id, attribute_definition_id, value_text)
SELECT p.product_id, ad.attribute_definition_id, 'Fully Modular'
FROM products p
JOIN product_types pt ON pt.type_code='PSU'
JOIN product_attribute_definitions ad
 ON ad.product_type_id=pt.product_type_id AND ad.attribute_code='modularity'
WHERE p.model_code='MAG-A850GL-PCIE5'
ON CONFLICT (product_id, attribute_definition_id) DO UPDATE SET
 value_text=EXCLUDED.value_text, value_decimal=NULL, value_integer=NULL, value_boolean=NULL, value_json=NULL;

INSERT INTO products
 (product_type_id, category_id, brand_id, model_code, product_name, short_description, description, product_status)
SELECT pt.product_type_id, c.category_id, b.brand_id, 'MPE-6501-ACAAB', 'MWE 650 Bronze V2',
       'MWE 650 Bronze V2 - catalog tham khảo PC Builder Store.', 'Nguồn tham khảo: https://phongvu.vn/c/linh-kien-may-tinh',
       'ACTIVE'
FROM product_types pt
JOIN categories c ON c.category_code='PSU'
LEFT JOIN brands b ON b.brand_name='Cooler Master'
WHERE pt.type_code='PSU'
ON CONFLICT (model_code) DO UPDATE SET
 product_type_id=EXCLUDED.product_type_id,
 category_id=EXCLUDED.category_id,
 brand_id=EXCLUDED.brand_id,
 product_name=EXCLUDED.product_name,
 short_description=EXCLUDED.short_description,
 description=EXCLUDED.description,
 product_status='ACTIVE';

INSERT INTO product_offers
 (product_id, offer_code, condition_code, price, currency_code, stock_quantity,
  reserved_quantity, warranty_months, offer_status)
SELECT p.product_id, 'DEMO-MPE-6501-ACAAB', 'NEW',
       2000000, 'VND',
       5, 0, 36, 'ACTIVE'
FROM products p WHERE p.model_code='MPE-6501-ACAAB'
ON CONFLICT (offer_code) DO UPDATE SET
 product_id=EXCLUDED.product_id,
 condition_code=EXCLUDED.condition_code,
 price=EXCLUDED.price,
 currency_code=EXCLUDED.currency_code,
 stock_quantity=EXCLUDED.stock_quantity,
 warranty_months=EXCLUDED.warranty_months,
 offer_status='ACTIVE';

INSERT INTO product_attribute_values
 (product_id, attribute_definition_id, value_integer)
SELECT p.product_id, ad.attribute_definition_id, 650
FROM products p
JOIN product_types pt ON pt.type_code='PSU'
JOIN product_attribute_definitions ad
 ON ad.product_type_id=pt.product_type_id AND ad.attribute_code='wattage'
WHERE p.model_code='MPE-6501-ACAAB'
ON CONFLICT (product_id, attribute_definition_id) DO UPDATE SET
 value_integer=EXCLUDED.value_integer, value_text=NULL, value_decimal=NULL, value_boolean=NULL, value_json=NULL;

INSERT INTO product_attribute_values
 (product_id, attribute_definition_id, value_text)
SELECT p.product_id, ad.attribute_definition_id, '80 PLUS Bronze'
FROM products p
JOIN product_types pt ON pt.type_code='PSU'
JOIN product_attribute_definitions ad
 ON ad.product_type_id=pt.product_type_id AND ad.attribute_code='efficiency_rating'
WHERE p.model_code='MPE-6501-ACAAB'
ON CONFLICT (product_id, attribute_definition_id) DO UPDATE SET
 value_text=EXCLUDED.value_text, value_decimal=NULL, value_integer=NULL, value_boolean=NULL, value_json=NULL;

INSERT INTO products
 (product_type_id, category_id, brand_id, model_code, product_name, short_description, description, product_status)
SELECT pt.product_type_id, c.category_id, b.brand_id, 'MPE-7501-AFAAG', 'MWE Gold 750 V2 Full Modular',
       'MWE Gold 750 V2 Full Modular - catalog tham khảo PC Builder Store.', 'Nguồn tham khảo: https://phongvu.vn/c/linh-kien-may-tinh',
       'ACTIVE'
FROM product_types pt
JOIN categories c ON c.category_code='PSU'
LEFT JOIN brands b ON b.brand_name='Cooler Master'
WHERE pt.type_code='PSU'
ON CONFLICT (model_code) DO UPDATE SET
 product_type_id=EXCLUDED.product_type_id,
 category_id=EXCLUDED.category_id,
 brand_id=EXCLUDED.brand_id,
 product_name=EXCLUDED.product_name,
 short_description=EXCLUDED.short_description,
 description=EXCLUDED.description,
 product_status='ACTIVE';

INSERT INTO product_offers
 (product_id, offer_code, condition_code, price, currency_code, stock_quantity,
  reserved_quantity, warranty_months, offer_status)
SELECT p.product_id, 'DEMO-MPE-7501-AFAAG', 'NEW',
       2000000, 'VND',
       5, 0, 36, 'ACTIVE'
FROM products p WHERE p.model_code='MPE-7501-AFAAG'
ON CONFLICT (offer_code) DO UPDATE SET
 product_id=EXCLUDED.product_id,
 condition_code=EXCLUDED.condition_code,
 price=EXCLUDED.price,
 currency_code=EXCLUDED.currency_code,
 stock_quantity=EXCLUDED.stock_quantity,
 warranty_months=EXCLUDED.warranty_months,
 offer_status='ACTIVE';

INSERT INTO product_attribute_values
 (product_id, attribute_definition_id, value_integer)
SELECT p.product_id, ad.attribute_definition_id, 750
FROM products p
JOIN product_types pt ON pt.type_code='PSU'
JOIN product_attribute_definitions ad
 ON ad.product_type_id=pt.product_type_id AND ad.attribute_code='wattage'
WHERE p.model_code='MPE-7501-AFAAG'
ON CONFLICT (product_id, attribute_definition_id) DO UPDATE SET
 value_integer=EXCLUDED.value_integer, value_text=NULL, value_decimal=NULL, value_boolean=NULL, value_json=NULL;

INSERT INTO product_attribute_values
 (product_id, attribute_definition_id, value_text)
SELECT p.product_id, ad.attribute_definition_id, '80 PLUS Gold'
FROM products p
JOIN product_types pt ON pt.type_code='PSU'
JOIN product_attribute_definitions ad
 ON ad.product_type_id=pt.product_type_id AND ad.attribute_code='efficiency_rating'
WHERE p.model_code='MPE-7501-AFAAG'
ON CONFLICT (product_id, attribute_definition_id) DO UPDATE SET
 value_text=EXCLUDED.value_text, value_decimal=NULL, value_integer=NULL, value_boolean=NULL, value_json=NULL;

INSERT INTO product_attribute_values
 (product_id, attribute_definition_id, value_text)
SELECT p.product_id, ad.attribute_definition_id, 'Fully Modular'
FROM products p
JOIN product_types pt ON pt.type_code='PSU'
JOIN product_attribute_definitions ad
 ON ad.product_type_id=pt.product_type_id AND ad.attribute_code='modularity'
WHERE p.model_code='MPE-7501-AFAAG'
ON CONFLICT (product_id, attribute_definition_id) DO UPDATE SET
 value_text=EXCLUDED.value_text, value_decimal=NULL, value_integer=NULL, value_boolean=NULL, value_json=NULL;

INSERT INTO products
 (product_type_id, category_id, brand_id, model_code, product_name, short_description, description, product_status)
SELECT pt.product_type_id, c.category_id, b.brand_id, 'MPE-8501-AFAAG', 'MWE Gold 850 V2 Full Modular',
       'MWE Gold 850 V2 Full Modular - catalog tham khảo PC Builder Store.', 'Nguồn tham khảo: https://phongvu.vn/c/linh-kien-may-tinh',
       'ACTIVE'
FROM product_types pt
JOIN categories c ON c.category_code='PSU'
LEFT JOIN brands b ON b.brand_name='Cooler Master'
WHERE pt.type_code='PSU'
ON CONFLICT (model_code) DO UPDATE SET
 product_type_id=EXCLUDED.product_type_id,
 category_id=EXCLUDED.category_id,
 brand_id=EXCLUDED.brand_id,
 product_name=EXCLUDED.product_name,
 short_description=EXCLUDED.short_description,
 description=EXCLUDED.description,
 product_status='ACTIVE';

INSERT INTO product_offers
 (product_id, offer_code, condition_code, price, currency_code, stock_quantity,
  reserved_quantity, warranty_months, offer_status)
SELECT p.product_id, 'DEMO-MPE-8501-AFAAG', 'NEW',
       2000000, 'VND',
       5, 0, 36, 'ACTIVE'
FROM products p WHERE p.model_code='MPE-8501-AFAAG'
ON CONFLICT (offer_code) DO UPDATE SET
 product_id=EXCLUDED.product_id,
 condition_code=EXCLUDED.condition_code,
 price=EXCLUDED.price,
 currency_code=EXCLUDED.currency_code,
 stock_quantity=EXCLUDED.stock_quantity,
 warranty_months=EXCLUDED.warranty_months,
 offer_status='ACTIVE';

INSERT INTO product_attribute_values
 (product_id, attribute_definition_id, value_integer)
SELECT p.product_id, ad.attribute_definition_id, 850
FROM products p
JOIN product_types pt ON pt.type_code='PSU'
JOIN product_attribute_definitions ad
 ON ad.product_type_id=pt.product_type_id AND ad.attribute_code='wattage'
WHERE p.model_code='MPE-8501-AFAAG'
ON CONFLICT (product_id, attribute_definition_id) DO UPDATE SET
 value_integer=EXCLUDED.value_integer, value_text=NULL, value_decimal=NULL, value_boolean=NULL, value_json=NULL;

INSERT INTO product_attribute_values
 (product_id, attribute_definition_id, value_text)
SELECT p.product_id, ad.attribute_definition_id, '80 PLUS Gold'
FROM products p
JOIN product_types pt ON pt.type_code='PSU'
JOIN product_attribute_definitions ad
 ON ad.product_type_id=pt.product_type_id AND ad.attribute_code='efficiency_rating'
WHERE p.model_code='MPE-8501-AFAAG'
ON CONFLICT (product_id, attribute_definition_id) DO UPDATE SET
 value_text=EXCLUDED.value_text, value_decimal=NULL, value_integer=NULL, value_boolean=NULL, value_json=NULL;

INSERT INTO product_attribute_values
 (product_id, attribute_definition_id, value_text)
SELECT p.product_id, ad.attribute_definition_id, 'Fully Modular'
FROM products p
JOIN product_types pt ON pt.type_code='PSU'
JOIN product_attribute_definitions ad
 ON ad.product_type_id=pt.product_type_id AND ad.attribute_code='modularity'
WHERE p.model_code='MPE-8501-AFAAG'
ON CONFLICT (product_id, attribute_definition_id) DO UPDATE SET
 value_text=EXCLUDED.value_text, value_decimal=NULL, value_integer=NULL, value_boolean=NULL, value_json=NULL;

INSERT INTO products
 (product_type_id, category_id, brand_id, model_code, product_name, short_description, description, product_status)
SELECT pt.product_type_id, c.category_id, b.brand_id, 'R-PK650D-FA0B', 'PK650D 650W Bronze',
       'PK650D 650W Bronze - catalog tham khảo PC Builder Store.', 'Nguồn tham khảo: https://www.deepcool.com/',
       'ACTIVE'
FROM product_types pt
JOIN categories c ON c.category_code='PSU'
LEFT JOIN brands b ON b.brand_name='DeepCool'
WHERE pt.type_code='PSU'
ON CONFLICT (model_code) DO UPDATE SET
 product_type_id=EXCLUDED.product_type_id,
 category_id=EXCLUDED.category_id,
 brand_id=EXCLUDED.brand_id,
 product_name=EXCLUDED.product_name,
 short_description=EXCLUDED.short_description,
 description=EXCLUDED.description,
 product_status='ACTIVE';

INSERT INTO product_offers
 (product_id, offer_code, condition_code, price, currency_code, stock_quantity,
  reserved_quantity, warranty_months, offer_status)
SELECT p.product_id, 'DEMO-R-PK650D-FA0B', 'NEW',
       2000000, 'VND',
       5, 0, 36, 'ACTIVE'
FROM products p WHERE p.model_code='R-PK650D-FA0B'
ON CONFLICT (offer_code) DO UPDATE SET
 product_id=EXCLUDED.product_id,
 condition_code=EXCLUDED.condition_code,
 price=EXCLUDED.price,
 currency_code=EXCLUDED.currency_code,
 stock_quantity=EXCLUDED.stock_quantity,
 warranty_months=EXCLUDED.warranty_months,
 offer_status='ACTIVE';

INSERT INTO product_attribute_values
 (product_id, attribute_definition_id, value_integer)
SELECT p.product_id, ad.attribute_definition_id, 650
FROM products p
JOIN product_types pt ON pt.type_code='PSU'
JOIN product_attribute_definitions ad
 ON ad.product_type_id=pt.product_type_id AND ad.attribute_code='wattage'
WHERE p.model_code='R-PK650D-FA0B'
ON CONFLICT (product_id, attribute_definition_id) DO UPDATE SET
 value_integer=EXCLUDED.value_integer, value_text=NULL, value_decimal=NULL, value_boolean=NULL, value_json=NULL;

INSERT INTO product_attribute_values
 (product_id, attribute_definition_id, value_text)
SELECT p.product_id, ad.attribute_definition_id, '80 PLUS Bronze'
FROM products p
JOIN product_types pt ON pt.type_code='PSU'
JOIN product_attribute_definitions ad
 ON ad.product_type_id=pt.product_type_id AND ad.attribute_code='efficiency_rating'
WHERE p.model_code='R-PK650D-FA0B'
ON CONFLICT (product_id, attribute_definition_id) DO UPDATE SET
 value_text=EXCLUDED.value_text, value_decimal=NULL, value_integer=NULL, value_boolean=NULL, value_json=NULL;

INSERT INTO products
 (product_type_id, category_id, brand_id, model_code, product_name, short_description, description, product_status)
SELECT pt.product_type_id, c.category_id, b.brand_id, 'R-PM750D-FA0B', 'PM750D 750W Gold',
       'PM750D 750W Gold - catalog tham khảo PC Builder Store.', 'Nguồn tham khảo: https://www.deepcool.com/',
       'ACTIVE'
FROM product_types pt
JOIN categories c ON c.category_code='PSU'
LEFT JOIN brands b ON b.brand_name='DeepCool'
WHERE pt.type_code='PSU'
ON CONFLICT (model_code) DO UPDATE SET
 product_type_id=EXCLUDED.product_type_id,
 category_id=EXCLUDED.category_id,
 brand_id=EXCLUDED.brand_id,
 product_name=EXCLUDED.product_name,
 short_description=EXCLUDED.short_description,
 description=EXCLUDED.description,
 product_status='ACTIVE';

INSERT INTO product_offers
 (product_id, offer_code, condition_code, price, currency_code, stock_quantity,
  reserved_quantity, warranty_months, offer_status)
SELECT p.product_id, 'DEMO-R-PM750D-FA0B', 'NEW',
       2000000, 'VND',
       5, 0, 36, 'ACTIVE'
FROM products p WHERE p.model_code='R-PM750D-FA0B'
ON CONFLICT (offer_code) DO UPDATE SET
 product_id=EXCLUDED.product_id,
 condition_code=EXCLUDED.condition_code,
 price=EXCLUDED.price,
 currency_code=EXCLUDED.currency_code,
 stock_quantity=EXCLUDED.stock_quantity,
 warranty_months=EXCLUDED.warranty_months,
 offer_status='ACTIVE';

INSERT INTO product_attribute_values
 (product_id, attribute_definition_id, value_integer)
SELECT p.product_id, ad.attribute_definition_id, 750
FROM products p
JOIN product_types pt ON pt.type_code='PSU'
JOIN product_attribute_definitions ad
 ON ad.product_type_id=pt.product_type_id AND ad.attribute_code='wattage'
WHERE p.model_code='R-PM750D-FA0B'
ON CONFLICT (product_id, attribute_definition_id) DO UPDATE SET
 value_integer=EXCLUDED.value_integer, value_text=NULL, value_decimal=NULL, value_boolean=NULL, value_json=NULL;

INSERT INTO product_attribute_values
 (product_id, attribute_definition_id, value_text)
SELECT p.product_id, ad.attribute_definition_id, '80 PLUS Gold'
FROM products p
JOIN product_types pt ON pt.type_code='PSU'
JOIN product_attribute_definitions ad
 ON ad.product_type_id=pt.product_type_id AND ad.attribute_code='efficiency_rating'
WHERE p.model_code='R-PM750D-FA0B'
ON CONFLICT (product_id, attribute_definition_id) DO UPDATE SET
 value_text=EXCLUDED.value_text, value_decimal=NULL, value_integer=NULL, value_boolean=NULL, value_json=NULL;

INSERT INTO products
 (product_type_id, category_id, brand_id, model_code, product_name, short_description, description, product_status)
SELECT pt.product_type_id, c.category_id, b.brand_id, 'R-PX850G-FC0B', 'PX850G 850W Gold',
       'PX850G 850W Gold - catalog tham khảo PC Builder Store.', 'Nguồn tham khảo: https://www.deepcool.com/',
       'ACTIVE'
FROM product_types pt
JOIN categories c ON c.category_code='PSU'
LEFT JOIN brands b ON b.brand_name='DeepCool'
WHERE pt.type_code='PSU'
ON CONFLICT (model_code) DO UPDATE SET
 product_type_id=EXCLUDED.product_type_id,
 category_id=EXCLUDED.category_id,
 brand_id=EXCLUDED.brand_id,
 product_name=EXCLUDED.product_name,
 short_description=EXCLUDED.short_description,
 description=EXCLUDED.description,
 product_status='ACTIVE';

INSERT INTO product_offers
 (product_id, offer_code, condition_code, price, currency_code, stock_quantity,
  reserved_quantity, warranty_months, offer_status)
SELECT p.product_id, 'DEMO-R-PX850G-FC0B', 'NEW',
       2000000, 'VND',
       5, 0, 36, 'ACTIVE'
FROM products p WHERE p.model_code='R-PX850G-FC0B'
ON CONFLICT (offer_code) DO UPDATE SET
 product_id=EXCLUDED.product_id,
 condition_code=EXCLUDED.condition_code,
 price=EXCLUDED.price,
 currency_code=EXCLUDED.currency_code,
 stock_quantity=EXCLUDED.stock_quantity,
 warranty_months=EXCLUDED.warranty_months,
 offer_status='ACTIVE';

INSERT INTO product_attribute_values
 (product_id, attribute_definition_id, value_integer)
SELECT p.product_id, ad.attribute_definition_id, 850
FROM products p
JOIN product_types pt ON pt.type_code='PSU'
JOIN product_attribute_definitions ad
 ON ad.product_type_id=pt.product_type_id AND ad.attribute_code='wattage'
WHERE p.model_code='R-PX850G-FC0B'
ON CONFLICT (product_id, attribute_definition_id) DO UPDATE SET
 value_integer=EXCLUDED.value_integer, value_text=NULL, value_decimal=NULL, value_boolean=NULL, value_json=NULL;

INSERT INTO product_attribute_values
 (product_id, attribute_definition_id, value_text)
SELECT p.product_id, ad.attribute_definition_id, '80 PLUS Gold'
FROM products p
JOIN product_types pt ON pt.type_code='PSU'
JOIN product_attribute_definitions ad
 ON ad.product_type_id=pt.product_type_id AND ad.attribute_code='efficiency_rating'
WHERE p.model_code='R-PX850G-FC0B'
ON CONFLICT (product_id, attribute_definition_id) DO UPDATE SET
 value_text=EXCLUDED.value_text, value_decimal=NULL, value_integer=NULL, value_boolean=NULL, value_json=NULL;

INSERT INTO product_attribute_values
 (product_id, attribute_definition_id, value_text)
SELECT p.product_id, ad.attribute_definition_id, 'Fully Modular'
FROM products p
JOIN product_types pt ON pt.type_code='PSU'
JOIN product_attribute_definitions ad
 ON ad.product_type_id=pt.product_type_id AND ad.attribute_code='modularity'
WHERE p.model_code='R-PX850G-FC0B'
ON CONFLICT (product_id, attribute_definition_id) DO UPDATE SET
 value_text=EXCLUDED.value_text, value_decimal=NULL, value_integer=NULL, value_boolean=NULL, value_json=NULL;

INSERT INTO products
 (product_type_id, category_id, brand_id, model_code, product_name, short_description, description, product_status)
SELECT pt.product_type_id, c.category_id, b.brand_id, 'FOCUS-GX-750', 'FOCUS GX-750',
       'FOCUS GX-750 - catalog tham khảo PC Builder Store.', 'Nguồn tham khảo: https://phongvu.vn/c/linh-kien-may-tinh',
       'ACTIVE'
FROM product_types pt
JOIN categories c ON c.category_code='PSU'
LEFT JOIN brands b ON b.brand_name='Seasonic'
WHERE pt.type_code='PSU'
ON CONFLICT (model_code) DO UPDATE SET
 product_type_id=EXCLUDED.product_type_id,
 category_id=EXCLUDED.category_id,
 brand_id=EXCLUDED.brand_id,
 product_name=EXCLUDED.product_name,
 short_description=EXCLUDED.short_description,
 description=EXCLUDED.description,
 product_status='ACTIVE';

INSERT INTO product_offers
 (product_id, offer_code, condition_code, price, currency_code, stock_quantity,
  reserved_quantity, warranty_months, offer_status)
SELECT p.product_id, 'DEMO-FOCUS-GX-750', 'NEW',
       2000000, 'VND',
       5, 0, 36, 'ACTIVE'
FROM products p WHERE p.model_code='FOCUS-GX-750'
ON CONFLICT (offer_code) DO UPDATE SET
 product_id=EXCLUDED.product_id,
 condition_code=EXCLUDED.condition_code,
 price=EXCLUDED.price,
 currency_code=EXCLUDED.currency_code,
 stock_quantity=EXCLUDED.stock_quantity,
 warranty_months=EXCLUDED.warranty_months,
 offer_status='ACTIVE';

INSERT INTO product_attribute_values
 (product_id, attribute_definition_id, value_integer)
SELECT p.product_id, ad.attribute_definition_id, 750
FROM products p
JOIN product_types pt ON pt.type_code='PSU'
JOIN product_attribute_definitions ad
 ON ad.product_type_id=pt.product_type_id AND ad.attribute_code='wattage'
WHERE p.model_code='FOCUS-GX-750'
ON CONFLICT (product_id, attribute_definition_id) DO UPDATE SET
 value_integer=EXCLUDED.value_integer, value_text=NULL, value_decimal=NULL, value_boolean=NULL, value_json=NULL;

INSERT INTO product_attribute_values
 (product_id, attribute_definition_id, value_text)
SELECT p.product_id, ad.attribute_definition_id, '80 PLUS Gold'
FROM products p
JOIN product_types pt ON pt.type_code='PSU'
JOIN product_attribute_definitions ad
 ON ad.product_type_id=pt.product_type_id AND ad.attribute_code='efficiency_rating'
WHERE p.model_code='FOCUS-GX-750'
ON CONFLICT (product_id, attribute_definition_id) DO UPDATE SET
 value_text=EXCLUDED.value_text, value_decimal=NULL, value_integer=NULL, value_boolean=NULL, value_json=NULL;

INSERT INTO product_attribute_values
 (product_id, attribute_definition_id, value_text)
SELECT p.product_id, ad.attribute_definition_id, 'Fully Modular'
FROM products p
JOIN product_types pt ON pt.type_code='PSU'
JOIN product_attribute_definitions ad
 ON ad.product_type_id=pt.product_type_id AND ad.attribute_code='modularity'
WHERE p.model_code='FOCUS-GX-750'
ON CONFLICT (product_id, attribute_definition_id) DO UPDATE SET
 value_text=EXCLUDED.value_text, value_decimal=NULL, value_integer=NULL, value_boolean=NULL, value_json=NULL;

INSERT INTO products
 (product_type_id, category_id, brand_id, model_code, product_name, short_description, description, product_status)
SELECT pt.product_type_id, c.category_id, b.brand_id, 'FOCUS-GX-850', 'FOCUS GX-850',
       'FOCUS GX-850 - catalog tham khảo PC Builder Store.', 'Nguồn tham khảo: https://phongvu.vn/c/linh-kien-may-tinh',
       'ACTIVE'
FROM product_types pt
JOIN categories c ON c.category_code='PSU'
LEFT JOIN brands b ON b.brand_name='Seasonic'
WHERE pt.type_code='PSU'
ON CONFLICT (model_code) DO UPDATE SET
 product_type_id=EXCLUDED.product_type_id,
 category_id=EXCLUDED.category_id,
 brand_id=EXCLUDED.brand_id,
 product_name=EXCLUDED.product_name,
 short_description=EXCLUDED.short_description,
 description=EXCLUDED.description,
 product_status='ACTIVE';

INSERT INTO product_offers
 (product_id, offer_code, condition_code, price, currency_code, stock_quantity,
  reserved_quantity, warranty_months, offer_status)
SELECT p.product_id, 'DEMO-FOCUS-GX-850', 'NEW',
       2000000, 'VND',
       5, 0, 36, 'ACTIVE'
FROM products p WHERE p.model_code='FOCUS-GX-850'
ON CONFLICT (offer_code) DO UPDATE SET
 product_id=EXCLUDED.product_id,
 condition_code=EXCLUDED.condition_code,
 price=EXCLUDED.price,
 currency_code=EXCLUDED.currency_code,
 stock_quantity=EXCLUDED.stock_quantity,
 warranty_months=EXCLUDED.warranty_months,
 offer_status='ACTIVE';

INSERT INTO product_attribute_values
 (product_id, attribute_definition_id, value_integer)
SELECT p.product_id, ad.attribute_definition_id, 850
FROM products p
JOIN product_types pt ON pt.type_code='PSU'
JOIN product_attribute_definitions ad
 ON ad.product_type_id=pt.product_type_id AND ad.attribute_code='wattage'
WHERE p.model_code='FOCUS-GX-850'
ON CONFLICT (product_id, attribute_definition_id) DO UPDATE SET
 value_integer=EXCLUDED.value_integer, value_text=NULL, value_decimal=NULL, value_boolean=NULL, value_json=NULL;

INSERT INTO product_attribute_values
 (product_id, attribute_definition_id, value_text)
SELECT p.product_id, ad.attribute_definition_id, '80 PLUS Gold'
FROM products p
JOIN product_types pt ON pt.type_code='PSU'
JOIN product_attribute_definitions ad
 ON ad.product_type_id=pt.product_type_id AND ad.attribute_code='efficiency_rating'
WHERE p.model_code='FOCUS-GX-850'
ON CONFLICT (product_id, attribute_definition_id) DO UPDATE SET
 value_text=EXCLUDED.value_text, value_decimal=NULL, value_integer=NULL, value_boolean=NULL, value_json=NULL;

INSERT INTO product_attribute_values
 (product_id, attribute_definition_id, value_text)
SELECT p.product_id, ad.attribute_definition_id, 'Fully Modular'
FROM products p
JOIN product_types pt ON pt.type_code='PSU'
JOIN product_attribute_definitions ad
 ON ad.product_type_id=pt.product_type_id AND ad.attribute_code='modularity'
WHERE p.model_code='FOCUS-GX-850'
ON CONFLICT (product_id, attribute_definition_id) DO UPDATE SET
 value_text=EXCLUDED.value_text, value_decimal=NULL, value_integer=NULL, value_boolean=NULL, value_json=NULL;

INSERT INTO products
 (product_type_id, category_id, brand_id, model_code, product_name, short_description, description, product_status)
SELECT pt.product_type_id, c.category_id, b.brand_id, 'HG2-750', 'Hydro G Pro 750W',
       'Hydro G Pro 750W - catalog tham khảo PC Builder Store.', 'Nguồn tham khảo: https://phongvu.vn/c/linh-kien-may-tinh',
       'ACTIVE'
FROM product_types pt
JOIN categories c ON c.category_code='PSU'
LEFT JOIN brands b ON b.brand_name='FSP'
WHERE pt.type_code='PSU'
ON CONFLICT (model_code) DO UPDATE SET
 product_type_id=EXCLUDED.product_type_id,
 category_id=EXCLUDED.category_id,
 brand_id=EXCLUDED.brand_id,
 product_name=EXCLUDED.product_name,
 short_description=EXCLUDED.short_description,
 description=EXCLUDED.description,
 product_status='ACTIVE';

INSERT INTO product_offers
 (product_id, offer_code, condition_code, price, currency_code, stock_quantity,
  reserved_quantity, warranty_months, offer_status)
SELECT p.product_id, 'DEMO-HG2-750', 'NEW',
       2000000, 'VND',
       5, 0, 36, 'ACTIVE'
FROM products p WHERE p.model_code='HG2-750'
ON CONFLICT (offer_code) DO UPDATE SET
 product_id=EXCLUDED.product_id,
 condition_code=EXCLUDED.condition_code,
 price=EXCLUDED.price,
 currency_code=EXCLUDED.currency_code,
 stock_quantity=EXCLUDED.stock_quantity,
 warranty_months=EXCLUDED.warranty_months,
 offer_status='ACTIVE';

INSERT INTO product_attribute_values
 (product_id, attribute_definition_id, value_integer)
SELECT p.product_id, ad.attribute_definition_id, 750
FROM products p
JOIN product_types pt ON pt.type_code='PSU'
JOIN product_attribute_definitions ad
 ON ad.product_type_id=pt.product_type_id AND ad.attribute_code='wattage'
WHERE p.model_code='HG2-750'
ON CONFLICT (product_id, attribute_definition_id) DO UPDATE SET
 value_integer=EXCLUDED.value_integer, value_text=NULL, value_decimal=NULL, value_boolean=NULL, value_json=NULL;

INSERT INTO product_attribute_values
 (product_id, attribute_definition_id, value_text)
SELECT p.product_id, ad.attribute_definition_id, '80 PLUS Gold'
FROM products p
JOIN product_types pt ON pt.type_code='PSU'
JOIN product_attribute_definitions ad
 ON ad.product_type_id=pt.product_type_id AND ad.attribute_code='efficiency_rating'
WHERE p.model_code='HG2-750'
ON CONFLICT (product_id, attribute_definition_id) DO UPDATE SET
 value_text=EXCLUDED.value_text, value_decimal=NULL, value_integer=NULL, value_boolean=NULL, value_json=NULL;

INSERT INTO product_attribute_values
 (product_id, attribute_definition_id, value_text)
SELECT p.product_id, ad.attribute_definition_id, 'Fully Modular'
FROM products p
JOIN product_types pt ON pt.type_code='PSU'
JOIN product_attribute_definitions ad
 ON ad.product_type_id=pt.product_type_id AND ad.attribute_code='modularity'
WHERE p.model_code='HG2-750'
ON CONFLICT (product_id, attribute_definition_id) DO UPDATE SET
 value_text=EXCLUDED.value_text, value_decimal=NULL, value_integer=NULL, value_boolean=NULL, value_json=NULL;

INSERT INTO products
 (product_type_id, category_id, brand_id, model_code, product_name, short_description, description, product_status)
SELECT pt.product_type_id, c.category_id, b.brand_id, 'PS-TPD-0850FNFAGU-L', 'Toughpower GF A3 850W',
       'Toughpower GF A3 850W - catalog tham khảo PC Builder Store.', 'Nguồn tham khảo: https://phongvu.vn/c/linh-kien-may-tinh',
       'ACTIVE'
FROM product_types pt
JOIN categories c ON c.category_code='PSU'
LEFT JOIN brands b ON b.brand_name='Thermaltake'
WHERE pt.type_code='PSU'
ON CONFLICT (model_code) DO UPDATE SET
 product_type_id=EXCLUDED.product_type_id,
 category_id=EXCLUDED.category_id,
 brand_id=EXCLUDED.brand_id,
 product_name=EXCLUDED.product_name,
 short_description=EXCLUDED.short_description,
 description=EXCLUDED.description,
 product_status='ACTIVE';

INSERT INTO product_offers
 (product_id, offer_code, condition_code, price, currency_code, stock_quantity,
  reserved_quantity, warranty_months, offer_status)
SELECT p.product_id, 'DEMO-PS-TPD-0850FNFAGU-L', 'NEW',
       2000000, 'VND',
       5, 0, 36, 'ACTIVE'
FROM products p WHERE p.model_code='PS-TPD-0850FNFAGU-L'
ON CONFLICT (offer_code) DO UPDATE SET
 product_id=EXCLUDED.product_id,
 condition_code=EXCLUDED.condition_code,
 price=EXCLUDED.price,
 currency_code=EXCLUDED.currency_code,
 stock_quantity=EXCLUDED.stock_quantity,
 warranty_months=EXCLUDED.warranty_months,
 offer_status='ACTIVE';

INSERT INTO product_attribute_values
 (product_id, attribute_definition_id, value_integer)
SELECT p.product_id, ad.attribute_definition_id, 850
FROM products p
JOIN product_types pt ON pt.type_code='PSU'
JOIN product_attribute_definitions ad
 ON ad.product_type_id=pt.product_type_id AND ad.attribute_code='wattage'
WHERE p.model_code='PS-TPD-0850FNFAGU-L'
ON CONFLICT (product_id, attribute_definition_id) DO UPDATE SET
 value_integer=EXCLUDED.value_integer, value_text=NULL, value_decimal=NULL, value_boolean=NULL, value_json=NULL;

INSERT INTO product_attribute_values
 (product_id, attribute_definition_id, value_text)
SELECT p.product_id, ad.attribute_definition_id, '80 PLUS Gold'
FROM products p
JOIN product_types pt ON pt.type_code='PSU'
JOIN product_attribute_definitions ad
 ON ad.product_type_id=pt.product_type_id AND ad.attribute_code='efficiency_rating'
WHERE p.model_code='PS-TPD-0850FNFAGU-L'
ON CONFLICT (product_id, attribute_definition_id) DO UPDATE SET
 value_text=EXCLUDED.value_text, value_decimal=NULL, value_integer=NULL, value_boolean=NULL, value_json=NULL;

INSERT INTO product_attribute_values
 (product_id, attribute_definition_id, value_text)
SELECT p.product_id, ad.attribute_definition_id, 'Fully Modular'
FROM products p
JOIN product_types pt ON pt.type_code='PSU'
JOIN product_attribute_definitions ad
 ON ad.product_type_id=pt.product_type_id AND ad.attribute_code='modularity'
WHERE p.model_code='PS-TPD-0850FNFAGU-L'
ON CONFLICT (product_id, attribute_definition_id) DO UPDATE SET
 value_text=EXCLUDED.value_text, value_decimal=NULL, value_integer=NULL, value_boolean=NULL, value_json=NULL;

INSERT INTO products
 (product_type_id, category_id, brand_id, model_code, product_name, short_description, description, product_status)
SELECT pt.product_type_id, c.category_id, b.brand_id, 'R-CH560-BKAPE4-G-1', 'CH560',
       'CH560 - catalog tham khảo PC Builder Store.', 'Nguồn tham khảo: https://www.deepcool.com/products/Cases/CH560-New-Generation-of-Airflow-Case/2023/17101.shtml',
       'ACTIVE'
FROM product_types pt
JOIN categories c ON c.category_code='CASE'
LEFT JOIN brands b ON b.brand_name='DeepCool'
WHERE pt.type_code='CASE'
ON CONFLICT (model_code) DO UPDATE SET
 product_type_id=EXCLUDED.product_type_id,
 category_id=EXCLUDED.category_id,
 brand_id=EXCLUDED.brand_id,
 product_name=EXCLUDED.product_name,
 short_description=EXCLUDED.short_description,
 description=EXCLUDED.description,
 product_status='ACTIVE';

INSERT INTO product_offers
 (product_id, offer_code, condition_code, price, currency_code, stock_quantity,
  reserved_quantity, warranty_months, offer_status)
SELECT p.product_id, 'DEMO-R-CH560-BKAPE4-G-1', 'NEW',
       1800000, 'VND',
       5, 0, 36, 'ACTIVE'
FROM products p WHERE p.model_code='R-CH560-BKAPE4-G-1'
ON CONFLICT (offer_code) DO UPDATE SET
 product_id=EXCLUDED.product_id,
 condition_code=EXCLUDED.condition_code,
 price=EXCLUDED.price,
 currency_code=EXCLUDED.currency_code,
 stock_quantity=EXCLUDED.stock_quantity,
 warranty_months=EXCLUDED.warranty_months,
 offer_status='ACTIVE';

INSERT INTO product_attribute_values
 (product_id, attribute_definition_id, value_integer)
SELECT p.product_id, ad.attribute_definition_id, 380
FROM products p
JOIN product_types pt ON pt.type_code='CASE'
JOIN product_attribute_definitions ad
 ON ad.product_type_id=pt.product_type_id AND ad.attribute_code='max_gpu_length_mm'
WHERE p.model_code='R-CH560-BKAPE4-G-1'
ON CONFLICT (product_id, attribute_definition_id) DO UPDATE SET
 value_integer=EXCLUDED.value_integer, value_text=NULL, value_decimal=NULL, value_boolean=NULL, value_json=NULL;

INSERT INTO product_attribute_values
 (product_id, attribute_definition_id, value_integer)
SELECT p.product_id, ad.attribute_definition_id, 175
FROM products p
JOIN product_types pt ON pt.type_code='CASE'
JOIN product_attribute_definitions ad
 ON ad.product_type_id=pt.product_type_id AND ad.attribute_code='max_cooler_height_mm'
WHERE p.model_code='R-CH560-BKAPE4-G-1'
ON CONFLICT (product_id, attribute_definition_id) DO UPDATE SET
 value_integer=EXCLUDED.value_integer, value_text=NULL, value_decimal=NULL, value_boolean=NULL, value_json=NULL;

INSERT INTO product_attribute_values
 (product_id, attribute_definition_id, value_json)
SELECT p.product_id, ad.attribute_definition_id, '["Mini-ITX", "Micro-ATX", "ATX", "E-ATX"]'::jsonb
FROM products p
JOIN product_types pt ON pt.type_code='CASE'
JOIN product_attribute_definitions ad
 ON ad.product_type_id=pt.product_type_id AND ad.attribute_code='motherboard_form_factors'
WHERE p.model_code='R-CH560-BKAPE4-G-1'
ON CONFLICT (product_id, attribute_definition_id) DO UPDATE SET
 value_json=EXCLUDED.value_json, value_text=NULL, value_decimal=NULL, value_integer=NULL, value_boolean=NULL;

INSERT INTO products
 (product_type_id, category_id, brand_id, model_code, product_name, short_description, description, product_status)
SELECT pt.product_type_id, c.category_id, b.brand_id, 'R-CH360-BKAPE3-G-1', 'CH360',
       'CH360 - catalog tham khảo PC Builder Store.', 'Nguồn tham khảo: https://www.deepcool.com/',
       'ACTIVE'
FROM product_types pt
JOIN categories c ON c.category_code='CASE'
LEFT JOIN brands b ON b.brand_name='DeepCool'
WHERE pt.type_code='CASE'
ON CONFLICT (model_code) DO UPDATE SET
 product_type_id=EXCLUDED.product_type_id,
 category_id=EXCLUDED.category_id,
 brand_id=EXCLUDED.brand_id,
 product_name=EXCLUDED.product_name,
 short_description=EXCLUDED.short_description,
 description=EXCLUDED.description,
 product_status='ACTIVE';

INSERT INTO product_offers
 (product_id, offer_code, condition_code, price, currency_code, stock_quantity,
  reserved_quantity, warranty_months, offer_status)
SELECT p.product_id, 'DEMO-R-CH360-BKAPE3-G-1', 'NEW',
       1800000, 'VND',
       5, 0, 36, 'ACTIVE'
FROM products p WHERE p.model_code='R-CH360-BKAPE3-G-1'
ON CONFLICT (offer_code) DO UPDATE SET
 product_id=EXCLUDED.product_id,
 condition_code=EXCLUDED.condition_code,
 price=EXCLUDED.price,
 currency_code=EXCLUDED.currency_code,
 stock_quantity=EXCLUDED.stock_quantity,
 warranty_months=EXCLUDED.warranty_months,
 offer_status='ACTIVE';

INSERT INTO product_attribute_values
 (product_id, attribute_definition_id, value_json)
SELECT p.product_id, ad.attribute_definition_id, '["Micro-ATX", "Mini-ITX"]'::jsonb
FROM products p
JOIN product_types pt ON pt.type_code='CASE'
JOIN product_attribute_definitions ad
 ON ad.product_type_id=pt.product_type_id AND ad.attribute_code='motherboard_form_factors'
WHERE p.model_code='R-CH360-BKAPE3-G-1'
ON CONFLICT (product_id, attribute_definition_id) DO UPDATE SET
 value_json=EXCLUDED.value_json, value_text=NULL, value_decimal=NULL, value_integer=NULL, value_boolean=NULL;

INSERT INTO products
 (product_type_id, category_id, brand_id, model_code, product_name, short_description, description, product_status)
SELECT pt.product_type_id, c.category_id, b.brand_id, 'CC-H52FB-01', 'H5 Flow 2024',
       'H5 Flow 2024 - catalog tham khảo PC Builder Store.', 'Nguồn tham khảo: https://support.nzxt.com/hc/en-us/articles/40225168535451-H5-Flow-2024-Specs',
       'ACTIVE'
FROM product_types pt
JOIN categories c ON c.category_code='CASE'
LEFT JOIN brands b ON b.brand_name='NZXT'
WHERE pt.type_code='CASE'
ON CONFLICT (model_code) DO UPDATE SET
 product_type_id=EXCLUDED.product_type_id,
 category_id=EXCLUDED.category_id,
 brand_id=EXCLUDED.brand_id,
 product_name=EXCLUDED.product_name,
 short_description=EXCLUDED.short_description,
 description=EXCLUDED.description,
 product_status='ACTIVE';

INSERT INTO product_offers
 (product_id, offer_code, condition_code, price, currency_code, stock_quantity,
  reserved_quantity, warranty_months, offer_status)
SELECT p.product_id, 'DEMO-CC-H52FB-01', 'NEW',
       1800000, 'VND',
       5, 0, 36, 'ACTIVE'
FROM products p WHERE p.model_code='CC-H52FB-01'
ON CONFLICT (offer_code) DO UPDATE SET
 product_id=EXCLUDED.product_id,
 condition_code=EXCLUDED.condition_code,
 price=EXCLUDED.price,
 currency_code=EXCLUDED.currency_code,
 stock_quantity=EXCLUDED.stock_quantity,
 warranty_months=EXCLUDED.warranty_months,
 offer_status='ACTIVE';

INSERT INTO product_attribute_values
 (product_id, attribute_definition_id, value_integer)
SELECT p.product_id, ad.attribute_definition_id, 410
FROM products p
JOIN product_types pt ON pt.type_code='CASE'
JOIN product_attribute_definitions ad
 ON ad.product_type_id=pt.product_type_id AND ad.attribute_code='max_gpu_length_mm'
WHERE p.model_code='CC-H52FB-01'
ON CONFLICT (product_id, attribute_definition_id) DO UPDATE SET
 value_integer=EXCLUDED.value_integer, value_text=NULL, value_decimal=NULL, value_boolean=NULL, value_json=NULL;

INSERT INTO product_attribute_values
 (product_id, attribute_definition_id, value_integer)
SELECT p.product_id, ad.attribute_definition_id, 170
FROM products p
JOIN product_types pt ON pt.type_code='CASE'
JOIN product_attribute_definitions ad
 ON ad.product_type_id=pt.product_type_id AND ad.attribute_code='max_cooler_height_mm'
WHERE p.model_code='CC-H52FB-01'
ON CONFLICT (product_id, attribute_definition_id) DO UPDATE SET
 value_integer=EXCLUDED.value_integer, value_text=NULL, value_decimal=NULL, value_boolean=NULL, value_json=NULL;

INSERT INTO products
 (product_type_id, category_id, brand_id, model_code, product_name, short_description, description, product_status)
SELECT pt.product_type_id, c.category_id, b.brand_id, 'CC-H61FB-01', 'H6 Flow',
       'H6 Flow - catalog tham khảo PC Builder Store.', 'Nguồn tham khảo: https://nzxt.com/',
       'ACTIVE'
FROM product_types pt
JOIN categories c ON c.category_code='CASE'
LEFT JOIN brands b ON b.brand_name='NZXT'
WHERE pt.type_code='CASE'
ON CONFLICT (model_code) DO UPDATE SET
 product_type_id=EXCLUDED.product_type_id,
 category_id=EXCLUDED.category_id,
 brand_id=EXCLUDED.brand_id,
 product_name=EXCLUDED.product_name,
 short_description=EXCLUDED.short_description,
 description=EXCLUDED.description,
 product_status='ACTIVE';

INSERT INTO product_offers
 (product_id, offer_code, condition_code, price, currency_code, stock_quantity,
  reserved_quantity, warranty_months, offer_status)
SELECT p.product_id, 'DEMO-CC-H61FB-01', 'NEW',
       1800000, 'VND',
       5, 0, 36, 'ACTIVE'
FROM products p WHERE p.model_code='CC-H61FB-01'
ON CONFLICT (offer_code) DO UPDATE SET
 product_id=EXCLUDED.product_id,
 condition_code=EXCLUDED.condition_code,
 price=EXCLUDED.price,
 currency_code=EXCLUDED.currency_code,
 stock_quantity=EXCLUDED.stock_quantity,
 warranty_months=EXCLUDED.warranty_months,
 offer_status='ACTIVE';

INSERT INTO products
 (product_type_id, category_id, brand_id, model_code, product_name, short_description, description, product_status)
SELECT pt.product_type_id, c.category_id, b.brand_id, 'CC-9011200-WW', '4000D Airflow',
       '4000D Airflow - catalog tham khảo PC Builder Store.', 'Nguồn tham khảo: https://www.corsair.com/',
       'ACTIVE'
FROM product_types pt
JOIN categories c ON c.category_code='CASE'
LEFT JOIN brands b ON b.brand_name='Corsair'
WHERE pt.type_code='CASE'
ON CONFLICT (model_code) DO UPDATE SET
 product_type_id=EXCLUDED.product_type_id,
 category_id=EXCLUDED.category_id,
 brand_id=EXCLUDED.brand_id,
 product_name=EXCLUDED.product_name,
 short_description=EXCLUDED.short_description,
 description=EXCLUDED.description,
 product_status='ACTIVE';

INSERT INTO product_offers
 (product_id, offer_code, condition_code, price, currency_code, stock_quantity,
  reserved_quantity, warranty_months, offer_status)
SELECT p.product_id, 'DEMO-CC-9011200-WW', 'NEW',
       1800000, 'VND',
       5, 0, 36, 'ACTIVE'
FROM products p WHERE p.model_code='CC-9011200-WW'
ON CONFLICT (offer_code) DO UPDATE SET
 product_id=EXCLUDED.product_id,
 condition_code=EXCLUDED.condition_code,
 price=EXCLUDED.price,
 currency_code=EXCLUDED.currency_code,
 stock_quantity=EXCLUDED.stock_quantity,
 warranty_months=EXCLUDED.warranty_months,
 offer_status='ACTIVE';

INSERT INTO product_attribute_values
 (product_id, attribute_definition_id, value_integer)
SELECT p.product_id, ad.attribute_definition_id, 360
FROM products p
JOIN product_types pt ON pt.type_code='CASE'
JOIN product_attribute_definitions ad
 ON ad.product_type_id=pt.product_type_id AND ad.attribute_code='max_gpu_length_mm'
WHERE p.model_code='CC-9011200-WW'
ON CONFLICT (product_id, attribute_definition_id) DO UPDATE SET
 value_integer=EXCLUDED.value_integer, value_text=NULL, value_decimal=NULL, value_boolean=NULL, value_json=NULL;

INSERT INTO product_attribute_values
 (product_id, attribute_definition_id, value_integer)
SELECT p.product_id, ad.attribute_definition_id, 170
FROM products p
JOIN product_types pt ON pt.type_code='CASE'
JOIN product_attribute_definitions ad
 ON ad.product_type_id=pt.product_type_id AND ad.attribute_code='max_cooler_height_mm'
WHERE p.model_code='CC-9011200-WW'
ON CONFLICT (product_id, attribute_definition_id) DO UPDATE SET
 value_integer=EXCLUDED.value_integer, value_text=NULL, value_decimal=NULL, value_boolean=NULL, value_json=NULL;

INSERT INTO products
 (product_type_id, category_id, brand_id, model_code, product_name, short_description, description, product_status)
SELECT pt.product_type_id, c.category_id, b.brand_id, 'CC-9011251-WW', '3000D Airflow',
       '3000D Airflow - catalog tham khảo PC Builder Store.', 'Nguồn tham khảo: https://www.corsair.com/',
       'ACTIVE'
FROM product_types pt
JOIN categories c ON c.category_code='CASE'
LEFT JOIN brands b ON b.brand_name='Corsair'
WHERE pt.type_code='CASE'
ON CONFLICT (model_code) DO UPDATE SET
 product_type_id=EXCLUDED.product_type_id,
 category_id=EXCLUDED.category_id,
 brand_id=EXCLUDED.brand_id,
 product_name=EXCLUDED.product_name,
 short_description=EXCLUDED.short_description,
 description=EXCLUDED.description,
 product_status='ACTIVE';

INSERT INTO product_offers
 (product_id, offer_code, condition_code, price, currency_code, stock_quantity,
  reserved_quantity, warranty_months, offer_status)
SELECT p.product_id, 'DEMO-CC-9011251-WW', 'NEW',
       1800000, 'VND',
       5, 0, 36, 'ACTIVE'
FROM products p WHERE p.model_code='CC-9011251-WW'
ON CONFLICT (offer_code) DO UPDATE SET
 product_id=EXCLUDED.product_id,
 condition_code=EXCLUDED.condition_code,
 price=EXCLUDED.price,
 currency_code=EXCLUDED.currency_code,
 stock_quantity=EXCLUDED.stock_quantity,
 warranty_months=EXCLUDED.warranty_months,
 offer_status='ACTIVE';

INSERT INTO products
 (product_type_id, category_id, brand_id, model_code, product_name, short_description, description, product_status)
SELECT pt.product_type_id, c.category_id, b.brand_id, 'LANCOOL-216RX', 'LANCOOL 216',
       'LANCOOL 216 - catalog tham khảo PC Builder Store.', 'Nguồn tham khảo: https://phongvu.vn/c/linh-kien-may-tinh',
       'ACTIVE'
FROM product_types pt
JOIN categories c ON c.category_code='CASE'
LEFT JOIN brands b ON b.brand_name='Lian Li'
WHERE pt.type_code='CASE'
ON CONFLICT (model_code) DO UPDATE SET
 product_type_id=EXCLUDED.product_type_id,
 category_id=EXCLUDED.category_id,
 brand_id=EXCLUDED.brand_id,
 product_name=EXCLUDED.product_name,
 short_description=EXCLUDED.short_description,
 description=EXCLUDED.description,
 product_status='ACTIVE';

INSERT INTO product_offers
 (product_id, offer_code, condition_code, price, currency_code, stock_quantity,
  reserved_quantity, warranty_months, offer_status)
SELECT p.product_id, 'DEMO-LANCOOL-216RX', 'NEW',
       1800000, 'VND',
       5, 0, 36, 'ACTIVE'
FROM products p WHERE p.model_code='LANCOOL-216RX'
ON CONFLICT (offer_code) DO UPDATE SET
 product_id=EXCLUDED.product_id,
 condition_code=EXCLUDED.condition_code,
 price=EXCLUDED.price,
 currency_code=EXCLUDED.currency_code,
 stock_quantity=EXCLUDED.stock_quantity,
 warranty_months=EXCLUDED.warranty_months,
 offer_status='ACTIVE';

INSERT INTO products
 (product_type_id, category_id, brand_id, model_code, product_name, short_description, description, product_status)
SELECT pt.product_type_id, c.category_id, b.brand_id, 'O11DEW', 'O11 Dynamic EVO',
       'O11 Dynamic EVO - catalog tham khảo PC Builder Store.', 'Nguồn tham khảo: https://phongvu.vn/c/linh-kien-may-tinh',
       'ACTIVE'
FROM product_types pt
JOIN categories c ON c.category_code='CASE'
LEFT JOIN brands b ON b.brand_name='Lian Li'
WHERE pt.type_code='CASE'
ON CONFLICT (model_code) DO UPDATE SET
 product_type_id=EXCLUDED.product_type_id,
 category_id=EXCLUDED.category_id,
 brand_id=EXCLUDED.brand_id,
 product_name=EXCLUDED.product_name,
 short_description=EXCLUDED.short_description,
 description=EXCLUDED.description,
 product_status='ACTIVE';

INSERT INTO product_offers
 (product_id, offer_code, condition_code, price, currency_code, stock_quantity,
  reserved_quantity, warranty_months, offer_status)
SELECT p.product_id, 'DEMO-O11DEW', 'NEW',
       1800000, 'VND',
       5, 0, 36, 'ACTIVE'
FROM products p WHERE p.model_code='O11DEW'
ON CONFLICT (offer_code) DO UPDATE SET
 product_id=EXCLUDED.product_id,
 condition_code=EXCLUDED.condition_code,
 price=EXCLUDED.price,
 currency_code=EXCLUDED.currency_code,
 stock_quantity=EXCLUDED.stock_quantity,
 warranty_months=EXCLUDED.warranty_months,
 offer_status='ACTIVE';

INSERT INTO products
 (product_type_id, category_id, brand_id, model_code, product_name, short_description, description, product_status)
SELECT pt.product_type_id, c.category_id, b.brand_id, 'TD500V2-KGNN-S00', 'MasterBox TD500 Mesh V2',
       'MasterBox TD500 Mesh V2 - catalog tham khảo PC Builder Store.', 'Nguồn tham khảo: https://phongvu.vn/c/linh-kien-may-tinh',
       'ACTIVE'
FROM product_types pt
JOIN categories c ON c.category_code='CASE'
LEFT JOIN brands b ON b.brand_name='Cooler Master'
WHERE pt.type_code='CASE'
ON CONFLICT (model_code) DO UPDATE SET
 product_type_id=EXCLUDED.product_type_id,
 category_id=EXCLUDED.category_id,
 brand_id=EXCLUDED.brand_id,
 product_name=EXCLUDED.product_name,
 short_description=EXCLUDED.short_description,
 description=EXCLUDED.description,
 product_status='ACTIVE';

INSERT INTO product_offers
 (product_id, offer_code, condition_code, price, currency_code, stock_quantity,
  reserved_quantity, warranty_months, offer_status)
SELECT p.product_id, 'DEMO-TD500V2-KGNN-S00', 'NEW',
       1800000, 'VND',
       5, 0, 36, 'ACTIVE'
FROM products p WHERE p.model_code='TD500V2-KGNN-S00'
ON CONFLICT (offer_code) DO UPDATE SET
 product_id=EXCLUDED.product_id,
 condition_code=EXCLUDED.condition_code,
 price=EXCLUDED.price,
 currency_code=EXCLUDED.currency_code,
 stock_quantity=EXCLUDED.stock_quantity,
 warranty_months=EXCLUDED.warranty_months,
 offer_status='ACTIVE';

INSERT INTO products
 (product_type_id, category_id, brand_id, model_code, product_name, short_description, description, product_status)
SELECT pt.product_type_id, c.category_id, b.brand_id, 'MCB-NR600-KGNN-S00', 'MasterBox NR600',
       'MasterBox NR600 - catalog tham khảo PC Builder Store.', 'Nguồn tham khảo: https://phongvu.vn/c/linh-kien-may-tinh',
       'ACTIVE'
FROM product_types pt
JOIN categories c ON c.category_code='CASE'
LEFT JOIN brands b ON b.brand_name='Cooler Master'
WHERE pt.type_code='CASE'
ON CONFLICT (model_code) DO UPDATE SET
 product_type_id=EXCLUDED.product_type_id,
 category_id=EXCLUDED.category_id,
 brand_id=EXCLUDED.brand_id,
 product_name=EXCLUDED.product_name,
 short_description=EXCLUDED.short_description,
 description=EXCLUDED.description,
 product_status='ACTIVE';

INSERT INTO product_offers
 (product_id, offer_code, condition_code, price, currency_code, stock_quantity,
  reserved_quantity, warranty_months, offer_status)
SELECT p.product_id, 'DEMO-MCB-NR600-KGNN-S00', 'NEW',
       1800000, 'VND',
       5, 0, 36, 'ACTIVE'
FROM products p WHERE p.model_code='MCB-NR600-KGNN-S00'
ON CONFLICT (offer_code) DO UPDATE SET
 product_id=EXCLUDED.product_id,
 condition_code=EXCLUDED.condition_code,
 price=EXCLUDED.price,
 currency_code=EXCLUDED.currency_code,
 stock_quantity=EXCLUDED.stock_quantity,
 warranty_months=EXCLUDED.warranty_months,
 offer_status='ACTIVE';

INSERT INTO products
 (product_type_id, category_id, brand_id, model_code, product_name, short_description, description, product_status)
SELECT pt.product_type_id, c.category_id, b.brand_id, 'FD-C-POA1A-02', 'Pop Air',
       'Pop Air - catalog tham khảo PC Builder Store.', 'Nguồn tham khảo: https://phongvu.vn/c/linh-kien-may-tinh',
       'ACTIVE'
FROM product_types pt
JOIN categories c ON c.category_code='CASE'
LEFT JOIN brands b ON b.brand_name='Fractal Design'
WHERE pt.type_code='CASE'
ON CONFLICT (model_code) DO UPDATE SET
 product_type_id=EXCLUDED.product_type_id,
 category_id=EXCLUDED.category_id,
 brand_id=EXCLUDED.brand_id,
 product_name=EXCLUDED.product_name,
 short_description=EXCLUDED.short_description,
 description=EXCLUDED.description,
 product_status='ACTIVE';

INSERT INTO product_offers
 (product_id, offer_code, condition_code, price, currency_code, stock_quantity,
  reserved_quantity, warranty_months, offer_status)
SELECT p.product_id, 'DEMO-FD-C-POA1A-02', 'NEW',
       1800000, 'VND',
       5, 0, 36, 'ACTIVE'
FROM products p WHERE p.model_code='FD-C-POA1A-02'
ON CONFLICT (offer_code) DO UPDATE SET
 product_id=EXCLUDED.product_id,
 condition_code=EXCLUDED.condition_code,
 price=EXCLUDED.price,
 currency_code=EXCLUDED.currency_code,
 stock_quantity=EXCLUDED.stock_quantity,
 warranty_months=EXCLUDED.warranty_months,
 offer_status='ACTIVE';

INSERT INTO products
 (product_type_id, category_id, brand_id, model_code, product_name, short_description, description, product_status)
SELECT pt.product_type_id, c.category_id, b.brand_id, 'FD-C-NOR1C-01', 'North',
       'North - catalog tham khảo PC Builder Store.', 'Nguồn tham khảo: https://phongvu.vn/c/linh-kien-may-tinh',
       'ACTIVE'
FROM product_types pt
JOIN categories c ON c.category_code='CASE'
LEFT JOIN brands b ON b.brand_name='Fractal Design'
WHERE pt.type_code='CASE'
ON CONFLICT (model_code) DO UPDATE SET
 product_type_id=EXCLUDED.product_type_id,
 category_id=EXCLUDED.category_id,
 brand_id=EXCLUDED.brand_id,
 product_name=EXCLUDED.product_name,
 short_description=EXCLUDED.short_description,
 description=EXCLUDED.description,
 product_status='ACTIVE';

INSERT INTO product_offers
 (product_id, offer_code, condition_code, price, currency_code, stock_quantity,
  reserved_quantity, warranty_months, offer_status)
SELECT p.product_id, 'DEMO-FD-C-NOR1C-01', 'NEW',
       1800000, 'VND',
       5, 0, 36, 'ACTIVE'
FROM products p WHERE p.model_code='FD-C-NOR1C-01'
ON CONFLICT (offer_code) DO UPDATE SET
 product_id=EXCLUDED.product_id,
 condition_code=EXCLUDED.condition_code,
 price=EXCLUDED.price,
 currency_code=EXCLUDED.currency_code,
 stock_quantity=EXCLUDED.stock_quantity,
 warranty_months=EXCLUDED.warranty_months,
 offer_status='ACTIVE';

INSERT INTO products
 (product_type_id, category_id, brand_id, model_code, product_name, short_description, description, product_status)
SELECT pt.product_type_id, c.category_id, b.brand_id, 'AIR-903-MAX', 'AIR 903 MAX',
       'AIR 903 MAX - catalog tham khảo PC Builder Store.', 'Nguồn tham khảo: https://phongvu.vn/c/linh-kien-may-tinh',
       'ACTIVE'
FROM product_types pt
JOIN categories c ON c.category_code='CASE'
LEFT JOIN brands b ON b.brand_name='Montech'
WHERE pt.type_code='CASE'
ON CONFLICT (model_code) DO UPDATE SET
 product_type_id=EXCLUDED.product_type_id,
 category_id=EXCLUDED.category_id,
 brand_id=EXCLUDED.brand_id,
 product_name=EXCLUDED.product_name,
 short_description=EXCLUDED.short_description,
 description=EXCLUDED.description,
 product_status='ACTIVE';

INSERT INTO product_offers
 (product_id, offer_code, condition_code, price, currency_code, stock_quantity,
  reserved_quantity, warranty_months, offer_status)
SELECT p.product_id, 'DEMO-AIR-903-MAX', 'NEW',
       1800000, 'VND',
       5, 0, 36, 'ACTIVE'
FROM products p WHERE p.model_code='AIR-903-MAX'
ON CONFLICT (offer_code) DO UPDATE SET
 product_id=EXCLUDED.product_id,
 condition_code=EXCLUDED.condition_code,
 price=EXCLUDED.price,
 currency_code=EXCLUDED.currency_code,
 stock_quantity=EXCLUDED.stock_quantity,
 warranty_months=EXCLUDED.warranty_months,
 offer_status='ACTIVE';

INSERT INTO products
 (product_type_id, category_id, brand_id, model_code, product_name, short_description, description, product_status)
SELECT pt.product_type_id, c.category_id, b.brand_id, 'NX410', 'NX410',
       'NX410 - catalog tham khảo PC Builder Store.', 'Nguồn tham khảo: https://phongvu.vn/c/linh-kien-may-tinh',
       'ACTIVE'
FROM product_types pt
JOIN categories c ON c.category_code='CASE'
LEFT JOIN brands b ON b.brand_name='Antec'
WHERE pt.type_code='CASE'
ON CONFLICT (model_code) DO UPDATE SET
 product_type_id=EXCLUDED.product_type_id,
 category_id=EXCLUDED.category_id,
 brand_id=EXCLUDED.brand_id,
 product_name=EXCLUDED.product_name,
 short_description=EXCLUDED.short_description,
 description=EXCLUDED.description,
 product_status='ACTIVE';

INSERT INTO product_offers
 (product_id, offer_code, condition_code, price, currency_code, stock_quantity,
  reserved_quantity, warranty_months, offer_status)
SELECT p.product_id, 'DEMO-NX410', 'NEW',
       1800000, 'VND',
       5, 0, 36, 'ACTIVE'
FROM products p WHERE p.model_code='NX410'
ON CONFLICT (offer_code) DO UPDATE SET
 product_id=EXCLUDED.product_id,
 condition_code=EXCLUDED.condition_code,
 price=EXCLUDED.price,
 currency_code=EXCLUDED.currency_code,
 stock_quantity=EXCLUDED.stock_quantity,
 warranty_months=EXCLUDED.warranty_months,
 offer_status='ACTIVE';

INSERT INTO products
 (product_type_id, category_id, brand_id, model_code, product_name, short_description, description, product_status)
SELECT pt.product_type_id, c.category_id, b.brand_id, 'GT502-PLUS', 'TUF Gaming GT502',
       'TUF Gaming GT502 - catalog tham khảo PC Builder Store.', 'Nguồn tham khảo: https://www.asus.com/',
       'ACTIVE'
FROM product_types pt
JOIN categories c ON c.category_code='CASE'
LEFT JOIN brands b ON b.brand_name='ASUS'
WHERE pt.type_code='CASE'
ON CONFLICT (model_code) DO UPDATE SET
 product_type_id=EXCLUDED.product_type_id,
 category_id=EXCLUDED.category_id,
 brand_id=EXCLUDED.brand_id,
 product_name=EXCLUDED.product_name,
 short_description=EXCLUDED.short_description,
 description=EXCLUDED.description,
 product_status='ACTIVE';

INSERT INTO product_offers
 (product_id, offer_code, condition_code, price, currency_code, stock_quantity,
  reserved_quantity, warranty_months, offer_status)
SELECT p.product_id, 'DEMO-GT502-PLUS', 'NEW',
       1800000, 'VND',
       5, 0, 36, 'ACTIVE'
FROM products p WHERE p.model_code='GT502-PLUS'
ON CONFLICT (offer_code) DO UPDATE SET
 product_id=EXCLUDED.product_id,
 condition_code=EXCLUDED.condition_code,
 price=EXCLUDED.price,
 currency_code=EXCLUDED.currency_code,
 stock_quantity=EXCLUDED.stock_quantity,
 warranty_months=EXCLUDED.warranty_months,
 offer_status='ACTIVE';

INSERT INTO products
 (product_type_id, category_id, brand_id, model_code, product_name, short_description, description, product_status)
SELECT pt.product_type_id, c.category_id, b.brand_id, 'R-AK620-BKNNMT-G', 'AK620',
       'AK620 - catalog tham khảo PC Builder Store.', 'Nguồn tham khảo: https://www.deepcool.com/products/Cooling/cpuaircoolers/AK620-High-Performance-CPU-Cooler-1700-AM5/2021/13067.shtml',
       'ACTIVE'
FROM product_types pt
JOIN categories c ON c.category_code='COOLER'
LEFT JOIN brands b ON b.brand_name='DeepCool'
WHERE pt.type_code='COOLER'
ON CONFLICT (model_code) DO UPDATE SET
 product_type_id=EXCLUDED.product_type_id,
 category_id=EXCLUDED.category_id,
 brand_id=EXCLUDED.brand_id,
 product_name=EXCLUDED.product_name,
 short_description=EXCLUDED.short_description,
 description=EXCLUDED.description,
 product_status='ACTIVE';

INSERT INTO product_offers
 (product_id, offer_code, condition_code, price, currency_code, stock_quantity,
  reserved_quantity, warranty_months, offer_status)
SELECT p.product_id, 'DEMO-R-AK620-BKNNMT-G', 'NEW',
       1000000, 'VND',
       5, 0, 36, 'ACTIVE'
FROM products p WHERE p.model_code='R-AK620-BKNNMT-G'
ON CONFLICT (offer_code) DO UPDATE SET
 product_id=EXCLUDED.product_id,
 condition_code=EXCLUDED.condition_code,
 price=EXCLUDED.price,
 currency_code=EXCLUDED.currency_code,
 stock_quantity=EXCLUDED.stock_quantity,
 warranty_months=EXCLUDED.warranty_months,
 offer_status='ACTIVE';

INSERT INTO product_attribute_values
 (product_id, attribute_definition_id, value_integer)
SELECT p.product_id, ad.attribute_definition_id, 160
FROM products p
JOIN product_types pt ON pt.type_code='COOLER'
JOIN product_attribute_definitions ad
 ON ad.product_type_id=pt.product_type_id AND ad.attribute_code='cooler_height_mm'
WHERE p.model_code='R-AK620-BKNNMT-G'
ON CONFLICT (product_id, attribute_definition_id) DO UPDATE SET
 value_integer=EXCLUDED.value_integer, value_text=NULL, value_decimal=NULL, value_boolean=NULL, value_json=NULL;

INSERT INTO product_attribute_values
 (product_id, attribute_definition_id, value_json)
SELECT p.product_id, ad.attribute_definition_id, '["LGA1700", "AM5", "AM4"]'::jsonb
FROM products p
JOIN product_types pt ON pt.type_code='COOLER'
JOIN product_attribute_definitions ad
 ON ad.product_type_id=pt.product_type_id AND ad.attribute_code='supported_sockets'
WHERE p.model_code='R-AK620-BKNNMT-G'
ON CONFLICT (product_id, attribute_definition_id) DO UPDATE SET
 value_json=EXCLUDED.value_json, value_text=NULL, value_decimal=NULL, value_integer=NULL, value_boolean=NULL;

INSERT INTO products
 (product_type_id, category_id, brand_id, model_code, product_name, short_description, description, product_status)
SELECT pt.product_type_id, c.category_id, b.brand_id, 'R-AK400-BKNNMN-G', 'AK400',
       'AK400 - catalog tham khảo PC Builder Store.', 'Nguồn tham khảo: https://www.deepcool.com/',
       'ACTIVE'
FROM product_types pt
JOIN categories c ON c.category_code='COOLER'
LEFT JOIN brands b ON b.brand_name='DeepCool'
WHERE pt.type_code='COOLER'
ON CONFLICT (model_code) DO UPDATE SET
 product_type_id=EXCLUDED.product_type_id,
 category_id=EXCLUDED.category_id,
 brand_id=EXCLUDED.brand_id,
 product_name=EXCLUDED.product_name,
 short_description=EXCLUDED.short_description,
 description=EXCLUDED.description,
 product_status='ACTIVE';

INSERT INTO product_offers
 (product_id, offer_code, condition_code, price, currency_code, stock_quantity,
  reserved_quantity, warranty_months, offer_status)
SELECT p.product_id, 'DEMO-R-AK400-BKNNMN-G', 'NEW',
       1000000, 'VND',
       5, 0, 36, 'ACTIVE'
FROM products p WHERE p.model_code='R-AK400-BKNNMN-G'
ON CONFLICT (offer_code) DO UPDATE SET
 product_id=EXCLUDED.product_id,
 condition_code=EXCLUDED.condition_code,
 price=EXCLUDED.price,
 currency_code=EXCLUDED.currency_code,
 stock_quantity=EXCLUDED.stock_quantity,
 warranty_months=EXCLUDED.warranty_months,
 offer_status='ACTIVE';

INSERT INTO product_attribute_values
 (product_id, attribute_definition_id, value_integer)
SELECT p.product_id, ad.attribute_definition_id, 155
FROM products p
JOIN product_types pt ON pt.type_code='COOLER'
JOIN product_attribute_definitions ad
 ON ad.product_type_id=pt.product_type_id AND ad.attribute_code='cooler_height_mm'
WHERE p.model_code='R-AK400-BKNNMN-G'
ON CONFLICT (product_id, attribute_definition_id) DO UPDATE SET
 value_integer=EXCLUDED.value_integer, value_text=NULL, value_decimal=NULL, value_boolean=NULL, value_json=NULL;

INSERT INTO product_attribute_values
 (product_id, attribute_definition_id, value_json)
SELECT p.product_id, ad.attribute_definition_id, '["LGA1700", "AM5", "AM4"]'::jsonb
FROM products p
JOIN product_types pt ON pt.type_code='COOLER'
JOIN product_attribute_definitions ad
 ON ad.product_type_id=pt.product_type_id AND ad.attribute_code='supported_sockets'
WHERE p.model_code='R-AK400-BKNNMN-G'
ON CONFLICT (product_id, attribute_definition_id) DO UPDATE SET
 value_json=EXCLUDED.value_json, value_text=NULL, value_decimal=NULL, value_integer=NULL, value_boolean=NULL;

INSERT INTO products
 (product_type_id, category_id, brand_id, model_code, product_name, short_description, description, product_status)
SELECT pt.product_type_id, c.category_id, b.brand_id, 'R-AG400-BKNNMN-G', 'AG400',
       'AG400 - catalog tham khảo PC Builder Store.', 'Nguồn tham khảo: https://www.deepcool.com/',
       'ACTIVE'
FROM product_types pt
JOIN categories c ON c.category_code='COOLER'
LEFT JOIN brands b ON b.brand_name='DeepCool'
WHERE pt.type_code='COOLER'
ON CONFLICT (model_code) DO UPDATE SET
 product_type_id=EXCLUDED.product_type_id,
 category_id=EXCLUDED.category_id,
 brand_id=EXCLUDED.brand_id,
 product_name=EXCLUDED.product_name,
 short_description=EXCLUDED.short_description,
 description=EXCLUDED.description,
 product_status='ACTIVE';

INSERT INTO product_offers
 (product_id, offer_code, condition_code, price, currency_code, stock_quantity,
  reserved_quantity, warranty_months, offer_status)
SELECT p.product_id, 'DEMO-R-AG400-BKNNMN-G', 'NEW',
       1000000, 'VND',
       5, 0, 36, 'ACTIVE'
FROM products p WHERE p.model_code='R-AG400-BKNNMN-G'
ON CONFLICT (offer_code) DO UPDATE SET
 product_id=EXCLUDED.product_id,
 condition_code=EXCLUDED.condition_code,
 price=EXCLUDED.price,
 currency_code=EXCLUDED.currency_code,
 stock_quantity=EXCLUDED.stock_quantity,
 warranty_months=EXCLUDED.warranty_months,
 offer_status='ACTIVE';

INSERT INTO product_attribute_values
 (product_id, attribute_definition_id, value_integer)
SELECT p.product_id, ad.attribute_definition_id, 150
FROM products p
JOIN product_types pt ON pt.type_code='COOLER'
JOIN product_attribute_definitions ad
 ON ad.product_type_id=pt.product_type_id AND ad.attribute_code='cooler_height_mm'
WHERE p.model_code='R-AG400-BKNNMN-G'
ON CONFLICT (product_id, attribute_definition_id) DO UPDATE SET
 value_integer=EXCLUDED.value_integer, value_text=NULL, value_decimal=NULL, value_boolean=NULL, value_json=NULL;

INSERT INTO product_attribute_values
 (product_id, attribute_definition_id, value_json)
SELECT p.product_id, ad.attribute_definition_id, '["LGA1700", "AM5", "AM4"]'::jsonb
FROM products p
JOIN product_types pt ON pt.type_code='COOLER'
JOIN product_attribute_definitions ad
 ON ad.product_type_id=pt.product_type_id AND ad.attribute_code='supported_sockets'
WHERE p.model_code='R-AG400-BKNNMN-G'
ON CONFLICT (product_id, attribute_definition_id) DO UPDATE SET
 value_json=EXCLUDED.value_json, value_text=NULL, value_decimal=NULL, value_integer=NULL, value_boolean=NULL;

INSERT INTO products
 (product_type_id, category_id, brand_id, model_code, product_name, short_description, description, product_status)
SELECT pt.product_type_id, c.category_id, b.brand_id, 'PA120-SE', 'Peerless Assassin 120 SE',
       'Peerless Assassin 120 SE - catalog tham khảo PC Builder Store.', 'Nguồn tham khảo: https://phongvu.vn/c/linh-kien-may-tinh',
       'ACTIVE'
FROM product_types pt
JOIN categories c ON c.category_code='COOLER'
LEFT JOIN brands b ON b.brand_name='Thermalright'
WHERE pt.type_code='COOLER'
ON CONFLICT (model_code) DO UPDATE SET
 product_type_id=EXCLUDED.product_type_id,
 category_id=EXCLUDED.category_id,
 brand_id=EXCLUDED.brand_id,
 product_name=EXCLUDED.product_name,
 short_description=EXCLUDED.short_description,
 description=EXCLUDED.description,
 product_status='ACTIVE';

INSERT INTO product_offers
 (product_id, offer_code, condition_code, price, currency_code, stock_quantity,
  reserved_quantity, warranty_months, offer_status)
SELECT p.product_id, 'DEMO-PA120-SE', 'NEW',
       1000000, 'VND',
       5, 0, 36, 'ACTIVE'
FROM products p WHERE p.model_code='PA120-SE'
ON CONFLICT (offer_code) DO UPDATE SET
 product_id=EXCLUDED.product_id,
 condition_code=EXCLUDED.condition_code,
 price=EXCLUDED.price,
 currency_code=EXCLUDED.currency_code,
 stock_quantity=EXCLUDED.stock_quantity,
 warranty_months=EXCLUDED.warranty_months,
 offer_status='ACTIVE';

INSERT INTO product_attribute_values
 (product_id, attribute_definition_id, value_integer)
SELECT p.product_id, ad.attribute_definition_id, 155
FROM products p
JOIN product_types pt ON pt.type_code='COOLER'
JOIN product_attribute_definitions ad
 ON ad.product_type_id=pt.product_type_id AND ad.attribute_code='cooler_height_mm'
WHERE p.model_code='PA120-SE'
ON CONFLICT (product_id, attribute_definition_id) DO UPDATE SET
 value_integer=EXCLUDED.value_integer, value_text=NULL, value_decimal=NULL, value_boolean=NULL, value_json=NULL;

INSERT INTO product_attribute_values
 (product_id, attribute_definition_id, value_json)
SELECT p.product_id, ad.attribute_definition_id, '["LGA1700", "AM5", "AM4"]'::jsonb
FROM products p
JOIN product_types pt ON pt.type_code='COOLER'
JOIN product_attribute_definitions ad
 ON ad.product_type_id=pt.product_type_id AND ad.attribute_code='supported_sockets'
WHERE p.model_code='PA120-SE'
ON CONFLICT (product_id, attribute_definition_id) DO UPDATE SET
 value_json=EXCLUDED.value_json, value_text=NULL, value_decimal=NULL, value_integer=NULL, value_boolean=NULL;

INSERT INTO products
 (product_type_id, category_id, brand_id, model_code, product_name, short_description, description, product_status)
SELECT pt.product_type_id, c.category_id, b.brand_id, 'PS120-SE', 'Phantom Spirit 120 SE',
       'Phantom Spirit 120 SE - catalog tham khảo PC Builder Store.', 'Nguồn tham khảo: https://phongvu.vn/c/linh-kien-may-tinh',
       'ACTIVE'
FROM product_types pt
JOIN categories c ON c.category_code='COOLER'
LEFT JOIN brands b ON b.brand_name='Thermalright'
WHERE pt.type_code='COOLER'
ON CONFLICT (model_code) DO UPDATE SET
 product_type_id=EXCLUDED.product_type_id,
 category_id=EXCLUDED.category_id,
 brand_id=EXCLUDED.brand_id,
 product_name=EXCLUDED.product_name,
 short_description=EXCLUDED.short_description,
 description=EXCLUDED.description,
 product_status='ACTIVE';

INSERT INTO product_offers
 (product_id, offer_code, condition_code, price, currency_code, stock_quantity,
  reserved_quantity, warranty_months, offer_status)
SELECT p.product_id, 'DEMO-PS120-SE', 'NEW',
       1000000, 'VND',
       5, 0, 36, 'ACTIVE'
FROM products p WHERE p.model_code='PS120-SE'
ON CONFLICT (offer_code) DO UPDATE SET
 product_id=EXCLUDED.product_id,
 condition_code=EXCLUDED.condition_code,
 price=EXCLUDED.price,
 currency_code=EXCLUDED.currency_code,
 stock_quantity=EXCLUDED.stock_quantity,
 warranty_months=EXCLUDED.warranty_months,
 offer_status='ACTIVE';

INSERT INTO product_attribute_values
 (product_id, attribute_definition_id, value_integer)
SELECT p.product_id, ad.attribute_definition_id, 154
FROM products p
JOIN product_types pt ON pt.type_code='COOLER'
JOIN product_attribute_definitions ad
 ON ad.product_type_id=pt.product_type_id AND ad.attribute_code='cooler_height_mm'
WHERE p.model_code='PS120-SE'
ON CONFLICT (product_id, attribute_definition_id) DO UPDATE SET
 value_integer=EXCLUDED.value_integer, value_text=NULL, value_decimal=NULL, value_boolean=NULL, value_json=NULL;

INSERT INTO product_attribute_values
 (product_id, attribute_definition_id, value_json)
SELECT p.product_id, ad.attribute_definition_id, '["LGA1700", "AM5", "AM4"]'::jsonb
FROM products p
JOIN product_types pt ON pt.type_code='COOLER'
JOIN product_attribute_definitions ad
 ON ad.product_type_id=pt.product_type_id AND ad.attribute_code='supported_sockets'
WHERE p.model_code='PS120-SE'
ON CONFLICT (product_id, attribute_definition_id) DO UPDATE SET
 value_json=EXCLUDED.value_json, value_text=NULL, value_decimal=NULL, value_integer=NULL, value_boolean=NULL;

INSERT INTO products
 (product_type_id, category_id, brand_id, model_code, product_name, short_description, description, product_status)
SELECT pt.product_type_id, c.category_id, b.brand_id, 'FN240-BLACK', 'Frozen Notte 240',
       'Frozen Notte 240 - catalog tham khảo PC Builder Store.', 'Nguồn tham khảo: https://phongvu.vn/c/linh-kien-may-tinh',
       'ACTIVE'
FROM product_types pt
JOIN categories c ON c.category_code='COOLER'
LEFT JOIN brands b ON b.brand_name='Thermalright'
WHERE pt.type_code='COOLER'
ON CONFLICT (model_code) DO UPDATE SET
 product_type_id=EXCLUDED.product_type_id,
 category_id=EXCLUDED.category_id,
 brand_id=EXCLUDED.brand_id,
 product_name=EXCLUDED.product_name,
 short_description=EXCLUDED.short_description,
 description=EXCLUDED.description,
 product_status='ACTIVE';

INSERT INTO product_offers
 (product_id, offer_code, condition_code, price, currency_code, stock_quantity,
  reserved_quantity, warranty_months, offer_status)
SELECT p.product_id, 'DEMO-FN240-BLACK', 'NEW',
       1000000, 'VND',
       5, 0, 36, 'ACTIVE'
FROM products p WHERE p.model_code='FN240-BLACK'
ON CONFLICT (offer_code) DO UPDATE SET
 product_id=EXCLUDED.product_id,
 condition_code=EXCLUDED.condition_code,
 price=EXCLUDED.price,
 currency_code=EXCLUDED.currency_code,
 stock_quantity=EXCLUDED.stock_quantity,
 warranty_months=EXCLUDED.warranty_months,
 offer_status='ACTIVE';

INSERT INTO product_attribute_values
 (product_id, attribute_definition_id, value_json)
SELECT p.product_id, ad.attribute_definition_id, '["LGA1700", "AM5", "AM4"]'::jsonb
FROM products p
JOIN product_types pt ON pt.type_code='COOLER'
JOIN product_attribute_definitions ad
 ON ad.product_type_id=pt.product_type_id AND ad.attribute_code='supported_sockets'
WHERE p.model_code='FN240-BLACK'
ON CONFLICT (product_id, attribute_definition_id) DO UPDATE SET
 value_json=EXCLUDED.value_json, value_text=NULL, value_decimal=NULL, value_integer=NULL, value_boolean=NULL;

INSERT INTO products
 (product_type_id, category_id, brand_id, model_code, product_name, short_description, description, product_status)
SELECT pt.product_type_id, c.category_id, b.brand_id, 'NH-D15-CH-BK', 'NH-D15 chromax.black',
       'NH-D15 chromax.black - catalog tham khảo PC Builder Store.', 'Nguồn tham khảo: https://phongvu.vn/c/linh-kien-may-tinh',
       'ACTIVE'
FROM product_types pt
JOIN categories c ON c.category_code='COOLER'
LEFT JOIN brands b ON b.brand_name='Noctua'
WHERE pt.type_code='COOLER'
ON CONFLICT (model_code) DO UPDATE SET
 product_type_id=EXCLUDED.product_type_id,
 category_id=EXCLUDED.category_id,
 brand_id=EXCLUDED.brand_id,
 product_name=EXCLUDED.product_name,
 short_description=EXCLUDED.short_description,
 description=EXCLUDED.description,
 product_status='ACTIVE';

INSERT INTO product_offers
 (product_id, offer_code, condition_code, price, currency_code, stock_quantity,
  reserved_quantity, warranty_months, offer_status)
SELECT p.product_id, 'DEMO-NH-D15-CH-BK', 'NEW',
       1000000, 'VND',
       5, 0, 36, 'ACTIVE'
FROM products p WHERE p.model_code='NH-D15-CH-BK'
ON CONFLICT (offer_code) DO UPDATE SET
 product_id=EXCLUDED.product_id,
 condition_code=EXCLUDED.condition_code,
 price=EXCLUDED.price,
 currency_code=EXCLUDED.currency_code,
 stock_quantity=EXCLUDED.stock_quantity,
 warranty_months=EXCLUDED.warranty_months,
 offer_status='ACTIVE';

INSERT INTO product_attribute_values
 (product_id, attribute_definition_id, value_integer)
SELECT p.product_id, ad.attribute_definition_id, 165
FROM products p
JOIN product_types pt ON pt.type_code='COOLER'
JOIN product_attribute_definitions ad
 ON ad.product_type_id=pt.product_type_id AND ad.attribute_code='cooler_height_mm'
WHERE p.model_code='NH-D15-CH-BK'
ON CONFLICT (product_id, attribute_definition_id) DO UPDATE SET
 value_integer=EXCLUDED.value_integer, value_text=NULL, value_decimal=NULL, value_boolean=NULL, value_json=NULL;

INSERT INTO product_attribute_values
 (product_id, attribute_definition_id, value_json)
SELECT p.product_id, ad.attribute_definition_id, '["LGA1700", "AM5", "AM4"]'::jsonb
FROM products p
JOIN product_types pt ON pt.type_code='COOLER'
JOIN product_attribute_definitions ad
 ON ad.product_type_id=pt.product_type_id AND ad.attribute_code='supported_sockets'
WHERE p.model_code='NH-D15-CH-BK'
ON CONFLICT (product_id, attribute_definition_id) DO UPDATE SET
 value_json=EXCLUDED.value_json, value_text=NULL, value_decimal=NULL, value_integer=NULL, value_boolean=NULL;

INSERT INTO products
 (product_type_id, category_id, brand_id, model_code, product_name, short_description, description, product_status)
SELECT pt.product_type_id, c.category_id, b.brand_id, 'NH-U12S-REDUX', 'NH-U12S redux',
       'NH-U12S redux - catalog tham khảo PC Builder Store.', 'Nguồn tham khảo: https://phongvu.vn/c/linh-kien-may-tinh',
       'ACTIVE'
FROM product_types pt
JOIN categories c ON c.category_code='COOLER'
LEFT JOIN brands b ON b.brand_name='Noctua'
WHERE pt.type_code='COOLER'
ON CONFLICT (model_code) DO UPDATE SET
 product_type_id=EXCLUDED.product_type_id,
 category_id=EXCLUDED.category_id,
 brand_id=EXCLUDED.brand_id,
 product_name=EXCLUDED.product_name,
 short_description=EXCLUDED.short_description,
 description=EXCLUDED.description,
 product_status='ACTIVE';

INSERT INTO product_offers
 (product_id, offer_code, condition_code, price, currency_code, stock_quantity,
  reserved_quantity, warranty_months, offer_status)
SELECT p.product_id, 'DEMO-NH-U12S-REDUX', 'NEW',
       1000000, 'VND',
       5, 0, 36, 'ACTIVE'
FROM products p WHERE p.model_code='NH-U12S-REDUX'
ON CONFLICT (offer_code) DO UPDATE SET
 product_id=EXCLUDED.product_id,
 condition_code=EXCLUDED.condition_code,
 price=EXCLUDED.price,
 currency_code=EXCLUDED.currency_code,
 stock_quantity=EXCLUDED.stock_quantity,
 warranty_months=EXCLUDED.warranty_months,
 offer_status='ACTIVE';

INSERT INTO product_attribute_values
 (product_id, attribute_definition_id, value_integer)
SELECT p.product_id, ad.attribute_definition_id, 158
FROM products p
JOIN product_types pt ON pt.type_code='COOLER'
JOIN product_attribute_definitions ad
 ON ad.product_type_id=pt.product_type_id AND ad.attribute_code='cooler_height_mm'
WHERE p.model_code='NH-U12S-REDUX'
ON CONFLICT (product_id, attribute_definition_id) DO UPDATE SET
 value_integer=EXCLUDED.value_integer, value_text=NULL, value_decimal=NULL, value_boolean=NULL, value_json=NULL;

INSERT INTO product_attribute_values
 (product_id, attribute_definition_id, value_json)
SELECT p.product_id, ad.attribute_definition_id, '["LGA1700", "AM5", "AM4"]'::jsonb
FROM products p
JOIN product_types pt ON pt.type_code='COOLER'
JOIN product_attribute_definitions ad
 ON ad.product_type_id=pt.product_type_id AND ad.attribute_code='supported_sockets'
WHERE p.model_code='NH-U12S-REDUX'
ON CONFLICT (product_id, attribute_definition_id) DO UPDATE SET
 value_json=EXCLUDED.value_json, value_text=NULL, value_decimal=NULL, value_integer=NULL, value_boolean=NULL;

INSERT INTO products
 (product_type_id, category_id, brand_id, model_code, product_name, short_description, description, product_status)
SELECT pt.product_type_id, c.category_id, b.brand_id, 'RR-S4KK-20PA-R1', 'Hyper 212 Halo Black',
       'Hyper 212 Halo Black - catalog tham khảo PC Builder Store.', 'Nguồn tham khảo: https://phongvu.vn/c/linh-kien-may-tinh',
       'ACTIVE'
FROM product_types pt
JOIN categories c ON c.category_code='COOLER'
LEFT JOIN brands b ON b.brand_name='Cooler Master'
WHERE pt.type_code='COOLER'
ON CONFLICT (model_code) DO UPDATE SET
 product_type_id=EXCLUDED.product_type_id,
 category_id=EXCLUDED.category_id,
 brand_id=EXCLUDED.brand_id,
 product_name=EXCLUDED.product_name,
 short_description=EXCLUDED.short_description,
 description=EXCLUDED.description,
 product_status='ACTIVE';

INSERT INTO product_offers
 (product_id, offer_code, condition_code, price, currency_code, stock_quantity,
  reserved_quantity, warranty_months, offer_status)
SELECT p.product_id, 'DEMO-RR-S4KK-20PA-R1', 'NEW',
       1000000, 'VND',
       5, 0, 36, 'ACTIVE'
FROM products p WHERE p.model_code='RR-S4KK-20PA-R1'
ON CONFLICT (offer_code) DO UPDATE SET
 product_id=EXCLUDED.product_id,
 condition_code=EXCLUDED.condition_code,
 price=EXCLUDED.price,
 currency_code=EXCLUDED.currency_code,
 stock_quantity=EXCLUDED.stock_quantity,
 warranty_months=EXCLUDED.warranty_months,
 offer_status='ACTIVE';

INSERT INTO product_attribute_values
 (product_id, attribute_definition_id, value_integer)
SELECT p.product_id, ad.attribute_definition_id, 154
FROM products p
JOIN product_types pt ON pt.type_code='COOLER'
JOIN product_attribute_definitions ad
 ON ad.product_type_id=pt.product_type_id AND ad.attribute_code='cooler_height_mm'
WHERE p.model_code='RR-S4KK-20PA-R1'
ON CONFLICT (product_id, attribute_definition_id) DO UPDATE SET
 value_integer=EXCLUDED.value_integer, value_text=NULL, value_decimal=NULL, value_boolean=NULL, value_json=NULL;

INSERT INTO product_attribute_values
 (product_id, attribute_definition_id, value_json)
SELECT p.product_id, ad.attribute_definition_id, '["LGA1700", "AM5", "AM4"]'::jsonb
FROM products p
JOIN product_types pt ON pt.type_code='COOLER'
JOIN product_attribute_definitions ad
 ON ad.product_type_id=pt.product_type_id AND ad.attribute_code='supported_sockets'
WHERE p.model_code='RR-S4KK-20PA-R1'
ON CONFLICT (product_id, attribute_definition_id) DO UPDATE SET
 value_json=EXCLUDED.value_json, value_text=NULL, value_decimal=NULL, value_integer=NULL, value_boolean=NULL;

INSERT INTO products
 (product_type_id, category_id, brand_id, model_code, product_name, short_description, description, product_status)
SELECT pt.product_type_id, c.category_id, b.brand_id, 'MLW-D24M-A18PK-R1', 'MasterLiquid 240L Core',
       'MasterLiquid 240L Core - catalog tham khảo PC Builder Store.', 'Nguồn tham khảo: https://phongvu.vn/c/linh-kien-may-tinh',
       'ACTIVE'
FROM product_types pt
JOIN categories c ON c.category_code='COOLER'
LEFT JOIN brands b ON b.brand_name='Cooler Master'
WHERE pt.type_code='COOLER'
ON CONFLICT (model_code) DO UPDATE SET
 product_type_id=EXCLUDED.product_type_id,
 category_id=EXCLUDED.category_id,
 brand_id=EXCLUDED.brand_id,
 product_name=EXCLUDED.product_name,
 short_description=EXCLUDED.short_description,
 description=EXCLUDED.description,
 product_status='ACTIVE';

INSERT INTO product_offers
 (product_id, offer_code, condition_code, price, currency_code, stock_quantity,
  reserved_quantity, warranty_months, offer_status)
SELECT p.product_id, 'DEMO-MLW-D24M-A18PK-R1', 'NEW',
       1000000, 'VND',
       5, 0, 36, 'ACTIVE'
FROM products p WHERE p.model_code='MLW-D24M-A18PK-R1'
ON CONFLICT (offer_code) DO UPDATE SET
 product_id=EXCLUDED.product_id,
 condition_code=EXCLUDED.condition_code,
 price=EXCLUDED.price,
 currency_code=EXCLUDED.currency_code,
 stock_quantity=EXCLUDED.stock_quantity,
 warranty_months=EXCLUDED.warranty_months,
 offer_status='ACTIVE';

INSERT INTO product_attribute_values
 (product_id, attribute_definition_id, value_json)
SELECT p.product_id, ad.attribute_definition_id, '["LGA1700", "AM5", "AM4"]'::jsonb
FROM products p
JOIN product_types pt ON pt.type_code='COOLER'
JOIN product_attribute_definitions ad
 ON ad.product_type_id=pt.product_type_id AND ad.attribute_code='supported_sockets'
WHERE p.model_code='MLW-D24M-A18PK-R1'
ON CONFLICT (product_id, attribute_definition_id) DO UPDATE SET
 value_json=EXCLUDED.value_json, value_text=NULL, value_decimal=NULL, value_integer=NULL, value_boolean=NULL;

INSERT INTO products
 (product_type_id, category_id, brand_id, model_code, product_name, short_description, description, product_status)
SELECT pt.product_type_id, c.category_id, b.brand_id, 'ACFRE00134A', 'Liquid Freezer III 240',
       'Liquid Freezer III 240 - catalog tham khảo PC Builder Store.', 'Nguồn tham khảo: https://phongvu.vn/c/linh-kien-may-tinh',
       'ACTIVE'
FROM product_types pt
JOIN categories c ON c.category_code='COOLER'
LEFT JOIN brands b ON b.brand_name='Arctic'
WHERE pt.type_code='COOLER'
ON CONFLICT (model_code) DO UPDATE SET
 product_type_id=EXCLUDED.product_type_id,
 category_id=EXCLUDED.category_id,
 brand_id=EXCLUDED.brand_id,
 product_name=EXCLUDED.product_name,
 short_description=EXCLUDED.short_description,
 description=EXCLUDED.description,
 product_status='ACTIVE';

INSERT INTO product_offers
 (product_id, offer_code, condition_code, price, currency_code, stock_quantity,
  reserved_quantity, warranty_months, offer_status)
SELECT p.product_id, 'DEMO-ACFRE00134A', 'NEW',
       1000000, 'VND',
       5, 0, 36, 'ACTIVE'
FROM products p WHERE p.model_code='ACFRE00134A'
ON CONFLICT (offer_code) DO UPDATE SET
 product_id=EXCLUDED.product_id,
 condition_code=EXCLUDED.condition_code,
 price=EXCLUDED.price,
 currency_code=EXCLUDED.currency_code,
 stock_quantity=EXCLUDED.stock_quantity,
 warranty_months=EXCLUDED.warranty_months,
 offer_status='ACTIVE';

INSERT INTO product_attribute_values
 (product_id, attribute_definition_id, value_json)
SELECT p.product_id, ad.attribute_definition_id, '["LGA1700", "AM5", "AM4"]'::jsonb
FROM products p
JOIN product_types pt ON pt.type_code='COOLER'
JOIN product_attribute_definitions ad
 ON ad.product_type_id=pt.product_type_id AND ad.attribute_code='supported_sockets'
WHERE p.model_code='ACFRE00134A'
ON CONFLICT (product_id, attribute_definition_id) DO UPDATE SET
 value_json=EXCLUDED.value_json, value_text=NULL, value_decimal=NULL, value_integer=NULL, value_boolean=NULL;

INSERT INTO products
 (product_type_id, category_id, brand_id, model_code, product_name, short_description, description, product_status)
SELECT pt.product_type_id, c.category_id, b.brand_id, 'ACFRE00136A', 'Liquid Freezer III 360',
       'Liquid Freezer III 360 - catalog tham khảo PC Builder Store.', 'Nguồn tham khảo: https://phongvu.vn/c/linh-kien-may-tinh',
       'ACTIVE'
FROM product_types pt
JOIN categories c ON c.category_code='COOLER'
LEFT JOIN brands b ON b.brand_name='Arctic'
WHERE pt.type_code='COOLER'
ON CONFLICT (model_code) DO UPDATE SET
 product_type_id=EXCLUDED.product_type_id,
 category_id=EXCLUDED.category_id,
 brand_id=EXCLUDED.brand_id,
 product_name=EXCLUDED.product_name,
 short_description=EXCLUDED.short_description,
 description=EXCLUDED.description,
 product_status='ACTIVE';

INSERT INTO product_offers
 (product_id, offer_code, condition_code, price, currency_code, stock_quantity,
  reserved_quantity, warranty_months, offer_status)
SELECT p.product_id, 'DEMO-ACFRE00136A', 'NEW',
       1000000, 'VND',
       5, 0, 36, 'ACTIVE'
FROM products p WHERE p.model_code='ACFRE00136A'
ON CONFLICT (offer_code) DO UPDATE SET
 product_id=EXCLUDED.product_id,
 condition_code=EXCLUDED.condition_code,
 price=EXCLUDED.price,
 currency_code=EXCLUDED.currency_code,
 stock_quantity=EXCLUDED.stock_quantity,
 warranty_months=EXCLUDED.warranty_months,
 offer_status='ACTIVE';

INSERT INTO product_attribute_values
 (product_id, attribute_definition_id, value_json)
SELECT p.product_id, ad.attribute_definition_id, '["LGA1700", "AM5", "AM4"]'::jsonb
FROM products p
JOIN product_types pt ON pt.type_code='COOLER'
JOIN product_attribute_definitions ad
 ON ad.product_type_id=pt.product_type_id AND ad.attribute_code='supported_sockets'
WHERE p.model_code='ACFRE00136A'
ON CONFLICT (product_id, attribute_definition_id) DO UPDATE SET
 value_json=EXCLUDED.value_json, value_text=NULL, value_decimal=NULL, value_integer=NULL, value_boolean=NULL;

INSERT INTO products
 (product_type_id, category_id, brand_id, model_code, product_name, short_description, description, product_status)
SELECT pt.product_type_id, c.category_id, b.brand_id, 'CW-9060058-WW', 'iCUE H100i RGB ELITE',
       'iCUE H100i RGB ELITE - catalog tham khảo PC Builder Store.', 'Nguồn tham khảo: https://www.corsair.com/',
       'ACTIVE'
FROM product_types pt
JOIN categories c ON c.category_code='COOLER'
LEFT JOIN brands b ON b.brand_name='Corsair'
WHERE pt.type_code='COOLER'
ON CONFLICT (model_code) DO UPDATE SET
 product_type_id=EXCLUDED.product_type_id,
 category_id=EXCLUDED.category_id,
 brand_id=EXCLUDED.brand_id,
 product_name=EXCLUDED.product_name,
 short_description=EXCLUDED.short_description,
 description=EXCLUDED.description,
 product_status='ACTIVE';

INSERT INTO product_offers
 (product_id, offer_code, condition_code, price, currency_code, stock_quantity,
  reserved_quantity, warranty_months, offer_status)
SELECT p.product_id, 'DEMO-CW-9060058-WW', 'NEW',
       1000000, 'VND',
       5, 0, 36, 'ACTIVE'
FROM products p WHERE p.model_code='CW-9060058-WW'
ON CONFLICT (offer_code) DO UPDATE SET
 product_id=EXCLUDED.product_id,
 condition_code=EXCLUDED.condition_code,
 price=EXCLUDED.price,
 currency_code=EXCLUDED.currency_code,
 stock_quantity=EXCLUDED.stock_quantity,
 warranty_months=EXCLUDED.warranty_months,
 offer_status='ACTIVE';

INSERT INTO product_attribute_values
 (product_id, attribute_definition_id, value_json)
SELECT p.product_id, ad.attribute_definition_id, '["LGA1700", "AM5", "AM4"]'::jsonb
FROM products p
JOIN product_types pt ON pt.type_code='COOLER'
JOIN product_attribute_definitions ad
 ON ad.product_type_id=pt.product_type_id AND ad.attribute_code='supported_sockets'
WHERE p.model_code='CW-9060058-WW'
ON CONFLICT (product_id, attribute_definition_id) DO UPDATE SET
 value_json=EXCLUDED.value_json, value_text=NULL, value_decimal=NULL, value_integer=NULL, value_boolean=NULL;

INSERT INTO products
 (product_type_id, category_id, brand_id, model_code, product_name, short_description, description, product_status)
SELECT pt.product_type_id, c.category_id, b.brand_id, 'SE-224-XTS-BLACK', 'SE-224-XTS',
       'SE-224-XTS - catalog tham khảo PC Builder Store.', 'Nguồn tham khảo: https://phongvu.vn/c/linh-kien-may-tinh',
       'ACTIVE'
FROM product_types pt
JOIN categories c ON c.category_code='COOLER'
LEFT JOIN brands b ON b.brand_name='ID-Cooling'
WHERE pt.type_code='COOLER'
ON CONFLICT (model_code) DO UPDATE SET
 product_type_id=EXCLUDED.product_type_id,
 category_id=EXCLUDED.category_id,
 brand_id=EXCLUDED.brand_id,
 product_name=EXCLUDED.product_name,
 short_description=EXCLUDED.short_description,
 description=EXCLUDED.description,
 product_status='ACTIVE';

INSERT INTO product_offers
 (product_id, offer_code, condition_code, price, currency_code, stock_quantity,
  reserved_quantity, warranty_months, offer_status)
SELECT p.product_id, 'DEMO-SE-224-XTS-BLACK', 'NEW',
       1000000, 'VND',
       5, 0, 36, 'ACTIVE'
FROM products p WHERE p.model_code='SE-224-XTS-BLACK'
ON CONFLICT (offer_code) DO UPDATE SET
 product_id=EXCLUDED.product_id,
 condition_code=EXCLUDED.condition_code,
 price=EXCLUDED.price,
 currency_code=EXCLUDED.currency_code,
 stock_quantity=EXCLUDED.stock_quantity,
 warranty_months=EXCLUDED.warranty_months,
 offer_status='ACTIVE';

INSERT INTO product_attribute_values
 (product_id, attribute_definition_id, value_integer)
SELECT p.product_id, ad.attribute_definition_id, 151
FROM products p
JOIN product_types pt ON pt.type_code='COOLER'
JOIN product_attribute_definitions ad
 ON ad.product_type_id=pt.product_type_id AND ad.attribute_code='cooler_height_mm'
WHERE p.model_code='SE-224-XTS-BLACK'
ON CONFLICT (product_id, attribute_definition_id) DO UPDATE SET
 value_integer=EXCLUDED.value_integer, value_text=NULL, value_decimal=NULL, value_boolean=NULL, value_json=NULL;

INSERT INTO product_attribute_values
 (product_id, attribute_definition_id, value_json)
SELECT p.product_id, ad.attribute_definition_id, '["LGA1700", "AM5", "AM4"]'::jsonb
FROM products p
JOIN product_types pt ON pt.type_code='COOLER'
JOIN product_attribute_definitions ad
 ON ad.product_type_id=pt.product_type_id AND ad.attribute_code='supported_sockets'
WHERE p.model_code='SE-224-XTS-BLACK'
ON CONFLICT (product_id, attribute_definition_id) DO UPDATE SET
 value_json=EXCLUDED.value_json, value_text=NULL, value_decimal=NULL, value_integer=NULL, value_boolean=NULL;

INSERT INTO products
 (product_type_id, category_id, brand_id, model_code, product_name, short_description, description, product_status)
SELECT pt.product_type_id, c.category_id, b.brand_id, 'FROZN-A620-PRO-SE', 'FROZN A620 PRO SE',
       'FROZN A620 PRO SE - catalog tham khảo PC Builder Store.', 'Nguồn tham khảo: https://phongvu.vn/c/linh-kien-may-tinh',
       'ACTIVE'
FROM product_types pt
JOIN categories c ON c.category_code='COOLER'
LEFT JOIN brands b ON b.brand_name='ID-Cooling'
WHERE pt.type_code='COOLER'
ON CONFLICT (model_code) DO UPDATE SET
 product_type_id=EXCLUDED.product_type_id,
 category_id=EXCLUDED.category_id,
 brand_id=EXCLUDED.brand_id,
 product_name=EXCLUDED.product_name,
 short_description=EXCLUDED.short_description,
 description=EXCLUDED.description,
 product_status='ACTIVE';

INSERT INTO product_offers
 (product_id, offer_code, condition_code, price, currency_code, stock_quantity,
  reserved_quantity, warranty_months, offer_status)
SELECT p.product_id, 'DEMO-FROZN-A620-PRO-SE', 'NEW',
       1000000, 'VND',
       5, 0, 36, 'ACTIVE'
FROM products p WHERE p.model_code='FROZN-A620-PRO-SE'
ON CONFLICT (offer_code) DO UPDATE SET
 product_id=EXCLUDED.product_id,
 condition_code=EXCLUDED.condition_code,
 price=EXCLUDED.price,
 currency_code=EXCLUDED.currency_code,
 stock_quantity=EXCLUDED.stock_quantity,
 warranty_months=EXCLUDED.warranty_months,
 offer_status='ACTIVE';

INSERT INTO product_attribute_values
 (product_id, attribute_definition_id, value_integer)
SELECT p.product_id, ad.attribute_definition_id, 157
FROM products p
JOIN product_types pt ON pt.type_code='COOLER'
JOIN product_attribute_definitions ad
 ON ad.product_type_id=pt.product_type_id AND ad.attribute_code='cooler_height_mm'
WHERE p.model_code='FROZN-A620-PRO-SE'
ON CONFLICT (product_id, attribute_definition_id) DO UPDATE SET
 value_integer=EXCLUDED.value_integer, value_text=NULL, value_decimal=NULL, value_boolean=NULL, value_json=NULL;

INSERT INTO product_attribute_values
 (product_id, attribute_definition_id, value_json)
SELECT p.product_id, ad.attribute_definition_id, '["LGA1700", "AM5", "AM4"]'::jsonb
FROM products p
JOIN product_types pt ON pt.type_code='COOLER'
JOIN product_attribute_definitions ad
 ON ad.product_type_id=pt.product_type_id AND ad.attribute_code='supported_sockets'
WHERE p.model_code='FROZN-A620-PRO-SE'
ON CONFLICT (product_id, attribute_definition_id) DO UPDATE SET
 value_json=EXCLUDED.value_json, value_text=NULL, value_decimal=NULL, value_integer=NULL, value_boolean=NULL;

INSERT INTO products
 (product_type_id, category_id, brand_id, model_code, product_name, short_description, description, product_status)
SELECT pt.product_type_id, c.category_id, b.brand_id, 'PBC-PC-OFFICE-001', 'Starter Office PC',
       'Starter Office PC - catalog tham khảo PC Builder Store.', 'Nguồn tham khảo: https://phongvu.vn/c/linh-kien-may-tinh',
       'ACTIVE'
FROM product_types pt
JOIN categories c ON c.category_code='PREBUILT_PC'
LEFT JOIN brands b ON b.brand_name='PC Builder'
WHERE pt.type_code='PC'
ON CONFLICT (model_code) DO UPDATE SET
 product_type_id=EXCLUDED.product_type_id,
 category_id=EXCLUDED.category_id,
 brand_id=EXCLUDED.brand_id,
 product_name=EXCLUDED.product_name,
 short_description=EXCLUDED.short_description,
 description=EXCLUDED.description,
 product_status='ACTIVE';

INSERT INTO product_offers
 (product_id, offer_code, condition_code, price, currency_code, stock_quantity,
  reserved_quantity, warranty_months, offer_status)
SELECT p.product_id, 'DEMO-PBC-PC-OFFICE-001', 'NEW',
       25000000, 'VND',
       5, 0, 24, 'ACTIVE'
FROM products p WHERE p.model_code='PBC-PC-OFFICE-001'
ON CONFLICT (offer_code) DO UPDATE SET
 product_id=EXCLUDED.product_id,
 condition_code=EXCLUDED.condition_code,
 price=EXCLUDED.price,
 currency_code=EXCLUDED.currency_code,
 stock_quantity=EXCLUDED.stock_quantity,
 warranty_months=EXCLUDED.warranty_months,
 offer_status='ACTIVE';

INSERT INTO product_attribute_values
 (product_id, attribute_definition_id, value_json)
SELECT p.product_id, ad.attribute_definition_id, '["Ryzen 5 5600G", "A520M", "16GB DDR4", "500GB NVMe"]'::jsonb
FROM products p
JOIN product_types pt ON pt.type_code='PC'
JOIN product_attribute_definitions ad
 ON ad.product_type_id=pt.product_type_id AND ad.attribute_code='configuration_summary'
WHERE p.model_code='PBC-PC-OFFICE-001'
ON CONFLICT (product_id, attribute_definition_id) DO UPDATE SET
 value_json=EXCLUDED.value_json, value_text=NULL, value_decimal=NULL, value_integer=NULL, value_boolean=NULL;

INSERT INTO product_attribute_values
 (product_id, attribute_definition_id, value_text)
SELECT p.product_id, ad.attribute_definition_id, 'PENDING'
FROM products p
JOIN product_types pt ON pt.type_code='PC'
JOIN product_attribute_definitions ad
 ON ad.product_type_id=pt.product_type_id AND ad.attribute_code='bom_status'
WHERE p.model_code='PBC-PC-OFFICE-001'
ON CONFLICT (product_id, attribute_definition_id) DO UPDATE SET
 value_text=EXCLUDED.value_text, value_decimal=NULL, value_integer=NULL, value_boolean=NULL, value_json=NULL;

INSERT INTO products
 (product_type_id, category_id, brand_id, model_code, product_name, short_description, description, product_status)
SELECT pt.product_type_id, c.category_id, b.brand_id, 'PBC-PC-GAME-002', 'Entry Gaming PC RTX 3050',
       'Entry Gaming PC RTX 3050 - catalog tham khảo PC Builder Store.', 'Nguồn tham khảo: https://phongvu.vn/c/linh-kien-may-tinh',
       'ACTIVE'
FROM product_types pt
JOIN categories c ON c.category_code='PREBUILT_PC'
LEFT JOIN brands b ON b.brand_name='PC Builder'
WHERE pt.type_code='PC'
ON CONFLICT (model_code) DO UPDATE SET
 product_type_id=EXCLUDED.product_type_id,
 category_id=EXCLUDED.category_id,
 brand_id=EXCLUDED.brand_id,
 product_name=EXCLUDED.product_name,
 short_description=EXCLUDED.short_description,
 description=EXCLUDED.description,
 product_status='ACTIVE';

INSERT INTO product_offers
 (product_id, offer_code, condition_code, price, currency_code, stock_quantity,
  reserved_quantity, warranty_months, offer_status)
SELECT p.product_id, 'DEMO-PBC-PC-GAME-002', 'NEW',
       25000000, 'VND',
       5, 0, 24, 'ACTIVE'
FROM products p WHERE p.model_code='PBC-PC-GAME-002'
ON CONFLICT (offer_code) DO UPDATE SET
 product_id=EXCLUDED.product_id,
 condition_code=EXCLUDED.condition_code,
 price=EXCLUDED.price,
 currency_code=EXCLUDED.currency_code,
 stock_quantity=EXCLUDED.stock_quantity,
 warranty_months=EXCLUDED.warranty_months,
 offer_status='ACTIVE';

INSERT INTO product_attribute_values
 (product_id, attribute_definition_id, value_json)
SELECT p.product_id, ad.attribute_definition_id, '["Core i3-12100F", "H610M", "RTX 3050", "16GB DDR4"]'::jsonb
FROM products p
JOIN product_types pt ON pt.type_code='PC'
JOIN product_attribute_definitions ad
 ON ad.product_type_id=pt.product_type_id AND ad.attribute_code='configuration_summary'
WHERE p.model_code='PBC-PC-GAME-002'
ON CONFLICT (product_id, attribute_definition_id) DO UPDATE SET
 value_json=EXCLUDED.value_json, value_text=NULL, value_decimal=NULL, value_integer=NULL, value_boolean=NULL;

INSERT INTO product_attribute_values
 (product_id, attribute_definition_id, value_text)
SELECT p.product_id, ad.attribute_definition_id, 'PENDING'
FROM products p
JOIN product_types pt ON pt.type_code='PC'
JOIN product_attribute_definitions ad
 ON ad.product_type_id=pt.product_type_id AND ad.attribute_code='bom_status'
WHERE p.model_code='PBC-PC-GAME-002'
ON CONFLICT (product_id, attribute_definition_id) DO UPDATE SET
 value_text=EXCLUDED.value_text, value_decimal=NULL, value_integer=NULL, value_boolean=NULL, value_json=NULL;

INSERT INTO products
 (product_type_id, category_id, brand_id, model_code, product_name, short_description, description, product_status)
SELECT pt.product_type_id, c.category_id, b.brand_id, 'PBC-PC-GAME-003', 'Budget Gaming PC RX 6600',
       'Budget Gaming PC RX 6600 - catalog tham khảo PC Builder Store.', 'Nguồn tham khảo: https://phongvu.vn/c/linh-kien-may-tinh',
       'ACTIVE'
FROM product_types pt
JOIN categories c ON c.category_code='PREBUILT_PC'
LEFT JOIN brands b ON b.brand_name='PC Builder'
WHERE pt.type_code='PC'
ON CONFLICT (model_code) DO UPDATE SET
 product_type_id=EXCLUDED.product_type_id,
 category_id=EXCLUDED.category_id,
 brand_id=EXCLUDED.brand_id,
 product_name=EXCLUDED.product_name,
 short_description=EXCLUDED.short_description,
 description=EXCLUDED.description,
 product_status='ACTIVE';

INSERT INTO product_offers
 (product_id, offer_code, condition_code, price, currency_code, stock_quantity,
  reserved_quantity, warranty_months, offer_status)
SELECT p.product_id, 'DEMO-PBC-PC-GAME-003', 'NEW',
       25000000, 'VND',
       5, 0, 24, 'ACTIVE'
FROM products p WHERE p.model_code='PBC-PC-GAME-003'
ON CONFLICT (offer_code) DO UPDATE SET
 product_id=EXCLUDED.product_id,
 condition_code=EXCLUDED.condition_code,
 price=EXCLUDED.price,
 currency_code=EXCLUDED.currency_code,
 stock_quantity=EXCLUDED.stock_quantity,
 warranty_months=EXCLUDED.warranty_months,
 offer_status='ACTIVE';

INSERT INTO product_attribute_values
 (product_id, attribute_definition_id, value_json)
SELECT p.product_id, ad.attribute_definition_id, '["Ryzen 5 5600", "B550M", "RX 6600", "16GB DDR4"]'::jsonb
FROM products p
JOIN product_types pt ON pt.type_code='PC'
JOIN product_attribute_definitions ad
 ON ad.product_type_id=pt.product_type_id AND ad.attribute_code='configuration_summary'
WHERE p.model_code='PBC-PC-GAME-003'
ON CONFLICT (product_id, attribute_definition_id) DO UPDATE SET
 value_json=EXCLUDED.value_json, value_text=NULL, value_decimal=NULL, value_integer=NULL, value_boolean=NULL;

INSERT INTO product_attribute_values
 (product_id, attribute_definition_id, value_text)
SELECT p.product_id, ad.attribute_definition_id, 'PENDING'
FROM products p
JOIN product_types pt ON pt.type_code='PC'
JOIN product_attribute_definitions ad
 ON ad.product_type_id=pt.product_type_id AND ad.attribute_code='bom_status'
WHERE p.model_code='PBC-PC-GAME-003'
ON CONFLICT (product_id, attribute_definition_id) DO UPDATE SET
 value_text=EXCLUDED.value_text, value_decimal=NULL, value_integer=NULL, value_boolean=NULL, value_json=NULL;

INSERT INTO products
 (product_type_id, category_id, brand_id, model_code, product_name, short_description, description, product_status)
SELECT pt.product_type_id, c.category_id, b.brand_id, 'PBC-PC-GAME-004', 'Gaming PC RTX 4060',
       'Gaming PC RTX 4060 - catalog tham khảo PC Builder Store.', 'Nguồn tham khảo: https://phongvu.vn/c/linh-kien-may-tinh',
       'ACTIVE'
FROM product_types pt
JOIN categories c ON c.category_code='PREBUILT_PC'
LEFT JOIN brands b ON b.brand_name='PC Builder'
WHERE pt.type_code='PC'
ON CONFLICT (model_code) DO UPDATE SET
 product_type_id=EXCLUDED.product_type_id,
 category_id=EXCLUDED.category_id,
 brand_id=EXCLUDED.brand_id,
 product_name=EXCLUDED.product_name,
 short_description=EXCLUDED.short_description,
 description=EXCLUDED.description,
 product_status='ACTIVE';

INSERT INTO product_offers
 (product_id, offer_code, condition_code, price, currency_code, stock_quantity,
  reserved_quantity, warranty_months, offer_status)
SELECT p.product_id, 'DEMO-PBC-PC-GAME-004', 'NEW',
       25000000, 'VND',
       5, 0, 24, 'ACTIVE'
FROM products p WHERE p.model_code='PBC-PC-GAME-004'
ON CONFLICT (offer_code) DO UPDATE SET
 product_id=EXCLUDED.product_id,
 condition_code=EXCLUDED.condition_code,
 price=EXCLUDED.price,
 currency_code=EXCLUDED.currency_code,
 stock_quantity=EXCLUDED.stock_quantity,
 warranty_months=EXCLUDED.warranty_months,
 offer_status='ACTIVE';

INSERT INTO product_attribute_values
 (product_id, attribute_definition_id, value_json)
SELECT p.product_id, ad.attribute_definition_id, '["Core i5-12400F", "B760M", "RTX 4060", "32GB DDR4"]'::jsonb
FROM products p
JOIN product_types pt ON pt.type_code='PC'
JOIN product_attribute_definitions ad
 ON ad.product_type_id=pt.product_type_id AND ad.attribute_code='configuration_summary'
WHERE p.model_code='PBC-PC-GAME-004'
ON CONFLICT (product_id, attribute_definition_id) DO UPDATE SET
 value_json=EXCLUDED.value_json, value_text=NULL, value_decimal=NULL, value_integer=NULL, value_boolean=NULL;

INSERT INTO product_attribute_values
 (product_id, attribute_definition_id, value_text)
SELECT p.product_id, ad.attribute_definition_id, 'PENDING'
FROM products p
JOIN product_types pt ON pt.type_code='PC'
JOIN product_attribute_definitions ad
 ON ad.product_type_id=pt.product_type_id AND ad.attribute_code='bom_status'
WHERE p.model_code='PBC-PC-GAME-004'
ON CONFLICT (product_id, attribute_definition_id) DO UPDATE SET
 value_text=EXCLUDED.value_text, value_decimal=NULL, value_integer=NULL, value_boolean=NULL, value_json=NULL;

INSERT INTO products
 (product_type_id, category_id, brand_id, model_code, product_name, short_description, description, product_status)
SELECT pt.product_type_id, c.category_id, b.brand_id, 'PBC-PC-GAME-005', 'Gaming PC RTX 4060 Ti',
       'Gaming PC RTX 4060 Ti - catalog tham khảo PC Builder Store.', 'Nguồn tham khảo: https://phongvu.vn/c/linh-kien-may-tinh',
       'ACTIVE'
FROM product_types pt
JOIN categories c ON c.category_code='PREBUILT_PC'
LEFT JOIN brands b ON b.brand_name='PC Builder'
WHERE pt.type_code='PC'
ON CONFLICT (model_code) DO UPDATE SET
 product_type_id=EXCLUDED.product_type_id,
 category_id=EXCLUDED.category_id,
 brand_id=EXCLUDED.brand_id,
 product_name=EXCLUDED.product_name,
 short_description=EXCLUDED.short_description,
 description=EXCLUDED.description,
 product_status='ACTIVE';

INSERT INTO product_offers
 (product_id, offer_code, condition_code, price, currency_code, stock_quantity,
  reserved_quantity, warranty_months, offer_status)
SELECT p.product_id, 'DEMO-PBC-PC-GAME-005', 'NEW',
       25000000, 'VND',
       5, 0, 24, 'ACTIVE'
FROM products p WHERE p.model_code='PBC-PC-GAME-005'
ON CONFLICT (offer_code) DO UPDATE SET
 product_id=EXCLUDED.product_id,
 condition_code=EXCLUDED.condition_code,
 price=EXCLUDED.price,
 currency_code=EXCLUDED.currency_code,
 stock_quantity=EXCLUDED.stock_quantity,
 warranty_months=EXCLUDED.warranty_months,
 offer_status='ACTIVE';

INSERT INTO product_attribute_values
 (product_id, attribute_definition_id, value_json)
SELECT p.product_id, ad.attribute_definition_id, '["Core i5-14400F", "B760 DDR5", "RTX 4060 Ti", "32GB DDR5"]'::jsonb
FROM products p
JOIN product_types pt ON pt.type_code='PC'
JOIN product_attribute_definitions ad
 ON ad.product_type_id=pt.product_type_id AND ad.attribute_code='configuration_summary'
WHERE p.model_code='PBC-PC-GAME-005'
ON CONFLICT (product_id, attribute_definition_id) DO UPDATE SET
 value_json=EXCLUDED.value_json, value_text=NULL, value_decimal=NULL, value_integer=NULL, value_boolean=NULL;

INSERT INTO product_attribute_values
 (product_id, attribute_definition_id, value_text)
SELECT p.product_id, ad.attribute_definition_id, 'PENDING'
FROM products p
JOIN product_types pt ON pt.type_code='PC'
JOIN product_attribute_definitions ad
 ON ad.product_type_id=pt.product_type_id AND ad.attribute_code='bom_status'
WHERE p.model_code='PBC-PC-GAME-005'
ON CONFLICT (product_id, attribute_definition_id) DO UPDATE SET
 value_text=EXCLUDED.value_text, value_decimal=NULL, value_integer=NULL, value_boolean=NULL, value_json=NULL;

INSERT INTO products
 (product_type_id, category_id, brand_id, model_code, product_name, short_description, description, product_status)
SELECT pt.product_type_id, c.category_id, b.brand_id, 'PBC-PC-GAME-006', 'Gaming PC RX 7700 XT',
       'Gaming PC RX 7700 XT - catalog tham khảo PC Builder Store.', 'Nguồn tham khảo: https://phongvu.vn/c/linh-kien-may-tinh',
       'ACTIVE'
FROM product_types pt
JOIN categories c ON c.category_code='PREBUILT_PC'
LEFT JOIN brands b ON b.brand_name='PC Builder'
WHERE pt.type_code='PC'
ON CONFLICT (model_code) DO UPDATE SET
 product_type_id=EXCLUDED.product_type_id,
 category_id=EXCLUDED.category_id,
 brand_id=EXCLUDED.brand_id,
 product_name=EXCLUDED.product_name,
 short_description=EXCLUDED.short_description,
 description=EXCLUDED.description,
 product_status='ACTIVE';

INSERT INTO product_offers
 (product_id, offer_code, condition_code, price, currency_code, stock_quantity,
  reserved_quantity, warranty_months, offer_status)
SELECT p.product_id, 'DEMO-PBC-PC-GAME-006', 'NEW',
       25000000, 'VND',
       5, 0, 24, 'ACTIVE'
FROM products p WHERE p.model_code='PBC-PC-GAME-006'
ON CONFLICT (offer_code) DO UPDATE SET
 product_id=EXCLUDED.product_id,
 condition_code=EXCLUDED.condition_code,
 price=EXCLUDED.price,
 currency_code=EXCLUDED.currency_code,
 stock_quantity=EXCLUDED.stock_quantity,
 warranty_months=EXCLUDED.warranty_months,
 offer_status='ACTIVE';

INSERT INTO product_attribute_values
 (product_id, attribute_definition_id, value_json)
SELECT p.product_id, ad.attribute_definition_id, '["Ryzen 5 7600", "B650M", "RX 7700 XT", "32GB DDR5"]'::jsonb
FROM products p
JOIN product_types pt ON pt.type_code='PC'
JOIN product_attribute_definitions ad
 ON ad.product_type_id=pt.product_type_id AND ad.attribute_code='configuration_summary'
WHERE p.model_code='PBC-PC-GAME-006'
ON CONFLICT (product_id, attribute_definition_id) DO UPDATE SET
 value_json=EXCLUDED.value_json, value_text=NULL, value_decimal=NULL, value_integer=NULL, value_boolean=NULL;

INSERT INTO product_attribute_values
 (product_id, attribute_definition_id, value_text)
SELECT p.product_id, ad.attribute_definition_id, 'PENDING'
FROM products p
JOIN product_types pt ON pt.type_code='PC'
JOIN product_attribute_definitions ad
 ON ad.product_type_id=pt.product_type_id AND ad.attribute_code='bom_status'
WHERE p.model_code='PBC-PC-GAME-006'
ON CONFLICT (product_id, attribute_definition_id) DO UPDATE SET
 value_text=EXCLUDED.value_text, value_decimal=NULL, value_integer=NULL, value_boolean=NULL, value_json=NULL;

INSERT INTO products
 (product_type_id, category_id, brand_id, model_code, product_name, short_description, description, product_status)
SELECT pt.product_type_id, c.category_id, b.brand_id, 'PBC-PC-GAME-007', 'Gaming PC RTX 4070 SUPER',
       'Gaming PC RTX 4070 SUPER - catalog tham khảo PC Builder Store.', 'Nguồn tham khảo: https://phongvu.vn/c/linh-kien-may-tinh',
       'ACTIVE'
FROM product_types pt
JOIN categories c ON c.category_code='PREBUILT_PC'
LEFT JOIN brands b ON b.brand_name='PC Builder'
WHERE pt.type_code='PC'
ON CONFLICT (model_code) DO UPDATE SET
 product_type_id=EXCLUDED.product_type_id,
 category_id=EXCLUDED.category_id,
 brand_id=EXCLUDED.brand_id,
 product_name=EXCLUDED.product_name,
 short_description=EXCLUDED.short_description,
 description=EXCLUDED.description,
 product_status='ACTIVE';

INSERT INTO product_offers
 (product_id, offer_code, condition_code, price, currency_code, stock_quantity,
  reserved_quantity, warranty_months, offer_status)
SELECT p.product_id, 'DEMO-PBC-PC-GAME-007', 'NEW',
       25000000, 'VND',
       5, 0, 24, 'ACTIVE'
FROM products p WHERE p.model_code='PBC-PC-GAME-007'
ON CONFLICT (offer_code) DO UPDATE SET
 product_id=EXCLUDED.product_id,
 condition_code=EXCLUDED.condition_code,
 price=EXCLUDED.price,
 currency_code=EXCLUDED.currency_code,
 stock_quantity=EXCLUDED.stock_quantity,
 warranty_months=EXCLUDED.warranty_months,
 offer_status='ACTIVE';

INSERT INTO product_attribute_values
 (product_id, attribute_definition_id, value_json)
SELECT p.product_id, ad.attribute_definition_id, '["Core i5-14600K", "Z790", "RTX 4070 SUPER", "32GB DDR5"]'::jsonb
FROM products p
JOIN product_types pt ON pt.type_code='PC'
JOIN product_attribute_definitions ad
 ON ad.product_type_id=pt.product_type_id AND ad.attribute_code='configuration_summary'
WHERE p.model_code='PBC-PC-GAME-007'
ON CONFLICT (product_id, attribute_definition_id) DO UPDATE SET
 value_json=EXCLUDED.value_json, value_text=NULL, value_decimal=NULL, value_integer=NULL, value_boolean=NULL;

INSERT INTO product_attribute_values
 (product_id, attribute_definition_id, value_text)
SELECT p.product_id, ad.attribute_definition_id, 'PENDING'
FROM products p
JOIN product_types pt ON pt.type_code='PC'
JOIN product_attribute_definitions ad
 ON ad.product_type_id=pt.product_type_id AND ad.attribute_code='bom_status'
WHERE p.model_code='PBC-PC-GAME-007'
ON CONFLICT (product_id, attribute_definition_id) DO UPDATE SET
 value_text=EXCLUDED.value_text, value_decimal=NULL, value_integer=NULL, value_boolean=NULL, value_json=NULL;

INSERT INTO products
 (product_type_id, category_id, brand_id, model_code, product_name, short_description, description, product_status)
SELECT pt.product_type_id, c.category_id, b.brand_id, 'PBC-PC-CREATOR-008', 'Creator PC Ryzen 7',
       'Creator PC Ryzen 7 - catalog tham khảo PC Builder Store.', 'Nguồn tham khảo: https://phongvu.vn/c/linh-kien-may-tinh',
       'ACTIVE'
FROM product_types pt
JOIN categories c ON c.category_code='PREBUILT_PC'
LEFT JOIN brands b ON b.brand_name='PC Builder'
WHERE pt.type_code='PC'
ON CONFLICT (model_code) DO UPDATE SET
 product_type_id=EXCLUDED.product_type_id,
 category_id=EXCLUDED.category_id,
 brand_id=EXCLUDED.brand_id,
 product_name=EXCLUDED.product_name,
 short_description=EXCLUDED.short_description,
 description=EXCLUDED.description,
 product_status='ACTIVE';

INSERT INTO product_offers
 (product_id, offer_code, condition_code, price, currency_code, stock_quantity,
  reserved_quantity, warranty_months, offer_status)
SELECT p.product_id, 'DEMO-PBC-PC-CREATOR-008', 'NEW',
       25000000, 'VND',
       5, 0, 24, 'ACTIVE'
FROM products p WHERE p.model_code='PBC-PC-CREATOR-008'
ON CONFLICT (offer_code) DO UPDATE SET
 product_id=EXCLUDED.product_id,
 condition_code=EXCLUDED.condition_code,
 price=EXCLUDED.price,
 currency_code=EXCLUDED.currency_code,
 stock_quantity=EXCLUDED.stock_quantity,
 warranty_months=EXCLUDED.warranty_months,
 offer_status='ACTIVE';

INSERT INTO product_attribute_values
 (product_id, attribute_definition_id, value_json)
SELECT p.product_id, ad.attribute_definition_id, '["Ryzen 7 7700", "B650", "RTX 4060 Ti", "64GB DDR5"]'::jsonb
FROM products p
JOIN product_types pt ON pt.type_code='PC'
JOIN product_attribute_definitions ad
 ON ad.product_type_id=pt.product_type_id AND ad.attribute_code='configuration_summary'
WHERE p.model_code='PBC-PC-CREATOR-008'
ON CONFLICT (product_id, attribute_definition_id) DO UPDATE SET
 value_json=EXCLUDED.value_json, value_text=NULL, value_decimal=NULL, value_integer=NULL, value_boolean=NULL;

INSERT INTO product_attribute_values
 (product_id, attribute_definition_id, value_text)
SELECT p.product_id, ad.attribute_definition_id, 'PENDING'
FROM products p
JOIN product_types pt ON pt.type_code='PC'
JOIN product_attribute_definitions ad
 ON ad.product_type_id=pt.product_type_id AND ad.attribute_code='bom_status'
WHERE p.model_code='PBC-PC-CREATOR-008'
ON CONFLICT (product_id, attribute_definition_id) DO UPDATE SET
 value_text=EXCLUDED.value_text, value_decimal=NULL, value_integer=NULL, value_boolean=NULL, value_json=NULL;

INSERT INTO products
 (product_type_id, category_id, brand_id, model_code, product_name, short_description, description, product_status)
SELECT pt.product_type_id, c.category_id, b.brand_id, 'PBC-PC-GAME-009', 'High-end Gaming PC',
       'High-end Gaming PC - catalog tham khảo PC Builder Store.', 'Nguồn tham khảo: https://phongvu.vn/c/linh-kien-may-tinh',
       'ACTIVE'
FROM product_types pt
JOIN categories c ON c.category_code='PREBUILT_PC'
LEFT JOIN brands b ON b.brand_name='PC Builder'
WHERE pt.type_code='PC'
ON CONFLICT (model_code) DO UPDATE SET
 product_type_id=EXCLUDED.product_type_id,
 category_id=EXCLUDED.category_id,
 brand_id=EXCLUDED.brand_id,
 product_name=EXCLUDED.product_name,
 short_description=EXCLUDED.short_description,
 description=EXCLUDED.description,
 product_status='ACTIVE';

INSERT INTO product_offers
 (product_id, offer_code, condition_code, price, currency_code, stock_quantity,
  reserved_quantity, warranty_months, offer_status)
SELECT p.product_id, 'DEMO-PBC-PC-GAME-009', 'NEW',
       25000000, 'VND',
       5, 0, 24, 'ACTIVE'
FROM products p WHERE p.model_code='PBC-PC-GAME-009'
ON CONFLICT (offer_code) DO UPDATE SET
 product_id=EXCLUDED.product_id,
 condition_code=EXCLUDED.condition_code,
 price=EXCLUDED.price,
 currency_code=EXCLUDED.currency_code,
 stock_quantity=EXCLUDED.stock_quantity,
 warranty_months=EXCLUDED.warranty_months,
 offer_status='ACTIVE';

INSERT INTO product_attribute_values
 (product_id, attribute_definition_id, value_json)
SELECT p.product_id, ad.attribute_definition_id, '["Ryzen 7 7800X3D", "B650E", "RTX 4070 SUPER", "32GB DDR5"]'::jsonb
FROM products p
JOIN product_types pt ON pt.type_code='PC'
JOIN product_attribute_definitions ad
 ON ad.product_type_id=pt.product_type_id AND ad.attribute_code='configuration_summary'
WHERE p.model_code='PBC-PC-GAME-009'
ON CONFLICT (product_id, attribute_definition_id) DO UPDATE SET
 value_json=EXCLUDED.value_json, value_text=NULL, value_decimal=NULL, value_integer=NULL, value_boolean=NULL;

INSERT INTO product_attribute_values
 (product_id, attribute_definition_id, value_text)
SELECT p.product_id, ad.attribute_definition_id, 'PENDING'
FROM products p
JOIN product_types pt ON pt.type_code='PC'
JOIN product_attribute_definitions ad
 ON ad.product_type_id=pt.product_type_id AND ad.attribute_code='bom_status'
WHERE p.model_code='PBC-PC-GAME-009'
ON CONFLICT (product_id, attribute_definition_id) DO UPDATE SET
 value_text=EXCLUDED.value_text, value_decimal=NULL, value_integer=NULL, value_boolean=NULL, value_json=NULL;

INSERT INTO products
 (product_type_id, category_id, brand_id, model_code, product_name, short_description, description, product_status)
SELECT pt.product_type_id, c.category_id, b.brand_id, 'PBC-PC-WORK-010', 'Workstation PC',
       'Workstation PC - catalog tham khảo PC Builder Store.', 'Nguồn tham khảo: https://phongvu.vn/c/linh-kien-may-tinh',
       'ACTIVE'
FROM product_types pt
JOIN categories c ON c.category_code='PREBUILT_PC'
LEFT JOIN brands b ON b.brand_name='PC Builder'
WHERE pt.type_code='PC'
ON CONFLICT (model_code) DO UPDATE SET
 product_type_id=EXCLUDED.product_type_id,
 category_id=EXCLUDED.category_id,
 brand_id=EXCLUDED.brand_id,
 product_name=EXCLUDED.product_name,
 short_description=EXCLUDED.short_description,
 description=EXCLUDED.description,
 product_status='ACTIVE';

INSERT INTO product_offers
 (product_id, offer_code, condition_code, price, currency_code, stock_quantity,
  reserved_quantity, warranty_months, offer_status)
SELECT p.product_id, 'DEMO-PBC-PC-WORK-010', 'NEW',
       25000000, 'VND',
       5, 0, 24, 'ACTIVE'
FROM products p WHERE p.model_code='PBC-PC-WORK-010'
ON CONFLICT (offer_code) DO UPDATE SET
 product_id=EXCLUDED.product_id,
 condition_code=EXCLUDED.condition_code,
 price=EXCLUDED.price,
 currency_code=EXCLUDED.currency_code,
 stock_quantity=EXCLUDED.stock_quantity,
 warranty_months=EXCLUDED.warranty_months,
 offer_status='ACTIVE';

INSERT INTO product_attribute_values
 (product_id, attribute_definition_id, value_json)
SELECT p.product_id, ad.attribute_definition_id, '["Core i7-14700K", "Z790", "RTX 4070 SUPER", "64GB DDR5"]'::jsonb
FROM products p
JOIN product_types pt ON pt.type_code='PC'
JOIN product_attribute_definitions ad
 ON ad.product_type_id=pt.product_type_id AND ad.attribute_code='configuration_summary'
WHERE p.model_code='PBC-PC-WORK-010'
ON CONFLICT (product_id, attribute_definition_id) DO UPDATE SET
 value_json=EXCLUDED.value_json, value_text=NULL, value_decimal=NULL, value_integer=NULL, value_boolean=NULL;

INSERT INTO product_attribute_values
 (product_id, attribute_definition_id, value_text)
SELECT p.product_id, ad.attribute_definition_id, 'PENDING'
FROM products p
JOIN product_types pt ON pt.type_code='PC'
JOIN product_attribute_definitions ad
 ON ad.product_type_id=pt.product_type_id AND ad.attribute_code='bom_status'
WHERE p.model_code='PBC-PC-WORK-010'
ON CONFLICT (product_id, attribute_definition_id) DO UPDATE SET
 value_text=EXCLUDED.value_text, value_decimal=NULL, value_integer=NULL, value_boolean=NULL, value_json=NULL;

INSERT INTO products
 (product_type_id, category_id, brand_id, model_code, product_name, short_description, description, product_status)
SELECT pt.product_type_id, c.category_id, b.brand_id, '910-005802', 'G102 LIGHTSYNC Gaming Mouse',
       'G102 LIGHTSYNC Gaming Mouse - catalog tham khảo PC Builder Store.', 'Nguồn tham khảo: https://www.logitechg.com/',
       'ACTIVE'
FROM product_types pt
JOIN categories c ON c.category_code='ACCESSORY'
LEFT JOIN brands b ON b.brand_name='Logitech'
WHERE pt.type_code='ACCESSORY'
ON CONFLICT (model_code) DO UPDATE SET
 product_type_id=EXCLUDED.product_type_id,
 category_id=EXCLUDED.category_id,
 brand_id=EXCLUDED.brand_id,
 product_name=EXCLUDED.product_name,
 short_description=EXCLUDED.short_description,
 description=EXCLUDED.description,
 product_status='ACTIVE';

INSERT INTO product_offers
 (product_id, offer_code, condition_code, price, currency_code, stock_quantity,
  reserved_quantity, warranty_months, offer_status)
SELECT p.product_id, 'DEMO-910-005802', 'NEW',
       1000000, 'VND',
       5, 0, 24, 'ACTIVE'
FROM products p WHERE p.model_code='910-005802'
ON CONFLICT (offer_code) DO UPDATE SET
 product_id=EXCLUDED.product_id,
 condition_code=EXCLUDED.condition_code,
 price=EXCLUDED.price,
 currency_code=EXCLUDED.currency_code,
 stock_quantity=EXCLUDED.stock_quantity,
 warranty_months=EXCLUDED.warranty_months,
 offer_status='ACTIVE';

INSERT INTO product_attribute_values
 (product_id, attribute_definition_id, value_text)
SELECT p.product_id, ad.attribute_definition_id, 'MOUSE'
FROM products p
JOIN product_types pt ON pt.type_code='ACCESSORY'
JOIN product_attribute_definitions ad
 ON ad.product_type_id=pt.product_type_id AND ad.attribute_code='accessory_type'
WHERE p.model_code='910-005802'
ON CONFLICT (product_id, attribute_definition_id) DO UPDATE SET
 value_text=EXCLUDED.value_text, value_decimal=NULL, value_integer=NULL, value_boolean=NULL, value_json=NULL;

INSERT INTO products
 (product_type_id, category_id, brand_id, model_code, product_name, short_description, description, product_status)
SELECT pt.product_type_id, c.category_id, b.brand_id, '910-005472', 'G502 HERO Gaming Mouse',
       'G502 HERO Gaming Mouse - catalog tham khảo PC Builder Store.', 'Nguồn tham khảo: https://www.logitechg.com/',
       'ACTIVE'
FROM product_types pt
JOIN categories c ON c.category_code='ACCESSORY'
LEFT JOIN brands b ON b.brand_name='Logitech'
WHERE pt.type_code='ACCESSORY'
ON CONFLICT (model_code) DO UPDATE SET
 product_type_id=EXCLUDED.product_type_id,
 category_id=EXCLUDED.category_id,
 brand_id=EXCLUDED.brand_id,
 product_name=EXCLUDED.product_name,
 short_description=EXCLUDED.short_description,
 description=EXCLUDED.description,
 product_status='ACTIVE';

INSERT INTO product_offers
 (product_id, offer_code, condition_code, price, currency_code, stock_quantity,
  reserved_quantity, warranty_months, offer_status)
SELECT p.product_id, 'DEMO-910-005472', 'NEW',
       1000000, 'VND',
       5, 0, 24, 'ACTIVE'
FROM products p WHERE p.model_code='910-005472'
ON CONFLICT (offer_code) DO UPDATE SET
 product_id=EXCLUDED.product_id,
 condition_code=EXCLUDED.condition_code,
 price=EXCLUDED.price,
 currency_code=EXCLUDED.currency_code,
 stock_quantity=EXCLUDED.stock_quantity,
 warranty_months=EXCLUDED.warranty_months,
 offer_status='ACTIVE';

INSERT INTO product_attribute_values
 (product_id, attribute_definition_id, value_text)
SELECT p.product_id, ad.attribute_definition_id, 'MOUSE'
FROM products p
JOIN product_types pt ON pt.type_code='ACCESSORY'
JOIN product_attribute_definitions ad
 ON ad.product_type_id=pt.product_type_id AND ad.attribute_code='accessory_type'
WHERE p.model_code='910-005472'
ON CONFLICT (product_id, attribute_definition_id) DO UPDATE SET
 value_text=EXCLUDED.value_text, value_decimal=NULL, value_integer=NULL, value_boolean=NULL, value_json=NULL;

INSERT INTO products
 (product_type_id, category_id, brand_id, model_code, product_name, short_description, description, product_status)
SELECT pt.product_type_id, c.category_id, b.brand_id, '910-006630', 'G PRO X Superlight 2',
       'G PRO X Superlight 2 - catalog tham khảo PC Builder Store.', 'Nguồn tham khảo: https://www.logitechg.com/',
       'ACTIVE'
FROM product_types pt
JOIN categories c ON c.category_code='ACCESSORY'
LEFT JOIN brands b ON b.brand_name='Logitech'
WHERE pt.type_code='ACCESSORY'
ON CONFLICT (model_code) DO UPDATE SET
 product_type_id=EXCLUDED.product_type_id,
 category_id=EXCLUDED.category_id,
 brand_id=EXCLUDED.brand_id,
 product_name=EXCLUDED.product_name,
 short_description=EXCLUDED.short_description,
 description=EXCLUDED.description,
 product_status='ACTIVE';

INSERT INTO product_offers
 (product_id, offer_code, condition_code, price, currency_code, stock_quantity,
  reserved_quantity, warranty_months, offer_status)
SELECT p.product_id, 'DEMO-910-006630', 'NEW',
       1000000, 'VND',
       5, 0, 24, 'ACTIVE'
FROM products p WHERE p.model_code='910-006630'
ON CONFLICT (offer_code) DO UPDATE SET
 product_id=EXCLUDED.product_id,
 condition_code=EXCLUDED.condition_code,
 price=EXCLUDED.price,
 currency_code=EXCLUDED.currency_code,
 stock_quantity=EXCLUDED.stock_quantity,
 warranty_months=EXCLUDED.warranty_months,
 offer_status='ACTIVE';

INSERT INTO product_attribute_values
 (product_id, attribute_definition_id, value_text)
SELECT p.product_id, ad.attribute_definition_id, 'MOUSE'
FROM products p
JOIN product_types pt ON pt.type_code='ACCESSORY'
JOIN product_attribute_definitions ad
 ON ad.product_type_id=pt.product_type_id AND ad.attribute_code='accessory_type'
WHERE p.model_code='910-006630'
ON CONFLICT (product_id, attribute_definition_id) DO UPDATE SET
 value_text=EXCLUDED.value_text, value_decimal=NULL, value_integer=NULL, value_boolean=NULL, value_json=NULL;

INSERT INTO products
 (product_type_id, category_id, brand_id, model_code, product_name, short_description, description, product_status)
SELECT pt.product_type_id, c.category_id, b.brand_id, 'RZ01-03850100', 'DeathAdder Essential',
       'DeathAdder Essential - catalog tham khảo PC Builder Store.', 'Nguồn tham khảo: https://www.razer.com/',
       'ACTIVE'
FROM product_types pt
JOIN categories c ON c.category_code='ACCESSORY'
LEFT JOIN brands b ON b.brand_name='Razer'
WHERE pt.type_code='ACCESSORY'
ON CONFLICT (model_code) DO UPDATE SET
 product_type_id=EXCLUDED.product_type_id,
 category_id=EXCLUDED.category_id,
 brand_id=EXCLUDED.brand_id,
 product_name=EXCLUDED.product_name,
 short_description=EXCLUDED.short_description,
 description=EXCLUDED.description,
 product_status='ACTIVE';

INSERT INTO product_offers
 (product_id, offer_code, condition_code, price, currency_code, stock_quantity,
  reserved_quantity, warranty_months, offer_status)
SELECT p.product_id, 'DEMO-RZ01-03850100', 'NEW',
       1000000, 'VND',
       5, 0, 24, 'ACTIVE'
FROM products p WHERE p.model_code='RZ01-03850100'
ON CONFLICT (offer_code) DO UPDATE SET
 product_id=EXCLUDED.product_id,
 condition_code=EXCLUDED.condition_code,
 price=EXCLUDED.price,
 currency_code=EXCLUDED.currency_code,
 stock_quantity=EXCLUDED.stock_quantity,
 warranty_months=EXCLUDED.warranty_months,
 offer_status='ACTIVE';

INSERT INTO product_attribute_values
 (product_id, attribute_definition_id, value_text)
SELECT p.product_id, ad.attribute_definition_id, 'MOUSE'
FROM products p
JOIN product_types pt ON pt.type_code='ACCESSORY'
JOIN product_attribute_definitions ad
 ON ad.product_type_id=pt.product_type_id AND ad.attribute_code='accessory_type'
WHERE p.model_code='RZ01-03850100'
ON CONFLICT (product_id, attribute_definition_id) DO UPDATE SET
 value_text=EXCLUDED.value_text, value_decimal=NULL, value_integer=NULL, value_boolean=NULL, value_json=NULL;

INSERT INTO products
 (product_type_id, category_id, brand_id, model_code, product_name, short_description, description, product_status)
SELECT pt.product_type_id, c.category_id, b.brand_id, 'RZ03-03541900', 'BlackWidow V3',
       'BlackWidow V3 - catalog tham khảo PC Builder Store.', 'Nguồn tham khảo: https://www.razer.com/',
       'ACTIVE'
FROM product_types pt
JOIN categories c ON c.category_code='ACCESSORY'
LEFT JOIN brands b ON b.brand_name='Razer'
WHERE pt.type_code='ACCESSORY'
ON CONFLICT (model_code) DO UPDATE SET
 product_type_id=EXCLUDED.product_type_id,
 category_id=EXCLUDED.category_id,
 brand_id=EXCLUDED.brand_id,
 product_name=EXCLUDED.product_name,
 short_description=EXCLUDED.short_description,
 description=EXCLUDED.description,
 product_status='ACTIVE';

INSERT INTO product_offers
 (product_id, offer_code, condition_code, price, currency_code, stock_quantity,
  reserved_quantity, warranty_months, offer_status)
SELECT p.product_id, 'DEMO-RZ03-03541900', 'NEW',
       1000000, 'VND',
       5, 0, 24, 'ACTIVE'
FROM products p WHERE p.model_code='RZ03-03541900'
ON CONFLICT (offer_code) DO UPDATE SET
 product_id=EXCLUDED.product_id,
 condition_code=EXCLUDED.condition_code,
 price=EXCLUDED.price,
 currency_code=EXCLUDED.currency_code,
 stock_quantity=EXCLUDED.stock_quantity,
 warranty_months=EXCLUDED.warranty_months,
 offer_status='ACTIVE';

INSERT INTO product_attribute_values
 (product_id, attribute_definition_id, value_text)
SELECT p.product_id, ad.attribute_definition_id, 'KEYBOARD'
FROM products p
JOIN product_types pt ON pt.type_code='ACCESSORY'
JOIN product_attribute_definitions ad
 ON ad.product_type_id=pt.product_type_id AND ad.attribute_code='accessory_type'
WHERE p.model_code='RZ03-03541900'
ON CONFLICT (product_id, attribute_definition_id) DO UPDATE SET
 value_text=EXCLUDED.value_text, value_decimal=NULL, value_integer=NULL, value_boolean=NULL, value_json=NULL;

INSERT INTO products
 (product_type_id, category_id, brand_id, model_code, product_name, short_description, description, product_status)
SELECT pt.product_type_id, c.category_id, b.brand_id, 'AULA-F75', 'F75 Mechanical Keyboard',
       'F75 Mechanical Keyboard - catalog tham khảo PC Builder Store.', 'Nguồn tham khảo: https://phongvu.vn/c/linh-kien-may-tinh',
       'ACTIVE'
FROM product_types pt
JOIN categories c ON c.category_code='ACCESSORY'
LEFT JOIN brands b ON b.brand_name='AULA'
WHERE pt.type_code='ACCESSORY'
ON CONFLICT (model_code) DO UPDATE SET
 product_type_id=EXCLUDED.product_type_id,
 category_id=EXCLUDED.category_id,
 brand_id=EXCLUDED.brand_id,
 product_name=EXCLUDED.product_name,
 short_description=EXCLUDED.short_description,
 description=EXCLUDED.description,
 product_status='ACTIVE';

INSERT INTO product_offers
 (product_id, offer_code, condition_code, price, currency_code, stock_quantity,
  reserved_quantity, warranty_months, offer_status)
SELECT p.product_id, 'DEMO-AULA-F75', 'NEW',
       1000000, 'VND',
       5, 0, 24, 'ACTIVE'
FROM products p WHERE p.model_code='AULA-F75'
ON CONFLICT (offer_code) DO UPDATE SET
 product_id=EXCLUDED.product_id,
 condition_code=EXCLUDED.condition_code,
 price=EXCLUDED.price,
 currency_code=EXCLUDED.currency_code,
 stock_quantity=EXCLUDED.stock_quantity,
 warranty_months=EXCLUDED.warranty_months,
 offer_status='ACTIVE';

INSERT INTO product_attribute_values
 (product_id, attribute_definition_id, value_text)
SELECT p.product_id, ad.attribute_definition_id, 'KEYBOARD'
FROM products p
JOIN product_types pt ON pt.type_code='ACCESSORY'
JOIN product_attribute_definitions ad
 ON ad.product_type_id=pt.product_type_id AND ad.attribute_code='accessory_type'
WHERE p.model_code='AULA-F75'
ON CONFLICT (product_id, attribute_definition_id) DO UPDATE SET
 value_text=EXCLUDED.value_text, value_decimal=NULL, value_integer=NULL, value_boolean=NULL, value_json=NULL;

INSERT INTO products
 (product_type_id, category_id, brand_id, model_code, product_name, short_description, description, product_status)
SELECT pt.product_type_id, c.category_id, b.brand_id, 'K8P', 'K8 Pro Mechanical Keyboard',
       'K8 Pro Mechanical Keyboard - catalog tham khảo PC Builder Store.', 'Nguồn tham khảo: https://phongvu.vn/c/linh-kien-may-tinh',
       'ACTIVE'
FROM product_types pt
JOIN categories c ON c.category_code='ACCESSORY'
LEFT JOIN brands b ON b.brand_name='Keychron'
WHERE pt.type_code='ACCESSORY'
ON CONFLICT (model_code) DO UPDATE SET
 product_type_id=EXCLUDED.product_type_id,
 category_id=EXCLUDED.category_id,
 brand_id=EXCLUDED.brand_id,
 product_name=EXCLUDED.product_name,
 short_description=EXCLUDED.short_description,
 description=EXCLUDED.description,
 product_status='ACTIVE';

INSERT INTO product_offers
 (product_id, offer_code, condition_code, price, currency_code, stock_quantity,
  reserved_quantity, warranty_months, offer_status)
SELECT p.product_id, 'DEMO-K8P', 'NEW',
       1000000, 'VND',
       5, 0, 24, 'ACTIVE'
FROM products p WHERE p.model_code='K8P'
ON CONFLICT (offer_code) DO UPDATE SET
 product_id=EXCLUDED.product_id,
 condition_code=EXCLUDED.condition_code,
 price=EXCLUDED.price,
 currency_code=EXCLUDED.currency_code,
 stock_quantity=EXCLUDED.stock_quantity,
 warranty_months=EXCLUDED.warranty_months,
 offer_status='ACTIVE';

INSERT INTO product_attribute_values
 (product_id, attribute_definition_id, value_text)
SELECT p.product_id, ad.attribute_definition_id, 'KEYBOARD'
FROM products p
JOIN product_types pt ON pt.type_code='ACCESSORY'
JOIN product_attribute_definitions ad
 ON ad.product_type_id=pt.product_type_id AND ad.attribute_code='accessory_type'
WHERE p.model_code='K8P'
ON CONFLICT (product_id, attribute_definition_id) DO UPDATE SET
 value_text=EXCLUDED.value_text, value_decimal=NULL, value_integer=NULL, value_boolean=NULL, value_json=NULL;

INSERT INTO products
 (product_type_id, category_id, brand_id, model_code, product_name, short_description, description, product_status)
SELECT pt.product_type_id, c.category_id, b.brand_id, '24G2SP', '24G2SP Gaming Monitor',
       '24G2SP Gaming Monitor - catalog tham khảo PC Builder Store.', 'Nguồn tham khảo: https://phongvu.vn/c/linh-kien-may-tinh',
       'ACTIVE'
FROM product_types pt
JOIN categories c ON c.category_code='ACCESSORY'
LEFT JOIN brands b ON b.brand_name='AOC'
WHERE pt.type_code='ACCESSORY'
ON CONFLICT (model_code) DO UPDATE SET
 product_type_id=EXCLUDED.product_type_id,
 category_id=EXCLUDED.category_id,
 brand_id=EXCLUDED.brand_id,
 product_name=EXCLUDED.product_name,
 short_description=EXCLUDED.short_description,
 description=EXCLUDED.description,
 product_status='ACTIVE';

INSERT INTO product_offers
 (product_id, offer_code, condition_code, price, currency_code, stock_quantity,
  reserved_quantity, warranty_months, offer_status)
SELECT p.product_id, 'DEMO-24G2SP', 'NEW',
       1000000, 'VND',
       5, 0, 24, 'ACTIVE'
FROM products p WHERE p.model_code='24G2SP'
ON CONFLICT (offer_code) DO UPDATE SET
 product_id=EXCLUDED.product_id,
 condition_code=EXCLUDED.condition_code,
 price=EXCLUDED.price,
 currency_code=EXCLUDED.currency_code,
 stock_quantity=EXCLUDED.stock_quantity,
 warranty_months=EXCLUDED.warranty_months,
 offer_status='ACTIVE';

INSERT INTO product_attribute_values
 (product_id, attribute_definition_id, value_text)
SELECT p.product_id, ad.attribute_definition_id, 'MONITOR'
FROM products p
JOIN product_types pt ON pt.type_code='ACCESSORY'
JOIN product_attribute_definitions ad
 ON ad.product_type_id=pt.product_type_id AND ad.attribute_code='accessory_type'
WHERE p.model_code='24G2SP'
ON CONFLICT (product_id, attribute_definition_id) DO UPDATE SET
 value_text=EXCLUDED.value_text, value_decimal=NULL, value_integer=NULL, value_boolean=NULL, value_json=NULL;

INSERT INTO products
 (product_type_id, category_id, brand_id, model_code, product_name, short_description, description, product_status)
SELECT pt.product_type_id, c.category_id, b.brand_id, 'VG27AQ1A', 'TUF Gaming VG27AQ1A',
       'TUF Gaming VG27AQ1A - catalog tham khảo PC Builder Store.', 'Nguồn tham khảo: https://www.asus.com/',
       'ACTIVE'
FROM product_types pt
JOIN categories c ON c.category_code='ACCESSORY'
LEFT JOIN brands b ON b.brand_name='ASUS'
WHERE pt.type_code='ACCESSORY'
ON CONFLICT (model_code) DO UPDATE SET
 product_type_id=EXCLUDED.product_type_id,
 category_id=EXCLUDED.category_id,
 brand_id=EXCLUDED.brand_id,
 product_name=EXCLUDED.product_name,
 short_description=EXCLUDED.short_description,
 description=EXCLUDED.description,
 product_status='ACTIVE';

INSERT INTO product_offers
 (product_id, offer_code, condition_code, price, currency_code, stock_quantity,
  reserved_quantity, warranty_months, offer_status)
SELECT p.product_id, 'DEMO-VG27AQ1A', 'NEW',
       1000000, 'VND',
       5, 0, 24, 'ACTIVE'
FROM products p WHERE p.model_code='VG27AQ1A'
ON CONFLICT (offer_code) DO UPDATE SET
 product_id=EXCLUDED.product_id,
 condition_code=EXCLUDED.condition_code,
 price=EXCLUDED.price,
 currency_code=EXCLUDED.currency_code,
 stock_quantity=EXCLUDED.stock_quantity,
 warranty_months=EXCLUDED.warranty_months,
 offer_status='ACTIVE';

INSERT INTO product_attribute_values
 (product_id, attribute_definition_id, value_text)
SELECT p.product_id, ad.attribute_definition_id, 'MONITOR'
FROM products p
JOIN product_types pt ON pt.type_code='ACCESSORY'
JOIN product_attribute_definitions ad
 ON ad.product_type_id=pt.product_type_id AND ad.attribute_code='accessory_type'
WHERE p.model_code='VG27AQ1A'
ON CONFLICT (product_id, attribute_definition_id) DO UPDATE SET
 value_text=EXCLUDED.value_text, value_decimal=NULL, value_integer=NULL, value_boolean=NULL, value_json=NULL;

INSERT INTO products
 (product_type_id, category_id, brand_id, model_code, product_name, short_description, description, product_status)
SELECT pt.product_type_id, c.category_id, b.brand_id, '727A8AA', 'Cloud III Gaming Headset',
       'Cloud III Gaming Headset - catalog tham khảo PC Builder Store.', 'Nguồn tham khảo: https://phongvu.vn/c/linh-kien-may-tinh',
       'ACTIVE'
FROM product_types pt
JOIN categories c ON c.category_code='ACCESSORY'
LEFT JOIN brands b ON b.brand_name='HyperX'
WHERE pt.type_code='ACCESSORY'
ON CONFLICT (model_code) DO UPDATE SET
 product_type_id=EXCLUDED.product_type_id,
 category_id=EXCLUDED.category_id,
 brand_id=EXCLUDED.brand_id,
 product_name=EXCLUDED.product_name,
 short_description=EXCLUDED.short_description,
 description=EXCLUDED.description,
 product_status='ACTIVE';

INSERT INTO product_offers
 (product_id, offer_code, condition_code, price, currency_code, stock_quantity,
  reserved_quantity, warranty_months, offer_status)
SELECT p.product_id, 'DEMO-727A8AA', 'NEW',
       1000000, 'VND',
       5, 0, 24, 'ACTIVE'
FROM products p WHERE p.model_code='727A8AA'
ON CONFLICT (offer_code) DO UPDATE SET
 product_id=EXCLUDED.product_id,
 condition_code=EXCLUDED.condition_code,
 price=EXCLUDED.price,
 currency_code=EXCLUDED.currency_code,
 stock_quantity=EXCLUDED.stock_quantity,
 warranty_months=EXCLUDED.warranty_months,
 offer_status='ACTIVE';

INSERT INTO product_attribute_values
 (product_id, attribute_definition_id, value_text)
SELECT p.product_id, ad.attribute_definition_id, 'HEADSET'
FROM products p
JOIN product_types pt ON pt.type_code='ACCESSORY'
JOIN product_attribute_definitions ad
 ON ad.product_type_id=pt.product_type_id AND ad.attribute_code='accessory_type'
WHERE p.model_code='727A8AA'
ON CONFLICT (product_id, attribute_definition_id) DO UPDATE SET
 value_text=EXCLUDED.value_text, value_decimal=NULL, value_integer=NULL, value_boolean=NULL, value_json=NULL;

COMMIT;
