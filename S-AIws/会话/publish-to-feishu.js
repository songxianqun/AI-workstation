const fs = require('fs');
const { spawnSync } = require('child_process');

const runJsPath = 'C:\\Users\\宋贤群\\AppData\\Roaming\\npm\\node_modules\\@larksuite\\cli\\scripts\\run.js';
const baseDir = 'd:\\AIworkstation\\S-AIws\\会话';
const markdownPath = `${baseDir}\\记录.md`;
const image1Path = '图一-右侧面板来源支持.png';
const image2Path = '图二-会话折叠问题反馈.png';

process.chdir(baseDir);

let markdown = fs.readFileSync(markdownPath, 'utf8');
// Remove top-level title because --title is provided separately
markdown = markdown.replace(/^# .*\n+/, '');
// Remove local image references
markdown = markdown.replace(/\n\n!\[.*?\]\(.*?\)/g, '');

function run(args, input) {
  const options = { encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] };
  if (input !== undefined) options.input = input;
  const result = spawnSync('node', [runJsPath, ...args], options);
  if (result.error) throw result.error;
  if (result.status !== 0) {
    console.error('stderr:', result.stderr);
    throw new Error(`Command failed with status ${result.status}`);
  }
  return result.stdout;
}

// 1. Reuse the document created earlier (skip creation to avoid duplicates)
const docId = 'U25AdzCKcoaBVZx1Mogc1spnn7e';
const docUrl = 'https://my.feishu.cn/docx/U25AdzCKcoaBVZx1Mogc1spnn7e';
console.log('Using doc:', docId);

// 2. Insert image 1 after the "来源" paragraph
run([
  'docs', '+media-insert',
  '--doc', docId,
  '--file', image1Path,
  '--caption', '图一：右侧面板来源支持',
  '--selection-with-ellipsis', '当前状态：右侧面板已支持「来源」展示（见图一）。'
]);
console.log('Inserted image 1');

// 3. Insert image 2 after the "图二" paragraph
run([
  'docs', '+media-insert',
  '--doc', docId,
  '--file', image2Path,
  '--caption', '图二：会话折叠问题反馈',
  '--selection-with-ellipsis', '根据图二中的反馈，当前会话折叠存在以下问题：'
]);
console.log('Inserted image 2');

// 4. Enable internet access
const permResult = run([
  'drive', 'permission.public', 'patch',
  '--params', JSON.stringify({ token: docId, type: 'docx' }),
  '--data', JSON.stringify({ external_access: true, link_share_entity: 'anyone_readable' }),
  '--yes'
]);
console.log('Permission result:', permResult);

console.log('FINAL_URL:', docUrl);
