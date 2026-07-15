# AGENTS.md — 电子半导体行情日报项目

> Claude Code 读 `CLAUDE.md` / `.claude/commands/`；Codex 读本文件 `AGENTS.md` / `.codex/prompts/`。
> 两端行为需保持一致：改任一端的 workflow / 规则 / 脚本时，必须同步另一端。

## 这个项目是什么

每个交易日收盘后，生成一份《电子半导体行情点评》Word 稿（`reports/YYYY.M.D市场点评.docx`）。
完整上手、装环境、报错处理见 **[README.md](README.md)**（面向实习生的操作手册）。

## 怎么跑

- **Claude Code**：输入 `/daily-report`
- **Codex**：运行 `.codex/prompts/daily-report.md` 里的流程（内容与 Claude 端命令完全一致）

命令完整逻辑与合规规则见 `.codex/prompts/daily-report.md`（= `.claude/commands/daily-report.md`）。

## 硬性前提

- **北京时间 15:05 之后**才能跑（A股收盘结算完成），否则数据是盘中价。
- **仅限 Windows**（依赖 PowerShell / `SuperCommand.exe` / Windows 路径）。
- iFinD 行情取数依赖 `~/.ifind/ifind_helper.py`（仓库 `ifind-toolkit/` 提供）+ iFinD SDK（`iFinDPy`，`InstallPython.bat` 安装）+ 本人 iFinD 账号（`node setup_ifind.js` 录入）。
- `config.json` 的 python 必须是装了 `iFinDPy` 的那个 python。
- 新闻素材依赖 iFinD 新闻 MCP（`hexin-ifind-ds-news-mcp`，HTTP 型，需本人 51ifind token；仅用 `search_news`，`search_trending_news` 已下线）。
- **上手前需负责人开通**：本人 iFinD 账号、iFinD SDK 下载权限、本人 51ifind MCP token。安装详见 [README.md](README.md) 与 [ifind-toolkit/README.md](ifind-toolkit/README.md)。

## 脚本一览

| 脚本 | 作用 |
|------|------|
| `node preflight.js` | 环境自检（依赖 / python / iFinD 凭证 / 取数），开工前先跑 |
| `node setup_ifind.js` | 录入本人 iFinD 账号密码到 `~/.ifind/credentials.json` |
| `node compliance_check.js <json>` | 合规红绿灯：🔴点名友商/引述前缀/操作指向/超1000字→拦截；🟡情绪词/目标价→人工复核 |
| `node generate_report.js <json>` | 套模板生成 docx |

## 合规红线（compliance_check.js 自动拦截）

- 禁点名券商/研究机构，禁"研报指出/机构认为"等引述前缀
- 禁"买入/卖出/加仓/减仓"等明确操作指向
- 三段正文合计 ≤ 1000 字
- section1 含沪指/深指/创业板/980017；section2 含"截至收盘"；section3 以"建议策略："开头
- 情绪化措辞（炒作/追高/泡沫/警惕等）触发人工复核

黑名单可在 `compliance_check.js` 顶部数组增删。

## 同步清单（改动时两端一起改）

- `.claude/commands/daily-report.md` ↔ `.codex/prompts/daily-report.md`
- `CLAUDE.md`（全局） ↔ `AGENTS.md`（本文件）
- 脚本与 README 说明两端共用，改完确认 README 一致
