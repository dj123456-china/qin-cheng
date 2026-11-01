import relationship from 'relationship.js';
import { type KinshipAnalysis, type KinshipOptions } from './kinship';

export type RelationshipExplanation = {
  answer: string;
  context: string;
  paths: { relation: string; steps: { relation: string; meaning: string }[] }[];
};

/** 所有中间结论都相对于当前称呼人，反查时采用已反转的关系链。 */
export function explainKinship(analysis: KinshipAnalysis, options: KinshipOptions = {}): RelationshipExplanation {
  const relative = options.target?.trim();
  const caller = options.reverse ? '对方' : relative ? '这位亲戚' : '我';
  const recipient = options.reverse ? relative ? '这位亲戚' : '我' : '对方';
  const titles = analysis.results.map((item) => `“${item.title}”`).join('、');
  const answer = titles
    ? `${caller}可以称呼${recipient}为${titles}。`
    : analysis.status === 'described'
      ? '暂未查到固定称呼，可以先说明亲属关系，再向家人确认日常叫法。'
      : '';
  if (!answer) return { answer: '', context: '', paths: [] };
  if (analysis.referencePaths.length) {
    return { answer, context: '双方与“我”的关系已列在关系路径中，目前还不能合并成准确的相对称呼。', paths: [] };
  }

  const startsFromMe = !options.reverse && (!relative || /^(?:我|自己|本人|我自己)$/.test(relative));
  // 普通正向输入保留用户的每一步；方言词按查询时相同的候选展开。
  const useOriginal = startsFromMe && !/堂爹|堂爸|伯爹|伯爸/.test(analysis.normalized);
  const paths = (useOriginal ? [analysis.normalized] : analysis.chains).slice(0, 3).map((relation) => {
    const parts = relation.split('的');
    return {
      relation,
      steps: parts.map((_, index) => {
        const prefix = parts.slice(0, index + 1).join('的');
        const meanings = relationship({ text: prefix, sex: startsFromMe ? options.sex ?? -1 : -1 });
        return { relation: prefix, meaning: meanings.length ? meanings.join(' / ') : '暂无固定称呼，保留这段关系继续分析' };
      }),
    };
  });
  return {
    answer,
    context: `以${caller}为起点，逐步加入亲属关系。每一步的称呼都相对于${caller}；有多个候选时，需要结合长幼和家庭情况确认。`,
    paths,
  };
}
