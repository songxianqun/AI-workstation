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

// Get ALL nodes (any type) in the center area with their bounding boxes
function getAllNodes(node, depth = 0, results = []) {
  const bb = node.absoluteBoundingBox;
  if (!bb) return results;
  const rx = Math.round(bb.x - rootX);
  const ry = Math.round(bb.y - rootY);
  const rw = Math.round(bb.width || 0);
  const rh = Math.round(bb.height || 0);
  
  // Only nodes in center area (x: 248-970) with meaningful size
  if (rx >= 248 && rx < 970 && rw > 5 && rh > 5) {
    let info = `${'  '.repeat(depth)}${node.name} [${node.type}] (${rx},${ry}) ${rw}x${rh}`;
    if (node.type === 'TEXT') {
      const text = (node.characters || '').substring(0, 60);
      info += ` "${text}" ${node.style?.fontFamily} ${node.style?.fontSize}px w=${node.style?.weight}`;
      if (node.fills?.[0]?.color) info += ` c=${colorToCSS(node.fills[0].color)}`;
    }
    const fill = node.fills?.[0];
    if (fill && fill.visible !== false && node.type !== 'TEXT') {
      info += ` fill=${colorToCSS(fill.color)}`;
    }
    if (node.cornerRadius) info += ` r=${node.cornerRadius}`;
    if (node.opacity !== undefined && node.opacity !== 1) info += ` op=${node.opacity}`;
    if (node.effects) {
      node.effects.forEach(e => {
        if (e.visible !== false && (e.type === 'DROP_SHADOW' || e.type === 'INNER_SHADOW')) {
          info += ` shadow`;
        }
      });
    }
    results.push({ depth, info, rx, ry, rw, rh, name: node.name, type: node.type });
  }
  
  if (node.children) node.children.forEach(c => getAllNodes(c, depth + 1, results));
  return results;
}

const centerNodes = getAllNodes(doc);
centerNodes.sort((a, b) => a.ry - b.ry || a.rx - b.rx);
centerNodes.forEach(n => console.log(n.info));
