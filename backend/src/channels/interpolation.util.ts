export function interpolate(body: string, vars: Record<string, string>): string {
  const ALLOWED = ['nome', 'agente', 'pipeline', 'etapa'];
  return body.replace(/\{(\w+)\}/g, (match, key) => {
    if (!ALLOWED.includes(key)) return match;
    const val = vars[key];
    return val == null ? match : String(val);
  });
}
