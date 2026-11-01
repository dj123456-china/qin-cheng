import relationship from 'relationship.js';
import modes from 'relationship.js/mode';
import { pinyin } from 'pinyin-pro';

relationship.setMode('north', modes.north.data);
relationship.setMode('south', modes.guangdong.data);

export type Region = '全国通用' | '北方' | '南方';
export type RelationResult = {
  title: string;
  pinyin: string;
  region: Region;
  note?: string;
};

export type KinshipOptions = {
  /** 称呼者与自己的关系；空字符串表示自己。 */
  target?: string;
  /** 自己的性别：-1 未指定，0 女性，1 男性。 */
  sex?: -1 | 0 | 1;
  reverse?: boolean;
};

export type KinshipAnalysis = {
  results: RelationResult[];
  descriptions: { title: string; pinyin: string }[];
  chains: string[];
  referencePaths: { label: '称呼人' | '对方'; relation: string }[];
  suggestions: { label: string; text: string; target: string }[];
  notices: string[];
  normalized: string;
  status: 'matched' | 'described' | 'unsupported' | 'empty';
};

export const quickRelations = [
  { label: '妈妈的妈妈', hint: '外婆 / 姥姥' },
  { label: '爸爸的爸爸', hint: '爷爷' },
  { label: '爸爸的哥哥', hint: '伯父 / 大爷' },
  { label: '爸爸的弟弟', hint: '叔叔' },
  { label: '妈妈的哥哥', hint: '舅舅' },
  { label: '妈妈的姐姐', hint: '姨妈 / 姨母' },
  { label: '妈妈的哥哥的儿子', hint: '表哥 / 表弟' },
  { label: '爸爸的哥哥的女儿', hint: '堂姐 / 堂妹' },
  { label: '奶奶的爸爸的堂爹的表弟', hint: '复杂关系 / 方言称呼' },
  { label: '爸爸的堂兄弟', hint: '堂伯 / 堂叔' },
  { label: '姐姐的女儿', hint: '外甥女' },
  { label: '儿子的儿子', hint: '孙子' },
];

const regionMode: Record<Region, string> = { '全国通用': 'default', 北方: 'north', 南方: 'south' };

function unique(values: string[]) {
  return [...new Set(values.filter(Boolean))];
}

function normalizeRelation(text: string) {
  if (/^(?:我|自己|本人|我自己)$/.test(text.trim())) return '自己';
  return text
    .trim()
    .replace(/\s+/g, '')
    .replace(/^请问[，,]?/, '')
    .replace(/[？?。！!，,；;]+$/g, '')
    .replace(/(?:应该|该)?(?:怎么称呼他|怎么称呼|如何称呼|叫什么|怎么叫|怎么喊)$/, '')
    .replace(/(?:→|->|=>)/g, '的')
    .replace(/之/g, '的')
    .replace(/^我(?:的)?(?=.)/, '')
    .replace(/^自己(?:的)?(?=.)/, '');
}

/** 拼音是普通话读音，地区称呼并不等同于当地的方言发音。 */
export function getKinshipPinyin(title: string) {
  const syllables = pinyin(title, { toneType: 'symbol', type: 'array' });
  return syllables.map((syllable, index) => {
    const character = title[index];
    if (character === '曾') return 'zēng';
    if (character === '重') return 'chóng';
    if (character === '伯') return 'bó';
    if (character === '子' && title[index - 1] === '妻') return 'zi';
    if (character === '爷' && title[index - 1] === '大') return 'yé';
    return syllable;
  }).join(' ');
}

function relationVariants(text: string, notices: string[], label: string) {
  let variants = [''];
  for (const part of text.split('的')) {
    let alternatives = [part];
    if (part === '堂爹' || part === '堂爸') {
      alternatives = ['堂伯父', '堂叔父'];
      notices.push(`“${part}”按“父亲的堂兄弟”解析，长幼未知，列出堂伯、堂叔候选。方言用法可能不同。`);
    } else if (part === '伯爹' || part === '伯爸') {
      alternatives = ['伯父'];
      notices.push(`${label}中的“${part}”按“父亲的哥哥（伯父）”解析。`);
    }
    variants = variants.flatMap((prefix) => alternatives.map((alternative) => prefix ? `${prefix}的${alternative}` : alternative));
  }
  return variants;
}

const partCandidateCounts = new Map<string, number>();

function inputLimitNotice(text: string, target: string) {
  const relations = [text, target];
  if (relations.some((relation) => relation.length > 200 || relation.split('的').length > 16)) {
    return '关系链过长，请分成较短的关系查询（每段关系最多 16 步、200 字）。';
  }
  let possibleChains = 1;
  for (const part of relations.flatMap((relation) => relation.split('的'))) {
    let count = partCandidateCounts.get(part);
    if (count === undefined) {
      count = part === '堂爹' || part === '堂爸' ? 2 : relationship({ text: part, type: 'chain' }).length;
      if (partCandidateCounts.size > 256) partCandidateCounts.clear();
      partCandidateCounts.set(part, count);
    }
    possibleChains *= Math.max(count, 1);
    if (possibleChains > 128) return '这段关系包含过多模糊称呼，请用“爸爸的姐姐的儿子”等具体关系替代，或分段查询。';
  }
  return '';
}

