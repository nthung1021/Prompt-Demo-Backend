import { Injectable } from '@nestjs/common';
import { LlmClient } from '../utils/llm-client';
import { buildPalPrompt } from '../utils/templates';
import { parseSection } from '../utils/parser';
import * as vm from 'vm';

@Injectable()
export class PalService {
  constructor(private readonly llm: LlmClient) {}

  async run(inputText: string, params: any = {}) {
    const start = Date.now();
    const instruction =
      params?.instruction ??
      'Write a JavaScript function named `solution` that solves the problem and returns the answer.';

    const prompt = buildPalPrompt(inputText, instruction);

    const out = await this.llm.generate(prompt, {
      temperature:
        typeof params?.temperature !== 'undefined' ? params.temperature : 0.0,
      maxOutputTokens: params?.maxTokens ?? 1000,
    });

    const text = String(out.text ?? '').trim();

    // parse JAVASCRIPT_CODE section
    let code = parseSection(text, 'JAVASCRIPT_CODE') ?? '';
    // Clean up markdown code blocks if present
    code = code
      .replace(/```javascript/g, '')
      .replace(/```js/g, '')
      .replace(/```/g, '')
      .trim();

    let finalAnswer = 'Unknown';
    let executionError = null;

    if (code) {
      try {
        const sandbox = { console: { log: () => {} } }; // minimal sandbox
        vm.createContext(sandbox);
        // We append calling the solution function to get the result
        const script = new vm.Script(`${code};\n solution();`);
        const result = script.runInContext(sandbox, { timeout: 1000 }); // 1s timeout
        finalAnswer = String(result);
      } catch (e: any) {
        executionError = e.message;
        finalAnswer = `Error: ${e.message}`;
      }
    } else {
      finalAnswer = 'No code generated';
    }

    const latency = Date.now() - start;

    return {
      technique: 'pal',
      prompt,
      outputs: [
        {
          code,
          finalAnswer,
          executionError,
          raw: out.raw,
          rawText: text,
          usage: out.usage ?? null,
          latencyMs: latency,
        },
      ],
    };
  }
}
