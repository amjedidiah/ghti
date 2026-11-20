-- CSV export log (Stage 3, step 3.5).
--
-- Exports copy personal data out of the system, so each one is recorded:
-- who, which export, with which filters, how many rows, when (Nigeria Data
-- Protection Act 2023, accountability). Admins only; append-only: no row is
-- ever edited or deleted through the API. Filters hold ids and statuses,
-- never names.

create type public.export_kind as enum ('applications', 'students', 'results');

create table public.export_log (
  id bigint generated always as identity primary key,
  kind public.export_kind not null,
  filters jsonb not null default '{}'::jsonb
    constraint export_log_filters_object check (
      jsonb_typeof(filters) = 'object' and pg_column_size(filters) <= 2000
    ),
  row_count integer not null
    constraint export_log_row_count_range check (row_count >= 0),
  exported_by uuid default auth.uid() references public.profiles (id) on delete set null,
  exported_at timestamptz not null default now()
);

comment on table public.export_log is
  'Audit log: one row per CSV export of personal data. Admins only; never edited or deleted.';

create index export_log_exported_at_idx on public.export_log (exported_at desc);

alter table public.export_log enable row level security;

revoke all on public.export_log from anon, authenticated;
grant select on public.export_log to authenticated;
grant insert (kind, filters, row_count, exported_by) on public.export_log to authenticated;
grant select, insert, delete on public.export_log to service_role;

create policy "Admins read the export log"
  on public.export_log for select to authenticated
  using ((select public.is_admin()));

create policy "Admins log their own exports"
  on public.export_log for insert to authenticated
  with check (exported_by = (select auth.uid()) and (select public.is_admin()));
