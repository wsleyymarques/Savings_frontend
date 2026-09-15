# SDD — Metas e objetivos (aplicação do hub)

Versão do documento: 0.3 — V1 implementada no backend e no frontend.
Data: 07/09/2026.

> **Evolução posterior:** [SDD-WESLEY-HUB-HABITS.md](./SDD-WESLEY-HUB-HABITS.md) redefine Wesley Hub com Savings e Habits como módulos do produto e Metas como capacidade compartilhada entre eles. Este documento continua sendo a referência do comportamento já implementado; em caso de conflito sobre a nova organização do Hub ou a integração com hábitos, prevalece o SDD mais recente.

## 1. Objetivo e estágio

Especificar uma segunda aplicação dentro do mesmo produto: um sistema de metas e objetivos por período, com objetivos genéricos (financeiros ou não) e um sistema de margem de erro, no qual o usuário declara antes a margem de erro esperada para o período e, ao final, compara com a margem de erro real apurada.

Este documento também registra a decisão maior que motivou a nova aplicação: transformar o produto atual de finanças pessoais em um **hub** — uma casca única (autenticação, usuário, navegação e design) na qual várias aplicações de uso pessoal convivem, compartilhando a mesma API e o mesmo frontend.

Os status seguem a convenção já usada em [SDD.md](./SDD.md):

- **Confirmado:** informado explicitamente pelo usuário.
- **Proposto:** recomendação inicial que precisa ser validada.
- **Em aberto:** decisão ainda não tomada.

A V1 descrita aqui está implementada: módulo `goals` no backend com migration própria, adaptadores HTTP e mockado no frontend, páginas de ciclos e de ciclo, e os três formulários no painel lateral. O que continua em aberto está na seção 11.

### 1.1 Conflito de nome a resolver

O usuário chamou a nova aplicação de **planning**. O nome já está ocupado: o produto de finanças possui hoje o módulo `planning` no backend (`src/planning`, rotas `/api/v1/planning/wishes` e `/api/v1/planning/planned-expenses`), a feature `src/features/planning` no frontend e o item "Planejamento" na sidebar, tratando de lista de desejos e gastos planejados. Reaproveitar o mesmo nome tornaria ambíguos módulos, rotas, tabelas e conversas.

**Adotado na implementação:** a aplicação nova chama-se **Metas**, com identificador técnico `goals`, rota de frontend `/metas` e prefixo de API `/api/v1/goals`. O `planning` atual continua como uma seção da aplicação de finanças, sem renomeação. Se o usuário preferir o nome `planning` para as metas, a troca implica renomear o módulo de desejos e gastos planejados para `wishlist` — decisão ainda dele, e um renomeio, não uma reescrita.

## 2. O hub

**Confirmado:** a mesma API e o mesmo frontend hospedam várias aplicações; o produto passa a ser um hub de aplicações de apoio ao dia a dia, e finanças vira a primeira delas.

### 2.1 Uma única API

**Confirmado:** tudo vive na mesma API. Existe um só backend NestJS (`Savings-backend`), um só banco PostgreSQL e um só frontend React (`Savings-frontend`). Uma aplicação do hub é um conjunto de módulos, rotas e tabelas dentro desse backend e um conjunto de páginas dentro desse frontend — nada mais.

Fica descartado, e não deve ser proposto de novo: serviço ou processo separado por aplicação, microsserviços, gateway, banco por aplicação, segundo frontend ou build separado. A palavra "isolamento" neste documento significa organização de código e de nomes, nunca separação de deploy.

| Princípio | Definição |
| --- | --- |
| Uma API, um banco, um frontend | Toda aplicação do hub roda no mesmo processo, no mesmo banco e no mesmo build do frontend. |
| Casca compartilhada | Autenticação, sessão, usuário, tokens visuais, painel lateral de formulários e layout pertencem ao hub, não a uma aplicação. |
| Fronteiras dentro do processo | Cada aplicação tem seus próprios módulos, tabelas e páginas; uma aplicação não consulta as tabelas de outra diretamente. |
| Integração por injeção | Quando uma aplicação precisa de dados de outra, ela injeta o serviço da outra, exportado de propósito pelo módulo dono, dentro do mesmo processo. Nunca por chamada HTTP interna nem por `JOIN` cruzado. |
| Namespaces obrigatórios | Cada aplicação recebe um identificador curto que prefixa rota de API, tabelas e pasta de código. |
| Repositórios separados | `Savings-frontend` e `Savings-backend` continuam sendo dois repositórios Git independentes; o hub não os transforma em monorepo. |

