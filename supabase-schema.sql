-- Execute este arquivo no SQL Editor do projeto Supabase.
create table if not exists public.profiles (
    id uuid primary key references auth.users (id) on delete cascade,
    name text not null check (length(trim(name)) between 1 and 100),
    phone text not null check (length(trim(phone)) between 1 and 20),
    city text not null check (length(trim(city)) between 1 and 100),
    participation text not null check (
        participation in ('adotante', 'tutor', 'voluntario')
    ),
    created_at timestamptz not null default now()
);

create or replace function public.create_profile_for_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
    insert into public.profiles (id, name, phone, city, participation)
    values (
        new.id,
        coalesce(new.raw_user_meta_data ->> 'name', ''),
        coalesce(new.raw_user_meta_data ->> 'phone', ''),
        coalesce(new.raw_user_meta_data ->> 'city', ''),
        coalesce(new.raw_user_meta_data ->> 'participation', 'adotante')
    );
    return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
    after insert on auth.users
    for each row execute function public.create_profile_for_new_user();

create table if not exists public.animal_listings (
    id uuid primary key default gen_random_uuid(),
    owner_id uuid not null references auth.users (id) on delete cascade,
    category text not null check (category in ('adoption', 'lost', 'found')),
    pet_name text not null check (length(trim(pet_name)) between 1 and 100),
    pet_type text not null check (pet_type in ('Cachorro', 'Gato', 'Outro')),
    characteristics text not null
        check (length(trim(characteristics)) between 1 and 200),
    event_date date,
    event_time time,
    city text not null check (length(trim(city)) between 1 and 100),
    neighborhood text not null
        check (length(trim(neighborhood)) between 1 and 100),
    description text not null default '' check (length(description) <= 2000),
    status text not null default 'active'
        check (status in ('active', 'resolved')),
    created_at timestamptz not null default now()
);

create table if not exists public.listing_contacts (
    listing_id uuid primary key references public.animal_listings (id)
        on delete cascade,
    owner_id uuid not null references auth.users (id) on delete cascade,
    contact_name text not null
        check (length(trim(contact_name)) between 1 and 100),
    contact_info text not null
        check (length(trim(contact_info)) between 3 and 150),
    created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;
alter table public.animal_listings enable row level security;
alter table public.listing_contacts enable row level security;

drop policy if exists "Users can read their own profile" on public.profiles;
create policy "Users can read their own profile"
    on public.profiles for select to authenticated
    using ((select auth.uid()) = id);

drop policy if exists "Users can update their own profile" on public.profiles;
create policy "Users can update their own profile"
    on public.profiles for update to authenticated
    using ((select auth.uid()) = id)
    with check ((select auth.uid()) = id);

drop policy if exists "Anyone can read active listings"
    on public.animal_listings;
create policy "Anyone can read active listings"
    on public.animal_listings for select to anon, authenticated
    using (status = 'active' or (select auth.uid()) = owner_id);

drop policy if exists "Owners can read their listings"
    on public.animal_listings;
create policy "Owners can read their listings"
    on public.animal_listings for select to authenticated
    using ((select auth.uid()) = owner_id);

drop policy if exists "Owners can update their listings"
    on public.animal_listings;
create policy "Owners can update their listings"
    on public.animal_listings for update to authenticated
    using ((select auth.uid()) = owner_id)
    with check ((select auth.uid()) = owner_id);

drop policy if exists "Owners can delete their listings"
    on public.animal_listings;
create policy "Owners can delete their listings"
    on public.animal_listings for delete to authenticated
    using ((select auth.uid()) = owner_id);

drop policy if exists "Owners can read their contacts"
    on public.listing_contacts;
create policy "Owners can read their contacts"
    on public.listing_contacts for select to authenticated
    using ((select auth.uid()) = owner_id);

create or replace function public.create_animal_listing(
    p_category text,
    p_pet_name text,
    p_pet_type text,
    p_characteristics text,
    p_city text,
    p_neighborhood text,
    p_contact_name text,
    p_contact_info text,
    p_event_date date default null,
    p_event_time time default null,
    p_description text default ''
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
    new_listing_id uuid;
begin
    if auth.uid() is null then
        raise exception 'Entre na sua conta para publicar um anúncio.';
    end if;

    insert into public.animal_listings (
        owner_id, category, pet_name, pet_type, characteristics,
        event_date, event_time, city, neighborhood, description
    )
    values (
        auth.uid(), p_category, p_pet_name, p_pet_type, p_characteristics,
        p_event_date, p_event_time, p_city, p_neighborhood, p_description
    )
    returning id into new_listing_id;

    insert into public.listing_contacts (
        listing_id, owner_id, contact_name, contact_info
    )
    values (
        new_listing_id, auth.uid(), p_contact_name, p_contact_info
    );

    return new_listing_id;
end;
$$;

create or replace function public.get_listing_contact(p_listing_id uuid)
returns table (contact_name text, contact_info text)
language sql
stable
security definer
set search_path = ''
as $$
    select contacts.contact_name, contacts.contact_info
    from public.listing_contacts as contacts
    join public.animal_listings as listings
        on listings.id = contacts.listing_id
    where listings.id = p_listing_id
      and listings.status = 'active';
$$;

revoke select on public.animal_listings from public, anon, authenticated;
grant select (
    id, category, pet_name, pet_type, characteristics, event_date, event_time,
    city, neighborhood, description, status, created_at
) on public.animal_listings to anon;
grant select (
    id, owner_id, category, pet_name, pet_type, characteristics, event_date,
    event_time, city, neighborhood, description, status, created_at
) on public.animal_listings to authenticated;
grant select, update on public.profiles to authenticated;
grant update (status) on public.animal_listings to authenticated;
grant delete on public.animal_listings to authenticated;
revoke all on public.listing_contacts from public, anon, authenticated;
grant select on public.listing_contacts to authenticated;
revoke all on function public.create_animal_listing(
    text, text, text, text, text, text, text, text, date, time, text
) from public;
revoke all on function public.get_listing_contact(uuid) from public;
grant execute on function public.create_animal_listing(
    text, text, text, text, text, text, text, text, date, time, text
) to authenticated;
grant execute on function public.get_listing_contact(uuid) to anon, authenticated;
