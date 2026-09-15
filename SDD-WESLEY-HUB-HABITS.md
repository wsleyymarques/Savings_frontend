# SDD — Wesley Hub e módulo Habits

Versão do documento: 0.2 — fundação da V1 implementada no frontend e no backend.  
Data: 15/09/2026.

## 1. Objetivo e entendimento consolidado

O produto deixa de ser apenas uma aplicação de finanças e passa a se chamar **Wesley Hub**: um hub pessoal de aplicações que ajudam o usuário no dia a dia e podem compartilhar capacidades e dados de forma controlada.

A organização desejada é:

- **Wesley Hub** é a casca compartilhada: autenticação, perfil, navegação, design e troca de módulo.
- **Savings** é o módulo de finanças. Tudo que já existe nele deve continuar funcionando.
- **Habits** é o novo módulo para planejar e acompanhar a rotina, registrar execuções, visualizar estatísticas e alinhar ações diárias a metas de longo prazo.
- **Metas** deixa de ser tratada como uma terceira aplicação isolada e passa a ser uma capacidade compartilhada do Hub. Na primeira entrega ela aparece principalmente dentro de Habits, mas poderá receber progresso de Habits, Savings ou lançamentos manuais.
- A troca entre Savings e Habits acontece pelo menu aberto no ícone/avatar do perfil.

Na V1 do Habits, o usuário terá um checklist diário simples. Ele poderá criar uma atividade somente para um dia ou reutilizar um hábito cadastrado, como “Academia” e “Estudar”. Atividades quantitativas aceitam registros de contagem ou duração. No estudo, por exemplo, será possível informar o horário de início, o horário de término e a duração apurada.

Os registros do dia alimentam as metas automaticamente. Assim, uma meta “ir à academia pelo menos 3 vezes por semana” pode ser cumprida em quaisquer três dias da semana, enquanto uma meta “estudar 200 horas no ano” soma a duração das sessões de estudo.

### 1.1 Estado das decisões

Este documento usa os mesmos estados dos SDDs existentes:

- **Confirmado:** pedido explicitamente pelo usuário.
- **Adotado:** interpretação necessária para tornar o pedido implementável nesta versão do desenho.
- **Proposto:** recomendação que pode ser alterada antes da implementação.
- **Em aberto:** escolha que ainda não bloqueia o desenho inicial.

Este documento complementa [SDD.md](./SDD.md) e substitui as decisões de [SDD-METAS.md](./SDD-METAS.md) que tratavam “Metas” como aplicação independente e hábitos diários como fora do escopo. Ele não apaga nem invalida as regras financeiras já implementadas.

**Estado da implementação:** a identidade Wesley Hub, troca de módulos, telas Hoje/Rotina/Estatísticas, domínio persistente do Habits, registros de check/contagem/duração, tipos de ciclo e fontes automáticas de meta estão implementados. As migrations foram criadas, mas sua execução no banco local ficou a cargo do responsável pelo ambiente.

## 2. Situação atual do projeto

O projeto já possui:

- um frontend React/Vite em `Savings-frontend`;
- um backend NestJS em `Savings-backend`;
- um banco PostgreSQL compartilhado;
- autenticação, sessão, perfil, sidebar e formulários em painel lateral;
- o domínio financeiro completo já descrito no SDD de finanças;
- o módulo técnico `goals`, com ciclos, objetivos, registros manuais de progresso e cálculo de margem de erro;
- rotas de Metas no frontend e na API.

Hoje a sidebar mistura “Finanças” e “Metas” como se fossem aplicações no mesmo menu, a marca ainda é “Minhas Finanças” e o seletor de conta financeira aparece globalmente. Essa estrutura não representa a nova identidade do Wesley Hub e será reorganizada sem reescrever as regras financeiras.

## 3. Requisitos

### 3.1 Wesley Hub

| ID | Estado | Requisito |
| --- | --- | --- |
| HUB-01 | Confirmado | Renomear o produto exibido para **Wesley Hub**. |
| HUB-02 | Confirmado | Tratar Savings e Habits como módulos do mesmo produto. |
| HUB-03 | Confirmado | Permitir trocar de módulo pelo menu do ícone/avatar de perfil. |
| HUB-04 | Confirmado | Permitir comunicação controlada entre módulos. |
| HUB-05 | Confirmado | Preservar todo o comportamento financeiro já existente no Savings. |
| HUB-06 | Adotado | Manter um frontend, uma API, um banco, uma autenticação e um deploy. |
| HUB-07 | Proposto | Lembrar o último módulo acessado pelo usuário. |
| HUB-08 | Proposto | Cada módulo possui sua rota inicial, navegação e controles de escopo próprios. |

