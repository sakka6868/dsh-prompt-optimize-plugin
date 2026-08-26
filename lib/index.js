// dsh-prompt-optimize-plugin — static host half (cordis plugin, ESM).
//
// Adapted from src/host.js for the STATIC plugin form:
//   - the dynamic plugin's harness.handle RPC is replaced by a webServer
//     exact POST route (/prompt-optimize);
//   - the optimization prompt, stream collection, reasoning fallback and
//     error semantics are kept identical to src/host.js.
export const name = 'dsh-prompt-optimize-plugin'

/** Hard dependency: the host HTTP carrier that owns the route table. */
export const inject = ['webServer']

const OPTIMIZE_SYSTEM = [
  '你是一个提示词优化助手。',
  '用户会提供一段原始的提示词。请把它改写得更加清晰、具体、可执行,使模型更容易准确完成任务:',
  '- 明确任务目标与预期输出;',
  '- 补充必要的背景与上下文(仅基于用户已提供的信息);',
  '- 拆分为清晰的步骤或要求;',
  '- 明确约束条件、输出格式与长度;',
  '- 保留用户原意,不得改变或删除原有的代码片段、命令、标识符、路径、数值等原文内容;',
  '- 绝对不得编造用户未提供的具体事实(文件名、路径、版本号、数据、链接等)。',
  '输出语言与用户输入保持一致。',
  '如果你会先进行思考,请确保思考结束后,最终回答中单独输出优化后的提示词文本。',
  '只输出优化后的提示词本身:不要任何解释、前言、标题、引号或代码块包裹。',
].join(' ')

/** Collect the request body as UTF-8 text (bounded to 256 KiB). */
function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = []
    let size = 0
    req.on('data', (chunk) => {
      size += chunk.length
      if (size > 262144) {
        reject(new Error('body too large'))
        req.destroy()
        return
      }
      chunks.push(chunk)
    })
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')))
    req.on('error', reject)
  })
}

function sendJson(res, status, data) {
  if (res.headersSent) return
  res.writeHead(status, { 'content-type': 'application/json; charset=utf-8' })
  res.end(JSON.stringify(data))
}

/** Run the optimization call with the exact src/host.js semantics. */
async function optimize(ctx, text) {
  if (text === '') return { ok: false, error: '草稿为空' }
  const model = ctx.get('agentDefaultModel')
  if (model === undefined) return { ok: false, error: '默认模型服务不可用' }
  const llm = ctx.get('llm')
  if (llm === undefined) return { ok: false, error: 'LLM 服务不可用' }
  let sel
  try {
    sel = model.currentSelection()
  } catch (err) {
    return { ok: false, error: '读取当前模型选择失败' }
  }
  if (!sel || typeof sel.provider !== 'string' || typeof sel.model !== 'string') {
    return { ok: false, error: '未配置可用的模型' }
  }
  try {
    const stream = llm.stream({
      provider: sel.provider,
      model: sel.model,
      messages: [{
        role: 'user',
        content: [{ type: 'text', text: text }],
        source: { kind: 'plugin', plugin: 'prompt-optimize' },
      }],
      system: OPTIMIZE_SYSTEM,
      maxTokens: 4096,
      temperature: 0.3,
    })
    const parts = new Map()
    const reasoningParts = new Map()
    let failure = null
    for await (const chunk of stream) {
      if (chunk.type === 'text-delta') {
        parts.set(chunk.index, (parts.get(chunk.index) || '') + chunk.text)
      } else if (chunk.type === 'reasoning-delta') {
        reasoningParts.set(chunk.index, (reasoningParts.get(chunk.index) || '') + chunk.text)
      } else if (chunk.type === 'finish') {
        if (chunk.reason.kind === 'error' || chunk.reason.kind === 'aborted') {
          const f = chunk.reason.failure
          failure = (f && f.message) ? String(f.message) : ('模型调用失败(' + chunk.reason.kind + ')')
        }
      }
    }
    if (failure !== null) return { ok: false, error: String(failure) }
    let optimized = [...parts.keys()].sort((a, b) => a - b)
      .map((i) => parts.get(i)).join('').trim()
    if (optimized === '') {
      optimized = [...reasoningParts.keys()].sort((a, b) => a - b)
        .map((i) => reasoningParts.get(i)).join('').trim()
    }
    if (optimized === '') return { ok: false, error: '模型未返回优化文本' }
    return { ok: true, text: optimized }
  } catch (err) {
    return { ok: false, error: '优化失败: ' + ((err && err.message) ? String(err.message) : String(err)) }
  }
}

export function apply(ctx) {
  ctx.effect(() => ctx.webServer.register({
    kind: 'exact',
    path: '/prompt-optimize',
    handler: async (req, res) => {
      if (req.method !== 'POST') {
        sendJson(res, 405, { ok: false, error: 'method not allowed' })
        return
      }
      let payload
      try {
        payload = JSON.parse(await readBody(req))
      } catch (err) {
        sendJson(res, 400, { ok: false, error: 'invalid JSON body' })
        return
      }
      const text = (payload && typeof payload.text === 'string') ? payload.text.trim() : ''
      const result = await optimize(ctx, text)
      sendJson(res, result.ok ? 200 : 200, result)
    },
  }), 'dsh-prompt-optimize-plugin: /prompt-optimize route')
}
