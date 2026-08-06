/**
 * HTML → 纯矢量 SVG 转换脚本（Figma 可编辑版）
 * 所有文字、矩形、圆形均为独立可编辑元素
 *
 * 用法: node html-to-svg-vector.js
 */
const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

const HTML_FILE = path.join(__dirname, 'collaboration-input-design.html');
const OUTPUT_SVG = path.join(__dirname, 'collaboration-input-design-vector.svg');

const WIDTH = 1600;
const HEIGHT = 960;

function escXml(s) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

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
  await new Promise(r => setTimeout(r, 1500));

  // 隐藏弹窗
  await page.evaluate(() => {
    document.querySelectorAll('.modal-overlay, #notifView, .toast, .at-panel').forEach(m => {
      m.style.display = 'none';
    });
  });

  console.log('🔍 提取 DOM 元素...');

  // 提取所有可见元素的信息（所有辅助函数都在 evaluate 内部定义）
  const elements = await page.evaluate(() => {
    // ===== 浏览器上下文内的辅助函数 =====
    function parseColor(colorStr) {
      if (!colorStr || colorStr === 'transparent' || colorStr === 'rgba(0, 0, 0, 0)') return null;
      const match = colorStr.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
      if (match) {
        const r = Math.round(+match[1]), g = Math.round(+match[2]), b = Math.round(+match[3]);
        return '#' + [r, g, b].map(x => x.toString(16).padStart(2, '0')).join('');
      }
      if (colorStr.startsWith('#')) return colorStr;
      return null;
    }

    function isDecorative(el) {
      const tag = el.tagName?.toLowerCase();
      if (['script', 'style', 'link', 'meta', 'head'].includes(tag)) return true;
      if (el.classList?.contains('hide')) return true;
      if (el.style?.display === 'none') return true;
      if (el.style?.visibility === 'hidden') return true;
      return false;
    }

    // ===== 主逻辑 =====
    const results = [];
    const appEl = document.querySelector('.app');
    if (!appEl) return results;

    const appRect = appEl.getBoundingClientRect();

    function processElement(el, depth) {
      if (isDecorative(el)) return;
      if (depth > 15) return;

      const rect = el.getBoundingClientRect();
      if (rect.width < 2 || rect.height < 2) return;
      if (rect.right < appRect.left || rect.left > appRect.right) return;
      if (rect.bottom < appRect.top || rect.top > appRect.bottom) return;

      const cs = window.getComputedStyle(el);
      if (cs.opacity === '0' || cs.display === 'none') return;

      const x = Math.round(rect.left - appRect.left);
      const y = Math.round(rect.top - appRect.top);
      const rw = Math.round(rect.width);
      const rh = Math.round(rect.height);

      const bgColor = cs.backgroundColor;
      const borderColor = cs.borderTopColor;
      const borderWidth = parseFloat(cs.borderTopWidth);
      const borderRadius = parseFloat(cs.borderTopLeftRadius);
      const color = cs.color;
      const fontSize = parseFloat(cs.fontSize);
      const fontWeight = cs.fontWeight;
      const textAlign = cs.textAlign;
      const tag = el.tagName.toLowerCase();
      const className = el.className && typeof el.className === 'string'
        ? el.className.split(' ').filter(c => c && c !== 'hide').join(' ')
        : '';
      const id = el.id || '';

      // 获取直接文本内容（仅当前层级）
      const hasDirectText = [...el.childNodes].some(n => n.nodeType === 3 && n.textContent.trim());
      const directText = hasDirectText ? el.textContent.trim() : '';

      const bgParsed = parseColor(bgColor);
      const borderParsed = borderWidth > 0 ? parseColor(borderColor) : null;

      // 记录有视觉意义的元素
      if (bgParsed || borderParsed || directText || tag === 'textarea') {
        results.push({
          x, y, w: rw, h: rh,
          bg: bgParsed,
          border: borderParsed,
          borderWidth: borderWidth > 0 ? borderWidth : 0,
          radius: borderRadius,
          textColor: parseColor(color),
          fontSize,
          fontWeight: parseInt(fontWeight) || 400,
          textAlign,
          text: directText,
          tag,
          className,
          id,
          depth,
          isTextarea: tag === 'textarea',
          placeholder: el.getAttribute('placeholder') || ''
        });
      }

      for (const child of el.children) {
        processElement(child, depth + 1);
      }
    }

    processElement(appEl, 0);
    return results;
  });

  console.log(`   提取到 ${elements.length} 个元素`);

  // ===== 生成纯矢量 SVG =====
  console.log('🎨 生成纯矢量 SVG...');

  const svgParts = [];
  svgParts.push(`<?xml version="1.0" encoding="UTF-8"?>`);
  svgParts.push(`<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${HEIGHT}" viewBox="0 0 ${WIDTH} ${HEIGHT}">`);
  svgParts.push(`<defs>`);
  svgParts.push(`  <style>`);
  svgParts.push(`    text { font-family: "Microsoft YaHei", "PingFang SC", "Noto Sans SC", "Helvetica Neue", Arial, sans-serif; }`);
  svgParts.push(`  </style>`);
  svgParts.push(`  <clipPath id="app-clip"><rect width="${WIDTH}" height="${HEIGHT}" rx="16"/></clipPath>`);
  svgParts.push(`</defs>`);
  svgParts.push(`<g id="app" clip-path="url(#app-clip)">`);
  svgParts.push(`  <rect width="${WIDTH}" height="${HEIGHT}" rx="16" fill="#ffffff"/>`);

  // 按区域分组
  const leftPanel = elements.filter(e => e.x < 290);
  const mainArea = elements.filter(e => e.x >= 290 && e.x < 1270);
  const rightPanel = elements.filter(e => e.x >= 1270);

  function renderElements(els, indent) {
    const lines = [];
    const pad = ' '.repeat(indent);
    for (const el of els) {
      if (el.w < 3 || el.h < 3) continue;
      const gId = el.id || el.className.replace(/\s+/g, '-').substring(0, 50) || '';
      const gIdAttr = gId ? ` id="${escXml(gId)}"` : '';

      lines.push(`${pad}<g${gIdAttr}>`);

      // 背景
      if (el.bg) {
        lines.push(`${pad}  <rect x="${el.x}" y="${el.y}" width="${el.w}" height="${el.h}" rx="${el.radius}" fill="${el.bg}"/>`);
      }

      // 边框
      if (el.border && el.borderWidth > 0) {
        lines.push(`${pad}  <rect x="${el.x}" y="${el.y}" width="${el.w}" height="${el.h}" rx="${el.radius}" fill="none" stroke="${el.border}" stroke-width="${el.borderWidth}"/>`);
      }

      // 文字
      if (el.text) {
        const anchor = el.textAlign === 'center' ? 'middle' : el.textAlign === 'right' ? 'end' : 'start';
        const tx = el.textAlign === 'center' ? el.x + el.w / 2 : el.textAlign === 'right' ? el.x + el.w : el.x;
        const ty = el.y + el.h / 2 + el.fontSize * 0.35;
        lines.push(`${pad}  <text x="${tx}" y="${ty}" font-size="${el.fontSize}" font-weight="${el.fontWeight}" fill="${el.textColor || '#1f2940'}" text-anchor="${anchor}">${escXml(el.text)}</text>`);
      }

      // textarea 占位符
      if (el.isTextarea && el.placeholder) {
        const ty = el.y + el.h / 2 + el.fontSize * 0.35;
        lines.push(`${pad}  <text x="${el.x + 4}" y="${ty}" font-size="${el.fontSize}" fill="#9aa2b5">${escXml(el.placeholder)}</text>`);
      }

      lines.push(`${pad}</g>`);
    }
    return lines.join('\n');
  }

  // 左侧面板
  svgParts.push(`  <!-- ===== 左侧面板 ===== -->`);
  svgParts.push(`  <g id="left-panel">`);
  svgParts.push(`    <rect x="0" y="0" width="290" height="${HEIGHT}" fill="#fbfcff"/>`);
  svgParts.push(`    <line x1="290" y1="0" x2="290" y2="${HEIGHT}" stroke="#e7eaf1" stroke-width="1"/>`);
  svgParts.push(renderElements(leftPanel, 4));
  svgParts.push(`  </g>`);

  // 中间主区域
  svgParts.push(`  <!-- ===== 中间主区域 ===== -->`);
  svgParts.push(`  <g id="main-area">`);
  svgParts.push(renderElements(mainArea, 4));
  svgParts.push(`  </g>`);

  // 右侧面板
  svgParts.push(`  <!-- ===== 右侧面板 ===== -->`);
  svgParts.push(`  <g id="right-panel">`);
  svgParts.push(`    <rect x="1270" y="0" width="330" height="${HEIGHT}" fill="#ffffff"/>`);
  svgParts.push(`    <line x1="1270" y1="0" x2="1270" y2="${HEIGHT}" stroke="#e7eaf1" stroke-width="1"/>`);
  svgParts.push(renderElements(rightPanel, 4));
  svgParts.push(`  </g>`);

  svgParts.push(`</g>`);
  svgParts.push(`</svg>`);

  const svgContent = svgParts.join('\n');
  fs.writeFileSync(OUTPUT_SVG, svgContent, 'utf-8');

  const fileSizeKB = Math.round(fs.statSync(OUTPUT_SVG).size / 1024);
  console.log(`✅ 纯矢量 SVG 已生成: ${OUTPUT_SVG}`);
  console.log(`   文件大小: ${fileSizeKB} KB`);
  console.log(`   矢量元素数量: ${elements.length}`);
  console.log('');
  console.log('📋 Figma 导入说明:');
  console.log('   1. 直接拖拽 SVG 文件到 Figma 画布');
  console.log('   2. 所有文字和矩形都是独立可编辑图层');
  console.log('   3. 双击文字即可编辑内容');
  console.log('   4. 选中矩形可修改颜色、圆角、边框');
  console.log('');
  console.log('💡 更高保真度: 使用 Figma 插件 html.to.design');
  console.log('   https://www.figma.com/community/plugin/115911514950993800');

  await browser.close();
  console.log('🎉 完成!');
})().catch(err => {
  console.error('❌ 转换失败:', err.message);
  console.error(err.stack);
  process.exit(1);
});
