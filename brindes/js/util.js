// Funções utilitárias (formatação, datas, preços, WhatsApp)
const U = {
  esc(s) {
    return String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  },

  money(v) {
    return Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  },

  // Aceita "4.5", "4,50", "1.234,56" ou número
  num(v) {
    if (typeof v === 'number') return isNaN(v) ? 0 : v;
    const s = String(v ?? '').trim().replace(/\s|R\$/g, '');
    if (!s) return 0;
    const n = s.includes(',') ? Number(s.replace(/\./g, '').replace(',', '.')) : Number(s);
    return isNaN(n) ? 0 : n;
  },

  hoje() {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  },

  addDias(data, n) {
    const d = new Date(data + 'T12:00:00');
    d.setDate(d.getDate() + n);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  },

  fmtData(d) {
    if (!d) return '—';
    const [y, m, dd] = String(d).slice(0, 10).split('-');
    return `${dd}/${m}/${y}`;
  },

  diasDesde(d) {
    if (!d) return null;
    return Math.round((Date.parse(U.hoje()) - Date.parse(String(d).slice(0, 10))) / 86400000);
  },

  uid() {
    if (window.crypto?.randomUUID) return crypto.randomUUID();
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
      const r = (Math.random() * 16) | 0;
      return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
    });
  },

  pad(n) {
    return String(n || 0).padStart(4, '0');
  },

  primeiroNome(nome) {
    return String(nome || '').trim().split(/\s+/)[0] || '';
  },

  // ---- WhatsApp ----
  telWa(tel) {
    let d = String(tel || '').replace(/\D/g, '');
    if (!d) return '';
    if (d.length <= 11) d = '55' + d; // número brasileiro sem DDI
    return d;
  },

  waLink(tel, msg) {
    return `https://wa.me/${U.telWa(tel)}?text=${encodeURIComponent(msg)}`;
  },

  // ---- Preço por faixa de quantidade ----
  faixasOrdenadas(prod) {
    return (prod?.faixas || [])
      .map(f => ({ min: Number(f.min) || 0, preco: Number(f.preco) || 0 }))
      .filter(f => f.min > 0)
      .sort((a, b) => a.min - b.min);
  },

  // Usa a maior faixa cujo "a partir de" seja <= quantidade
  precoPorQtd(prod, qtd) {
    const f = U.faixasOrdenadas(prod);
    if (!f.length) return 0;
    let preco = f[0].preco;
    for (const x of f) if (qtd >= x.min) preco = x.preco;
    return preco;
  },

  descreverFaixas(prod) {
    const f = U.faixasOrdenadas(prod);
    return f.map((x, i) => {
      const prox = f[i + 1];
      const faixa = !prox ? `${x.min}+` : (prox.min - 1 === x.min ? `${x.min}` : `${x.min} a ${prox.min - 1}`);
      return `${faixa} un: ${U.money(x.preco)}`;
    }).join(' · ');
  },
};
