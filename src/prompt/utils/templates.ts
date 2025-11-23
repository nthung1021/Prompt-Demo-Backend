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

export function buildFewShotPrompt(
  input: string,
  examples: Array<{ text: string; label?: string; summary?: string }>,
  instruction = 'Perform the task as shown in the examples.',
) {
  const inText = sanitizeInput(input);

  // Build example block (limit to first 3 examples)
  const ex = (examples && examples.length) ? examples.slice(0, 3) : [];
  let prefix = '';
  for (const e of ex) {
    if (e.label) {
      prefix += `Text: "${sanitizeInput(e.text, 600)}"\nAnswer: ${sanitizeInput(e.label, 200)}\n--\n`;
    } else if (e.summary) {
      prefix += `Text: "${sanitizeInput(e.text, 600)}"\nSummary:\n${sanitizeInput(e.summary, 400)}\n--\n`;
    } else {
      prefix += `Text: "${sanitizeInput(e.text, 600)}"\nOutput:\n${'\n'}--\n`;
    }
  }

  return `${instruction.trim()}

  ${prefix}
  Now apply the same format to this input:

  Text:
  "${inText}"

  IMPORTANT: Output must be ONLY the final answer (no explanations, no bullet points, no extra text). If unsure, return "Unknown".
  `;
}
