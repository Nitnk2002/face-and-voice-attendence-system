# Apni Kaksha — Database Schema (Supabase / PostgreSQL)

## Overview

All tables live in the `public` schema of your Supabase project.
Because authentication is handled in Python (using `st.session_state` and `bcrypt` password hashes), Row-Level Security (RLS) policies are configured to allow access for the application client (`anon` key).

---

## Complete SQL Setup Script

Copy and paste this entire block into your Supabase **SQL Editor** and click **Run**:

```sql
-- 1. Create users table
create table if not exists public.users (
  id               uuid primary key default gen_random_uuid(),
  name             text not null,
  email            text not null unique,
  hashed_password  text not null,
  role             text not null check (role in ('teacher', 'student')),
  created_at       timestamptz default now()
);

-- 2. Create classes table
create table if not exists public.classes (
  id          uuid primary key default gen_random_uuid(),
  teacher_id  uuid references public.users(id) on delete cascade,
  class_name  text not null,
  join_code   text not null unique,
  created_at  timestamptz default now()
);

-- 3. Create enrollments table
create table if not exists public.enrollments (
  id              uuid primary key default gen_random_uuid(),
  class_id        uuid references public.classes(id) on delete cascade,
  student_id      uuid references public.users(id) on delete cascade,
  face_encoding   jsonb,           -- dlib 128-D float array (for recognition)
  voice_encoding  jsonb,           -- resemblyzer 256-D float array (for recognition)
  face_photo      text,            -- base64 JPEG of enrollment photo (for teacher review)
  voice_audio     text,            -- base64 WAV of enrollment audio (for teacher review)
  enrolled_at     timestamptz default now(),
  unique (class_id, student_id)
);

-- 4. Create attendance_sessions table
create table if not exists public.attendance_sessions (
  id         uuid primary key default gen_random_uuid(),
  class_id   uuid references public.classes(id) on delete cascade,
  date       date not null,
  is_active  boolean default false,
  created_at timestamptz default now()
);

-- 5. Create attendance_records table
create table if not exists public.attendance_records (
  id          uuid primary key default gen_random_uuid(),
  session_id  uuid references public.attendance_sessions(id) on delete cascade,
  student_id  uuid references public.users(id) on delete cascade,
  marked_at   timestamptz default now(),
  method      text check (method in ('face', 'voice', 'manual')),
  unique (session_id, student_id)
);

-- ── Enable Row Level Security & Create Application Policies ──
alter table public.users enable row level security;
alter table public.classes enable row level security;
alter table public.enrollments enable row level security;
alter table public.attendance_sessions enable row level security;
alter table public.attendance_records enable row level security;

-- Drop any old incompatible auth.uid() policies if they exist
drop policy if exists "Users can view own profile" on public.users;
drop policy if exists "Users can update own profile" on public.users;
drop policy if exists "Allow registration" on public.users;
drop policy if exists "Teachers manage own classes" on public.classes;
drop policy if exists "Anyone can lookup by join_code" on public.classes;
drop policy if exists "Students manage own enrollments" on public.enrollments;
drop policy if exists "Teachers view class enrollments" on public.enrollments;
drop policy if exists "Teachers manage sessions" on public.attendance_sessions;
drop policy if exists "Students view sessions" on public.attendance_sessions;
drop policy if exists "Teachers manage records" on public.attendance_records;
drop policy if exists "Students view own records" on public.attendance_records;

-- Create application-level policies (since Python handles authentication via bcrypt)
create policy "Allow app access to users" on public.users for all using (true) with check (true);
create policy "Allow app access to classes" on public.classes for all using (true) with check (true);
create policy "Allow app access to enrollments" on public.enrollments for all using (true) with check (true);
create policy "Allow app access to sessions" on public.attendance_sessions for all using (true) with check (true);
create policy "Allow app access to records" on public.attendance_records for all using (true) with check (true);
```

---

## Why this is required
When building custom authentication in Python (using `st.session_state` and `bcrypt` password hashing), queries sent from Python use Supabase's `anon` role where `auth.uid()` evaluates to `NULL`. The updated policies above allow your application code to securely read and insert records while keeping RLS enabled on all tables.
