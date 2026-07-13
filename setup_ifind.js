/**
 * iFinD 凭证录入  Setup iFinD Credentials
 *
 * 用法:  node setup_ifind.js
 * 作用:  交互式录入【你自己的】iFinD 账号 / 密码，写入 ~/.ifind/credentials.json。
 *        每个人用自己的 iFinD 账号，不要用别人的 credentials.json。
 *
 * 前提:  ~/.ifind/ 目录必须已存在（含 ifind_helper.py + iFinD SDK 已 InstallPython.bat）。
 *        若不存在，脚本会提示你先向负责人索取该工具目录并安装 SDK。
 *
 * 安全:  credentials.json 是明文账号密码，已在 .gitignore 里排除；
 *        请勿提交到 git、勿外发、勿放共享盘。
 */
'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');
const readline = require('readline');

const IFIND_DIR = path.join(os.homedir(), '.ifind');
const CRED_PATH = path.join(IFIND_DIR, 'credentials.json');

if (!fs.existsSync(IFIND_DIR)) {
  console.error('🔴 未找到 ' + IFIND_DIR);
  console.error('   请先向负责人索取 .ifind 工具目录（含 ifind_helper.py），放到你的用户目录下，');
  console.error('   并运行 iFinD SDK 的 InstallPython.bat 后，再回来跑本脚本。');
  process.exit(1);
}

const rl = readline.createInterface({ input: process.stdin, output: process.stdout, terminal: process.stdin.isTTY });

// 密码掩码：muted 为 true 时把 TTY 回显字符替换成 *（管道输入无回显，不影响）
let muted = false;
rl._writeToOutput = function (str) {
  if (muted && str !== '\r\n' && str !== '\n' && str !== '\r') process.stdout.write('*');
  else process.stdout.write(str);
};

// 用 line 事件队列，兼容真人终端与管道输入
const lineQueue = [];
const waiters = [];
rl.on('line', line => {
  if (waiters.length) waiters.shift()(line);
  else lineQueue.push(line);
});
function nextLine() {
  return new Promise(res => {
    if (lineQueue.length) res(lineQueue.shift());
    else waiters.push(res);
  });
}

async function ask(question) {
  muted = false;
  process.stdout.write(question);
  return (await nextLine()).trim();
}

async function askHidden(question) {
  process.stdout.write(question);
  muted = true;
  const ans = await nextLine();
  muted = false;
  process.stdout.write('\n');
  return ans.trim();
}

(async () => {
  console.log('──── iFinD 凭证录入（填你自己的账号）────\n');

  if (fs.existsSync(CRED_PATH)) {
    const yn = (await ask('credentials.json 已存在，覆盖它吗？(y/N) ')).toLowerCase();
    if (yn !== 'y' && yn !== 'yes') {
      console.log('已取消，未改动任何文件。');
      rl.close();
      return;
    }
  }

  const account = await ask('iFinD 账号: ');
  if (!account) { console.error('🔴 账号不能为空。'); rl.close(); process.exit(1); }

  const password = await askHidden('iFinD 密码: ');
  if (!password) { console.error('🔴 密码不能为空。'); rl.close(); process.exit(1); }

  fs.writeFileSync(CRED_PATH, JSON.stringify({ account, password }, null, 2) + '\n', { encoding: 'utf8' });
  console.log('\n🟢 已写入 ' + CRED_PATH);
  console.log('   下一步: 启动 SuperCommand.exe 登录同一账号，再跑  node preflight.js  验证取数。');
  console.log('   ⚠️ 该文件含明文密码，勿提交 git、勿外发。');
  rl.close();
})();
