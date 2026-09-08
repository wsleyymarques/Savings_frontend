# SDD — Gerenciamento financeiro pessoal

Versão do documento: 0.6 — fundação técnica do backend e PostgreSQL em contêiner.
Data: 04/09/2026.

## 1. Objetivo e estágio

Construir uma aplicação simples para gerenciar a vida financeira pessoal: registrar ganhos e gastos, acompanhar o saldo das contas e organizar cartões com suas particularidades.

Este documento será desenvolvido passo a passo antes da implementação. Consolida o escopo funcional solicitado para a V1, incluindo categorias, Pix, boleto, visão geral e cadastro simples com nome, e-mail e senha, sem verificação por código. Detalhes não informados pelo usuário permanecem explicitamente propostos ou em aberto; a especificação técnica ainda não está concluída.

Status utilizados:

- **Confirmado:** informado explicitamente pelo usuário.
- **Proposto:** recomendação inicial que precisa ser validada.
- **Em aberto:** decisão ainda não tomada.

O vocabulário do projeto está em [CONTEXT.md](./CONTEXT.md).

O prompt independente para prototipação das interfaces está em [STITCH-PROMPT.md](./STITCH-PROMPT.md). Ele utiliza as propostas de interface deste documento; escolhas visuais do protótipo não alteram automaticamente as regras de negócio.

As prévias das seis páginas geradas no Stitch, a conferência realizada e os limites do protótipo estão em [STITCH-REVISAO.md](./STITCH-REVISAO.md).

O contrato visual para implementar o frontend está em [design.md](./design.md): tokens, sidebar, componentes, formulários laterais, responsividade, acessibilidade e critérios de aceite. Usar esse documento para resolver diferenças visuais entre telas do Stitch; as regras de negócio continuam neste SDD.

## 2. Requisitos confirmados

| ID | Requisito | Particularidades já informadas |
| --- | --- | --- |
| REQ-01 | Registrar ganhos | Gerenciar entradas financeiras pessoais. |
| REQ-02 | Registrar gastos | Gerenciar saídas e compras pessoais. |
| REQ-03 | Consultar o saldo da conta | Manter o balanço disponível para consulta. |
| REQ-04 | Cadastrar cartões | Cada cartão pode ter particularidades próprias. |
| REQ-05 | Configurar limites por cartão | Os limites podem variar entre cartões. |
| REQ-06 | Configurar vencimento por cartão | Cada cartão pode ter uma data de vencimento própria. |
| REQ-07 | Personalizar visualmente cartões | Usar imagem ou cor; o comportamento exato será definido. |
| REQ-08 | Associar gastos a cartões | Suportar compras no crédito e no débito. |
| REQ-09 | Ter um sistema simples de usuários | Cada usuário visualiza seus próprios valores, cartões e demais dados. |
| REQ-10 | Usar React com Vite no frontend | Escolha confirmada. |
| REQ-11 | Disponibilizar categorias genéricas de gastos | A aplicação já deve oferecer categorias iniciais. |
| REQ-12 | Cadastrar categorias específicas | Permitir categorias personalizadas vinculadas à conta. |
| REQ-13 | Registrar gastos por Pix | Pix é uma das formas de pagamento da V1. |
| REQ-14 | Registrar gastos por boleto | Boleto é uma das formas de pagamento da V1. |
| REQ-15 | Consultar uma visão geral consolidada | Incluir a soma de todos os limites e a soma de todos os gastos do usuário. |
| REQ-16 | Cadastrar usuário com nome, e-mail e senha | Cadastro simples, sem código de verificação por enquanto. |
| REQ-17 | Controlar acesso e troca de usuário | Login, saída e troca do usuário autenticado, preservando os dados individuais. |
| REQ-18 | Criar e editar em painel lateral no web | Toda ação de adicionar ou editar dentro da aplicação abre um painel lateral à direita, mantendo a página de origem ao fundo. |
| REQ-19 | Padronizar a interface e documentar o design | Sidebar baseada na captura fornecida, botões e componentes compartilhados nas telas do Stitch; `design.md` completo como instrução para o futuro frontend. |
| REQ-20 | Persistir a V1 em PostgreSQL configurado por ambiente | Backend NestJS, banco PostgreSQL em Docker, migrations e configurações externas lidas do `.env`. |

**Backend adotado:** NestJS com PostgreSQL, TypeORM e migrations. API e banco possuem contêineres no Compose; portas, credenciais, CORS e tokens são configurados pelo `.env`. Detalhes operacionais e rotas estão em [backend/README.md](./backend/README.md).

## 3. Separação dos conceitos

**Proposto:** distinguir a conta financeira, onde existe dinheiro, do cartão usado para realizar uma compra.

| Conceito | Papel na aplicação | Exemplo |
| --- | --- | --- |
| Usuário | Pessoa proprietária dos registros | Usuário que acessa seus dados. |
| Conta financeira | Local onde o dinheiro é acompanhado | Conta bancária com saldo inicial de R$ 1.000. |
| Receita | Ganho registrado | Salário de R$ 3.000. |
| Despesa | Gasto registrado | Mercado de R$ 150. |
| Cartão | Meio utilizado para uma compra | Cartão com crédito, débito ou ambas as funções. |
| Fatura | Agrupamento de compras no crédito por ciclo | Compras com vencimento em outubro. |
| Pagamento de fatura | Saída da conta para quitar a fatura | Pagamento de R$ 300 pela conta bancária. |
| Categoria de despesa | Classificação do motivo do gasto | Alimentação ou uma categoria personalizada. |
| Forma de pagamento | Meio usado para pagar | Pix, boleto, cartão de débito ou cartão de crédito. |

Limite de crédito não representa dinheiro disponível na conta. Saldo bancário e limite disponível precisam aparecer separadamente.

**Interpretação adotada para esta versão:** “categorias vinculadas àquela conta” significa conta financeira. Se o sentido pretendido for a conta de acesso do usuário, o vínculo deverá ser alterado para permitir o uso em todas as suas contas financeiras. Categorias específicas não são tratadas como subcategorias: a V1 proposta usa uma lista simples.

## 4. Modelo conceitual proposto

### 4.1 Usuário

