-- Backfill floor rows for buildings created before automatic floor creation

insert into public.floors (building_id, name, floor_number, description)
select b.id, 'Floor ' || g.n, g.n, null
from public.buildings b
cross join lateral generate_series(1, greatest(b.number_of_floors, 0)) as g(n)
where not exists (
  select 1 from public.floors f
  where f.building_id = b.id and f.floor_number = g.n
);