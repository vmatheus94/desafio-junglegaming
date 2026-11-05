export function safeRedirect(target: string | undefined) {
  if (!target || !target.startsWith('/') || target.startsWith('//') || target.startsWith('/entrar') || target.startsWith('/cadastro')) {
    return '/'
  }
  return target
}
