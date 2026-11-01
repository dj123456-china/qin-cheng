import assert from 'node:assert/strict';
import test from 'node:test';
import { analyzeKinship, explainRelation, getKinshipPinyin, queryKinship } from './kinship';

test('按亲属关系返回称呼和带声调拼音', () => {
  const result = queryKinship('妈妈的妈妈')[0];
  assert.equal(result.title, '外婆');
  assert.equal(result.pinyin, 'wài pó');
});

test('地区切换会呈现南北常见差异，同时保留通用叫法', () => {
  const northern = queryKinship('妈妈的妈妈', '北方').map((result) => result.title);
  const southern = queryKinship('妈妈的妈妈', '南方').map((result) => result.title);
  assert.ok(northern.includes('姥姥'));
  assert.ok(northern.includes('外婆'));
  assert.ok(southern.includes('阿婆'));
  assert.ok(southern.includes('外婆'));
  assert.equal(queryKinship('妈妈的妈妈', '北方').find((result) => result.title === '姥姥')?.region, '北方');
  assert.equal(queryKinship('妈妈的妈妈', '北方').find((result) => result.title === '外婆')?.region, '全国通用');
});

test('无法识别的关系返回空结果，清理尾部标点', () => {
  assert.equal(queryKinship('妈妈的妈妈？')[0].title, '外婆');
  assert.deepEqual(queryKinship('火星的邻居'), []);
  assert.deepEqual(queryKinship('  '), []);
});

test('支持带“我”前缀的复杂关系链', () => {
  const result = queryKinship('我奶奶的爸爸的堂哥')[0];
  assert.equal(result.title, '堂伯曾外祖父');
  assert.equal(result.pinyin, 'táng bó zēng wài zǔ fù');
});

test('堂爹、堂爸按父亲堂兄弟解释，保留长幼候选和说明', () => {
  const analysis = analyzeKinship('我奶奶的爸爸的堂爹的表弟');
  assert.equal(analysis.status, 'matched');
  assert.equal(analysis.normalized, '奶奶的爸爸的堂爹的表弟');
  assert.deepEqual(analysis.results.map((result) => result.title), ['姑表伯曾外曾祖父', '姑表叔曾外曾祖父']);
  assert.ok(analysis.notices.some((notice) => notice.includes('父亲的堂兄弟')));
  assert.ok(analysis.chains.length > 0);
  assert.deepEqual(queryKinship('堂爸').map((result) => result.title), ['堂伯', '堂叔']);
});

test('支持相对称呼者和按本人性别反查', () => {
  assert.equal(queryKinship('外婆', '全国通用', { target: '舅妈' })[0].title, '婆婆');
  assert.equal(queryKinship('外婆', '全国通用', { target: '舅妈', reverse: true })[0].title, '儿媳');
  assert.equal(queryKinship('爸爸的哥哥', '全国通用', { sex: 0, reverse: true })[0].title, '侄女');
  assert.equal(queryKinship('爸爸的哥哥', '全国通用', { sex: 1, reverse: true })[0].title, '侄子');
  assert.equal(analyzeKinship('爸爸', '全国通用', { target: '火星的邻居' }).status, 'unsupported');
  assert.deepEqual(queryKinship('爸爸', '全国通用', { target: '火星的邻居' }), []);
});

test('能识别但未收录固定称谓的长链保留关系解释', () => {
  const text = '爸爸的妈妈的爸爸的爸爸的爸爸的爸爸的爸爸的爸爸的爸爸的爸爸的爸爸的爸爸';
  const analysis = analyzeKinship(text);
  assert.equal(analysis.status, 'described');
  assert.deepEqual(analysis.results, []);
  assert.deepEqual(analysis.chains, [text]);
  assert.equal(explainRelation(text), text);
  assert.equal(analyzeKinship('火星的邻居').status, 'unsupported');
  assert.equal(analyzeKinship('  ').status, 'empty');
});

test('亲属多音字读音与自然输入归一化', () => {
  assert.equal(getKinshipPinyin('曾外曾祖父'), 'zēng wài zēng zǔ fù');
  assert.equal(getKinshipPinyin('重孙'), 'chóng sūn');
  assert.equal(getKinshipPinyin('伯父'), 'bó fù');
  assert.equal(getKinshipPinyin('大爷'), 'dà yé');
  assert.equal(queryKinship(' 请问我的妈妈 → 妈妈叫什么？ ')[0].title, '外婆');
  assert.equal(queryKinship('伯爹')[0].title, '伯父');
  assert.equal(queryKinship('自己')[0].title, '自己');
  assert.equal(queryKinship('外婆', '全国通用', { target: '我' })[0].title, '外婆');
});

