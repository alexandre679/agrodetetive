# Simulador IBS/CBS do Produtor Rural

Página única (HTML + JavaScript, sem servidor) que compara, lado a lado, o produtor rural
**contribuinte** e **não contribuinte** do IBS/CBS (Reforma Tributária – EC 132/2023 e LC 214/2025).

- `index.html` – abra direto no navegador (funciona offline, exceto as fontes).
- `simulador.html` – mesmo conteúdo, sem o cabeçalho HTML (usado para publicar como Artifact).
  Depois de editar, regenere o `index.html` envolvendo este arquivo com `<!DOCTYPE html>…<body>`.

O que faz:
- Cadastro de produtos vendidos (com destino: empresa, cooperativa, exportação, consumidor) e de despesas (com tipo de fornecedor).
- Tratamento tributário sugerido por item (redução de 60%, alíquota zero, imune, não incidência etc.), editável.
- Débitos, créditos, crédito presumido do comprador (art. 168), saldo credor e resultado nos dois perfis.
- Fases da transição 2026–2033 e alíquotas editáveis.
- Base legal em cada item, com indicação de quais números de artigo foram conferidos e quais precisam ser conferidos no texto consolidado.

É uma estimativa para apoio à decisão; não substitui a análise do contador.
