# Prompt para o Stitch — Finanças pessoais V1

> Referência visual normativa: [design.md](./design.md). Ao reutilizar este prompt, fornecer também esse arquivo e a [captura da sidebar](./docs/design/sidebar-reference.png). O design define os tokens e componentes compartilhados; não extrair medidas novas das versões antigas do canvas.

Crie um protótipo navegável de uma aplicação web de gerenciamento financeiro pessoal chamada provisoriamente “Minhas Finanças”. Quero todas as telas principais conectadas, com formulários, estados e navegação consistentes. O produto será desenvolvido em React com Vite. O foco deste trabalho é a interface da aplicação, não uma landing page.

## Direção visual

Interface em português brasileiro, valores em reais e datas DD/MM/AAAA. Estilo simples, moderno e sóbrio: fundo claro levemente cinza, superfícies brancas, texto escuro, verde esmeralda como destaque, bordas discretas e boa hierarquia tipográfica. Use cores sem depender exclusivamente delas para indicar receitas e despesas. Priorize leitura dos valores e clareza dos formulários. Evite gráficos decorativos e excesso de blocos de indicadores iguais.

Crie versões desktop e mobile. No desktop, sidebar à esquerda e cabeçalho com título e ações da página. No celular, menu lateral recolhível, formulários em tela inteira e listas adaptadas sem tabelas cortadas. Garanta contraste, rótulos visíveis, foco de teclado e botões confortáveis para toque.

## Estrutura da navegação

Sidebar nesta ordem:
1. Visão geral
2. Lançamentos
3. Contas
4. Cartões
5. Faturas
6. Categorias

Topo da sidebar: marca e seletor global de conta financeira com saldo, fundo lilás claro, opções Todas as contas e contas individuais. Não duplicar esse seletor nos filtros das páginas. Rodapé da sidebar: avatar com iniciais e nome do usuário, abrindo menu com Meu perfil, Trocar usuário e Sair. Receitas e despesas ficam em Lançamentos; análises básicas ficam na Visão geral.

## 1. Entrar, cadastrar e trocar usuário

Telas públicas sem sidebar:
- Entrar: e-mail, senha com Mostrar/Ocultar, botão Entrar e link Criar cadastro.
- Criar cadastro: somente nome, e-mail e senha; botão Criar cadastro e link Já tenho cadastro. Nome obrigatório, e-mail válido e senha de 8 a 128 caracteres. Não solicitar código, telefone, CPF ou confirmação de senha. Após cadastrar, abrir a configuração da primeira conta.
- Trocar usuário: encerrar a sessão e abrir a tela de login intitulada “Entrar com outro usuário”, com campos vazios. Exigir as credenciais do próximo usuário; não mostrar lista de pessoas cadastradas.
- Sair: retornar ao login sem deixar dados financeiros visíveis.

Mostrar estados de envio, campo obrigatório, e-mail já cadastrado e “E-mail ou senha inválidos”. Não incluir login social, código de verificação ou recuperação de senha nesta versão.

## 2. Primeira conta

Após o cadastro, apresentar uma tela curta: “Vamos cadastrar sua primeira conta”. Campos: nome da conta, saldo inicial e data de referência. Ações Criar conta e Fazer depois. Explicar que saldo inicial é o dinheiro existente ao começar a usar o sistema. Fazer depois abre a visão geral vazia com ação para cadastrar conta.

## 3. Visão geral

Usar o escopo da sidebar: todas as contas ou uma conta. Filtros no conteúdo: mês atual, período personalizado e Todo o histórico. Ação principal Novo lançamento, abrindo as opções Nova receita e Novo gasto.

Separar visualmente:
- Posição atual: saldo total das contas, limite total de crédito, crédito comprometido, limite disponível e valor de faturas em aberto. Estes valores não mudam ao trocar apenas o período.
- Período selecionado: receitas, gastos e resultado (receitas menos gastos).

Complementos: barras de gastos por categoria, distribuição por forma de pagamento, resumo das contas, resumo dos cartões e últimos lançamentos. Os gráficos devem ter valores legíveis e corresponder aos totais apresentados. Filtros locais por categoria e forma de pagamento alteram apenas o detalhamento de gastos, sem mudar os indicadores globais.

