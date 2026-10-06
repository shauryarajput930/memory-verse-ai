-- MemoryVerse AI — Supabase Schema Setup
-- Run this ENTIRE script in your Supabase SQL Editor.

-- 1. Enable pgvector extension
create extension if not exists vector;

-- 2. Documents table (384 dimensions for all-MiniLM-L6-v2)
create table if not exists documents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  file_url text not null,
  file_type text,
  raw_text text,
  title text,
  category text,
  issuer text,
  event_date date,
  summary text,
  embedding vector(384),
  created_at timestamp default now()
);

-- 3. Relationships table
create table if not exists relationships (
  id uuid primary key default gen_random_uuid(),
  source_doc_id uuid references documents(id),
  target_doc_id uuid references documents(id),
  relationship_type text,
  confidence float,
  created_at timestamp default now()
);

-- 4. Vector similarity index
create index if not exists documents_embedding_idx
  on documents using ivfflat (embedding vector_cosine_ops)
  with (lists = 1);

-- 5. RPC function for pgvector similarity search
--    Called by Module 3 (relationships) and Module 5 (search)
create or replace function match_documents(
  query_embedding vector(384),
  match_user_id text,
  exclude_doc_id text,
  match_count int default 10,
  match_threshold float default 0.3
)
returns table (
  id uuid,
  title text,
  category text,
  summary text,
  file_url text,
  similarity float
)
language plpgsql
as $$
begin
  return query
  select
    d.id,
    d.title,
    d.category,
    d.summary,
    d.file_url,
    1 - (d.embedding <=> query_embedding) as similarity
  from documents d
  where d.user_id::text = match_user_id
    and d.id::text != exclude_doc_id
    and d.embedding is not null
    and 1 - (d.embedding <=> query_embedding) > match_threshold
  order by d.embedding <=> query_embedding
  limit match_count;
end;
$$;
