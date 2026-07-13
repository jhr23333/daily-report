/**
 * 合规自检红绿灯  Compliance Gate
 *
 * 用法:  node compliance_check.js <content.json>
 * 作用:  在生成 docx 之前扫描三段正文，检查是否踩合规红线。
 *        🔴 硬拦  -> 打印问题并 exit 1（流程停止，不出稿）
 *        🟡 提醒  -> 打印问题但 exit 0（放行，但请人工确认）
 *        🟢 通过  -> exit 0
 *
 * 这是 generate_report.js 内置 validate() 的补充：
 *   validate()      管"结构"（字段是否齐、够不够长、关键词在不在、开头对不对）
 *   compliance_check 管"内容合规"（点名友商、引述前缀、操作建议、情绪词、总字数上限）
 *
 * 黑名单可直接在下方数组里增删，改完立即生效。
 */
'use strict';

const fs = require('fs');

// ── 黑名单配置（按需增删）────────────────────────────────────────────────────

// 🔴 券商 / 投行 / 研究机构点名：正文严禁出现
const BROKER_NAMES = [
  '中信证券', '中信建投', '华泰证券', '国泰海通', '国泰君安', '海通证券',
  '中金公司', '中金', '招商证券', '广发证券', '国信证券', '申万宏源',
  '兴业证券', '东方证券', '光大证券', '方正证券', '天风证券', '东吴证券',
  '民生证券', '浙商证券', '西部证券', '华创证券', '开源证券', '安信证券',
  '花旗', '摩根士丹利', '大摩', '摩根大通', '小摩', '高盛', '瑞银', 'UBS',
  '美银', '美林', '巴克莱', '野村', '汇丰', '德意志银行', '瑞信',
];

// 🔴 引述前缀：会暴露观点出处，即便不点名也不允许
const CITATION_PREFIXES = [
  '研报指出', '研报显示', '研报认为', '研报表示',
  '机构指出', '机构认为', '机构表示', '有机构',
  '券商指出', '券商认为', '券商研报',
  '研究观点', '研究机构', '研究所',
  '行业研究观点', '市场研究观点', '海外机构', '外资研究', '外资投行',
  '分析师指出', '分析师认为', '首次覆盖', '给予买入评级', '上调评级', '下调评级',
];

// 🔴 明确操作指向：section3 严禁给出买卖动作
const ACTION_WORDS = [
  '买入', '卖出', '加仓', '减仓', '建仓', '清仓', '抄底', '止盈', '止损',
  '满仓', '空仓', '重仓', '配置比例', '仓位控制在',
];

// 🟡 负面/情绪化措辞：中性研究口吻应避免，命中给人工复核
const SENTIMENT_WORDS = [
  '炒作', '情绪过热', '追高', '非理性', '泡沫', '亢奋', '狂热', '爆炒',
  '脱离基本面', '警惕', '谨防', '风险凸显', '击鼓传花', '接盘', '博傻',
];

// 🟡 弱操作指向：不算硬红线但需人工确认（目标价、增减持等）
const SOFT_ACTION_WORDS = [
  '目标价', '增持', '减持', '强烈推荐', '首推',
];

// section3 中合法出现、不应误判为负面的白名单短语（先移除再扫情绪词）
const SENTIMENT_WHITELIST = ['风险提示', '风险偏好', '风险因素'];

const WORD_CAP = 1000; // section1+2+3 合计字数硬上限

// ── 扫描逻辑 ─────────────────────────────────────────────────────────────────

function findHits(text, list) {
  return list.filter(w => text.includes(w));
}

function main() {
  const inputPath = process.argv[2];
  if (!inputPath) {
    console.error('用法: node compliance_check.js <content.json>');
    process.exit(2);
  }

  let content;
  try {
    content = JSON.parse(fs.readFileSync(inputPath, 'utf8'));
  } catch (e) {
    console.error('🔴 无法读取/解析 JSON:', e.message);
    process.exit(1);
  }

  const s1 = (content.section1 || '').trim();
  const s2 = (content.section2 || '').trim();
  const s3 = (content.section3 || '').trim();
  const all = s1 + s2 + s3;
  const allForSentiment = SENTIMENT_WHITELIST.reduce((t, w) => t.split(w).join(''), all);

  const red = [];    // 硬拦
  const yellow = []; // 提醒

  // ── 🔴 硬红线 ──
  const brokers = findHits(all, BROKER_NAMES);
  if (brokers.length) red.push(`点名券商/研究机构: ${brokers.join('、')}`);

  const citations = findHits(all, CITATION_PREFIXES);
  if (citations.length) red.push(`引述前缀（暴露出处）: ${citations.join('、')}`);

  const actions = findHits(all, ACTION_WORDS);
  if (actions.length) red.push(`明确操作指向词: ${actions.join('、')}`);

  const total = all.length;
  if (total > WORD_CAP) red.push(`三段合计 ${total} 字，超过硬上限 ${WORD_CAP} 字（需压缩 section2）`);

  if (s3 && !s3.startsWith('建议策略：')) red.push('section3 未以「建议策略：」开头');
  if (s2 && !s2.includes('截至收盘')) red.push('section2 缺少「截至收盘」');
  for (const kw of ['沪指', '深指', '创业板', '980017']) {
    if (s1 && !s1.includes(kw)) red.push(`section1 缺少关键词「${kw}」`);
  }

  // ── 🟡 提醒 ──
  const sentiments = findHits(allForSentiment, SENTIMENT_WORDS);
  if (sentiments.length) yellow.push(`负面/情绪化措辞: ${sentiments.join('、')}（建议换中性表述）`);

  const softActions = findHits(all, SOFT_ACTION_WORDS);
  if (softActions.length) yellow.push(`弱操作指向: ${softActions.join('、')}（确认是否符合合规口径）`);

  // ── 报告 ──
  console.log('──────── 合规自检 ────────');
  console.log(`字数: section1=${s1.length}  section2=${s2.length}  section3=${s3.length}  合计=${total}/${WORD_CAP}`);
  console.log('');

  if (yellow.length) {
    console.log('🟡 需人工复核:');
    yellow.forEach(m => console.log('   - ' + m));
    console.log('');
  }

  if (red.length) {
    console.log('🔴 硬红线（已拦截，请修改后重跑）:');
    red.forEach(m => console.log('   - ' + m));
    console.log('');
    console.log('结论: 🔴 未通过，不生成 docx。');
    process.exit(1);
  }

  if (yellow.length) {
    console.log('结论: 🟡 通过（有提醒项，请人工确认后再对外发。）');
  } else {
    console.log('结论: 🟢 全部通过。');
  }
  process.exit(0);
}

main();
