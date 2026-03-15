interface KVNamespaceListResult {
  keys: Array<{ name: string }>
}

interface KVNamespace {
  get(key: string): Promise<string | null>
  put(key: string, value: string, options?: { expirationTtl?: number }): Promise<void>
  delete(key: string): Promise<void>
  list(options?: { prefix?: string }): Promise<KVNamespaceListResult>
}

interface Ai {
  run(model: string, input: unknown): Promise<unknown>
}
