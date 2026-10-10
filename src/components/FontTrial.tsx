import { useEffect, useId, useState } from 'react';
import { DEFAULT_ID_FONT, ID_FONTS, applyIdFont, saveIdFont, ID_FONT_KEY } from '../core/fonts';
import { useStored } from '../core/storage';

/** サイドバー下部の、ツールIDの書体の試用パネル（仮の機能。書体の決定後に削除する） */
export function FontTrial() {
  const [fontId] = useStored<string>(ID_FONT_KEY, DEFAULT_ID_FONT);
  const [open, setOpen] = useState(false);
  const id = useId();

  // 別のタブで変えた場合にも反映する
  useEffect(() => applyIdFont(fontId), [fontId]);

  const isDefault = fontId === DEFAULT_ID_FONT;

  return (
    <div className="font-trial">
      <button type="button" className="font-trial__toggle" aria-expanded={open} aria-controls={`${id}-panel`} onClick={() => setOpen(!open)}>
        <span aria-hidden="true" className="font-trial__aa">Aa</span>
        IDの書体を試す
        {!isDefault && <span className="font-trial__badge">変更中</span>}
      </button>
      {open && (
        <div id={`${id}-panel`} className="font-trial__panel">
          <label htmlFor={`${id}-font`}>ツールID（XX-01）の書体</label>
          <select id={`${id}-font`} value={fontId} onChange={(e) => saveIdFont(e.target.value)}>
            {ID_FONTS.map((f) => (
              <option key={f.id} value={f.id}>
                {f.label}
              </option>
            ))}
          </select>
          <p className="font-trial__sample">
            <span className="tool-id">EL-01</span>　電圧降下 4.40 V
          </p>
          <button type="button" className="font-trial__reset" onClick={() => saveIdFont(DEFAULT_ID_FONT)} disabled={isDefault}>
            現在の書体に戻す
          </button>
          <p className="font-trial__note">試用のための仮の機能です。本文・数値は Noto Sans JP で固定しています。選んだ書体はこのブラウザにだけ保存されます。</p>
        </div>
      )}
    </div>
  );
}
