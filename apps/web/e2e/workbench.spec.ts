import { test, expect } from '@playwright/test'
import { resolve } from 'node:path'

const routes = [
  ['/doctor/worklist', '患者工作列表'],
  ['/doctor/patients/P001', '患者用药全景'],
  ['/doctor/timeline/P001', '长期用药追踪'],
  ['/pharmacy/reviews', '处方审核'],
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

test('doctor can expand concise provenance and drug combination source details', async ({ page }) => {
  await page.goto('/doctor/workbench/E001')
  await expect(page.getByTestId('doctor-workbench')).toBeVisible()
  await expect(page.getByText('关键输入').first()).toBeHidden()
  await page.getByText('推理依据与流程阶段').click()
  await expect(page.getByText('患者事实').first()).toBeVisible()
  await expect(page.getByText('关键输入').first()).toBeVisible()
  await expect(page.getByText('处理逻辑').first()).toBeVisible()
  await expect(page.getByText('输出结果').first()).toBeVisible()

  await expect(page.getByText('核心作用').first()).toBeHidden()
  await page.getByText('当前推荐药品组合说明').click()
  const drugCombo = page.getByLabel('当前推荐药品组合说明')
  await expect(drugCombo.getByText('组合摘要')).toBeVisible()
  await drugCombo.getByText('头孢曲松', { exact: true }).click()
  await expect(drugCombo.getByText('核心作用').first()).toBeVisible()
  await expect(drugCombo.getByText('权威资料出处').first()).toBeVisible()
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

test('imported research JSON drives analysis, review and export workflow', async ({ page }, testInfo) => {
  testInfo.setTimeout(120_000)
  page.on('pageerror', error => console.error(`browser page error: ${error.message}`))
  await page.goto('/research/workbench')
  await page.evaluate(() => localStorage.clear())
  await page.reload()
  await expect(page.getByTestId('research-workbench')).toBeVisible()
  await page.getByRole('button', { name: '导入内置模拟数据' }).click()
  await expect(page.getByText('2,000 条候选记录')).toBeVisible()
  await page.getByRole('button', { name: '保存协议并进入数据准备' }).click()
  await page.getByRole('button', { name: /2\. 执行纳排/ }).click()
  await page.getByRole('button', { name: /3\. 确认变量/ }).click()
  const resolveButtons = page.getByRole('button', { name: '记录处理结果' })
  for (let index = 0; index < 10 && await resolveButtons.count(); index += 1) await resolveButtons.first().click()
  await page.getByRole('button', { name: /4\. 冻结数据集/ }).click()
  await page.getByRole('button', { name: '运行固定版本统计' }).click()
  await page.getByRole('button', { name: '生成报告草稿' }).click()
  await page.screenshot({ path: `../../docs/validation/ui-research-report-flow-${testInfo.project.name}.png`, fullPage: true })
  await page.getByRole('button', { name: '提交三级审核' }).click()
  await page.getByRole('button', { name: '以药师初审身份批准' }).click()
  await page.getByRole('button', { name: '以统计师审核身份批准' }).click()
  await page.getByRole('button', { name: '以医学负责人终审身份批准' }).click()
  const zipDownloadPromise = page.waitForEvent('download')
  await page.getByRole('button', { name: '下载数据与复现包 ZIP' }).click()
  const zipDownload = await zipDownloadPromise
  expect(zipDownload.suggestedFilename()).toMatch(/research-package\.zip$/)
  await zipDownload.saveAs(resolve(process.cwd(), `../../docs/validation/research-package-${testInfo.project.name}.zip`))
  const reportDownloadPromise = page.waitForEvent('download')
  await page.getByRole('button', { name: '下载医学数据报告 DOCX' }).click()
  const reportDownload = await reportDownloadPromise
  expect(reportDownload.suggestedFilename()).toMatch(/medical-data-report\.docx$/)
  await reportDownload.saveAs(resolve(process.cwd(), `../../docs/validation/medical-data-report-${testInfo.project.name}.docx`))
  await page.screenshot({ path: `../../docs/validation/ui-research-artifacts-${testInfo.project.name}.png`, fullPage: true })
  await page.screenshot({ path: `../../docs/validation/ui-full-flow-${testInfo.project.name}.png`, fullPage: true })
})