- É proprietário das suas contas, cartões, receitas, despesas, categorias personalizadas e faturas.
- Só pode consultar e modificar registros que lhe pertencem.
- O cadastro solicita nome, e-mail e senha, sem etapa de confirmação por código.
- Simplicidade na autenticação não elimina a necessidade de separar os dados de usuários diferentes.

**Interpretação de “troca de usuário”:** encerrar o acesso atual e entrar com as credenciais de outro usuário. Não significa selecionar livremente o perfil de outra pessoa nem administrar outros usuários.

#### 4.1.1 Cadastro e login

**Confirmado:** nome, e-mail e senha no cadastro, sem verificação por código nesta versão.

Regras propostas para concretizar o fluxo:

- Cadastro exige nome de 1 a 100 caracteres após remover espaços nas extremidades, e-mail em formato válido e senha de 8 a 128 caracteres. Não alterar nem remover espaços da senha silenciosamente.
- Remover espaços nas extremidades do e-mail e comparar e-mails sem diferenciar maiúsculas de minúsculas. Um e-mail identifica somente um usuário; a unicidade é garantida também na persistência.
- Não exigir telefone, CPF, confirmação de senha, código, link de ativação ou aprovação manual. A senha possui controle Mostrar/Ocultar na interface.
- Após cadastro válido, iniciar a sessão e abrir a configuração da primeira conta financeira. Se o usuário adiar essa etapa, abrir a visão geral vazia com ação para cadastrar a primeira conta.
- Login solicita e-mail e senha. Credenciais inválidas retornam “E-mail ou senha inválidos”, sem abrir uma sessão.
- Manter a sessão ao atualizar a página enquanto ela estiver válida. Uma sessão expirada leva ao login sem exibir dados financeiros privados.
- Armazenar apenas o hash da senha, nunca a senha em texto puro. A senha e seu hash não integram respostas de perfil nem registros de log.
- Definir a tecnologia de sessão e sua duração na etapa técnica. O backend identifica o proprietário pela sessão autenticada; não confia em um identificador de usuário enviado pelo formulário.

#### 4.1.2 Sair e trocar usuário

- Menu do usuário no rodapé da sidebar: Meu perfil, Trocar usuário e Sair.
- Sair encerra a sessão atual e abre o login.
- Trocar usuário encerra a sessão atual e abre o login com o título “Entrar com outro usuário”, campos vazios e ação para criar cadastro.
- A troca exige autenticação normal do próximo usuário. Não apresentar lista pública de usuários cadastrados ou guardar senhas para alternar perfis.
- Ao sair ou trocar, limpar dados privados em memória, cache de consultas e rascunhos. Respostas de requisições antigas não podem reaparecer na sessão seguinte. Voltar pelo navegador não deve restaurar telas com dados do usuário anterior.
- Se houver formulário alterado e não salvo, pedir confirmação de descarte antes de encerrar a sessão. A confirmação existe apenas nessa situação.

#### 4.1.3 Meu perfil

**Proposta de controle básico:** exibir nome e e-mail, permitir editar o nome e alterar a senha informando senha atual e nova senha. O e-mail fica somente para leitura nesta V1 proposta.

- Alterar senha exige a senha atual correta e a mesma validação do cadastro. Após a alteração, invalidar as sessões do usuário e pedir novo login com a senha nova.
- Recuperação de senha sem acesso, alteração de e-mail, exclusão de usuário, login social, autenticação por código e painel administrativo não fazem parte do protótipo inicial. Não exibir botões para esses fluxos ainda não definidos.
- Dados conceituais do usuário: identificador, nome, e-mail normalizado, hash da senha e datas de criação e atualização. Credenciais são distintas dos registros financeiros.

### 4.2 Conta financeira

Dados propostos:

- Identificador e proprietário.
- Nome de identificação.
- Saldo inicial e data de referência desse saldo.
- Saldo atual calculado a partir das movimentações efetivadas.

**Proposto:** permitir uma ou mais contas por usuário, com saldo individual e saldo consolidado. A quantidade de contas ainda não foi confirmada explicitamente; o modelo permite começar usando apenas uma.

O saldo inicial representa o dinheiro existente no início do acompanhamento. Não é uma receita do período. O tratamento de lançamentos anteriores à data de referência precisa ser definido.

### 4.3 Receita

Dados propostos:

- Identificador e proprietário.
- Descrição.
- Valor positivo.
- Conta de destino.
- Data do recebimento.

**Proposto:** uma receita recebida aumenta o saldo da conta de destino.

**Em aberto:** a V1 permitirá também receitas previstas, ainda não recebidas? Se permitir, a previsão deverá ser separada do valor efetivado.

### 4.4 Despesa

Dados propostos:

- Identificador e proprietário.
- Descrição.
- Valor positivo.
- Data da compra ou do gasto.
- Forma de pagamento.
- Uma categoria de despesa.
- Conta à qual o gasto pertence, inclusive nas compras no crédito, para determinar as categorias disponíveis e os filtros.
- Cartão, quando utilizado.
- Conta de origem, quando houver saída direta de dinheiro.
- Fatura correspondente, quando a compra for no crédito.

**Confirmado:** as formas de pagamento da V1 incluem Pix, boleto, cartão de débito e cartão de crédito.

**Proposto:** registrar somente despesas efetivadas nesta primeira versão. Um boleto é registrado ao ser pago, com a data efetiva do pagamento; apenas receber ou emitir um boleto não reduz o saldo. Contas a pagar e lembretes de vencimento não estão incluídos nessa proposta inicial.

| Forma de pagamento | Dados específicos obrigatórios propostos | Efeito ao registrar |
| --- | --- | --- |
| Pix | Conta de origem e data do pagamento | Reduz o saldo da conta pelo valor pago. |
| Boleto | Conta de origem e data do pagamento | Reduz o saldo da conta pelo valor pago. |
| Cartão de débito | Cartão habilitado para débito e data da compra | Reduz o saldo da conta vinculada. |
| Cartão de crédito | Cartão habilitado para crédito e data da compra | Compromete limite e entra na fatura; não reduz o saldo da conta. |

Pix e boleto são registros manuais de pagamentos já realizados. Não executam pagamentos bancários. Nesta proposta, não exigem cartão, chave Pix ou código de barras. Pix e boleto financiados por cartão não fazem parte do fluxo básico.

