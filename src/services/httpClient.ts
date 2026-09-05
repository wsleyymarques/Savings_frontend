import { DataError, ValidationError } from './errors'

/**
 * Client HTTP central. Todas as chamadas de rede da aplicação passam por aqui;
 * componentes e páginas nunca chamam `fetch` diretamente.
 */
export interface HttpClient {
  get<T>(path: string, query?: QueryParams): Promise<T>
  post<T>(path: string, body?: unknown): Promise<T>
  patch<T>(path: string, body?: unknown): Promise<T>
  delete<T>(path: string): Promise<T>
}

export type QueryParams = Record<string, string | number | boolean | null | undefined>

/** Formato de erro do NestJS: `{ statusCode, message, error }`. */
interface NestErrorPayload {
  statusCode?: number
  message?: string | string[]
  error?: string
}

export interface TokenStore {
  read(): string | null
  write(token: string): void
  clear(): void
}

export function createHttpClient(baseUrl: string, tokens: TokenStore): HttpClient {
  const root = baseUrl.replace(/\/+$/, '')

  async function request<T>(
    method: string,
    path: string,
    body?: unknown,
    query?: QueryParams,
  ): Promise<T> {
    const url = new URL(`${root}${path}`)
    if (query) {
      for (const [key, value] of Object.entries(query)) {
        if (value === undefined || value === null || value === '') continue
        url.searchParams.set(key, String(value))
      }
    }

    const headers: Record<string, string> = {}
    const token = tokens.read()
    if (token) headers.Authorization = `Bearer ${token}`
    if (body !== undefined) headers['Content-Type'] = 'application/json'

    let response: Response
    try {
      response = await fetch(url, {
        method,
        headers,
        body: body === undefined ? undefined : JSON.stringify(body),
      })
    } catch {
      throw new DataError('Não foi possível falar com o servidor. Verifique sua conexão.')
    }

    if (response.status === 204) return undefined as T

    const payload = await readJson(response)

    if (!response.ok) {
      if (response.status === 401) tokens.clear()
      throw toError(response.status, payload as NestErrorPayload | null)
    }

    return payload as T
  }

  return {
    get: (path, query) => request('GET', path, undefined, query),
    post: (path, body) => request('POST', path, body),
    patch: (path, body) => request('PATCH', path, body),
    delete: (path) => request('DELETE', path),
  }
}

/**
 * A API valida com `class-validator` e devolve `message` como lista de frases.
 * Não há mapa por campo, então o erro vira uma mensagem única do formulário.
 */
function toError(status: number, payload: NestErrorPayload | null): Error {
  const raw = payload?.message
  const message = Array.isArray(raw) ? raw.join(' ') : raw

  if (status === 400 || status === 422) {
    return new ValidationError({}, message || 'Revise os campos destacados.')
  }
  if (status === 401) return new DataError(message || 'Sessão expirada. Entre novamente.')
  if (status === 403) return new DataError(message || 'Acesso negado.')
  if (status === 404) return new DataError(message || 'Registro não encontrado.')
  if (status === 409) return new DataError(message || 'A operação conflita com o estado atual.')
  if (status >= 500) return new DataError('O servidor não respondeu corretamente. Tente novamente.')
  return new DataError(message || 'Não foi possível concluir a operação. Tente novamente.')
}

async function readJson(response: Response): Promise<unknown> {
  const text = await response.text()
  if (!text) return null
  try {
    return JSON.parse(text)
  } catch {
    return null
  }
}