### 3.2 Habits V1

| ID | Estado | Requisito |
| --- | --- | --- |
| HAB-01 | Confirmado | Exibir um checklist simples das atividades de cada dia. |
| HAB-02 | Confirmado | Permitir criar uma atividade avulsa para um dia. |
| HAB-03 | Confirmado | Permitir criar hábitos reutilizáveis e adicioná-los a dias escolhidos. |
| HAB-04 | Confirmado | Registrar atividades binárias, contagens e durações. |
| HAB-05 | Confirmado | Em atividades de duração, registrar quando a execução começou, terminou e quanto tempo durou. |
| HAB-06 | Confirmado | Produzir estatísticas para acompanhar a rotina no tempo. |
| HAB-07 | Confirmado | Oferecer metas anuais, semestrais e trimestrais. |
| HAB-08 | Confirmado | Fazer os registros de hábitos contribuírem automaticamente para metas vinculadas. |
| HAB-09 | Confirmado | Suportar metas recorrentes como “academia no mínimo 3 vezes por semana”. |
| HAB-10 | Confirmado | Ajudar a relacionar a rotina diária com objetivos de longo prazo. |
| HAB-11 | Adotado | Permitir várias sessões do mesmo hábito no mesmo dia. |
| HAB-12 | Adotado | Permitir planejamento semanal copiando hábitos para dias específicos por meio do `+` diário. |

## 4. Arquitetura do produto

```text
Wesley Hub
├── Casca compartilhada
│   ├── autenticação e perfil
│   ├── registro e troca de módulos
│   ├── layout e design system
│   └── capacidade de Metas
├── Savings
│   └── finanças, planejamento financeiro e fonte futura de métricas
└── Habits
    ├── hoje e checklist
    ├── hábitos reutilizáveis
    ├── planejamento semanal
    ├── registros de execução
    └── estatísticas
```

### 4.1 Princípios adotados

| Princípio | Regra |
| --- | --- |
| Um produto | O usuário entra uma vez e navega entre os módulos sem trocar de sessão. |
| Dados privados | Todo dado pertence ao usuário autenticado e nunca é consultado usando um `userId` fornecido pelo cliente. |
| Navegação por módulo | A sidebar mostra apenas as páginas do módulo ativo. |
| Escopo local | O seletor de conta financeira existe em Savings; ele não aparece em Habits. |
| Dono do dado | Cada módulo escreve somente em suas próprias entidades. |
| Comunicação explícita | Um módulo consome outro por uma interface exportada e injetada no mesmo backend. |
| Sem integração interna por HTTP | Savings, Habits e Metas não chamam rotas HTTP uns dos outros. |
| Sem consulta cruzada | Um módulo não acessa diretamente repositórios ou tabelas pertencentes a outro. |
| Evolução gradual | As rotas e tabelas financeiras atuais são preservadas durante a refatoração. |

### 4.2 Registro de módulos

O frontend terá um registro único de módulos, usado pelo seletor de perfil, pela sidebar, pelo título mobile e pelos redirecionamentos.

| Identificador | Nome exibido | Rota inicial | Navegação inicial |
| --- | --- | --- | --- |
| `finance` | Savings | `/visao-geral` | Visão geral, lançamentos, planejamento, contas, cartões, faturas e categorias. |
| `habits` | Habits | `/habits/hoje` | Hoje, rotina, estatísticas e metas. |

**Proposto:** manter as rotas financeiras atuais na primeira fase. Colocar tudo sob `/finance` agora produziria quebra ampla sem benefício funcional. O registro relaciona essas rotas legadas ao módulo `finance`.

### 4.3 Metas como capacidade compartilhada

O código existente de `goals` continua sendo o dono de ciclos, objetivos, cálculo de atingimento e fechamento. Habits não duplica essas entidades. A diferença é que um objetivo passa a declarar de onde vem seu valor:

- `manual`: registros de progresso já existentes;
- `habits`: execuções reais de um ou mais hábitos;
- `finance`: métricas financeiras, em uma fase posterior.

