// E2E 演示:真实操作 DSH web GUI(输入 → ✨ 优化 → 面板 → 应用),逐环节断言,
// 并按抖音分镜输出竖版合成所需的横版素材图。任何断言失败以非零退出。
import puppeteer from 'puppeteer-core'
import { mkdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

const DRAFT = '帮我写一个周报生成工具'
const OUT = fileURLToPath(new URL('../docs/assets/video/', import.meta.url))
mkdirSync(OUT, { recursive: true })

const browser = await puppeteer.launch({
  executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  headless: true,
  args: ['--no-sandbox', '--disable-gpu'],
})
const page = await browser.newPage()
await page.setViewport({ width: 1600, height: 900, deviceScaleFactor: 1 })

function assert(cond, msg) {
  if (!cond) {
    console.error('E2E FAIL: ' + msg)
    process.exit(1)
  }
  console.log('E2E PASS: ' + msg)
}

// 1) 打开 GUI
await page.goto('http://127.0.0.1:3080', { waitUntil: 'domcontentloaded', timeout: 60000 })
await page.waitForSelector('.prompt-optimize-btn', { timeout: 60000 })
assert(true, 'GUI 打开,✨ 按钮已渲染')
await new Promise((r) => setTimeout(r, 2500))

// 2) 输入草稿 → 按钮可用
const ta = await page.$('textarea')
await ta.click()
await ta.type(DRAFT, { delay: 15 })
await new Promise((r) => setTimeout(r, 600))
const btnDisabled = await page.$eval('.prompt-optimize-btn', (b) => b.disabled)
assert(!btnDisabled, '草稿非空时 ✨ 按钮可用')
await page.screenshot({ path: OUT + 'shot-2-input.png' })

// 3) 点击 ✨ → 面板结果
await page.click('.prompt-optimize-btn')
await page.waitForSelector('.prompt-optimize-panel', { timeout: 90000 })
const panelError = await page.$('.prompt-optimize-panel.is-error')
if (panelError) {
  const errText = await page.$eval('.prompt-optimize-error-text', (e) => e.textContent)
  console.error('E2E FAIL: 优化面板进入错误态: ' + errText)
  process.exit(1)
}
await page.waitForFunction(() => !!document.querySelector('.prompt-optimize-result'), { timeout: 90000 })
const resultText = await page.$eval('.prompt-optimize-result', (e) => e.textContent.trim())
assert(resultText.length > 0, '面板返回非空优化结果')
assert(!resultText.includes(DRAFT), '优化结果与原文不同')
await page.screenshot({ path: OUT + 'shot-3-panel.png' })
await page.screenshot({ path: OUT + 'shot-5-overview.png' })

// 4) 展开原文,截一帧对比镜头
await page.click('.prompt-optimize-orig-toggle summary')
await new Promise((r) => setTimeout(r, 400))
await page.screenshot({ path: OUT + 'shot-6-compare.png' })

// 5) 应用 → 草稿被替换
await page.click('.prompt-optimize-primary')
await new Promise((r) => setTimeout(r, 900))
const finalDraft = await page.$eval('textarea', (t) => t.value)
assert(finalDraft.length > 0 && finalDraft !== DRAFT, '应用后草稿被替换为优化文本')
await page.screenshot({ path: OUT + 'shot-4-applied.png' })

// 6) GitHub 仓库页截图(分镜 7 素材)
const repoPage = await browser.newPage()
await repoPage.setViewport({ width: 1600, height: 1000, deviceScaleFactor: 1 })
await repoPage.goto('https://github.com/sakka6868/dsh-prompt-optimize-plugin', {
  waitUntil: 'networkidle2',
  timeout: 60000,
})
await new Promise((r) => setTimeout(r, 2500))
const title = await repoPage.title()
assert(title.includes('dsh-prompt-optimize-plugin') || title.includes('GitHub'), 'GitHub 仓库页可访问')
await repoPage.screenshot({ path: OUT + 'shot-7-repo.png' })
await repoPage.close()

console.log('E2E ALL PASS')
await browser.close()
