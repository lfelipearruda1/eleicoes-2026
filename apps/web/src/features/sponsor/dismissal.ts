export const DISMISSED_IN_SESSION = 'eleicoes:anuncio-casa-sarto-fechado'

export function wasDismissedInSession() {
  try {
    return sessionStorage.getItem(DISMISSED_IN_SESSION) === 'sim'
  } catch {
    return false
  }
}

export function rememberDismissal() {
  try {
    sessionStorage.setItem(DISMISSED_IN_SESSION, 'sim')
  } catch {
    return
  }
}
