// ============================================================
//  Sistema de Gestão de Brindes — telas e regras
// ============================================================
const main = document.getElementById('main');
const ORC_STATUS = ['Pendente', 'Enviado', 'Aprovado', 'Recusado'];
const PED_STATUS = ['Aguardando arte', 'Arte aprovada', 'Em produção', 'Pronto', 'Entregue', 'Cancelado'];
const PAGAMENTOS = ['Pendente', 'Sinal pago', 'Pago'];
const pedAberto = p => !['Entregue', 'Cancelado'].includes(p.status);
const orcAberto = o => ['Pendente', 'Enviado'].includes(o.status);

const CFG_PADRAO = {
  empresa: 'Minha Empresa de Brindes',
  cnpj: '', telefone: '', email: '', endereco: '', logo: '',
  diasAlerta: 90,
  validadeDias: 15,
  prazoPadrao: '10 dias úteis após aprovação da arte',
  condicoes: 'Pagamento: 50% na aprovação e 50% na entrega.\nA arte é enviada para aprovação antes da produção.',
  msgReativar: 'Olá {nome}, tudo bem? Aqui é da {empresa}! Faz um tempinho que não conversamos. Temos novidades em brindes personalizados — posso te mandar algumas ideias?',
};
let CFG = { ...CFG_PADRAO };

const { esc, money } = U;

// ---------- Ajudantes ----------
async function dados() {
  const [clientes, produtos, orcamentos, pedidos] = await Promise.all(DB.TABELAS.map(t => DB.list(t)));
  return { clientes, produtos, orcamentos, pedidos };
}
const mapa = arr => Object.fromEntries(arr.map(x => [x.id, x]));
const proximoNumero = rows => rows.reduce((m, r) => Math.max(m, Number(r.numero) || 0), 0) + 1;
const ir = h => { location.hash = h; };
const porNome = (a, b) => String(a.nome || '').localeCompare(String(b.nome || ''), 'pt-BR');

function statsPorCliente(pedidos) {
  const m = {};
  for (const p of pedidos) {
    if (p.status === 'Cancelado' || !p.cliente_id) continue;
    const s = (m[p.cliente_id] ||= { ultima: null, qtd: 0, total: 0 });
    s.qtd++;
    s.total += Number(p.total || 0);
    if (p.data && (!s.ultima || p.data > s.ultima)) s.ultima = p.data;
  }
  return m;
}

function badgeDias(dias) {
  if (dias == null) return '<span class="badge cinza">nunca comprou</span>';
  const a = Number(CFG.diasAlerta) || 90;
  const cls = dias >= a ? 'vermelho' : dias >= a / 2 ? 'amarelo' : 'verde';
  return `<span class="badge ${cls}">${dias} dia${dias === 1 ? '' : 's'}</span>`;
}

function badgeStatus(s) {
  const cores = {
    'Pendente': 'amarelo', 'Enviado': 'azul', 'Aprovado': 'verde', 'Recusado': 'cinza',
    'Aguardando arte': 'amarelo', 'Arte aprovada': 'azul', 'Em produção': 'azul', 'Pronto': 'verde',
    'Entregue': 'cinza', 'Cancelado': 'cinza', 'Sinal pago': 'azul', 'Pago': 'verde',
  };
  return `<span class="badge ${cores[s] || 'cinza'}">${esc(s || '—')}</span>`;
}

function opcoes(lista, atual) {
  return lista.map(v => `<option ${v === atual ? 'selected' : ''}>${esc(v)}</option>`).join('');
}

function campo(nome, label, valor, o = {}) {
  return `<label class="campo ${o.cls || ''}"><span>${label}</span><input name="${nome}" type="${o.type || 'text'}"
    value="${esc(valor ?? '')}" ${o.required ? 'required' : ''} ${o.placeholder ? `placeholder="${esc(o.placeholder)}"` : ''}
    ${o.step ? `step="${o.step}"` : ''} ${o.min != null ? `min="${o.min}"` : ''} ${o.list ? `list="${o.list}"` : ''}></label>`;
}
function area(nome, label, valor) {
  return `<label class="campo"><span>${label}</span><textarea name="${nome}">${esc(valor ?? '')}</textarea></label>`;
}
function selecao(nome, label, valor, lista) {
  return `<label class="campo"><span>${label}</span><select name="${nome}">${opcoes(lista, valor)}</select></label>`;
}

function toast(msg, tipo = '') {
  const el = document.createElement('div');
  el.className = 'toast ' + tipo;
  el.textContent = msg;
  document.getElementById('toasts').appendChild(el);
  setTimeout(() => el.remove(), tipo === 'erro' ? 6000 : 2500);
}

function erroMsg(e) {
  console.error(e);
  return e?.message || String(e);
}

function modal(titulo, corpo, { onSubmit, onOpen, largo, textoSalvar = 'Salvar' } = {}) {
  const el = document.createElement('div');
  el.className = 'modal-fundo';
  el.innerHTML = `<form class="modal ${largo ? 'largo' : ''}" autocomplete="off">
    <header><h2>${esc(titulo)}</h2><button type="button" class="x" data-fechar aria-label="Fechar">×</button></header>
    <div class="modal-corpo">${corpo}</div>
    <footer><button type="button" class="btn sec" data-fechar>Cancelar</button><button class="btn">${textoSalvar}</button></footer>
  </form>`;
  const fechar = () => el.remove();
  el.addEventListener('mousedown', e => { if (e.target === el) el._fundo = true; });
  el.addEventListener('click', e => {
    if ((e.target === el && el._fundo) || e.target.closest('[data-fechar]')) fechar();
    el._fundo = false;
  });
  el.querySelector('form').addEventListener('submit', async e => {
    e.preventDefault();
    const btn = e.submitter; if (btn) btn.disabled = true;
    try {
      const ok = await onSubmit(Object.fromEntries(new FormData(e.target)), el);
      if (ok !== false) fechar();
    } catch (err) { toast('Erro: ' + erroMsg(err), 'erro'); }
    if (btn) btn.disabled = false;
  });
  document.body.appendChild(el);
  onOpen?.(el);
  el.querySelector('input, select, textarea')?.focus();
}

function confirmar(msg) { return window.confirm(msg); }

function abrirWhats(tel, msg) {
  if (!U.telWa(tel)) toast('Cliente sem WhatsApp cadastrado — escolha o contato no WhatsApp');
  window.open(U.waLink(tel, msg), '_blank');
}

function msgReativar(c, dias) {
  return String(CFG.msgReativar || '')
    .replaceAll('{nome}', U.primeiroNome(c.nome))
    .replaceAll('{empresa}', CFG.empresa)
    .replaceAll('{dias}', dias ?? '');
}

// ============================================================
//  Roteador
// ============================================================
const ROTAS = {
  painel: telaPainel,
  novo: (id, p) => telaEditor('orcamento', null, p),
  orcamentos: telaOrcamentos,
  orcamento: (id, p) => telaEditor('orcamento', id, p),
  pedidos: telaPedidos,
  pedido: (id, p) => telaEditor('pedido', id, p),
  clientes: telaClientes,
  cliente: telaCliente,
  produtos: telaProdutos,
  config: telaConfig,
};

