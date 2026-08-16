-- Keep property screenshots and viewing photos private. Clients store object
-- references and request short-lived signed URLs after authentication.

insert into storage.buckets (id, name, public)
values ('property-images', 'property-images', false)
on conflict (id) do update set public = false;

drop policy if exists "公开查看图片" on storage.objects;
drop policy if exists "用户查看自己的图片" on storage.objects;

create policy "用户查看自己的图片" on storage.objects for select
  using (
    bucket_id = 'property-images'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