O mesmo registro de academia pode contribuir para um objetivo trimestral e outro anual. O registro não é copiado: cada objetivo mede a mesma fonte dentro de sua própria janela.

### 4.4 Interface entre Metas e módulos fonte

A seam de integração é uma única interface conceitual, implementada por adaptadores de progresso:

```ts
interface GoalMetricSource {
  validate(binding: GoalSourceBinding, userId: string): Promise<void>
  measure(query: GoalMeasurementQuery, userId: string): Promise<MetricSeries>
}
```

`measure` devolve amostras normalizadas com data, valor e identificador da origem. Toda complexidade de ler sessões, contar dias distintos e respeitar o fuso horário fica dentro do adaptador dono dos dados.

Existem dois adaptadores reais na V1:

- adaptador manual, baseado nos registros de progresso existentes;
- adaptador Habits, baseado nos registros de execução.

O módulo Metas conhece apenas a interface e o tipo normalizado. Ele não conhece tabelas do Habits. Isso mantém a integração testável e permite adicionar o adaptador financeiro depois, sem mudar as fórmulas de Metas.

## 5. Vocabulário do Habits

**Hábito:** atividade reutilizável que o usuário pretende realizar e medir ao longo do tempo, como Academia ou Estudar.

**Atividade avulsa:** atividade criada para uma única data, sem virar automaticamente um hábito reutilizável.

**Item do dia:** intenção concreta de realizar uma atividade em uma data. É o que aparece no checklist.

**Registro de execução:** fato que comprova quanto de um item do dia foi realizado.

**Sessão:** registro de execução com horário inicial e final, usado para medir duração.

**Planejamento semanal:** escolha dos hábitos que aparecerão em dias específicos de uma semana.

**Meta recorrente:** objetivo avaliado em janelas repetidas, como um mínimo por semana.

**Vínculo de contribuição:** regra que diz quais registros alimentam um objetivo e como eles são agregados.

**Aderência:** proporção do que foi planejado que foi efetivamente concluído.

**Sequência:** quantidade de janelas consecutivas em que uma regra foi cumprida. Uma sequência semanal é diferente de dias consecutivos.

## 6. Modelo funcional do Habits

### 6.1 Hábito reutilizável

| Campo | Tipo | Observação |
| --- | --- | --- |
| `id` | uuid | |
| `userId` | uuid | Proprietário. |
| `name` | texto | Ex.: “Academia” ou “Estudar”. |
| `description` | texto | Opcional. |
| `color` | texto | Identificação visual opcional. |
| `measurementType` | enum | `check`, `count` ou `duration`. |
| `unit` | texto | Ex.: vezes, páginas, minutos. Derivada em `check` e `duration`. |
| `defaultDailyTarget` | decimal | Opcional; ex.: 120 minutos de estudo. |
| `weeklyTarget` | inteiro de 1 a 99 | Frequência desejada, ex.: três conclusões por semana. |
| `active` | booleano | Hábitos arquivados preservam o histórico. |

Regras:

- `check` representa feito ou não feito e gera valor 1 ao marcar.
- `count` soma quantidades, como páginas, copos ou séries.
- `duration` usa minutos como unidade canônica na persistência e converte para horas na exibição.
- A frequência semanal e o objetivo por execução são parâmetros diferentes: Academia pode ser 3 vezes por semana com uma conclusão por execução; Estudar pode ser 5 vezes por semana com 120 minutos por execução.
- Alterar nome, cor ou alvo padrão não reescreve itens e registros históricos.
- Arquivar impede novos planejamentos, mas não remove estatísticas nem progresso passado.

### 6.2 Planejamento e repetição

Um hábito pode ser adicionado manualmente a qualquer dia. Opcionalmente, uma regra de agenda preenche dias recorrentes, como segunda, quarta e sexta.

| Campo | Tipo | Observação |
| --- | --- | --- |
| `habitId` | uuid | Hábito de origem. |
| `weekdays` | lista de 1 a 7 | Segunda a domingo no fuso do usuário. |
| `startDate` | data | Início da vigência. |
| `endDate` | data | Opcional. |
| `dailyTarget` | decimal | Sobrescreve o alvo padrão quando informado. |
| `active` | booleano | Permite pausar a repetição. |

