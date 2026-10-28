export function isSourceUrl(value: string) { return /^https?:\/\/\S+$/i.test(value.trim()); }
export function hasSourceText(value: string) { return value.trim().length >= 50 && !isSourceUrl(value); }
