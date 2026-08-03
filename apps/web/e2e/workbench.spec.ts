import { test, expect } from '@playwright/test'

test('doctor can view normal patient and submit simulated draft', async ({ page }) => {
  await page.goto('/workbench/E001')
  await expect(page.getByTestId('doctor-workbench')).toBeVisible()
  await expect(page.getByText('候选方案横向比较')).toBeVisible()
  await page.getByRole('button', { name: /采纳并生成草稿/ }).click()
  await expect(page.getByText(/SIMULATED_DRAFT_WRITTEN/)).toBeVisible()
})

test('confirmed allergy blocks draft creation on second admission', async ({ page }) => {
  await page.goto('/workbench/E002-2')
  await expect(page.getByText(/已确认药物过敏/)).toBeVisible()
  await expect(page.getByRole('button', { name: /采纳并生成草稿/ })).toBeDisabled()
})

test('missing labs are shown as missing instead of normal', async ({ page }) => {
  await page.goto('/workbench/E005')
  await expect(page.getByText('关键检验缺失：C反应蛋白，不得按正常值处理')).toBeVisible()
  await expect(page.getByText('关键检验缺失：肌酐，不得按正常值处理')).toBeVisible()
})
