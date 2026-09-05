/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** URL base do backend. Vazia enquanto o serviço não existe. */
  readonly VITE_API_URL?: string
  /** "true" seleciona o adaptador mockado de `src/services/mock`. */
  readonly VITE_USE_MOCK_API?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
