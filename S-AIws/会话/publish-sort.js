const fs = require('fs');
const { spawnSync } = require('child_process');

const runJsPath = 'C:\\Users\\宋贤群\\AppData\\Roaming\\npm\\node_modules\\@larksuite\\cli\\scripts\\run.js';
const baseDir = 'd:\\AIworkstation\\S-AIws\\会话';
const markdownPath = `${baseDir}\\测试记录-会话问题梳理.md`;
const docId = 'EpgndxwZmoMQgcxfRjzcRVflnVc';

process.chdir(baseDir);

let markdown = fs.readFileSync(markdownPath, 'utf8');
// 去掉一级标题，避免和文档标题重复
markdown = markdown.replace(/^# .*\n+/, '');
// 按 "## " 拆成章节
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

// 逐章节 append 写入
sections.forEach((section, i) => {
  console.log(`\n==== Appending section ${i} ====`);
  run([
    'docs', '+update',
    '--doc', docId,
    '--command', 'append',
    '--doc-format', 'markdown',
    '--content', section
  ]);
});

// 开通互联网访问
const permOut = run([
  'drive', 'permission.public', 'patch',
  '--params', JSON.stringify({ token: docId, type: 'docx' }),
  '--data', JSON.stringify({ external_access: true, link_share_entity: 'anyone_readable' }),
  '--yes'
]);
console.log('Permission done:', permOut);

console.log('FINAL_URL: https://my.feishu.cn/docx/' + docId);