function lerHash() {
  const h = location.hash.replace(/^#\/?/, '');
  const [caminho, qs] = h.split('?');
  const [rota, id] = caminho.split('/');
  return { rota: ROTAS[rota] ? rota : 'painel', id, params: new URLSearchParams(qs || '') };
}

async function render() {
  const { rota, id, params } = lerHash();
  document.querySelectorAll('#menu a').forEach(a => {
    const r = a.dataset.rota;
    a.classList.toggle('ativo', r === rota || (r === 'orcamentos' && rota === 'orcamento') ||
      (r === 'pedidos' && rota === 'pedido') || (r === 'clientes' && rota === 'cliente'));
  });
  main.onclick = main.oninput = main.onchange = null;
  try {
    await ROTAS[rota](id, params);
  } catch (e) {
    main.innerHTML = `<div class="cartao erro">Erro ao carregar: ${esc(erroMsg(e))}</div>`;
  }
  window.scrollTo(0, 0);
}

// ============================================================
//  Painel
// ============================================================
async function telaPainel() {
  const D = await dados();
  const cli = mapa(D.clientes);
  const stats = statsPorCliente(D.pedidos);
  const mes = U.hoje().slice(0, 7);
  const validos = D.pedidos.filter(p => p.status !== 'Cancelado');
  const vendasMes = validos.filter(p => String(p.data || '').startsWith(mes)).reduce((s, p) => s + Number(p.total || 0), 0);
  const andamento = D.pedidos.filter(pedAberto).sort((a, b) => String(a.entrega || '9999').localeCompare(String(b.entrega || '9999')));
  const aguardando = D.orcamentos.filter(orcAberto).sort((a, b) => String(b.data).localeCompare(String(a.data)));
  const aReceber = validos.filter(p => p.pagamento !== 'Pago')
    .reduce((s, p) => s + Math.max(0, Number(p.total || 0) - Number(p.valor_pago || 0)), 0);
  const alerta = Number(CFG.diasAlerta) || 90;
  const retomar = D.clientes
    .map(c => ({ c, dias: U.diasDesde(stats[c.id]?.ultima) }))
    .filter(x => x.dias != null && x.dias >= alerta)
    .sort((a, b) => b.dias - a.dias);

  main.innerHTML = `
    <div class="topo"><h1>Painel</h1>
      <div class="acoes"><a class="btn" href="#/novo">＋ Novo orçamento / pedido</a></div></div>
    ${DB.remoto ? '' : `<div class="aviso-local">Modo local: os dados estão salvos só neste navegador. Faça backup em
      <a href="#/config">Configurações</a> ou ative a nuvem (veja o LEIAME).</div>`}
    <div class="cards">
      <div class="card-num"><div class="rot">Vendas no mês</div><div class="val">${money(vendasMes)}</div></div>
      <div class="card-num"><div class="rot">Pedidos em andamento</div><div class="val">${andamento.length}</div></div>
      <div class="card-num"><div class="rot">Orçamentos aguardando</div><div class="val">${aguardando.length}</div></div>
      <div class="card-num"><div class="rot">A receber</div><div class="val">${money(aReceber)}</div></div>
    </div>
    <div class="colunas">
      <div class="cartao"><h2>Próximas entregas</h2>
        <div class="tabela-wrap"><table><thead><tr><th>Pedido</th><th>Cliente</th><th>Entrega</th><th>Status</th></tr></thead><tbody>
        ${andamento.slice(0, 10).map(p => {
          const atras = p.entrega && p.entrega < U.hoje();
          return `<tr class="link-linha" data-href="#/pedido/${p.id}"><td>#${U.pad(p.numero)}</td><td>${esc(cli[p.cliente_id]?.nome || '—')}</td>
            <td>${U.fmtData(p.entrega)} ${atras ? '<span class="badge vermelho">atrasado</span>' : ''}</td><td>${badgeStatus(p.status)}</td></tr>`;
        }).join('') || '<tr><td colspan="4" class="vazio">Nenhum pedido em andamento</td></tr>'}
        </tbody></table></div></div>

      <div class="cartao"><h2>Clientes para retomar contato <span class="dica">(${alerta}+ dias sem comprar)</span></h2>
        <div class="tabela-wrap"><table><thead><tr><th>Cliente</th><th>Última compra</th><th></th></tr></thead><tbody>
        ${retomar.slice(0, 10).map(({ c, dias }) => `<tr>
            <td><a href="#/cliente/${c.id}">${esc(c.nome)}</a>${c.empresa ? `<div class="dica">${esc(c.empresa)}</div>` : ''}</td>
            <td>${badgeDias(dias)}</td>
            <td class="n"><button class="btn whats peq" data-reativar="${c.id}">WhatsApp</button></td></tr>`).join('')
          || '<tr><td colspan="3" class="vazio">Nenhum cliente parado há muito tempo 👍</td></tr>'}
        </tbody></table></div>
        ${retomar.length > 10 ? `<a href="#/clientes?f=retomar">Ver todos (${retomar.length})</a>` : ''}
      </div>
    </div>
    <div class="cartao"><h2>Orçamentos aguardando resposta</h2>
      <div class="tabela-wrap"><table><thead><tr><th>Nº</th><th>Cliente</th><th>Data</th><th>Validade</th><th class="n">Total</th><th>Status</th></tr></thead><tbody>
      ${aguardando.slice(0, 10).map(o => {
        const venc = o.validade && o.validade < U.hoje();
        return `<tr class="link-linha" data-href="#/orcamento/${o.id}"><td>#${U.pad(o.numero)}</td><td>${esc(cli[o.cliente_id]?.nome || '—')}</td>
          <td>${U.fmtData(o.data)}</td><td>${U.fmtData(o.validade)} ${venc ? '<span class="badge vermelho">vencido</span>' : ''}</td>
          <td class="n">${money(o.total)}</td><td>${badgeStatus(o.status)}</td></tr>`;
      }).join('') || '<tr><td colspan="6" class="vazio">Nenhum orçamento aguardando</td></tr>'}
      </tbody></table></div></div>`;

  main.onclick = e => {
    const tr = e.target.closest('[data-href]');
    if (tr && !e.target.closest('a,button,select')) return ir(tr.dataset.href);
    const r = e.target.closest('[data-reativar]');
    if (r) {
      const c = cli[r.dataset.reativar];
      abrirWhats(c.telefone, msgReativar(c, U.diasDesde(stats[c.id]?.ultima)));
    }
  };
}

// ============================================================
//  Editor de orçamento / pedido (tela principal do dia a dia)
// ============================================================
async function telaEditor(tipo, id, params) {
  const D = await dados();
  const tabela = tipo === 'pedido' ? 'pedidos' : 'orcamentos';
  let doc;
  if (id && id !== 'novo') {
    doc = D[tabela].find(x => x.id === id);
    if (!doc) { main.innerHTML = '<div class="cartao vazio">Registro não encontrado.</div>'; return; }
  } else {
    doc = {
      data: U.hoje(), validade: U.addDias(U.hoje(), Number(CFG.validadeDias) || 15),
      itens: [], frete: 0, desconto: 0, status: 'Pendente', prazo: CFG.prazoPadrao || '', observacoes: '', entrega: '',
    };
    const base = params.get('de') && D.orcamentos.find(o => o.id === params.get('de'));
    if (base) {
      Object.assign(doc, {
        cliente_id: base.cliente_id, itens: JSON.parse(JSON.stringify(base.itens || [])),
        frete: base.frete, desconto: base.desconto, prazo: base.prazo, observacoes: base.observacoes,
      });
    }
    if (params.get('cliente')) doc.cliente_id = params.get('cliente');
  }
  const novo = !doc.id;
  const ehPedido = tipo === 'pedido';
  const stats = statsPorCliente(D.pedidos);
  let cli = D.clientes.find(c => c.id === doc.cliente_id);
  const itens = (doc.itens || []).map(i => ({ ...i }));
  if (!itens.length) itens.push({ produto_id: '', descricao: '', qtd: 1, preco: 0 });
  const produtosLista = D.produtos.filter(p => p.ativo !== false || itens.some(i => i.produto_id === p.id)).sort(porNome);
  const prodMap = mapa(D.produtos);
  let alterado = false;

  const orcOrigem = ehPedido && doc.orcamento_id ? D.orcamentos.find(o => o.id === doc.orcamento_id) : null;
  const pedGerado = !ehPedido && doc.pedido_id ? D.pedidos.find(p => p.id === doc.pedido_id) : null;

  const titulo = novo ? 'Novo orçamento / pedido' : `${ehPedido ? 'Pedido' : 'Orçamento'} nº ${U.pad(doc.numero)}`;
  const acoes = novo ? '' : `
    <button type="button" class="btn sec" data-acao="pdf">🖨️ PDF / Imprimir</button>
    <button type="button" class="btn whats" data-acao="whats">WhatsApp</button>
    ${!ehPedido && !pedGerado ? '<button type="submit" form="f-doc" class="btn" data-salvar="converter">✔ Aprovar e gerar pedido</button>' : ''}
    ${pedGerado ? `<a class="btn sec" href="#/pedido/${pedGerado.id}">Ver pedido nº ${U.pad(pedGerado.numero)}</a>` : ''}
    ${orcOrigem ? `<a class="btn sec" href="#/orcamento/${orcOrigem.id}">Ver orçamento nº ${U.pad(orcOrigem.numero)}</a>` : ''}
    ${!ehPedido ? '<button type="button" class="btn sec" data-acao="duplicar">Duplicar</button>' : ''}
    <button type="button" class="btn perigo" data-acao="excluir">Excluir</button>`;

  const camposTipo = ehPedido ? `
      ${campo('entrega', 'Entrega prevista', doc.entrega, { type: 'date' })}
      ${selecao('status', 'Status', doc.status, PED_STATUS)}
      ${selecao('pagamento', 'Pagamento', doc.pagamento, PAGAMENTOS)}
      ${campo('valor_pago', 'Valor já recebido (R$)', doc.valor_pago || 0, { type: 'number', step: '0.01', min: 0 })}` : `
      ${campo('validade', 'Validade do orçamento', doc.validade, { type: 'date' })}
      ${campo('entrega', 'Entrega prevista', doc.entrega, { type: 'date' })}
      ${novo ? '' : selecao('status', 'Status', doc.status, ORC_STATUS)}
      <div class="span2">${campo('prazo', 'Prazo de produção', doc.prazo)}</div>`;

  main.innerHTML = `
    <div class="topo"><h1>${titulo}</h1><div class="acoes">${acoes}</div></div>
    <form id="f-doc" class="cartao" autocomplete="off">
      <div class="grid3">
        <label class="campo span2"><span>Cliente *</span>
          <input name="cliente_nome" list="dl-clientes" required value="${esc(cli?.nome || '')}" placeholder="Digite o nome — se for novo, será cadastrado automaticamente"></label>
        ${campo('cliente_tel', 'WhatsApp do cliente', cli?.telefone || '', { placeholder: '(11) 99999-9999' })}
      </div>
      <div id="info-cli"></div>
      <datalist id="dl-clientes">${D.clientes.slice().sort(porNome).map(c => `<option value="${esc(c.nome)}">${esc(c.empresa || '')}</option>`).join('')}</datalist>
      <div class="grid4">
        ${campo('data', 'Data', doc.data, { type: 'date', required: true })}
        ${camposTipo}
      </div>

      <h3>Itens</h3>
      <div class="tabela-wrap"><table class="itens"><thead><tr><th>Produto</th><th>Descrição / personalização</th>
        <th class="n">Qtd</th><th class="n">Preço un.</th><th class="n">Subtotal</th><th></th></tr></thead>
        <tbody id="itens"></tbody></table></div>
      <button type="button" class="btn sec peq" data-add-item>+ Adicionar item</button>
      ${produtosLista.length ? '' : '<p class="dica">Dica: cadastre seus produtos em <a href="#/produtos">Produtos</a> para o preço por quantidade ser calculado sozinho.</p>'}

      <div class="totais">
        <div class="linha">Subtotal <b id="t-sub"></b></div>
        <label class="linha">Frete (R$) <input name="frete" type="number" step="0.01" min="0" value="${Number(doc.frete || 0)}"></label>
        <label class="linha">Desconto (R$) <input name="desconto" type="number" step="0.01" min="0" value="${Number(doc.desconto || 0)}"></label>
        <div class="linha total">Total <b id="t-total"></b></div>
      </div>
      ${area('observacoes', 'Observações (aparecem no PDF)', doc.observacoes)}
      <div class="rodape-form">
        ${novo ? `<button class="btn sec" data-salvar="orcamento">Salvar orçamento</button>
                  <button class="btn" data-salvar="pedido">Salvar e já gerar pedido</button>`
               : `<button class="btn" data-salvar="${tipo}">Salvar alterações</button>`}
      </div>
    </form>`;

  const form = main.querySelector('#f-doc');
  const tbody = main.querySelector('#itens');
  const inpNome = form.elements.cliente_nome;
  const inpTel = form.elements.cliente_tel;

  const linha = (it, i) => {
    const p = prodMap[it.produto_id];
    return `<tr data-i="${i}">
      <td data-r="Produto"><select class="i-prod"><option value="">— item avulso —</option>
        ${produtosLista.map(x => `<option value="${x.id}" ${x.id === it.produto_id ? 'selected' : ''}>${esc(x.nome)}</option>`).join('')}</select>
        ${p ? `<div class="dica">${esc(U.descreverFaixas(p))}</div>` : ''}</td>
      <td data-r="Descrição"><input class="i-desc" value="${esc(it.descricao || '')}" placeholder="Ex.: chaveiro acrílico, gravação 1 cor"></td>
      <td data-r="Quantidade" class="n"><input class="i-qtd" type="number" min="1" step="1" value="${Number(it.qtd) || 1}"></td>
      <td data-r="Preço unitário (R$)" class="n"><input class="i-preco" type="number" min="0" step="0.01" value="${Number(it.preco) || 0}"></td>
      <td data-r="Subtotal" class="n i-sub">${money((Number(it.qtd) || 0) * U.num(it.preco))}</td>
      <td><button type="button" class="btn-ico" data-rm-item title="Remover item">✕</button></td></tr>`;
  };
  const desenharItens = () => { tbody.innerHTML = itens.map(linha).join(''); totais(); };
  const subtotal = () => itens.reduce((s, i) => s + (Number(i.qtd) || 0) * U.num(i.preco), 0);
  const totais = () => {
    const sub = subtotal();
    main.querySelector('#t-sub').textContent = money(sub);
    main.querySelector('#t-total').textContent = money(sub + U.num(form.elements.frete.value) - U.num(form.elements.desconto.value));
  };

  let telAuto = true;
  const infoCliente = () => {
    const nome = inpNome.value.trim().toLowerCase();
    const c = D.clientes.find(x => String(x.nome).trim().toLowerCase() === nome);
    const box = main.querySelector('#info-cli');
    if (!nome) { box.innerHTML = ''; return; }
    if (c) {
      const s = stats[c.id];
      box.innerHTML = `<div class="info-cli">✔ Cliente cadastrado${c.empresa ? ' · ' + esc(c.empresa) : ''} ·
        ${s ? `${s.qtd} pedido(s) · última compra em ${U.fmtData(s.ultima)} (${badgeDias(U.diasDesde(s.ultima))})` : 'ainda sem pedidos'}</div>`;
      if (telAuto || !inpTel.value) { inpTel.value = c.telefone || ''; telAuto = true; }
    } else {
      box.innerHTML = '<div class="info-cli">➕ Cliente novo — será cadastrado automaticamente ao salvar.</div>';
    }
  };

  desenharItens();
  infoCliente();

  inpNome.addEventListener('input', infoCliente);
  inpTel.addEventListener('input', () => { telAuto = false; });
  form.addEventListener('input', () => { alterado = true; });
  form.elements.frete.addEventListener('input', totais);
  form.elements.desconto.addEventListener('input', totais);

  tbody.addEventListener('change', e => {
    if (!e.target.classList.contains('i-prod')) return;
    const i = +e.target.closest('tr').dataset.i;
    const anterior = prodMap[itens[i].produto_id];
    const p = prodMap[e.target.value];
    itens[i].produto_id = e.target.value;
    if (p) {
      if (!itens[i].descricao || (anterior && itens[i].descricao === anterior.nome)) itens[i].descricao = p.nome;
      itens[i].preco = U.precoPorQtd(p, Number(itens[i].qtd) || 1);
    }
    desenharItens();
  });

  tbody.addEventListener('input', e => {
    const tr = e.target.closest('tr');
    if (!tr) return;
    const i = +tr.dataset.i;
    const it = itens[i];
    if (e.target.classList.contains('i-desc')) it.descricao = e.target.value;
    if (e.target.classList.contains('i-qtd')) {
      it.qtd = parseInt(e.target.value, 10) || 0;
      const p = prodMap[it.produto_id];
      if (p) { // recalcula o preço pela faixa de quantidade
        it.preco = U.precoPorQtd(p, it.qtd);
        tr.querySelector('.i-preco').value = it.preco;
      }
    }
    if (e.target.classList.contains('i-preco')) it.preco = U.num(e.target.value);
    tr.querySelector('.i-sub').textContent = money((Number(it.qtd) || 0) * U.num(it.preco));
    totais();
  });

  main.onclick = async e => {
    if (e.target.closest('[data-add-item]')) {
      itens.push({ produto_id: '', descricao: '', qtd: 1, preco: 0 });
      desenharItens();
      tbody.querySelector('tr:last-child .i-prod')?.focus();
      return;
    }
    if (e.target.closest('[data-rm-item]')) {
      const i = +e.target.closest('tr').dataset.i;
      itens.splice(i, 1);
      if (!itens.length) itens.push({ produto_id: '', descricao: '', qtd: 1, preco: 0 });
      alterado = true;
      desenharItens();
      return;
    }
    const acao = e.target.closest('[data-acao]')?.dataset.acao;
    if (!acao) return;
    if ((acao === 'pdf' || acao === 'whats') && alterado) {
      toast('Salve as alterações primeiro', 'erro');
      return;
    }
    const cliente = D.clientes.find(c => c.id === doc.cliente_id);
    if (acao === 'pdf') imprimir(tipo, doc, cliente);
    if (acao === 'whats') {
      abrirWhats(cliente?.telefone, msgDocumento(tipo, doc, cliente));
      if (!ehPedido && doc.status === 'Pendente') {
        doc = await DB.save('orcamentos', { ...doc, status: 'Enviado' });
        const sel = form.elements.status; if (sel) sel.value = 'Enviado';
      }
    }
    if (acao === 'duplicar') ir(`#/novo?de=${doc.id}`);
    if (acao === 'excluir') {
      if (!confirmar(`Excluir ${ehPedido ? 'o pedido' : 'o orçamento'} nº ${U.pad(doc.numero)}? Isso não pode ser desfeito.`)) return;
      await DB.remove(tabela, doc.id);
      // desfaz o vínculo com o documento relacionado
      if (ehPedido && orcOrigem) await DB.save('orcamentos', { ...orcOrigem, pedido_id: null });
      if (!ehPedido && pedGerado) await DB.save('pedidos', { ...pedGerado, orcamento_id: null });
      toast('Excluído');
      ir(ehPedido ? '#/pedidos' : '#/orcamentos');
    }
  };

  form.addEventListener('submit', async e => {
    e.preventDefault();
    const modo = e.submitter?.dataset.salvar || tipo;
    const fd = Object.fromEntries(new FormData(form));
    const its = itens
      .filter(i => (i.descricao || i.produto_id) && Number(i.qtd) > 0)
      .map(i => ({
        produto_id: i.produto_id || null,
        descricao: i.descricao || prodMap[i.produto_id]?.nome || '',
        qtd: Number(i.qtd),
        preco: U.num(i.preco),
      }));
    if (!its.length) { toast('Adicione pelo menos um item com quantidade', 'erro'); return; }

    document.querySelectorAll('[data-salvar]').forEach(b => { b.disabled = true; });
    try {
      // Cliente: encontra pelo nome ou cadastra
      const nome = fd.cliente_nome.trim();
      let c = D.clientes.find(x => String(x.nome).trim().toLowerCase() === nome.toLowerCase());
      if (!c) {
        c = await DB.save('clientes', { nome, telefone: fd.cliente_tel.trim() });
        toast(`Cliente "${nome}" cadastrado`);
      } else if (fd.cliente_tel.trim() && fd.cliente_tel.trim() !== (c.telefone || '')) {
        c = await DB.save('clientes', { ...c, telefone: fd.cliente_tel.trim() });
      }

      const frete = U.num(fd.frete), desconto = U.num(fd.desconto);
      const sub = its.reduce((s, i) => s + i.qtd * i.preco, 0);
      const comum = { cliente_id: c.id, data: fd.data, itens: its, frete, desconto, total: Math.round((sub + frete - desconto) * 100) / 100, observacoes: fd.observacoes };

      if (ehPedido) {
        await DB.save('pedidos', {
          ...doc, ...comum, entrega: fd.entrega, status: fd.status, pagamento: fd.pagamento, valor_pago: U.num(fd.valor_pago),
        });
        toast('Pedido salvo');
        render();
        return;
      }

      const orc = await DB.save('orcamentos', {
        ...doc, ...comum,
        numero: doc.numero || proximoNumero(D.orcamentos),
        validade: fd.validade, prazo: fd.prazo, entrega: fd.entrega,
        status: fd.status || doc.status || 'Pendente',
      });
      if (modo === 'pedido' || modo === 'converter') {
        const ped = await criarPedidoDe(orc);
        toast(`Orçamento nº ${U.pad(orc.numero)} e pedido nº ${U.pad(ped.numero)} criados`);
        ir('#/pedido/' + ped.id);
      } else {
        toast(novo ? `Orçamento nº ${U.pad(orc.numero)} criado` : 'Orçamento salvo');
        if (novo) ir('#/orcamento/' + orc.id); else render();
      }
    } catch (err) {
      toast('Erro ao salvar: ' + erroMsg(err), 'erro');
      document.querySelectorAll('[data-salvar]').forEach(b => { b.disabled = false; });
    }
  });
}

async function criarPedidoDe(orc) {
  const pedidos = await DB.list('pedidos');
  const ped = await DB.save('pedidos', {
    numero: proximoNumero(pedidos), cliente_id: orc.cliente_id, orcamento_id: orc.id,
    data: U.hoje(), entrega: orc.entrega || '', itens: orc.itens, frete: orc.frete, desconto: orc.desconto,
    total: orc.total, status: 'Aguardando arte', pagamento: 'Pendente', valor_pago: 0, observacoes: orc.observacoes,
  });
  await DB.save('orcamentos', { ...orc, status: 'Aprovado', pedido_id: ped.id });
  return ped;
}

function msgDocumento(tipo, doc, cli) {
  const nomeDoc = tipo === 'pedido' ? 'pedido' : 'orçamento';
  const L = [`Olá ${U.primeiroNome(cli?.nome)}! Segue o ${nomeDoc} nº ${U.pad(doc.numero)} da ${CFG.empresa}:`, ''];
  for (const i of doc.itens || []) L.push(`• ${i.qtd}x ${i.descricao} — ${money(i.preco)} un. = ${money(i.qtd * i.preco)}`);
  L.push('');
  if (Number(doc.frete)) L.push(`Frete: ${money(doc.frete)}`);
  if (Number(doc.desconto)) L.push(`Desconto: -${money(doc.desconto)}`);
  L.push(`*Total: ${money(doc.total)}*`);
  if (tipo !== 'pedido' && doc.validade) L.push(`Validade: ${U.fmtData(doc.validade)}`);
  if (tipo !== 'pedido' && doc.prazo) L.push(`Prazo de produção: ${doc.prazo}`);
  if (doc.entrega) L.push(`Entrega prevista: ${U.fmtData(doc.entrega)}`);
  if (tipo !== 'pedido' && CFG.condicoes) L.push('', CFG.condicoes);
  L.push('', 'Qualquer dúvida estou à disposição!');
  return L.join('\n');
}

// ---------- PDF (impressão) ----------
async function imprimir(tipo, doc, cli) {
  const ehPedido = tipo === 'pedido';
  const sub = (doc.itens || []).reduce((s, i) => s + i.qtd * i.preco, 0);
  const area = document.getElementById('impressao');
  area.innerHTML = `
    <div class="doc-cab">
      <div style="display:flex;gap:14px;align-items:center">
        ${CFG.logo ? `<img src="${esc(CFG.logo)}" alt="">` : ''}
        <div class="doc-emp"><b>${esc(CFG.empresa)}</b><br>
          ${CFG.cnpj ? `CNPJ: ${esc(CFG.cnpj)}<br>` : ''}${esc(CFG.endereco || '')}${CFG.endereco ? '<br>' : ''}
          ${esc([CFG.telefone, CFG.email].filter(Boolean).join(' · '))}</div>
      </div>
      <div class="doc-tit"><h1>${ehPedido ? 'PEDIDO' : 'ORÇAMENTO'} Nº ${U.pad(doc.numero)}</h1>
        Data: ${U.fmtData(doc.data)}<br>
        ${!ehPedido && doc.validade ? `Válido até: ${U.fmtData(doc.validade)}<br>` : ''}
        ${doc.entrega ? `Entrega prevista: ${U.fmtData(doc.entrega)}` : ''}</div>
    </div>
    <div class="doc-bloco"><b>Cliente:</b> ${esc(cli?.nome || '—')}${cli?.empresa ? ` — ${esc(cli.empresa)}` : ''}<br>
      ${cli?.documento ? `CPF/CNPJ: ${esc(cli.documento)}<br>` : ''}
      ${esc([cli?.telefone, cli?.email].filter(Boolean).join(' · '))}
      ${cli?.endereco || cli?.cidade ? `<br>${esc([cli.endereco, cli.cidade].filter(Boolean).join(' — '))}` : ''}</div>
    <table class="doc-itens"><thead><tr><th class="n">Qtd</th><th>Descrição</th><th class="n">Valor unit.</th><th class="n">Total</th></tr></thead>
      <tbody>${(doc.itens || []).map(i => `<tr><td class="n">${i.qtd}</td><td>${esc(i.descricao)}</td>
        <td class="n">${money(i.preco)}</td><td class="n">${money(i.qtd * i.preco)}</td></tr>`).join('')}</tbody></table>
    <table class="doc-tot">
      <tr><td>Subtotal</td><td class="n">${money(sub)}</td></tr>
      ${Number(doc.frete) ? `<tr><td>Frete</td><td class="n">${money(doc.frete)}</td></tr>` : ''}
      ${Number(doc.desconto) ? `<tr><td>Desconto</td><td class="n">-${money(doc.desconto)}</td></tr>` : ''}
      <tr class="final"><td>TOTAL</td><td class="n">${money(doc.total)}</td></tr>
    </table>
    <div class="doc-obs">${[
      !ehPedido && doc.prazo ? `<b>Prazo de produção:</b> ${esc(doc.prazo)}` : '',
      doc.observacoes ? `<b>Observações:</b> ${esc(doc.observacoes)}` : '',
      CFG.condicoes ? `<b>Condições:</b>\n${esc(CFG.condicoes)}` : '',
    ].filter(Boolean).join('\n\n')}</div>
    ${ehPedido ? '<div class="doc-assin"><div>' + esc(CFG.empresa) + '</div><div>Cliente</div></div>' : ''}`;
  await Promise.all([...area.querySelectorAll('img')].map(img => img.decode().catch(() => {})));
  const tituloAntigo = document.title;
  document.title = `${ehPedido ? 'Pedido' : 'Orcamento'} ${U.pad(doc.numero)} - ${cli?.nome || ''}`;
  window.print();
  document.title = tituloAntigo;
}

// ============================================================
//  Listas de orçamentos e pedidos
// ============================================================
async function telaOrcamentos(_, params) {
  const D = await dados();
  const cli = mapa(D.clientes);
  const aba = params.get('f') || 'abertos';
  const filtros = {
    abertos: ['Aguardando resposta', orcAberto],
    aprovados: ['Aprovados', o => o.status === 'Aprovado'],
    recusados: ['Recusados', o => o.status === 'Recusado'],
    todos: ['Todos', () => true],
  };
  const base = D.orcamentos.filter(filtros[aba]?.[1] || filtros.abertos[1])
    .sort((a, b) => (Number(b.numero) || 0) - (Number(a.numero) || 0));

  main.innerHTML = `
    <div class="topo"><h1>Orçamentos</h1><a class="btn" href="#/novo">＋ Novo orçamento</a></div>
    <div class="cartao">
      <div class="filtros">
        <div class="abas">${Object.entries(filtros).map(([k, [rot]]) => `<a href="#/orcamentos?f=${k}" class="${k === aba ? 'ativo' : ''}">${rot}</a>`).join('')}</div>
        <input type="search" id="busca" placeholder="Buscar cliente ou produto…">
      </div>
      <div class="tabela-wrap"><table><thead><tr><th>Nº</th><th>Cliente</th><th>Itens</th><th>Data</th><th>Validade</th>
        <th class="n">Total</th><th>Status</th></tr></thead><tbody id="tb"></tbody></table></div>
    </div>`;

  const tb = main.querySelector('#tb');
  const desenhar = () => {
    const q = main.querySelector('#busca').value.trim().toLowerCase();
    const rows = base.filter(o => !q || (cli[o.cliente_id]?.nome || '').toLowerCase().includes(q) ||
      (o.itens || []).some(i => String(i.descricao).toLowerCase().includes(q)) || String(o.numero).includes(q));
    tb.innerHTML = rows.map(o => {
      const venc = orcAberto(o) && o.validade && o.validade < U.hoje();
      return `<tr class="link-linha" data-href="#/orcamento/${o.id}">
        <td>#${U.pad(o.numero)}</td><td>${esc(cli[o.cliente_id]?.nome || '—')}</td>
        <td class="dica">${esc((o.itens || []).map(i => `${i.qtd}x ${i.descricao}`).join(', ').slice(0, 80))}</td>
        <td>${U.fmtData(o.data)}</td><td>${U.fmtData(o.validade)} ${venc ? '<span class="badge vermelho">vencido</span>' : ''}</td>
        <td class="n">${money(o.total)}</td>
        <td><select data-status="${o.id}">${opcoes(ORC_STATUS, o.status)}</select></td></tr>`;
    }).join('') || '<tr><td colspan="7" class="vazio">Nenhum orçamento aqui</td></tr>';
  };
  desenhar();
  main.querySelector('#busca').addEventListener('input', desenhar);
  main.onclick = e => {
    const tr = e.target.closest('[data-href]');
    if (tr && !e.target.closest('a,button,select,input')) ir(tr.dataset.href);
  };
  main.onchange = async e => {
    const id = e.target.dataset.status;
    if (!id) return;
    const o = D.orcamentos.find(x => x.id === id);
    try {
      if (e.target.value === 'Aprovado' && !o.pedido_id && confirmar('Gerar o pedido deste orçamento agora?')) {
        const ped = await criarPedidoDe(o);
        toast(`Pedido nº ${U.pad(ped.numero)} criado`);
      } else {
        await DB.save('orcamentos', { ...o, status: e.target.value });
        toast('Status atualizado');
      }
      render();
    } catch (err) { toast('Erro: ' + erroMsg(err), 'erro'); }
  };
}

async function telaPedidos(_, params) {
  const D = await dados();
  const cli = mapa(D.clientes);
  const aba = params.get('f') || 'andamento';
  const hoje = U.hoje();
  const filtros = {
    andamento: ['Em andamento', pedAberto],
    atrasados: ['Atrasados', p => pedAberto(p) && p.entrega && p.entrega < hoje],
    receber: ['A receber', p => p.status !== 'Cancelado' && p.pagamento !== 'Pago'],
    entregues: ['Entregues', p => p.status === 'Entregue'],
    todos: ['Todos', () => true],
  };
  const base = D.pedidos.filter(filtros[aba]?.[1] || filtros.andamento[1])
    .sort((a, b) => aba === 'andamento' || aba === 'atrasados'
      ? String(a.entrega || '9999').localeCompare(String(b.entrega || '9999'))
      : (Number(b.numero) || 0) - (Number(a.numero) || 0));

  main.innerHTML = `
    <div class="topo"><h1>Pedidos</h1><a class="btn" href="#/novo">＋ Novo pedido</a></div>
    <div class="cartao">
      <div class="filtros">
        <div class="abas">${Object.entries(filtros).map(([k, [rot]]) => `<a href="#/pedidos?f=${k}" class="${k === aba ? 'ativo' : ''}">${rot}</a>`).join('')}</div>
        <input type="search" id="busca" placeholder="Buscar cliente ou produto…">
      </div>
      <div class="tabela-wrap"><table><thead><tr><th>Nº</th><th>Cliente</th><th>Itens</th><th>Data</th><th>Entrega</th>
        <th class="n">Total</th><th>Status</th><th>Pagamento</th></tr></thead><tbody id="tb"></tbody></table></div>
    </div>`;

  const tb = main.querySelector('#tb');
  const desenhar = () => {
    const q = main.querySelector('#busca').value.trim().toLowerCase();
    const rows = base.filter(p => !q || (cli[p.cliente_id]?.nome || '').toLowerCase().includes(q) ||
      (p.itens || []).some(i => String(i.descricao).toLowerCase().includes(q)) || String(p.numero).includes(q));
    tb.innerHTML = rows.map(p => {
      const atras = pedAberto(p) && p.entrega && p.entrega < hoje;
      return `<tr class="link-linha" data-href="#/pedido/${p.id}">
        <td>#${U.pad(p.numero)}</td><td>${esc(cli[p.cliente_id]?.nome || '—')}</td>
        <td class="dica">${esc((p.itens || []).map(i => `${i.qtd}x ${i.descricao}`).join(', ').slice(0, 80))}</td>
        <td>${U.fmtData(p.data)}</td><td>${U.fmtData(p.entrega)} ${atras ? '<span class="badge vermelho">atrasado</span>' : ''}</td>
        <td class="n">${money(p.total)}</td>
        <td><select data-campo="status" data-id="${p.id}">${opcoes(PED_STATUS, p.status)}</select></td>
        <td><select data-campo="pagamento" data-id="${p.id}">${opcoes(PAGAMENTOS, p.pagamento)}</select></td></tr>`;
    }).join('') || '<tr><td colspan="8" class="vazio">Nenhum pedido aqui</td></tr>';
  };
  desenhar();
  main.querySelector('#busca').addEventListener('input', desenhar);
  main.onclick = e => {
    const tr = e.target.closest('[data-href]');
    if (tr && !e.target.closest('a,button,select,input')) ir(tr.dataset.href);
  };
  main.onchange = async e => {
    const { id, campo: nomeCampo } = e.target.dataset;
    if (!id) return;
    const p = D.pedidos.find(x => x.id === id);
    const novo = { ...p, [nomeCampo]: e.target.value };
    if (nomeCampo === 'pagamento' && e.target.value === 'Pago') novo.valor_pago = p.total;
    try { await DB.save('pedidos', novo); toast('Atualizado'); } catch (err) { toast('Erro: ' + erroMsg(err), 'erro'); }
  };
}

// ============================================================
//  Clientes
// ============================================================
async function telaClientes(_, params) {
  const D = await dados();
  const stats = statsPorCliente(D.pedidos);
  const alerta = Number(CFG.diasAlerta) || 90;
  const aba = params.get('f') || 'todos';
  const linhas = D.clientes.map(c => {
    const s = stats[c.id];
    return { c, s, dias: U.diasDesde(s?.ultima) };
  });
  const filtros = {
    todos: ['Todos', () => true],
    retomar: [`Sem comprar há ${alerta}+ dias`, x => x.dias != null && x.dias >= alerta],
    nunca: ['Nunca compraram', x => x.dias == null],
  };
  const base = linhas.filter(filtros[aba]?.[1] || filtros.todos[1]);

  main.innerHTML = `
    <div class="topo"><h1>Clientes</h1><button class="btn" data-novo>＋ Novo cliente</button></div>
    <div class="cartao">
      <div class="filtros">
        <div class="abas">${Object.entries(filtros).map(([k, [rot]]) => `<a href="#/clientes?f=${k}" class="${k === aba ? 'ativo' : ''}">${rot}</a>`).join('')}</div>
        <input type="search" id="busca" placeholder="Buscar nome, empresa, cidade, telefone…">
        <select id="ordem">
          <option value="dias">Mais tempo sem comprar</option>
          <option value="nome">Nome (A-Z)</option>
          <option value="total">Quem mais comprou</option>
          <option value="recente">Compra mais recente</option>
        </select>
      </div>
      <div class="tabela-wrap"><table><thead><tr><th>Cliente</th><th>Telefone</th><th>Última compra</th><th>Dias sem comprar</th>
        <th class="n">Pedidos</th><th class="n">Total comprado</th><th></th></tr></thead><tbody id="tb"></tbody></table></div>
    </div>`;

  const tb = main.querySelector('#tb');
  const desenhar = () => {
    const q = main.querySelector('#busca').value.trim().toLowerCase();
    const ordem = main.querySelector('#ordem').value;
    const rows = base.filter(({ c }) => !q || [c.nome, c.empresa, c.cidade, c.telefone, c.email, c.documento]
      .some(v => String(v || '').toLowerCase().includes(q)));
    const ord = {
      nome: (a, b) => porNome(a.c, b.c),
      dias: (a, b) => (b.dias ?? -1) - (a.dias ?? -1),
      total: (a, b) => (b.s?.total || 0) - (a.s?.total || 0),
      recente: (a, b) => (a.dias ?? 1e9) - (b.dias ?? 1e9),
    }[ordem];
    rows.sort(ord);
    tb.innerHTML = rows.map(({ c, s, dias }) => `<tr class="link-linha" data-href="#/cliente/${c.id}">
      <td><b>${esc(c.nome)}</b>${c.empresa ? `<div class="dica">${esc(c.empresa)}</div>` : ''}</td>
      <td>${esc(c.telefone || '')}</td><td>${U.fmtData(s?.ultima)}</td><td>${badgeDias(dias)}</td>
      <td class="n">${s?.qtd || 0}</td><td class="n">${money(s?.total || 0)}</td>
      <td class="n"><button class="btn whats peq" data-reativar="${c.id}">WhatsApp</button>
        <a class="btn sec peq" href="#/novo?cliente=${c.id}">Orçamento</a></td></tr>`).join('')
      || '<tr><td colspan="7" class="vazio">Nenhum cliente encontrado</td></tr>';
  };
  desenhar();
  main.querySelector('#busca').addEventListener('input', desenhar);
  main.querySelector('#ordem').addEventListener('change', desenhar);
  main.onclick = e => {
    if (e.target.closest('[data-novo]')) return formCliente();
    const r = e.target.closest('[data-reativar]');
    if (r) {
      const c = D.clientes.find(x => x.id === r.dataset.reativar);
      return abrirWhats(c.telefone, msgReativar(c, U.diasDesde(stats[c.id]?.ultima)));
    }
    const tr = e.target.closest('[data-href]');
    if (tr && !e.target.closest('a,button,select,input')) ir(tr.dataset.href);
  };
}

function formCliente(c = {}, depois) {
  modal(c.id ? 'Editar cliente' : 'Novo cliente', `
    <div class="grid2">
      ${campo('nome', 'Nome *', c.nome, { required: true })}
      ${campo('empresa', 'Empresa', c.empresa)}
      ${campo('telefone', 'WhatsApp / Telefone', c.telefone, { placeholder: '(11) 99999-9999' })}
      ${campo('email', 'E-mail', c.email, { type: 'email' })}
      ${campo('documento', 'CPF / CNPJ', c.documento)}
      ${campo('cidade', 'Cidade', c.cidade)}
    </div>
    ${campo('endereco', 'Endereço', c.endereco)}
    ${campo('data_especial', 'Data especial (aniversário, data da empresa…)', c.data_especial, { placeholder: 'ex.: 15/03 — aniversário da empresa' })}
    ${area('observacoes', 'Observações', c.observacoes)}`, {
    onSubmit: async fd => {
      const nome = fd.nome.trim();
      const todos = await DB.list('clientes');
      if (todos.some(x => x.id !== c.id && String(x.nome).trim().toLowerCase() === nome.toLowerCase())) {
        toast('Já existe um cliente com esse nome. Use um nome diferente (ex.: incluir a empresa).', 'erro');
        return false;
      }
      const salvo = await DB.save('clientes', { ...c, ...fd, nome });
      toast('Cliente salvo');
      if (depois) depois(salvo); else render();
    },
  });
}

async function telaCliente(id) {
  const D = await dados();
  const c = D.clientes.find(x => x.id === id);
  if (!c) { main.innerHTML = '<div class="cartao vazio">Cliente não encontrado.</div>'; return; }
  const s = statsPorCliente(D.pedidos)[c.id];
  const dias = U.diasDesde(s?.ultima);
  const peds = D.pedidos.filter(p => p.cliente_id === id).sort((a, b) => String(b.data).localeCompare(String(a.data)));
  const orcs = D.orcamentos.filter(o => o.cliente_id === id).sort((a, b) => String(b.data).localeCompare(String(a.data)));
  // produtos que o cliente mais compra
  const fav = {};
  for (const p of peds.filter(p => p.status !== 'Cancelado')) for (const i of p.itens || []) fav[i.descricao] = (fav[i.descricao] || 0) + Number(i.qtd);
  const favs = Object.entries(fav).sort((a, b) => b[1] - a[1]).slice(0, 5);

  main.innerHTML = `
    <div class="topo"><div><h1>${esc(c.nome)}</h1>${c.empresa ? `<div class="dica">${esc(c.empresa)}</div>` : ''}</div>
      <div class="acoes">
        <button class="btn whats" data-acao="whats">WhatsApp</button>
        <a class="btn" href="#/novo?cliente=${c.id}">＋ Novo orçamento</a>
        <button class="btn sec" data-acao="editar">Editar</button>
        <button class="btn perigo" data-acao="excluir">Excluir</button>
      </div></div>
    <div class="cards">
      <div class="card-num"><div class="rot">Última compra</div><div class="val">${U.fmtData(s?.ultima)}</div></div>
      <div class="card-num"><div class="rot">Dias sem comprar</div><div class="val">${dias ?? '—'}</div>${badgeDias(dias)}</div>
      <div class="card-num"><div class="rot">Total comprado</div><div class="val">${money(s?.total || 0)}</div></div>
      <div class="card-num"><div class="rot">Pedidos · ticket médio</div><div class="val">${s?.qtd || 0} · ${money(s ? s.total / s.qtd : 0)}</div></div>
    </div>
    <div class="colunas">
      <div class="cartao"><h2>Dados</h2>
        <p>${[['Telefone', c.telefone], ['E-mail', c.email], ['CPF/CNPJ', c.documento], ['Cidade', c.cidade], ['Endereço', c.endereco],
          ['Data especial', c.data_especial], ['Observações', c.observacoes]].filter(([, v]) => v)
          .map(([k, v]) => `<b>${k}:</b> ${esc(v)}`).join('<br>') || '<span class="dica">Sem dados adicionais</span>'}</p>
      </div>
      <div class="cartao"><h2>O que mais compra</h2>
        ${favs.length ? `<table><tbody>${favs.map(([d, q]) => `<tr><td>${esc(d)}</td><td class="n">${q} un.</td></tr>`).join('')}</tbody></table>`
          : '<p class="dica">Ainda sem pedidos</p>'}</div>
    </div>
    <div class="cartao"><h2>Pedidos</h2><div class="tabela-wrap"><table><thead><tr><th>Nº</th><th>Data</th><th>Itens</th><th class="n">Total</th><th>Status</th><th>Pagamento</th></tr></thead><tbody>
      ${peds.map(p => `<tr class="link-linha" data-href="#/pedido/${p.id}"><td>#${U.pad(p.numero)}</td><td>${U.fmtData(p.data)}</td>
        <td class="dica">${esc((p.itens || []).map(i => `${i.qtd}x ${i.descricao}`).join(', '))}</td>
        <td class="n">${money(p.total)}</td><td>${badgeStatus(p.status)}</td><td>${badgeStatus(p.pagamento)}</td></tr>`).join('')
        || '<tr><td colspan="6" class="vazio">Nenhum pedido</td></tr>'}</tbody></table></div></div>
    <div class="cartao"><h2>Orçamentos</h2><div class="tabela-wrap"><table><thead><tr><th>Nº</th><th>Data</th><th>Itens</th><th class="n">Total</th><th>Status</th></tr></thead><tbody>
      ${orcs.map(o => `<tr class="link-linha" data-href="#/orcamento/${o.id}"><td>#${U.pad(o.numero)}</td><td>${U.fmtData(o.data)}</td>
        <td class="dica">${esc((o.itens || []).map(i => `${i.qtd}x ${i.descricao}`).join(', '))}</td>
        <td class="n">${money(o.total)}</td><td>${badgeStatus(o.status)}</td></tr>`).join('')
        || '<tr><td colspan="5" class="vazio">Nenhum orçamento</td></tr>'}</tbody></table></div></div>`;

  main.onclick = async e => {
    const tr = e.target.closest('[data-href]');
    if (tr && !e.target.closest('a,button')) return ir(tr.dataset.href);
    const acao = e.target.closest('[data-acao]')?.dataset.acao;
    if (acao === 'whats') abrirWhats(c.telefone, msgReativar(c, dias));
    if (acao === 'editar') formCliente(c);
    if (acao === 'excluir') {
      if (peds.length || orcs.length) {
        toast(`Este cliente tem ${peds.length} pedido(s) e ${orcs.length} orçamento(s). Exclua-os antes de excluir o cliente.`, 'erro');
        return;
      }
      if (!confirmar(`Excluir o cliente "${c.nome}"?`)) return;
      await DB.remove('clientes', c.id);
      toast('Cliente excluído');
      ir('#/clientes');
    }
  };
}

// ============================================================
//  Produtos (com preço por faixa de quantidade)
// ============================================================
async function telaProdutos() {
  const D = await dados();
  const prods = D.produtos.slice().sort(porNome);
  main.innerHTML = `
    <div class="topo"><h1>Produtos</h1><button class="btn" data-novo>＋ Novo produto</button></div>
    <div class="cartao">
      <div class="filtros"><input type="search" id="busca" placeholder="Buscar produto…"></div>
      <div class="tabela-wrap"><table><thead><tr><th>Produto</th><th>Categoria</th><th>Preços por quantidade</th><th class="n">Custo</th><th></th></tr></thead>
      <tbody id="tb"></tbody></table></div>
    </div>`;
  const tb = main.querySelector('#tb');
  const desenhar = () => {
    const q = main.querySelector('#busca').value.trim().toLowerCase();
    tb.innerHTML = prods.filter(p => !q || [p.nome, p.codigo, p.categoria].some(v => String(v || '').toLowerCase().includes(q)))
      .map(p => `<tr class="link-linha" data-editar="${p.id}">
        <td><b>${esc(p.nome)}</b>${p.codigo ? ` <span class="dica">${esc(p.codigo)}</span>` : ''}
          ${p.ativo === false ? ' <span class="badge cinza">inativo</span>' : ''}</td>
        <td>${esc(p.categoria || '')}</td><td>${esc(U.descreverFaixas(p))}</td>
        <td class="n">${Number(p.custo) ? money(p.custo) : '—'}</td>
        <td class="n"><button class="btn-ico" data-excluir="${p.id}" title="Excluir">🗑</button></td></tr>`).join('')
      || '<tr><td colspan="5" class="vazio">Nenhum produto cadastrado. Clique em “Novo produto”.</td></tr>';
  };
  desenhar();
  main.querySelector('#busca').addEventListener('input', desenhar);
  main.onclick = async e => {
    if (e.target.closest('[data-novo]')) return formProduto();
    const ex = e.target.closest('[data-excluir]');
    if (ex) {
      const p = prods.find(x => x.id === ex.dataset.excluir);
      if (!confirmar(`Excluir o produto "${p.nome}"? (Orçamentos e pedidos antigos não são alterados.)`)) return;
      await DB.remove('produtos', p.id);
      toast('Produto excluído');
      return render();
    }
    const ed = e.target.closest('[data-editar]');
    if (ed) formProduto(prods.find(x => x.id === ed.dataset.editar));
  };
}

function formProduto(p = {}) {
  const faixas = p.faixas?.length ? U.faixasOrdenadas(p) : [{ min: 1, preco: '' }];
  const linhaFaixa = f => `<div class="faixa">
    <span>A partir de</span><input type="number" min="1" step="1" class="f-min" value="${f.min ?? ''}" required>
    <span>unidades →</span><span>R$</span><input type="number" min="0" step="0.01" class="f-preco" value="${f.preco ?? ''}" required>
    <span>cada</span><button type="button" class="btn-ico" data-rm-faixa title="Remover faixa">✕</button></div>`;

  modal(p.id ? 'Editar produto' : 'Novo produto', `
    <div class="grid2">
      ${campo('nome', 'Nome do produto *', p.nome, { required: true, placeholder: 'Ex.: Chaveiro acrílico personalizado' })}
      ${campo('categoria', 'Categoria', p.categoria, { placeholder: 'Ex.: Chaveiros, Canecas, Canetas' })}
      ${campo('codigo', 'Código / referência', p.codigo)}
      ${campo('custo', 'Custo unitário (R$) — opcional', p.custo || '', { type: 'number', step: '0.01', min: 0 })}
    </div>
    <fieldset class="faixas"><legend>Preço por quantidade</legend>
      <p class="dica">Exemplo para chaveiro: a partir de <b>1</b> → R$ 5,00 · a partir de <b>21</b> → R$ 4,80 · a partir de <b>51</b> → R$ 4,50.
        O sistema usa automaticamente o preço da faixa conforme a quantidade do pedido.</p>
      <div id="lista-faixas">${faixas.map(linhaFaixa).join('')}</div>
      <button type="button" class="btn sec peq" data-add-faixa>+ Adicionar faixa</button>
      <div class="simulador">Simular: <input type="number" id="sim-qtd" value="100" min="1"> unidades = <b id="sim-res"></b></div>
      <div class="dica" id="faixas-resumo"></div>
    </fieldset>
    <label class="check"><input type="checkbox" name="ativo" ${p.ativo === false ? '' : 'checked'}> Produto ativo (aparece nos orçamentos)</label>
    ${area('observacoes', 'Observações (tamanho, cores, prazo do fornecedor…)', p.observacoes)}`, {
    largo: true,
    onOpen: el => {
      const lista = el.querySelector('#lista-faixas');
      const ler = () => [...lista.querySelectorAll('.faixa')].map(d => ({
        min: parseInt(d.querySelector('.f-min').value, 10) || 0,
        preco: U.num(d.querySelector('.f-preco').value),
      })).filter(f => f.min > 0).sort((a, b) => a.min - b.min);
      const sim = () => {
        const q = parseInt(el.querySelector('#sim-qtd').value, 10) || 0;
        const pr = U.precoPorQtd({ faixas: ler() }, q);
        const custo = U.num(el.querySelector('[name=custo]').value);
        el.querySelector('#sim-res').textContent = `${money(pr)} cada · total ${money(pr * q)}` +
          (custo && pr ? ` · margem ${Math.round((pr - custo) / pr * 100)}%` : '');
        el.querySelector('#faixas-resumo').textContent = U.descreverFaixas({ faixas: ler() });
      };
      el.addEventListener('click', e => {
        if (e.target.closest('[data-add-faixa]')) {
          const ult = ler().at(-1);
          lista.insertAdjacentHTML('beforeend', linhaFaixa({ min: ult ? ult.min + 1 : 1, preco: '' }));
          lista.querySelector('.faixa:last-child .f-min').select();
        }
        if (e.target.closest('[data-rm-faixa]') && lista.children.length > 1) {
          e.target.closest('.faixa').remove();
          sim();
        }
      });
      el.addEventListener('input', sim);
      sim();
      el._lerFaixas = ler;
    },
    onSubmit: async (fd, el) => {
      const fx = el._lerFaixas();
      if (!fx.length) { toast('Informe pelo menos uma faixa de preço', 'erro'); return false; }
      if (new Set(fx.map(f => f.min)).size !== fx.length) { toast('Há duas faixas com a mesma quantidade inicial', 'erro'); return false; }
      await DB.save('produtos', {
        ...p, nome: fd.nome.trim(), codigo: fd.codigo, categoria: fd.categoria, custo: U.num(fd.custo),
        faixas: fx, ativo: fd.ativo === 'on', observacoes: fd.observacoes,
      });
      toast('Produto salvo');
      render();
    },
  });
}

// ============================================================
//  Configurações e backup
// ============================================================
async function telaConfig() {
  main.innerHTML = `
    <div class="topo"><h1>Configurações</h1></div>
    <form class="cartao" id="f-cfg">
      <h2>Dados da empresa (aparecem no PDF)</h2>
      <div class="grid2">
        ${campo('empresa', 'Nome da empresa', CFG.empresa, { required: true })}
        ${campo('cnpj', 'CNPJ', CFG.cnpj)}
        ${campo('telefone', 'Telefone / WhatsApp', CFG.telefone)}
        ${campo('email', 'E-mail', CFG.email)}
      </div>
      ${campo('endereco', 'Endereço', CFG.endereco)}
      <label class="campo"><span>Logo (PNG ou JPG)</span><input type="file" id="logo" accept="image/*"></label>
      <div id="logo-prev">${CFG.logo ? `<img src="${esc(CFG.logo)}" style="max-height:60px"> <button type="button" class="btn sec peq" data-tirar-logo>Remover logo</button>` : ''}</div>

      <h2 style="margin-top:20px">Orçamentos</h2>
      <div class="grid2">
        ${campo('validadeDias', 'Validade padrão (dias)', CFG.validadeDias, { type: 'number', min: 1 })}
        ${campo('prazoPadrao', 'Prazo de produção padrão', CFG.prazoPadrao)}
      </div>
      ${area('condicoes', 'Condições comerciais (pagamento, arte, frete…)', CFG.condicoes)}

      <h2 style="margin-top:20px">Retomar contato com clientes</h2>
      ${campo('diasAlerta', 'Avisar quando o cliente ficar quantos dias sem comprar?', CFG.diasAlerta, { type: 'number', min: 1 })}
      ${area('msgReativar', 'Mensagem de WhatsApp para retomar contato — use {nome}, {empresa} e {dias}', CFG.msgReativar)}
      <div class="rodape-form"><button class="btn">Salvar configurações</button></div>
    </form>

    <div class="cartao">
      <h2>Backup</h2>
      <p class="dica">${DB.remoto ? 'Modo nuvem: os dados ficam no Supabase. O backup é uma cópia extra de segurança.'
        : 'Modo local: os dados ficam só neste navegador. Faça backup com frequência (ex.: salve no Google Drive).'}</p>
      <div class="acoes">
        <button class="btn sec" data-backup>⬇ Baixar backup</button>
        <label class="btn sec">⬆ Restaurar backup<input type="file" id="restaurar" accept=".json" hidden></label>
        ${DB.remoto ? '<button class="btn sec" data-sair>Sair</button>' : ''}
      </div>
    </div>`;

  let logo = CFG.logo || '';
  const form = main.querySelector('#f-cfg');

  main.querySelector('#logo').addEventListener('change', async e => {
    const f = e.target.files[0];
    if (!f) return;
    logo = await reduzirImagem(f, 400);
    main.querySelector('#logo-prev').innerHTML = `<img src="${logo}" style="max-height:60px">`;
  });

  main.onclick = async e => {
    if (e.target.closest('[data-tirar-logo]')) { logo = ''; main.querySelector('#logo-prev').innerHTML = ''; }
    if (e.target.closest('[data-backup]')) {
      const json = await DB.exportar();
      const a = document.createElement('a');
      a.href = URL.createObjectURL(new Blob([JSON.stringify(json, null, 1)], { type: 'application/json' }));
      a.download = `backup-brindes-${U.hoje()}.json`;
      a.click();
      URL.revokeObjectURL(a.href);
    }
    if (e.target.closest('[data-sair]')) { await DB.logout(); location.reload(); }
  };

  main.querySelector('#restaurar').addEventListener('change', async e => {
    const f = e.target.files[0];
    if (!f) return;
    try {
      const json = JSON.parse(await f.text());
      if (!confirmar('Restaurar este backup? Registros com o mesmo código serão substituídos.')) return;
      await DB.importar(json);
      CFG = { ...CFG_PADRAO, ...(await DB.getConfig()) };
      aplicarMarca();
      toast('Backup restaurado');
      render();
    } catch (err) { toast('Arquivo inválido: ' + erroMsg(err), 'erro'); }
  });

  form.addEventListener('submit', async e => {
    e.preventDefault();
    const fd = Object.fromEntries(new FormData(form));
    const novo = { ...CFG, ...fd, logo, diasAlerta: parseInt(fd.diasAlerta, 10) || 90, validadeDias: parseInt(fd.validadeDias, 10) || 15 };
    try {
      await DB.saveConfig(novo);
      CFG = novo;
      aplicarMarca();
      toast('Configurações salvas');
    } catch (err) { toast('Erro: ' + erroMsg(err), 'erro'); }
  });
}

function reduzirImagem(arquivo, maxLado) {
  return new Promise((ok, falha) => {
    const img = new Image();
    img.onload = () => {
      const fator = Math.min(1, maxLado / Math.max(img.width, img.height));
      const cv = document.createElement('canvas');
      cv.width = Math.round(img.width * fator);
      cv.height = Math.round(img.height * fator);
      cv.getContext('2d').drawImage(img, 0, 0, cv.width, cv.height);
      ok(cv.toDataURL('image/png'));
      URL.revokeObjectURL(img.src);
    };
    img.onerror = falha;
    img.src = URL.createObjectURL(arquivo);
  });
}

function aplicarMarca() {
  document.getElementById('marca-nome').textContent = CFG.empresa || 'Brindes';
  document.title = `${CFG.empresa || 'Brindes'} — Gestão`;
  document.getElementById('modo').innerHTML = DB.remoto ? '☁️ Nuvem (Supabase)' : '💻 Modo local (este navegador)';
}

// ============================================================
//  Início
// ============================================================
async function iniciar() {
  if (window.APP_CONFIG.SUPABASE_URL && !window.supabase) {
    document.body.innerHTML = '<div class="cartao" style="margin:40px auto;max-width:500px">Não foi possível conectar à nuvem. Verifique sua internet e recarregue a página.</div>';
    return;
  }
  if (DB.remoto && !(await DB.sessao())) {
    const tela = document.getElementById('login');
    tela.hidden = false;
    document.getElementById('f-login').addEventListener('submit', async e => {
      e.preventDefault();
      const fd = Object.fromEntries(new FormData(e.target));
      try { await DB.login(fd.email, fd.senha); location.reload(); }
      catch (err) { document.getElementById('login-erro').textContent = 'E-mail ou senha inválidos.'; console.error(err); }
    });
    return;
  }
  try { CFG = { ...CFG_PADRAO, ...(await DB.getConfig()) }; } catch (e) { console.error(e); }
  aplicarMarca();
  document.getElementById('app').hidden = false;
  window.addEventListener('hashchange', render);
  render();
}

iniciar();
