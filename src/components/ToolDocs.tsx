import type { BeginnerDoc, ToolDoc } from '../core/types';

/** 計算式の解説と、記号・略号の説明表 */
export function FormulaDoc({ doc }: { doc: ToolDoc }) {
  return (
    <>
      <ol className="formula-list">
        {doc.formulas.map((f) => (
          <li key={f.title} className="formula">
            <div className="formula__title">{f.title}</div>
            <div className="formula__expr">{f.expr}</div>
            <p className="formula__body">{f.body}</p>
          </li>
        ))}
      </ol>
      <h3 className="doc-subhead">記号と略号</h3>
      <div className="table-wrap">
        <table className="symbol-table">
          <thead>
            <tr>
              <th scope="col">記号</th>
              <th scope="col">何の略か・由来</th>
              <th scope="col">意味</th>
              <th scope="col">単位</th>
            </tr>
          </thead>
          <tbody>
            {doc.symbols.map((s) => (
              <tr key={s.symbol}>
                <th scope="row" className="symbol-table__sym">
                  {s.symbol}
                </th>
                <td className="symbol-table__origin">{s.origin}</td>
                <td>{s.meaning}</td>
                <td className="symbol-table__unit">{s.unit ?? '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

/** 初学者向けの解説。ページ末尾に折りたたみで置く */
export function BeginnerGuide({ doc }: { doc: BeginnerDoc }) {
  return (
    <details className="beginner">
      <summary>
        <span className="beginner__title">初学者向けの解説</span>
        <span className="beginner__hint">何を求める計算か・用語と単位・計算例・よくある間違い</span>
      </summary>
      <div className="beginner__body">
        <section>
          <h3>そもそも何を求める計算か</h3>
          {doc.purpose.map((p) => (
            <p key={p}>{p}</p>
          ))}
        </section>
        <section>
          <h3>用語と単位</h3>
          <dl className="beginner__terms">
            {doc.terms.map((t) => (
              <div key={t.term}>
                <dt>{t.term}</dt>
                <dd>{t.desc}</dd>
              </div>
            ))}
          </dl>
        </section>
        <section>
          <h3>計算例（手計算）</h3>
          <p className="beginner__example-title">{doc.example.title}</p>
          <ol className="beginner__steps">
            {doc.example.steps.map((s) => (
              <li key={s}>{s}</li>
            ))}
          </ol>
        </section>
        <section>
          <h3>よくある間違い・注意点</h3>
          <ul>
            {doc.pitfalls.map((p) => (
              <li key={p}>{p}</li>
            ))}
          </ul>
        </section>
      </div>
    </details>
  );
}
