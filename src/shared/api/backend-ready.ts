let ready: Promise<unknown> = Promise.resolve()

export function setBackendReady(promise: Promise<unknown>) {
  ready = promise
}

export function waitForBackend() {
  return ready
}
