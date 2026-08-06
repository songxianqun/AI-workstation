/**
 * HTML → 矢量 SVG 转换器 v2
 * 修复：元素缺失、文本遗漏、排版间距问题
 *
 * 核心改进：
 * 1. 捕获所有可见元素（含父级背景/边框）
 * 2. 正确提取直接文本节点（不依赖叶子节点判断）
 * 3. 精确还原间距、字号、行高
 * 4. 处理 Markdown 嵌套内容
 *
 * 用法: node html-to-vector-svg.js
 */
const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

const HTML_FILE = path.join(__dirname, 'collaboration-input-design.html');
const OUTPUT_DIR = path.join(__dirname, 'vector-svg');
const WIDTH = 1600;
const HEIGHT = 960;

if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR, { recursive: true });

// ========== 注入浏览器的矢量转换函数 v2 ==========
const CONVERTER_FN = `
window.__toVectorSVG = function(rootSelector, svgWidth, svgHeight) {
  const root = document.querySelector(rootSelector);
  if (!root) return '';

  const rootRect = root.getBoundingClientRect();
  const ox = rootRect.left;
  const oy = rootRect.top;

  // 收集所有需要渲染的图层
  const layers = [];

  function walk(el) {
    if (!el || el.nodeType !== 1) return;
    const style = window.getComputedStyle(el);
    if (style.display === 'none' || style.visibility === 'hidden') return;

    const rect = el.getBoundingClientRect();
    if (rect.width < 0.5 || rect.height < 0.5) return;

    const x = rect.left - ox;
    const y = rect.top - oy;
    const w = rect.width;
    const h = rect.height;
    const tag = el.tagName.toLowerCase();

    // ---- 1. 捕获背景矩形 ----
    const bg = style.backgroundColor;
    if (bg && bg !== 'rgba(0, 0, 0, 0)' && w > 0.5 && h > 0.5) {
      const br = parseFloat(style.borderRadius) || 0;
      const clampedBr = Math.min(br, w / 2, h / 2);
      const borderW = parseFloat(style.borderWidth) || 0;
      const borderColor = style.borderColor;
      const hasBorder = borderW > 0 && borderColor && borderColor !== 'rgba(0, 0, 0, 0)';

      let attrs = 'x="' + x.toFixed(2) + '" y="' + y.toFixed(2) + '" width="' + w.toFixed(2) + '" height="' + h.toFixed(2) + '"';
      attrs += ' fill="' + bg + '"';
      if (clampedBr > 0) attrs += ' rx="' + clampedBr.toFixed(2) + '"';
      if (hasBorder) attrs += ' stroke="' + borderColor + '" stroke-width="' + borderW + '"';

      // 渐变背景
      const bgImage = style.backgroundImage;
      if (bgImage && bgImage !== 'none' && bgImage.includes('gradient')) {
        // 用纯色近似
      }

      layers.push({ type: 'rect', attrs, z: layers.length });
    }

    // ---- 2. 无边框只有边框的元素 ----
    if ((!bg || bg === 'rgba(0, 0, 0, 0)') && w > 0.5 && h > 0.5) {
      const borderW = parseFloat(style.borderWidth) || 0;
      const borderColor = style.borderColor;
      if (borderW > 0 && borderColor && borderColor !== 'rgba(0, 0, 0, 0)') {
        const br = Math.min(parseFloat(style.borderRadius) || 0, w / 2, h / 2);
        let attrs = 'x="' + x.toFixed(2) + '" y="' + y.toFixed(2) + '" width="' + w.toFixed(2) + '" height="' + h.toFixed(2) + '"';
        attrs += ' fill="none" stroke="' + borderColor + '" stroke-width="' + borderW + '"';
        if (br > 0) attrs += ' rx="' + br.toFixed(2) + '"';
        layers.push({ type: 'rect', attrs, z: layers.length });
      }
    }

    // ---- 3. 捕获直接文本（仅当前元素的文本，不含子元素文本） ----
    let directText = '';
    for (const child of el.childNodes) {
      if (child.nodeType === 3) { // TEXT_NODE
        directText += child.textContent;
      }
    }
    directText = directText.trim();

    if (directText) {
      const fontSize = parseFloat(style.fontSize) || 14;
      const fontWeight = parseInt(style.fontWeight) || 400;
      const fontFamily = style.fontFamily || 'sans-serif';
      const color = style.color || '#000';
      const lineHeight = parseFloat(style.lineHeight) || fontSize * 1.4;
      const textAlign = style.textAlign || 'left';
      const letterSpacing = parseFloat(style.letterSpacing) || 0;

      // 计算文本起始位置
      let textX = x;
      let anchor = 'start';
      if (textAlign === 'center') { textX = x + w / 2; anchor = 'middle'; }
      else if (textAlign === 'right') { textX = x + w; anchor = 'end'; }

      // 处理多行文本
      const lines = directText.split('\\n');
      for (let li = 0; li < lines.length; li++) {
        const line = lines[li].trim();
        if (!line) continue;
        const textY = y + fontSize + li * lineHeight;
        const escaped = line.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');

        let attrs = 'x="' + textX.toFixed(2) + '" y="' + textY.toFixed(2) + '"';
        attrs += ' fill="' + color + '"';
        attrs += ' font-size="' + fontSize + '"';
        attrs += ' font-weight="' + fontWeight + '"';
        attrs += ' font-family="' + fontFamily.replace(/"/g, "\\\\'") + '"';
        attrs += ' text-anchor="' + anchor + '"';
        if (letterSpacing !== 0) attrs += ' letter-spacing="' + letterSpacing + '"';

        layers.push({ type: 'text', attrs, content: escaped, z: layers.length });
      }
    }

    // ---- 4. 处理 textarea/input 的 placeholder ----
    if ((tag === 'textarea' || tag === 'input') && !el.value) {
      const placeholder = el.getAttribute('placeholder') || '';
      if (placeholder) {
        const fontSize = parseFloat(style.fontSize) || 14;
        const fontFamily = style.fontFamily || 'sans-serif';
        const textY = y + fontSize + (parseFloat(style.paddingTop) || 0);
        const textX = x + (parseFloat(style.paddingLeft) || 0);
        const escaped = placeholder.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
        let attrs = 'x="' + textX.toFixed(2) + '" y="' + textY.toFixed(2) + '"';
        attrs += ' fill="#9aa2b5" font-size="' + fontSize + '"';
        attrs += ' font-family="' + fontFamily.replace(/"/g, "\\\\'") + '"';
        attrs += ' opacity="0.6"';
        layers.push({ type: 'text', attrs, content: escaped, z: layers.length });
      }
    }

    // ---- 5. 处理 SVG 图标（直接复制） ----
    if (tag === 'svg') {
      const svgContent = el.innerHTML;
      const svgW = parseFloat(el.getAttribute('width')) || w;
      const svgH = parseFloat(el.getAttribute('height')) || h;
      layers.push({
        type: 'svg-group',
        content: '<g transform="translate(' + x.toFixed(2) + ',' + y.toFixed(2) + ')">' + svgContent + '</g>',
        z: layers.length
      });
    }

    // ---- 6. 处理分割线 ----
    const borderTopW = parseFloat(style.borderTopWidth) || 0;
    if (borderTopW > 0 && w > 10 && h < 5) {
      layers.push({
        type: 'line',
        attrs: 'x1="' + x.toFixed(2) + '" y1="' + y.toFixed(2) + '" x2="' + (x+w).toFixed(2) + '" y2="' + y.toFixed(2) + '" stroke="' + style.borderTopColor + '" stroke-width="' + borderTopW + '"',
        z: layers.length
      });
    }

    // ---- 7. 圆形元素（头像等） ----
    const br = parseFloat(style.borderRadius) || 0;
    if (br >= Math.min(w, h) / 2 - 1 && w > 5 && h > 5 && Math.abs(w - h) < 3) {
      // 已作为圆角矩形捕获
    }

    // 递归子元素
    for (const child of el.children) {
      walk(child);
    }
  }

  // 根容器背景
  const rootStyle = window.getComputedStyle(root);
  const rootBg = rootStyle.backgroundColor;
  let svgBody = '';
  if (rootBg && rootBg !== 'rgba(0, 0, 0, 0)') {
    svgBody += '<rect x="0" y="0" width="' + svgWidth + '" height="' + svgHeight + '" fill="' + rootBg + '"/>\\n';
  }

  walk(root);

  // 输出所有图层
  for (const layer of layers) {
    if (layer.type === 'rect') {
      svgBody += '<rect ' + layer.attrs + '/>\\n';
    } else if (layer.type === 'text') {
      svgBody += '<text ' + layer.attrs + '>' + layer.content + '</text>\\n';
    } else if (layer.type === 'line') {
      svgBody += '<line ' + layer.attrs + '/>\\n';
    } else if (layer.type === 'svg-group') {
      svgBody += layer.content + '\\n';
    }
  }

  return '<?xml version="1.0" encoding="UTF-8"?>\\n' +
    '<svg xmlns="http://www.w3.org/2000/svg" width="' + svgWidth + '" height="' + svgHeight + '" viewBox="0 0 ' + svgWidth + ' ' + svgHeight + '">\\n' +
    svgBody +
    '</svg>';
};
`;

