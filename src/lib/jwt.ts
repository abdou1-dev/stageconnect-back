import jwt from 'jsonwebtoken'

export function createToken(userId: string, role: string): string {
  // as unknown cast : process.env retourne string mais jsonwebtoken attend StringValue (ms)
  const options = { expiresIn: process.env.JWT_EXPIRES_IN ?? '7d' } as unknown as jwt.SignOptions
  return jwt.sign({ userId, role }, process.env.JWT_SECRET!, options)
}
