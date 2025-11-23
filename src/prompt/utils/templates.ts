export function sanitizeInput(s: string, maxLen = 4000) {
  if (!s) return '';
  let t = s.trim();
  if (t.length > maxLen) t = t.slice(0, maxLen);
  return t.replace(/\s{2,}/g, ' ');
}

export function buildZeroShotPrompt(
  input: string,
  instruction = 'Answer the question from users within a single output (could be text, number,...) (no explanation, no bullets, no extra text, no code block)',
  allowedLabels?: string[]
) {
  const inText = sanitizeInput(input);

  const labelInstruction = Array.isArray(allowedLabels) && allowedLabels.length
    ? `Return EXACTLY one of the following labels (case sensitive as written): ${allowedLabels.join(', ')}.`
    : `Return ONLY the final answer.`;

  return `${instruction.trim()}

Text:
"${inText}"

${labelInstruction}
IMPORTANT: Output must be ONLY the single label (no explanation, no bullets, no extra text, no code block).
If you cannot determine a label, output "Unknown".
`;
}
