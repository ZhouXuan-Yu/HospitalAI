import { chromium } from '@playwright/test'
const base = 'http://127.0.0.1:5175'
const pages = [
  { path: '/doctor/worklist', label: '患者工作列表', expect: '合成患者A' },
  { path: '/doctor/patients/P001', label: '患者用药全景', expect: '关键检验与趋势' },
  { path: '/doctor/patients/P002', label: '患者用药全景(B)', expect: '阿莫西林克拉维酸钾' },
  { path: '/doctor/timeline/P001', label: '长期用药追踪', expect: '呼吸内科住院 · E001' },
  { path: '/pharmacy/reviews', label: '风险复核队列', expect: '跨科室重复用药需复核' },
  { path: '/governance/rules', label: '临床规则管理', expect: '已确认药物过敏硬阻断' },
  { path: '/governance/evidence', label: '证据资料中心', expect: '成人社区获得性肺炎院内诊疗路径' },
  { path: '/admin/integrations', label: '接口与同步', expect: '住院 HIS' },
  { path: '/admin/audit', label: '审计日志', expect: '修改并采纳候选方案' }
]
const browser = await chromium.launch()
const results = []
for (const p of pages) {
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } })
  try {
    await page.goto(base + p.path, { waitUntil: 'networkidle' })
    await page.waitForTimeout(800)
    const content = await page.evaluate(() => document.body.innerText)
    const ok = content.includes(p.expect)
    const title = await page.title()
    results.push({ label: p.label, ok, note: ok ? 'OK' : `MISSING: ${p.expect}` })
  } catch (e) {
    results.push({ label: p.label, ok: false, note: `ERROR: ${e.message.slice(0, 80)}` })
  }
  await page.close()
}
await browser.close()
for (const r of results) console.log(`${r.ok ? 'PASS' : 'FAIL'}  ${r.label}  ${r.note}`)
const failed = results.filter(r => !r.ok)
console.log(`\n${results.length - failed.length}/${results.length} pages verified`)
process.exit(failed.length ? 1 : 0)
