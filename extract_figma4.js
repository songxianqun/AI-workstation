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

function getWH(node) {
  const bb = node.absoluteBoundingBox || {};
  return { w: Math.round(bb.width || 0), h: Math.round(bb.height || 0) };
}

// Get all text nodes
function getTextNodes(node, results = []) {
  if (node.type === 'TEXT') {
    const rx = Math.round(node.absoluteBoundingBox.x - rootX);
    const ry = Math.round(node.absoluteBoundingBox.y - rootY);
    const { w, h } = getWH(node);
    results.push({ text: node.characters, x: rx, y: ry, w, h,
      font: node.style?.fontFamily, size: node.style?.fontSize,
      weight: node.style?.fontWeight,
      color: node.fills?.[0]?.color ? colorToCSS(node.fills[0].color) : null
    });
  }
  if (node.children) node.children.forEach(c => getTextNodes(c, results));
  return results;
}

// Get all FRAME/RECTANGLE nodes
function getShapes(node, results = []) {
  if (['RECTANGLE', 'FRAME'].includes(node.type)) {
    const fill = node.fills?.[0];
    if (fill && fill.visible !== false) {
      const rx = Math.round(node.absoluteBoundingBox.x - rootX);
      const ry = Math.round(node.absoluteBoundingBox.y - rootY);
      const { w, h } = getWH(node);
      results.push({ name: node.name, type: node.type, x: rx, y: ry, w, h,
        fill: colorToCSS(fill.color), radius: node.cornerRadius || null,
        stroke: node.strokes?.[0]?.color ? colorToCSS(node.strokes[0].color) : null,
        strokeW: node.strokeWeight || null, opacity: node.opacity
      });
    }
  }
  if (node.children) node.children.forEach(c => getShapes(c, results));
  return results;
}

const allTexts = getTextNodes(doc);

// Center area chat messages (x between 248 and 970)
console.log("=== CENTER TEXTS (sorted by Y) ===");
allTexts.filter(t => t.x > 248 && t.x < 970).sort((a,b) => a.y - b.y || a.x - b.x).forEach(t => {
  console.log(`  [${t.x},${t.y}] ${t.w}x${t.h} "${t.text}" ${t.font} ${t.size}px w=${t.weight} c=${t.color}`);
});

console.log("\n=== CENTER SHAPES ===");
getShapes(doc).filter(r => r.x >= 248 && r.x < 970).sort((a,b) => a.y - b.y).forEach(r => {
  console.log(`  ${r.name} [${r.x},${r.y}] ${r.w}x${r.h} fill=${r.fill} r=${r.radius} op=${r.opacity}`);
});

// Also get left sidebar details
console.log("\n=== LEFT SIDEBAR TEXTS ===");
allTexts.filter(t => t.x < 248).sort((a,b) => a.y - b.y || a.x - b.x).forEach(t => {
  console.log(`  [${t.x},${t.y}] ${t.w}x${t.h} "${t.text}" ${t.font} ${t.size}px w=${t.weight} c=${t.color}`);
});

// Right sidebar details
console.log("\n=== RIGHT SIDEBAR TEXTS ===");
allTexts.filter(t => t.x >= 970).sort((a,b) => a.y - b.y || a.x - b.x).forEach(t => {
  console.log(`  [${t.x},${t.y}] ${t.w}x${t.h} "${t.text}" ${t.font} ${t.size}px w=${t.weight} c=${t.color}`);
});
