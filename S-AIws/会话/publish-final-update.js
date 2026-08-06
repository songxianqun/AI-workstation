const fs = require('fs');
const { spawnSync } = require('child_process');

const runJsPath = 'C:\\Users\\宋贤群\\AppData\\Roaming\\npm\\node_modules\\@larksuite\\cli\\scripts\\run.js';
const baseDir = 'd:\\AIworkstation\\S-AIws\\会话';
const markdownPath = `${baseDir}\\左侧面板优化方案（终稿）.md`;
const docId = 'ITNwdxH1zojEjsxSsaLci4BwnWd';

process.chdir(baseDir);

let markdown = fs.readFileSync(markdownPath, 'utf8');
markdown = markdown.replace(/^# .*\n+/, '');
const sections = markdown.split(/\n(?=## )/).filter(Boolean);

console.log('Split into', sections.length, 'sections');
sections.forEach((s, i) => {
  const titleLine = (s.split('\n')[0] || '').trim();
  console.log(`  [${i}] ${titleLine}  (${s.length} chars)`);
});

function run(args, input) {
  const options = { encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] };
  if (input !== undefined) options.input = input;
  const result = spawnSync('node', [runJsPath, ...args], options);
  const stdout = result.stdout || '';
  const stderr = result.stderr || '';
  console.log('--- stdout ---\n' + stdout);
  if (stderr) console.log('--- stderr ---\n' + stderr);
  if (result.error) {
    console.error('error:', result.error);
    process.exit(1);
  }
  if (result.status !== 0) {
    console.error('exit:', result.status);
    process.exit(1);
  }
  return stdout;
}

// 1. 先清空并写入第一节（作为 overwrite）
console.log('\n==== Overwriting section 0 ====');
run([
  'docs', '+update',
  '--doc', docId,
  '--command', 'overwrite',
  '--doc-format', 'markdown',
  '--content', sections[0]
]);

// 2. 后续章节 append
sections.slice(1).forEach((section, i) => {
  console.log(`\n==== Appending section ${i + 1} ====`);
  run([
    'docs', '+update',
    '--doc', docId,
    '--command', 'append',
    '--doc-format', 'markdown',
    '--content', section
  ]);
});

console.log('FINAL_URL: https://my.feishu.cn/docx/' + docId);