### 2.2 Registro de aplicações

| Identificador | Nome exibido | Prefixo de API | Rota base no frontend | Prefixo de tabelas | Estado |
| --- | --- | --- | --- | --- | --- |
| `finance` | Finanças | `/api/v1` (rotas atuais) | `/visao-geral`, `/lancamentos`, … | sem prefixo (legado) | Implementado |
| `goals` | Metas | `/api/v1/goals` | `/metas` | `goal_` | Este documento |

**Proposto:** as rotas atuais de finanças não são renomeadas agora. Um prefixo `/api/v1/finance` só vale a pena se houver uma terceira aplicação com risco real de colisão; enquanto isso, o custo de quebrar o frontend existente é maior que o ganho.

### 2.3 Navegação do hub

**Implementado:** a sidebar agrupa os itens por aplicação, com um rótulo por grupo — "Finanças" e "Metas". Um seletor dedicado de aplicação só se justifica quando houver mais aplicações; até lá o agrupamento resolve.

**Em aberto:** existir ou não uma página inicial do hub, anterior às aplicações, com um resumo de cada uma. Hoje a raiz redireciona para `/visao-geral`.

## 3. Requisitos confirmados da aplicação Metas

| ID | Requisito | Particularidades informadas |
| --- | --- | --- |
| MET-01 | Definir objetivos para um período | O período pode ser curto ou longo; o trimestre é o exemplo citado. |
| MET-02 | Suportar objetivos genéricos | O objetivo não é necessariamente financeiro nem numérico do mesmo jeito. |
| MET-03 | Registrar uma margem de erro esperada | Declarada pelo usuário antes ou durante o período. |
| MET-04 | Apurar a margem de erro real | Visível ao final do período, comparada com a esperada. |
| MET-05 | Conviver com a aplicação de finanças | Mesma API, mesmo frontend, mesma autenticação. |

Exemplos de objetivo dados pelo usuário, usados como casos de teste do modelo: regularizar todas as dívidas em três meses; depender menos de crédito; estudar um número de dias ao longo dos três meses.

## 4. Vocabulário

**Ciclo**: período fechado com data de início e fim que agrupa objetivos, como um trimestre. _Evitar_: período, quando o sentido for o intervalo genérico de uma consulta.

**Objetivo**: aquilo que o usuário quer alcançar dentro de um ciclo. _Evitar_: meta, como entidade separada.

**Métrica**: forma de medir um objetivo — conclusão, contagem, valor monetário ou percentual.

**Linha de base**: valor da métrica no começo do ciclo, necessário para objetivos de redução ou aumento.

**Alvo**: valor da métrica que caracteriza o objetivo alcançado.

**Registro de progresso**: anotação datada que move a métrica de um objetivo.

**Atingimento**: fração do caminho entre a linha de base e o alvo que foi percorrida, de 0 a 1.

**Margem de erro esperada**: quanto o usuário aceita ficar aquém do alvo, declarado antes do resultado.

**Margem de erro real**: quanto o usuário efetivamente ficou aquém, apurado a partir dos objetivos do ciclo.

**Desvio**: diferença entre a margem de erro real e a esperada, em pontos percentuais.

## 5. Modelo conceitual proposto

### 5.1 Ciclo

| Campo | Tipo | Observação |
| --- | --- | --- |
| `id` | uuid | |
| `userId` | uuid | Todo dado é privado do usuário, como no restante do produto. |
| `name` | texto | Ex.: "4º trimestre de 2026". |
| `startDate` | data | |
| `endDate` | data | |
| `expectedErrorMargin` | decimal(5,2) | Percentual. Padrão proposto: 10,00. |
| `status` | enum | `planejado`, `ativo`, `encerrado`. |
| `closedAt` | timestamptz | Preenchido no encerramento; congela o resultado. |
| `note` | texto | Opcional. |

Regras propostas:

