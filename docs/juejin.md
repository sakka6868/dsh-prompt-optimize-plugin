# dsh-prompt-optimize-plugin:DeepSeek Harness 输入栏提示词优化插件

一个为 DeepSeek Harness(DSH)输入栏开发的提示词优化插件。在发送按钮左侧提供优化按钮,可将草稿提示词改写为结构更清晰的版本,供用户在发送前确认或放弃。

## 背景

提示词质量会影响 AI 输出的质量,但用户通常不会花时间把提示词写成结构化需求。该插件将这个步骤简化为一次点击:点击按钮后,由当前会话使用的模型对草稿进行改写,并显示原文与优化结果的对比。

## 功能说明

- 输入栏发送按钮左侧新增 ✨ 按钮;草稿为空时按钮不可用,优化进行中显示加载状态;
- 优化结果面板悬浮于输入框正上方,宽度与输入框同步,高度随内容自适应;
- 面板同时显示原文与优化结果;点击「应用」以优化结果替换草稿,点击「放弃」保持草稿不变;
- 原文默认折叠,可点击「查看原提示词」展开;
- 面板状态与会话绑定,切换会话后自动清空;
- 失败时(模型不可用、未配置模型、模型无输出等)面板显示错误信息,不影响输入。

## 效果展示

以下为当前版本(0.0.1)的真实运行截图。

**图① ✨ 按钮位置**

![✨ 优化按钮位置](https://cdn.jsdelivr.net/gh/sakka6868/dsh-prompt-optimize-plugin@main/docs/assets/effect-input-row.png)

**图② 优化对比面板**

![优化对比面板](https://cdn.jsdelivr.net/gh/sakka6868/dsh-prompt-optimize-plugin@main/docs/assets/effect-panel.png)

**图③ 面板与输入栏全景**

![面板与输入栏全景](https://cdn.jsdelivr.net/gh/sakka6868/dsh-prompt-optimize-plugin@main/docs/assets/optimize-panel-input.png)

**图④ 点击「应用」后**

![应用后效果](https://cdn.jsdelivr.net/gh/sakka6868/dsh-prompt-optimize-plugin@main/docs/assets/applied.png)

图片引用的是仓库公开 CDN 地址;若个别图片无法显示,可改为 GitHub raw 地址(`https://raw.githubusercontent.com/sakka6868/dsh-prompt-optimize-plugin/main/docs/assets/<文件名>`),或在编辑器中上传 `docs/assets/` 下的本地文件。

## 主要特点

1. 复用当前会话默认模型,无需额外配置 API Key,不改变原有模型选择;
2. 优化前后同屏对比,改动内容可直接查看;
3. 只有点击「应用」后草稿才会被替换;点击「放弃」则保持不变,可反复优化;
4. 优化期间输入框仍可正常使用;失败时显示明确错误信息;
5. 同一仓库提供两种形态:「动态插件源码」与「npm 静态插件包」,分别用于开发调试与常规部署。

## 应用场景

- 日常问答:将笼统的问题改写为包含背景、目标、步骤与约束的提示词;
- 代码相关:为代码改动补充任务说明、边界条件与验证要求;
- 长文档生成:拆分写作需求,使输出结构清晰;
- 教学与分享:通过前后对比展示提示词改写的方法。

## 技术实现

- 架构:浏览器端(Client)负责 ✨ 按钮与对比面板,宿主端(Host)负责模型调用;模型信息取自 `agentDefaultModel.currentSelection()`,调用通过 `llm.stream()` 完成,输出按 `text-delta` 分片拼接,无文本时以 `reasoning-delta` 兜底;
- 双形态:`src/` 为动态插件原始函数体(直接粘贴使用);`lib/` 为静态化适配产物(webServer 路由 + 模块加载器工厂);
- 已知边界:动态 Host 沙箱不提供 `AbortController` 等全局,模型调用不传 signal,超时依赖适配器自身策略;推理模型思考可能占用输出预算,故 `maxTokens` 设为 4096 并加入 reasoning 兜底;按钮排序依赖框架 CSS Module 类名,框架升级后可能需要更新;
- 约定:纯 JavaScript,无 TypeScript/JSX;样式使用 `--dsw-*` 主题变量。完整演进历史见 `docs/changelog.md`。

## 安装使用

方式一:动态模式(开发调试)。在 DSH 的 Cordis 动态插件面板新建插件,将 `src/host.js` 与 `src/client.js` 分别粘贴到 `code.host` 与 `code.client`,激活后即可使用。

方式二:静态插件(npm 包):

```powershell
dsh plugin --profile web add dsh-prompt-optimize-plugin@0.0.1
```

在 `~/.dsh/profiles/web/cordis.patch.yml` 中注册:

```yaml
- insert:
    - id: dsh-prompt-optimize
      name: 'dsh-prompt-optimize-plugin'
```

重启 DSH web 服务后生效。

## 项目信息

- 项目仓库(GitHub):https://github.com/sakka6868/dsh-prompt-optimize-plugin
- npm 包:`dsh-prompt-optimize-plugin@0.0.1`
- 许可证:MIT

欢迎使用。如有问题或改进建议,可在仓库提交 issue 或 Pull Request;如果项目对你有帮助,也欢迎 Star 支持。
