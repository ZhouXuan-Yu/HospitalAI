import { test, expect } from '@playwright/test'

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
