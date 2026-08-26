# 贡献指南

感谢你对 `dsh-prompt-optimize-plugin` 的兴趣!任何形式的贡献(代码、文档、问题反馈、测试)都受欢迎。

## 环境准备

- Node.js ≥ 20;
- pnpm(项目无构建依赖,仅用于打包/安装验证);
- 建议先跑通 README「安装与使用」中的两种形态,再动手改代码。

## 目录约定(务必先读)

| 路径 | 职责 | 改动原则 |
|---|---|---|
| `src/host.js` | 动态插件 Host 半部(函数体) | 与 `lib/index.js` 的优化逻辑保持语义一致 |
| `src/client.js` | 动态插件 Client 半部(函数体) | 与 `lib/client.js` 的组件逻辑保持语义一致 |
| `lib/index.js` | 静态 Host 适配(webServer 路由) | 新功能同时回写两端,保持行为一致 |
| `lib/client.js` | 静态 Client 适配(模块工厂) | 同上 |
| `docs/` | 文档与宣传文案 | 如实描述,不虚构效果 |

> 双形态是本项目的核心约束:任何功能/样式改动都应同时落在动态(`src/`)与静态(`lib/`)两处,并在 `docs/changelog.md` 记录。

## 代码规范

- **纯 JavaScript(ES2020)**,无 TypeScript、无 JSX、无打包器;
- Host 半部遵循动态沙箱限制:不使用 `AbortController`/`fetch`/`require` 等不可用全局(见 README「运行约束」);
- Client 半部只使用 `React.createElement`,不写 JSX;浏览器全局仅用未遮蔽的(`ResizeObserver`、`Element.closest` 等);
- 样式统一使用 `--dsw-*` 主题 CSS 变量,不硬编码颜色;
- 提交前执行 `node --check lib/index.js && node --check lib/client.js` 做语法验证。

## 提交规范

- 提交信息使用前缀:`feat:`(新功能)、`fix:`(修复)、`docs:`(文档)、`style:`(样式)、`refactor:`(重构)、`test:`(测试);
- 一次提交只做一件事;改动与 src/lib 双端同步的提交请注明「双端同步」。

## 提交流程

1. Fork 仓库并创建自己的分支:`git checkout -b feat/xxx`;
2. 修改并自测;
3. 提交并推送:`git push origin feat/xxx`;
4. 打开 Pull Request,描述:改动动机、行为差异、是否双端同步、自测方式;
5. 维护者 review 后合并。

## 反馈问题

- Bug 请附:DSH 版本、插件版本、复现步骤、期望/实际行为;
- 新功能建议请说明使用场景,便于评估优先级。
