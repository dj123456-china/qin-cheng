import { useEffect, useMemo, useState } from 'react';
import { ArrowRight, Copy, MagnifyingGlass, SpeakerHigh, X } from '@phosphor-icons/react';
import { lookupTitle } from './lib/titleLookup';

const examples = ['姑妈', '舅舅', '姨妈', '嫂子', '表哥', '堂姐', '外婆', '侄女'];

export function TitleLookup({ clearSignal, speak, copy, onUseRelation }: {
  clearSignal: number;
  speak: (text: string) => void;
  copy: (text: string) => void;
  onUseRelation: (text: string) => void;
}) {
  const [input, setInput] = useState('姑妈');
  const [query, setQuery] = useState('姑妈');
  const [composing, setComposing] = useState(false);
  useEffect(() => {
    if (!clearSignal) return;
    setInput(''); setQuery('');
  }, [clearSignal]);
  useEffect(() => {
    if (composing) return;
    const timer = window.setTimeout(() => setQuery(input.trim()), 220);
    return () => window.clearTimeout(timer);
  }, [input, composing]);
  const result = useMemo(() => lookupTitle(query), [query]);
  const pending = composing || input.trim() !== query;
  const search = (value = input) => { setInput(value); setQuery(value.trim()); };
  const explanation = result.relations.length === 1
    ? `${result.title}是你的${result.relations[0].description}。`
    : `${result.title}可能对应以下 ${result.relations.length} 类关系。`;

  return <>
    <section className="query-panel" aria-label="输入称呼查关系">
      <label className="input-label" htmlFor="title-input">输入你对这位亲戚的称呼</label>
      <form className="search-wrap" onSubmit={(event) => { event.preventDefault(); search(); }}>
        <MagnifyingGlass className="search-icon" size={22} weight="bold" />
        <input id="title-input" aria-label="输入亲属称呼" value={input} maxLength={160} placeholder="例如：姑妈、舅舅、表哥" onChange={(event) => setInput(event.target.value)} onCompositionStart={() => setComposing(true)} onCompositionEnd={() => setComposing(false)} />
        {input && <button className="clear-input" type="button" aria-label="清空称呼" onClick={() => search('')}><X size={16} /></button>}
        <button className="search-button" type="submit">查关系 <ArrowRight size={17} weight="bold" /></button>
      </form>
      <p className="title-lookup-help">比如输入“姑妈”，查出她是你的爸爸的姐姐或妹妹。</p>
      <div className="relation-builder" aria-label="常见称呼"><span>试试：</span>{examples.map((title) => <button key={title} type="button" onClick={() => search(title)}>{title}</button>)}</div>
    </section>
    <section className="workspace title-workspace" aria-label="称呼对应的亲属关系" aria-busy={pending}>
      <div className="section-heading"><div><span className="section-kicker">从称呼到关系</span><h2>{result.relations.length ? `“${result.title}”是我的什么人？` : '查清这位亲戚和你的关系'}</h2></div></div>
      {pending ? <div className="empty-result"><h3>正在分析称呼…</h3></div> : result.relations.length ? <>
        <div className="title-definition">
          <div className="title-definition-heading"><div><strong>{result.title}</strong><p className="pronunciation">{result.pinyin}</p></div><button className="analysis-speak" type="button" onClick={() => speak(explanation)}><SpeakerHigh size={17} /> 朗读关系</button></div>
          <p className="title-definition-answer">{explanation}</p>
          {result.ageNote && <p className="analysis-context">{result.ageNote}</p>}
          {result.relations.length > 1 && <p className="analysis-context">同一个称呼可能对应不同的亲属分支，下面分别列出。</p>}
        </div>
        <div className="title-relations">{result.relations.map((relation, index) => <article className="title-relation" key={relation.chain}>
          <span className="section-kicker">{result.relations.length > 1 ? `可能的关系 ${index + 1}` : '关系展开'}</span>
          <h3>{relation.description}</h3><p className="pronunciation">{relation.pinyin}</p>
          <p className="title-relation-path">我 → {relation.chain.replace(/的/g, ' → ')}</p>
          <div className="title-relation-actions"><button type="button" onClick={() => speak(`${result.title}是你的${relation.description}。`)}><SpeakerHigh size={16} /> 朗读</button><button type="button" onClick={() => copy(`${result.title}（${result.pinyin}）：${relation.description} · ${relation.pinyin}`)}><Copy size={15} /> 复制</button><button type="button" onClick={() => onUseRelation(relation.chain)}>用这段关系查称呼 <ArrowRight size={15} /></button></div>
        </article>)}</div>
        {result.notices.length > 0 && <div className="interpretation">{result.notices.map((notice) => <p key={notice}>{notice}</p>)}</div>}
      </> : <div className="empty-result"><span className="empty-icon"><MagnifyingGlass size={26} /></span><h3>{result.status === 'empty' ? '输入一个亲属称呼' : '暂未识别这个称呼'}</h3><p>可以试试“姑妈”“嫂子”“外婆”；地方叫法可换成普通话常见称呼。</p>{result.notices.map((notice) => <p key={notice}>{notice}</p>)}</div>}
    </section>
  </>;
}