// ========== 主流程 ==========
(async () => {
  console.log('🚀 启动浏览器...');
  const browser = await puppeteer.launch({
    headless: 'new',
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: WIDTH, height: HEIGHT, deviceScaleFactor: 1 });

  const fileUrl = 'file:///' + HTML_FILE.replace(/\\/g, '/');
  console.log('📄 加载 HTML:', fileUrl);
  await page.goto(fileUrl, { waitUntil: 'networkidle0', timeout: 30000 });
  await new Promise(r => setTimeout(r, 2000));

  // 注入转换器
  await page.evaluate(CONVERTER_FN);

  // 隐藏弹窗
  await page.evaluate(() => {
    document.getElementById('notifView')?.classList.remove('active');
    document.getElementById('membersOverlay')?.classList.remove('show');
    document.getElementById('contactsOverlay')?.classList.remove('show');
  });

  async function generateSVG(label, selector, filename, setupFn) {
    if (setupFn) await page.evaluate(setupFn);
    await new Promise(r => setTimeout(r, 500));

    const svgContent = await page.evaluate((sel) => {
      const el = document.querySelector(sel);
      if (!el) return null;
      const rect = el.getBoundingClientRect();
      return window.__toVectorSVG(sel, Math.ceil(rect.width), Math.ceil(rect.height));
    }, selector);

    if (svgContent) {
      const outPath = path.join(OUTPUT_DIR, filename);
      fs.writeFileSync(outPath, svgContent, 'utf-8');
      const size = (fs.statSync(outPath).size / 1024).toFixed(0);
      // 统计元素数量
      const rectCount = (svgContent.match(/<rect /g) || []).length;
      const textCount = (svgContent.match(/<text /g) || []).length;
      console.log('  ✅ ' + label + ' → ' + filename + ' (' + size + ' KB, ' + rectCount + ' rects, ' + textCount + ' texts)');
    } else {
      console.log('  ⚠ ' + label + ' - 元素未找到');
    }
  }

  // ============================================================
  // 功能1: 发起协作邀请
  // ============================================================
  console.log('\n📋 功能1: 发起协作邀请');

  await generateSVG('主界面-邀请按钮', 'body', '01-01-main-with-invite-btn.svg', () => {
    document.getElementById('notifView')?.classList.remove('active');
    document.getElementById('membersOverlay')?.classList.remove('show');
  });

  await generateSVG('会话成员弹窗-默认', 'body', '01-02-members-modal-default.svg', () => {
    document.getElementById('membersOverlay')?.classList.add('show');
    document.getElementById('contactsOverlay')?.classList.remove('show');
    document.getElementById('mBriefSection').style.display = 'none';
  });

  await generateSVG('会话成员弹窗-AI附言', 'body', '01-03-members-modal-ai-brief.svg', () => {
    document.getElementById('mBriefSection').style.display = 'block';
  });

  await generateSVG('选择联系人弹窗', 'body', '01-04-contacts-modal.svg', () => {
    document.getElementById('membersOverlay')?.classList.remove('show');
    document.getElementById('contactsOverlay')?.classList.add('show');
    const contacts = document.querySelectorAll('.c-contact');
    contacts.forEach(c => c.classList.remove('checked'));
    if (contacts.length > 0) contacts[0].classList.add('checked');
  });

  // ============================================================
  // 功能2: 协作邀请消息推送
  // ============================================================
  console.log('\n📋 功能2: 协作邀请消息推送');

  await generateSVG('消息通知面板-全部', '#notifView', '02-01-notif-panel-all.svg', () => {
    document.getElementById('contactsOverlay')?.classList.remove('show');
    document.getElementById('notifView')?.classList.add('active');
    document.querySelectorAll('.notif-tab').forEach(t => t.classList.remove('active'));
    document.querySelector('.notif-tab[data-tab="all"]')?.classList.add('active');
  });

  await generateSVG('消息通知面板-协作邀请', '#notifView', '02-02-notif-panel-invite.svg', () => {
    document.querySelectorAll('.notif-tab').forEach(t => t.classList.remove('active'));
    document.querySelector('.notif-tab[data-tab="invite"]')?.classList.add('active');
  });

  await generateSVG('主界面-铃铛红点', 'body', '02-03-main-with-bell-badge.svg', () => {
    document.getElementById('notifView')?.classList.remove('active');
  });

  // ============================================================
  // 功能3: 多人协作模式AI开关与@提及
  // ============================================================
  console.log('\n📋 功能3: 多人协作模式AI开关与@提及');

  await generateSVG('输入框-AI关闭', '.main', '03-01-composer-ai-off.svg', () => {
    const toggle = document.getElementById('toggle');
    if (toggle) toggle.classList.remove('on');
    document.getElementById('composer')?.classList.remove('ai-on');
    document.getElementById('atPanel')?.classList.remove('show');
    document.getElementById('toast')?.classList.remove('show');
    const inp = document.getElementById('input');
    if (inp) inp.placeholder = '与成员讨论，开启AI参与按钮，或输入 @智能体 让AI参与';
  });

  await generateSVG('输入框-AI开启', '.main', '03-02-composer-ai-on.svg', () => {
    const toggle = document.getElementById('toggle');
    if (toggle) toggle.classList.add('on');
    document.getElementById('composer')?.classList.add('ai-on');
    document.getElementById('atPanel')?.classList.remove('show');
    document.getElementById('toast')?.classList.remove('show');
    const inp = document.getElementById('input');
    if (inp) inp.placeholder = '向AI提问，每条消息均由AI处理';
  });

  await generateSVG('@提及面板展开', '.main', '03-03-at-mention-panel.svg', () => {
    document.getElementById('atPanel')?.classList.add('show');
  });

  await generateSVG('Toast-AI已开启', '.main', '03-04-toast-ai-on.svg', () => {
    document.getElementById('atPanel')?.classList.remove('show');
    const toast = document.getElementById('toast');
    toast.textContent = 'AI已开启：后续发送内容将由AI处理';
    toast.classList.add('show');
  });

  // ============================================================
  // 功能4: 会话摘要
  // ============================================================
  console.log('\n📋 功能4: 会话摘要');

  await generateSVG('右侧面板-摘要展开', '.right', '04-01-right-panel-summary.svg', () => {
    document.getElementById('toast')?.classList.remove('show');
    const section = document.getElementById('summarySection');
    if (section) section.classList.remove('collapsed');
    document.getElementById('summaryStatus')?.classList.remove('show');
  });

  await generateSVG('右侧面板-摘要有更新', '.right', '04-02-right-panel-summary-updated.svg', () => {
    document.getElementById('summaryStatus')?.classList.add('show');
  });

  await generateSVG('右侧面板-摘要收起', '.right', '04-03-right-panel-summary-collapsed.svg', () => {
    const section = document.getElementById('summarySection');
    if (section) section.classList.add('collapsed');
  });

  await generateSVG('完整主界面-含摘要', 'body', '04-04-full-main-with-summary.svg', () => {
    const section = document.getElementById('summarySection');
    if (section) section.classList.remove('collapsed');
    document.getElementById('summaryStatus')?.classList.remove('show');
  });

  await browser.close();
  console.log('\n🎉 全部矢量 SVG 生成完成！');
  console.log('📂 输出目录: ' + OUTPUT_DIR);
  console.log('\n文件清单:');
  fs.readdirSync(OUTPUT_DIR).filter(f => f.endsWith('.svg')).sort().forEach(f => {
    const stat = fs.statSync(path.join(OUTPUT_DIR, f));
    console.log('  ' + f + ' (' + (stat.size / 1024).toFixed(0) + ' KB)');
  });
})().catch(err => {
  console.error('❌ 转换失败:', err.message);
  process.exit(1);
});
