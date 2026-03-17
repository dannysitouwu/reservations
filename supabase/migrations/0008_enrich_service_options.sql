-- Add image_url column to service_options for card display
alter table public.service_options add column if not exists image_url text;

-- Update the view to include image_url
drop view if exists public.service_options_view cascade;
create view public.service_options_view as
select
  so.id,
  so.name,
  so.description,
  so.duration_minutes,
  so.base_price,
  so.currency_code,
  so.image_url,
  s.name as service_name
from public.service_options so
join public.services s on s.id = so.service_id
where so.is_active = true
  and s.is_active = true;

-- Add a new service category for Costa Rica experiences
insert into public.services (id, name, description)
values
  ('00000000-0000-0000-0000-000000000104', 'Aventuras al aire libre', 'Tours y actividades de naturaleza y aventura en Costa Rica'),
  ('00000000-0000-0000-0000-000000000105', 'Experiencias culturales', 'Inmersión en la cultura y gastronomía costarricense')
on conflict (id) do nothing;

-- Update existing service options with descriptions in Spanish and image placeholders
update public.service_options
set description = 'Acceso completo por un día, hasta 200 invitados',
    image_url = 'https://images.unsplash.com/photo-1519167758481-83f550bb49b3?w=800'
where id = '00000000-0000-0000-0000-000000001201';

update public.service_options
set description = 'Ideal para talleres o reuniones corporativas',
    image_url = 'https://images.unsplash.com/photo-1497366216548-37526070297c?w=800'
where id = '00000000-0000-0000-0000-000000001202';

update public.service_options
set description = 'Canapés, entradas, postres y barra libre',
    image_url = 'https://images.unsplash.com/photo-1555244162-803834f70033?w=800'
where id = '00000000-0000-0000-0000-000000001203';

update public.service_options
set description = 'Masaje de 60 minutos con aromaterapia',
    image_url = 'https://images.unsplash.com/photo-1544161515-4ab6ce6db874?w=800'
where id = '00000000-0000-0000-0000-000000001204';

-- Insert new Costa Rica-themed adventure experiences
insert into public.service_options (id, service_id, name, description, duration_minutes, base_price, currency_code, image_url)
values
  ('00000000-0000-0000-0000-000000001205', '00000000-0000-0000-0000-000000000104',
   'Tour Volcán Arenal', 'Caminata guiada por senderos del volcán con vistas panorámicas y aguas termales',
   300, 45000, 'USD', 'https://images.unsplash.com/photo-1580767579297-ba218777ca68?w=800'),

  ('00000000-0000-0000-0000-000000001206', '00000000-0000-0000-0000-000000000104',
   'Canopy Monteverde', 'Tirolesas sobre el bosque nuboso con 12 cables y plataformas a 100m de altura',
   180, 65000, 'USD', 'https://images.unsplash.com/photo-1601024445121-e5b82f02fc8d?w=800'),

  ('00000000-0000-0000-0000-000000001207', '00000000-0000-0000-0000-000000000104',
   'Snorkel Cahuita', 'Snorkel en el arrecife de coral del Parque Nacional Cahuita con guía certificado',
   240, 35000, 'USD', 'https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=800'),

  ('00000000-0000-0000-0000-000000001208', '00000000-0000-0000-0000-000000000104',
   'Rafting Río Pacuare', 'Descenso en balsa por clase III-IV entre cañones y cascadas tropicales',
   360, 85000, 'USD', 'https://images.unsplash.com/photo-1530866495561-507c83caab29?w=800'),

  ('00000000-0000-0000-0000-000000001209', '00000000-0000-0000-0000-000000000103',
   'Couples Spa Package', 'Tratamiento de spa para parejas: masaje, facial y jacuzzi',
   120, 18000, 'USD', 'https://images.unsplash.com/photo-1540555700478-4be289fbec6a?w=800'),

  ('00000000-0000-0000-0000-000000001210', '00000000-0000-0000-0000-000000000105',
   'Tour del Café', 'Recorrido por plantaciones de café artesanal con degustación y proceso de tueste',
   180, 25000, 'USD', 'https://images.unsplash.com/photo-1447933601403-0c6688de566e?w=800'),

  ('00000000-0000-0000-0000-000000001211', '00000000-0000-0000-0000-000000000105',
   'Clase de Cocina Tica', 'Aprende a cocinar gallo pinto, casado y otros platos típicos con un chef local',
   150, 20000, 'USD', 'https://images.unsplash.com/photo-1556910103-1c02745aae4d?w=800'),

  ('00000000-0000-0000-0000-000000001212', '00000000-0000-0000-0000-000000000101',
   'Garden Terrace (Evening)', 'Terraza al aire libre para cenas y celebraciones nocturnas',
   300, 180000, 'USD', 'https://images.unsplash.com/photo-1464366400600-7168b8af9bc3?w=800'),

  ('00000000-0000-0000-0000-000000001213', '00000000-0000-0000-0000-000000000104',
   'Observación de Ballenas', 'Tour en bote por el Pacífico Sur para avistar ballenas jorobadas (temporada Jul-Nov)',
   240, 55000, 'USD', 'https://images.unsplash.com/photo-1568430462989-44163eb1752f?w=800'),

  ('00000000-0000-0000-0000-000000001214', '00000000-0000-0000-0000-000000000104',
   'Caminata Nocturna Biodiversidad', 'Exploración nocturna con guía naturalista: ranas, insectos y vida silvestre',
   120, 15000, 'USD', 'https://images.unsplash.com/photo-1474511320723-9a56873571b7?w=800')
