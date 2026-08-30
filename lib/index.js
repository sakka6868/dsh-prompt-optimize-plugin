// dsh-prompt-optimize-plugin — static host half (cordis plugin, ESM).
//
// Adapted from src/host.js for the STATIC plugin form:
//   - the dynamic plugin's harness.handle RPC is replaced by a webServer
//     exact POST route (/prompt-optimize);
//   - the optimization prompt, stream collection and error semantics are
//     kept identical to src/host.js (v0.0.2: reasoning content is never used
//     as the result; chain-of-thought lines are stripped; length guard).
export const name = 'dsh-prompt-optimize-plugin'

/** Hard dependency: the host HTTP carrier that owns the route table. */
export const inject = ['webServer']

const OPTIMIZE_SYSTEM = [
  '你是一个提示词优化助手。用户会在对话输入框中撰写一段原始提示词草稿，并通过输入框旁的优化提示词按钮提交给你。你的任务是把这段草稿改写成一个更加清晰、具体、可执行的提示词，使模型更容易准确完成任务。预期输出就是优化后的提示词全文：该文本会被应用回输入框、作为用户下一条要发送的消息直接使用，因此它必须是一段完整、独立、可直接发送的提示词。',
  '改写时请补充完成任务所必需的背景与上下文，但只能基于用户已提供的信息，不得假设或编造用户未提供的内容。',
  '请按以下顺序完成改写：',
  '1. 通读原始提示词，确定其核心任务目标与预期输出，并在改写结果中把这两点明确写出。',
  '2. 把任务拆分为清晰的步骤或要求，按执行顺序排列，让模型可以逐步遵循。',
  '3. 明确约束条件、输出格式与长度，使执行边界清楚、无歧义。',
  '4. 逐项核对原文：保留用户原意，不得删除任何关键要求；原文中的代码片段、命令、标识符、路径、数值等必须原样保留，不得修改或删除。',
  '5. 对原文中的含糊表述做具体化改写，但不引入任何新事实。',
  '输出格式与长度要求：输出语言与用户输入保持一致；最终输出必须且只能是一段干净、独立的优化提示词文本，不要任何解释、前言、标题、引号或代码块包裹。',
  '绝对禁止：不得把任何思考过程、分析、推理、理由、步骤说明写入输出，包括但不限于"我来分析""首先""其次""让我""我想""我认为""总结""优化后的提示词如下"等过程性表述；输出中不得出现对任务本身的评论或说明。',
  '篇幅目标：在完整、清晰传达任务的前提下尽量简短，一般不超过 500 字；如改写结果明显冗长，请果断精简。',
  '约束条件：绝对不得编造用户未提供的具体事实（文件名、路径、版本号、数据、链接等）；保持用户原意不变，不得改变或删除原文中的代码片段、命令、标识符、路径、数值等原文内容。',
].join('\n')

/** 剪除结果外的 ``` 围栏包裹(模型偶尔复犯)。 */
function stripFence(s) {
  const t = s.trim()
  if (t.startsWith('```') && t.endsWith('```')) {
    const inner = t.slice(3, t.length - 3).trim()
    const nl = inner.indexOf('\n')
    const body = nl >= 0 ? inner.slice(nl + 1).trim() : inner
    if (body !== '') return body
  }
  return t
}

/** 保守清洗:删除明显的思维链痕迹(整行匹配的过程性话术)。 */
function stripChainLines(s) {
  const kept = []
  for (const line of s.split('\n')) {
    const t = line.trim()
    if (t === '') { kept.push(line); continue }
    const isMeta = /^(好的|[好]的|没问题|收到|我来|让我|首先|其次|然后|接下来|总结|总的来说|综上所述|我的思考|思考过程|推理过程|分析如下|优化后的提示词如下|以下是优化结果|结果如下)[,，:：、`\s]*$/u.test(t)
    const isProcess = /^(我想|我认为|我觉得|让我|我先|我们可以|我们需要|我的思路|思路如下|简短分析|重写如下|正文如下)[\s\S]{0,40}$/u.test(t)
    if (isMeta || isProcess) continue
    kept.push(line)
  }
  return kept.join('\n').trim()
}

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
    let failure = null
    for await (const chunk of stream) {
      if (chunk.type === 'text-delta') {
        parts.set(chunk.index, (parts.get(chunk.index) || '') + chunk.text)
      } else if (chunk.type === 'finish') {
        if (chunk.reason.kind === 'error' || chunk.reason.kind === 'aborted') {
          const f = chunk.reason.failure
          failure = (f && f.message) ? String(f.message) : ('模型调用失败(' + chunk.reason.kind + ')')
        }
      }
    }
    if (failure !== null) return { ok: false, error: String(failure) }
    // 只接受正文字段;推理/思考内容(reasoning-delta)一律不作为结果
    let optimized = [...parts.keys()].sort((a, b) => a - b)
      .map((i) => parts.get(i)).join('').trim()
    if (optimized === '') return { ok: false, error: '模型未输出优化文本(可能仅返回了思考内容),请重试或更换模型' }
    optimized = stripFence(optimized)
    if (optimized.length > 2000) return { ok: false, error: '优化结果过长(疑似包含思考内容),请重试' }
    optimized = stripChainLines(optimized)
    if (optimized === '') return { ok: false, error: '优化结果为空,请重试' }
    return { ok: true, text: optimized, chars: optimized.length }
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
