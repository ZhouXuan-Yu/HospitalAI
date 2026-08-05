import { chromium } from '@playwright/test'
import fs from 'node:fs'
const base = 'http://127.0.0.1:5175'
const outDir = 'D:/WorkProject/HospitalAI/apps/web/docs/validation'
fs.mkdirSync(outDir, { recursive: true })
const pages = [
  { path: '/doctor/patients/P001', file: 'overview' },
  { path: '/doctor/timeline/P001', file: 'timeline' },
  { path: '/pharmacy/reviews', file: 'pharmacist' },
  { path: '/governance/rules', file: 'rules' },
  { path: '/governance/evidence', file: 'evidence' },
  { path: '/admin/integrations', file: 'integration' },
  { path: '/admin/audit', file: 'audit' }
]
const browser = await chromium.launch()
for (const p of pages) {
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } })
  await page.goto(base + p.path, { waitUntil: 'networkidle' })
  await page.waitForTimeout(700)
  await page.screenshot({ path: `${outDir}/${p.file}-1920.png`, fullPage: false })
  await page.close()
}
await browser.close()
console.log('saved to ' + outDir)