**Adotado:** os itens recorrentes são materializados de forma idempotente quando o período é aberto ou antecipadamente em uma janela curta. A combinação entre regra e data é única. Isso permite remarcar ou ignorar uma ocorrência específica sem alterar toda a série.

Uma meta semanal flexível não obriga o usuário a escolher dias fixos. “Academia 3 vezes por semana” pode ser medida em quaisquer três dias. O planejamento em dias específicos organiza a agenda; a meta avalia o resultado real.

### 6.3 Item do dia

| Campo | Tipo | Observação |
| --- | --- | --- |
| `id` | uuid | |
| `userId` | uuid | Proprietário. |
| `plannedOn` | data civil | Dia do checklist. |
| `habitId` | uuid ou nulo | Nulo quando for atividade avulsa. |
| `scheduleId` | uuid ou nulo | Origem recorrente, quando houver. |
| `titleSnapshot` | texto | Mantém o texto histórico. |
| `measurementType` | enum | Cópia da forma de medição no momento do planejamento. |
| `targetValue` | decimal | 1 para check; quantidade ou minutos nos demais. |
| `position` | inteiro | Ordem dentro do dia. |
| `state` | enum | `planned` ou `skipped`; `completed` é derivado dos registros. |

Regras:

- Um item `check` fica concluído quando possui um registro válido de valor 1.
- Um item `count` ou `duration` fica concluído quando a soma dos registros alcança o alvo do dia.
- Um item pode ficar parcialmente realizado e mostra `realizado/alvo`.
- Desmarcar um check remove o registro de execução correspondente, depois de confirmação apenas se houver observação associada.
- `skipped` continua visível nas estatísticas como não cumprido. A V1 não terá um estado “dispensado” que retire o item do denominador.
- Uma atividade avulsa pode ser salva como hábito para reutilização futura.

### 6.4 Registro de execução

| Campo | Tipo | Observação |
| --- | --- | --- |
| `id` | uuid | |
| `userId` | uuid | Proprietário. |
| `dailyItemId` | uuid | Item ao qual a execução pertence. |
| `occurredOn` | data civil | Data local à qual o fato será atribuído. |
| `value` | decimal | 1, quantidade ou duração em minutos. |
| `startedAt` | timestamptz ou nulo | Horário real de início. |
| `endedAt` | timestamptz ou nulo | Horário real de término. |
| `note` | texto | Opcional. |

Para duração, a V1 aceita duas formas de entrada:

1. início e fim, com duração calculada pelo servidor;
2. duração total manual, quando o horário exato não foi anotado.

Quando início e fim forem informados, `value` é derivado e não é confiado ao cliente. O fim deve ser posterior ao início. Uma sessão pode atravessar a meia-noite; ela é atribuída ao `occurredOn` escolhido e as estatísticas preservam os instantes reais.

**Fora da primeira entrega:** cronômetro rodando em tempo real e sincronizado entre dispositivos. A V1 registra intervalos já realizados.

## 7. Metas e alinhamento de longo prazo

### 7.1 Ciclos

O ciclo existente ganha um tipo de período:

| Tipo | Regra de datas |
| --- | --- |
| `annual` | 1º de janeiro a 31 de dezembro do ano escolhido. |
| `semester` | janeiro a junho ou julho a dezembro. |
| `quarter` | janeiro–março, abril–junho, julho–setembro ou outubro–dezembro. |
| `custom` | Datas livres, preservando o comportamento atual. |

**Proposto:** ciclos podem ter `parentCycleId`. Um trimestre pode pertencer a um semestre, e um semestre a um ano, desde que suas datas estejam totalmente contidas no pai.

### 7.2 Objetivos relacionados

Um objetivo pode ter `parentObjectiveId` opcional. Isso permite a leitura:

```text
Meta anual: construir uma rotina saudável
└── Meta semestral: manter consistência nos treinos
    └── Meta trimestral: academia pelo menos 3 vezes por semana
```

O vínculo expressa contribuição e navegação, não soma automática entre objetivos. O valor continua vindo de uma fonte explícita para evitar contagem dupla e resultados circulares.

### 7.3 Vínculo de contribuição