test('过长或候选组合过多的输入返回具体提示', () => {
  const long = analyzeKinship(Array(17).fill('爸爸').join('的'));
  const ambiguous = analyzeKinship(Array(9).fill('表哥').join('的'));
  assert.equal(long.status, 'unsupported');
  assert.ok(long.notices[0].includes('16 步'));
  assert.equal(ambiguous.status, 'unsupported');
  assert.ok(ambiguous.notices[0].includes('模糊称呼'));
});

test('截图中的女性配偶长链保留原意、完整路径和堂表分支', () => {
  const text = '妈妈的妈妈的哥哥的姐姐的妹妹的儿子的女儿的老婆的弟弟';
  const analysis = analyzeKinship(text);
  assert.equal(analysis.status, 'described');
  assert.deepEqual(analysis.results, []);
  assert.deepEqual(analysis.chains, [text]);
  assert.deepEqual(analysis.descriptions.map((item) => item.title), [
    '从母舅表姐的妻子的弟弟', '从母舅表妹的妻子的弟弟', '舅表姐的妻子的弟弟', '舅表妹的妻子的弟弟',
  ]);
  assert.equal(analysis.descriptions[2].pinyin, 'jiù biǎo jiě de qī zi de dì di');
  assert.ok(analysis.notices.some((notice) => notice.includes('第 8 步“女儿的老婆”')));
  assert.deepEqual(analyzeKinship(text, '北方').descriptions, analysis.descriptions);
  assert.deepEqual(analyzeKinship(text, '南方').results, []);
  assert.equal(analysis.suggestions[0].text, text.replace('老婆', '老公'));
  assert.equal(analysis.normalized, text);
});

test('用户确认改为老公后，同时列出固定称呼及未收录分支的关系描述', () => {
  const analysis = analyzeKinship('妈妈的妈妈的哥哥的姐姐的妹妹的儿子的女儿的老公的弟弟');
  assert.equal(analysis.status, 'matched');
  assert.deepEqual(analysis.results.map((item) => item.title), ['舅表姊妹姻兄弟']);
  assert.deepEqual(analysis.descriptions.map((item) => item.title), ['从母舅表姐夫的弟弟', '从母舅表妹夫的弟弟']);
  assert.equal(analysis.chains.length, 2);
  assert.deepEqual(analysis.suggestions, []);
});

test('男女同性配偶均可描述，未知词与关系缺失仍明确报错', () => {
  assert.equal(analyzeKinship('女儿的妻子的弟弟').descriptions[0].title, '女儿的妻子的弟弟');
  assert.equal(analyzeKinship('儿子的老公的妹妹').descriptions[0].title, '儿子的丈夫的妹妹');
  assert.equal(analyzeKinship('老婆', '全国通用', { sex: 0 }).descriptions[0].title, '妻子');
  const unknown = analyzeKinship('女儿的老婆的火星人');
  assert.equal(unknown.status, 'unsupported');
  assert.deepEqual(unknown.descriptions, []);
  assert.ok(unknown.notices.some((notice) => notice.includes('第 3 步“火星人”无法识别')));
  assert.equal(analyzeKinship('女儿的的老婆').status, 'unsupported');
});

test('未合并关系的相对视角与反查保留双方路径，避免冒用正向称呼', () => {
  const relative = analyzeKinship('外婆', '全国通用', { target: '女儿的老婆' });
  assert.equal(relative.status, 'described');
  assert.deepEqual(relative.results, []);
  assert.deepEqual(relative.descriptions, []);
  assert.deepEqual(relative.chains, []);
  assert.deepEqual(relative.referencePaths, [
    { label: '称呼人', relation: '女儿的老婆' }, { label: '对方', relation: '外婆' },
  ]);
  const reversed = analyzeKinship('女儿的老婆', '全国通用', { reverse: true });
  assert.deepEqual(reversed.descriptions, []);
  assert.deepEqual(reversed.referencePaths, [
    { label: '对方', relation: '自己' }, { label: '称呼人', relation: '女儿的老婆' },
  ]);
  assert.ok(reversed.notices[0].startsWith('称呼人关系：'));
  const invalidTarget = analyzeKinship('女儿的老婆', '全国通用', { target: '火星人' });
  assert.equal(invalidTarget.status, 'unsupported');
  assert.deepEqual(invalidTarget.referencePaths, []);
});
