import { useId } from 'react';
import type { Field, NumberField, RawValues, SelectField, TableField } from '../core/types';
import { isVisible, rawTableRows, tableErrorKey } from '../core/values';
import { Icon } from './Icon';

interface Props {
  fields: Field[];
  values: RawValues;
  errors: Record<string, string>;
  onChange: (patch: RawValues) => void;
}

export function FieldList({ fields, values, errors, onChange }: Props) {
  return (
    <div className="fields">
      {fields
        .filter((f) => isVisible(f, values))
        .map((f) =>
          f.type === 'number' ? (
            <NumberInput key={f.key} field={f} value={values[f.key] ?? ''} error={errors[f.key]} onChange={onChange} />
          ) : f.type === 'table' ? (
            <TableInput key={f.key} field={f} value={values[f.key]} errors={errors} onChange={onChange} />
          ) : (
            <SelectInput key={f.key} field={f} value={values[f.key] ?? ''} onChange={onChange} />
          ),
        )}
    </div>
  );
}

function NumberInput({
  field,
  value,
  error,
  onChange,
}: {
  field: NumberField;
  value: string;
  error?: string;
  onChange: Props['onChange'];
}) {
  const id = useId();
  return (
    <div className={`field ${error ? 'has-error' : ''}`}>
      <label htmlFor={id} className="field__label">
        {field.label}
      </label>
      <div className="field__control">
        <input
          id={id}
          className="input"
          type="text"
          inputMode="decimal"
          autoComplete="off"
          value={value}
          aria-invalid={!!error}
          aria-describedby={error || field.help ? `${id}-desc` : undefined}
          onChange={(e) => onChange({ [field.key]: e.target.value })}
          onFocus={(e) => e.target.select()}
        />
        {field.unit && <span className="field__unit">{field.unit}</span>}
      </div>
      {field.suggestions && (
        <div className="chips" role="group" aria-label={`${field.label}の候補`}>
          {field.suggestions.map((s) => (
            <button
              key={s.label}
              type="button"
              className={`chip ${Number(value) === s.value ? 'is-on' : ''}`}
              onClick={() => onChange({ [field.key]: String(s.value) })}
            >
              {s.label}
            </button>
          ))}
        </div>
      )}
      {(error || field.help) && (
        <p id={`${id}-desc`} className={error ? 'field__error' : 'field__help'}>
          {error ?? field.help}
        </p>
      )}
    </div>
  );
}

function SelectInput({ field, value, onChange }: { field: SelectField; value: string; onChange: Props['onChange'] }) {
  const id = useId();
  const select = (v: string) => {
    const opt = field.options.find((o) => o.value === v);
    onChange({ ...(opt?.apply ?? {}), [field.key]: v });
  };
  if (field.display === 'segmented') {
    return (
      <div className="field">
        <span className="field__label" id={id}>
          {field.label}
        </span>
        <div className="segmented" role="radiogroup" aria-labelledby={id}>
          {field.options.map((o) => (
            <button
              key={o.value}
              type="button"
              role="radio"
              aria-checked={value === o.value}
              className={value === o.value ? 'is-on' : ''}
              onClick={() => select(o.value)}
            >
              {o.label}
            </button>
          ))}
        </div>
        {field.help && <p className="field__help">{field.help}</p>}
      </div>
    );
  }
  return (
    <div className="field">
      <label htmlFor={id} className="field__label">
        {field.label}
      </label>
      <div className="field__control">
        <select id={id} className="input select" value={value} onChange={(e) => select(e.target.value)}>
          {field.options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </div>
      {field.help && <p className="field__help">{field.help}</p>}
    </div>
  );
}

/** 明細表の入力。行の追加・削除ができる。狭い画面では1行を1枚のカードにして縦に並べる */
function TableInput({
  field,
  value,
  errors,
  onChange,
}: {
  field: TableField;
  value: string | undefined;
  errors: Record<string, string>;
  onChange: Props['onChange'];
}) {
  const id = useId();
  const rows = rawTableRows(value);
  const set = (next: Record<string, string>[]) => onChange({ [field.key]: JSON.stringify(next) });
  const canAdd = field.maxRows === undefined || rows.length < field.maxRows;
  const canRemove = rows.length > (field.minRows ?? 0);
  const cellErrors = Object.entries(errors).filter(([k]) => k.startsWith(`${field.key}.`));
  const tableError = errors[field.key];
  return (
    <div className={`field table-field ${cellErrors.length || tableError ? 'has-error' : ''}`} role="group" aria-labelledby={`${id}-label`}>
      <span className="field__label" id={`${id}-label`}>
        {field.label}
      </span>
      <div className="table-field__wrap">
        <table className="table-field__table">
          <thead>
            <tr>
              <th scope="col" className="table-field__no">
                No.
              </th>
              {field.columns.map((c) => (
                <th key={c.key} scope="col" className={`is-${c.width ?? 'auto'}`}>
                  {c.label}
                  {c.unit && <span className="table-field__unit">［{c.unit}］</span>}
                </th>
              ))}
              <th scope="col" className="table-field__del">
                <span className="sr-only">削除</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i}>
                <td className="table-field__no num">{i + 1}</td>
                {field.columns.map((c) => {
                  const err = errors[tableErrorKey(field.key, i, c.key)];
                  return (
                    <td key={c.key} data-label={c.unit ? `${c.label}［${c.unit}］` : c.label}>
                      <input
                        className={`input table-field__input ${c.type === 'number' ? 'is-num' : ''}`}
                        type="text"
                        inputMode={c.type === 'number' ? 'decimal' : undefined}
                        autoComplete="off"
                        aria-label={`${i + 1}行目 ${c.label}`}
                        aria-invalid={!!err}
                        title={err}
                        value={r[c.key] ?? ''}
                        onChange={(e) => set(rows.map((x, j) => (j === i ? { ...x, [c.key]: e.target.value } : x)))}
                        onFocus={(e) => c.type === 'number' && e.target.select()}
                      />
                    </td>
                  );
                })}
                <td className="table-field__del">
                  <button
                    type="button"
                    className="icon-btn"
                    aria-label={`${i + 1}行目を削除`}
                    title="この行を削除"
                    disabled={!canRemove}
                    onClick={() => set(rows.filter((_, j) => j !== i))}
                  >
                    <Icon name="trash" size={18} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="table-field__foot">
        <button type="button" className="btn btn--text" disabled={!canAdd} onClick={() => set([...rows, { ...field.newRow }])}>
          <Icon name="plus" size={16} /> 行を追加
        </button>
        <span className="muted small">{rows.length} 行</span>
      </div>
      {(tableError || cellErrors.length > 0) && (
        <p className="field__error">
          {tableError ?? `${cellErrors.length} か所の入力を確認してください（${cellErrors[0][1]}）`}
        </p>
      )}
      {field.help && <p className="field__help">{field.help}</p>}
    </div>
  );
}
