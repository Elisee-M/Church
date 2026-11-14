-- Allow agreements without a pre-created space (rent is derived from the tenant)

alter table public.agreement_spaces
  alter column space_id drop not null;
