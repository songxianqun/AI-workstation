/**
 * 四大功能 SVG 生成脚本
 * 功能1: 发起协作邀请
 * 功能2: 协作邀请消息推送
 * 功能3: 多人协作模式AI开关与@提及
 * 功能4: 会话摘要
 *
 * 用法: node generate-feature-svgs.js
 */
const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

const HTML_FILE = path.join(__dirname, 'collaboration-input-design.html');
const OUTPUT_DIR = path.join(__dirname, 'svg-output');
const WIDTH = 1600;
const HEIGHT = 960;
const SCALE = 2;

// 确保输出目录存在
if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR, { recursive: true });

async function screenshotToSvg(page, selector, outputPath, label) {
  const el = await page.$(selector);
  if (!el) { console.log(`  ⚠ 未找到元素: ${selector}`); return; }
  const buffer = await el.screenshot({ type: 'png', omitBackground: false });
  const base64 = buffer.toString('base64');
  const dataUri = `data:image/png;base64,${base64}`;
  const box = await el.boundingBox();
  const w = Math.ceil(box.width);
  const h = Math.ceil(box.height);

  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink"
     width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
  <title>${label}</title>
  <image x="0" y="0" width="${w}" height="${h}" href="${dataUri}"/>
</svg>`;

  fs.writeFileSync(outputPath, svg, 'utf-8');
  console.log(`  ✅ ${label} → ${path.basename(outputPath)} (${w}x${h})`);
}

async function fullAppScreenshot(page, outputPath, label) {
  await screenshotToSvg(page, '.app', outputPath, label);
}

(async () => {
  console.log('🚀 启动浏览器...');
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: WIDTH, height: HEIGHT, deviceScaleFactor: SCALE });

  const fileUrl = 'file:///' + HTML_FILE.replace(/\\/g, '/');
  console.log('📄 加载 HTML:', fileUrl);
  await page.goto(fileUrl, { waitUntil: 'networkidle0', timeout: 30000 });
  await new Promise(r => setTimeout(r, 1500));

  // 先隐藏通知面板和弹窗
  await page.evaluate(() => {
    document.getElementById('notifView')?.classList.remove('active');
    document.getElementById('membersOverlay')?.classList.remove('show');
    document.getElementById('contactsOverlay')?.classList.remove('show');
  });

  // ============================================================
  // 功能1: 发起协作邀请
  // ============================================================
  console.log('\n📋 功能1: 发起协作邀请');

  // 1-1: 主界面 - 标题栏"邀请"按钮高亮
  console.log('  --- 1-1: 主界面(邀请按钮) ---');
  await page.evaluate(() => {
    document.getElementById('notifView')?.classList.remove('active');
    document.getElementById('membersOverlay')?.classList.remove('show');
    document.getElementById('contactsOverlay')?.classList.remove('show');
  });
  await fullAppScreenshot(page, path.join(OUTPUT_DIR, '01-01-main-with-invite-btn.svg'), '主界面-邀请按钮');

  // 1-2: 会话成员弹窗 - 默认状态
  console.log('  --- 1-2: 会话成员弹窗(默认) ---');
  await page.evaluate(() => {
    document.getElementById('membersOverlay')?.classList.add('show');
    document.getElementById('mBriefSection').style.display = 'none';
  });
  await new Promise(r => setTimeout(r, 500));
  await fullAppScreenshot(page, path.join(OUTPUT_DIR, '01-02-members-modal-default.svg'), '会话成员弹窗-默认');

  // 1-3: 会话成员弹窗 - AI生成邀请附言
  console.log('  --- 1-3: 会话成员弹窗(AI附言) ---');
  await page.evaluate(() => {
    document.getElementById('mBriefSection').style.display = 'block';
    document.getElementById('mBriefText').textContent = '推进630版本工作台改造；当前需要共同确认Rclaw接入方案和演示范围。';
  });
  await new Promise(r => setTimeout(r, 300));
  await fullAppScreenshot(page, path.join(OUTPUT_DIR, '01-03-members-modal-ai-brief.svg'), '会话成员弹窗-AI邀请附言');

  // 1-4: 选择联系人弹窗
  console.log('  --- 1-4: 选择联系人弹窗 ---');
  await page.evaluate(() => {
    document.getElementById('membersOverlay')?.classList.remove('show');
    document.getElementById('contactsOverlay')?.classList.add('show');
    // 模拟一些选中状态
    const contacts = document.querySelectorAll('.c-contact');
    contacts.forEach(c => c.classList.remove('checked'));
    if (contacts.length > 0) contacts[0].classList.add('checked');
    if (contacts.length > 2) contacts[2].classList.add('checked');
  });
  await new Promise(r => setTimeout(r, 500));
  await fullAppScreenshot(page, path.join(OUTPUT_DIR, '01-04-contacts-modal.svg'), '选择联系人弹窗');

  // ============================================================
  // 功能2: 协作邀请消息推送
  // ============================================================
  console.log('\n📋 功能2: 协作邀请消息推送');

  // 2-1: 消息通知面板 - 全部消息
  console.log('  --- 2-1: 消息通知面板(全部) ---');
  await page.evaluate(() => {
    document.getElementById('contactsOverlay')?.classList.remove('show');
    document.getElementById('notifView')?.classList.add('active');
    // 确保在"全部消息" tab
    document.querySelectorAll('.notif-tab').forEach(t => t.classList.remove('active'));
    document.querySelector('.notif-tab[data-tab="all"]')?.classList.add('active');
  });
  await new Promise(r => setTimeout(r, 500));
  // 截取通知面板（跨中栏+右栏）
  await screenshotToSvg(page, '#notifView', path.join(OUTPUT_DIR, '02-01-notif-panel-all.svg'), '消息通知面板-全部');

  // 2-2: 消息通知面板 - 协作邀请 tab
  console.log('  --- 2-2: 消息通知面板(协作邀请) ---');
  await page.evaluate(() => {
    document.querySelectorAll('.notif-tab').forEach(t => t.classList.remove('active'));
    document.querySelector('.notif-tab[data-tab="invite"]')?.classList.add('active');
  });
  await new Promise(r => setTimeout(r, 300));
  await screenshotToSvg(page, '#notifView', path.join(OUTPUT_DIR, '02-02-notif-panel-invite.svg'), '消息通知面板-协作邀请');

  // 2-3: 左侧铃铛带红点 + 主界面
  console.log('  --- 2-3: 铃铛红点主界面 ---');
  await page.evaluate(() => {
    document.getElementById('notifView')?.classList.remove('active');
  });
  await new Promise(r => setTimeout(r, 300));
  await fullAppScreenshot(page, path.join(OUTPUT_DIR, '02-03-main-with-bell-badge.svg'), '主界面-铃铛红点');

  // ============================================================
  // 功能3: 多人协作模式AI开关与@提及
  // ============================================================
  console.log('\n📋 功能3: 多人协作模式AI开关与@提及');

  // 3-1: 输入框 - AI关闭（默认）
  console.log('  --- 3-1: 输入框区域(AI关闭) ---');
  await page.evaluate(() => {
    // 确保多人协作模式
    const activeChat = document.querySelector('.chat.active');
    if (activeChat && activeChat.dataset.mode !== 'multi') {
      const multiChat = document.querySelector('.chat[data-mode="multi"]');
      if (multiChat) multiChat.click();
    }
    // AI关闭
    const toggle = document.getElementById('toggle');
    if (toggle) toggle.classList.remove('on');
    document.getElementById('composer')?.classList.remove('ai-on');
    document.getElementById('input').placeholder = '与成员讨论，开启AI参与按钮，或输入 @智能体 让AI参与';
    document.getElementById('atPanel')?.classList.remove('show');
  });
  await new Promise(r => setTimeout(r, 300));
  // 截取中间主区域下半部分（header + composer）
  await screenshotToSvg(page, '.main', path.join(OUTPUT_DIR, '03-01-composer-ai-off.svg'), '输入框区域-AI关闭');

  // 3-2: 输入框 - AI开启
  console.log('  --- 3-2: 输入框区域(AI开启) ---');
  await page.evaluate(() => {
    const toggle = document.getElementById('toggle');
    if (toggle) toggle.classList.add('on');
    document.getElementById('composer')?.classList.add('ai-on');
    document.getElementById('input').placeholder = '向AI提问，每条消息均由AI处理';
    document.getElementById('atPanel')?.classList.remove('show');
  });
  await new Promise(r => setTimeout(r, 300));
  await screenshotToSvg(page, '.main', path.join(OUTPUT_DIR, '03-02-composer-ai-on.svg'), '输入框区域-AI开启');

  // 3-3: @提及面板展开
  console.log('  --- 3-3: @提及面板展开 ---');
  await page.evaluate(() => {
    document.getElementById('atPanel')?.classList.add('show');
  });
  await new Promise(r => setTimeout(r, 300));
  await screenshotToSvg(page, '.main', path.join(OUTPUT_DIR, '03-03-at-mention-panel.svg'), '@提及面板展开');

  // 3-4: Toast - AI已开启提示
  console.log('  --- 3-4: Toast提示 ---');
  await page.evaluate(() => {
    const toast = document.getElementById('toast');
    toast.textContent = 'AI已开启：后续发送内容将由AI处理';
    toast.classList.add('show');
  });
  await new Promise(r => setTimeout(r, 300));
  await screenshotToSvg(page, '.main', path.join(OUTPUT_DIR, '03-04-toast-ai-on.svg'), 'Toast-AI已开启');

  // ============================================================
  // 功能4: 会话摘要
  // ============================================================
  console.log('\n📋 功能4: 会话摘要');

  // 4-1: 右侧面板 - 会话摘要展开（有内容）
  console.log('  --- 4-1: 右侧面板-会话摘要展开 ---');
  await page.evaluate(() => {
    document.getElementById('toast')?.classList.remove('show');
    document.getElementById('atPanel')?.classList.remove('show');
    // 确保摘要展开
    const section = document.getElementById('summarySection');
    if (section) section.classList.remove('collapsed');
    // 确保有内容
    const body = document.getElementById('summaryBody');
    if (body) body.style.display = 'block';
    document.getElementById('summaryUpdated').textContent = '更新于今天 10:20';
    document.getElementById('summaryStatus')?.classList.remove('show');
  });
  await new Promise(r => setTimeout(r, 300));
  await screenshotToSvg(page, '.right', path.join(OUTPUT_DIR, '04-01-right-panel-summary.svg'), '右侧面板-会话摘要');

  // 4-2: 会话摘要 - "有更新"状态
  console.log('  --- 4-2: 会话摘要-有更新状态 ---');
  await page.evaluate(() => {
    document.getElementById('summaryStatus')?.classList.add('show');
  });
  await new Promise(r => setTimeout(r, 300));
  await screenshotToSvg(page, '.right', path.join(OUTPUT_DIR, '04-02-right-panel-summary-updated.svg'), '右侧面板-会话摘要有更新');

  // 4-3: 会话摘要 - 收起状态
  console.log('  --- 4-3: 会话摘要-收起状态 ---');
  await page.evaluate(() => {
    const section = document.getElementById('summarySection');
    if (section) section.classList.add('collapsed');
  });
  await new Promise(r => setTimeout(r, 300));
  await screenshotToSvg(page, '.right', path.join(OUTPUT_DIR, '04-03-right-panel-summary-collapsed.svg'), '右侧面板-会话摘要收起');

  // 4-4: 完整主界面（含右侧摘要）
  console.log('  --- 4-4: 完整主界面 ---');
  await page.evaluate(() => {
    const section = document.getElementById('summarySection');
    if (section) section.classList.remove('collapsed');
    document.getElementById('summaryStatus')?.classList.remove('show');
  });
  await new Promise(r => setTimeout(r, 300));
  await fullAppScreenshot(page, path.join(OUTPUT_DIR, '04-04-full-main-with-summary.svg'), '完整主界面-含摘要');

  await browser.close();
  console.log('\n🎉 全部 SVG 生成完成！');
  console.log(`📂 输出目录: ${OUTPUT_DIR}`);
  console.log('\n生成的文件列表:');
  fs.readdirSync(OUTPUT_DIR).filter(f => f.endsWith('.svg')).sort().forEach(f => {
    const stat = fs.statSync(path.join(OUTPUT_DIR, f));
    console.log(`  ${f} (${(stat.size / 1024).toFixed(0)} KB)`);
  });
})().catch(err => {
  console.error('❌ 转换失败:', err.message);
  process.exit(1);
});
