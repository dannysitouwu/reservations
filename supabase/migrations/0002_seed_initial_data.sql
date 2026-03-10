-- Seed baseline data for services and options
insert into public.services (id, name, description)
values
  ('00000000-0000-0000-0000-000000000101', 'Venue Rentals', 'Spaces and amenities for events'),
  ('00000000-0000-0000-0000-000000000102', 'Catering Packages', 'Food and beverage packages for reservations'),
  ('00000000-0000-0000-0000-000000000103', 'Wellness Sessions', 'Spa and wellness experiences')
on conflict (id) do nothing;

insert into public.service_options (id, service_id, name, description, duration_minutes, base_price, currency_code)
values
  ('00000000-0000-0000-0000-000000001201', '00000000-0000-0000-0000-000000000101', 'Banquet Hall (Full Day)', 'Full-day access, up to 200 guests', 720, 450000, 'USD'),
  ('00000000-0000-0000-0000-000000001202', '00000000-0000-0000-0000-000000000101', 'Conference Room (Half Day)', 'Ideal for workshops or meetings', 240, 120000, 'USD'),
  ('00000000-0000-0000-0000-000000001203', '00000000-0000-0000-0000-000000000102', 'Premium Catering', 'Canapés, entrees, desserts, open bar', 180, 280000, 'USD'),
  ('00000000-0000-0000-0000-000000001204', '00000000-0000-0000-0000-000000000103', 'Signature Massage', '60-minute massage with aromatherapy', 60, 9000, 'USD')
on conflict (id) do nothing;

-- Availability windows for scheduling logic
insert into public.service_option_availability (service_option_id, weekday, start_time, end_time, capacity)
values
  ('00000000-0000-0000-0000-000000001201', 5, '08:00', '23:00', 2), -- Saturday
  ('00000000-0000-0000-0000-000000001201', 6, '08:00', '23:00', 2), -- Sunday
  ('00000000-0000-0000-0000-000000001202', 1, '08:00', '18:00', 4), -- Monday
  ('00000000-0000-0000-0000-000000001202', 3, '08:00', '18:00', 4), -- Wednesday
  ('00000000-0000-0000-0000-000000001203', 4, '10:00', '22:00', 3), -- Thursday
  ('00000000-0000-0000-0000-000000001204', 2, '09:00', '17:00', 6), -- Tuesday
  ('00000000-0000-0000-0000-000000001204', 4, '09:00', '17:00', 6), -- Thursday
  ('00000000-0000-0000-0000-000000001204', 6, '09:00', '14:00', 6)  -- Saturday
on conflict do nothing;
