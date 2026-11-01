import { useEffect, useMemo, useState } from 'react';
import { ArrowRight, CaretRight, Copy, MagnifyingGlass, SpeakerHigh, Sparkle, Swap, X } from '@phosphor-icons/react';
import { analyzeKinship, quickRelations, type KinshipOptions, type Region } from './lib/kinship';
import { explainKinship } from './lib/explanation';
import { TitleLookup } from './TitleLookup';

const regions: Region[] = ['全国通用', '北方', '南方'];
const relationButtons = ['爸爸', '妈妈', '哥哥', '弟弟', '姐姐', '妹妹', '老公', '老婆', '儿子', '女儿'];
type Query = { text: string; target: string; sex: -1 | 0 | 1; reverse: boolean };
const initialQuery: Query = { text: '妈妈的妈妈', target: '', sex: -1, reverse: false };

function App() {
  const [lookupMode, setLookupMode] = useState<'relation' | 'title'>('title');
  const [titleClearSignal, setTitleClearSignal] = useState(0);
  const [input, setInput] = useState(initialQuery.text);
  const [caller, setCaller] = useState<'me' | 'relative'>('me');
  const [target, setTarget] = useState('');
  const [sex, setSex] = useState<Query['sex']>(-1);
  const [reverse, setReverse] = useState(false);
  const [composing, setComposing] = useState(false);
  const [query, setQuery] = useState<Query>(initialQuery);
  const [region, setRegion] = useState<Region>('全国通用');
  const [feedback, setFeedback] = useState('');
  const [copyText, setCopyText] = useState('');

  useEffect(() => {
    if (composing) return;
    const timer = window.setTimeout(() => {
      setQuery({ text: input.trim(), target: caller === 'relative' ? target.trim() : '', sex, reverse });
    }, 220);
    return () => window.clearTimeout(timer);
  }, [input, caller, target, sex, reverse, composing]);

  useEffect(() => {
    if (!feedback) return;
    const timer = window.setTimeout(() => setFeedback(''), 4000);
    return () => window.clearTimeout(timer);
  }, [feedback]);

  const pending = composing || query.text !== input.trim() || query.target !== (caller === 'relative' ? target.trim() : '') || query.sex !== sex || query.reverse !== reverse;
  const options: KinshipOptions = useMemo(() => ({ target: query.target, sex: query.sex, reverse: query.reverse }), [query]);
  const analysis = useMemo(() => analyzeKinship(query.text, region, options), [query.text, region, options]);
  const explanation = useMemo(() => explainKinship(analysis, options), [analysis, options]);
  const comparison = useMemo(() => regions.slice(1).map((item) => ({ region: item, ...analyzeKinship(query.text, item, options) })), [query.text, options]);
  const { results, descriptions, chains, referencePaths, suggestions, notices } = analysis;
  const waitingForTarget = caller === 'relative' && !target.trim();
  const hasResult = !waitingForTarget && results.length > 0;
  const hasDescription = !waitingForTarget && descriptions.length > 0;
  const displayRows = [
    ...results.map((item) => ({ ...item, label: item.region === '全国通用' ? '通用称呼' : `${item.region}参考` })),
    ...descriptions.map((item) => ({ ...item, label: '关系描述', note: '暂未收录固定称谓' })),
  ];
  const search = (value = input) => {
    setInput(value);
    setQuery({ text: value.trim(), target: caller === 'relative' ? target.trim() : '', sex, reverse });
  };
  const clear = () => {
    setTitleClearSignal((value) => value + 1);
    setInput(''); setTarget(''); setQuery({ text: '', target: '', sex, reverse });
  };
  const append = (value: string) => {
    const text = input.trim().replace(/的$/u, '');
    search(text ? `${text}的${value}` : value);
  };
  const useExample = (text: string) => {
    setLookupMode('relation');
    setCaller('me'); setReverse(false); setInput(text);
    setQuery({ text, target: '', sex, reverse: false });
  };
  const speak = (text: string) => {
    if (!window.speechSynthesis || typeof window.speechSynthesis.speak !== 'function' || typeof window.SpeechSynthesisUtterance !== 'function') { setFeedback('当前环境不支持朗读，可以查看下方拼音。'); return; }
    try {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'zh-CN';
    utterance.rate = 0.85;
    const voice = window.speechSynthesis.getVoices().find((item) => /^zh[-_]CN$/iu.test(item.lang));
    if (voice) utterance.voice = voice;
    utterance.onerror = () => setFeedback('朗读未完成，请再试一次或查看普通话拼音。');
    window.speechSynthesis.speak(utterance);
    } catch { setFeedback('当前环境无法朗读，请查看普通话拼音。'); }
  };
  const copy = (text: string) => setCopyText(text);

  const heading = hasDescription ? hasResult ? '称呼与关系说明' : '这段关系可以这样描述' : reverse ? `对方怎么称呼${query.target ? '这位亲戚' : '我'}` : `${query.target ? '这位亲戚' : '我'}可以这样叫对方`;
  return (
    <main className="app-shell">
      <header className="topbar">
        <a className="brand" href="#top" aria-label="亲称首页"><span className="brand-mark"><Sparkle size={18} weight="fill" /></span><span>亲称</span></a>
        <span className="brand-sub">中国亲属称呼指南</span>
        <button className="ghost-button" type="button" onClick={clear}><X size={17} /> 清空</button>
      </header>

      <section className="hero" id="top">
        <div className="hero-copy">
          <div className="eyebrow"><span className="eyebrow-line" /> 家庭称谓计算器</div>
          <h1>这位亲戚，<em>怎么叫？</em></h1>
          <p className="hero-desc">输入称呼，弄清亲属关系；也能输入关系查称呼，查看拼音和南北方叫法。</p>
        </div>
        <aside className="guide-example" aria-label="查询示例">
          <span className="section-kicker">从关系到称呼</span>
          <div className="example-path"><span>我</span><CaretRight /><span>妈妈</span><CaretRight /><span>妈妈</span></div>
          <p><strong>外婆</strong><span>wài pó</span><span className="example-alias">北方常叫“姥姥”</span></p>
        </aside>
      </section>

      <div className="lookup-modes" role="group" aria-label="选择查询方式">
        <button type="button" aria-pressed={lookupMode === 'title'} className={lookupMode === 'title' ? 'active' : ''} onClick={() => setLookupMode('title')}><strong>输入称呼查关系</strong><span>姑妈 → 爸爸的姐姐或妹妹</span></button>
        <button type="button" aria-pressed={lookupMode === 'relation'} className={lookupMode === 'relation' ? 'active' : ''} onClick={() => setLookupMode('relation')}><strong>输入关系查称呼</strong><span>妈妈的妈妈 → 外婆</span></button>
      </div>
      <div hidden={lookupMode !== 'title'}><TitleLookup clearSignal={titleClearSignal} speak={speak} copy={copy} onUseRelation={useExample} /></div>
      <div hidden={lookupMode !== 'relation'}>
      <section className="query-panel" aria-label="设置亲属关系">
        <div className="perspective-row">
          <span className="control-label">谁来称呼？</span>
          <div className="segmented" role="group" aria-label="称呼人的视角">
            <button type="button" aria-pressed={caller === 'me'} className={caller === 'me' ? 'active' : ''} onClick={() => setCaller('me')}>我</button>
            <button type="button" aria-pressed={caller === 'relative'} className={caller === 'relative' ? 'active' : ''} onClick={() => setCaller('relative')}>我的某位亲戚</button>
          </div>
          <label className="sex-control">我的性别<select aria-label="我的性别" value={sex} onChange={(event) => setSex(Number(event.target.value) as Query['sex'])}><option value={-1}>未指定</option><option value={1}>男</option><option value={0}>女</option></select></label>
        </div>
        {caller === 'relative' && <div className="relative-field"><label htmlFor="caller-relation">称呼人和我的关系</label><input id="caller-relation" value={target} maxLength={160} onChange={(event) => setTarget(event.target.value)} placeholder="例如：舅妈" /><p>下面输入对方和我的关系，例如“外婆”，就能查出舅妈该怎么称呼外婆。</p></div>}
        <label className="input-label" htmlFor="relation-input">{caller === 'relative' ? '对方和我的关系' : '对方和我的关系（可以连续输入“的”）'}</label>
        <form className="search-wrap" onSubmit={(event) => { event.preventDefault(); search(); }}>
          <MagnifyingGlass className="search-icon" size={22} weight="bold" />
          <input id="relation-input" value={input} maxLength={160} onChange={(event) => setInput(event.target.value)} onCompositionStart={() => setComposing(true)} onCompositionEnd={() => setComposing(false)} placeholder="例如：我奶奶的爸爸的堂爹的表弟" aria-label="输入亲属关系" />
          {input && <button className="clear-input" type="button" onClick={() => search('')} aria-label="清空输入"><X size={16} /></button>}
          <button className="search-button" type="submit">查称呼 <ArrowRight size={17} weight="bold" /></button>
        </form>
        <div className="relation-builder" aria-label="点选关系"><span>接着选：</span>{relationButtons.map((value) => <button type="button" key={value} onClick={() => append(value)}>{value}</button>)}</div>
        <div className="query-bottom"><span>输入后自动查询，也可以点选关系。</span><label><input type="checkbox" checked={reverse} onChange={(event) => setReverse(event.target.checked)} /> 反过来：对方怎么称呼我{caller === 'relative' ? '的这位亲戚' : ''}</label></div>
        <div className="examples"><span>复杂关系试试：</span><button type="button" onClick={() => useExample('我奶奶的爸爸的堂爹的表弟')}>奶奶的爸爸的堂爹的表弟</button><button type="button" onClick={() => useExample('妈妈的哥哥的女儿')}>妈妈的哥哥的女儿</button></div>
      </section>

      <section className="workspace" aria-label="查询结果" aria-busy={pending}>
        <div className="section-heading"><div><span className="section-kicker">称呼结果 · 普通话拼音</span><h2>{heading}</h2></div><div className="region-controls"><div className="region-switch" role="group" aria-label="地区叫法"><Swap size={15} />{regions.map((item) => <button key={item} className={region === item ? 'active' : ''} onClick={() => setRegion(item)} type="button" aria-pressed={region === item}>{item}</button>)}</div>{region === '南方' && <span className="region-note">广东常见叫法示例，拼音为普通话读音</span>}</div></div>
        <div className="query-context">{pending ? '正在更新关系…' : waitingForTarget ? '请先填写称呼人和你的关系' : query.text ? `${query.reverse ? query.text : query.target || '我'} → ${query.reverse ? query.target || '我' : query.text}` : '输入关系或点选上方亲属，开始查询'}</div>
        {!waitingForTarget && !pending && notices.length > 0 && <div className="interpretation" role="status">{notices.map((notice) => <p key={notice}>{notice}</p>)}</div>}
        {!waitingForTarget && !pending && suggestions.length > 0 && <div className="correction-options">{suggestions.map((suggestion) => <button type="button" key={`${suggestion.text}-${suggestion.target}`} onClick={() => { setInput(suggestion.text); setTarget(suggestion.target); setQuery({ ...query, text: suggestion.text, target: suggestion.target }); }}>{suggestion.label} <ArrowRight size={15} /></button>)}</div>}
        {!waitingForTarget && !pending && explanation.answer && <section className="relationship-analysis" aria-label="称呼与关系分析">
          <div className="analysis-answer"><div><span className="section-kicker">该叫什么</span><p>{explanation.answer}</p></div><button type="button" onClick={() => speak(explanation.answer)}><SpeakerHigh size={18} /> 说叫什么</button></div>
          <details className="analysis-details" open>
            <summary>关系分析<span>逐步解释为什么这样叫</span></summary>
            <p className="analysis-context">{explanation.context}</p>
            {explanation.paths.map((path, index) => <div className="analysis-path" key={path.relation}>
              {explanation.paths.length > 1 && <h3>可能的路径 {index + 1}</h3>}
              <ol>{path.steps.map((step, stepIndex) => <li key={step.relation}><span className="analysis-step">{stepIndex + 1}</span><div><p>{step.relation}</p><strong>{step.meaning}</strong></div></li>)}</ol>
            </div>)}
            {descriptions.length > 0 && <p className="analysis-context">未收录固定称谓的分支可描述为：{descriptions.map((item) => item.title).join('；')}。</p>}
            <button className="analysis-speak" type="button" onClick={() => speak([explanation.answer, explanation.context, ...explanation.paths.flatMap((path) => path.steps.map((step, index) => `第${index + 1}步，${step.relation}，${step.meaning}。`)), ...descriptions.map((item) => `关系描述：${item.title}。`)].join(' '))}><SpeakerHigh size={17} /> 朗读关系分析</button>
          </details>
        </section>}
        <div className="result-layout">
          <div className="result-card">
            {hasResult || hasDescription ? displayRows.map((result, index) => <div className="result-row" key={`${result.title}-${index}`}><div className="result-index">{String(index + 1).padStart(2, '0')}</div><div className="result-text"><div className="result-title-line"><h3>{result.title}</h3><span className="main-tag">{result.label}</span></div><p className="pronunciation">{result.pinyin}</p>{result.note && <span className="result-note">{result.note}</span>}</div><div className="result-actions"><button type="button" disabled={pending} onClick={() => speak(result.title)} aria-label={`朗读${result.title}`}><SpeakerHigh size={19} /></button><button type="button" disabled={pending} onClick={() => copy(`${result.title} · ${result.pinyin}`)} aria-label={`复制${result.title}`}><Copy size={18} /></button></div></div>) : <div className="empty-result"><span className="empty-icon"><MagnifyingGlass size={26} /></span><h3>{waitingForTarget ? '先选定称呼人' : pending ? '正在解析关系' : !query.text ? '从一段关系开始' : analysis.status === 'described' ? '关系已识别，暂未收录固定称呼' : '这段关系还需要说明'}</h3><p>{waitingForTarget ? '填写上方亲戚和你的关系，例如“舅妈”。' : analysis.status === 'described' ? '可以根据下方关系路径向家人确认叫法。' : '支持爷奶、堂表亲、姻亲和多代关系，例如“爸爸的堂弟的儿子”。'}</p></div>}
            <div className="result-foot"><span>{hasDescription ? '关系描述保留原意，日常叫法请向家人确认' : results.length > 1 ? '年龄不明时会列出多个可能称呼' : '称呼可能因地区和家族习惯不同'}</span><button type="button" disabled={(!hasResult && !hasDescription) || pending} onClick={() => speak(displayRows[0].title)}>{hasDescription ? '朗读关系' : '朗读称呼'} <SpeakerHigh size={15} /></button></div>
          </div>
          <aside className="chain-card"><div className="chain-top"><span className="section-kicker">关系路径</span><Swap className="chain-icon" size={20} /></div><h3>一步步看清关系</h3>{!waitingForTarget && referencePaths.length > 0 ? <div className="chain-list">{referencePaths.map((path, index) => <div className="chain-option" key={`${path.label}-${index}`}><span>{path.label}和我的关系</span><p>{path.relation === '自己' ? '我（本人）' : `我 → ${path.relation.replace(/的/g, ' → ')}`}</p></div>)}</div> : !waitingForTarget && chains.length > 0 ? <div className="chain-list">{chains.slice(0, 3).map((chain, index) => <div className="chain-option" key={chain}>{chains.length > 1 && <span>可能的路径 {index + 1}</span>}<p>{query.reverse ? query.text : query.target || '我'} → {chain.replace(/的/g, ' → ')}</p></div>)}{chains.length > 3 && <details><summary>查看其余 {chains.length - 3} 条路径</summary>{chains.slice(3).map((chain) => <p key={chain}>{chain.replace(/的/g, ' → ')}</p>)}</details>}</div> : <p className="chain-placeholder">查询后展示关系的展开路径。</p>}<div className="chain-tip"><p>关系链按亲属顺序展开。不同地区与家族可能有自己的习惯称呼。</p></div></aside>
        </div>
        {(hasResult || hasDescription) && <div className="region-comparison" aria-label="南北方叫法对照">{comparison.map((item) => <div key={item.region}><div className="comparison-label">{item.region === '北方' ? '北方常见叫法' : '南方叫法 · 广东示例'}</div><p>{!hasResult ? '暂未收录对应固定叫法' : item.results.map((result) => result.title).join(' / ') || '暂无地区专属叫法'}</p><span>{!hasResult ? '可参考上方关系描述与普通话拼音' : item.results.some((result) => result.region === item.region) ? '地区参考 · 普通话拼音见上方' : '未收录专属叫法，沿用通用称呼'}</span></div>)}</div>}
      </section>
      <section className="quick-section"><div className="section-heading"><div><span className="section-kicker">常见关系</span><h2>点一下，直接查</h2></div><p className="section-side-copy">以“我”为视角查询</p></div><div className="quick-grid">{quickRelations.map((item) => <button key={item.label} className="quick-item" type="button" onClick={() => useExample(item.label)}><span className="quick-label">{item.label}</span><span className="quick-hint">{item.hint}</span><ArrowRight size={17} /></button>)}</div></section>
      </div>
      <footer><span>亲称 · 家庭称谓小工具</span><span>普通话拼音辅助读音；地区与家族习惯可能不同</span></footer>
      {feedback && <div className="feedback" role="status">{feedback}</div>}
      {copyText && <div className="copy-overlay"><section className="copy-dialog" role="dialog" aria-modal="true" aria-label="复制文本"><h3>选择文本</h3><p>请选择下方文字，使用当前环境提供的复制操作。</p><textarea autoFocus readOnly value={copyText} aria-label="待复制的称呼与关系" onFocus={(event) => event.currentTarget.select()} /><button type="button" onClick={() => setCopyText('')}>关闭</button></section></div>}
    </main>
  );
}

export default App;
