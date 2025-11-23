export function sanitizeInput(s: string, maxLen = 4000) {
  if (!s) return '';
  let t = s.trim();
  if (t.length > maxLen) t = t.slice(0, maxLen);
  return t.replace(/\s{2,}/g, ' ');
}

export function buildZeroShotPrompt(
  input: string,
  instruction = 'Answer the question from users within a single output (could be text, number,...)',
) {
  const inText = sanitizeInput(input);

  return `${instruction.trim()}

  Text:
  "${inText}"

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

export function buildChainOfThoughtPrompt(
  input: string,
  instruction = 'Reason step-by-step about the prompt, then provide a concise final answer.',
) {
  const inText = sanitizeInput(input);

  return `${instruction.trim()}

  Text:
  "${inText}"

  REQUIREMENTS:
  - First output a numbered REASONING block (prefix the block exactly with "REASONING:").
  - Then output a single-line "FINAL_ANSWER: " followed by the final answer.
  - DO NOT output any additional text outside REASONING and FINAL_ANSWER.

  REASONING:
  1)
  2)

  FINAL_ANSWER:
  `;
}