**Em aberto:** observações, despesas futuras e inclusão de dinheiro como forma de pagamento. Parcelamento e recorrência possuem uma proposta inicial na seção 4.7, ainda sujeita a validação.

### 4.5 Cartão

Dados propostos:

- Identificador e proprietário.
- Nome de identificação.
- Funções habilitadas: crédito, débito ou ambas.
- Cor e/ou imagem de identificação.
- Conta financeira vinculada ao cartão, para classificação dos gastos; na função débito, também é a conta de origem do dinheiro.
- Limite total de crédito, quando aplicável.
- Dia de vencimento da fatura, quando aplicável.
- Dia de fechamento da fatura, quando aplicável.

O fechamento é uma necessidade identificada para a proposta de faturas: somente o vencimento não determina em qual ciclo uma compra entra.

**Proposto:** cada cartão pertence a uma conta financeira. A compra herda essa conta e suas categorias disponíveis. A conta escolhida posteriormente para pagar a fatura pode ser outra conta do mesmo usuário, sem reclassificar as compras originais.

**Proposto:** limite de crédito e vencimento de fatura se aplicam à função crédito. A função débito usa o saldo da conta vinculada. Um eventual limite próprio para compras no débito é uma decisão separada.

**Em aberto:** limites compartilhados entre cartões, comportamento ao exceder o limite, mudança de datas e origem das imagens. Não é necessário armazenar número completo do cartão ou código de segurança para atender ao escopo atual.

### 4.6 Fatura e seu pagamento

**Proposto:** cada cartão com função crédito possui faturas por ciclo, com período de compras, fechamento, vencimento, total de compras, valor pago e valor restante.

- Uma compra no crédito pertence a uma fatura.
- O pagamento informa qual conta forneceu o dinheiro, o valor e a data.
- O pagamento diminui o saldo da conta e o valor em aberto da fatura.
- O pagamento não cria uma segunda despesa para a mesma compra.

**Em aberto:** pagamento parcial, antecipação, atraso, juros, estornos e eventual saldo de fatura existente quando o cartão for cadastrado.

### 4.7 Compra parcelada e despesa recorrente

Uma compra parcelada e uma despesa recorrente não representam o mesmo evento:

- Na compra parcelada, o valor total e a quantidade de parcelas são conhecidos no momento da compra. O compromisso financeiro total nasce imediatamente.
- Na despesa recorrente, cada ocorrência é uma nova despesa originada por uma regra enquanto ela estiver ativa. Não existe necessariamente um valor total final.

#### Compra parcelada — proposta inicial

1. Disponível somente para cartão de crédito na primeira entrega.
2. O usuário informa descrição, valor total, quantidade de parcelas, data da compra, cartão e categoria.
3. O valor é dividido em centavos, sem arredondamento acumulado. Por exemplo, R$ 100,00 em 3 parcelas gera R$ 33,33, R$ 33,33 e R$ 33,34.
4. A primeira parcela pertence à fatura calculada pela data da compra e pelo fechamento do cartão; as demais pertencem aos ciclos mensais seguintes.
5. Todas as parcelas e faturas são criadas na mesma transação de banco. Uma falha não pode deixar apenas parte da compra registrada.
6. O valor total compromete o limite no momento do cadastro. O limite é liberado conforme as faturas que contêm as parcelas forem pagas.
7. Cada parcela exibe sua posição, como `3/10`, mas permanece vinculada à compra parcelada para operações sobre o conjunto.
8. Em meses que não possuem o dia original, a data é ajustada para o último dia do mês.
9. Na primeira versão, descrição e categoria podem ser alteradas nas parcelas futuras. Mudar cartão, quantidade ou valor exige cancelar as parcelas futuras elegíveis e criar uma nova compra.
10. Parcelas pertencentes a faturas pagas são preservadas. A exclusão integral só é permitida quando nenhuma parcela pertence a fatura fechada ou paga; caso contrário, a ação disponível é cancelar apenas as parcelas futuras elegíveis.

O relatório mensal deve decidir explicitamente se reconhece o valor total na data da compra ou o valor de cada parcela no respectivo ciclo. A proposta recomendada é reconhecer cada parcela no mês de sua fatura, mantendo o valor total separado como crédito comprometido.

#### Despesa recorrente — proposta inicial

1. Uma regra de recorrência guarda descrição, valor, categoria, forma de pagamento, conta ou cartão, data inicial, frequência, término opcional e estado ativo ou pausado.
2. A primeira entrega aceita frequência mensal. Frequências semanal e anual podem ser adicionadas depois sem alterar o conceito.
3. A regra não aparece diretamente como despesa. Ocorrências concretas e projeções futuras aparecem nos lançamentos e na previsão do período, sempre diferenciadas; somente ocorrências concretas entram em faturas e comprometem limite.
4. O sistema gera cada ocorrência no dia correspondente e mantém uma chave única formada pela regra e pela data prevista, evitando duplicidade em reinícios ou novas tentativas.
5. Alterar ou pausar uma regra afeta apenas ocorrências futuras. Ocorrências já geradas preservam o histórico.
6. Em meses que não possuem o dia configurado, a ocorrência cai no último dia do mês.
7. Se o cartão não tiver limite disponível, a ocorrência não é lançada silenciosamente: ela fica marcada como pendente de ação e a regra continua rastreável.
8. Para recorrência automática no primeiro incremento, priorizar compras no cartão de crédito, como assinaturas. Pix, boleto e débito exigem um conceito adicional de despesa prevista e confirmação de pagamento para não reduzir o saldo sem evidência de que o pagamento ocorreu.
9. A geração deve ocorrer por rotina diária no backend e também recuperar ocorrências vencidas após indisponibilidade, mantendo a operação idempotente.
10. Cada ocorrência recorrente gerada no crédito entra na fatura correspondente e compromete o limite pelo seu valor. Ocorrências futuras ainda não geradas aparecem como projeção nos lançamentos e compõem o gasto previsto do período, mas não reduzem o limite disponível, pois uma recorrência sem término não possui valor total conhecido.

#### Cálculo do limite de crédito

