-- Create storage bucket for lawyer profile photos
insert into storage.buckets (id, name, public)
values ('lawyer-profiles', 'lawyer-profiles', true);

-- RLS policies for lawyer profile photos
create policy "Authenticated lawyers can upload their profile photos"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'lawyer-profiles' 
  and (storage.foldername(name))[1] = auth.uid()::text
  and auth.uid() in (select id from lawyer_profiles where is_active = true)
);

create policy "Anyone can view public profile photos"
on storage.objects for select
to public
using (bucket_id = 'lawyer-profiles');

create policy "Lawyers can update their own profile photos"
on storage.objects for update
to authenticated
using (
  bucket_id = 'lawyer-profiles' 
  and (storage.foldername(name))[1] = auth.uid()::text
  and auth.uid() in (select id from lawyer_profiles where is_active = true)
);

create policy "Lawyers can delete their own profile photos"
on storage.objects for delete
to authenticated
using (
  bucket_id = 'lawyer-profiles' 
  and (storage.foldername(name))[1] = auth.uid()::text
  and auth.uid() in (select id from lawyer_profiles where is_active = true)
);