- O ciclo não tem duração fixa. Trimestre é apenas um atalho de criação; o usuário pode criar um ciclo de um mês ou de um ano.
- Ciclos podem se sobrepor no tempo, para permitir um ciclo longo contendo objetivos anuais e ciclos curtos dentro dele. **Em aberto:** se ciclos sobrepostos precisam de vínculo pai/filho ou se ficam independentes. A recomendação é começar independentes.
- Encerrar um ciclo congela a margem real e impede novos registros de progresso. Reabrir é possível e volta o status para `ativo`.

### 5.2 Objetivo

| Campo | Tipo | Observação |
| --- | --- | --- |
| `id` | uuid | |
| `cycleId` | uuid | Um objetivo pertence a exatamente um ciclo. |
| `title` | texto | Ex.: "Regularizar todas as dívidas". |
| `description` | texto | Opcional. |
| `metricType` | enum | `conclusao`, `contagem`, `valor`, `percentual`. |
| `direction` | enum | `aumentar` ou `reduzir`. Sempre `aumentar` em `conclusao` e `contagem`. |
| `baselineValue` | decimal(14,2) | Obrigatório quando `direction` é `reduzir`. |
| `targetValue` | decimal(14,2) | Alvo. Em `conclusao`, vale 1. |
| `currentValue` | decimal(14,2) | Derivado dos registros de progresso. |
| `unit` | texto | Ex.: "dias", "dívidas", "R$", "%". |
| `weight` | decimal(5,2) | Peso na margem do ciclo. Padrão 1,00. |
| `expectedErrorMargin` | decimal(5,2) | Opcional; quando ausente, herda a do ciclo. |
| `status` | enum | `ativo`, `alcancado`, `abandonado`. |

Os quatro tipos de métrica cobrem os exemplos dados:

| Tipo | Uso | Exemplo do usuário |
| --- | --- | --- |
| `conclusao` | Feito ou não feito, sem meio-termo | Um objetivo que só faz sentido inteiro. |
| `contagem` | Somar ocorrências até um alvo | "Estudar 45 dias no trimestre". |
| `valor` | Valor monetário a alcançar ou reduzir | "Regularizar todas as dívidas", medido em reais quitados. |
| `percentual` | Proporção a aumentar ou reduzir | "Depender menos de crédito", medido pela fatia dos gastos no crédito. |

**Proposto:** "regularizar todas as dívidas" é melhor modelado como `contagem` (5 dívidas a regularizar) ou `valor` (R$ X a quitar) do que como `conclusao`, porque assim o resultado parcial aparece na margem de erro em vez de virar um zero.

**Em aberto:** permitir subdividir um objetivo em resultados-chave próprios, no estilo OKR. A recomendação é não incluir na V1 e reavaliar depois que houver um ciclo real preenchido, porque peso e margem já dão granularidade suficiente.

### 5.3 Registro de progresso

| Campo | Tipo | Observação |
| --- | --- | --- |
| `id` | uuid | |
| `objectiveId` | uuid | |
| `occurredOn` | data | Data do fato, não do registro. |
| `value` | decimal(14,2) | Incremento em `contagem` e `valor`; leitura absoluta em `percentual` e `conclusao`. |
| `note` | texto | Opcional. |

Regras propostas:

- Em `contagem` e `valor`, `currentValue` é a soma dos registros mais a linha de base.
- Em `percentual` e `conclusao`, `currentValue` é o valor do registro mais recente por `occurredOn`.
- Registros com data fora do ciclo são recusados.
- Registrar progresso em ciclo encerrado é recusado.

### 5.4 Origem do valor

**Proposto:** todo objetivo é preenchido manualmente na V1. Um campo `source` com valor `manual` fica reservado desde já para, depois, permitir objetivos alimentados automaticamente pela aplicação de finanças — por exemplo, a fatia de gastos no crédito calculada a partir dos lançamentos reais. Como tudo está na mesma API, essa ponte é apenas o módulo `goals` injetando um serviço que o módulo de finanças exporta de propósito, conforme a seção 2.1; não há chamada de rede envolvida. **Em aberto** para a V2.

## 6. Regras de cálculo propostas

### 6.1 Atingimento de um objetivo

