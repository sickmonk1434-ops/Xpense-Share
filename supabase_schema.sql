-- Create a table for public profiles
create table profiles (
  id uuid references auth.users not null primary key,
  email text,
  full_name text,
  avatar_url text,
  updated_at timestamp with time zone
);

-- Set up Row Level Security (RLS)
-- See https://supabase.com/docs/guides/auth/row-level-security for more details.
alter table profiles enable row level security;

create policy "Public profiles are viewable by everyone." on profiles
  for select using (true);

create policy "Users can insert their own profile." on profiles
  for insert with check (auth.uid() = id);

create policy "Users can update own profile." on profiles
  for update using (auth.uid() = id);

-- Create a table for Groups
create table groups (
  id uuid default uuid_generate_v4() primary key,
  name text not null,
  created_by uuid references auth.users not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table groups enable row level security;

create policy "Groups are viewable by members." on groups
  for select using (
    exists (
      select 1 from group_members
      where group_members.group_id = groups.id
      and group_members.user_id = auth.uid()
    )
  );

create policy "Users can create groups." on groups
  for insert with check (auth.uid() = created_by);

-- Link users to groups
create table group_members (
  id uuid default uuid_generate_v4() primary key,
  group_id uuid references groups on delete cascade not null,
  user_id uuid references profiles(id) not null,
  joined_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique(group_id, user_id)
);

alter table group_members enable row level security;

create policy "Members can view other members in their groups." on group_members
  for select using (
    exists (
      select 1 from group_members as gm
      where gm.group_id = group_members.group_id
      and gm.user_id = auth.uid()
    )
  );

create policy "Group creators can add members." on group_members
  for insert with check (
    exists (
      select 1 from groups
      where groups.id = group_members.group_id
      and groups.created_by = auth.uid()
    )
  );

-- Expenses Table
create table expenses (
  id uuid default uuid_generate_v4() primary key,
  group_id uuid references groups on delete cascade,
  description text not null,
  amount numeric not null,
  payer_id uuid references profiles(id) not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  created_by uuid references auth.users not null
);

alter table expenses enable row level security;

create policy "Group members can view expenses." on expenses
  for select using (
    exists (
      select 1 from group_members
      where group_members.group_id = expenses.group_id
      and group_members.user_id = auth.uid()
    )
  );

create policy "Group members can add expenses." on expenses
  for insert with check (
    exists (
      select 1 from group_members
      where group_members.group_id = expenses.group_id
      and group_members.user_id = auth.uid()
    )
  );


-- Expense Splits (Who owes what)
create table expense_splits (
  id uuid default uuid_generate_v4() primary key,
  expense_id uuid references expenses on delete cascade not null,
  user_id uuid references profiles(id) not null,
  amount_owed numeric not null
);

alter table expense_splits enable row level security;

create policy "Group members can view splits." on expense_splits
  for select using (
    exists (
      select 1 from expenses
      join group_members on group_members.group_id = expenses.group_id
      where expenses.id = expense_splits.expense_id
      and group_members.user_id = auth.uid()
    )
  );

-- Function to handle new user signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, full_name, avatar_url)
  values (new.id, new.email, new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'avatar_url');
  return new;
end;
$$ language plpgsql security definer;

-- Trigger the function every time a user is created
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