| Campo | Tipo | Exemplo |
| --- | --- | --- |
| `objectiveId` | uuid | Meta trimestral de academia. |
| `sourceType` | enum | `manual`, `habits` ou futuramente `finance`. |
| `sourceIds` | lista de uuid | Hábito Academia. |
| `aggregation` | enum | `completed_days`, `occurrences`, `sum`, `duration`. |
| `evaluationMode` | enum | `total` ou `recurring`. |
| `cadence` | enum ou nulo | `daily`, `weekly` ou `monthly`. |
| `targetPerWindow` | decimal ou nulo | 3 por semana. |
| `allowCarryover` | booleano | Padrão `false`. |

Agregações:

- `completed_days`: conta no máximo uma conclusão por hábito por dia;
- `occurrences`: conta todos os registros concluídos;
- `sum`: soma valores de atividades do tipo `count`;
- `duration`: soma minutos de sessões ou durações manuais.

Uma alteração ou remoção do registro em Habits muda imediatamente o progresso de ciclos abertos. Habits nunca cria registros manuais em `goal_progress_entries`; os fatos permanecem em seu módulo de origem.

### 7.4 Avaliação total

Metas como “estudar 200 horas no ano” usam `evaluationMode = total`:

```text
valor atual = soma das durações dentro do ciclo
atingimento = min(valor atual / alvo, 1)
```

As fórmulas atuais de aumento, redução, conclusão, erro e peso continuam válidas para objetivos manuais e financeiros.

### 7.5 Avaliação recorrente

Metas como “academia no mínimo 3 vezes por semana” usam `evaluationMode = recurring`, cadência semanal e agregação `completed_days`.

Para cada semana:

```text
atingimento da semana = min(dias concluídos / alvo semanal, 1)
atingimento do objetivo = média dos atingimentos das semanas encerradas
```

Com `allowCarryover = false`, fazer seis treinos em uma semana não compensa zero na semana seguinte. Essa é a opção padrão porque mede consistência, não apenas volume acumulado.

Semanas seguem segunda a domingo no fuso do usuário. Na primeira e na última semana parcial de um ciclo, o alvo é proporcional aos dias incluídos e arredondado para cima. Um alvo de 3 em uma janela de 4 dias vira `ceil(3 × 4/7) = 2`.

A semana atual não é tratada como falha antes de terminar. Durante a janela, a interface mostra progresso (`2 de 3`) e ritmo; somente janelas encerradas entram no resultado final de aderência.

### 7.6 Exemplos de validação

#### Academia três vezes por semana

- Hábito: Academia, tipo `check`.
- Ciclo: 4º trimestre de 2026.
- Agregação: dias concluídos.
- Cadência: semanal.
- Alvo: 3.
- Segunda, quarta e sábado concluídos: semana em 100%.
- Duas conclusões na semana: 66,67% de atingimento e 33,33% de erro.
- Duas execuções na quarta contam como um dia, pois a regra mede dias concluídos.

#### Estudo por duração

- Hábito: Estudar, tipo `duration`.
- Sessão de 19:00 a 21:15: 135 minutos.
- Sessão adicional de 22:00 a 22:30: 30 minutos.
- Total do dia: 165 minutos, exibido como 2h45.
- Uma meta anual de 200 horas recebe 165 minutos de progresso.
- Uma meta semanal de 5 horas mostra 165 de 300 minutos naquela semana.

### 7.7 Encerramento e histórico

O ciclo encerrado deve manter um resultado imutável, mesmo se um registro antigo de Habits for corrigido depois. Para isso, o fechamento persiste um snapshot do resultado do ciclo e de cada objetivo, incluindo valor medido, atingimento, erro e data de apuração.

Reabrir o ciclo remove a condição de congelamento e volta a calcular usando as fontes atuais. Um novo fechamento substitui o snapshot anterior e mantém `closedAt` atualizado.

## 8. Estatísticas do Habits

### 8.1 Indicadores da V1

| Indicador | Cálculo |
| --- | --- |
| Conclusão do dia | Itens concluídos ÷ itens planejados. |
| Aderência semanal | Itens concluídos ÷ itens planejados na semana. |
| Dias ativos | Dias com pelo menos um registro de execução. |
| Frequência por hábito | Dias concluídos ou ocorrências no período, conforme a medição. |
| Tempo por hábito | Soma de duração por dia, semana e mês. |
| Evolução | Comparação da janela atual com a janela anterior equivalente. |
| Sequência | Janelas consecutivas em que o alvo do hábito ou da meta foi alcançado. |
| Contribuição para metas | Progresso gerado por cada hábito nos objetivos vinculados. |

