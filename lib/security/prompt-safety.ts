const PROMPT_INJECTION_PATTERNS = [
  /ignore\s+(all\s+)?previous\s+instructions/i,
  /disregard\s+(all\s+)?(prior|previous|above)\s+(instructions|rules)/i,
  /you\s+are\s+now\s+/i,
  /\bsystem\s*:\s*/i,
  /\bassistant\s*:\s*/i,
  /<\/?(?:system|assistant|user|instruction|prompt)>/i,
  /```(?:system|assistant)/i,
];

export function escapePromptLiteral(value: string): string {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/"/g, '\\"')
    .replace(/\u0000/g, "")
    .replace(/[\u0001-\u001f\u007f-\u009f]/g, " ");
}

export function wrapUntrustedContent(label: string, value: string): string {
  const sanitized = stripPromptInjectionPatterns(value.trim());
  return `<untrusted_${label}>\n${sanitized}\n</untrusted_${label}>`;
}

export function stripPromptInjectionPatterns(value: string): string {
  let result = value;

  for (const pattern of PROMPT_INJECTION_PATTERNS) {
    result = result.replace(pattern, "[filtered]");
  }

  return result.replace(/"{3,}/g, '""');
}
