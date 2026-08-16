-- Daily funnel summary in Asia/Shanghai. Run in Supabase SQL Editor.
with event_summary as (
  select
    (created_at at time zone 'Asia/Shanghai')::date as day,
    coalesce(utm_source, 'direct') as source,
    coalesce(utm_campaign, 'none') as campaign,
    event_name,
    count(*) as event_count,
    count(distinct anonymous_id) as devices,
    count(distinct user_id) filter (where user_id is not null) as users
  from public.analytics_events
  where created_at >= now() - interval '30 days'
    and coalesce(utm_source, '') <> 'internal'
  group by 1, 2, 3, 4
)
select *
from event_summary
order by day desc, source, campaign, event_name;

-- Campaign-level conversion for the events that define the growth target.
select
  coalesce(utm_source, 'direct') as source,
  coalesce(utm_campaign, 'none') as campaign,
  count(distinct anonymous_id) filter (where event_name = 'landing_viewed') as landing_devices,
  count(distinct anonymous_id) filter (where event_name = 'signup_succeeded') as signup_devices,
  count(distinct user_id) filter (
    where event_name = 'activation_completed' and user_id is not null
  ) as activated_users
from public.analytics_events
where created_at >= now() - interval '30 days'
  and coalesce(utm_source, '') <> 'internal'
group by 1, 2
order by activated_users desc, signup_devices desc, landing_devices desc;
