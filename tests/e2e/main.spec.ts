import { test, expect } from '@playwright/test'

test.describe('主界面', () => {
  test('显示核心元素', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByTestId('app-root')).toBeVisible()
    await expect(page.getByTestId('source-desktop')).toBeAttached()
    await expect(page.getByTestId('btn-start')).toBeVisible()
    await expect(page.getByTestId('duration-display')).toHaveText('00:00')
    await expect(page.getByTestId('status-text')).toContainText('准备就绪')
  })

  test('主界面视觉回归', async ({ page }) => {
    await page.goto('/')
    await expect(page).toHaveScreenshot('main-interface.png', {
      maxDiffPixelRatio: 0.001,
    })
  })

  test('切换到窗口模式显示窗口选择器', async ({ page }) => {
    await page.goto('/')
    await page.getByTestId('source-window').click({ force: true })
    await expect(page.getByTestId('window-picker')).toBeVisible()
  })
})