- Compra à vista: compromete o valor da compra enquanto a respectiva fatura não estiver paga.
- Compra parcelada: compromete a soma de todas as parcelas ainda não quitadas, inclusive as pertencentes a ciclos futuros.
- Despesa recorrente: compromete cada ocorrência já gerada e ainda não quitada; a próxima ocorrência passa pela validação de limite antes de entrar na fatura.
- Pagamento de fatura: libera somente o valor efetivamente quitado naquela fatura.
- Projeções de recorrências futuras são exibidas separadamente e não são confundidas com limite já comprometido.

Exemplo: um cartão com limite de R$ 5.000 possui uma compra de R$ 1.200 em 12 parcelas e uma assinatura recorrente de R$ 50 já gerada na fatura atual. O limite comprometido é R$ 1.250 e o limite disponível é R$ 3.750. Após quitar a primeira parcela de R$ 100 e a ocorrência de R$ 50, o comprometido cai para R$ 1.100 e o disponível sobe para R$ 3.900.

#### Edição e cancelamento

- Em uma compra parcelada, oferecer `esta parcela` e `esta e as próximas` somente quando as faturas envolvidas ainda permitirem correção.
- Em uma despesa recorrente, oferecer `somente esta ocorrência` e `esta e as próximas`; a segunda opção altera a regra e preserva as ocorrências passadas.
- Faturas pagas não são recalculadas por edição ou exclusão comum. Ajustes após pagamento dependem das regras futuras de estorno e correção financeira.
- A tela deve explicar quantos lançamentos e quais faturas serão afetados antes de confirmar uma ação sobre várias ocorrências.

#### Consulta e filtros

A listagem mantém filtros independentes para que conceitos diferentes possam ser combinados:

- Natureza: todos, receitas, despesas ou pagamentos de fatura.
- Tipo da despesa: todas, avulsas, parceladas ou recorrentes.
- Forma de pagamento: Pix, boleto, débito ou crédito.
- Situação da série: ativa, pausada, concluída, cancelada ou com pendência, quando aplicável.
- Conta, cartão, categoria e período continuam disponíveis conforme o escopo atual.

Exemplos de combinações: `Despesas + Parceladas + Crédito`, `Despesas + Recorrentes + Ativas` e `Parceladas + cartão específico`. Cada parcela aparece na listagem do período com identificação como `3/10`; a interface também permite abrir o conjunto da compra. Cada ocorrência recorrente indica a regra que a originou.

#### Lista de desejos e gastos planejados

1. Um desejo registra produto, valor estimado, prioridade, data desejada, link e observações, mas nunca altera saldo, limite, fatura ou os totais da visão geral.
2. Um desejo pode originar um gasto planejado. O vínculo é preservado para que sua situação passe de desejado para planejado e, depois, comprado.
3. Um gasto planejado contém antecipadamente descrição, valor, categoria, conta ou cartão, forma de pagamento, data prevista e parcelamento opcional.
4. O cenário planejado mostra saldo atual, total planejado, saldo após pagamentos imediatos, saldo após futuras quitações de cartão e limite projetado por cartão.
5. Gastos planejados aparecem somente na área Planejamento. Eles não entram na tabela de lançamentos nem nos indicadores realizados.
6. A ação `Registrar compra` solicita a data efetiva e cria uma despesa real usando os demais dados do planejamento.
7. A criação da despesa, das parcelas e faturas aplicáveis e a marcação do planejamento como realizado ocorrem na mesma transação de banco.
8. Um gasto realizado não pode ser realizado novamente. O planejamento e seu vínculo com o lançamento são preservados como histórico.
9. Cancelar um gasto planejado não exclui o desejo de origem; ele volta a ficar disponível como desejado.
10. Para crédito, a simulação compromete o valor total planejado no limite e distribui o impacto futuro pelas datas de vencimento das faturas, sem criar faturas reais.

#### Compromissos pessoais

1. Um compromisso pessoal representa pagamentos combinados com um beneficiário e pode ser parcelado ou recorrente mensal.
2. O valor informado corresponde a cada pagamento. Um compromisso parcelado também informa a quantidade total; um recorrente pode ter data final ou continuar até ser pausado ou cancelado.
3. Cada ocorrência futura aparece em Planejamento, Lançamentos e nos gastos previstos da Visão geral, sem alterar saldo, limite ou fatura.
4. A ocorrência vencida e ainda não paga fica identificada como atrasada.
5. `Registrar pagamento` solicita somente a data efetiva e cria uma despesa usando valor, categoria, conta ou cartão e forma de pagamento do compromisso.
6. Criar a despesa e vincular o pagamento à ocorrência é uma operação atômica e idempotente; a mesma ocorrência não pode ser paga duas vezes.
7. Depois de pago, o valor deixa de ser previsão e passa a integrar somente os gastos realizados, evitando dupla contabilização.
8. A última parcela conclui automaticamente o compromisso parcelado. Um compromisso recorrente permanece ativo até sua data final, pausa ou cancelamento.
9. Pausar suspende as previsões ainda não pagas; retomar reativa o calendário. Cancelar preserva pagamentos anteriores e impede novos.
10. Após o primeiro pagamento, modalidade, data inicial e quantidade de parcelas são preservadas para não invalidar o histórico; os demais dados continuam editáveis para ocorrências futuras.

### 4.8 Categorias de despesas

**Confirmado:** oferecer categorias genéricas e permitir cadastrar categorias específicas vinculadas à conta.

**Proposta de categorias iniciais:** Alimentação, Moradia, Transporte, Saúde, Educação, Lazer, Compras, Serviços e assinaturas, Impostos e taxas e Outros.

Regras propostas:

1. Categorias genéricas são fornecidas pelo sistema e ficam disponíveis em todas as contas; sua lista é comum, mas os gastos permanecem privados de cada usuário.
2. Categorias personalizadas pertencem ao usuário e a uma única conta financeira. Não aparecem para seleção em outra conta, mesmo quando ambas pertencem ao mesmo usuário.
3. Cada despesa possui exatamente uma categoria. O usuário pode escolher Outros quando nenhuma categoria for adequada; o formulário exige uma seleção explícita.
4. Categoria e forma de pagamento são independentes. Alimentação pode ser paga por Pix, boleto, débito ou crédito.
5. Categorias personalizadas exigem nome de 1 a 60 caracteres após remover espaços nas extremidades. Ícone e cor de categoria ficam fora do cadastro básico proposto.
6. Não permitir nomes duplicados entre as categorias disponíveis na mesma conta, ignorando maiúsculas, acentos e espaços repetidos. A mesma categoria personalizada pode existir em contas diferentes.
7. Permitir renomear e arquivar categorias personalizadas. Categorias utilizadas não são excluídas fisicamente: o histórico preserva seu vínculo e elas deixam de aparecer em novos lançamentos.
8. Renomear mantém a identidade da categoria e atualiza o nome exibido também no histórico. Categorias genéricas não são renomeadas nem excluídas pelo usuário.
9. Ao mudar a conta ou o cartão no formulário de gasto, revalidar a categoria. Se a categoria personalizada não pertencer à nova conta, limpar a seleção e exigir outra.
10. A mesma validação de propriedade, conta e categoria ativa ocorre no backend; não depende apenas das opções visíveis na interface.

Dados propostos: identificador, nome, origem (genérica ou personalizada), proprietário e conta (obrigatórios apenas para personalizadas), estado ativo/arquivado e datas de criação e atualização.

No relatório consolidado, uma categoria genérica reúne gastos de todas as contas selecionadas. Categorias personalizadas de contas diferentes permanecem separadas por identificador, mesmo quando têm o mesmo nome; a conta aparece junto ao nome para distingui-las.

## 5. Regras financeiras propostas

Estas regras são a base sugerida para discussão e ainda precisam de validação.

| ID | Evento | Efeito no saldo da conta | Efeito no crédito |
| --- | --- | --- | --- |
| RF-01 | Definir saldo inicial | Define o ponto de partida | Nenhum. |
| RF-02 | Receber uma receita | Aumenta pelo valor recebido | Nenhum. |
| RF-03 | Pagar uma despesa diretamente pela conta | Diminui pelo valor pago | Nenhum. |
| RF-04 | Comprar no débito | Diminui na conta vinculada ao cartão | Não consome limite de crédito. |
| RF-05 | Comprar no crédito | Não altera no momento da compra | Aumenta a fatura e compromete o limite. |
| RF-06 | Pagar uma fatura | Diminui na conta escolhida | Reduz a dívida e recompõe o limite, conforme a regra que adotarmos. |
| RF-07 | Registrar despesa paga por Pix | Diminui na conta de origem | Nenhum. |
| RF-08 | Registrar despesa paga por boleto | Diminui na conta de origem | Nenhum. |

RF-04, RF-07 e RF-08 são casos específicos de RF-03. Cada despesa gera uma única saída de dinheiro, sem aplicar a regra geral e a específica duas vezes.

### 5.1 Cálculo do saldo

Para o modelo básico, com lançamentos efetivados:

```text
saldo atual da conta
  = saldo inicial
  + receitas recebidas na conta
  - despesas pagas diretamente pela conta, incluindo débito, Pix e boleto
  - pagamentos de fatura realizados pela conta
```

Compras no crédito não são descontadas novamente nessa fórmula. Transferências, ajustes e estornos exigirão regras adicionais caso sejam incluídos.

### 5.2 Cálculo do limite

Para o cenário simplificado de compras à vista no crédito, sem juros, estornos ou limites compartilhados:

```text
limite disponível = limite total - valor de crédito ainda comprometido
```

O valor comprometido considera as compras ainda não quitadas de todas as faturas, inclusive ciclos futuros, e não apenas a fatura do mês. Fechar uma fatura ou chegar ao vencimento não libera limite automaticamente.

Parcelamento e pagamentos parciais precisam ser decididos antes de detalhar a fórmula final.

### 5.3 Saldo e resumo de gastos

**Confirmado:** a V1 possui visão geral com limites somados e gastos somados. **Proposto:** o painel também diferencia dinheiro em conta, receitas do período e faturas em aberto, conforme a seção 5.4.

O resumo de despesas inclui a compra no crédito uma única vez. O pagamento da fatura aparece como movimentação de dinheiro para quitação, sem aumentar novamente esse resumo de despesas.

**Proposto para a V1 sem parcelamento:** agrupar despesas no crédito pela data da compra e despesas em Pix, boleto ou débito pela data do pagamento efetivo. Receitas são agrupadas pela data do recebimento. Essa convenção deve aparecer na ajuda do filtro de período.

### 5.4 Visão geral consolidada

O painel considera somente dados do usuário autenticado. Os totais são calculados sobre todos os registros que atendem aos filtros, independentemente da paginação da lista.

Indicadores propostos para concretizar a visão geral solicitada:

| Indicador | Cálculo | Referência |
| --- | --- | --- |
| Saldo total em contas | Soma dos saldos atuais das contas selecionadas | Posição atual. |
| Limite total de crédito | Soma dos limites totais dos cartões de crédito das contas selecionadas | Posição atual. |
| Crédito comprometido | Soma dos valores ainda comprometidos nesses cartões | Posição atual, incluindo todos os ciclos. |
| Limite disponível total | Limite total de crédito menos crédito comprometido | Posição atual. |
| Receitas do período | Soma dos recebimentos nas contas e datas selecionadas | Período selecionado. |
| Gastos do período | Soma de despesas em Pix, boleto, débito e crédito, contadas uma vez | Período selecionado. |
| Resultado do período | Receitas do período menos gastos do período | Período selecionado; não equivale ao saldo bancário. |
| Faturas em aberto | Soma dos valores ainda não pagos das faturas | Posição atual; pode coincidir com crédito comprometido no modelo básico. |

Regras de apresentação e filtros propostas:

- Abrir com todas as contas e o mês atual selecionados. Oferecer período personalizado e a opção Todo o histórico para consultar todos os gastos registrados.
- Aplicar o filtro de contas a todos os indicadores. Aplicar o período somente a receitas, gastos, resultado e detalhamentos do período. Os indicadores de posição atual devem exibir esse rótulo e não mudar quando apenas o período mudar.
- Incluir detalhamentos de gastos por categoria, forma de pagamento, conta e cartão. O detalhamento por cartão considera apenas crédito e débito; Pix e boleto permanecem nos demais totais.
- Permitir filtrar a lista de gastos e seus detalhamentos por categoria ou forma de pagamento. Esses filtros locais não alteram os indicadores globais; ficam visualmente dentro da seção de gastos filtrados.
- Exibir cartões somente de débito sem limite de crédito; eles não entram na soma de limites.
- Manter saldo e crédito disponível como indicadores separados, sem somá-los em um indicador de dinheiro próprio.
- Não somar novamente o pagamento da fatura aos gastos nem somar faturas em aberto ao crédito comprometido como se fossem dívidas distintas.
- Sem registros, exibir totais zero e orientação para cadastrar conta ou lançamento.

