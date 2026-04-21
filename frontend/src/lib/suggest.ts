export interface Suggestion {
  field: 'phone' | 'email' | 'company';
  label: string;
  value: string;
}

const PHONE_RE = /(?:(?:\+?55\s?)?(?:\(?\d{2}\)?\s?)?)(?:9\s?)?\d{4}[-.\s]?\d{4}/g;
const EMAIL_RE = /[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/g;

export function detectSuggestions(text: string): Suggestion[] {
  const suggestions: Suggestion[] = [];
  const seen = new Set<string>();

  const phones = text.match(PHONE_RE) ?? [];
  for (const p of phones) {
    const clean = p.replace(/\D/g, '');
    if (clean.length >= 8 && clean.length <= 13 && !seen.has('phone:' + clean)) {
      seen.add('phone:' + clean);
      suggestions.push({ field: 'phone', label: 'Telefone detectado', value: p.trim() });
    }
  }

  const emails = text.match(EMAIL_RE) ?? [];
  for (const e of emails) {
    if (!seen.has('email:' + e)) {
      seen.add('email:' + e);
      suggestions.push({ field: 'email', label: 'E-mail detectado', value: e });
    }
  }

  return suggestions;
}
