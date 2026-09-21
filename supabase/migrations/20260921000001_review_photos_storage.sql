-- Dedicated public storage bucket for curated Google review photos.

insert into storage.buckets (id, name, public)
values ('yamachan-reviews', 'yamachan-reviews', true)
on conflict (id) do nothing;

create policy "Public read access for yamachan-reviews"
on storage.objects for select
using (bucket_id = 'yamachan-reviews');

create policy "Allow uploads to yamachan-reviews"
on storage.objects for insert
with check (bucket_id = 'yamachan-reviews');
