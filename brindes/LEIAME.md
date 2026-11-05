# Sistema de Gestão de Brindes

Controle de **clientes, produtos, orçamentos e pedidos**, com:

- **Preço por quantidade** em cada produto. Exemplo: de 1 a 50 unidades, R$ 5,00 cada; a partir de 51, R$ 4,50. O preço muda sozinho conforme a quantidade digitada.
- **Orçamento e pedido em uma tela só.** Você digita o nome do cliente (se ele for novo, é cadastrado na hora), escolhe os produtos e clica em **“Salvar e já gerar pedido”**. Isso cria o orçamento e o pedido juntos.
- **Dias desde a última compra** de cada cliente, mais uma lista de quem está parado há muito tempo, com um botão de WhatsApp com a mensagem pronta.
- **PDF do orçamento ou pedido** com a sua logo, e envio pelo WhatsApp com o texto já montado.
- **Painel** com vendas do mês, pedidos em andamento, entregas atrasadas e valores a receber.
- **Funciona no celular.**

---

## 1. Testar agora (modo local, sem instalar nada)

Dê dois cliques em `index.html`. Ele abre no navegador.

Nesse modo os dados ficam **só naquele navegador e computador**. Use **Configurações → Baixar backup** com frequência.

Comece cadastrando a sua empresa em **Configurações** e os seus produtos em **Produtos**.

---

## 2. Colocar na nuvem de graça (acesso pelo celular, de qualquer lugar)

São cerca de 15 minutos, uma única vez.

### Passo A: banco de dados no Supabase (grátis)

1. Crie uma conta em <https://supabase.com> e clique em **New project**. Anote a senha que você escolher.
2. No menu da esquerda, abra **SQL Editor** e clique em **New query**. Cole todo o conteúdo do arquivo `supabase/schema.sql` e clique em **Run**.
3. Abra **Authentication → Users → Add user** e crie o seu usuário (e-mail e senha). Esse é o login do sistema.
   - Também em **Authentication**, desative a opção de novos cadastros (*Allow new users to sign up*). Assim só você entra.
4. Abra **Project Settings → API** e copie:
   - **Project URL**
   - **anon public key**
5. Abra o arquivo `js/config.js` e cole os dois valores:

```js
window.APP_CONFIG = {
  SUPABASE_URL: 'https://xxxxx.supabase.co',
  SUPABASE_ANON_KEY: 'eyJhbGciOi...',
};
```

> A *anon key* pode ficar no site. Quem protege os dados é o login: só usuários logados conseguem ler ou gravar.

### Passo B: publicar o site na Vercel (grátis)

1. Crie uma conta em <https://vercel.com> usando a sua conta do GitHub.
2. Clique em **Add New → Project** e escolha este repositório.
3. Em **Root Directory**, selecione a pasta **`brindes`**. Em *Framework Preset*, deixe **Other**.
4. Clique em **Deploy**. Você recebe um endereço como `https://seu-projeto.vercel.app`.
5. No celular, abra esse endereço e use **“Adicionar à tela inicial”**. O sistema fica com cara de aplicativo.

### Já usou no modo local e quer levar os dados para a nuvem?

1. No modo local, vá em **Configurações → Baixar backup**.
2. Depois de configurar a nuvem, entre no sistema e use **Configurações → Restaurar backup**.

### Sobre os planos grátis

- **Supabase**: 500 MB de banco, o suficiente para milhares de clientes e pedidos. O projeto **pausa se ficar 7 dias sem nenhum acesso**. Basta reativar no painel do Supabase, e usando o sistema toda semana isso não acontece.
- **Vercel**: grátis para este uso.
- As regras dos planos grátis mudam de tempos em tempos. Confira nos sites.

---

## Como usar no dia a dia

| Quero… | Onde |
|---|---|
| Fazer um orçamento | **＋ Novo orçamento** → cliente → itens → *Salvar orçamento* |
| Fazer orçamento e pedido de uma vez | **＋ Novo orçamento** → *Salvar e já gerar pedido* |
| Aprovar um orçamento que já existe | Abra o orçamento → *Aprovar e gerar pedido* |
| Mandar o orçamento ao cliente | Abra o orçamento → *WhatsApp* ou *PDF / Imprimir* (para salvar em PDF, escolha “Salvar como PDF” na impressão) |
| Ver quem está sem comprar há muito tempo | **Painel** ou **Clientes → Sem comprar há X dias** |
| Mudar o prazo de alerta (padrão 90 dias) | **Configurações** |
| Mudar o status de um pedido rapidamente | **Pedidos**: altere direto na lista |

## Arquivos

```
brindes/
├── index.html          → abre o sistema
├── css/style.css       → visual
├── js/config.js        → chaves da nuvem (Supabase)
├── js/app.js           → telas e regras
├── js/db.js            → onde os dados são salvos (local ou nuvem)
├── js/util.js          → cálculos (preço por faixa, datas, WhatsApp)
└── supabase/schema.sql → estrutura do banco para colar no Supabase
```