Itens `skipped` permanecem no denominador da aderência. Dias sem nenhum item planejado não reduzem a aderência. Resultados percentuais são calculados com precisão decimal e arredondados apenas na exibição.

### 8.2 Telas

| Rota | Tela | Conteúdo |
| --- | --- | --- |
| `/habits/hoje` | Hoje | Checklist, progresso do dia, ação rápida para atividade avulsa e hábitos reutilizáveis. |
| `/habits/rotina` | Rotina | Hábitos cadastrados, frequência desejada, progresso semanal e agenda dos próximos dias com ação `+` por dia. |
| `/habits/estatisticas` | Estatísticas | Aderência, frequência, tempo investido, sequências e comparação por período. |
| `/habits/metas` | Metas | Ciclos anuais, semestrais, trimestrais e personalizados. |
| `/habits/metas/:id` | Ciclo | Objetivos, vínculos com hábitos, atingimento, erro e contribuição. |

As rotas antigas `/metas` e `/metas/:id` continuam temporariamente como redirecionamentos para as novas rotas, preservando links existentes.

## 9. Fluxos principais

### 9.1 Trocar de módulo

1. O usuário abre o menu do avatar.
2. A seção “Módulos” mostra Savings e Habits, com o atual marcado.
3. Ao escolher Habits, a aplicação navega para a última rota válida do módulo ou `/habits/hoje`.
4. A sidebar passa a mostrar apenas Hoje, Rotina, Estatísticas e Metas.
5. A sessão, o perfil e o drawer continuam os mesmos.

Estrutura proposta do menu:

```text
Módulos
✓ Habits
  Savings
────────────
Meu perfil
Trocar usuário
Sair
```

### 9.2 Criar e concluir atividade avulsa

1. Em Hoje, o usuário escolhe “Adicionar atividade”.
2. Informa o nome e o tipo de medição.
3. O item entra no checklist da data escolhida.
4. Em `check`, marcar o checkbox registra a execução.
5. Opcionalmente, o usuário escolhe “Salvar como hábito”.

### 9.3 Planejar academia e vinculá-la a uma meta

1. O usuário cria o hábito Academia do tipo `check`.
2. No planejamento semanal, adiciona Academia aos dias que pretende treinar.
3. Cria ou abre um objetivo trimestral.
4. Seleciona a fonte Habits, o hábito Academia, “dias concluídos”, frequência semanal e alvo 3.
5. Cada checkbox concluído atualiza o progresso da semana.
6. O item diário mostra também o contexto da meta, por exemplo “2 de 3 nesta semana”.

### 9.4 Registrar estudo

1. O usuário abre o item Estudar.
2. Informa início 19:00 e fim 21:15, ou digita 2h15 manualmente.
3. O backend valida e grava 135 minutos.
4. O checklist mostra o acumulado do dia.
5. Metas semanais, trimestrais e anuais vinculadas são recalculadas a partir do mesmo registro.

## 10. Persistência proposta

### 10.1 Novas tabelas

| Tabela | Papel |
| --- | --- |
| `habit_definitions` | Hábitos reutilizáveis do usuário. |
| `habit_schedules` | Regras opcionais de repetição por dia da semana. |
| `habit_daily_items` | Itens concretos do checklist. |
| `habit_activity_records` | Execuções, quantidades e sessões realizadas. |
| `goal_source_bindings` | Liga um objetivo à fonte e à regra de agregação. |
| `goal_cycle_snapshots` | Congela em JSON o resumo do ciclo e o resultado individual de todos os objetivos. |

### 10.2 Alterações nas tabelas existentes

- `goal_cycles`: adicionar `cycle_type` e `parent_cycle_id` opcional.
- `goal_objectives`: adicionar `parent_objective_id` opcional.
- `goal_progress_entries`: continuar reservado ao adaptador manual; não receber cópias de execuções do Habits.

### 10.3 Integridade

- Todas as tabelas de Habits possuem `user_id`, índices por usuário e data e exclusão em cascata a partir do usuário.
- Um item, hábito, objetivo e vínculo relacionados devem pertencer ao mesmo usuário.
- `habit_activity_records.daily_item_id` deve apontar para item do mesmo usuário.
- Itens materializados por agenda têm unicidade em `(schedule_id, planned_on)`.
- `started_at` e `ended_at` aparecem juntos; quando existem, `ended_at > started_at`.
- Duração e quantidades precisam ser positivas.
- Um ciclo filho deve estar contido no intervalo do ciclo pai.
- Um objetivo pai pertence ao mesmo usuário e a um ciclo mais amplo compatível.
- Excluir um hábito com histórico é proibido; ele deve ser arquivado.

