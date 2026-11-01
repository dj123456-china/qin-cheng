import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { parse } from '@babel/parser';
import postcss from 'postcss';

const root = 'dist-minitool';
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
assert(!/<(?:iframe|object|base)\b|\bon\w+\s*=|javascript:|type=["']module/i.test(html));
assert(!/<meta[^>]+http-equiv\s*=\s*["']Content-Security-Policy/i.test(html));
assert(/viewport-fit=cover/.test(html));
for(const match of html.matchAll(/(?:src|href)=["']([^"']+)["']/g)) {
  assert(match[1].startsWith('./'), `Non-relative resource: ${match[1]}`);
  assert(fs.existsSync(path.join(root, match[1])), `Missing: ${match[1]}`);
}
for(const match of html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/g)) {
  assert(/src=/.test(match[1]) && !match[2].trim(), 'Inline script');
}
const source = fs.readFileSync(path.join(root,'assets/main.js'),'utf8');
const ast = parse(source, { sourceType: 'script' });
const banned = /(^|\.)(fetch|XMLHttpRequest|WebSocket|EventSource|Worker|SharedWorker|RTCPeerConnection|eval|Function|execCommand|requestFullscreen|webkitRequestFullscreen|open|prompt)$/;
let nodes = 0;
function walk(node) {
  if(!node || typeof node !== 'object') return;
  nodes++;
  assert(!['ImportDeclaration','ExportNamedDeclaration','ExportDefaultDeclaration','ImportExpression','OptionalMemberExpression','OptionalCallExpression','BigIntLiteral','ClassPrivateProperty','ClassPrivateMethod'].includes(node.type), `Unsupported syntax: ${node.type}`);
  if(node.type === 'RegExpLiteral') assert(!/\(\?<|\\p\{/.test(node.pattern), 'New regex syntax');
  if(['CallExpression','NewExpression'].includes(node.type) && ['Identifier','MemberExpression'].includes(node.callee.type)) {
    const callee = source.slice(node.callee.start,node.callee.end);
    assert(!banned.test(callee) && !/navigator\.(clipboard|geolocation|bluetooth|usb|hid|serial|credentials|locks|connection|storage|serviceWorker)|WebAssembly/.test(callee), `Banned API: ${callee}`);
  }
  for(const [key,value] of Object.entries(node)) {
    if(key==='loc') continue;
    if(Array.isArray(value)) value.forEach(walk);
    else if(value && typeof value==='object') walk(value);
  }
}
walk(ast);
const css = fs.readFileSync(path.join(root,'assets/style.css'),'utf8');
postcss.parse(css);
assert(!/url\(\s*["']?(https?:|\/\/)/i.test(css), 'External CSS resource');
assert(css.includes('.no-flex-gap') && css.includes('grid-gap') && css.includes('safe-area-inset-top'));
assert(!/\b(?:fetch|XMLHttpRequest|WebSocket|WebAssembly)\s*\(/.test(source));
assert(!/navigator\.clipboard|execCommand\s*\(/.test(source));
const allowed = new Set(['.html','.css','.js','.png','.jpg','.jpeg','.gif','.webp','.svg','.woff','.woff2','.json']);
const files=[];
function scan(dir) { for(const item of fs.readdirSync(dir,{withFileTypes:true})) {
 const p=path.join(dir,item.name); if(item.isDirectory()) scan(p); else { assert(allowed.has(path.extname(p)), `Unsupported file: ${p}`); files.push(p); }
} }
scan(root);
assert.equal(files.filter(p=>p.endsWith('.html')).length,1);
const report={status:'PASS', files: files.map(file=>({file,bytes:fs.statSync(file).size})), astNodes:nodes, checks:['根目录唯一 HTML 入口','相对路径与本地资源完整','外置经典脚本 / 无模块与内联脚本','禁用 API 调用扫描','生产构建与 ES2017/Chrome61 目标','新语法与新正则静态扫描','Flex gap / Grid gap / CSS 基线与安全区','受限复制改为可选文本','无外部联网资源'], pending:['创服平台模拟器','Android 真机扫码','iOS 真机扫码','Chrome 61 实机兼容性与性能']};
fs.mkdirSync('output/minitool',{recursive:true});
fs.writeFileSync('output/minitool/static-audit.json',JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify(report,null,2));
