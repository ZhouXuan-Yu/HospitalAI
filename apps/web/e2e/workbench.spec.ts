import { test, expect } from '@playwright/test'
import { resolve } from 'node:path'

const routes = [
  ['/doctor/worklist', '患者工作列表'],
  ['/doctor/patients/P001', '患者用药全景'],
  ['/doctor/timeline/P001', '长期用药追踪'],
  ['/pharmacy/reviews', '风险复核队列'],
  ['/governance/rules', '临床规则管理'],
  ['/governance/evidence', '证据资料中心'],
  ['/research/workbench', '科研工作台'],
  ['/knowledge/reviews', '知识审核中心'],
  ['/admin/integrations', '接口与同步'],
  ['/admin/audit', '审计日志'],
  ['/developer/api-docs', 'API 接口文档']
] as const

test('all role workspaces are navigable and viewport safe', async ({ page }, testInfo) => {
  for (const [path, title] of routes) {
    await page.goto(path)
    await expect(page.getByRole('heading', { name: title, exact: true }).first()).toBeVisible()
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1)
    expect(overflow, `${path} must not create a page-level horizontal scrollbar`).toBe(false)
  }
  await page.goto('/doctor/worklist')
  await page.screenshot({ path: `../../docs/validation/ui-worklist-${testInfo.project.name}.png`, fullPage: true })
  await page.goto('/developer/api-docs')
  await expect(page.getByText(/OPERATIONS/)).toBeVisible()
  await page.screenshot({ path: `../../docs/validation/ui-api-docs-${testInfo.project.name}.png`, fullPage: true })
})

test('doctor can view normal patient and submit simulated draft', async ({ page }) => {
  await page.goto('/doctor/workbench/E001')
  await expect(page.getByTestId('doctor-workbench')).toBeVisible()
  await expect(page.getByRole('table', { name: '候选方案横向比较' })).toBeVisible()
  await page.getByRole('button', { name: /采纳并生成草稿/ }).click()
  await expect(page.getByRole('status')).toContainText('处方草稿已提交模拟回写')
  await page.screenshot({ path: `../../docs/validation/ui-workbench-${test.info().project.name}.png`, fullPage: true })
})

test('confirmed allergy blocks draft creation on second admission', async ({ page }) => {
  await page.goto('/doctor/workbench/E002-2')
  await expect(page.getByLabel('规则风险').getByText(/已确认药物过敏/).first()).toBeVisible()
  await expect(page.getByRole('button', { name: /采纳并生成草稿/ })).toBeDisabled()
})

test('missing labs are shown as missing instead of normal', async ({ page }) => {
  await page.goto('/doctor/workbench/E005')
  await expect(page.getByLabel('规则风险').getByText('关键检验缺失：C反应蛋白，不得按正常值处理')).toBeVisible()
  await expect(page.getByLabel('规则风险').getByText('关键检验缺失：肌酐，不得按正常值处理')).toBeVisible()
})

test('role switch filters navigation without granting safety bypass', async ({ page }) => {
  await page.goto('/doctor/worklist')
  await page.getByRole('combobox', { name: '切换角色视角' }).focus()
  await page.getByRole('combobox', { name: '切换角色视角' }).press('ArrowDown')
  await page.getByRole('option', { name: '临床医生' }).click()
  await expect(page.getByText('药师工作区', { exact: true })).toHaveCount(0)
  await page.goto('/doctor/workbench/E002-2')
  await expect(page.getByRole('button', { name: /采纳并生成草稿/ })).toBeDisabled()
})

test('imported JSON drives doctor-to-research full workflow', async ({ page }, testInfo) => {
  testInfo.setTimeout(60_000)
  page.on('pageerror', error => console.error(`browser page error: ${error.message}`))
  await page.goto('/doctor/workbench/E001')
  await page.getByRole('button', { name: '导入JSON场景' }).click()
  await page.locator('input[type="file"]').setInputFiles(resolve(process.cwd(), 'public/scenarios/cap-full-flow.v1.json'))
  await expect(page.getByText(/已导入 cap-full-flow.v1.json/)).toBeVisible()
  await page.getByRole('button', { name: '完成' }).click()
  await expect(page.getByRole('button', { name: /采纳并生成草稿/ })).toBeVisible()
  await page.getByRole('button', { name: /采纳并生成草稿/ }).click()
  await expect(page.getByTestId('prescription-lifecycle')).toBeVisible()
  await page.getByRole('button', { name: '加入可靠写入任务' }).click()
  await page.getByRole('button', { name: '模拟 HIS 创建草稿' }).click()
  await page.getByRole('button', { name: '接收 HIS 状态回调' }).click()
  await page.getByRole('button', { name: '登记实际用药与出院结局' }).click()
  await page.getByRole('button', { name: '保存并进入科研候选池' }).click()
  await expect(page.getByRole('dialog')).toBeHidden()
  await expect(page.getByText('结局已结构化并进入科研候选池')).toBeVisible()
  await page.screenshot({ path: `../../docs/validation/ui-prescription-flow-${testInfo.project.name}.png`, fullPage: true })
  await page.getByRole('button', { name: '进入科研队列流程' }).click()

  await expect(page.getByTestId('research-workbench')).toBeVisible()
  await expect(page.getByText(/医生流程新增 1 条/)).toBeVisible()
  await page.getByRole('button', { name: '保存方案并锁定版本口径' }).click()
  await expect(page.getByText('LIVE-E001')).toBeVisible()
  await page.getByRole('button', { name: '执行纳排并生成队列' }).click()
  await page.getByRole('button', { name: '确认变量口径' }).click()
  const resolveButtons = page.getByRole('button', { name: '记录处理结果' })
  while (await resolveButtons.count()) await resolveButtons.first().click()
  await page.getByRole('button', { name: /冻结数据集版本/ }).click()
  await page.getByRole('button', { name: '运行固定版本统计' }).click()
  await page.getByRole('button', { name: '生成报告草稿' }).click()
  await page.screenshot({ path: `../../docs/validation/ui-research-report-flow-${testInfo.project.name}.png`, fullPage: true })
  await page.getByRole('button', { name: '提交审核' }).click()
  const reviewLabels = page.locator('.review-checks > label')
  for (let index = 0; index < await reviewLabels.count(); index += 1) await reviewLabels.nth(index).click()
  await page.getByRole('button', { name: '批准并冻结报告版本' }).click()
  await page.getByRole('button', { name: '提交知识审核中心' }).click()
  await expect(page.getByText(/知识候选已进入 review_pending/)).toBeVisible()
  await page.getByRole('button', { name: '查看知识审核任务' }).click()
  await expect(page.getByText('KS-RPT-CAP-FLOW-v1').first()).toBeVisible()
  await expect(page.getByText('RPT-CAP-FLOW-v1').first()).toBeVisible()
  await page.screenshot({ path: `../../docs/validation/ui-full-flow-${testInfo.project.name}.png`, fullPage: true })
})
