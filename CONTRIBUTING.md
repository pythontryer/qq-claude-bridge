# 贡献指南

感谢你考虑为此项目贡献代码！

## 报告问题

- 使用 GitHub Issues 提交 bug 报告或功能请求
- 请尽量详细描述：运行环境、复现步骤、预期行为和实际行为

## 提交 Pull Request

1. Fork 本仓库
2. 创建你的特性分支：`git checkout -b feat/my-feature`
3. 提交你的改动：`git commit -m 'feat: add some feature'`
4. 推送到分支：`git push origin feat/my-feature`
5. 发起 Pull Request

## 代码风格

- 本项目使用原生 ES Module（`type: "module"`）
- 保持现有的代码风格和注释习惯
- 敏感信息（API Key、Token 等）必须通过环境变量传入，**严禁硬编码**

## 开发注意事项

- 在 `.env` 中配置你的测试凭据，**切勿提交 `.env` 文件**
- 提交前确认 `.env` 不在暂存区中
- 确保代码在 Node.js >= 18 下正常运行

## Commit 规范

建议使用 [Conventional Commits](https://www.conventionalcommits.org/) 格式：

- `feat:` 新功能
- `fix:` 修复 bug
- `docs:` 文档变更
- `refactor:` 重构
- `chore:` 构建/工具链变更
