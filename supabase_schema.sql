-- 关怀记录表，避免重复发送
create table if not exists public.nudges (
  id            bigserial primary key,
  user_id       uuid not null,
  reason        text,
  model_input   jsonb default '{}'::jsonb,
  model_output  jsonb default '{}'::jsonb,
  sent_at       timestamptz default now(),
  email_sent    boolean default false
);
alter table public.nudges enable row level security;
do $$ begin
  perform 1 from pg_policies where polname = 'nudges_service_can_insert';
  if not found then
    create policy nudges_service_can_insert on public.nudges for insert
    to authenticated, service_role using (true) with check (true);
  end if;
end $$;
create index if not exists idx_nudges_user_time on public.nudges(user_id, sent_at desc);
create index if not exists idx_nudges_user_week on public.nudges(user_id, date_trunc('week', sent_at));

-- 候选用户筛选函数：
-- 逻辑：24小时不上线 + 一周内未发过邮件 + 有负向情绪历史
drop function if exists public.pick_users_for_nudge();
create or replace function public.pick_users_for_nudge()
returns table(
  user_id uuid,
  last_complaint text,
  summary text,
  longmem text[],
  hours_inactive integer
)
language sql
security definer
set search_path = public
as $$
  with user_last_activity as (
    -- 获取每个用户的最后活跃时间
    select 
      m.user_id,
      max(m.created_at) as last_activity,
      extract(epoch from (now() - max(m.created_at))) / 3600 as hours_since_last_activity
    from messages m
    where m.role = 'user'
    group by m.user_id
  ),
  inactive_users as (
    -- 筛选24小时以上不活跃的用户
    select user_id, last_activity, hours_since_last_activity::integer as hours_inactive
    from user_last_activity
    where hours_since_last_activity >= 24
  ),
  users_with_negative_history as (
    -- 在过去7天内有负向情绪的用户
    select distinct 
      m.user_id,
      substring(
        (array_agg(m.content order by m.created_at desc))[1] for 180
      ) as last_complaint
    from messages m
    where m.role = 'user'
      and (
        m.content ilike '%焦虑%' or m.content ilike '%失眠%' or
        m.content ilike '%难过%' or m.content ilike '%压力%' or
        m.content ilike '%anxiety%' or m.content ilike '%insomnia%' or
        m.content ilike '%depress%' or m.content ilike '%stress%' or
        m.content ilike '%sad%' or m.content ilike '%worry%' or
        m.content ilike '%upset%' or m.content ilike '%tired%'
      )
      and m.created_at > now() - interval '7 days'
    group by m.user_id
  )
  select
    iu.user_id,
    uwnh.last_complaint,
    (
      select s.summary_text
      from session_summaries s
      join sessions se on se.id = s.session_id
      where se.user_id = iu.user_id
      order by s.updated_at desc
      limit 1
    ) as summary,
    (
      select array(
        select ml.text
        from user_long_memory ml
        where ml.user_id = iu.user_id
        order by ml.created_at desc
        limit 3
      )
    ) as longmem,
    iu.hours_inactive
  from inactive_users iu
  join users_with_negative_history uwnh on uwnh.user_id = iu.user_id
  where not exists (
    -- 确保本周还没有发过邮件
    select 1 from nudges n
     where n.user_id = iu.user_id
       and n.email_sent = true
       and n.sent_at > date_trunc('week', now())
  )
  order by iu.hours_inactive desc  -- 优先关怀更久没上线的用户
  limit 10;  -- 每次最多处理10个用户，避免邮件过多
$$;