Com `b` = linha de base, `a` = alvo, `v` = valor atual:

- `contagem` e `valor` com direção `aumentar`, e `b` ausente tratado como 0: `atingimento = (v - b) / (a - b)`.
- `percentual` e `valor` com direção `reduzir`: `atingimento = (b - v) / (b - a)`.
- `conclusao`: `atingimento` é 0 ou 1.

O atingimento é limitado ao intervalo de 0 a 1. Superar o alvo não gera crédito acima de 100% e não compensa outro objetivo. **Em aberto:** permitir superação acima de 100% para compensar objetivos fracos; a recomendação é não permitir, porque isso esconderia justamente o erro que o sistema quer medir.

Se `a` for igual a `b`, o objetivo é inválido e recusado no cadastro.

### 6.2 Erro de um objetivo

`erro = (1 - atingimento) × 100`, em pontos percentuais. Um objetivo alcançado tem erro 0; um objetivo intocado tem erro 100.

Objetivos com status `abandonado` **proposto:** entram no cálculo com o atingimento que tinham quando foram abandonados, para que desistir não melhore o resultado do ciclo.

### 6.3 Margem de erro real do ciclo

`margem real = Σ(erro do objetivo × peso) / Σ(peso)`.

O ciclo está **dentro da margem** quando `margem real ≤ margem esperada`. O desvio é `margem real - margem esperada`, em pontos percentuais, positivo quando o ciclo ficou pior que o esperado.

Quando o objetivo tem margem esperada própria, ele também recebe uma classificação individual de dentro ou fora da margem, sem alterar a fórmula do ciclo.

### 6.4 Margem projetada durante o ciclo

Enquanto o ciclo está ativo, a margem real ainda não existe. **Proposto:** exibir uma margem projetada que compara o atingimento com o tempo decorrido do ciclo. Sendo `t` a fração do ciclo já transcorrida, o ritmo esperado de um objetivo é `t` e o erro projetado é `max(0, (t - atingimento) / t) × 100`. A média ponderada desses erros é a margem projetada. Isso responde a "estou no caminho?" sem contaminar o número final.

Objetivos de `conclusao` são ignorados na projeção até serem concluídos, porque não têm ritmo.

## 7. Exemplo completo para validar a lógica

Ciclo "4º trimestre de 2026", de 01/10 a 31/12, margem de erro esperada de 15%, três objetivos de peso 1.

| Objetivo | Tipo | Base | Alvo | Resultado | Atingimento | Erro |
| --- | --- | --- | --- | --- | --- | --- |
| Regularizar todas as dívidas | contagem | 0 | 5 dívidas | 4 dívidas | 80,00% | 20,00 |
| Depender menos de crédito | percentual, reduzir | 60% | 30% | 38% | 73,33% | 26,67 |
| Estudar 45 dias | contagem | 0 | 45 dias | 41 dias | 91,11% | 8,89 |

Margem de erro real: `(20,00 + 26,67 + 8,89) / 3 = 18,52%`.

Resultado do ciclo: margem esperada 15,00%, margem real 18,52%, desvio de +3,52 pontos, **fora da margem**. A leitura útil é que o objetivo de crédito puxou o ciclo para fora; os outros dois estavam dentro do aceito.

## 8. Fluxos e telas propostos

| Rota | Tela | Conteúdo |
| --- | --- | --- |
| `/metas` | Ciclos | Lista de ciclos com período, status, margem esperada e margem real ou projetada. |
| `/metas/:id` | Ciclo | Cabeçalho com margem esperada, margem projetada ou real, desvio e tempo decorrido; lista de objetivos com barra de atingimento e erro atual. Ao encerrar, a mesma página passa a mostrar a margem real congelada, sem rota separada de resultado. |
| `/metas/objetivos/:id` | Objetivo | Métrica, alvo, histórico de registros de progresso e erro atual. **Ainda não implementada.** |

Criar e editar ciclo, objetivo e registro de progresso usam o painel lateral direito já existente no produto, como exige o REQ-18 do SDD de finanças. Os tokens visuais, a sidebar e os componentes vêm de [design.md](./design.md); nenhuma decisão visual nova é necessária para esta aplicação.

## 9. Contrato de API proposto