on conflict (id) do nothing;

-- Availability for new experiences
insert into public.service_option_availability (service_option_id, weekday, start_time, end_time, capacity)
values
  -- Tour Volcán Arenal: Tue, Thu, Sat
  ('00000000-0000-0000-0000-000000001205', 2, '06:00', '13:00', 12),
  ('00000000-0000-0000-0000-000000001205', 4, '06:00', '13:00', 12),
  ('00000000-0000-0000-0000-000000001205', 6, '06:00', '13:00', 12),
  -- Canopy Monteverde: Mon-Sat
  ('00000000-0000-0000-0000-000000001206', 1, '08:00', '16:00', 20),
  ('00000000-0000-0000-0000-000000001206', 2, '08:00', '16:00', 20),
  ('00000000-0000-0000-0000-000000001206', 3, '08:00', '16:00', 20),
  ('00000000-0000-0000-0000-000000001206', 4, '08:00', '16:00', 20),
  ('00000000-0000-0000-0000-000000001206', 5, '08:00', '16:00', 20),
  ('00000000-0000-0000-0000-000000001206', 6, '08:00', '16:00', 20),
  -- Snorkel Cahuita: Wed, Fri, Sun
  ('00000000-0000-0000-0000-000000001207', 3, '07:00', '12:00', 10),
  ('00000000-0000-0000-0000-000000001207', 5, '07:00', '12:00', 10),
  ('00000000-0000-0000-0000-000000001207', 0, '07:00', '12:00', 10),
  -- Rafting Río Pacuare: Sat, Sun
  ('00000000-0000-0000-0000-000000001208', 5, '05:30', '15:00', 8),
  ('00000000-0000-0000-0000-000000001208', 6, '05:30', '15:00', 8),
  -- Couples Spa: Mon-Sun
  ('00000000-0000-0000-0000-000000001209', 1, '10:00', '20:00', 4),
  ('00000000-0000-0000-0000-000000001209', 2, '10:00', '20:00', 4),
  ('00000000-0000-0000-0000-000000001209', 3, '10:00', '20:00', 4),
  ('00000000-0000-0000-0000-000000001209', 4, '10:00', '20:00', 4),
  ('00000000-0000-0000-0000-000000001209', 5, '10:00', '20:00', 4),
  ('00000000-0000-0000-0000-000000001209', 6, '10:00', '20:00', 4),
  ('00000000-0000-0000-0000-000000001209', 0, '10:00', '20:00', 4),
  -- Tour del Café: Mon, Wed, Fri
  ('00000000-0000-0000-0000-000000001210', 1, '08:00', '12:00', 15),
  ('00000000-0000-0000-0000-000000001210', 3, '08:00', '12:00', 15),
  ('00000000-0000-0000-0000-000000001210', 5, '08:00', '12:00', 15),
  -- Clase de Cocina Tica: Tue, Thu, Sat
  ('00000000-0000-0000-0000-000000001211', 2, '09:00', '14:00', 8),
  ('00000000-0000-0000-0000-000000001211', 4, '09:00', '14:00', 8),
  ('00000000-0000-0000-0000-000000001211', 6, '09:00', '14:00', 8),
  -- Garden Terrace: Fri, Sat
  ('00000000-0000-0000-0000-000000001212', 5, '17:00', '23:00', 3),
  ('00000000-0000-0000-0000-000000001212', 6, '17:00', '23:00', 3),
  -- Ballenas: Wed, Sat, Sun (temporada)
  ('00000000-0000-0000-0000-000000001213', 3, '06:30', '12:00', 10),
  ('00000000-0000-0000-0000-000000001213', 5, '06:30', '12:00', 10),
  ('00000000-0000-0000-0000-000000001213', 6, '06:30', '12:00', 10),
  -- Caminata Nocturna: Mon-Fri
  ('00000000-0000-0000-0000-000000001214', 1, '18:00', '20:30', 10),
  ('00000000-0000-0000-0000-000000001214', 2, '18:00', '20:30', 10),
  ('00000000-0000-0000-0000-000000001214', 3, '18:00', '20:30', 10),
  ('00000000-0000-0000-0000-000000001214', 4, '18:00', '20:30', 10),
  ('00000000-0000-0000-0000-000000001214', 5, '18:00', '20:30', 10)
on conflict do nothing;
