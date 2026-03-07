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
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ============================================
-- 2. 房源主表
-- ============================================
create table properties (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  name text not null default '新房源',
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
  is_demo boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ============================================
-- 3. 看房记录表
-- ============================================
create table viewing_records (
  id uuid default gen_random_uuid() primary key,
  property_id uuid references properties(id) on delete cascade not null,
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
  property_id uuid references properties(id) on delete cascade not null unique,
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
create index idx_properties_user_id on properties(user_id);
create index idx_properties_status on properties(status);
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

create trigger properties_updated_at
  before update on properties
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
-- 新用户注册时自动创建 profile + 默认房源数据
-- ============================================
create or replace function handle_new_user()
returns trigger as $$
declare
  p1_id uuid; p2_id uuid; p3_id uuid; p4_id uuid; p5_id uuid; p6_id uuid;
begin
  -- 创建 profile
  insert into public.profiles (id, email)
  values (new.id, new.email);

  -- 插入 6 条默认房源（is_demo 标记，方便一键清除）
  insert into public.properties (id, user_id, name, price, price_per_sqm, layout, area, district, floor, orientation, decoration, age, status, tags, last_viewing, is_favorite, is_demo)
  values (gen_random_uuid(), new.id, '万科金域华府', 520, 5.2, '3室2厅2卫', 100, '朝阳区', '15/28层', '南北通透', '精装修', 5, 'viewed', '{"采光好","南北通透","地铁近"}', '2024-03-15', true, true)
  returning id into p1_id;

  insert into public.properties (id, user_id, name, price, price_per_sqm, layout, area, district, floor, orientation, decoration, age, status, tags, is_favorite, is_demo)
  values (gen_random_uuid(), new.id, '龙湖春江郦城', 380, 4.75, '2室2厅1卫', 80, '海淀区', '8/18层', '东南', '毛坯', 3, 'pending', '{"房东急售","可议价","学区房"}', false, true)
  returning id into p2_id;

  insert into public.properties (id, user_id, name, price, price_per_sqm, layout, area, district, floor, orientation, decoration, age, status, tags, last_viewing, is_favorite, is_demo)
  values (gen_random_uuid(), new.id, '绿地海珀云庭', 680, 5.67, '4室2厅2卫', 120, '浦东新区', '22/30层', '南', '豪装', 2, 'viewed', '{"豪装","江景房","品牌开发商"}', '2024-03-10', true, true)
  returning id into p3_id;

  insert into public.properties (id, user_id, name, price, price_per_sqm, layout, area, district, floor, orientation, decoration, age, status, tags, last_viewing, is_favorite, is_demo)
  values (gen_random_uuid(), new.id, '保利天悦', 450, 5.0, '3室2厅1卫', 90, '天河区', '12/25层', '西南', '简装', 8, 'sold', '{"已售","地铁上盖"}', '2024-02-20', false, true)
  returning id into p4_id;

  insert into public.properties (id, user_id, name, price, price_per_sqm, layout, area, district, floor, orientation, decoration, age, status, tags, is_favorite, is_demo)
  values (gen_random_uuid(), new.id, '中海锦城', 320, 4.0, '2室1厅1卫', 80, '南山区', '6/20层', '北', '精装修', 10, 'pending', '{"低楼层","噪音大","价格便宜"}', false, true)
  returning id into p5_id;

  insert into public.properties (id, user_id, name, price, price_per_sqm, layout, area, district, floor, orientation, decoration, age, status, tags, last_viewing, is_favorite, is_demo)
  values (gen_random_uuid(), new.id, '融创壹号院', 580, 5.27, '3室2厅2卫', 110, '江北新区', '18/32层', '南北通透', '精装修', 1, 'viewed', '{"次新房","采光好","户型方正"}', '2024-03-12', true, true)
  returning id into p6_id;

  -- 插入看房记录
  insert into public.viewing_records (property_id, visit_number, date, notes, photos) values
    (p1_id, 2, '2024-03-15', '第二次看房，整体感觉不错，采光很好，客厅朝南，下午阳光充足。楼下有个小花园，环境安静。', '{}'),
    (p1_id, 1, '2024-03-01', '首次看房，整体印象良好。房东态度友好，房子保养得不错。', '{}'),
    (p3_id, 1, '2024-03-10', '高层江景视野很好，装修风格现代简约，家具家电齐全可直接入住。缺点是价格偏高。', '{}'),
    (p4_id, 1, '2024-02-20', '地铁上盖位置非常好，但已经被其他买家签约了。', '{}'),
    (p6_id, 1, '2024-03-12', '房子很新，几乎没怎么住过。户型方正，得房率高。小区绿化很好，有儿童游乐设施。', '{}');

  -- 插入 AI 分析
  insert into public.ai_analyses (property_id, pros, cons, suitable_for, negotiation_tips) values
    (p1_id,
     '{"采光充足，南北通透","小区环境优美，绿化率高","距离地铁站步行5分钟","房龄较新，物业管理规范"}',
     '{"单价略高于周边均价","主卧面积偏小","停车位紧张"}',
     '{"改善型家庭","有孩子的家庭","注重通勤便利的上班族"}',
     '{"可尝试以周边成交价为参考议价","房东急售，有5-10万议价空间","建议关注同小区其他房源对比"}'),
    (p2_id,
     '{"价格低于市场均价","房龄新，设施完善","对口优质学区"}',
     '{"毛坯房需要装修投入","朝向非正南","楼层偏低"}',
     '{"首次置业刚需","有学区需求的家庭","投资客"}',
     '{"房东急售，议价空间较大","可争取10-15万优惠","注意了解急售原因"}'),
    (p3_id,
     '{"高层江景，视野开阔","豪华装修，拎包入住","品牌开发商，品质有保障","小区配套完善"}',
     '{"总价较高","物业费偏高","距离地铁站较远"}',
     '{"高端改善需求","注重生活品质的家庭","有车一族"}',
     '{"高端房源议价空间有限","可尝试争取车位或物业费优惠","关注开发商促销活动"}'),
    (p5_id,
     '{"价格实惠，性价比高","精装修省去装修成本","小区成熟，配套完善"}',
     '{"朝北采光差","临街噪音较大","房龄偏老"}',
     '{"预算有限的刚需","过渡性居住","出租投资"}',
     '{"因朝向和噪音问题可大力议价","预计有15-20万议价空间","可要求业主承担部分税费"}'),
    (p6_id,
     '{"次新房，品质有保障","户型方正，空间利用率高","小区配套完善","南北通透，通风采光好"}',
     '{"新区配套仍在完善中","距离市中心较远","周边商业较少"}',
     '{"改善型需求","有孩子的家庭","看好新区发展的投资者"}',
     '{"新房限售期刚过，业主可能急于变现","可尝试议价8-12万","关注同期房源挂牌价格"}');

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
alter table properties enable row level security;
alter table viewing_records enable row level security;
alter table ai_analyses enable row level security;
alter table column_configs enable row level security;

-- profiles
create policy "用户查看自己的资料" on profiles for select using (auth.uid() = id);
create policy "用户更新自己的资料" on profiles for update using (auth.uid() = id);

-- properties
create policy "用户查看自己的房源" on properties for select using (auth.uid() = user_id);
create policy "用户新增自己的房源" on properties for insert with check (auth.uid() = user_id);
create policy "用户更新自己的房源" on properties for update using (auth.uid() = user_id);
create policy "用户删除自己的房源" on properties for delete using (auth.uid() = user_id);

-- viewing_records
create policy "用户查看自己房源的看房记录" on viewing_records for select
  using (property_id in (select id from properties where user_id = auth.uid()));
create policy "用户添加自己房源的看房记录" on viewing_records for insert
  with check (property_id in (select id from properties where user_id = auth.uid()));
create policy "用户更新自己房源的看房记录" on viewing_records for update
  using (property_id in (select id from properties where user_id = auth.uid()));
create policy "用户删除自己房源的看房记录" on viewing_records for delete
  using (property_id in (select id from properties where user_id = auth.uid()));

-- ai_analyses
create policy "用户查看自己房源的AI分析" on ai_analyses for select
  using (property_id in (select id from properties where user_id = auth.uid()));
create policy "用户添加自己房源的AI分析" on ai_analyses for insert
  with check (property_id in (select id from properties where user_id = auth.uid()));
create policy "用户更新自己房源的AI分析" on ai_analyses for update
  using (property_id in (select id from properties where user_id = auth.uid()));
create policy "用户删除自己房源的AI分析" on ai_analyses for delete
  using (property_id in (select id from properties where user_id = auth.uid()));

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
