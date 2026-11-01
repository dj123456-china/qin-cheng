import assert from 'node:assert/strict';
import test from 'node:test';
import { lookupTitle } from './titleLookup';

test('输入姑妈查出爸爸的姐姐或妹妹，并保留别名与长幼区别', () => {
  const result = lookupTitle('姑妈');
  assert.equal(result.pinyin, 'gū mā');
  assert.equal(result.relations[0].description, '爸爸的姐姐或妹妹');
  assert.deepEqual(lookupTitle('姑姑').relations, result.relations);
  assert.equal(lookupTitle('大姑').relations[0].description, '爸爸的姐姐');
  assert.equal(lookupTitle('小姑').relations[0].description, '爸爸的妹妹');
});

test('亲属称呼展开父母、兄弟姐妹与配偶关系', () => {
  assert.equal(lookupTitle('舅舅').relations[0].description, '妈妈的哥哥或弟弟');
  assert.equal(lookupTitle('姨妈').relations[0].description, '妈妈的姐姐或妹妹');
  assert.equal(lookupTitle('嫂子').relations[0].description, '哥哥的老婆');
  assert.equal(lookupTitle('婆婆').relations[0].description, '老公的妈妈');
  assert.equal(lookupTitle('外婆').relations[0].description, '妈妈的妈妈');
});

test('表亲称呼保留姑表、舅表、姨表三类路径及本人的长幼条件', () => {
  const older = lookupTitle('表哥');
  assert.deepEqual(older.relations.map((item) => item.chain), [
    '爸爸的姐妹的儿子', '妈妈的兄弟的儿子', '妈妈的姐妹的儿子',
  ]);
  assert.ok(older.ageNote.includes('对方比你年长'));
  assert.ok(lookupTitle('表妹').ageNote.includes('对方比你年幼'));
  assert.equal(lookupTitle('堂姐').relations.length, 1);
  assert.equal(lookupTitle('堂姐').relations[0].chain, '爸爸的兄弟的女儿');
});

test('未知称呼、空输入与过长输入不产生关系定义', () => {
  assert.equal(lookupTitle('火星人').status, 'unsupported');
  assert.deepEqual(lookupTitle('火星人').relations, []);
  assert.equal(lookupTitle(' ').status, 'empty');
  assert.deepEqual(lookupTitle(Array(17).fill('爸爸').join('的')).relations, []);
});
