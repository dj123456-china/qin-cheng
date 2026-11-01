import assert from 'node:assert/strict';
import test from 'node:test';
import { analyzeKinship } from './kinship';
import { explainKinship } from './explanation';

test('说明称呼并逐步解释，保留长幼候选', () => {
  const explanation = explainKinship(analyzeKinship('妈妈的哥哥的女儿'));
  assert.ok(explanation.answer.includes('我可以称呼对方'));
  assert.deepEqual(explanation.paths[0].steps.map((step) => step.meaning), ['妈妈', '大舅', '舅表姐 / 舅表妹']);
});

test('相对称呼人与反查使用各自的关系起点', () => {
  const options = { target: '舅妈' };
  const forward = explainKinship(analyzeKinship('外婆', '全国通用', options), options);
  assert.equal(forward.answer, '这位亲戚可以称呼对方为“婆婆”。');
  assert.equal(forward.paths[0].steps.at(-1)?.meaning, '婆婆');
  const reverseOptions = { ...options, reverse: true };
  const reverse = explainKinship(analyzeKinship('外婆', '全国通用', reverseOptions), reverseOptions);
  assert.equal(reverse.answer, '对方可以称呼这位亲戚为“儿媳”。');
  assert.equal(reverse.paths[0].steps.at(-1)?.meaning, '儿媳');
});

test('截图长链逐步分析完整输入，未收录分支不捏造称呼', () => {
  const text = '妈妈的妈妈的哥哥的姐姐的妹妹的儿子的女儿的老公的弟弟';
  const explanation = explainKinship(analyzeKinship(text));
  assert.equal(explanation.paths[0].steps.length, 9);
  assert.equal(explanation.paths[0].steps.at(-1)?.relation, text);
  const unmerged = explainKinship(analyzeKinship('女儿的老婆'));
  assert.ok(unmerged.answer.includes('暂未查到固定称呼'));
  assert.ok(unmerged.paths[0].steps.at(-1)?.meaning.includes('暂无固定称呼'));
  const options = { target: '女儿的老婆' };
  assert.deepEqual(explainKinship(analyzeKinship('外婆', '全国通用', options), options).paths, []);
  assert.equal(explainKinship(analyzeKinship('火星人')).answer, '');
  assert.equal(explainKinship(analyzeKinship('')).answer, '');
});