**Premissas propostas:** todos os valores em BRL e limites independentes por cartão. Limites compartilhados e conversão entre moedas exigem outro cálculo e não fazem parte desta consolidação inicial.

## 6. Exemplo para validar a lógica

Hipóteses: conta com R$ 1.000 iniciais; cartão com limite de R$ 2.000; nenhuma dívida anterior; pagamento integral recompõe o limite imediatamente no controle manual.

| Etapa | Saldo da conta | Crédito comprometido | Limite disponível | Despesas acumuladas |
| --- | --- | --- | --- | --- |
| Ponto inicial | R$ 1.000 | R$ 0 | R$ 2.000 | R$ 0 |
| Receber R$ 3.000 | R$ 4.000 | R$ 0 | R$ 2.000 | R$ 0 |
| Comprar R$ 150 no débito | R$ 3.850 | R$ 0 | R$ 2.000 | R$ 150 |
| Comprar R$ 300 no crédito | R$ 3.850 | R$ 300 | R$ 1.700 | R$ 450 |
| Pagar a fatura de R$ 300 | R$ 3.550 | R$ 0 | R$ 2.000 | R$ 450 |

Esse cenário deverá se tornar um critério de aceitação quando suas regras forem aprovadas.

### 6.1 Pix, boleto, categorias e totais

Cenário adicional independente: duas contas, A com R$ 1.000 e B com R$ 500; um cartão de crédito na conta A com limite de R$ 2.000 e outro na conta B com limite de R$ 3.000; sem receitas nem dívidas anteriores. Todos os gastos abaixo ocorrem no período selecionado.

1. Registrar R$ 100 por Pix na conta A, na categoria genérica Alimentação.
2. Registrar R$ 200 por boleto pago na conta B, na categoria genérica Moradia.
3. Registrar R$ 300 no crédito do cartão da conta A, na categoria personalizada Equipamentos vinculada à conta A.
4. Registrar R$ 400 no crédito do cartão da conta B, na categoria genérica Compras.

Resultados esperados: saldo A de R$ 900, saldo B de R$ 300, saldo total de R$ 1.200, limite total de R$ 5.000, crédito comprometido de R$ 700, limite disponível de R$ 4.300 e gastos de R$ 1.000. Resultado do período: -R$ 1.000.

A categoria Equipamentos da conta A não pode ser escolhida em uma despesa da conta B. Ao filtrar somente a conta A, os gastos são R$ 400 e o limite total é R$ 2.000.

Se a fatura de R$ 300 do cartão A for integralmente paga usando a conta B, o saldo total passa a R$ 900, o crédito comprometido a R$ 400 e o limite disponível a R$ 4.600. Os gastos continuam em R$ 1.000, dos quais R$ 400 pertencem à conta A. O pagamento pela conta B não transfere a categoria nem a compra para essa conta.

## 7. Fluxos e telas iniciais propostos

1. **Acesso:** cadastrar nome, e-mail e senha, entrar, sair e trocar de usuário; sem verificação por código e com dados isolados por usuário.
2. **Configuração inicial:** cadastrar a conta e informar o saldo inicial.
3. **Visão geral:** consultar os indicadores consolidados da seção 5.4, selecionar período e contas e consultar detalhamentos dos gastos.
4. **Lançamentos:** cadastrar, consultar, editar e excluir receitas e despesas elegíveis; para gastos, selecionar Pix, boleto, débito ou crédito, informar conta ou cartão e escolher uma categoria disponível naquela conta.
5. **Cartões:** cadastrar e consultar cartões, personalização, funções, limites e datas aplicáveis.
6. **Faturas:** consultar compras por ciclo e registrar o pagamento pela conta escolhida.
7. **Categorias:** visualizar as categorias genéricas e cadastrar, renomear ou arquivar categorias personalizadas da conta selecionada. Permitir criar uma categoria durante o lançamento, preservando os campos já preenchidos e selecionando a nova categoria após salvar.
8. **Planejamento:** manter desejos, simular gastos, acompanhar compromissos pessoais e transformar compras ou pagamentos previstos em despesas reais informando a data efetiva.
9. **Meu perfil:** consultar nome e e-mail; na proposta de interface, editar nome e alterar senha mediante senha atual.

Receitas e despesas avulsas podem ser editadas ou excluídas. Despesas vinculadas a fatura paga são preservadas; séries parceladas e recorrentes seguem as regras específicas da seção 4.7.

### 7.1 Navegação proposta para o protótipo

Sidebar no desktop, menu lateral recolhível no celular, com a mesma ordem:

1. Visão geral.
2. Lançamentos.
3. Planejamento.
4. Contas.
5. Cartões.
6. Faturas.
7. Categorias.

No topo da sidebar, abaixo da marca, fica o seletor global de conta financeira com saldo, conforme a captura fornecida pelo usuário. Ele oferece Todas as contas e contas individuais e governa o escopo das seis páginas. Período e filtros locais ficam no conteúdo, sem duplicar o seletor de conta. No rodapé, avatar com iniciais, nome do usuário e menu Meu perfil / Trocar usuário / Sair, separado do seletor financeiro. Receitas e despesas são abas de Lançamentos; relatórios básicos ficam na Visão geral, sem telas redundantes. Medidas, estados e comportamento responsivo estão em [design.md](./design.md).

### 7.2 Mapa de telas e rotas propostas

