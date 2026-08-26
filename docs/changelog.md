# 变更记录(Changelog)

## 发行版(npm)

### 0.0.1(dsh-prompt-optimize-plugin,2026-08-25)

- 首个 npm 发行版(静态化形态):`lib/index.js`(webServer `POST /prompt-optimize` 路由)+ `lib/client.js`(模块加载器工厂 + `fetch`);
- 包名确定为 `dsh-prompt-optimize-plugin`,许可证 MIT,开源配套(README/LICENSE/CONTRIBUTING/CODE_OF_CONDUCT)落地。

### 0.1.0(prompt-optimize-plugin,2026-08-25)

- 同名旧包(未带 `dsh-` 前缀)的首个发行版:仅动态 `src/` 源码与文档;后续以 `dsh-prompt-optimize-plugin` 为正式名称。

---

## 动态插件迭代(上下文)

动态插件 `pmopt-1` 的完整迭代历史。每个条目对应一次 `cordis_define`(追加不可变 Package)+ `cordis_run`(run/update)。

## pkg-10(当前)

- 面板高度改为**内容自适应**(移除与输入框等高的固定高度;优化文本区上限 320px、原文区上限 120px,超出内部滚动);
- 面板宽度仍与输入框实时同步(`ResizeObserver` 监听 `[data-composer-card]`);
- 按钮通过 CSS flex `order` 重排到**发送按钮左侧**:`.prompt-optimize-btn { order: 1 }`,并追加 `[data-composer-card] .uV2eYG_primary { order: 2 }`。

## pkg-9

- 修复 v8 引入的「点击优化后面板不显示」:原实现中面板在尺寸测量完成前直接返回 `null`,导致 DOM 未挂载、`panelRef.current` 恒为 `null`、测量 Effect 永远无法执行。
- 修复方式:面板先渲染 DOM(挂载 ref),尺寸未就绪时以 `visibility: hidden` 隐藏,Effect 测量后显示。

## pkg-8

- 面板从 `conversation.input.dock` 迁移至 `conversation.input.overlay`(composer 卡片顶部浮动锚);
- 通过 `getBoundingClientRect()` 读取 `[data-composer-card]` 尺寸,以内联样式将面板宽高设为与输入框一致;`ResizeObserver` 实现尺寸同步。

## pkg-7

- 面板水平居中(`margin: 0 auto`),位于输入框正上方中心。

## pkg-6

- 面板限宽 `max-width: 680px`,不再占满聊天窗口;
- 面板状态绑定 `sessionId`,切换会话时自动清空(修复跨会话残留)。

## pkg-5

- 视觉紧凑化:默认只显示优化文本(限高滚动);原文折叠为「查看原提示词」(原生 `<details>`);缩小内边距与字号,移除左右对比大块布局。

## pkg-4

- 修复「模型未返回优化文本」:推理模型思考内容计入输出预算,`maxTokens: 1024` 被思考吃光导致最终无文本;
- `maxTokens` 提升至 **4096**;增加 `reasoning-delta` 兜底(无文本时退回思考内容);
- 系统提示追加「思考结束后,最终回答中单独输出优化后的提示词文本」。

## pkg-3

- 恢复缺失的 Client 半部(完整双端);
- Host 保持 v2 的修复(无 `AbortController`)。

## pkg-2

- 修复 Host 沙箱报错 `AbortController is not defined`:动态 Host 沙箱无 Node 全局 `AbortController`(仅 `ctx`/`harness`/`console`/`btoa`/`atob`/`TextEncoder`/`TextDecoder`);
- 移除 `AbortController` 与手动 30s 超时,LLM 调用不传 `signal`,超时依托适配器自身空闲超时与重试策略。
- 注意:本次只提交了 Host 半部,导致 Client 半部缺失(在 pkg-3 恢复)。

## pkg-1(首个版本)

- 初始功能:输入栏发送按钮左侧 ✨ 按钮(`conversation.input.right`,id `prompt-optimize`)+ composer 上方对比面板(`conversation.input.dock`,id `prompt-optimize-panel`);
- Host RPC `prompt-optimize`:经 `agentDefaultModel.currentSelection()` 获取模型,`llm.stream()` 按 `text-delta` 拼接优化文本;
- Client:点击 → loading → 「应用」以 `inputActions.setDraft()` 替换草稿;「放弃」关闭;错误态展示。
- 已知问题:Host 代码使用了 `AbortController`(沙箱不可用),见 pkg-2。
