import type { TokenStore } from '../httpClient'

const TOKEN_KEY = 'minhas-financas:token'

/**
 * O token JWT emitido pela API fica em `sessionStorage`: sobrevive ao recarregar
 * a página e desaparece ao fechar a aba. Nenhuma senha é armazenada.
 */
export const tokenStore: TokenStore = {
  read() {
    try {
      return window.sessionStorage.getItem(TOKEN_KEY)
    } catch {
      return null
    }
  },
  write(token: string) {
    try {
      window.sessionStorage.setItem(TOKEN_KEY, token)
    } catch {
      // Armazenamento indisponível: a sessão vale apenas para esta navegação.
    }
  },
  clear() {
    try {
      window.sessionStorage.removeItem(TOKEN_KEY)
    } catch {
      // Ignorado pelo mesmo motivo acima.
    }
  },
}
