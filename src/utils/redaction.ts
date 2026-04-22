const SENSITIVE_KEY_PATTERN = /(api[-_]?key|authorization|client[-_]?secret|cookie|credential|password|secret|session|token)/i;

export function summarizeToolArguments(args: Record<string, unknown> | undefined): {
  argumentKeys: string[];
  sensitiveKeys: string[];
} {
  const argumentKeys = Object.keys(args || {}).sort();
  const sensitiveKeys = argumentKeys.filter((key) => SENSITIVE_KEY_PATTERN.test(key));

  return {
    argumentKeys,
    sensitiveKeys,
  };
}
