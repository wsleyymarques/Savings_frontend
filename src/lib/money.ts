/**
 * Dinheiro é sempre transportado em centavos inteiros (SDD, CA-08).
 * A interface apenas formata; nunca recalcula saldos a partir da tela.
 */
export type Cents = number

const brl = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

const decimal = new Intl.NumberFormat('pt-BR', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

export function formatMoney(cents: Cents): string {
  return brl.format(cents / 100)
}

/** Formata com sinal explícito; usado em listas de lançamentos. */
export function formatSignedMoney(cents: Cents): string {
  if (cents < 0) return `- ${brl.format(Math.abs(cents) / 100)}`
  return brl.format(cents / 100)
}

/** Valor sem símbolo, para o MoneyInput (que já mostra o prefixo R$). */
export function formatAmountInput(cents: Cents): string {
  return decimal.format(cents / 100)
}

export type MoneyParseResult =
  | { ok: true; cents: Cents }
  | { ok: false; reason: string }

/**
 * Aceita "1.234,56", "1234,56", "1234.56" e "1234".
 * Rejeita texto ambíguo com mensagem explícita (design.md, MoneyInput).
 */
export function parseMoney(raw: string): MoneyParseResult {
  const cleaned = raw.replace(/[\s\u00a0]|R\$/g, '').trim()
  if (cleaned === '') return { ok: false, reason: 'Informe um valor.' }
  if (!/^-?[\d.,]+$/.test(cleaned)) {
    return { ok: false, reason: 'Use apenas números, ponto e vírgula.' }
  }

  const hasComma = cleaned.includes(',')
  const hasDot = cleaned.includes('.')
  let normalized: string

  if (hasComma && hasDot) {
    if (cleaned.lastIndexOf(',') < cleaned.lastIndexOf('.')) {
      return { ok: false, reason: 'Valor ambíguo. Use o formato 1.234,56.' }
    }
    normalized = cleaned.replace(/\./g, '').replace(',', '.')
  } else if (hasComma) {
    const parts = cleaned.split(',')
    if (parts.length > 2) return { ok: false, reason: 'Valor ambíguo. Use o formato 1.234,56.' }
    normalized = parts.join('.')
  } else if (hasDot) {
    const parts = cleaned.split('.')
    const last = parts[parts.length - 1]
    if (parts.length === 2 && last.length !== 3) {
      normalized = cleaned
    } else if (parts.slice(1).every((part) => part.length === 3)) {
      normalized = parts.join('')
    } else {
      return { ok: false, reason: 'Valor ambíguo. Use o formato 1.234,56.' }
    }
  } else {
    normalized = cleaned
  }

  const decimals = normalized.split('.')[1]
  if (decimals && decimals.length > 2) {
    return { ok: false, reason: 'Use no máximo duas casas decimais.' }
  }

  const value = Number(normalized)
  if (!Number.isFinite(value)) return { ok: false, reason: 'Valor inválido.' }
  return { ok: true, cents: Math.round(value * 100) }
}

export function sum(values: Cents[]): Cents {
  return values.reduce((total, value) => total + value, 0)
}
