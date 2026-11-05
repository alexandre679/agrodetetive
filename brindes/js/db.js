// Camada de dados: usa Supabase (nuvem) se configurado, senão o navegador (modo local)
const DB = (() => {
  const cfg = window.APP_CONFIG || {};
  const remoto = !!(cfg.SUPABASE_URL && cfg.SUPABASE_ANON_KEY && window.supabase);
  const sb = remoto ? window.supabase.createClient(cfg.SUPABASE_URL, cfg.SUPABASE_ANON_KEY) : null;
  const TABELAS = ['clientes', 'produtos', 'orcamentos', 'pedidos'];
  const cache = {};

  const lkey = t => 'brindes_' + t;
  const lread = t => { try { return JSON.parse(localStorage.getItem(lkey(t)) || '[]'); } catch { return []; } };
  const lwrite = (t, rows) => localStorage.setItem(lkey(t), JSON.stringify(rows));

  // Postgres não aceita '' em campos de data/número: troca por null
  const limpar = obj => {
    const o = {};
    for (const [k, v] of Object.entries(obj)) o[k] = v === '' ? null : v;
    return o;
  };

  async function list(t) {
    if (cache[t]) return cache[t];
    let rows;
    if (remoto) {
      const { data, error } = await sb.from(t).select('*').order('created_at');
      if (error) throw error;
      rows = data;
    } else {
      rows = lread(t);
    }
    cache[t] = rows;
    return rows;
  }

  async function save(t, obj) {
    obj = { ...obj };
    if (!obj.id) obj.id = U.uid();
    if (!obj.created_at) obj.created_at = new Date().toISOString();
    if (remoto) {
      const { data, error } = await sb.from(t).upsert(limpar(obj)).select().single();
      if (error) throw error;
      obj = data;
    } else {
      const rows = lread(t);
      const i = rows.findIndex(r => r.id === obj.id);
      if (i >= 0) rows[i] = obj; else rows.push(obj);
      lwrite(t, rows);
    }
    const c = cache[t];
    if (c) {
      const i = c.findIndex(r => r.id === obj.id);
      if (i >= 0) c[i] = obj; else c.push(obj);
    }
    return obj;
  }

  async function remove(t, id) {
    if (remoto) {
      const { error } = await sb.from(t).delete().eq('id', id);
      if (error) throw error;
    } else {
      lwrite(t, lread(t).filter(r => r.id !== id));
    }
    if (cache[t]) cache[t] = cache[t].filter(r => r.id !== id);
  }

  async function getConfig() {
    if (remoto) {
      const { data, error } = await sb.from('config').select('*').eq('id', 1).maybeSingle();
      if (error) throw error;
      return data?.dados || {};
    }
    try { return JSON.parse(localStorage.getItem('brindes_config') || '{}'); } catch { return {}; }
  }

  async function saveConfig(dados) {
    if (remoto) {
      const { error } = await sb.from('config').upsert({ id: 1, dados });
      if (error) throw error;
    } else {
      localStorage.setItem('brindes_config', JSON.stringify(dados));
    }
  }

  async function exportar() {
    const out = { versao: 1, exportado_em: new Date().toISOString(), config: await getConfig() };
    for (const t of TABELAS) out[t] = await list(t);
    return out;
  }

  async function importar(json) {
    for (const t of TABELAS) {
      const rows = Array.isArray(json[t]) ? json[t] : [];
      if (remoto) {
        if (rows.length) {
          const { error } = await sb.from(t).upsert(rows.map(limpar));
          if (error) throw error;
        }
      } else {
        const atuais = lread(t);
        for (const r of rows) {
          const i = atuais.findIndex(x => x.id === r.id);
          if (i >= 0) atuais[i] = r; else atuais.push(r);
        }
        lwrite(t, atuais);
      }
      delete cache[t];
    }
    if (json.config) await saveConfig({ ...(await getConfig()), ...json.config });
  }

  // ---- Login (só no modo nuvem) ----
  async function sessao() {
    if (!remoto) return true;
    const { data } = await sb.auth.getSession();
    return data.session;
  }
  async function login(email, senha) {
    const { error } = await sb.auth.signInWithPassword({ email, password: senha });
    if (error) throw error;
  }
  async function logout() {
    if (remoto) await sb.auth.signOut();
  }

  return { remoto, TABELAS, list, save, remove, getConfig, saveConfig, exportar, importar, sessao, login, logout };
})();
