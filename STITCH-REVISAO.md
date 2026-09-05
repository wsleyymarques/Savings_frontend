# Protótipo da V1 no Stitch

Projeto: [Minhas Finanças Web App](https://stitch.withgoogle.com/projects/6792643010236456932).

As versões anteriores permanecem no canvas como referência. Os links abaixo identificam as versões revisadas nesta sessão.

| Tela | Prévia |
| --- | --- |
| Visão geral | [Abrir](https://stitch.withgoogle.com/preview/6792643010236456932?node-id=b6c31efb62f143e99739c9bdf7d5e271) |
| Lançamentos | [Abrir](https://stitch.withgoogle.com/preview/6792643010236456932?node-id=dc97631cdf584e45acf1d0c41917ae7e) |
| Contas — V1 revisada | [Abrir](https://stitch.withgoogle.com/preview/6792643010236456932?node-id=ba54f054bfe145279c119ab9f23926af) |
| Cartões | [Abrir](https://stitch.withgoogle.com/preview/6792643010236456932?node-id=4f4695d6bd564570aeb832b8f4d81f1f) |
| Faturas — V1 revisada | [Abrir](https://stitch.withgoogle.com/preview/6792643010236456932?node-id=fd683f43a5c34b2ea77b81c694fe16dd) |
| Categorias | [Abrir](https://stitch.withgoogle.com/preview/6792643010236456932?node-id=482cf2f3a509492aa841c80ac65db409) |

## Decisão registrada

Adicionar e editar dentro da aplicação web abrem painel à direita, mantendo a página ao fundo. Sidebar de navegação permanece à esquerda. Esta decisão está no REQ-18 do SDD e substitui a opção anterior de modal central.

## Conferência realizada

- Presença das seis páginas, com visual derivado do design existente no projeto.
- Visão geral: abertura de Nova receita e Novo gasto em painel direito.
- Lançamentos: abertura de Nova receita e edição de despesa Pix com valores existentes.
- Cartões: abertura de Novo cartão e Editar cartão com título distinto e dados preenchidos; inspeção visual do painel de edição.
- Contas: abertura de Nova conta e Editar conta, com nome preenchido e saldo inicial/data somente para leitura na edição. A última revisão preservou esses formulários e corrigiu textos de pagamento automático.
- Categorias: abertura de criação com nome vazio e edição com nome preenchido; inspeção visual do painel de edição.
- Faturas: limites individuais e datas corrigidos; abertura do registro de pagamento em painel direito e simulação que muda a fatura para Paga, pago R$ 300 e restante zero.

## Limites desta etapa

São protótipos de interface com dados fictícios e interações locais, não a aplicação financeira implementada. Os links da sidebar entre telas ainda aparecem como referências internas genéricas; usar as prévias acima para navegar entre os artefatos. Nem todos os filtros, validações, totais após mutações e estados móveis foram verificados. Há diferenças residuais de textos e datas entre exemplos das telas. O SDD continua sendo a fonte das regras para a implementação.

As telas públicas de autenticação e Meu perfil não foram geradas nesta rodada, cujo pedido foi completar as seis páginas da sidebar e seus formulários laterais.
