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
  const ex = examples && examples.length ? examples.slice(0, 3) : [];
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

export function buildPalPrompt(
  input: string,
  instruction = 'Write a JavaScript function named `solution` that solves the problem and returns the answer.',
) {
  const inText = sanitizeInput(input);

  return `${instruction.trim()}

  Text:
  "${inText}"

  REQUIREMENTS:
  - First output a JAVASCRIPT_CODE block (prefix the block exactly with "JAVASCRIPT_CODE:").
  - The code must define a function named \`solution\` that returns the answer.
  - The code should be valid JavaScript.
  - DO NOT output the final answer text directly. The answer will be obtained by running the code.

  JAVASCRIPT_CODE:
  \`\`\`javascript
  function solution() {
    // Write your code here
    return ...;
  }
  \`\`\`
  `;
}

export function buildSelfConsistencyPrompt(
  input: string,
  instruction = 'You are solving this problem using self-consistency.',
) {
  const inText = sanitizeInput(input);

  return `${instruction.trim()}
Generate multiple distinct reasoning paths to explore different approaches.
Each reasoning path should be short and logically coherent.

After generating at least 5 different reasoning paths, determine the final answer by selecting the most common conclusion among them.

Format your response as:

Reasoning Paths:

1. ...
2. ...
3. ...
4. ...
5. ...

Final Answer: <answer>

Problem:

"${inText}"
  `;
}

export function buildDirectionalStimuliGeneratorPrompt(input: string) {
  const inText = sanitizeInput(input);
  return `You are a system that generates directional reasoning stimuli for another model.

Your task: Given a problem, produce a list of high-level reasoning cues that **guide solution strategy** without providing detailed step-by-step reasoning or the answer.

Requirements for the directional stimuli:

- Should nudge reasoning (strategy, heuristics, principles)
- Should NOT reveal the final answer
- Should NOT include full step-by-step logic
- Should be generic enough to apply across multiple solution paths
- Should be 4–7 bullet points
- Each bullet should be concise (one short sentence)
- Avoid explicit calculations or symbolic manipulation

Output Format (exactly this):
Directional Stimuli:

- <stimulus 1>
- <stimulus 2>
- <stimulus 3>
- <stimulus 4>
- <stimulus 5>

Problem:
"${inText}"
`;
}

export function buildDirectionalStimulusSolverPrompt(
  input: string,
  stimuli: string,
) {
  const inText = sanitizeInput(input);
  return `You will solve the problem using high-level reasoning guidance.
Follow the directional stimuli below to guide your approach, but do not produce a detailed chain-of-thought.

Directional Stimuli:

${stimuli}

Rules:

- Use concise reasoning (2–5 sentences).
- Do not reveal hidden reasoning or internal deliberation.
- Focus on correctness, not verbosity.

Task:
"${inText}"

Output format:
Answer: <final answer>
Justification: <brief reasoning>
`;
}