## 11. Contrato HTTP inicial

Todas as rotas exigem autenticação e usam o usuário da sessão.

### 11.1 Habits

| Método | Rota | Papel |
| --- | --- | --- |
| GET | `/api/v1/habits` | Lista hábitos ativos ou arquivados. |
| POST | `/api/v1/habits` | Cria hábito reutilizável. |
| PATCH | `/api/v1/habits/:id` | Edita ou arquiva hábito. |
| GET | `/api/v1/habits/day/:date` | Devolve checklist e resumo do dia. |
| GET | `/api/v1/habits/range?from&to` | Devolve os dias e itens de uma janela curta para a visão semanal. |
| POST | `/api/v1/habits/day/:date/items` | Cria item avulso ou a partir de hábito. |
| PATCH | `/api/v1/habits/items/:id` | Altera alvo, ordem, data ou estado do item. |
| DELETE | `/api/v1/habits/items/:id` | Remove item sem execução; com execução exige exclusão explícita dos registros. |
| POST | `/api/v1/habits/items/:id/records` | Marca check ou registra quantidade/duração. |
| PATCH | `/api/v1/habits/records/:id` | Corrige uma execução. |
| DELETE | `/api/v1/habits/records/:id` | Remove uma execução e atualiza os cálculos. |
| POST | `/api/v1/habits/:id/schedules` | Cria uma agenda recorrente. |
| PATCH | `/api/v1/habits/schedules/:id` | Pausa ou altera a agenda dali em diante. |
| GET | `/api/v1/habits/stats` | Agrega estatísticas por período e hábito. |

### 11.2 Extensões de Metas

As rotas existentes de `/api/v1/goals` são preservadas. O contrato será estendido para:

- criar ciclos com tipo anual, semestral, trimestral ou personalizado;
- informar ciclo e objetivo pai opcionais;
- criar, validar e editar vínculo de contribuição;
- devolver resultado por janela em metas recorrentes;
- fechar ciclo persistindo snapshots.

## 12. Organização proposta do código

### 12.1 Frontend

```text
src/
├── app/
│   ├── hub/                 # registro, seletor e resolução do módulo ativo
│   └── ...                  # sessão, providers e shell compartilhados
├── features/
│   ├── finance/             # destino gradual das features atuais
│   ├── habits/
│   └── goals/               # interface compartilhada, apresentada em Habits
└── components/              # design system e layout compartilhados
```

Não é necessário mover todas as features financeiras antes de criar Habits. O registro de módulos elimina primeiro as dependências globais; a movimentação de pastas pode ocorrer de forma mecânica depois.

### 12.2 Backend

```text
src/
├── hub/                     # capacidades compartilhadas do produto
├── habits/                  # dono dos hábitos e registros
├── goals/                   # dono das metas e das fórmulas
├── finance/                 # agrupamento futuro dos módulos financeiros atuais
└── ...                      # módulos financeiros mantidos durante a migração
```

O módulo `GoalsModule` exporta sua interface de medição e fechamento. O módulo `HabitsModule` fornece o adaptador Habits. Dependências circulares são proibidas: Habits não importa Goals para gravar progresso; a composição ocorre na raiz da aplicação.

## 13. Plano de refatoração e entrega

As fases 1 a 4 formam a V1 funcional descrita neste documento. A Fase 5 é evolução posterior e não bloqueia o lançamento do Habits.

### Fase 1 — Casca Wesley Hub

- trocar a marca visual para Wesley Hub;
- criar o registro de módulos;
- mover o seletor de módulo para o menu do perfil;
- renderizar sidebar e controles de escopo conforme o módulo ativo;
- manter Savings e todas as suas rotas funcionando;
- redirecionar as rotas antigas de Metas.

### Fase 2 — Fundamentos do Habits

- migrations e entidades de hábitos, agendas, itens e registros;
- contratos HTTP e adaptadores frontend;
- tela Hoje com atividade avulsa, hábito reutilizável e checkbox;
- registro de contagem e duração com início/fim;
- testes das regras de conclusão e fuso horário.

