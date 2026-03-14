/**
 * Security utilities for production hardening
 *
 * Input sanitization, XSS prevention, SQL injection detection,
 * API key validation, and request size enforcement.
 */

const XSS_PATTERNS = [
  /<script\b[^>]*>/i,
  /javascript:/i,
  /on\w+\s*=/i,
  /data:\s*text\/html/i,
  /<iframe\b/i,
  /<object\b/i,
  /<embed\b/i,
  /<link\b[^>]*rel\s*=\s*["']?import/i,
];

const SQL_PATTERNS = [
  /(\b(union|select|insert|update|delete|drop|alter|create|exec)\b.*\b(from|into|table|database|where)\b)/i,
  /(['";])\s*(or|and)\s+\d+\s*=\s*\d+/i,
  /--\s*$/,
  /;\s*(drop|delete|update|insert)\b/i,
  /\b(char|nchar|varchar|nvarchar)\s*\(/i,
];

/** Remove potential XSS vectors from input strings */
export function sanitizeInput(input: string, maxLength = 500): string {
  if (typeof input !== "string") return "";

  let clean = input.slice(0, maxLength);

  // Encode HTML entities
  clean = clean
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#x27;");

  // Remove null bytes
  clean = clean.replace(/\0/g, "");

  return clean.trim();
}

/** Check if input contains XSS attack patterns */
export function containsXss(input: string): boolean {
  if (typeof input !== "string") return false;
  return XSS_PATTERNS.some((pattern) => pattern.test(input));
}

/** Check if input contains SQL injection patterns */
export function containsSqlInjection(input: string): boolean {
  if (typeof input !== "string") return false;
  return SQL_PATTERNS.some((pattern) => pattern.test(input));
}

/** Validate API key format (must match ak_ prefix + UUID) */
export function validateApiKeyFormat(key: string): boolean {
  if (typeof key !== "string") return false;
  return /^ak_[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(key);
}

/** Validate agent ID format */
export function validateAgentIdFormat(id: string): boolean {
  if (typeof id !== "string") return false;
  return /^ag_[0-9a-f]{8}$/.test(id);
}

/** Check request body size (returns true if within limit) */
export function checkBodySize(body: string, maxBytes = 10 * 1024 * 1024): boolean {
  return Buffer.byteLength(body, "utf8") <= maxBytes;
}

/** Sanitize all string fields in an object */
export function sanitizeObject<T extends Record<string, unknown>>(
  obj: T,
  maxFieldLength = 500
): T {
  const result = { ...obj };
  for (const key of Object.keys(result)) {
    const val = result[key];
    if (typeof val === "string") {
      (result as Record<string, unknown>)[key] = sanitizeInput(val, maxFieldLength);
    }
  }
  return result;
}

/** Validate and sanitize a request body, returning errors if dangerous */
export function validateRequestBody(body: Record<string, unknown>): {
  safe: boolean;
  errors: string[];
  sanitized: Record<string, unknown>;
} {
  const errors: string[] = [];
  const sanitized = { ...body };

  for (const [key, value] of Object.entries(body)) {
    if (typeof value !== "string") continue;

    if (containsXss(value)) {
      errors.push(`Field "${key}" contains potentially dangerous HTML`);
    }
    if (containsSqlInjection(value)) {
      errors.push(`Field "${key}" contains suspicious SQL patterns`);
    }

    (sanitized as Record<string, unknown>)[key] = sanitizeInput(value);
  }

  return { safe: errors.length === 0, errors, sanitized };
}
