export function avoidRateLimit(delay = 500) {
  if (!process.env.IS_BUILD) {
    return
  }

  return new Promise((resolve) => {
    setTimeout(resolve, delay)
  })
}