| Tela | Rota sugerida | Conteúdo e ações principais |
| --- | --- | --- |
| Entrar | `/entrar` | E-mail, senha, Mostrar/Ocultar, Entrar e Criar cadastro. Estado alternativo para troca de usuário. |
| Criar cadastro | `/cadastro` | Nome, e-mail, senha, Criar cadastro e Já tenho cadastro. Sem código. |
| Primeira conta | `/inicio` | Nome da conta, saldo inicial, data de referência, Criar conta e Fazer depois. |
| Visão geral | `/visao-geral` | Indicadores e detalhamentos da seção 5.4, filtros e atalhos Nova receita / Novo gasto. |
| Lançamentos | `/lancamentos` | Abas Todos / Receitas / Despesas; busca, filtros, listagem e formulários de cadastro. Todos inclui pagamentos de fatura identificados como quitação. |
| Contas | `/contas` | Lista com saldo por conta, saldo consolidado e ação Nova conta. |
| Detalhe da conta | `/contas/:id` | Saldo, movimentações efetivas, gastos no crédito em seção separada e cartões vinculados. |
| Cartões | `/cartoes` | Cartões visuais, função, conta, limite, comprometido, disponível e ação Novo cartão. |
| Detalhe do cartão | `/cartoes/:id` | Compras no crédito/débito separadas, datas e acesso às faturas, conforme a função. |
| Faturas | `/faturas` | Filtro por cartão e ciclo; fechamento, vencimento, total e situação de pagamento. |
| Detalhe da fatura | `/faturas/:id` | Compras, total, valor pago, restante e ação Registrar pagamento. |
| Categorias | `/categorias` | Conta selecionada, genéricas disponíveis e personalizadas; criar, renomear e arquivar. |
| Meu perfil | `/perfil` | Nome, e-mail somente para leitura, edição do nome e alteração da senha. |

**Confirmado:** formulários de criação e edição dentro da aplicação web usam painel lateral à direita (drawer). Isso inclui receita, despesa, conta, cartão, categoria, dados de perfil e registro de pagamento. Não usar modal central nem navegar para uma página de formulário. Login, cadastro de usuário e configuração do primeiro acesso mantêm seus fluxos públicos/iniciais próprios.

O painel de formulário é diferente da sidebar de navegação à esquerda. No celular, o painel ocupa a tela inteira. Formulários não viram itens adicionais da navegação.

Comportamento proposto do painel:

- Largura de 520 px no desktop, conforme a padronização de `design.md`; altura total e fundo com sobreposição suave. No celular, ocupa toda a largura.
- Cabeçalho fixo com título da ação e botão Fechar; corpo com rolagem própria; rodapé fixo com Cancelar e Salvar (ou Registrar pagamento).
- Criar abre campos iniciais; Editar abre o mesmo componente com os valores existentes.
- Fechar ou cancelar preserva página, filtros e posição da lista. Com alterações não salvas, confirmar descarte dentro do painel.
- Ao abrir, direcionar o foco ao painel, manter a navegação por teclado dentro dele e devolver o foco ao botão de origem ao fechar. Escape segue a mesma regra de descarte.
- Criar uma categoria durante o gasto usa uma etapa do mesmo painel, com Voltar, preservando o rascunho do gasto. Evitar painéis ou modais empilhados.
- Validar campos junto aos respectivos rótulos, indicar salvamento em andamento, impedir envios repetidos e atualizar os registros afetados após sucesso.
- Para prototipar edição sem definir migrações financeiras, usar nome da conta, nome/cor/imagem do cartão, nome da categoria e lançamento não pertencente a fatura paga. Regras completas de correção financeira continuam pendentes.

### 7.3 Premissas visuais para os fluxos ainda em discussão

- Usar BRL, datas brasileiras e múltiplas contas nos exemplos, conforme as propostas existentes.
- Prototipar compra no crédito à vista e registro de pagamento integral de fatura fechada. O botão se chama “Registrar pagamento”; apenas registra uma quitação realizada fora do sistema.
- Mostrar ciclo Aberto/Fechado separadamente da situação Não paga/Paga. Regras de atraso, pagamentos parciais e antecipação continuam pendentes.
- Para personalização do cartão, propor seletor de cor e imagens predefinidas opcionais, com prévia. Upload ainda não está definido.
- Representar telas preenchidas, primeiro acesso, ausência de resultados, carregamento, erro recuperável, validação de campos e sucesso.
- Após salvar lançamentos ou pagamentos, atualizar listas e indicadores afetados; impedir envio repetido enquanto a ação estiver em andamento.
- Em fatura paga, apresentar comprovante interno do registro (valor, conta e data), sem repetir a ação de quitação. Não gerar comprovante bancário.
- As páginas privadas exigem sessão. Entrar e Cadastro não exibem sidebar nem dados financeiros do usuário anterior.

## 8. Integridade e critérios iniciais propostos