Saldo bancário e crédito disponível são valores separados. Compras no crédito entram nos gastos pela data da compra; Pix, boleto e débito entram pela data do pagamento. Pagar a fatura reduz o saldo, mas não conta novamente como despesa. Faturas em aberto e crédito comprometido não devem ser somados como dívidas distintas.

## 4. Lançamentos

Abas Todos, Receitas e Despesas. Ação principal Novo lançamento, abrindo as opções Nova receita e Novo gasto. Busca por descrição; filtros locais de período, categoria e forma de pagamento; conta vem da sidebar. Lista com data, descrição, tipo, categoria quando aplicável, conta, cartão quando aplicável e valor. Pagamentos de fatura aparecem em Todos identificados como quitação e não entram na aba Despesas.

Formulário Nova receita: descrição, valor positivo, conta de destino e data de recebimento.

Formulário Novo gasto: descrição, valor positivo, data, forma de pagamento e categoria obrigatória. Formas: Pix, Boleto, Cartão de débito e Cartão de crédito.
- Pix ou boleto: selecionar conta de origem; registrar pagamento já realizado, sem solicitar cartão, código de barras ou chave Pix.
- Débito: selecionar cartão habilitado; mostrar a conta vinculada que terá o saldo reduzido.
- Crédito: selecionar cartão habilitado; mostrar conta vinculada, limite disponível e fatura prevista. Explicar brevemente que o valor entra na fatura.
- Mostrar categorias genéricas e personalizadas da conta correspondente. Ao mudar de conta ou cartão, exigir nova categoria se a anterior deixar de ser válida.
- Permitir criar uma categoria durante o lançamento, sem perder os campos preenchidos.

Usar exclusivamente painel lateral à direita no desktop e painel em tela inteira no mobile para toda criação e edição dentro da aplicação. Após salvar, mostrar sucesso e atualizar os totais. Prototipar lançamentos efetivados, compras no crédito à vista e sem recorrência.

## 5. Contas

Lista de contas com nome e saldo atual; saldo consolidado no topo; botão Nova conta. Cadastro com nome, saldo inicial e data de referência. Ao abrir uma conta, mostrar saldo, movimentações efetivas e cartões vinculados; compras no crédito ficam em seção separada para não parecerem saídas imediatas do saldo.

## 6. Cartões

Lista com cartões visuais personalizados por cor ou imagem predefinida. Mostrar nome, conta vinculada e função: crédito, débito ou ambos. Para crédito, exibir limite total, comprometido, disponível, barra de utilização, fechamento e vencimento. Para somente débito, mostrar a conta vinculada sem limite de crédito nem fatura.

Novo cartão: nome, conta, função, cor e imagem predefinida opcional com prévia. Exibir limite de crédito e dias de fechamento/vencimento somente quando a função crédito estiver habilitada. Não solicitar número completo nem código de segurança. Detalhe do cartão com compras separadas por função e acesso às respectivas faturas.

## 7. Faturas

Listagem filtrável por cartão e ciclo, com fechamento, vencimento e total. Mostrar ciclo Aberto/Fechado separado de pagamento Não paga/Paga.

Detalhe com compras, categorias, datas, total, valor pago e restante. Para a versão prototipada, permitir Registrar pagamento integral de fatura fechada: escolher conta de origem e data, com valor integral preenchido. É um registro manual de pagamento realizado fora do sistema. Após registrar, atualizar o saldo e o limite, apresentar situação Paga e resumo do registro. Não oferecer novamente a mesma quitação. Não criar comprovante bancário. Pagamentos parciais, antecipação e juros ficam fora deste protótipo.

## 8. Categorias

Usar a conta selecionada na sidebar e duas seções:
- Genéricas, disponíveis em todas as contas: Alimentação, Moradia, Transporte, Saúde, Educação, Lazer, Compras, Serviços e assinaturas, Impostos e taxas e Outros.
- Personalizadas da conta selecionada, com ações Criar, Renomear e Arquivar.