/** 传统称谓库无法合并的关系，仍可逐词识别并保留原意。 */
function describeRelation(text: string, sex: number) {
  const parts = text.split('的');
  const unknown = parts.findIndex((part) => !part || !relationship({ text: part, type: 'chain' }).length);
  if (unknown !== -1) {
    return { notice: `第 ${unknown + 1} 步“${parts[unknown] || '空白'}”无法识别，请使用具体亲属称呼。`, descriptions: [], recognized: false };
  }

  for (let index = 0; index < parts.length; index++) {
    const prefix = parts.slice(0, index + 1).join('的');
    if (relationship({ text: prefix, sex, type: 'chain' }).length) continue;

    const previous = parts.slice(0, index).join('的');
    const previousChains = index ? relationship({ text: previous, sex, type: 'chain' }) : ['自己'];
    const spouse = relationship({ text: parts[index], type: 'chain' });
    const lastParts = previousChains.map((chain) => chain.split('的').at(-1));
    const female = index ? lastParts.every((part) => ['妈妈', '老婆', '女儿', '姐姐', '妹妹', '姐妹'].includes(part ?? '')) : sex === 0;
    const male = index ? lastParts.every((part) => ['爸爸', '老公', '儿子', '哥哥', '弟弟', '兄弟'].includes(part ?? '')) : sex === 1;
    const sameSexSpouse = (female && spouse.length === 1 && spouse[0] === '老婆') || (male && spouse.length === 1 && spouse[0] === '老公');
    const step = index ? `${parts[index - 1]}的${parts[index]}` : parts[index];
    const notice = sameSexSpouse
      ? `第 ${index + 1} 步“${step}”按${female ? '女性的女性' : '男性的男性'}配偶理解，当前称谓库未覆盖这一组合。`
      : `称谓库暂未覆盖第 ${index + 1} 步“${step}”的组合，已按原意保留关系。`;
    const prefixTitles = index ? relationship({ text: previous, sex }) : ['自己'];
    const suffix = parts.slice(index).map((part) => {
      const chains = relationship({ text: part, type: 'chain' });
      if (chains.length === 1 && chains[0] === '老婆') return '妻子';
      if (chains.length === 1 && chains[0] === '老公') return '丈夫';
      return part;
    }).join('的');
    const descriptions = unique((prefixTitles.length ? prefixTitles : [previous || '自己'])
      .map((title) => title === '自己' ? suffix : `${title}的${suffix}`));
    const replacement = female ? '老公' : '老婆';
    const suggestion = sameSexSpouse ? {
      label: `若想表达“${female ? '丈夫' : '妻子'}”，将第 ${index + 1} 步改为“${replacement}”`,
      relation: parts.map((part, partIndex) => partIndex === index ? replacement : part).join('的'),
    } : undefined;
    return { notice, descriptions, recognized: true, suggestion };
  }
  return { notice: '', descriptions: [], recognized: true };
}

function describeUnmergedRelations(
  texts: string[], targets: string[], sex: number, reverse: boolean, empty: KinshipAnalysis,
): KinshipAnalysis {
  const textDescriptions = texts.map((text) => describeRelation(text, sex));
  const targetDescriptions = targets.filter(Boolean).map((target) => describeRelation(target, sex));
  const invalidText = textDescriptions.find((item) => !item.recognized);
  const invalidTarget = targetDescriptions.find((item) => !item.recognized);
  const textLabel = reverse ? '称呼人关系' : '对方关系';
  const targetLabel = reverse ? '对方关系' : '称呼人关系';
  if (invalidText || invalidTarget) {
    const notice = invalidTarget ? `${targetLabel}：${invalidTarget.notice}` : `${textLabel}：${invalidText!.notice}`;
    return { ...empty, notices: unique([...empty.notices, notice]) };
  }

  const notices = [...empty.notices];
  const suggestions = [
    ...textDescriptions.flatMap((item) => item.suggestion ? [{ label: item.suggestion.label, text: item.suggestion.relation, target: targets[0] || '' }] : []),
    ...targetDescriptions.flatMap((item) => item.suggestion ? [{ label: `${targetLabel}：${item.suggestion.label}`, text: texts[0], target: item.suggestion.relation }] : []),
  ];
  for (const item of textDescriptions) if (item.notice) notices.push(`${textLabel}：${item.notice}`);
  for (const item of targetDescriptions) if (item.notice) notices.push(`${targetLabel}：${item.notice}`);
  const needsBothPaths = reverse || targets.some((target) => target && target !== '自己');
  if (needsBothPaths) {
    notices.push('已保留双方相对于“我”的关系；暂未算出两人之间的固定称谓，请结合关系向家人确认叫法。');
    const referencePaths: KinshipAnalysis['referencePaths'] = [
      ...targets.map((target) => ({ label: reverse ? '对方' as const : '称呼人' as const, relation: target || '自己' })),
      ...texts.map((text) => ({ label: reverse ? '称呼人' as const : '对方' as const, relation: text })),
    ];
    return { ...empty, referencePaths, suggestions, notices: unique(notices), status: 'described' };
  }

  const descriptions = unique(textDescriptions.flatMap((item) => item.descriptions))
    .map((title) => ({ title, pinyin: getKinshipPinyin(title) }));
  notices.push('以下为关系描述，暂未收录对应固定称谓及南北方专属叫法，可向家人确认日常称呼。');
  return { ...empty, descriptions, chains: unique(texts), suggestions, notices: unique(notices), status: 'described' };
}

