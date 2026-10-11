import {
  useId,
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from 'react';
import ui from '@/styles/ui.module.css';
import { cx } from '@/lib/utils';

export interface FieldProps {
  label: ReactNode;
  hint?: ReactNode;
  error?: string | null;
  htmlFor?: string;
  children: ReactNode;
  className?: string;
}

export function Field({ label, hint, error, htmlFor, children, className }: FieldProps) {
  return (
    <div className={cx(ui.field, className)}>
      <label className={ui.label} htmlFor={htmlFor}>
        {label}
      </label>
      {children}
      {hint && !error && <p className={ui.hint}>{hint}</p>}
      {error && (
        <p className={ui.errorText} role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

export interface TextInputProps extends InputHTMLAttributes<HTMLInputElement> {
  invalid?: boolean;
}

export function TextInput({ invalid, className, ...rest }: TextInputProps) {
  return <input {...rest} className={cx(ui.input, invalid && ui.invalid, className)} />;
}

export interface TextAreaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  invalid?: boolean;
}

export function TextArea({ invalid, className, ...rest }: TextAreaProps) {
  return (
    <textarea {...rest} className={cx(ui.textarea, invalid && ui.invalid, className)} />
  );
}

export interface SelectInputProps extends SelectHTMLAttributes<HTMLSelectElement> {
  options: { value: string; label: string }[];
  invalid?: boolean;
}

export function SelectInput({ options, invalid, className, ...rest }: SelectInputProps) {
  return (
    <select {...rest} className={cx(ui.select, invalid && ui.invalid, className)}>
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}

export interface CheckRowProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  title: ReactNode;
  note?: ReactNode;
}

export function CheckRow({ checked, onChange, disabled, title, note }: CheckRowProps) {
  const id = useId();
  return (
    <div className={ui.checkRow}>
      <input
        id={id}
        className={ui.check}
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange(e.target.checked)}
      />
      <label htmlFor={id} className={cx(disabled && ui.checkDisabled)}>
        {title}
        {note && <p className={ui.hint}>{note}</p>}
      </label>
    </div>
  );
}
