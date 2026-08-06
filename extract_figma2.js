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

function getFill(node) {
  if (node.fills && node.fills.length > 0) {
    const f = node.fills[0];
    if (f.visible !== false) return colorToCSS(f.color);
  }
  return null;
}

function extractDetailed(node, depth = 0) {
  const indent = '  '.repeat(depth);
  const rx = Math.round(node.absoluteBoundingBox.x - rootX);
  const ry = Math.round(node.absoluteBoundingBox.y - rootY);
  const rw = Math.round(node.width || 0);
  const rh = Math.round(node.height || 0);
  
  let info = `${indent}${node.name} [${node.type}] pos(${rx},${ry}) size(${rw}x${rh})`;
  
  if (node.type === 'TEXT') {
    const text = (node.characters || '').substring(0, 80).replace(/\n/g, '\\n');
    info += ` text="${text}"`;
    if (node.style) {
      info += ` font=${node.style.fontFamily} sz=${node.style.fontSize} wt=${node.style.fontWeight}`;
    }
    if (node.fills) info += ` color=${colorToCSS(node.fills[0]?.color)}`;
  }
  
  const fill = getFill(node);
  if (fill && node.type !== 'TEXT') info += ` fill=${fill}`;
  if (node.backgroundColor) info += ` bg=${colorToCSS(node.backgroundColor)}`;
  if (node.cornerRadius) info += ` r=${node.cornerRadius}`;
  if (node.strokes && node.strokes.length > 0) info += ` stroke=${colorToCSS(node.strokes[0]?.color)} sw=${node.strokeWeight}`;
  if (node.opacity !== undefined && node.opacity !== 1) info += ` op=${node.opacity}`;
  if (node.effects) {
    node.effects.forEach(e => {
      if ((e.type === 'DROP_SHADOW' || e.type === 'INNER_SHADOW') && e.visible !== false) {
        info += ` shadow(${e.type}:${e.offset?.x},${e.offset?.y} r=${e.radius} c=${colorToCSS(e.color)})`;
      }
    });
  }
  
  console.log(info);
  if (node.children) node.children.forEach(c => extractDetailed(c, depth + 1));
}

extractDetailed(doc);
