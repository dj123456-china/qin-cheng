import fs from 'node:fs';
import postcss from 'postcss';
const file = 'dist-minitool/assets/style.css';
const root = postcss.parse(fs.readFileSync(file, 'utf8'));
// 为实际用到的 min/clamp 声明插入旧内核基线值。
root.walkDecls(decl => {
  if (decl.value.includes('clamp(')) decl.cloneBefore({value: decl.prop === 'font-size' ? '46px' : '100%'});
  if (decl.value === 'min(580px,100%)' || decl.value === 'min(580px, 100%)') {
    decl.cloneBefore({value:'100%'}); decl.cloneBefore({prop:'max-width',value:'580px'});
  }
  if (decl.prop === 'gap') decl.cloneBefore({prop:'grid-gap'});
  if (decl.prop === 'overflow-wrap' && decl.value === 'anywhere') decl.cloneBefore({value:'break-word'});
});
// Flex gap 不可用时，只对带 gap 的 Flex 组件添加局部子项边距。
const flexSelectors = new Set();
root.walkRules(rule => {
  if (rule.nodes.some(node => node.prop === 'display' && /^(inline-)?flex$/.test(node.value))) {
    for (const selector of rule.selector.split(',')) flexSelectors.add(selector.trim());
  }
});
root.walkRules(rule => {
  const gap = rule.nodes.find(node => node.prop === 'gap');
  if (!gap) return;
  const selectors=rule.selector.split(',').map(s=>s.trim()).filter(s=>flexSelectors.has(s));
  if (!selectors.length) return;
  const [row, column=row] = gap.value.split(/\s+/);
  const fallback=postcss.rule({selector:selectors.map(s=>`.no-flex-gap ${s} > *`).join(',')});
  fallback.append({prop:'margin-right',value:column},{prop:'margin-bottom',value:row});
  rule.after(fallback);
});
fs.writeFileSync(file, root.toString());
