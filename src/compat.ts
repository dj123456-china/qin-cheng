// 只补齐亲属计算依赖实际使用、Chrome 61 缺失的数组与字符串方法。
if (!Array.prototype.flat) Object.defineProperty(Array.prototype, 'flat', { configurable: true, writable: true, value: function(depth = 1) {
  const flatten = (items: unknown[], level: number): unknown[] => items.reduce<unknown[]>((result, item) => result.concat(Array.isArray(item) && level > 0 ? flatten(item, level - 1) : [item]), []);
  return flatten(this, Number(depth));
} });
if (!Array.prototype.flatMap) Object.defineProperty(Array.prototype, 'flatMap', { configurable: true, writable: true, value: function(callback: (value: unknown, index: number, array: unknown[]) => unknown, thisArg?: unknown) {
  return Array.prototype.map.call(this, callback, thisArg).flat();
} });
if (!Array.prototype.at) Object.defineProperty(Array.prototype, 'at', { configurable: true, writable: true, value: function(index: number) {
  const offset = Math.trunc(index) || 0;
  return this[offset < 0 ? this.length + offset : offset];
} });
if (!String.prototype.replaceAll) Object.defineProperty(String.prototype, 'replaceAll', { configurable: true, writable: true, value: function(search: string, replacement: string) {
  return String(this).split(search).join(replacement);
} });

const probe = document.createElement('div');
probe.style.cssText = 'position:absolute;visibility:hidden;display:flex;flex-direction:column;row-gap:1px';
probe.appendChild(document.createElement('div'));
probe.appendChild(document.createElement('div'));
document.body.appendChild(probe);
document.documentElement.classList.add(probe.scrollHeight === 1 ? 'supports-flex-gap' : 'no-flex-gap');
probe.remove();
