# Design — Minhas Finanças V1

Versão 1.0 · 04/09/2026 · Instrução de implementação do frontend React + Vite.

## 1. Como usar este documento

Antes de implementar uma tela, leia este documento e a seção correspondente do [SDD](./SDD.md). Construa primeiro os componentes compartilhados; todas as páginas devem usá-los. Não copie seis implementações independentes do HTML gerado pelo Stitch.

Fontes e precedência:

1. O [SDD](./SDD.md) define escopo, regras financeiras, autenticação e decisões ainda propostas/em aberto. Este documento não aprova regras financeiras pendentes.
2. Este `design.md` define o contrato visual e de interação: tokens, medidas, componentes, responsividade e estados. Em diferenças visuais entre pranchas do Stitch, use este contrato.
3. O [projeto no Stitch](https://stitch.withgoogle.com/projects/6792643010236456932) fornece as referências visuais. Versões e conferências estão em [STITCH-REVISAO.md](./STITCH-REVISAO.md).
4. A [captura fornecida pelo usuário](./docs/design/sidebar-reference.png) é a referência de composição da sidebar. Seu texto e saldo são exemplos, não dados de produção.

**Origem das decisões:** sidebar branca, seletor lilás, destaque verde, ícones de contorno e usuário no rodapé foram observados na captura. Inter, superfícies claras e família esmeralda seguem o projeto no Stitch. As medidas, tokens semânticos e comportamentos detalhados abaixo são decisões de padronização desta etapa, não uma extração pixel a pixel da imagem. Estados não exibidos no Stitch continuam sendo requisitos de implementação, não funcionalidades já verificadas.

## 2. Direção visual e limites

Uma aplicação financeira pessoal clara, compacta e confortável para leitura. A hierarquia deve ajudar a distinguir dinheiro em conta, crédito e movimentações. Usar português brasileiro, BRL e datas brasileiras em todas as páginas.

- Fundo cinza muito claro, superfícies brancas, bordas suaves e verde esmeralda nas ações.
- A cor acompanha texto, ícone ou sinal; nunca é a única indicação de tipo ou status.
- Uma ação principal por cabeçalho. Ações secundárias ficam próximas do objeto afetado.
- Valores tabulares, rótulos explícitos e espaço suficiente para nomes longos e centavos.
- Tema claro na V1. Não adicionar seletor de tema, planos, notificações, exportação, integrações ou novos módulos por iniciativa visual.
- Usar o logo existente quando o asset estiver disponível. Enquanto não houver arquivo exportado, usar marca textual “Minhas Finanças” com pequeno símbolo geométrico esmeralda; não redesenhar um logo diferente por tela.

## 3. Tokens obrigatórios

Centralizar em uma única folha de tokens. Componentes não devem inventar hexadecimais ou medidas que já possuem token.

```css
:root {
  --font-sans: "Inter", system-ui, -apple-system, "Segoe UI", sans-serif;
  --color-canvas: #f8fafc;
  --color-surface: #ffffff;
  --color-surface-hover: #f1f5f9;
  --color-account-selector: #f5f3ff;
  --color-text: #0f172a;
  --color-text-secondary: #475569;
  --color-text-muted: #64748b;
  --color-border: #e2e8f0;
  --color-control-border: #94a3b8;
  --color-brand: #059669;
  --color-action: #047857;
  --color-action-hover: #065f46;
  --color-action-pressed: #064e3b;
  --color-on-action: #ffffff;
  --color-success-bg: #d1fae5;
  --color-success-text: #065f46;
  --color-danger: #b91c1c;
  --color-danger-hover: #991b1b;
  --color-danger-bg: #fef2f2;
  --color-warning-bg: #fffbeb;
  --color-warning-text: #92400e;
  --color-info-bg: #eff6ff;
  --color-info-text: #1d4ed8;
  --color-overlay: rgb(15 23 42 / 20%);
  --space-1: 4px;
  --space-2: 8px;
  --space-3: 12px;
  --space-4: 16px;
  --space-6: 24px;
  --space-8: 32px;
  --space-12: 48px;
  --radius-control: 8px;
  --radius-panel: 12px;
  --radius-pill: 999px;
  --sidebar-width: 240px;
  --drawer-width: 520px;
  --control-height: 44px;
  --button-height: 40px;
  --shadow-popover: 0 8px 24px rgb(15 23 42 / 10%);
  --shadow-drawer: -8px 0 32px rgb(15 23 42 / 12%);
  --duration-fast: 120ms;
  --duration-panel: 180ms;
}
```

`brand` é o esmeralda observado no projeto, destinado a marcas e elementos decorativos. Texto branco pequeno usa `action`, mais escuro, inclusive na linha ativa da sidebar. Bordas decorativas usam `border`; campos usam `control-border` para tornar o contorno identificável. Não usar `brand` como fundo de botão com texto branco de 14 px. Verificar contraste na implementação, inclusive sobre imagens de cartões.

| Uso | Tamanho / entrelinha | Peso |
| --- | --- | --- |
| Título da página | 28 / 36 px | 600 |
| Título de seção e drawer | 20 / 28 px | 600 |
| Título de cartão e marca | 16 / 24 px | 600 |
| Corpo e tabela | 14 / 20 px | 400 |
| Label e navegação | 14 / 20 px | 500 |
| Botão | 14 / 20 px | 600 |
| Legenda e badge | 12 / 16 px | 500 |
| Valor principal de indicador | 28 / 36 px | 600 |

Usar `font-variant-numeric: tabular-nums` para dinheiro, percentuais e datas em colunas. Não usar caixa alta em frases; a exceção é o rótulo compacto “CONTA ATIVA”. Sombras somente em menus e drawers; cartões comuns usam borda de 1 px.

## 4. Estrutura compartilhada da aplicação

### 4.1 Desktop

Referência de composição: 1440 × 960 px. `AppShell` ocupa pelo menos `100dvh`; sidebar fixa à esquerda com 240 px e conteúdo com margem correspondente. `main` possui `min-width: 0`, padding 32 px e seções com gap 24 px. O documento é a rolagem principal; não criar rolagem vertical independente em cada cartão.

Cabeçalho de página: título e descrição à esquerda; ação principal à direita, alinhados pelo centro. Descrição com cor secundária e no máximo duas linhas. Abaixo ficam filtros de período ou filtros locais. Não adicionar uma segunda barra global com seletor de conta duplicado.

### 4.2 Sidebar — referência única

Ordem vertical obrigatória:

1. Marca “Minhas Finanças”, área de 40 px de altura.
2. Espaço de 24 px e seletor de conta.
3. Espaço de 24 px e navegação principal.
4. Área flexível para empurrar o usuário até o rodapé.
5. Divisor e menu do usuário.

Sidebar branca, borda direita `border`, padding 16 px. Marca não muda por página. Se a altura disponível for insuficiente, o conjunto deve permitir rolagem sem sobrepor usuário e navegação.

**Seletor de conta:** largura integral interna, mínimo de 80 px de altura, fundo `account-selector`, raio 12 px, padding 12 px. Primeira linha com “CONTA ATIVA” e cápsula do saldo; segunda com nome e chevrons. Nome longo pode ocupar duas linhas, aumentando a altura; o saldo mantém leitura integral e pode passar para uma terceira linha. Não esmagar valores grandes para preservar uma altura fixa.

Menu: “Todas as contas”, seguido das contas financeiras do usuário. Seleção única, com check na opção atual; saldo de cada opção é opcional, mas deve ser consistente. A cápsula mostra saldo consolidado quando o escopo é Todas as contas e saldo individual nas demais opções. Nunca mostra limite de cartão. Sem contas, exibir “Nenhuma conta” e ação “Criar conta”, que abre o drawer.

| Ordem | Rótulo | Ícone de referência | Destino |
| --- | --- | --- | --- |
| 1 | Visão geral | `dashboard` | `/visao-geral` |
| 2 | Lançamentos | `receipt_long` | `/lancamentos` |
| 3 | Contas | `account_balance` | `/contas` |
| 4 | Cartões | `credit_card` | `/cartoes` |
| 5 | Faturas | `receipt` | `/faturas` |
| 6 | Categorias | `category` | `/categorias` |

Itens: altura mínima 40 px, padding horizontal 12 px, gap ícone/texto 12 px, raio 8 px e distância vertical 4 px. Ícone de 20 px, espessura visual uniforme. Usar uma única família de ícones de contorno; a referência é Material Symbols Outlined. Preferir SVGs da mesma família na implementação. Não renderizar nomes de ícones como texto nem misturar emojis.

Ativo: fundo `action`, texto/ícone brancos e `aria-current="page"`. Hover inativo: `surface-hover`; hover ativo: `action-hover`. Foco visível por anel. Apenas um item ativo, inclusive em rotas de detalhes. Badge de quantidade em Lançamentos é opcional: se existir, representa o total de itens na listagem sob o escopo/período atuais, incluindo quitações na aba Todos. Não fixar o “6” da captura. Ocultar enquanto a quantidade não estiver disponível; não inventar contagem.

Rodapé: avatar circular 32 px, iniciais derivadas do nome, nome e e-mail reais da sessão, botão de menu com nome acessível. Textos longos truncam visualmente e mantêm valor completo acessível. Itens do menu: **Meu perfil**, **Trocar usuário**, **Sair**. Meu perfil abre drawer; os demais seguem o fluxo de sessão do SDD. Não colocar contas financeiras no menu de usuário.

### 4.3 Escopo e navegação

- O seletor da sidebar governa dados financeiros das seis páginas, incluindo KPIs e listas. Cada página indica “Todas as contas” ou o nome escolhido em seu contexto textual.
- Período altera indicadores de movimentação; não altera a posição atual. Categoria/forma de pagamento na Visão geral afetam apenas o detalhamento de gastos, com essa indicação junto dos filtros.
- Em Categorias, Todas as contas mostra as padrões uma única vez e as personalizadas com identificação da conta. Criar categoria nesse escopo exige escolher uma conta no drawer.
- Em qualquer criação no escopo consolidado, exigir conta quando aplicável. Com uma conta selecionada, preencher essa conta como padrão, sem criar vínculo silencioso incompatível.
- Em detalhes de uma conta/cartão/fatura que sair do novo escopo, voltar à listagem correspondente. Nunca manter detalhe invisível ao filtro com valores aparentemente consolidados.
- Navegação usa rotas reais; não reproduzir links `#` do protótipo. A tela de perfil pode ter `/perfil` como endereço do drawer sobre a página anterior, com Visão geral como fundo no acesso direto.

### 4.4 Responsividade

| Largura | Navegação | Conteúdo | Grades |
| --- | --- | --- | --- |
| ≥ 1280 px | Sidebar fixa 240 px | Padding 32 px | KPIs até 4 colunas; cartões até 3 |
| 1024–1279 px | Sidebar fixa 240 px | Padding 24 px | KPIs e cartões em 2 colunas |
| 768–1023 px | Menu sobreposto | Padding 24 px | Até 2 colunas |
| < 768 px | Menu sobreposto | Padding 16 px | 1 coluna |

Navegação móvel abre pela esquerda, largura `min(280px, 100vw - 32px)`, com overlay, foco contido e botão Fechar. Cabeçalho móvel possui botão de menu com área de 44 px e marca; o escopo ativo também aparece no contexto da página. Não abrir menu de navegação e formulário ao mesmo tempo.

No celular, título usa 24/32 px e ações podem ocupar a largura integral. Filtros quebram em linhas. Controles interativos têm área mínima de toque de 44 × 44 px. Não diminuir fonte monetária para caber: ajustar grade e permitir quebra do rótulo.

Tabelas extensas usam rolagem horizontal **local**, com identificação acessível; página e cabeçalho não devem transbordar. Listas de contas, cartões e categorias se tornam cartões em uma coluna. Validar em 360, 390, 768, 1024 e 1440 px e com zoom de 200%.

## 5. Catálogo de componentes

### 5.1 Ações, campos e seleção

| Componente | Contrato |
| --- | --- |
| `Button` | Variantes primary, secondary, ghost, danger. Altura 40 px no desktop, mínimo 44 no toque; padding horizontal 16, gap 8, raio 8. Ícone opcional de 18 px. Secondary: branco, borda control-border e texto principal; ghost: transparente. Danger apenas para ação destrutiva prevista no SDD. |
| `IconButton` | Área 40 × 40 px no desktop/44 no toque, ícone 20, tooltip e nome acessível. Usar para editar, fechar e menu; não esconder a ação principal atrás de ícone ambíguo. |
| `FormField` | Label visível, gap 8 até controle, ajuda/erro abaixo com gap 4. Label associado por id; obrigatório indicado no texto e semanticamente. Erro substitui a ajuda quando necessário. |
| `TextInput` | Altura 44, padding horizontal 12, raio 8 e borda control-border. Placeholder complementa o label. Erro com borda danger e mensagem específica. Read-only mantém texto legível; disabled não recebe interação. |
| `MoneyInput` | Prefixo R$, entrada decimal brasileira, duas casas ao concluir, teclado decimal. Não deslocar cursor a cada tecla. Aceitar colagem formatada válida; rejeitar texto ambíguo com erro explícito. Valores positivos nas operações; saldo inicial segue regra do SDD. |
| `DateInput` | Label, DD/MM/AAAA, validação de data real e botão acessível para calendário. Manter data civil sem alterar o dia por conversão de fuso. Limites de data seguem o SDD. |
| `Select` / `Combobox` | Mesma altura e borda dos inputs; opção atual visível. Busca apenas quando a lista justificar. Contas e cartões são tipos distintos; nunca colocar cartões em select de conta. |
| `Tabs` | Altura mínima 40, gap 24, texto14/20. Ativo action e borda inferior2; navegação de teclado e semântica de abas quando troca painel local. |
| `RadioGroup` | Função de cartão e forma de pagamento; rótulos completos, seleção marcada visual e semanticamente. Não confiar somente em cor. |
| `ColorPicker` | Paleta predefinida, amostras com área44 e check na escolhida; nomes de cores acessíveis. A escolha tem prévia do cartão. Imagem predefinida é alternativa com fundo de segurança. |
| `DropdownMenu` | Fundo branco, borda, raio8, sombra de popover, itens mínimo40/44 no toque. Abre alinhado ao gatilho e se reposiciona sem cortar a viewport. Escape fecha e devolve foco. |

Estados de todos os controles: default, hover, focus-visible, disabled; botões de envio também loading. Foco: anel externo de 2 px `action`, offset 2 px, sem remover outline sem substituto. Loading preserva largura, mostra indicador e rótulo “Salvando…”/“Registrando…”, bloqueia nova submissão e anuncia atividade. Disabled usa fundo `surface-hover`, texto `text-muted` e não depende só de opacidade global. Não usar botão desabilitado sem explicação quando a restrição não é evidente.

### 5.2 Dados, indicadores e mensagens

| Componente | Contrato |
| --- | --- |
| `SurfaceCard` | Branco, borda1, raio12, padding24 desktop/16 mobile; sem sombra pesada. Título e ações em cabeçalho consistente. |
| `StatCard` | Rótulo, valor28/36 e legenda opcional. Ícone discreto. Identificar posição atual/período na seção. Zero é um valor válido; ausência de dado usa travessão e explicação. |
| `StatusBadge` | Altura mínima24, padding horizontal8, raio pill, texto12/16. Sucesso verde suave, atenção âmbar, erro vermelho, neutro cinza, informação azul. Sempre contém rótulo. Aberta/Fechada e Não paga/Paga são dimensões distintas. |
| `DataTable` | Cabeçalho mínimo44, linhas mínimo56, padding horizontal16, separadores1. Texto alinhado à esquerda, dinheiro à direita, ações no fim. Cabeçalhos sem abreviações opacas. Texto multilinha aumenta a linha sem corte. |
| `Pagination` | Quando os dados forem paginados, informar intervalo e total real; botões anterior/próximo com nome acessível. Paginação não altera totais agregados. Não mostrar controle falso no protótipo implementado. |
| `CreditUsage` | Barra de8 px, trilho surface-hover, preenchimento brand; legenda “R$ X de R$ Y utilizados” e valor disponível. Limite zero não divide por zero; barra limitada visualmente a100%, excesso expresso por texto se permitido pelo domínio. |
| `CategoryBreakdown` | Barras horizontais ordenadas por valor, label e BRL legíveis. Mesmo total do detalhamento filtrado. Alternativa textual/tabela acessível; tooltip não é a única fonte de valores. |
| `PaymentBreakdown` | Pix, Boleto, Débito e Crédito com rótulo e total. Diferenciar usando texto/ícone e paleta; gráfico opcional sem inventar transações. |
| `EmptyState` | Ícone discreto, título claro, explicação curta e uma ação útil. Primeiro uso difere de “Nenhum resultado para os filtros”. Limpar filtros no segundo caso. |
| `LoadingState` | Skeleton da estrutura real, sem valores financeiros fictícios. Anunciar carregamento sem repetir cada célula; reduzir animação quando solicitado pelo sistema. |
| `ErrorState` | Mensagem no bloco afetado com Tentar novamente; nunca substituir falha por saldo zero. Preservar filtros e rascunhos. |
| `Toast` / `InlineAlert` | Sucesso curto (“Despesa registrada”) em região viva educada; erro persistente junto ao formulário. Toast não substitui erro de campo e não cobre ações do drawer. |

Valores negativos possuem sinal e tratamento visual de despesa. Em saldo e resultado, zero é neutro. Faturas em aberto e limite comprometido não são dívidas diferentes para somar. Use “Saldo atual” para dinheiro e “Limite disponível” para crédito.

## 6. Drawer único para criação e edição

Este é um requisito do usuário: toda criação/edição dentro da aplicação abre painel lateral **à direita**, sem modal central nem página nova de formulário. Login, cadastro e primeiro acesso possuem suas próprias telas.

`FormDrawer`: largura520 px a partir de768 px; abaixo disso, largura100%; altura100dvh, fundo branco e sombra de drawer. Overlay cobre toda a aplicação. Estrutura em coluna: cabeçalho mínimo72 px com título e Fechar; corpo flexível com `overflow-y: auto`, padding24 desktop/16 mobile; rodapé mínimo80 px com divisor, Cancelar secundário e Salvar primário. Cabeçalho e rodapé crescem se conteúdo ou acessibilidade exigirem; não sobrepor campos. Em teclado móvel, último campo e ação devem continuar alcançáveis.

Camadas: conteúdo0, sidebar20, navegação móvel40/41 (overlay/painel), drawer60/61, popover do drawer70, toast80. Menus portalizados devem pertencer ao escopo de foco do drawer. Evitar z-index arbitrário por página.

Fluxo obrigatório:

1. Abrir com valores iniciais em criação ou registro existente em edição; guardar o elemento de origem e congelar a rolagem da página sem salto horizontal.
2. Expor título por `aria-labelledby`, semântica de diálogo modal e foco no primeiro campo útil ou título quando houver instrução necessária. Fundo fica inerte; Tab não escapa.
3. Manter rascunho durante validação, erro de rede e etapas internas. Exibir erro no campo, focar o primeiro inválido ao enviar e preservar todos os demais valores.
4. Salvar apresenta loading, impede repetição e só fecha após sucesso confirmado. Atualizar os dados dependentes conforme SDD e anunciar sucesso. Falha mantém o drawer aberto.
5. X, Cancelar, Escape e clique no overlay usam a mesma política. Sem mudanças, fechar. Com mudanças, mostrar **dentro do drawer** “Descartar alterações?” e ações “Continuar editando” / “Descartar”; não empilhar modal. Durante envio, impedir fechamento até resposta e comunicar atividade.
6. Fechar restaura foco, filtros, página da lista e posição de rolagem. Se o gatilho deixou de existir, focar o título da listagem. Não preservar rascunhos de um usuário depois de sair/trocar sessão.

Criar categoria dentro da despesa é uma etapa do mesmo drawer com Voltar. Preservar o rascunho completo; ao salvar categoria, retornar à despesa e selecioná-la. Não empilhar dois drawers. Aplicar animação curta de 180 ms com deslocamento horizontal e respeitar `prefers-reduced-motion`.

| Formulário | Campos e particularidades de UI |
| --- | --- |
| Nova receita / Editar receita | Descrição, valor, conta de destino, data de recebimento. Não solicitar cartão ou categoria de despesa. |
| Novo gasto / Editar gasto | Descrição, valor, data, forma, conta/cartão compatível e categoria obrigatória. Pix/boleto: conta; débito: cartão e conta vinculada; crédito: cartão, conta vinculada, limite e fatura prevista. Trocar vínculo limpa apenas categoria incompatível, explicando o motivo. |
| Nova conta / Editar conta | Criação: nome, saldo inicial, data de referência. Edição inicial: nome; saldo e data somente leitura até as regras de correção serem definidas no SDD. |
| Novo cartão / Editar cartão | Nome, conta, função, cor/imagem predefinida e prévia. Crédito habilita limite, fechamento e vencimento; só débito oculta esses campos. Na edição inicial, priorizar nome/cor/imagem; mudanças financeiras dependem das regras do SDD. Nunca pedir número completo ou CVV. |
| Nova categoria / Renomear categoria | Nome e conta de vínculo; erro de duplicidade junto do nome. Padrões não são editáveis. Arquivamento de personalizada confirma consequência no próprio painel e preserva histórico. |
| Registrar pagamento | Fatura identificada, conta de origem, data e valor integral somente leitura no fluxo proposto; resumo de impacto no saldo/limite. Botão “Registrar pagamento”. Explicar “Registre um pagamento que você já realizou”. |
| Meu perfil | Nome editável, e-mail somente leitura; seção Alterar senha com senha atual e nova senha. Não mostrar dados bancários no perfil. Comportamento após troca de senha segue o SDD. |

## 7. Composição das páginas

Todas usam `AppShell`, `PageHeader`, seletor global e componentes acima. Rotas de consulta detalhada podem existir conforme SDD; nunca são destinos de botão Criar/Editar.

### 7.1 Visão geral — `/visao-geral`

Título “Visão geral”, descrição “Acompanhe suas contas, gastos e cartões”, ação “Novo lançamento” com menu Nova receita / Novo gasto. Posição atual: saldo das contas, limite total, comprometido, disponível e faturas não pagas, agrupados sem sugerir soma entre dívida e crédito. Indicadores do período: receitas, gastos e resultado, com período explícito.

Detalhamento de gastos por categoria e forma, resumo de contas/cartões e últimos lançamentos. Destacar saldo e resultado por hierarquia, sem oito cartões visualmente idênticos. Período e filtros seguem seção4.3. Sem conta, mostrar CTA Nova conta; com conta e sem movimentos, mostrar zeros e CTA Novo lançamento. Não gerar gráfico circular vazio ou variação percentual sem período comparável.

### 7.2 Lançamentos — `/lancamentos`

Título “Lançamentos”, ação “Novo lançamento”, abas Todos / Receitas / Despesas. Busca por descrição; filtros período, categoria e forma. Conta vem da sidebar. Tabela: data, descrição, tipo, categoria, conta/cartão, valor e ação de edição quando permitida. Em layouts largos, conta e cartão podem ocupar colunas separadas; rótulos permanecem inequívocos.

Todos também mostra pagamento de fatura com tipo “Pagamento de fatura”; não contabilizar como nova despesa. Campos inaplicáveis mostram travessão. Nenhum botão Excluir financeiro enquanto a regra estiver pendente. Formulários de edição de compra em fatura paga não podem sugerir correção financeira já suportada.

### 7.3 Contas — `/contas`

Título “Contas”, descrição “Consulte o saldo das suas contas”, ação “Nova conta”. Resumo do saldo no escopo escolhido; cartões com nome, saldo atual, legenda “Saldo calculado pelos lançamentos registrados” e ações Ver detalhes/Editar conta. Detalhe separa movimentações efetivas de compras no crédito e mostra cartões vinculados. Não alegar sincronização, conciliação bancária ou débito automático.

### 7.4 Cartões — `/cartoes`

Título “Cartões”, ação “Novo cartão”. Resumo com limite total, comprometido e disponível dos cartões do escopo. Grade de cartões visuais: nome, conta, função e personalização. Para crédito, valores de limite, barra de uso, fechamento e vencimento; para débito, saldo da conta identificado como tal, sem fatura/limite artificial.

Cor/imagem fica na área de identidade; métricas permanecem em superfície legível. Sobre imagem usar camada de contraste ou bloco sólido para texto. Sem imagem, manter cor escolhida. Não inventar número de cartão. Detalhe mostra compras separadas por função e acesso às faturas aplicáveis.

### 7.5 Faturas — `/faturas`

Título “Faturas”, filtros cartão e ciclo. Ação contextual “Registrar pagamento” apenas para fatura elegível; não criar botão global ambíguo sem fatura selecionada. Resumo: cartão, ciclo, fechamento, vencimento, total, valor pago e restante. Badges separados para Aberta/Fechada e Não paga/Paga.

Lista de compras identifica datas de compra e categorias. O ciclo selecionado não implica que todas as compras aconteceram naquele mês. Drawer de pagamento mostra impacto e faz registro manual. Depois, substituir ação por resumo de pagamento com conta/data/valor. Nenhum comprovante bancário, juros, parcela ou pagamento parcial nesta referência da V1.

### 7.6 Categorias — `/categorias`

Título “Categorias”, ação “Nova categoria”. Seções “Categorias padrão” e “Categorias personalizadas”; categorias globais não duplicam por conta. Linha/cartão contém ícone, nome, badge Padrão/Personalizada e conta quando personalizada. Padrões não oferecem editar/arquivar. Personalizadas oferecem Renomear e Arquivar; arquivadas saem das escolhas para novas despesas, mas continuam identificadas no histórico.

Não acrescentar seletor de conta duplicado. No consolidado, nomes iguais de contas diferentes têm a conta ao lado. Vazio de personalizadas mantém padrões disponíveis. Lista padrão e validação do nome são as definidas no SDD.

### 7.7 Acesso, primeiro uso e perfil

Estas telas/estados seguem o mesmo sistema de componentes; sua especificação aqui não significa que tenham sido gerados ou verificados no Stitch.

- `/entrar`: sem sidebar, card central de até420 px com marca, título, e-mail e senha, Mostrar/Ocultar, Entrar e Criar cadastro. Fundo canvas; padding24/32. No mobile, margem16 e largura disponível.
- `/cadastro`: mesma composição; apenas nome, e-mail e senha. Sem código, confirmação de senha ou login social. Requisitos e mensagens de validação vêm do SDD, incluindo envio e erro de e-mail já cadastrado.
- Troca de usuário usa `/entrar` com título “Entrar com outro usuário” e campos vazios, após encerrar sessão anterior; não oferece lista de outros usuários.
- `/inicio`: card até520 px, título “Vamos cadastrar sua primeira conta”, nome, saldo inicial, data de referência; Criar conta e Fazer depois. Não confundir cadastro de conta financeira com cadastro de usuário.
- Meu perfil usa drawer sobre a aplicação, com título “Meu perfil”. A autenticação nunca exibe sidebar ou valores do usuário anterior.

## 8. Formatação, conteúdo e dados de demonstração

Dinheiro: `R$ 1.234,56`, duas casas em tabelas, formulários e valores principais; não abreviar saldo da sidebar quando isso esconder precisão. Data exibida DD/MM/AAAA; rótulo de ciclo “Outubro de 2026”. Não hardcodar data atual. Valores negativos mostram sinal; ganhos e gastos distinguem tipo também por texto.

Use verbos simples: Nova conta, Novo cartão, Nova categoria, Nova receita, Novo gasto, Salvar, Cancelar, Registrar pagamento. O cabeçalho unificado “Novo lançamento” abre a escolha receita/gasto. Não variar a mesma ação entre “Adicionar transação”, “Criar registro” e “Cadastrar movimento” em páginas diferentes.

Dados fictícios de referência, coerentes com o cenário de [STITCH-PROMPT.md](./STITCH-PROMPT.md): usuário Alexandre Junqueira, iniciais AJ e e-mail alexandre@email.com. Posição em 10/10/2026; período de movimentações setembro de 2026. O nome de demonstração não é usuário embutido no produto.

| Medida | Conta Principal | Conta Secundária | Consolidado |
| --- | --- | --- | --- |
| Saldo inicial | R$ 1.000,00 | R$ 500,00 | R$ 1.500,00 |
| Receitas de setembro | R$ 3.000,00 | R$ 0,00 | R$ 3.000,00 |
| Gastos imediatos | R$ 250,00 | R$ 200,00 | R$ 450,00 |
| Compras no crédito | R$ 300,00 | R$ 400,00 | R$ 700,00 |
| Gastos de setembro | R$ 550,00 | R$ 600,00 | R$ 1.150,00 |
| Saldo atual antes da quitação | R$ 3.750,00 | R$ 300,00 | R$ 4.050,00 |
| Limite total | R$ 2.000,00 | R$ 3.000,00 | R$ 5.000,00 |
| Limite disponível | R$ 1.700,00 | R$ 2.600,00 | R$ 4.300,00 |

Resultado de setembro: R$ 1.850,00. Os seis lançamentos do exemplo são uma receita de R$ 3.000, Pix de R$ 100, débito de R$ 150 e crédito de R$ 300 na principal; boleto de R$ 200 e crédito de R$ 400 na secundária. Não copiar o saldo R$ 48.250 da captura nem a combinação incorreta de receita R$ 2.000 e resultado R$ 850 com os saldos acima.

Principal: compra em 20/09, fechamento em 08/10, vencimento em 15/10; secundário: compra em 24/09, fechamento em 20/10, vencimento em 28/10. Em 10/10, a primeira fatura está fechada/não paga; a segunda aberta/não paga. Registrar quitação de R$ 300 pela principal deixa saldo principal de R$ 3.450, consolidado de R$ 3.750, principal disponível de R$ 2.000 e disponível total de R$ 4.600. Gastos de setembro permanecem R$ 1.150. Esta é uma fixture visual; cálculos reais seguem o SDD.

## 9. Instruções para construir o frontend

Estrutura sugerida, adaptável à arquitetura futura sem alterar os contratos:

```text
src/
  app/                 # composição, rotas privadas/públicas e provedores
  styles/tokens.css    # única origem dos tokens deste documento
  components/ui/      # Button, Field, Select, Badge, Menu, Tabs, Alert
  components/layout/  # AppShell, Sidebar, PageHeader, FormDrawer
  components/finance/ # Money, StatCard, CreditUsage, AccountCard
  features/           # auth, overview, entries, accounts, cards, invoices, categories
  assets/             # marca, fontes e imagens de cartão exportadas/licenciadas
```

1. Criar tokens, tipografia e primitives com seus estados antes das páginas. Usar uma implementação por componente e variantes explícitas; não manter cópias para cada módulo.
2. Implementar `AppShell` com `AccountScope` separado de `SessionUser`. O primeiro filtra finanças; o segundo controla identidade. Estado selecionado deve manter-se ao navegar na sessão e ser limpo na troca de usuário.
3. Implementar o drawer compartilhado com estado fechado/criando/editando/etapa de categoria/enviando/erro/descarte. O formulário controla os dados; o drawer controla layout, foco e fechamento. Preferir primitivas acessíveis já adotadas no projeto, sem impor biblioteca nova neste documento.
4. Compor as seis telas com fixtures coerentes e todas as rotas. Depois ligar aos dados da aplicação. Dados monetários chegam em representação exata definida pela camada de domínio; componentes formatam, não recalculam saldos a partir da página visível da tabela.
5. Após mutação, atualizar listas e indicadores dependentes somente com resultado consistente. Não otimizar saldo financeiro visualmente com sucesso presumido. Em falha parcial de carregamento, identificar os blocos desatualizados e permitir tentar novamente.
6. Implementar autenticação/primeiro uso com o mesmo catálogo, respeitando decisões técnicas e regras ainda abertas do SDD. Não colocar credenciais em fixtures ou no bundle.
7. Finalizar responsividade, acessibilidade e comparação visual. HTML/CSS do Stitch pode ajudar a observar composição; não é a arquitetura nem a fonte confiável de regras, acessibilidade ou cálculos.

Assets: manter a captura apenas como referência de projeto, fora do bundle da aplicação. Exportar logo/fontes/imagens pelos meios disponíveis quando necessário; não usar screenshot inteira como componente e não depender de uma URL temporária de imagem do Stitch. Fallbacks devem preservar legibilidade.

## 10. Critérios de aceite visual e de interação

- [ ] As seis rotas exibem a mesma sidebar, logo, largura, seletor, ordem, espaçamento e rodapé; somente seleção/dados mudam.
- [ ] Trocar conta atualiza o escopo e o saldo do seletor; trocar usuário limpa dados e rascunhos privados.
- [ ] Botões, campos, menus, abas, badges, tabelas e cartões usam os mesmos tokens e variantes.
- [ ] Criar/editar cada entidade e registrar pagamento abrem drawer direito com título, X e rodapé persistentes; mobile ocupa a tela inteira.
- [ ] Editar preenche valores; criar inicializa corretamente; erro não perde rascunho; criação de categoria retorna ao gasto preservado.
- [ ] Cancelar, X, Escape e overlay seguem a política de descarte; foco é contido e restaurado; menus internos funcionam por teclado.
- [ ] Cada tela possui carregamento, erro, vazio inicial e ausência de resultados quando aplicáveis; nenhuma falha se apresenta como saldo zero.
- [ ] Foco é visível; ícones têm nomes acessíveis; estados não dependem apenas de cor. Contraste mínimo alvo: 4,5:1 para texto normal e 3:1 para texto grande/controles relevantes.
- [ ] Valores grandes, nomes de conta longos, e-mails longos, saldo negativo e limite zero não quebram o layout.
- [ ] Datas e dinheiro mantêm formato brasileiro e precisão; fixture fecha conforme seção8 e não duplica gastos na quitação.
- [ ] Larguras de 360/390/768/1024/1440 px e zoom de 200% não causam perda de conteúdo ou rolagem horizontal da página; tabelas rolam localmente.
- [ ] Rotas, ações e filtros são reais na implementação; nenhuma âncora `#`, botão inerte ou contagem fixa herdada do protótipo.
- [ ] Não foram adicionadas funcionalidades além do SDD. Diferenças do Stitch estão registradas na revisão e resolvidas por este contrato visual.

Verificar com inspeção no navegador e testes de fluxo para criação/edição, validação, escopo, pagamento e sessão. Testes visuais devem usar fixtures determinísticas; conferir estados representativos, não gerar testes que apenas repetem classes CSS. Esta lista é um aceite futuro do frontend, não uma declaração de que a aplicação já existe.
