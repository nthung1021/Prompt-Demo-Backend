// src/run/techniques/few-shot.service.ts
import { Injectable } from '@nestjs/common';
import { LlmClient } from '../utils/llm-client';
import { buildFewShotPrompt } from '../utils/templates';

@Injectable()
export class FewShotService {
  constructor(private readonly llm: LlmClient) {}

  async run(inputText: string, params: any = {}) {
    const start = Date.now();
    const instruction = params?.instruction;
    const examples = Array.isArray(params?.examples) ? params.examples : [];

    const prompt = buildFewShotPrompt(inputText, examples, instruction);

    // Deterministic call for final-output only behavior
    const out = await this.llm.generate(prompt, {
      temperature: 0.0,
      maxOutputTokens: params?.maxTokens ?? 24
    });

    const rawText = String(out.text ?? '').trim();

    // Clean and extract final answer (similar approach to zero-shot)
    let cleaned = rawText
      .replace(/^[\*\-\•\u2022]\s*/gm, '')    // remove leading bullets
      .replace(/[`"']/g, '')                  // remove quotes/backticks
      .trim();

    let finalLabel: string | null = null;

    const lines = cleaned.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
    const candidate = lines.length ? lines[lines.length - 1] : cleaned;
    // remove trailing punctuation
    const single = candidate.replace(/[^\p{L}\p{N}\s]/gu, '').trim();
    const words = single.split(/\s+/).filter(Boolean);
    if (words.length === 1) finalLabel = single;
    else if (words.length > 1) finalLabel = single; // allow multi-word answers (e.g., "Battery innovations")
    else finalLabel = 'Unknown';

    // Normalize capitalization for single-word labels
    if (finalLabel && finalLabel.length) {
      finalLabel = finalLabel.trim();
    } else {
      finalLabel = 'Unknown';
    }

    const latency = Date.now() - start;

    return {
      technique: 'few_shot',
      prompt,
      outputs: [
        {
          finalAnswer: finalLabel,
          raw: out.raw,
          rawText,
          usage: out.usage ?? null,
          latencyMs: latency
        }
      ]
    };
  }
}
