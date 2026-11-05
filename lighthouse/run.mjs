import { spawn } from 'node:child_process'
import { mkdir, writeFile, readFile } from 'node:fs/promises'
import { join } from 'node:path'
import os from 'node:os'
import lighthouse from 'lighthouse'
import * as chromeLauncher from 'chrome-launcher'
import config from './config.mjs'

const PORT = Number(process.env.PORT ?? 4173)
const RUNS = Number(process.env.RUNS ?? 3)
const BASE = `http://localhost:${PORT}`
const PAGES = [
  { name: 'inicio', path: '/' },
  { name: 'detalhe-nft', path: '/nft/emerald-ape-042' },
]
const PROFILES = ['mobile', 'desktop']
const CATEGORIES = ['performance', 'accessibility', 'best-practices', 'seo']
const METRICS = {
  LCP: 'largest-contentful-paint',
  CLS: 'cumulative-layout-shift',
  TBT: 'total-blocking-time',
}

const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)
const outDir = join(import.meta.dirname, 'reports', stamp)

function median(values) {
  const s = [...values].sort((a, b) => a - b)
  const mid = Math.floor(s.length / 2)
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2
}

async function waitForServer(url, timeoutMs = 30_000) {
  const start = Date.now()
  while (Date.now() - start < timeoutMs) {
    try {
      const r = await fetch(url)
      if (r.ok) return
    } catch {}
    await new Promise((r) => setTimeout(r, 500))
  }
  throw new Error(`Servidor não respondeu em ${url}`)
}

async function main() {
  await mkdir(outDir, { recursive: true })
  const preview = spawn('npx', ['vite', 'preview', '--port', String(PORT), '--strictPort'], {
    stdio: 'ignore',
    shell: process.platform === 'win32',
  })
  try {
    await waitForServer(BASE)
    const pkg = JSON.parse(await readFile(new URL('../node_modules/lighthouse/package.json', import.meta.url)))
    const results = []

    for (const page of PAGES) {
      for (const profile of PROFILES) {
        const runs = []
        for (let i = 1; i <= RUNS; i++) {
          const chrome = await chromeLauncher.launch({
            chromePath: process.env.CHROME_PATH,
            chromeFlags: ['--headless=new', '--no-sandbox', '--disable-gpu'],
          })
          try {
            const flags = { port: chrome.port, output: ['html', 'json'], logLevel: 'error' }
            const runnerResult = await lighthouse(`${BASE}${page.path}`, flags, config[profile])
            const [html, json] = runnerResult.report
            const base = join(outDir, `${page.name}-${profile}-run${i}`)
            await writeFile(`${base}.html`, html)
            await writeFile(`${base}.json`, json)
            const lhr = runnerResult.lhr
            runs.push({
              scores: Object.fromEntries(CATEGORIES.map((c) => [c, Math.round((lhr.categories[c]?.score ?? 0) * 100)])),
              metrics: Object.fromEntries(Object.entries(METRICS).map(([k, id]) => [k, lhr.audits[id]?.numericValue ?? null])),
              chromeVersion: lhr.environment?.hostUserAgent,
            })
            console.log(`✓ ${page.name} · ${profile} · execução ${i}:`, runs.at(-1).scores)
          } finally {
            await chrome.kill()
          }
        }
        results.push({
          page: page.name,
          url: page.path,
          profile,
          median: Object.fromEntries(CATEGORIES.map((c) => [c, median(runs.map((r) => r.scores[c]))])),
          metrics: Object.fromEntries(Object.keys(METRICS).map((k) => [k, median(runs.map((r) => r.metrics[k]))])),
          runs,
        })
      }
    }

    const env = {
      date: new Date().toISOString(),
      lighthouse: pkg.version,
      node: process.version,
      os: `${os.type()} ${os.release()} (${os.arch()})`,
      cpu: os.cpus()[0]?.model,
      userAgent: results[0]?.runs[0]?.chromeVersion,
      runsPerPage: RUNS,
      throttling: { mobile: config.mobile.settings.throttling, desktop: config.desktop.settings.throttling },
      mocksScenario: 'default',
    }
    await writeFile(join(outDir, 'summary.json'), JSON.stringify({ env, results }, null, 2))

    const rows = results
      .map(
        (r) =>
          `| ${r.page} | ${r.profile} | ${r.median.performance} | ${r.median.accessibility} | ${r.median['best-practices']} | ${r.median.seo} | ${Math.round(r.metrics.LCP)} ms | ${r.metrics.CLS?.toFixed(3)} | ${Math.round(r.metrics.TBT)} ms |`,
      )
      .join('\n')
    const md = `# Lighthouse — ${env.date}

Mediana de ${RUNS} execuções por página e perfil (build otimizado, mocks no cenário padrão).

| Página | Perfil | Performance | Accessibility | Best Practices | SEO | LCP | CLS | TBT |
|---|---|---:|---:|---:|---:|---:|---:|---:|
${rows}

**Ambiente:** Lighthouse ${env.lighthouse} · Node ${env.node} · ${env.os} · ${env.cpu}
**Navegador:** ${env.userAgent}
`
    await writeFile(join(outDir, 'summary.md'), md)
    console.log(`\n${md}\nRelatórios em ${outDir}`)
  } finally {
    preview.kill()
  }
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
