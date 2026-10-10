import { useEffect, useId, useState } from 'react';
import { BODY_FONTS, DEFAULT_FONTS, NUM_FONTS, applyFonts, saveFontChoice, type FontChoice } from '../core/fonts';
import { useStored } from '../core/storage';

/** サイドバー下部のフォント試用パネル（仮の機能。フォント決定後に削除する） */
export function FontTrial() {
  const [choice] = useStored<FontChoice>('fonts', DEFAULT_FONTS);
  const [open, setOpen] = useState(false);
  const id = useId();
  const current = { ...DEFAULT_FONTS, ...choice };

  // 別のタブで変えた場合にも反映する
  useEffect(() => applyFonts({ body: current.body, num: current.num }), [current.body, current.num]);

  const isDefault = current.body === DEFAULT_FONTS.body && current.num === DEFAULT_FONTS.num;

  return (
    <div className="font-trial">
      <button type="button" className="font-trial__toggle" aria-expanded={open} aria-controls={`${id}-panel`} onClick={() => setOpen(!open)}>
        <span aria-hidden="true" className="font-trial__aa">Aa</span>
        フォントを試す
        {!isDefault && <span className="font-trial__badge">変更中</span>}
      </button>
      {open && (
        <div id={`${id}-panel`} className="font-trial__panel">
          <label htmlFor={`${id}-body`}>本文・操作部品</label>
          <select id={`${id}-body`} value={current.body} onChange={(e) => saveFontChoice({ ...current, body: e.target.value })}>
            {BODY_FONTS.map((f) => (
              <option key={f.id} value={f.id}>
                {f.label}
              </option>
            ))}
          </select>
          <label htmlFor={`${id}-num`}>数値・ID・計算式</label>
          <select id={`${id}-num`} value={current.num} onChange={(e) => saveFontChoice({ ...current, num: e.target.value })}>
            {NUM_FONTS.map((f) => (
              <option key={f.id} value={f.id}>
                {f.label}
              </option>
            ))}
          </select>
          <p className="font-trial__sample">
            電圧降下 <span className="num">4.40 V</span>　<span className="mono">EL-01</span>
          </p>
          <button type="button" className="font-trial__reset" onClick={() => saveFontChoice(DEFAULT_FONTS)} disabled={isDefault}>
            現在のフォントに戻す
          </button>
          <p className="font-trial__note">試用のための仮の機能です。選んだフォントはこのブラウザにだけ保存されます。</p>
        </div>
      )}
    </div>
  );
}
