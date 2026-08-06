const fs = require('fs');
const { spawnSync } = require('child_process');

const runJsPath = 'C:\\Users\\宋贤群\\AppData\\Roaming\\npm\\node_modules\\@larksuite\\cli\\scripts\\run.js';
const baseDir = 'd:\\AIworkstation\\S-AIws\\会话';
const markdownPath = `${baseDir}\\左侧面板优化方案（终稿）.md`;
const docId = 'ITNwdxH1zojEjsxSsaLci4BwnWd';
const blockId = 'doxcni0LTnMis1YC5QeYPpysm0e'; // 七、新消息提醒 heading block id

process.chdir(baseDir);

let markdown = fs.readFileSync(markdownPath, 'utf8');
// Extract section 八 content (from ## 八 to next ##)
const match = markdown.match(/## 八、与既有问题的对应修复[\s\S]*?(?=\n## 九、)/);
if (!match) {
  console.error('Could not find section 八 content');
  process.exit(1);
}
const section8 = match[0].trim();
console.log('Section 8 length:', section8.length);
console.log('Section 8 preview:', section8.split('\n').slice(0, 3).join('\n'));

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

console.log('\n==== Inserting section 8 after 七、新消息提醒 ====');
run([
  'docs', '+update',
  '--doc', docId,
  '--command', 'block_insert_after',
  '--block-id', blockId,
  '--doc-format', 'markdown',
  '--content', section8
]);

console.log('FINAL_URL: https://my.feishu.cn/docx/' + docId);
