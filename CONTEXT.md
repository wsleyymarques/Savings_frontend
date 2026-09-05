# Finanças pessoais

Vocabulário inicial para organizar os ganhos, gastos, contas e cartões de uma pessoa. As regras e propostas de comportamento estão no SDD.

## Linguagem

**Usuário**:
Pessoa proprietária dos registros financeiros acompanhados na aplicação.
_Evitar_: Conta, quando o sentido for a pessoa que acessa o sistema.

**Conta financeira**:
Local em que o dinheiro e seu saldo são acompanhados, como uma conta bancária.
_Evitar_: Usuário, cartão.

**Receita**:
Ganho financeiro da pessoa, como salário ou recebimento por um serviço.
_Evitar_: Ganho, entrada, como nomes alternativos para a mesma entidade.

**Despesa**:
Gasto financeiro da pessoa, inclusive uma compra realizada por cartão.
_Evitar_: Saída, quando for necessário distinguir o gasto da movimentação de dinheiro que o quita.

**Saldo da conta**:
Quantidade de dinheiro registrada em uma conta financeira em determinado momento.
_Evitar_: Limite, balanço, quando a intenção for expressar apenas esse valor.

**Cartão**:
Meio de pagamento que pode oferecer função crédito, débito ou ambas.
_Evitar_: Conta financeira.

**Limite de crédito**:
Valor de crédito atribuído a um cartão; a parte disponível considera o valor já comprometido.
_Evitar_: Saldo da conta.

**Fatura**:
Conjunto de compras e valores devidos na função crédito de um cartão em um ciclo de cobrança.
_Evitar_: Despesa, quando o sentido for o agrupamento de compras.

**Fechamento da fatura**:
Marco que encerra o ciclo de compras de uma fatura.
_Evitar_: Vencimento.

**Vencimento da fatura**:
Data em que o pagamento da fatura é devido.
_Evitar_: Fechamento.

**Pagamento de fatura**:
Movimentação de dinheiro destinada à quitação de valores devidos em uma fatura.
_Evitar_: Nova despesa, quando as compras correspondentes já foram registradas.

**Compra parcelada**:
Despesa única no cartão de crédito cujo valor total é dividido em parcelas vinculadas a ciclos de fatura sucessivos.
_Evitar_: Despesa recorrente, pois a quantidade e o valor total são conhecidos na compra.

**Parcela**:
Parte individual de uma compra parcelada atribuída a uma fatura; a soma das parcelas corresponde ao valor total da compra.
_Evitar_: Mensalidade, recorrência.

**Despesa recorrente**:
Despesa que volta a ocorrer segundo uma regra, sem representar uma compra de valor total previamente dividido.
_Evitar_: Compra parcelada.

**Regra de recorrência**:
Definição da frequência, vigência e dados usados para originar ocorrências de uma despesa recorrente.
_Evitar_: Parcela, lançamento futuro.

**Ocorrência recorrente**:
Despesa individual originada por uma regra de recorrência em uma data determinada.
_Evitar_: Regra de recorrência, parcela.

**Categoria de despesa**:
Classificação do motivo de um gasto, como Alimentação ou Moradia.
_Evitar_: Forma de pagamento.

**Categoria genérica**:
Categoria inicial fornecida pela aplicação e disponível em todas as contas financeiras.
_Evitar_: Categoria personalizada.

**Categoria personalizada**:
Categoria criada pelo usuário para classificar gastos da conta à qual pertence; neste modelo inicial, conta significa conta financeira.
_Evitar_: Subcategoria, pois não implica uma categoria superior.

**Forma de pagamento**:
Meio utilizado para pagar uma despesa: Pix, boleto, cartão de débito ou cartão de crédito.
_Evitar_: Categoria de despesa.

**Visão geral**:
Apresentação consolidada dos valores financeiros do usuário, com saldos, limites e gastos identificados separadamente.
_Evitar_: Saldo total, quando o sentido incluir também indicadores de crédito e gastos.

**Gastos do período**:
Soma das despesas atribuídas a um intervalo de datas, sem contar novamente a quitação de suas faturas.
_Evitar_: Saídas da conta, pois compras no crédito e saídas de dinheiro ocorrem em momentos diferentes.

**Limite disponível total**:
Soma do crédito ainda disponível nos cartões considerados na visão geral.
_Evitar_: Saldo da conta, dinheiro próprio.
