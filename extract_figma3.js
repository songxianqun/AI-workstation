const data = require('./figma_node_data.json');
const doc = data.nodes['243:2'].document;
const rootX = doc.absoluteBoundingBox.x;
const rootY = doc.absoluteBoundingBox.y;

function colorToCSS(c) {
  if (!c) return 'transparent';
  const r = Math.round((c.r || 0) * 255);
  const g = Math.round((c.g || 0) * 255);
  const b = Math.round((c.b || 0) * 255);
  const a = c.a !== undefined ? c.a : 1;
  return a === 1 ? `rgb(${r},${g},${b})` : `rgba(${r},${g},${b},${a.toFixed(2)})`;
}

// Find specific sections by name patterns
function findNodes(node, patterns, results = {}) {
  for (const p of patterns) {
    if (node.name.includes(p)) {
      if (!results[p]) results[p] = [];
      results[p].push(node);
    }
  }
  if (node.children) node.children.forEach(c => findNodes(c, patterns, results));
  return results;
}

// Get all text nodes in order with positions
function getTextNodes(node, results = []) {
  if (node.type === 'TEXT') {
    const rx = Math.round(node.absoluteBoundingBox.x - rootX);
    const ry = Math.round(node.absoluteBoundingBox.y - rootY);
    results.push({
      text: node.characters,
      x: rx, y: ry,
      w: Math.round(node.width),
      h: Math.round(node.height),
      font: node.style?.fontFamily,
      size: node.style?.fontSize,
      weight: node.style?.fontWeight,
      color: node.fills?.[0]?.color ? colorToCSS(node.fills[0].color) : null
    });
  }
  if (node.children) node.children.forEach(c => getTextNodes(c, results));
  return results;
}

// Get all rectangles with positions
function getRects(node, results = []) {
  if (node.type === 'RECTANGLE' || node.type === 'FRAME') {
    const fill = node.fills?.[0];
    if (fill && fill.visible !== false) {
      const rx = Math.round(node.absoluteBoundingBox.x - rootX);
      const ry = Math.round(node.absoluteBoundingBox.y - rootY);
      results.push({
        name: node.name,
        type: node.type,
        x: rx, y: ry,
        w: Math.round(node.width),
        h: Math.round(node.height),
        fill: colorToCSS(fill.color),
        radius: node.cornerRadius || null,
        stroke: node.strokes?.[0]?.color ? colorToCSS(node.strokes[0].color) : null,
        strokeW: node.strokeWeight || null,
        opacity: node.opacity
      });
    }
  }
  if (node.children) node.children.forEach(c => getRects(c, results));
  return results;
}

const texts = getTextNodes(doc);
console.log("=== TEXT NODES ===");
texts.filter(t => t.x > 248 && t.x < 970).sort((a,b) => a.y - b.y || a.x - b.x).forEach(t => {
  console.log(`  [${t.x},${t.y}] ${t.w}x${t.h} "${t.text}" font=${t.font} sz=${t.size} wt=${t.weight} c=${t.color}`);
});

console.log("\n=== KEY RECTS (center area) ===");
getRects(doc).filter(r => r.x >= 248 && r.x < 970).sort((a,b) => a.y - b.y).forEach(r => {
  console.log(`  ${r.name} [${r.x},${r.y}] ${r.w}x${r.h} fill=${r.fill} r=${r.radius} stroke=${r.stroke} op=${r.opacity}`);
});
