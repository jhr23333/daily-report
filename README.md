# 电子半导体行情日报 · 操作手册（实习生版）

每个交易日收盘后，生成一份《电子半导体行情点评》Word 稿。整条流程已封装成 Claude Code 的一条命令 `/daily-report`，你**只需要打一条命令**，其余取数、写稿、排版、合规检查都自动完成。

本手册分三部分：**① 第一次装环境 → ② 每天怎么跑 → ③ 出问题怎么办**。

---

## ⏰ 硬性时间要求

**必须在北京时间 15:05 之后**（A股收盘结算完成）才能跑。
早于 15:05 跑，iFinD 返回的是盘中最新价而非收盘价，稿子数据会错。命令本身也会拦截并提示重试。

---

## ⚠️ 开始前：先找负责人（江老师）开通这 3 样

这三样**不在仓库里、也没法放进仓库**，是绑定账号/授权的东西，必须先要到，否则后面每一步都卡住：

| 要什么 | 干嘛用 | 备注 |
|--------|--------|------|
| **① 你自己的 iFinD 账号（席位）** | 登录客户端 + 取行情数据 | 每人一个账号，不能和别人共用（会互相顶掉登录） |
| **② iFinD 数据接口安装包下载权限** | 安装 `THSDataInterface_Windows`（提供 `iFinDPy`） | 从 iFinD 客户端 / 官方渠道下载，需要账号权限 |
| **③ 你自己的 51ifind MCP token** | 新闻 MCP（`hexin-ifind-ds-news-mcp`）鉴权 | 一段 JWT。**用你自己的，别用别人的**；见下方「配置新闻 MCP」 |

> 💻 **仅限 Windows**：整套流程依赖 PowerShell、`SuperCommand.exe`、Windows 路径，Mac/Linux 跑不了。

---

## ① 第一次装环境（只做一次）

拿到上面 3 样后，按顺序装好这几样，**每一步都不能跳**：

| # | 装什么 | 怎么验证 |
|---|--------|----------|
| 0 | **项目放在 `D:\daily report`** | 命令里写死了这个路径，把整个项目文件夹放到 `D:\daily report`，其余步骤零改动 |
| 1 | **Claude Code** | 命令行 `claude --version` 有版本号（这套流程靠它跑 `/daily-report`） |
| 2 | **Node.js**（18+） | 命令行 `node -v` 有版本号 |
| 3 | **项目依赖** | 在项目目录运行 `npm install`（装 adm-zip、mammoth） |
| 4 | **iFinD 助手 + SDK** | 见下方「iFinD 配置」（工具本体已在仓库 `ifind-toolkit/`） |
| 5 | **填自己的 iFinD 账号** | 运行 `node setup_ifind.js` 录入你自己的账号密码 |
| 6 | **iFinD 客户端登录** | 启动 `SuperCommand.exe` 并登录**同一个**你自己的 iFinD 账号 |
| 7 | **config.json（python 路径）** | 见下方「配置 python 路径」 |
| 8 | **iFinD 新闻 MCP** | 见下方「配置新闻 MCP」，`/mcp` 里能看到 `hexin-ifind-ds-news-mcp` 已连接 |

### iFinD 配置
1. **安装助手脚本**：本仓库已自带工具本体，见 [`ifind-toolkit/`](ifind-toolkit/README.md)。按它的说明把 `ifind_helper.py` 复制到你的 `C:\Users\你的用户名\.ifind\`。**仓库里不含 `credentials.json`**（账号密码每人用自己的，见第 3 步）。
2. **装 SDK**：向负责人要 iFinD 客户端下载权限，装 `THSDataInterface_Windows`，运行 `bin\x64\InstallPython.bat`，让 `import iFinDPy` 能直接用。详见 [`ifind-toolkit/README.md`](ifind-toolkit/README.md)。
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

> ⚠️ **关键**：`config.json` 里填的这个 python，必须是第 4 步 `InstallPython.bat` **装进 `iFinDPy` 的那个 python**。装 SDK 时用的哪个 python 环境，这里就填哪个，否则会「python 能跑但 import iFinDPy 失败」。

### 配置新闻 MCP（`hexin-ifind-ds-news-mcp`）
`/daily-report` 的盘面新闻素材来自这个 HTTP MCP，必须在你的 Claude Code 里加好、且用**你自己的** token（向负责人要你那份 51ifind MCP token，别用别人的）。

在命令行运行（把 `<你的token>` 换成实际 JWT）：
```bash
claude mcp add --transport http --scope user hexin-ifind-ds-news-mcp \
  https://api-mcp.51ifind.com:8643/ds-mcp-servers/hexin-ifind-ds-news-mcp \
  --header "Authorization: <你的token>"
```
加完在 Claude Code 里跑 `/mcp`，看到 `hexin-ifind-ds-news-mcp` 状态为 connected 即可。
> token 是明文凭证，别写进仓库、别外发。

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
| 新闻工具返回空 / 报 401 / 无此工具 | MCP 没连 / token 无效过期 / 关键词太窄 | `/mcp` 看 `hexin-ifind-ds-news-mcp` 是否 connected；401 就是 token 问题，找负责人要新的重配 |
| `import iFinDPy` 失败 | config.json 的 python 不是装了 SDK 的那个 | 用装 SDK 的那个 python 路径填 `config.json`，或对该 python 重跑 `InstallPython.bat` |
| 生成的 docx 打不开/太短 | 模板缺失 | 确认 `reports/` 里有历史报告作模板 |

### 什么时候找负责人（江老师）
- **开通类**（上手必需）：你自己的 iFinD 账号、iFinD SDK 下载权限、你自己的 51ifind MCP token
- iFinD 账号 / `~/.ifind` 目录 / `credentials.json` 相关问题
- 新闻 MCP 连不上或报 401（token 失效）
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
