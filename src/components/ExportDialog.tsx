import { useEffect, useId, useRef } from 'react';
import { useStored } from '../core/storage';
import {
  DEFAULT_EXPORT_OPTIONS,
  EMPTY_PROJECT,
  EXPORT_OPTION_FIELDS,
  PROJECT_FIELDS,
  type ExportOptions,
  type ProjectInfo,
} from '../core/project';
import { Icon } from './Icon';

interface Props {
  open: boolean;
  busy: boolean;
  error: string | null;
  onClose: () => void;
  onExport: (project: ProjectInfo, options: ExportOptions) => void;
}

/**
 * Excel 計算書の出力設定。案件情報（表題欄・表紙に入る）と構成の選択を端末に保存し、
 * すべてのツールで共通に使う。
 */
export function ExportDialog({ open, busy, error, onClose, onExport }: Props) {
  const [savedProject, setProject] = useStored<ProjectInfo>('project', EMPTY_PROJECT);
  const [savedOptions, setOptions] = useStored<ExportOptions>('exportOptions', DEFAULT_EXPORT_OPTIONS);
  // 保存済みの値に、後から追加された項目の既定値を補う
  const project = { ...EMPTY_PROJECT, ...savedProject };
  const options = { ...DEFAULT_EXPORT_OPTIONS, ...savedOptions };
  const id = useId();
  const firstRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) firstRef.current?.focus();
  }, [open]);

  if (!open) return null;

  return (
    <div className="dialog-backdrop" onMouseDown={onClose}>
      <div
        className="dialog export-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby={`${id}-title`}
        onMouseDown={(e) => e.stopPropagation()}
        onKeyDown={(e) => {
          if (e.key === 'Escape') onClose();
        }}
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            onExport(project, options);
          }}
        >
          <div className="export-dialog__head">
            <h2 id={`${id}-title`}>Excel 計算書の出力</h2>
            <button type="button" className="btn btn--text btn--icon" aria-label="閉じる" onClick={onClose}>
              <Icon name="x" size={18} />
            </button>
          </div>

          <div className="export-dialog__body">
            <fieldset className="export-dialog__group">
              <legend>表題欄・表紙に入れる内容</legend>
              <p className="muted small">入力した内容はこの端末に保存され、ほかのツールの計算書にも入ります。空欄のままでも出力できます。</p>
              {PROJECT_FIELDS.map((f, i) => (
                <div className="field" key={f.key}>
                  <label className="field__label" htmlFor={`${id}-${f.key}`}>
                    {f.label}
                  </label>
                  <input
                    ref={i === 0 ? firstRef : undefined}
                    id={`${id}-${f.key}`}
                    className="input"
                    type="text"
                    autoComplete="off"
                    value={project[f.key]}
                    placeholder={f.placeholder}
                    onChange={(e) => setProject({ ...project, [f.key]: e.target.value })}
                  />
                </div>
              ))}
            </fieldset>

            <fieldset className="export-dialog__group">
              <legend>計算書に含める内容</legend>
              <p className="muted small">計算書本体（入力値・計算式・結果）は常に含みます。</p>
              {EXPORT_OPTION_FIELDS.map((f) => (
                <label className="check" key={f.key}>
                  <input
                    type="checkbox"
                    checked={options[f.key]}
                    onChange={(e) => setOptions({ ...options, [f.key]: e.target.checked })}
                  />
                  <span>
                    <span className="check__label">{f.label}</span>
                    <span className="check__desc">{f.desc}</span>
                  </span>
                </label>
              ))}
            </fieldset>
          </div>

          {error && (
            <p className="alert export-dialog__error" role="alert">
              {error}
            </p>
          )}
          <div className="export-dialog__foot">
            <button type="button" className="btn btn--outline" onClick={onClose}>
              キャンセル
            </button>
            <button type="submit" className="btn btn--primary" disabled={busy}>
              <Icon name="download" size={16} /> {busy ? '作成中…' : '出力する'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
