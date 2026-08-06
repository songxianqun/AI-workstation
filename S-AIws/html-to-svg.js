/**
 * HTML → SVG 转换脚本
 * 将 collaboration-input-design.html 转为 Figma 可导入的 SVG 文件
 *
 * 用法: node html-to-svg.js
 */
const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

const HTML_FILE = path.join(__dirname, 'collaboration-input-design.html');
const OUTPUT_SVG = path.join(__dirname, 'collaboration-input-design.svg');
const OUTPUT_PNG = path.join(__dirname, 'collaboration-input-design.png');

// 设计稿尺寸
const WIDTH = 1600;
const HEIGHT = 960;
const SCALE = 2; // 2x 高清渲染

(async () => {
  console.log('🚀 启动浏览器...');
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.setViewport({
    width: WIDTH,
    height: HEIGHT,
    deviceScaleFactor: SCALE
  });

  // 加载 HTML 文件
  const fileUrl = 'file:///' + HTML_FILE.replace(/\\/g, '/');
  console.log('📄 加载 HTML:', fileUrl);
  await page.goto(fileUrl, { waitUntil: 'networkidle0', timeout: 30000 });

  // 等待渲染完成
  await new Promise(r => setTimeout(r, 1000));

  // 隐藏弹窗和通知面板（只保留主界面）
  await page.evaluate(() => {
    const modals = document.querySelectorAll('.modal-overlay, #notifView, .toast');
    modals.forEach(m => m.style.display = 'none');
  });

  // 截取主 .app 容器的截图
  const appEl = await page.$('.app');
  const screenshotBuffer = await appEl.screenshot({
    type: 'png',
    omitBackground: false
  });

  // 同时保存一份独立 PNG
  fs.writeFileSync(OUTPUT_PNG, screenshotBuffer);
  console.log('📸 PNG 截图已保存:', OUTPUT_PNG);

  // 将 PNG 编码为 base64
  const base64 = screenshotBuffer.toString('base64');
  const dataUri = `data:image/png;base64,${base64}`;

  // ===== 方案 A: 带截图的 SVG（Figma 可直接导入查看） =====
  const svgWidth = WIDTH;
  const svgHeight = HEIGHT;

  const svgContent = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg"
     xmlns:xlink="http://www.w3.org/1999/xlink"
     width="${svgWidth}" height="${svgHeight}"
     viewBox="0 0 ${svgWidth} ${svgHeight}">

  <defs>
    <style>
      @import url('https://fonts.googleapis.com/css2?family=Noto+Sans+SC:wght@400;600;700;800&amp;display=swap');
      text { font-family: 'Noto Sans SC', 'Microsoft YaHei', 'PingFang SC', sans-serif; }
    </style>
    <clipPath id="app-clip">
      <rect x="0" y="0" width="${svgWidth}" height="${svgHeight}" rx="16"/>
    </clipPath>
  </defs>

  <!-- 主容器背景 -->
  <rect x="0" y="0" width="${svgWidth}" height="${svgHeight}" rx="16" fill="#ffffff"
        filter="drop-shadow(0 18px 52px rgba(25,39,82,0.16))"/>

  <!-- ===== 左侧面板 ===== -->
  <g id="left-panel" clip-path="url(#app-clip)">
    <rect x="0" y="0" width="290" height="${svgHeight}" fill="#fbfcff"/>
    <line x1="290" y1="0" x2="290" y2="${svgHeight}" stroke="#e7eaf1" stroke-width="1"/>

    <!-- 品牌 -->
    <text x="22" y="42" font-size="20" font-weight="800" fill="#3963ec">贵州白酒交易所AI</text>
    <text x="22" y="62" font-size="13" fill="#677289">智能协作系统</text>

    <!-- 新对话按钮 -->
    <rect x="14" y="88" width="262" height="48" rx="12" fill="none" stroke="#dfe4ee" stroke-width="1"/>
    <text x="30" y="117" font-size="15" fill="#3a4560">⊕ 开启新对话</text>

    <!-- 导航菜单 -->
    <g id="nav-skills" transform="translate(14, 160)">
      <rect width="262" height="36" rx="8" fill="transparent"/>
      <text x="40" y="23" font-size="14" fill="#1f2940">技能</text>
    </g>
    <g id="nav-tasks" transform="translate(14, 198)">
      <rect width="262" height="36" rx="8" fill="transparent"/>
      <text x="40" y="23" font-size="14" fill="#1f2940">任务</text>
    </g>
    <g id="nav-more" transform="translate(14, 236)">
      <rect width="262" height="36" rx="8" fill="transparent"/>
      <text x="40" y="23" font-size="14" fill="#1f2940">更多</text>
    </g>

    <!-- 工作空间 -->
    <text x="24" y="300" font-size="14" font-weight="600" fill="#1f2940">工作空间</text>

    <!-- 会话列表 -->
    <g id="chat-list" transform="translate(14, 320)">
      <!-- 活跃会话 -->
      <g id="chat-active">
        <rect width="262" height="60" rx="10" fill="#eaf0ff"/>
        <text x="40" y="24" font-size="14" font-weight="600" fill="#4268ee">630版本迭代</text>
        <text x="40" y="44" font-size="12" fill="#6b7fd0">Rclaw技术方案初稿已经完成…</text>
        <text x="220" y="24" font-size="11" fill="#7b93f0">1 小时</text>
      </g>
      <!-- 其他会话 -->
      <g transform="translate(0, 66)">
        <rect width="262" height="60" rx="10" fill="transparent"/>
        <text x="40" y="24" font-size="14" font-weight="600" fill="#1f2940">明天天气怎么样？</text>
        <text x="40" y="44" font-size="12" fill="#79849b">明天天气怎么样？</text>
        <text x="230" y="24" font-size="11" fill="#9aa2b5">1 天</text>
      </g>
      <g transform="translate(0, 132)">
        <rect width="262" height="60" rx="10" fill="transparent"/>
        <text x="40" y="24" font-size="14" font-weight="600" fill="#1f2940">研发方案讨论</text>
        <text x="40" y="44" font-size="12" fill="#79849b">研发方案讨论</text>
        <text x="225" y="24" font-size="11" fill="#9aa2b5">1 周</text>
      </g>
      <g transform="translate(0, 198)">
        <rect width="262" height="60" rx="10" fill="transparent"/>
        <text x="40" y="24" font-size="14" font-weight="600" fill="#1f2940">今日任务是什么</text>
        <text x="40" y="44" font-size="12" fill="#79849b">今日任务是什么</text>
        <text x="222" y="24" font-size="11" fill="#9aa2b5">3 周</text>
      </g>
    </g>

    <!-- 用户栏 -->
    <g id="user-bar" transform="translate(14, ${svgHeight - 52})">
      <circle cx="16" cy="16" r="16" fill="#4b9fe8"/>
      <text x="16" y="21" font-size="13" font-weight="700" fill="#fff" text-anchor="middle">c</text>
      <text x="42" y="21" font-size="13" font-weight="600" fill="#1f2940">chenb</text>
    </g>
  </g>

  <!-- ===== 中间主区域 ===== -->
  <g id="main-area" transform="translate(290, 0)">
    <!-- 头部 -->
    <g id="header">
      <rect width="980" height="72" fill="#fff"/>
      <line x1="0" y1="72" x2="980" y2="72" stroke="#f0f1f5" stroke-width="1"/>
      <text x="22" y="44" font-size="21" font-weight="800" fill="#1f2940">630版本迭代</text>
      <!-- 模式标签 -->
      <rect x="170" y="24" width="110" height="28" rx="20" fill="#eaf0ff"/>
      <text x="185" y="43" font-size="12" font-weight="700" fill="#3464e8">● 多人协作</text>
      <!-- 头像 -->
      <circle cx="750" cy="36" r="14.5" fill="#8b72e8"/>
      <text x="750" y="41" font-size="11" font-weight="700" fill="#fff" text-anchor="middle">陈</text>
      <circle cx="785" cy="36" r="14.5" fill="#e3875d"/>
      <text x="785" y="41" font-size="11" font-weight="700" fill="#fff" text-anchor="middle">施</text>
      <circle cx="820" cy="36" r="14.5" fill="#4b9fe8"/>
      <text x="820" y="41" font-size="11" font-weight="700" fill="#fff" text-anchor="middle">宋</text>
      <!-- 邀请按钮 -->
      <rect x="850" y="20" width="60" height="32" rx="18" fill="#eaf0ff"/>
      <text x="866" y="41" font-size="13" font-weight="700" fill="#4166e9">邀请</text>
    </g>

    <!-- 消息区域 -->
    <g id="messages" transform="translate(0, 72)">
      <!-- 系统提示 -->
      <rect x="250" y="16" width="480" height="30" rx="14" fill="#f1f4fa"/>
      <text x="490" y="36" font-size="12" fill="#6e7891" text-anchor="middle">会话已进入多人协作模式 · 可通过输入框AI开关或 @工作秘书 让AI参与</text>

      <!-- 陈斌消息 -->
      <g transform="translate(30, 70)">
        <circle cx="14.5" cy="14.5" r="14.5" fill="#8b72e8"/>
        <text x="14.5" y="19" font-size="11" font-weight="700" fill="#fff" text-anchor="middle">陈</text>
        <text x="40" y="10" font-size="12" fill="#758097">陈斌 10:12</text>
        <rect x="40" y="18" width="500" height="44" rx="12" fill="#f4f6fa"/>
        <text x="54" y="44" font-size="14" fill="#1f2940">Rclaw技术方案初稿已经完成，接下来需要确认接入方式和演示范围。</text>
      </g>

      <!-- 我的消息 -->
      <g transform="translate(450, 150)">
        <text x="480" y="10" font-size="12" fill="#758097" text-anchor="end">宋贤群 10:16</text>
        <rect x="0" y="18" width="480" height="44" rx="12" fill="#e9efff"/>
        <text x="14" y="44" font-size="14" fill="#1f2940">我建议先按接口方案A验证，大家看看是否有风险？</text>
        <circle cx="495" cy="32" r="14.5" fill="#4b9fe8"/>
        <text x="495" y="37" font-size="11" font-weight="700" fill="#fff" text-anchor="middle">宋</text>
      </g>

      <!-- 施展消息 -->
      <g transform="translate(30, 230)">
        <circle cx="14.5" cy="14.5" r="14.5" fill="#e3875d"/>
        <text x="14.5" y="19" font-size="11" font-weight="700" fill="#fff" text-anchor="middle">施</text>
        <text x="40" y="10" font-size="12" fill="#758097">施展 10:18</text>
        <rect x="40" y="18" width="620" height="44" rx="12" fill="#f4f6fa"/>
        <text x="54" y="44" font-size="14" fill="#1f2940">需要先确认接口权限和测试环境，演示范围可以先限定在酒店和酒交两个场景。</text>
      </g>

      <!-- AI 回复卡片 -->
      <g transform="translate(42, 310)">
        <rect width="630" height="160" rx="12" fill="#fff" stroke="#dce2f0" stroke-width="1"/>
        <!-- AI 头部 -->
        <rect x="12" y="12" width="22" height="22" rx="7" fill="#4d70f5"/>
        <text x="23" y="28" font-size="12" fill="#fff" text-anchor="middle">✦</text>
        <text x="42" y="28" font-size="13" font-weight="800" fill="#3464e8">工作秘书 · 由宋贤群发起</text>
        <!-- 引用 -->
        <text x="12" y="56" font-size="12" fill="#8a93a8">← 回应 宋贤群：@工作秘书 请比较接口方案A和B的风险与实施成本。</text>
        <!-- 上下文 -->
        <text x="15" y="76" font-size="12" fill="#9aa2b5">基于施展提出的："需要先确认接口权限和测试环境……"</text>
        <!-- AI 正文 -->
        <text x="12" y="102" font-size="14" fill="#1f2940">方案A实施路径更短，适合本期演示；主要风险在于接口权限与环境准备。</text>
        <text x="12" y="122" font-size="14" fill="#1f2940">建议先锁定方案A，同时保留方案B作为后续扩展路径。</text>
        <!-- 操作按钮 -->
        <text x="12" y="148" font-size="12" fill="#60708e">复制</text>
        <text x="50" y="148" font-size="12" fill="#60708e">引用</text>
      </g>
    </g>

    <!-- 输入框区域 -->
    <g id="composer-area" transform="translate(30, ${svgHeight - 170})">
      <rect width="920" height="130" rx="12" fill="#f4f7ff" stroke="#a4b8f0" stroke-width="1"/>
      <!-- 输入区 -->
      <text x="14" y="30" font-size="14" fill="#9aa2b5">与成员讨论，开启AI参与按钮，或输入 @智能体 让AI参与</text>
      <line x1="0" y1="50" x2="920" y2="50" stroke="#e4e8ee" stroke-width="1"/>
      <!-- 工具栏 -->
      <g transform="translate(10, 60)">
        <!-- AI 开关 -->
        <rect width="120" height="30" rx="16" fill="#fff" stroke="#dde3ed" stroke-width="1"/>
        <text x="14" y="20" font-size="12" fill="#5b667c">AI 参与</text>
        <rect x="82" y="8" width="24" height="14" rx="8" fill="#c3cbd9"/>
        <circle cx="89" cy="15" r="5" fill="#fff"/>
        <!-- @按钮 -->
        <text x="140" y="20" font-size="13" fill="#5a6478">@成员 / 智能体</text>
        <text x="280" y="20" font-size="13" fill="#5a6478">⚙ 技能 ▾</text>
      </g>
      <!-- 发送按钮 -->
      <circle cx="888" cy="75" r="16" fill="#4d70f5"/>
      <text x="888" y="80" font-size="15" fill="#fff" text-anchor="middle">➤</text>
    </g>
  </g>

  <!-- ===== 右侧面板 ===== -->
  <g id="right-panel" transform="translate(1270, 0)">
    <rect width="330" height="${svgHeight}" fill="#fff"/>
    <line x1="0" y1="0" x2="0" y2="${svgHeight}" stroke="#e7eaf1" stroke-width="1"/>

    <!-- 右侧头部 -->
    <g id="right-header">
      <rect width="330" height="56" fill="#fff"/>
      <line x1="0" y1="56" x2="330" y2="56" stroke="#eff1f5" stroke-width="1"/>
      <rect x="16" y="14" width="100" height="28" rx="10" fill="#f8f9fa" stroke="#e4e8ee" stroke-width="1"/>
      <text x="36" y="33" font-size="14" fill="#1f2940">☰ 会话目录</text>
    </g>

    <!-- 会话摘要 -->
    <g id="summary-section" transform="translate(0, 56)">
      <g transform="translate(16, 16)">
        <rect width="3" height="14" rx="2" fill="#3464e8"/>
        <text x="14" y="12" font-size="14" font-weight="700" fill="#1f2940">会话摘要</text>
        <text x="280" y="12" font-size="11" fill="#8a93a8">▼</text>
      </g>
      <g transform="translate(16, 44)">
        <rect width="80" height="28" rx="8" fill="#eef2ff"/>
        <text x="10" y="18" font-size="12" fill="#4669e9">更新摘要</text>
        <text x="100" y="18" font-size="12" fill="#8b95a9">更新于今天 10:20</text>
      </g>
      <g transform="translate(16, 84)">
        <text x="0" y="14" font-size="13" font-weight="800" fill="#1f2940">一、工作项</text>
        <text x="0" y="36" font-size="13" fill="#4e5870">推进 630版本工作台改造，完成 Rclaw 接入方案及演示准备。</text>
        <text x="0" y="62" font-size="13" font-weight="800" fill="#1f2940">二、当前进展</text>
        <text x="0" y="82" font-size="13" fill="#4e5870">• 技术方案已完成，正在确认接入方式、权限和演示范围</text>
        <text x="0" y="102" font-size="13" fill="#4e5870">• 陈斌提出：本期优先使用方案A验证</text>
        <text x="0" y="128" font-size="13" font-weight="800" fill="#1f2940">三、已完成</text>
        <text x="0" y="148" font-size="13" fill="#4e5870">1. Rclaw 技术方案初稿</text>
        <text x="0" y="168" font-size="13" fill="#4e5870">2. 典型业务场景梳理</text>
        <text x="0" y="194" font-size="13" font-weight="800" fill="#1f2940">四、待推进</text>
        <text x="0" y="214" font-size="13" fill="#4e5870">1. 确认接口权限 @陈斌</text>
        <text x="0" y="234" font-size="13" fill="#4e5870">2. 确定演示范围 @施展</text>
        <text x="0" y="260" font-size="13" font-weight="800" fill="#1f2940">五、关键结论</text>
        <text x="0" y="280" font-size="13" fill="#4e5870">1. 本期优先使用方案A验证。</text>
        <text x="0" y="300" font-size="13" fill="#4e5870">2. 主要风险在于接口权限与环境准备。</text>
        <text x="0" y="320" font-size="13" fill="#4e5870">3. 建议先锁定方案A，保留方案B作为后续扩展。</text>
      </g>
    </g>
  </g>

  <!-- 高清截图覆盖层（可删除以显示矢量元素） -->
  <image x="0" y="0" width="${svgWidth}" height="${svgHeight}"
         href="${dataUri}" opacity="0" id="screenshot-layer"
         clip-path="url(#app-clip)"/>

</svg>`;

  fs.writeFileSync(OUTPUT_SVG, svgContent, 'utf-8');
  console.log('✅ SVG 文件已生成:', OUTPUT_SVG);
  console.log(`   尺寸: ${svgWidth} x ${svgHeight}`);
  console.log('');
  console.log('📋 Figma 导入方法:');
  console.log('   方法1 (推荐): 直接拖拽 SVG 文件到 Figma 画布');
  console.log('   方法2: Figma → File → Place Image... 导入');
  console.log('   方法3: 使用 html.to.design 插件获取完全可编辑的矢量图层');
  console.log('           插件地址: https://www.figma.com/community/plugin/115911514950993800');

  await browser.close();
  console.log('🎉 完成!');
})().catch(err => {
  console.error('❌ 转换失败:', err.message);
  process.exit(1);
});
