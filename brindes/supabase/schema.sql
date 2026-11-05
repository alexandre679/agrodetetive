-- ============================================================
--  Sistema de Brindes — estrutura do banco (Supabase)
--  Cole tudo no Supabase: SQL Editor → New query → Run
-- ============================================================

create table if not exists clientes (
  id uuid primary key,
  created_at timestamptz default now(),
  nome text not null,
  empresa text,
  documento text,
  telefone text,
  email text,
  cidade text,
  endereco text,
  data_especial text,
  observacoes text
);

create table if not exists produtos (
  id uuid primary key,
  created_at timestamptz default now(),
  nome text not null,
  codigo text,
  categoria text,
  custo numeric default 0,
  faixas jsonb default '[]'::jsonb,   -- [{ "min": 1, "preco": 5.00 }, { "min": 51, "preco": 4.50 }]
  ativo boolean default true,
  observacoes text
);

create table if not exists orcamentos (
  id uuid primary key,
  created_at timestamptz default now(),
  numero int,
  cliente_id uuid references clientes(id) on delete set null,
  data date,
  validade date,
  itens jsonb default '[]'::jsonb,
  frete numeric default 0,
  desconto numeric default 0,
  total numeric default 0,
  status text,
  prazo text,
  entrega date,
  observacoes text,
  pedido_id uuid
);

create table if not exists pedidos (
  id uuid primary key,
  created_at timestamptz default now(),
  numero int,
  cliente_id uuid references clientes(id) on delete set null,
  orcamento_id uuid,
  data date,
  entrega date,
  itens jsonb default '[]'::jsonb,
  frete numeric default 0,
  desconto numeric default 0,
  total numeric default 0,
  status text,
  pagamento text,
  valor_pago numeric default 0,
  observacoes text
);

create table if not exists config (
  id int primary key,
  dados jsonb
);

-- Segurança: só usuários logados acessam os dados
alter table clientes   enable row level security;
alter table produtos   enable row level security;
alter table orcamentos enable row level security;
alter table pedidos    enable row level security;
alter table config     enable row level security;

create policy "logado_clientes"   on clientes   for all to authenticated using (true) with check (true);
create policy "logado_produtos"   on produtos   for all to authenticated using (true) with check (true);
create policy "logado_orcamentos" on orcamentos for all to authenticated using (true) with check (true);
create policy "logado_pedidos"    on pedidos    for all to authenticated using (true) with check (true);
create policy "logado_config"     on config     for all to authenticated using (true) with check (true);
