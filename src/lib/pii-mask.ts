// ─── Field-type enum ──────────────────────────────────────────────────────────
type FieldType =
  | 'name'
  | 'cpf'
  | 'cnpj'
  | 'email'
  | 'phone'
  | 'street'
  | 'number_field'
  | 'cep'
  | 'card'
  | 'generic';

// ─── Key → FieldType map ──────────────────────────────────────────────────────
// Exact lowercase key match takes precedence; substring fallback below.
const KEY_TYPE_MAP: Record<string, FieldType> = {
  // names
  nome: 'name', name: 'name', fullname: 'name',
  firstname: 'name', lastname: 'name', sobrenome: 'name',
  nomemae: 'name', nomepai: 'name', mother: 'name', father: 'name',
  mae: 'name', pai: 'name',
  // documents
  cpf: 'cpf',
  cnpj: 'cnpj',
  rg: 'generic',
  document: 'generic', documento: 'generic',
  // contact
  email: 'email', mail: 'email',
  phone: 'phone', telefone: 'phone', celular: 'phone',
  mobile: 'phone', fone: 'phone',
  // address
  rua: 'street', logradouro: 'street', avenida: 'street',
  endereco: 'street', endereço: 'street', address: 'street',
  bairro: 'street', complemento: 'street',
  numero: 'number_field', number: 'number_field',
  cep: 'cep', zipcode: 'cep', zip: 'cep',
  // secrets
  password: 'generic', senha: 'generic',
  secret: 'generic', token: 'generic',
  // financial
  card: 'card', cartao: 'card', cartão: 'card',
  account: 'generic', conta: 'generic',
  agencia: 'generic', agência: 'generic',
};

function fieldTypeForKey(key: string): FieldType | null {
  const lower = key.toLowerCase();
  if (KEY_TYPE_MAP[lower]) return KEY_TYPE_MAP[lower];
  // substring fallback for composite keys like "nomeCompleto", "emailUsuario"
  for (const [k, t] of Object.entries(KEY_TYPE_MAP)) {
    if (lower.includes(k)) return t;
  }
  return null;
}

// ─── Per-type maskers ─────────────────────────────────────────────────────────

/** "João da Silva" → "João S." */
function maskName(value: string): string {
  const parts = value.trim().split(/\s+/);
  if (parts.length === 1) return parts[0][0] ? `${parts[0][0]}.` : '*';
  const first = parts[0];
  const last = parts[parts.length - 1];
  return `${first} ${last[0].toUpperCase()}.`;
}

/**
 * Mask digits by position.
 * keepStart: how many leading digits to preserve.
 * keepEnd:   how many trailing digits to preserve.
 */
function maskDigitsByPosition(
  value: string,
  keepStart: number,
  keepEnd: number,
): string {
  const digits = value.replace(/\D/g, '');
  const total = digits.length;
  let digitIdx = 0;
  return value.replace(/\d/g, (char) => {
    const pos = digitIdx++;
    if (pos < keepStart || pos >= total - keepEnd) return char;
    return '*';
  });
}

// "123.456.789-10" → "***.***.***-10" (keep last 2 digits)
function maskCpf(value: string): string {
  return maskDigitsByPosition(value, 0, 2);
}

// "12.345.678/0001-90" → keeps last 2 digits, masks the rest
function maskCnpj(value: string): string {
  return maskDigitsByPosition(value, 0, 2);
}

/** "joao.silva@example.com" → "j***@example.com" */
function maskEmail(value: string): string {
  const atIdx = value.indexOf('@');
  if (atIdx === -1) return `${value[0]}***`;
  return `${value[0]}***${value.slice(atIdx)}`;
}

/**
 * "+55 11 91234-5678" → "+55 11 9****-5678"
 * Keeps: country(2) + area(2) + first digit(1) and last 4 digits.
 */
function maskPhone(value: string): string {
  const digits = value.replace(/\D/g, '');
  // Heuristic: if >= 10 digits treat as full number; keep first 5 structural and last 4
  const keepStart = digits.length >= 10 ? 5 : 2;
  const keepEnd = 4;
  return maskDigitsByPosition(value, keepStart, keepEnd);
}

/** "Rua das Flores" → "Rua das F." */
function maskStreet(value: string): string {
  const parts = value.trim().split(/\s+/);
  if (parts.length === 1) return `${parts[0][0]}.`;
  const last = parts[parts.length - 1];
  return `${parts.slice(0, -1).join(' ')} ${last[0].toUpperCase()}.`;
}

