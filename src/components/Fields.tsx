import { useId } from 'react';
import type { Field, NumberField, RawValues, SelectField } from '../core/types';
import { isVisible } from '../core/values';

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
