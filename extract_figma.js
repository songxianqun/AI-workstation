const data = require('./figma_node_data.json');
const doc = data.nodes['243:2'].document;

function colorToCSS(c) {
  if (!c) return 'transparent';
  const r = Math.round((c.r || 0) * 255);
  const g = Math.round((c.g || 0) * 255);
  const b = Math.round((c.b || 0) * 255);
  const a = c.a !== undefined ? c.a : 1;
  return a === 1 ? `rgb(${r},${g},${b})` : `rgba(${r},${g},${b},${a.toFixed(2)})`;
}

function extractNode(node, depth = 0) {
  const indent = '  '.repeat(depth);
  let info = indent + node.name + ' [' + node.type + ']';
  
  if (node.type === 'TEXT') {
    const text = (node.characters || '').substring(0, 100).replace(/\n/g, '\\n');
    info += ` text="${text}"`;
    if (node.style) {
      info += ` font=${node.style.fontFamily || '?'} size=${node.style.fontSize || '?'} weight=${node.style.fontWeight || '?'}`;
      if (node.style.lineHeightPx) info += ` lineH=${node.style.lineHeightPx}`;
      if (node.style.letterSpacing) info += ` letterS=${node.style.letterSpacing}`;
    }
    if (node.fills) info += ` color=${colorToCSS(node.fills[0]?.color)}`;
  }
  
  if (node.fills && node.type !== 'TEXT') {
    const fill = node.fills[0];
    if (fill && fill.visible !== false) info += ` fill=${colorToCSS(fill.color)}`;
  }
  
  if (node.backgroundColor) info += ` bg=${colorToCSS(node.backgroundColor)}`;
  if (node.cornerRadius) info += ` radius=${node.cornerRadius}`;
  if (node.rectangleCornerRadii) info += ` radii=${JSON.stringify(node.rectangleCornerRadii)}`;
  if (node.strokes && node.strokes.length > 0) info += ` stroke=${colorToCSS(node.strokes[0]?.color)} w=${node.strokeWeight}`;
  if (node.opacity !== undefined && node.opacity !== 1) info += ` opacity=${node.opacity}`;
  
  if (node.effects) {
    node.effects.forEach(e => {
      if (e.type === 'DROP_SHADOW' || e.type === 'INNER_SHADOW') {
        info += ` shadow(${e.type}:${e.offset?.x},${e.offset?.y} r=${e.radius} s=${e.spread} c=${colorToCSS(e.color)})`;
      }
      if (e.type === 'LAYER_BLUR') info += ` blur=${e.radius}`;
    });
  }
  
  if (node.layoutMode) info += ` layout=${node.layoutMode}`;
  if (node.paddingLeft || node.paddingRight || node.paddingTop || node.paddingBottom) {
    info += ` pad(${node.paddingTop||0},${node.paddingRight||0},${node.paddingBottom||0},${node.paddingLeft||0})`;
  }
  if (node.itemSpacing !== undefined) info += ` gap=${node.itemSpacing}`;
  
  info += ` (${Math.round(node.width || 0)}x${Math.round(node.height || 0)})`;
  console.log(info);
  
  if (node.children) {
    node.children.forEach(c => extractNode(c, depth + 1));
  }
}

extractNode(doc);
