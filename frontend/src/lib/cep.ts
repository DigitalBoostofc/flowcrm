export interface ViaCepData {
  logradouro: string;
  bairro: string;
  localidade: string;
  uf: string;
  complemento: string;
  erro?: boolean;
}

export function maskCep(raw: string): string {
  const digits = raw.replace(/\D/g, '').slice(0, 8);
  return digits.length > 5 ? `${digits.slice(0, 5)}-${digits.slice(5)}` : digits;
}

export async function fetchViaCep(digits: string, signal?: AbortSignal): Promise<ViaCepData | null> {
  const clean = digits.replace(/\D/g, '');
  if (clean.length !== 8) return null;
  try {
    const res = await fetch(`https://viacep.com.br/ws/${clean}/json/`, { signal });
    if (!res.ok) return null;
    const data: ViaCepData = await res.json();
    if (data.erro) return null;
    return data;
  } catch {
    return null;
  }
}
