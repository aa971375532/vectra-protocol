# Vectra SDK 发布与开源包仓库上线指南 (npm & PyPI)

本指南指导如何将 Vectra Protocol 的官方 SDK 分别发布到 **npm** (JavaScript/TypeScript) 和 **PyPI** (Python) 全球公共包仓库。

---

## 一、JavaScript / TypeScript SDK (`@vectra/pay-sdk`)

### 1. 方式 A: 本地终端一键发布

1. **登录 npm 账号**（如果尚未登录）：
   ```bash
   npm login
   ```
   > 输入您的 npm 用户名、密码及邮箱验证码。

2. **进入 SDK 目录并发布**：
   ```bash
   cd packages/sdk
   npm publish --access public
   ```
   *注意：如果发布 `@vectra/pay-sdk`，需在 npmjs.com 上创建或拥有 `@vectra` 组织；若使用个人账号发布，可将 `package.json` 中的 name 改为 `vectra-pay-sdk` 或 `@你的用户名/vectra-pay-sdk`。*

3. **验证安装**：
   ```bash
   npm install @vectra/pay-sdk
   ```

---

## 二、Python SDK (`vectra-pay`)

### 1. 方式 A: 本地终端一键发布

1. **安装打包与上传工具**：
   ```bash
   pip install --upgrade build twine
   ```

2. **构建二进制轮子 (Wheel) 与源码包**：
   ```bash
   cd python-sdk
   python -m build
   ```
   执行完成后将在 `python-sdk/dist/` 下生成 `.whl` 和 `.tar.gz` 文件。

3. **上传到 PyPI 官方仓库**：
   ```bash
   twine upload dist/*
   ```
   > 提示输入 API Token 时，Username 输入 `__token__`，Password 输入您的 PyPI API Token (`pypi-...`)。

4. **验证安装**：
   ```bash
   pip install vectra-pay
   ```

---

## 三、方式 B: GitHub Actions 自动化一键发布 (推荐)

代码仓库已配置自动化发布流水线：`.github/workflows/publish-sdk.yml`。

1. **配置 GitHub Secrets**：
   - 访问代码仓库：`Settings -> Secrets and variables -> Actions -> New repository secret`
   - 添加 `NPM_TOKEN`：您的 npm Access Token (Automation 或 Publish 权限)。
   - 添加 `PYPI_API_TOKEN`：您的 PyPI API Token。
2. **触发发布**：
   - 前往仓库页面 `Actions -> Publish Vectra SDKs to npm & PyPI -> Run workflow`。
   - 选择目标（`all` / `npm` / `pypi`），点击运行即可完成全自动云端打包与发布。