Todas as rotas exigem sessão autenticada e devolvem apenas dados do usuário atual, como no restante da API. Valores decimais trafegam como string, seguindo a convenção já adotada.

| Método | Rota | Papel |
| --- | --- | --- |
| GET | `/api/v1/goals/cycles` | Lista ciclos, com filtro opcional por status. |
| POST | `/api/v1/goals/cycles` | Cria ciclo. |
| GET | `/api/v1/goals/cycles/:id` | Ciclo com objetivos e resumo de margem. |
| PATCH | `/api/v1/goals/cycles/:id` | Edita nome, datas e margem esperada. |
| POST | `/api/v1/goals/cycles/:id/close` | Encerra e congela o resultado. |
| POST | `/api/v1/goals/cycles/:id/reopen` | Reabre um ciclo encerrado. |
| POST | `/api/v1/goals/objectives` | Cria objetivo em um ciclo. |
| PATCH | `/api/v1/goals/objectives/:id` | Edita objetivo. |
| DELETE | `/api/v1/goals/cycles/:id` | Remove o ciclo com seus objetivos e progresso. |
| DELETE | `/api/v1/goals/objectives/:id` | Remove objetivo ainda sem progresso. |
| GET | `/api/v1/goals/objectives/:id/progress` | Histórico de registros. |
| POST | `/api/v1/goals/objectives/:id/progress` | Registra progresso. |
| DELETE | `/api/v1/goals/progress/:id` | Remove um registro de progresso. |

## 10. Persistência proposta

Três tabelas novas, no mesmo PostgreSQL, com migrations explícitas: `goal_cycles`, `goal_objectives` e `goal_progress_entries`. Todas herdam `id`, `created_at` e `updated_at` da `BaseEntity` do backend. Valores numéricos de dinheiro seguem `numeric(14,2)`; percentuais usam `numeric(5,2)`. Chaves estrangeiras: `goal_cycles.user_id` para `users`, `goal_objectives.cycle_id` para `goal_cycles` e `goal_progress_entries.objective_id` para `goal_objectives`, todas com exclusão em cascata a partir do ciclo.

`currentValue` é **proposto** como coluna materializada e recalculada a cada escrita de progresso, e não como cálculo em tempo de leitura, para manter a listagem de ciclos barata.

## 11. Decisões em aberto

- Nome definitivo da aplicação e destino do módulo `planning` atual (seção 1.1).
- Listar o progresso de um objetivo na interface: a rota existe, mas nenhuma tela ainda mostra o histórico nem permite apagar um registro.
- Página própria de objetivo (`/metas/objetivos/:id`), prevista na seção 8 e ainda não implementada.
- Ciclos sobrepostos independentes ou hierárquicos.
- Superação de alvo compensando outros objetivos.
- Resultados-chave dentro de um objetivo.
- Objetivos alimentados automaticamente por dados de finanças.
- Página inicial do hub e formato do seletor de aplicação.
- Recorrência de ciclos, como criar o trimestre seguinte herdando objetivos.

## 12. Fora do escopo da V1

Lembretes e notificações; hábitos diários com sequência; anexos e evidências; compartilhamento ou acompanhamento por outra pessoa; histórico comparativo entre vários ciclos passados; gráficos de evolução além da barra de atingimento; importação de metas de outras ferramentas.

## 13. Sequência para aprofundar

| Etapa | Decisão a resolver | Resultado esperado |
| --- | --- | --- |
| 1 — Nome | Resolver a colisão com `planning` | Namespace fechado para código, rotas e tabelas. |
| 2 — Ciclo | Validar sobreposição, encerramento e reabertura | Ciclo definido por completo. |
| 3 — Objetivo | Validar os quatro tipos de métrica contra objetivos reais do usuário | Modelo de métrica fechado. |
| 4 — Margem | Validar as fórmulas da seção 6 com o exemplo da seção 7 | Regra de cálculo aprovada. |
| 5 — Hub | Definir navegação e página inicial | Casca pronta para receber a terceira aplicação. |
| 6 — Implementação | Migrations, módulo `goals` e telas | Concluída na V1: `goal_cycles`, `goal_objectives`, `goal_progress_entries`, rotas `/api/v1/goals` e páginas `/metas`. |
