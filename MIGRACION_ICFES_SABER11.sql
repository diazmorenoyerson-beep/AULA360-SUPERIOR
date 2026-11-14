-- AULA360 PREMIUM: almacenamiento de resultados agregados oficiales Saber 11.
-- Fuente: ICFES, resultados agregados por aplicación. No almacenar microdatos personales.
create table if not exists public.icfes_saber11_imports (
  id uuid primary key default gen_random_uuid(),
  source_name text not null,
  source_url text not null,
  application text not null,
  published_at date,
  imported_at timestamptz not null default now(),
  rows_loaded integer not null default 0 check (rows_loaded >= 0),
  status text not null default 'staged' check (status in ('staged','validated','published','failed')),
  checksum text,
  notes text,
  created_by uuid references auth.users(id) on delete set null
);
create table if not exists public.icfes_saber11_results (
  id bigint generated always as identity primary key,
  import_id uuid not null references public.icfes_saber11_imports(id) on delete cascade,
  application text not null,
  period_code text,
  institution_code text not null,
  institution_name text not null,
  municipality_code text,
  municipality_name text,
  department_name text,
  academic_calendar text,
  sector text,
  jornada text,
  average_global numeric(6,2),
  average_reading numeric(6,2),
  average_math numeric(6,2),
  average_social numeric(6,2),
  average_natural_sciences numeric(6,2),
  average_english numeric(6,2),
  sd_reading numeric(7,3),
  sd_math numeric(7,3),
  sd_social numeric(7,3),
  sd_natural_sciences numeric(7,3),
  sd_english numeric(7,3),
  evaluated_count integer check (evaluated_count is null or evaluated_count >= 0),
  classification text,
  source_row jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint icfes_saber11_result_unique unique
    (application,institution_code,academic_calendar,sector,jornada)
);
create index if not exists icfes_saber11_results_app_dept_idx
  on public.icfes_saber11_results(application,department_name);
create index if not exists icfes_saber11_results_app_muni_idx
  on public.icfes_saber11_results(application,municipality_code);
create index if not exists icfes_saber11_results_app_score_idx
  on public.icfes_saber11_results(application,average_global desc nulls last);
create index if not exists icfes_saber11_results_inst_idx
  on public.icfes_saber11_results(institution_code,application);
alter table public.icfes_saber11_imports enable row level security;
alter table public.icfes_saber11_results enable row level security;
drop policy if exists "Public can read published ICFES import metadata" on public.icfes_saber11_imports;
create policy "Public can read published ICFES import metadata"
  on public.icfes_saber11_imports for select to anon, authenticated
  using (status = 'published');
drop policy if exists "Public can read official ICFES Saber 11 aggregates" on public.icfes_saber11_results;
create policy "Public can read official ICFES Saber 11 aggregates"
  on public.icfes_saber11_results for select to anon, authenticated
  using (exists (
    select 1 from public.icfes_saber11_imports i
    where i.id = import_id and i.status = 'published'
  ));
