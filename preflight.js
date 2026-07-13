/**
 * 环境自检  Pre-flight Check
 *
 * 用法:  node preflight.js
 * 作用:  实习生在新机器上第一次跑之前，先跑这个。逐项体检环境，绿了才开工。
 *        全绿 -> exit 0；任一红项 -> exit 1（并给出修复提示）。
 *
 * 检查项:
 *   1. node 依赖 (adm-zip / mammoth) 是否已安装
 *   2. reports/ 里是否有模板 docx（生成器要拿最近一份当模板）
 *   3. config.json 里的 python 是否能跑
 *   4. iFinD 本地助手能否取到实盘报价（登录态是否有效）
 *   5. iFinD 新闻 MCP 提醒（脚本查不到，靠人工确认）
 */
'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = __dirname;
const results = [];
function ok(name, detail) { results.push({ level: '🟢', name, detail }); }
function warn(name, detail) { results.push({ level: '🟡', name, detail }); }
function bad(name, detail, fix) { results.push({ level: '🔴', name, detail, fix }); }

// 1. node 依赖
for (const dep of ['adm-zip', 'mammoth']) {
  try {
    require.resolve(dep);
    ok(`node 依赖 ${dep}`, '已安装');
  } catch {
    bad(`node 依赖 ${dep}`, '未安装', '在项目目录运行:  npm install');
  }
}

// 2. 模板 docx
try {
  const templates = fs.readdirSync(path.join(ROOT, 'reports'))
    .filter(f => /^\d{4}\.\d+\.\d+市场点评\.docx$/.test(f));
  if (templates.length) ok('报告模板', `reports/ 内有 ${templates.length} 份历史报告可作模板`);
  else bad('报告模板', 'reports/ 内没有任何“YYYY.M.D市场点评.docx”', '向负责人要至少一份历史报告放进 reports/');
} catch {
  bad('报告模板', '找不到 reports/ 目录', '确认项目完整克隆，reports/ 应存在');
}

// 3 & 4. python + iFinD 助手
let pythonPath = 'D:\\anaconda3\\python.exe';
const cfgPath = path.join(ROOT, 'config.json');
if (fs.existsSync(cfgPath)) {
  try {
    const cfg = JSON.parse(fs.readFileSync(cfgPath, 'utf8'));
    if (cfg.pythonPath) pythonPath = cfg.pythonPath;
    ok('config.json', `pythonPath = ${pythonPath}`);
  } catch (e) {
    bad('config.json', '存在但解析失败: ' + e.message, '检查 JSON 格式（逗号/引号）');
  }
} else {
  warn('config.json', `未找到，回退默认 python 路径 ${pythonPath}`,
       '若不是这个路径，复制 config.example.json 为 config.json 并改 pythonPath');
}

// 4a. iFinD 凭证文件（每人填自己的账号）
const credPath = path.join(os.homedir(), '.ifind', 'credentials.json');
if (fs.existsSync(credPath)) {
  try {
    const cred = JSON.parse(fs.readFileSync(credPath, 'utf8'));
    if (cred.account && cred.password) ok('iFinD 凭证', `${credPath}（账号已填）`);
    else bad('iFinD 凭证', 'credentials.json 缺 account/password 字段', '重跑:  node setup_ifind.js');
  } catch (e) {
    bad('iFinD 凭证', 'credentials.json 解析失败: ' + e.message, '重跑:  node setup_ifind.js  重新录入');
  }
} else {
  bad('iFinD 凭证', `未找到 ${credPath}`, '填入你自己的 iFinD 账号:  node setup_ifind.js');
}

// 用今天日期做一次实盘取数，验证登录态
function todayStr() {
  const d = new Date();
  const p = n => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}
const pyCode =
  "import sys, os, json; sys.path.insert(0, os.path.expanduser('~/.ifind')); " +
  "from ifind_helper import quotes_as_dict; " +
  `print(json.dumps(quotes_as_dict(['000001.SH'], '${todayStr()}'), ensure_ascii=False))`;

let pythonOk = false;
try {
  execFileSync(pythonPath, ['--version'], { stdio: 'ignore' });
  pythonOk = true;
  ok('python 可执行', pythonPath);
} catch {
  bad('python 可执行', `无法运行 ${pythonPath}`,
      '安装 Anaconda/Python，并在 config.json 里填对 pythonPath（where python 查路径）');
}

if (pythonOk) {
  try {
    const out = execFileSync(pythonPath, ['-c', pyCode], { encoding: 'utf8', timeout: 60000 });
    // iFinDPy 导入时会向 stdout 打一行 .pth 噪声，取第一个 { 开始的部分再解析
    const jsonStart = out.indexOf('{');
    if (jsonStart === -1) throw new Error('输出无 JSON: ' + out.trim().slice(0, 200));
    const data = JSON.parse(out.slice(jsonStart));
    const q = data['000001.SH'];
    if (q && typeof q.close === 'number') {
      ok('iFinD 取数', `上证指数 close=${q.close}（登录态有效）`);
    } else {
      bad('iFinD 取数', '返回了数据但字段异常: ' + out.trim().slice(0, 200),
          '确认 SuperCommand.exe 已启动、credentials.json 有效、账号未在别处顶掉');
    }
  } catch (e) {
    bad('iFinD 取数', 'python 报错或超时: ' + String(e.message).slice(0, 200),
        '1) 确认 ~/.ifind 目录存在且含 ifind_helper.py  2) 启动 SuperCommand.exe 登录  3) 检查 credentials.json');
  }
}

// 5. MCP 提醒
warn('iFinD 新闻 MCP', '本脚本查不到 MCP 状态',
     '在 Claude Code 里确认 hexin-ifind-ds-news-mcp 已连接（/daily-report 会用到新闻工具）');

// ── 汇总 ──
console.log('════════ 环境自检 ════════\n');
for (const r of results) {
  console.log(`${r.level} ${r.name}: ${r.detail}`);
  if (r.fix) console.log(`     ↳ 修复: ${r.fix}`);
}
console.log('');

const reds = results.filter(r => r.level === '🔴');
const yellows = results.filter(r => r.level === '🟡');
if (reds.length) {
  console.log(`结论: 🔴 有 ${reds.length} 项未通过，请按上面「修复」处理后重跑 node preflight.js。`);
  process.exit(1);
} else if (yellows.length) {
  console.log(`结论: 🟡 硬性项全通过，有 ${yellows.length} 项需人工确认（见上）。确认无误即可开工。`);
  process.exit(0);
} else {
  console.log('结论: 🟢 全部通过，可以开工。');
  process.exit(0);
}
