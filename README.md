# 电子半导体行情日报 · 操作手册（实习生版）

每个交易日收盘后，生成一份《电子半导体行情点评》Word 稿。整条流程已封装成 Claude Code 的一条命令 `/daily-report`，你**只需要打一条命令**，其余取数、写稿、排版、合规检查都自动完成。

本手册分三部分：**① 第一次装环境 → ② 每天怎么跑 → ③ 出问题怎么办**。

---

## ⏰ 硬性时间要求

**必须在北京时间 15:05 之后**（A股收盘结算完成）才能跑。
早于 15:05 跑，iFinD 返回的是盘中最新价而非收盘价，稿子数据会错。命令本身也会拦截并提示重试。

---

## ① 第一次装环境（只做一次）

新机器上按顺序装好这几样，**每一步都不能跳**：

| # | 装什么 | 怎么验证 |
|---|--------|----------|
| 0 | **项目放在 `D:\daily report`** | 命令里写死了这个路径，把整个项目文件夹放到 `D:\daily report`，其余步骤零改动 |
| 1 | **Node.js**（18+） | 命令行 `node -v` 有版本号 |
| 2 | **项目依赖** | 在项目目录运行 `npm install`（装 adm-zip、mammoth） |
| 3 | **iFinD 助手目录 + SDK** | 见下方「iFinD 配置」 |
| 4 | **填自己的 iFinD 账号** | 运行 `node setup_ifind.js` 录入你自己的账号密码 |
| 5 | **iFinD 客户端登录** | 启动 `SuperCommand.exe` 并登录**同一个**你自己的 iFinD 账号 |
| 6 | **Claude Code + iFinD 新闻 MCP** | 确认 `hexin-ifind-ds-news-mcp` 已连接 |
| 7 | **config.json** | 见下方「配置 python 路径」 |

### iFinD 配置
1. **拿到助手目录**：向负责人索取 `.ifind` 工具目录，放到你的用户目录下（`C:\Users\你的用户名\.ifind\`），里面要有 `ifind_helper.py`。**不要拷贝里面的 `credentials.json`**（那是别人的账号）。
2. **装 SDK**：运行 iFinD 的 `THSDataInterface_Windows\bin\x64\InstallPython.bat`，让 `import iFinDPy` 能直接用。
3. **填你自己的账号**：在项目目录运行
   ```bash
   node setup_ifind.js
   ```
   按提示输入**你自己的** iFinD 账号 / 密码（密码输入时以 `*` 掩码），脚本会写入 `~/.ifind/credentials.json`。
   > ⚠️ 这是明文账号密码，别提交 git、别外发、别放共享盘（`.gitignore` 已排除它）。
4. **登录客户端**：启动 `SuperCommand.exe`，登录**同一个**账号。同一账号在别处登录会把这边顶掉。

### 配置 python 路径
1. 命令行运行 `where python`，复制第一条完整路径（通常是 Anaconda 里的 `python.exe`）。
2. 把项目里的 `config.example.json` 复制一份改名为 `config.json`。
3. 把 `pythonPath` 改成上一步那条路径（注意 Windows 路径用双反斜杠 `\\`）。

### 装完自检
```bash
node preflight.js
```
逐项体检环境，全绿（或只剩 🟡 提醒）才算装好。🔴 项按脚本给的「修复」提示处理后重跑。

---

## ② 每天怎么跑

1. **确认时间** ≥ 北京时间 15:05。
2. （建议每天开工前跑一次）`node preflight.js` 确认 iFinD 登录态没掉。
3. 在 Claude Code 里输入：
   ```
   /daily-report
   ```
4. 命令会自动完成：取三大指数+国证芯片+3只ETF行情 → 拉盘面新闻 → 参考近2份历史报告风格写稿 → **自动合规检查** → 生成 docx。
5. 成稿在 `reports/2026.M.D市场点评.docx`，打开通读一遍再交付。

### 合规红绿灯（自动）
生成前会自动跑 `compliance_check.js` 扫三段正文：
- 🔴 **硬拦**：点名券商/研究机构、"研报指出"等引述前缀、"买入/卖出/加仓"等操作指向、三段合计超 1000 字、section 缺关键词 → **直接中止，不出稿**，按提示改。
- 🟡 **人工复核**：炒作/追高/泡沫/警惕等情绪词、目标价/增减持 → 出稿但**你要自己判断**是否换成中性表述。
- 🟢 全过 → 正常出稿。

> 想手动单独检查某份草稿：`node compliance_check.js content_temp.json`

---

## ③ 出问题怎么办

| 现象 | 原因 | 处理 |
|------|------|------|
| 提示"A股尚未收盘结算" | 早于 15:05 | 等到 15:05 后重跑 |
| iFinD 取数报错/超时 | 登录态掉了 | 重启 `SuperCommand.exe` 重新登录，再 `node preflight.js` |
| `iFinD 凭证` 未找到 | 没填自己的账号 | 运行 `node setup_ifind.js` 录入你自己的账号 |
| `iFinD 取数` 字段异常 | 账号被别处顶掉 | 确认没人用同一账号，重新登录 |
| `node preflight.js` 报 python 跑不了 | pythonPath 不对 | `where python` 重新填 `config.json` |
| 合规检查 🔴 被拦 | 稿子踩了红线 | 按打印的问题改 `content_temp.json` 或让 Claude 重写对应段落 |
| 新闻工具返回空 | MCP 没连 / 关键词太窄 | 确认 `hexin-ifind-ds-news-mcp` 已连接 |
| 生成的 docx 打不开/太短 | 模板缺失 | 确认 `reports/` 里有历史报告作模板 |

### 什么时候找负责人
- iFinD 账号 / `~/.ifind` 目录 / `credentials.json` 相关问题
- 合规红线拿不准（尤其 🟡 情绪词、涉概念股异动澄清的表述）
- **对外发布前的终稿把关**（合规敏感稿件，发前请负责人过目）

---

## 文件说明

| 文件 | 作用 | 要不要动 |
|------|------|----------|
| `.claude/commands/daily-report.md` | `/daily-report` 命令的全部逻辑与合规规则 | 别随意改，改前问负责人 |
| `generate_report.js` | 把 JSON 内容套模板生成 docx | 不用动 |
| `compliance_check.js` | 合规红绿灯，黑名单可增删 | 加新禁词时改这里 |
| `preflight.js` | 环境自检 | 不用动 |
| `setup_ifind.js` | 录入你自己的 iFinD 账号到 `~/.ifind/credentials.json` | 换账号时重跑 |
| `config.json` | 你本机的 python 路径（不进 git） | 每台机器各自配 |
| `reports/` | 历史报告 + 每日成稿 | 成稿在这里取 |
