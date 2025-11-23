// src/run/techniques/few-shot.service.ts
import { Injectable } from '@nestjs/common';
import { LlmClient } from '../utils/llm-client';
import { buildFewShotPrompt } from '../utils/templates';

@Injectable()
export class FewShotService {
  constructor(private readonly llm: LlmClient) {}

  async run(inputText: string, params: any = {}) {
    const start = Date.now();
    const instruction = params?.instruction ?? 'Perform the task shown in examples.';
    const examples = Array.isArray(params?.examples) ? params.examples : [];
    const allowedLabels: string[] | undefined = Array.isArray(params?.allowedLabels)
      ? params.allowedLabels.map((s: string) => String(s).trim()).filter(Boolean)
      : undefined;

    const prompt = buildFewShotPrompt(inputText, examples, instruction, allowedLabels);

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

    // If allowedLabels present, match one of them
    let finalLabel: string | null = null;
    if (allowedLabels && allowedLabels.length > 0) {
      const esc = allowedLabels.map(l => l.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&')).join('|');
      const re = new RegExp(`\\b(${esc})\\b`, 'i');
      const m = cleaned.match(re);
      if (m && m[1]) {
        const matched = m[1];
        const canonical = allowedLabels.find(a => a.toLowerCase() === matched.toLowerCase());
        finalLabel = canonical ?? matched;
      }
    }

    // If no allowedLabels, take the last non-empty line as answer
    if (!finalLabel) {
      const lines = cleaned.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
      const candidate = lines.length ? lines[lines.length - 1] : cleaned;
      // remove trailing punctuation
      const single = candidate.replace(/[^\p{L}\p{N}\s]/gu, '').trim();
      const words = single.split(/\s+/).filter(Boolean);
      if (words.length === 1) finalLabel = single;
      else if (words.length > 1) finalLabel = single; // allow multi-word answers (e.g., "Battery innovations")
      else finalLabel = 'Unknown';
    }

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
