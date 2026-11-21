-- Additive. Apply with Supabase MCP apply_migration or paste in the dashboard SQL editor.
-- Existing RLS on results covers the column.
alter table public.results add column places jsonb;

alter table public.results add constraint results_places_shape
  check (places is null or (jsonb_typeof(places) = 'array' and not jsonb_path_exists(places, '$[*].votes')));

comment on column public.results.places is 'Ordered [{nominee_id, slot 1..3|null, place, tied}]. Never vote counts.';