- **CA-01 — Isolamento:** um usuário não consegue ler ou alterar registros de outro, inclusive acessando diretamente a API por identificador.
- **CA-02 — Saldo:** o cenário da seção 6 produz os valores indicados após cada operação.
- **CA-03 — Débito:** uma compra no débito exige cartão com essa função e conta de origem pertencente ao mesmo usuário.
- **CA-04 — Crédito:** uma compra no crédito exige cartão com essa função e não reduz imediatamente o saldo da conta.
- **CA-05 — Quitação:** pagar uma fatura reduz o dinheiro da conta sem duplicar as despesas.
- **CA-06 — Valores:** receitas, despesas e pagamentos aceitam valores monetários positivos; o sentido do movimento vem do tipo de operação.
- **CA-07 — Consistência:** se uma operação falhar, nenhum dos saldos, vínculos ou registros envolvidos pode ficar parcialmente atualizado.
- **CA-08 — Dinheiro:** os cálculos preservam os centavos com representação monetária exata, sem erros de ponto flutuante.
- **CA-09 — Datas:** a regra de fechamento, compras no dia de fechamento e vencimento em meses curtos terá exemplos explícitos antes da implementação de faturas.
- **CA-10 — Categorias iniciais:** uma conta recém-cadastrada já oferece todas as categorias genéricas, sem exigir criação manual.
- **CA-11 — Escopo de categoria:** a API rejeita categoria personalizada de outra conta ou usuário, inclusive em compras no crédito; categorias genéricas podem ser usadas em qualquer conta própria.
- **CA-12 — Arquivamento:** arquivar categoria personalizada preserva os gastos e totais históricos, mas impede sua seleção em novos gastos.
- **CA-13 — Pix e boleto:** cada pagamento reduz o saldo uma única vez, sem exigir cartão nem comprometer limite; um boleto ainda não pago não pode ser registrado como despesa efetivada com data futura.
- **CA-14 — Consolidação:** o cenário da seção 6.1 produz os totais descritos antes e depois da quitação da fatura.
- **CA-15 — Período:** mudar o período recalcula receitas e despesas pela convenção da seção 5.3, mantendo os indicadores de posição atual.
- **CA-16 — Totais completos:** os totais consideram também lançamentos de outras páginas da listagem; sem lançamentos, retornam zero.
- **CA-17 — Classificação:** os subtotais por categoria e por forma de pagamento somam o mesmo total de gastos para o mesmo conjunto de filtros.
- **CA-18 — Duplicidade de categoria:** rejeitar, na mesma conta, nome personalizado equivalente a uma categoria disponível após a normalização definida; permitir o mesmo nome personalizado em contas diferentes.
- **CA-19 — Troca de conta:** trocar a conta ou o cartão de um lançamento invalida uma categoria personalizada incompatível e exige nova seleção.
- **CA-20 — Cadastro simples:** nome, e-mail válido ainda não utilizado e senha válida criam o usuário e permitem acesso imediato, sem etapa de código ou ativação por e-mail.
- **CA-21 — Cadastro inválido:** campos inválidos ou e-mail duplicado impedem criação; não pode haver usuários duplicados em envios concorrentes.
- **CA-22 — Login:** senha correta inicia sessão; credenciais incorretas mostram erro e não liberam páginas privadas.
- **CA-23 — Troca de usuário:** após sair de A e entrar como B, contas, cartões, categorias personalizadas, lançamentos e totais pertencem somente a B, inclusive após voltar no navegador e receber respostas de requisições antigas.
- **CA-24 — Sessão:** logout invalida o acesso da sessão encerrada na API; acesso sem sessão válida às páginas privadas retorna ao login.
- **CA-25 — Alteração de senha proposta:** senha atual incorreta impede alteração; alteração válida invalida sessões existentes e permite novo login apenas com a nova senha.
- **CA-26 — Perfil proposto:** editar o nome atualiza a identificação na interface sem alterar propriedade de registros; o e-mail permanece somente para leitura.
- **CA-27 — Painel lateral:** todas as ações de adicionar/editar dentro das seis páginas da sidebar abrem painel à direita no desktop; os valores existentes são carregados na edição.
- **CA-28 — Retorno à página:** cancelar/fechar preserva os filtros e confirma descarte quando necessário; criação de categoria durante gasto preserva o rascunho ao voltar.

## 9. Direção técnica

| Tema | Status | Definição |
| --- | --- | --- |
| Frontend | Confirmado | React com Vite. |
| Backend | Implementado | NestJS, API versionada em `/api/v1` e configuração validada por ambiente. |
| Autenticação | Implementado na fundação | Cadastro/login com JWT vinculado a sessão persistida e revogável; logout revoga a sessão atual e alteração de senha revoga todas. |
| Persistência | Implementado na fundação | PostgreSQL 17 em Docker, TypeORM, migrations explícitas e constraints de integridade. |
| Valores monetários | Implementado na API | `numeric(14,2)` no banco e strings decimais no contrato HTTP, sem cálculo financeiro em ponto flutuante. |
| Moeda | Proposto | Somente BRL na V1, permitindo consolidar valores sem conversão. |
| Imagens | Em aberto | Escolher entre upload, imagens predefinidas ou outra origem. |
| Hospedagem | Em aberto | Nenhuma definição até o momento. |

Os contratos implementados, comandos e variáveis estão em [backend/README.md](./backend/README.md). Pagamento parcial, juros, estorno e correção de parcelas já faturadas continuam em aberto.

## 10. Itens ainda não incluídos no escopo confirmado

Não assumir como requisito da V1 sem discussão:

- Integração automática com bancos ou importação de extratos.
- Investimentos, empréstimos e objetivos de economia.
- Compartilhamento familiar e permissões avançadas.
- Orçamentos por categoria e notificações.
- Parcelamentos, recorrências e agendamentos.
- Transferências entre contas.
- Pagamentos parciais, rotativo, juros e estornos.
- Aplicativo móvel nativo e múltiplas moedas.
- Subcategorias e hierarquias de categorias.
- Execução de pagamentos Pix ou boleto e leitura automática de códigos de barras.
- Boletos pendentes, lembretes e gestão de contas a pagar.
- Limite compartilhado entre cartões e Pix ou boleto financiados por crédito.
- Recuperação de senha, troca de e-mail, exclusão de usuário e administração de usuários.
- Login social, verificação por código e confirmação de e-mail; o cadastro solicitado dispensa essas etapas por enquanto.

Alguns desses itens podem ser essenciais para a rotina do usuário. A lista registra ausência de definição, não uma exclusão definitiva.

## 11. Sequência para aprofundar a especificação

| Etapa | Decisões a resolver | Resultado esperado |
| --- | --- | --- |
| 1 — Contas e saldo | Validar proposta de múltiplas contas, saldo inicial e saldo negativo | Definição precisa do dinheiro acompanhado. |
| 2 — Ganhos e gastos | Validar lançamentos efetivados, datas e vínculo das categorias à conta financeira | Regras de lançamento e resumo mensal. |
| 3 — Cartões | Funções, vínculo com conta, limite, imagem e cor | Cadastro de cartão completamente definido. |
| 4 — Crédito e faturas | Fechamento, vencimento, parcelamento e quitação | Ciclo de crédito com cenários e exceções. |
| 5 — Correções | Edição, exclusão, estorno e histórico | Comportamento seguro ao corrigir registros. |
| 6 — Usuários | Definir sessão e validar proposta de edição de nome e senha | Implementação do cadastro simples, login e troca já solicitados. |
| 7 — Experiência e arquitetura | Telas, validações, API, banco e testes | Especificação pronta para implementação. |

**Escopo funcional registrado para a V1:** cadastro com nome, e-mail e senha sem código, login e troca de usuário, dados próprios, ganhos e gastos, saldo das contas, cartões com particularidades, crédito e débito, Pix e boleto, categorias genéricas e personalizadas por conta e visão geral consolidada.

**Próximo aprofundamento:** validar as premissas propostas e detalhar o ciclo de faturas, especialmente fechamento, vencimento e quitação, antes de fechar os contratos técnicos.
