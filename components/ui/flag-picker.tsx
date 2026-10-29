"use client";
import { useId, useRef } from "react";
import { CountryFlag } from "./country-flag";

export type FlagOption = { value: string; label: string; country: string; disabled?: boolean };

export function FlagPicker({ label, value, options, onChange, hint }: { label: string; value: string; options: FlagOption[]; onChange: (value: string) => void; hint?: string }) {
  const group = useId();
  const details = useRef<HTMLDetailsElement>(null);
  const selected = options.find(option => option.value === value);
  return <div className="flagPickerField"><span className="flagPickerLabel" id={`${group}-label`}>{label}</span><details className="flagPicker" ref={details}><summary className="flagPickerTrigger" aria-labelledby={`${group}-label ${group}-value`}><CountryFlag country={selected?.country || "REMOTE"} /><span id={`${group}-value`}>{selected?.label || "Selecione"}</span><span className="flagPickerChevron" aria-hidden="true" /></summary><fieldset className="flagPickerMenu" aria-labelledby={`${group}-label`}><legend className="sr-only">{label}</legend>{options.map(option => <label className={`flagPickerOption ${option.disabled ? "isDisabled" : ""}`} key={option.value} onClick={event => { if (event.detail > 0 && !option.disabled && details.current) details.current.open = false; }}><input type="radio" aria-label={option.label} name={group} value={option.value} checked={value === option.value} disabled={option.disabled} onChange={() => onChange(option.value)} /><CountryFlag country={option.country} /><span>{option.label}</span></label>)}</fieldset></details>{hint && <span className="flagPickerHint">{hint}</span>}</div>;
}
