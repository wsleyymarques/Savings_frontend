/** Erro de validação com mensagens por campo, consumido pelos formulários do drawer. */
export class ValidationError extends Error {
  readonly fields: Record<string, string>

  constructor(fields: Record<string, string>, message = 'Revise os campos destacados.') {
    super(message)
    this.name = 'ValidationError'
    this.fields = fields
  }
}

/** Falha genérica da camada de dados; a interface mostra ErrorState ou alerta no drawer. */
export class DataError extends Error {
  constructor(message = 'Não foi possível concluir a operação. Tente novamente.') {
    super(message)
    this.name = 'DataError'
  }
}

export function messageFor(error: unknown): string {
  if (error instanceof ValidationError) return error.message
  if (error instanceof DataError) return error.message
  return 'Não foi possível concluir a operação. Tente novamente.'
}

export function fieldsFor(error: unknown): Record<string, string> {
  return error instanceof ValidationError ? error.fields : {}
}
