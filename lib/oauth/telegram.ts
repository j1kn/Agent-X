// Telegram OAuth uses Telegram Login Widget
// https://core.telegram.org/widgets/login

export interface TelegramAuthData {
  id: number
  first_name: string
  last_name?: string
  username?: string
  photo_url?: string
  auth_date: number
  hash: string
}

export function verifyTelegramAuth(
  authData: TelegramAuthData,
  botToken: string
): boolean {
  const crypto = require('crypto')

  // Create data-check-string
  const dataCheckArr: string[] = []
  Object.keys(authData).forEach((key) => {
    if (key !== 'hash') {
      dataCheckArr.push(`${key}=${(authData as any)[key]}`)
    }
  })
  dataCheckArr.sort()
  const dataCheckString = dataCheckArr.join('\n')

  // Create secret key
  const secretKey = crypto.createHash('sha256').update(botToken).digest()

  // Calculate hash
  const hash = crypto
    .createHmac('sha256', secretKey)
    .update(dataCheckString)
    .digest('hex')

  // Verify hash matches
  return hash === authData.hash
}

export function getTelegramOAuthUrl(botUsername: string, redirectUrl: string): string {
  // Telegram Login Widget URL
  return `https://oauth.telegram.org/auth?bot_id=${botUsername}&origin=${encodeURIComponent(redirectUrl)}&request_access=write`
}

