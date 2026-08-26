// 演示截图脚本:打开 DSH web GUI,输入示例草稿,触发 ✨ 优化,截取
// 按钮位置 / 优化面板 / 面板+输入栏全景 / 应用后状态 四张效果图。
import puppeteer from 'puppeteer-core'

const DRAFT = '帮我写一个周报生成工具'

const browser = await puppeteer.launch({
  executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  headless: true,
  args: ['--no-sandbox', '--disable-gpu'],
})
const page = await browser.newPage()
await page.setViewport({ width: 1600, height: 900, deviceScaleFactor: 2 })
await page.goto('http://127.0.0.1:3080', { waitUntil: 'domcontentloaded', timeout: 60000 })

await page.waitForSelector('.prompt-optimize-btn', { timeout: 60000 })
await new Promise((r) => setTimeout(r, 3000))

// 1) 输入示例草稿
const ta = await page.$('textarea')
await ta.click()
await ta.type(DRAFT, { delay: 20 })
await new Promise((r) => setTimeout(r, 800))

const card = await page.$('[data-composer-card]')
const cardBox = await card.boundingBox()
const btn = await page.$('.prompt-optimize-btn')
const btnBox = await btn.boundingBox()

// 2) 按钮位置图:输入卡下部工具行(含 ✨/模型/发送)
await page.screenshot({
  path: 'docs/assets/demo-input-row.png',
  clip: {
    x: cardBox.x - 6,
    y: btnBox.y - 10,
    width: cardBox.width + 12,
    height: cardBox.y + cardBox.height - btnBox.y + 18,
  },
})

// 3) 点击 ✨ 并等待面板结果
await btn.click()
await page.waitForSelector('.prompt-optimize-panel', { timeout: 90000 })
await page.waitForFunction(
  () => !!document.querySelector('.prompt-optimize-result') || !!document.querySelector('.prompt-optimize-panel.is-error'),
  { timeout: 90000 },
)
await new Promise((r) => setTimeout(r, 500))
const panel = await page.$('.prompt-optimize-panel')
const panelBox = await panel.boundingBox()
await panel.screenshot({ path: 'docs/assets/demo-panel.png' })

// 4) 全景:面板 + 输入栏
await page.screenshot({
  path: 'docs/assets/demo-overview.png',
  clip: {
    x: panelBox.x - 12,
    y: panelBox.y - 8,
    width: panelBox.width + 24,
    height: cardBox.y + cardBox.height - panelBox.y + 16,
  },
})

// 5) 应用后:点击「应用」,草稿被替换
const applyBtn = await page.$('.prompt-optimize-primary')
if (applyBtn) {
  await applyBtn.click()
  await new Promise((r) => setTimeout(r, 800))
  const appCard = await page.$('[data-composer-card]')
  const appBox = await appCard.boundingBox()
  await page.screenshot({
    path: 'docs/assets/demo-applied.png',
    clip: {
      x: appBox.x - 6,
      y: appBox.y - 6,
      width: appBox.width + 12,
      height: appBox.height + 12,
    },
  })
}

const finalDraft = await page.evaluate(() => {
  return document.querySelector('textarea')?.value ?? ''
})
console.log('final draft:', JSON.stringify(finalDraft.slice(0, 120)))
await browser.close()