/** Any number field → "***" */
function maskNumberField(): string {
  return '***';
}

/** "04567-000" → "045**-000" (keep first 3 and last 3 digits) */
function maskCep(value: string): string {
  const digits = value.replace(/\D/g, '');
  const keepStart = 3;
  const keepEnd = Math.min(3, Math.max(0, digits.length - keepStart));
  return maskDigitsByPosition(value, keepStart, keepEnd);
}

/** "1234 5678 9012 3456" → "1234 **** **** 3456" */
function maskCard(value: string): string {
  const digits = value.replace(/\D/g, '');
  return maskDigitsByPosition(value, 4, Math.min(4, digits.length - 4));
}

/** Generic: keep first char + last 2 chars, mask everything in between */
function maskGeneric(value: string): string {
  if (value.length <= 4) return '*'.repeat(value.length);
  return `${value[0]}${'*'.repeat(value.length - 3)}${value.slice(-2)}`;
}

function applyTypedMask(value: string, type: FieldType): string {
  switch (type) {
    case 'name':         return maskName(value);
    case 'cpf':          return maskCpf(value);
    case 'cnpj':         return maskCnpj(value);
    case 'email':        return maskEmail(value);
    case 'phone':        return maskPhone(value);
    case 'street':       return maskStreet(value);
    case 'number_field': return maskNumberField();
    case 'cep':          return maskCep(value);
    case 'card':         return maskCard(value);
    case 'generic':      return maskGeneric(value);
  }
}

// ─── Regex patterns for free-text scanning ────────────────────────────────────
const INLINE_PATTERNS: { type: FieldType; regex: RegExp }[] = [
  { type: 'email',  regex: /\b[A-Za-z0-9._%+\-]+@[A-Za-z0-9.\-]+\.[A-Za-z]{2,}\b/g },
  { type: 'cpf',    regex: /\b\d{3}\.?\d{3}\.?\d{3}-?\d{2}\b/g },
  { type: 'cnpj',   regex: /\b\d{2}\.?\d{3}\.?\d{3}\/?\.?\d{4}-?\d{2}\b/g },
  { type: 'phone',  regex: /(\+?55\s?)?(\(?\d{2}\)?\s?)(\d{4,5}[\s\-]?\d{4})\b/g },
  { type: 'card',   regex: /\b(?:\d{4}[\s\-]?){3}\d{4}\b/g },
];

function maskInlinePatterns(value: string): string {
  let result = value;
  for (const { type, regex } of INLINE_PATTERNS) {
    regex.lastIndex = 0;
    result = result.replace(regex, (match) => applyTypedMask(match, type));
  }
  return result;
}

// ─── Deep JSON traversal ─────────────────────────────────────────────────────

function maskValue(value: unknown, keyHint?: string): unknown {
  const fieldType = keyHint ? fieldTypeForKey(keyHint) : null;

  if (typeof value === 'string') {
    if (fieldType) return applyTypedMask(value, fieldType);
    return maskInlinePatterns(value);
  }

  if (typeof value === 'number') {
    if (fieldType === 'number_field') return maskNumberField();
    if (fieldType) return applyTypedMask(String(value), fieldType);
    return value;
  }

  if (Array.isArray(value)) {
    return value.map((item) => maskValue(item, keyHint));
  }

  if (value !== null && typeof value === 'object') {
    const masked: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      masked[k] = maskValue(v, k);
    }
    return masked;
  }

  return value;
}

// ─── PII field counter ────────────────────────────────────────────────────────

function countPiiFields(value: unknown): number {
  if (value === null || typeof value !== 'object') return 0;
  let count = 0;
  for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
    if (fieldTypeForKey(k)) count++;
    if (v !== null && typeof v === 'object') count += countPiiFields(v);
  }
  return count;
}

// ─── Public API ───────────────────────────────────────────────────────────────

export function maskPiiBody(raw: string): string {
  try {
    const parsed = JSON.parse(raw);
    return JSON.stringify(maskValue(parsed), null, 2);
  } catch {
    return maskInlinePatterns(raw);
  }
}

export function countPiiMatches(raw: string): number {
  try {
    return countPiiFields(JSON.parse(raw));
  } catch {
    let count = 0;
    for (const { regex } of INLINE_PATTERNS) {
      regex.lastIndex = 0;
      count += (raw.match(regex) ?? []).length;
    }
    return count;
  }
}