### Fase 3 — Rotina e estatísticas

- cadastro e arquivamento de hábitos;
- planejamento semanal e repetição;
- estatísticas diárias, semanais e mensais;
- correção de registros históricos com recálculo.

### Fase 4 — Metas conectadas

- tipos anual, semestral e trimestral;
- hierarquia opcional de ciclos e objetivos;
- vínculo de contribuição e adaptador Habits;
- avaliação total e recorrente;
- snapshots de fechamento;
- indicadores de meta dentro do checklist.

### Fase 5 — Integração financeira posterior

- definir métricas financeiras públicas do Savings;
- implementar adaptador `finance` sem expor tabelas;
- permitir metas como reduzir uso do crédito ou aumentar reserva.

## 14. Critérios de aceite da V1

1. O produto exibe Wesley Hub e permite alternar entre Savings e Habits pelo avatar.
2. Ao entrar em Savings, todas as telas e regras financeiras atuais continuam disponíveis.
3. Ao entrar em Habits, o seletor de conta financeira não aparece.
4. O usuário cria um hábito, adiciona-o a um dia e o conclui pelo checklist.
5. O usuário cria uma atividade avulsa sem cadastrar um hábito permanente.
6. Um item de contagem aceita progresso parcial e conclui ao alcançar o alvo.
7. Uma sessão de estudo aceita início e fim, calcula a duração correta e aparece nas estatísticas.
8. O usuário cria ciclos anuais, semestrais e trimestrais.
9. Uma meta de academia de 3 dias por semana é atualizada pelos checks e não conta duas vezes o mesmo dia.
10. Uma meta de estudo soma a duração de várias sessões.
11. Editar ou apagar uma execução atualiza ciclos abertos sem deixar progresso duplicado.
12. Encerrar um ciclo congela o resultado; corrigir um hábito antigo não altera o snapshot fechado.
13. Nenhuma rota permite ler ou alterar dados de outro usuário.
14. Os módulos se integram por interfaces internas, sem HTTP interno nem acesso direto às tabelas alheias.

## 15. Requisitos não funcionais

- Datas de calendário usam data civil (`YYYY-MM-DD`); instantes de sessão usam `timestamptz`.
- Agrupamentos por dia e semana respeitam o fuso configurado no perfil. **Proposto para a migração inicial:** `America/Sao_Paulo` como padrão, permitindo configuração posterior.
- O checklist de um dia e o resumo da semana devem ser respondidos por consultas agregadas, sem uma requisição por item.
- Operações de check são idempotentes para evitar duplicação por clique duplo ou reenvio.
- Valores derivados são calculados no backend; o frontend apenas apresenta o resultado.
- Mudanças de registros invalidam os resumos afetados de Habits e Metas.
- As fórmulas puras de medição, recorrência e duração devem possuir testes unitários; os fluxos entre Habits e Metas devem possuir testes de integração.
- Componentes existentes de acessibilidade, feedback, drawer e design devem ser reutilizados.

## 16. Fora do escopo inicial

- rede social, compartilhamento público ou competição;
- notificações push e lembretes externos;
- recomendações automáticas por IA;
- cronômetro sincronizado em tempo real entre dispositivos;
- integração com relógios, calendários ou aplicativos de terceiros;
- recompensas, pontos ou moedas virtuais;
- edição em massa de todo o histórico de uma agenda;
- novo backend, novo banco ou novo frontend para cada módulo.

## 17. Decisões ainda abertas

- Se o nome exibido do módulo financeiro será “Savings” ou “Finanças”; este documento usa Savings por ser o nome pedido mais recente.
- Se Metas também terá um atalho dentro de Savings ou aparecerá somente na navegação do Habits.
- Se áreas como Saúde, Estudos e Trabalho serão categorias formais na V1 ou apenas filtros posteriores.
- Se o usuário poderá marcar uma meta recorrente com compensação entre semanas; a proposta inicial é não permitir.
- Se agendas futuras serão materializadas ao consultar o período ou por tarefa agendada; ambos devem respeitar a mesma regra de idempotência.
- Se o fuso horário será editável já na V1 ou fixado inicialmente no perfil existente.

Essas decisões não impedem a Fase 1 nem o núcleo do checklist diário. Antes da Fase 4, os dois primeiros itens devem ser validados para fechar a experiência final de navegação de Metas.