function describeKnownChain(chain: string) {
  const parts = chain.split('的');
  for (let length = parts.length - 1; length > 0; length--) {
    const titles = relationship({ text: parts.slice(0, length).join('的') });
    if (titles.length) return titles.map((title) => `${title}的${parts.slice(length).join('的')}`);
  }
  return [chain];
}

export function analyzeKinship(text: string, region: Region = '全国通用', options: KinshipOptions = {}): KinshipAnalysis {
  const normalized = normalizeRelation(text);
  const notices: string[] = [];
  const empty: KinshipAnalysis = { results: [], descriptions: [], chains: [], referencePaths: [], suggestions: [], notices, normalized, status: normalized ? 'unsupported' : 'empty' };
  if (!normalized) return empty;

  const target = options.target?.trim() ? normalizeRelation(options.target) : '';
  const limitNotice = inputLimitNotice(normalized, target);
  if (limitNotice) return { ...empty, notices: [limitNotice] };
  const texts = relationVariants(normalized, notices, '关系');
  const targets = target ? relationVariants(target, notices, '称呼者关系') : [''];
  const base = { sex: options.sex ?? -1, reverse: options.reverse ?? false, mode: regionMode[region] };

  // 库会把无法识别的 target 当作自己。单独校验，避免返回错误的相对称呼。
  const validTargets = targets.filter((candidate) => !candidate || relationship({ text: candidate, sex: base.sex, type: 'chain' }).length > 0);
  if (options.target?.trim() && !target) {
    notices.push('无法识别称呼者的关系，请用“妈妈”“舅舅”等亲属关系描述。');
    return { ...empty, notices: unique(notices).slice(0, 3), status: 'unsupported' };
  }
  if (!validTargets.length) return describeUnmergedRelations(texts, targets, base.sex, base.reverse, empty);

  const titles: string[] = [];
  const defaultTitles: string[] = [];
  const chains: string[] = [];
  for (const candidate of texts) {
    for (const relative of validTargets) {
      const query = { ...base, text: candidate, target: relative };
      const current = relationship(query);
      titles.push(...current);
      const common = region === '全国通用' ? current : relationship({ ...query, mode: 'default' });
      defaultTitles.push(...common);
      if (region !== '全国通用') titles.push(...common);
      // 能解析的长关系可能没有收录固定称谓，关系链仍可用于解释。
      chains.push(...relationship({ ...query, mode: 'default', type: 'chain' }));
    }
  }

  const uniqueTitles = unique(titles);
  const uniqueChains = unique(chains);
  if (!uniqueTitles.length && !uniqueChains.length) {
    return describeUnmergedRelations(texts, targets, base.sex, base.reverse, empty);
  }
  const results = uniqueTitles.map((title, index) => ({
    title,
    pinyin: getKinshipPinyin(title),
    region: defaultTitles.includes(title) ? '全国通用' as Region : region,
    note: index > 0 ? '其他称呼或关系候选' : undefined,
  }));
  const descriptions = unique(uniqueChains.filter((chain) => !relationship({ text: chain }).length)
    .flatMap(describeKnownChain)).map((title) => ({ title, pinyin: getKinshipPinyin(title) }));
  const hasAgeAlternatives = [['哥', '弟'], ['姐', '妹'], ['伯', '叔']].some(([older, younger]) =>
    uniqueTitles.some((title) => title.includes(older) && uniqueTitles.includes(title.replaceAll(older, younger))));
  if (hasAgeAlternatives && !notices.some((notice) => notice.includes('长幼未知'))) {
    notices.push('未说明相关亲属的年龄，称呼可能需要按长幼进一步区分。');
  }
  if (region === '南方') notices.push('南方叫法采用广东常见称呼参考；拼音为普通话读音。');
  if (!results.length && uniqueChains.length) notices.push('已识别这段关系，暂未收录统一的固定称谓，可按关系链说明。');
  if (results.length && descriptions.length) notices.push('部分亲属分支暂未收录固定称谓，已补充关系描述与拼音。');
  const status = results.length ? 'matched' : uniqueChains.length ? 'described' : 'unsupported';
  return { results, descriptions, chains: uniqueChains, referencePaths: [], suggestions: [], notices: unique(notices).slice(0, 3), normalized, status };
}

export function queryKinship(text: string, region: Region = '全国通用', options: KinshipOptions = {}): RelationResult[] {
  return analyzeKinship(text, region, options).results;
}

export function explainRelation(text: string, options: KinshipOptions = {}) {
  return analyzeKinship(text, '全国通用', options).chains[0] ?? '';
}

