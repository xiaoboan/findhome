-- ============================================
-- 寻家 Find Home - Supabase 数据库建表 SQL
-- ============================================
-- 使用方法：在 Supabase Dashboard → SQL Editor 中执行

-- ============================================
-- 1. 用户资料表 (扩展 auth.users)
-- ============================================
create table profiles (
  id uuid references auth.users(id) on delete cascade primary key,
  username text unique,
  phone text,
  email text,
  avatar_url text,
  city text not null default '',
  property_mode text not null default 'buy' check (property_mode in ('buy', 'rent')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ============================================
-- 2. 房源主表
-- ============================================
create table houses (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  name text not null default '新房源',
  room_number text not null default '',
  price numeric not null default 0,
  price_per_sqm numeric not null default 0,
  layout text not null default '',
  area numeric not null default 0,
  district text not null default '',
  floor text not null default '',
  orientation text not null default '',
  decoration text not null default '',
  age integer not null default 0,
  status text not null default 'pending' check (status in ('viewed', 'pending', 'sold')),
  tags text[] not null default '{}',
  last_viewing date,
  is_favorite boolean not null default false,
  cover_image text not null default '',
  custom_fields jsonb not null default '{}',
  source_url text not null default '',
  longitude double precision,
  latitude double precision,
  mode text not null default 'buy' check (mode in ('buy', 'rent')),
  is_demo boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ============================================
-- 3. 看房记录表
-- ============================================
create table viewing_records (
  id uuid default gen_random_uuid() primary key,
  property_id uuid references houses(id) on delete cascade not null,
  visit_number integer not null default 1,
  date date not null default current_date,
  notes text not null default '',
  photos text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ============================================
-- 4. AI 分析结果表
-- ============================================
create table ai_analyses (
  id uuid default gen_random_uuid() primary key,
  property_id uuid references houses(id) on delete cascade not null unique,
  pros text[] not null default '{}',
  cons text[] not null default '{}',
  suitable_for text[] not null default '{}',
  negotiation_tips text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ============================================
-- 5. 用户列配置表
-- ============================================
create table column_configs (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null unique,
  columns jsonb not null default '[]',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ============================================
-- 索引
-- ============================================
create index idx_houses_user_id on houses(user_id);
create index idx_houses_status on houses(status);
create index idx_viewing_records_property_id on viewing_records(property_id);
create index idx_ai_analyses_property_id on ai_analyses(property_id);

-- ============================================
-- updated_at 自动更新触发器
-- ============================================
create or replace function update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger profiles_updated_at
  before update on profiles
  for each row execute function update_updated_at();

create trigger houses_updated_at
  before update on houses
  for each row execute function update_updated_at();

create trigger viewing_records_updated_at
  before update on viewing_records
  for each row execute function update_updated_at();

create trigger ai_analyses_updated_at
  before update on ai_analyses
  for each row execute function update_updated_at();

create trigger column_configs_updated_at
  before update on column_configs
  for each row execute function update_updated_at();

-- ============================================
-- 新用户注册时自动创建 profile
-- ============================================
create or replace function handle_new_user()
returns trigger as $$
begin
  -- 创建 profile
  insert into public.profiles (id, email)
  values (new.id, new.email);

  return new;
end;
$$ language plpgsql security definer set search_path = public;

-- 注册触发器：auth.users 新增行时自动执行
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- ============================================
-- RLS 行级安全策略
-- ============================================
alter table profiles enable row level security;
alter table houses enable row level security;
alter table viewing_records enable row level security;
alter table ai_analyses enable row level security;
alter table column_configs enable row level security;

-- profiles
create policy "用户查看自己的资料" on profiles for select using (auth.uid() = id);
create policy "用户更新自己的资料" on profiles for update using (auth.uid() = id);

-- houses
create policy "用户查看自己的房源" on houses for select using (auth.uid() = user_id);
create policy "用户新增自己的房源" on houses for insert with check (auth.uid() = user_id);
create policy "用户更新自己的房源" on houses for update using (auth.uid() = user_id);
create policy "用户删除自己的房源" on houses for delete using (auth.uid() = user_id);

-- viewing_records
create policy "用户查看自己房源的看房记录" on viewing_records for select
  using (property_id in (select id from houses where user_id = auth.uid()));
create policy "用户添加自己房源的看房记录" on viewing_records for insert
  with check (property_id in (select id from houses where user_id = auth.uid()));
create policy "用户更新自己房源的看房记录" on viewing_records for update
  using (property_id in (select id from houses where user_id = auth.uid()));
create policy "用户删除自己房源的看房记录" on viewing_records for delete
  using (property_id in (select id from houses where user_id = auth.uid()));

-- ai_analyses
create policy "用户查看自己房源的AI分析" on ai_analyses for select
  using (property_id in (select id from houses where user_id = auth.uid()));
create policy "用户添加自己房源的AI分析" on ai_analyses for insert
  with check (property_id in (select id from houses where user_id = auth.uid()));
create policy "用户更新自己房源的AI分析" on ai_analyses for update
  using (property_id in (select id from houses where user_id = auth.uid()));
create policy "用户删除自己房源的AI分析" on ai_analyses for delete
  using (property_id in (select id from houses where user_id = auth.uid()));

-- column_configs
create policy "用户查看自己的列配置" on column_configs for select using (auth.uid() = user_id);
create policy "用户新增自己的列配置" on column_configs for insert with check (auth.uid() = user_id);
create policy "用户更新自己的列配置" on column_configs for update using (auth.uid() = user_id);
create policy "用户删除自己的列配置" on column_configs for delete using (auth.uid() = user_id);

-- ============================================
-- Storage: 房源图片 bucket
-- ============================================
-- 需要在 Supabase Dashboard → SQL Editor 中执行以下语句创建 bucket 和策略
-- 或者在 Dashboard → Storage 中手动创建名为 property-images 的 public bucket

insert into storage.buckets (id, name, public)
values ('property-images', 'property-images', true)
on conflict (id) do nothing;

-- 用户只能上传到自己的目录 (路径以 userId/ 开头)
create policy "用户上传自己的图片" on storage.objects for insert
  with check (bucket_id = 'property-images' and (storage.foldername(name))[1] = auth.uid()::text);

-- 公开读取
create policy "公开查看图片" on storage.objects for select
  using (bucket_id = 'property-images');

-- 用户只能删除自己目录下的图片
create policy "用户删除自己的图片" on storage.objects for delete
  using (bucket_id = 'property-images' and (storage.foldername(name))[1] = auth.uid()::text);
