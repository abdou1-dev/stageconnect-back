// Erreur HTTP typée — à lancer depuis n'importe quel controller/middleware.
// Le middleware d'erreur centralisé la convertit en { success: false, error, code }.
export class HttpError extends Error {
  constructor(
    public readonly code: number,
    message: string
  ) {
    super(message)
    this.name = 'HttpError'
  }
}
