import { analyzeKinship, getKinshipPinyin } from './kinship';

export function lookupTitle(text: string) {
  const analysis = analyzeKinship(text);
  const title = analysis.normalized;
  const chains = [...analysis.chains];
  // 泛称“表哥/表姐”也包括姨表亲，库中的泛称条目没有覆盖这一支。
  if (/^表[哥弟兄姐姊妹]$/.test(title) && chains.length) {
    const child = /[姐姊妹]$/.test(title) ? '女儿' : '儿子';
    chains.push(`妈妈的姐妹的${child}`);
  }
  const relations = [...new Set(chains)].map((chain) => {
    const description = chain.split('的').map((part) => part === '姐妹' ? '姐姐或妹妹' : part === '兄弟' ? '哥哥或弟弟' : part).join('的');
    return { chain, description, pinyin: getKinshipPinyin(description) };
  });
  const ageMatch = title.match(/^(?:堂|表|姑表|舅表|姨表)(哥|兄|姐|姊|弟|妹)$/);
  const ageNote = ageMatch
    ? `这个称呼中的“${ageMatch[1]}”表示对方比你${/[哥兄姐姊]/.test(ageMatch[1]) ? '年长' : '年幼'}，父母一辈的长幼不能由此确定。`
    : '';
  return {
    title,
    pinyin: relations.length ? getKinshipPinyin(title) : '',
    relations,
    ageNote,
    notices: analysis.notices,
    status: relations.length ? 'matched' as const : analysis.status === 'empty' ? 'empty' as const : 'unsupported' as const,
  };
}