Cadastro com nome obrigatório de até 60 caracteres e conta vinculada. Mostrar erro para nome duplicado entre as categorias disponíveis na mesma conta. Categorias genéricas não são editáveis. Arquivar preserva o histórico e remove a opção dos novos lançamentos. Categorias personalizadas com mesmo nome em contas diferentes devem aparecer acompanhadas do nome da conta no consolidado. Não usar hierarquia de subcategorias.

Em Todas as contas, mostrar as genéricas uma única vez e identificar a conta de cada personalizada. Criar categoria nesse escopo exige escolher a conta no drawer.

## 9. Meu perfil

Mostrar nome e e-mail. Permitir editar nome; e-mail somente para leitura. Seção Alterar senha com senha atual e nova senha, controles Mostrar/Ocultar e botão Salvar nova senha. Após sucesso, voltar ao login para autenticação com a nova senha. Não incluir administração de outros usuários.

## Dados coerentes para o protótipo

Use o usuário fictício Alexandre Junqueira, iniciais AJ, e-mail alexandre@email.com, e setembro de 2026 como período de lançamentos. Posição atual demonstrativa em 10/10/2026. Todos os lançamentos abaixo pertencem ao mesmo período:
- Conta principal: saldo inicial R$ 1.000,00; receita R$ 3.000,00; Alimentação por Pix R$ 100,00; Transporte no débito R$ 150,00; Equipamentos no crédito R$ 300,00. Saldo atual: R$ 3.750,00. Equipamentos é personalizada dessa conta.
- Conta secundária: saldo inicial R$ 500,00; Moradia por boleto R$ 200,00; Compras no crédito R$ 400,00. Saldo atual: R$ 300,00.
- Cartão principal com crédito e débito: limite R$ 2.000,00, comprometido R$ 300,00 e disponível R$ 1.700,00.
- Cartão secundário de crédito: limite R$ 3.000,00, comprometido R$ 400,00 e disponível R$ 2.600,00.
- Totais: saldo R$ 4.050,00; limites R$ 5.000,00; comprometido/faturas em aberto R$ 700,00; disponível R$ 4.300,00; receitas R$ 3.000,00; gastos R$ 1.150,00; resultado R$ 1.850,00.

## Estados e entrega

Regra obrigatória: toda ação de adicionar ou editar dentro da aplicação abre um painel lateral à direita, mantendo a página ao fundo. Isso inclui receitas, gastos, contas, cartões, categorias, perfil e registro de pagamento de fatura. Não usar modal central nem página separada de formulário. Login, cadastro de usuário e configuração inicial continuam em suas telas próprias.

Painel com 520 px no desktop, altura total, sobreposição suave, título e X fixos no topo, corpo com rolagem e ações Cancelar/Salvar fixas no rodapé. Edição abre valores preenchidos. Preservar filtros ao fechar, manter foco de teclado dentro do painel e confirmar descarte somente se houver alterações. Criar categoria durante gasto usa uma etapa no mesmo painel com Voltar e preservação do rascunho, sem empilhar modais. No mobile, ocupar a tela inteira.

Mostrar cada uma das seis páginas da sidebar em estado normal e estados suficientes com painéis de criação e edição abertos para revisar o comportamento visual. Seguir o layout já existente no projeto Stitch, com o mesmo logo, tipografia e cores.

Criar telas conectadas, componentes consistentes e estados preenchido, vazio, carregando, erro recuperável, sem resultados, validação e sucesso. Desabilitar envio repetido enquanto estiver salvando. Se sair ou trocar de usuário com formulário não salvo, confirmar descarte; sem rascunho, executar diretamente.

Demonstrar os fluxos: cadastro → primeira conta → visão geral; novo gasto nas quatro formas de pagamento; criação de categoria durante gasto; cartão → fatura → registro de pagamento; meu perfil; saída e troca de usuário. A troca de usuário também troca todos os dados apresentados. Usar dados fictícios no protótipo.

Não adicionar investimentos, metas, orçamento, integração bancária, execução de pagamentos, notificações, parcelamento, recorrência, transferências, exportações ou exclusão de registros financeiros. Priorizar uma V1 pequena, clara e utilizável. Nenhuma tela deve mostrar detalhes de API, banco de dados ou infraestrutura.
