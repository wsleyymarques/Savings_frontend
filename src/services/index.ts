import { createMockServices } from './mock'
import { createHttpServices } from './http'
import type { Services } from './contracts'

const apiUrl = import.meta.env.VITE_API_URL?.trim() ?? ''
const useMock = (import.meta.env.VITE_USE_MOCK_API ?? 'true').toLowerCase() !== 'false' || !apiUrl

/** Falhas simuladas para exercitar os estados de erro: `?erro=1`. */
const failing =
  typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('erro') === '1'

/**
 * Seleção do adaptador. Com `VITE_USE_MOCK_API=false` e `VITE_API_URL` definida,
 * a aplicação passa a falar com o backend sem alterações nas páginas.
 */
export const services: Services = useMock ? createMockServices({ failing }) : createHttpServices(apiUrl)

export const usingMockApi = useMock

export * from './contracts'
export { ValidationError, DataError, fieldsFor, messageFor } from './errors'
