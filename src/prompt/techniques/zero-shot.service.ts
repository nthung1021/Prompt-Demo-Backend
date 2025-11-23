import { Injectable } from '@nestjs/common';
import { LlmClient } from '../utils/llm-client';
import { buildZeroShotPrompt } from '../utils/templates';

@Injectable()
export class ZeroShotService {
  constructor(private readonly llm: LlmClient) {}

  async run(inputText: string, params: any = {}) {
    const start = Date.now();
    const instruction = params?.instruction;

    // Build strict prompt: enforce single-label-only output
    const prompt = buildZeroShotPrompt(inputText, instruction);

    // Call model with deterministic settings
    const out = await this.llm.generate(prompt, {
      temperature: 0.0,
      maxOutputTokens: params?.maxTokens ?? 30 // short token cap for a single label
    });

    // out: { text: string, raw: any, usage?: any }
    const rawText = String(out.text ?? '').trim();

    // Normalize: remove common bullet markers and extraneous characters
    let cleaned = rawText
      .replace(/^[\*\-\•\u2022]\s*/g, '')      // leading bullet on first line
      .replace(/[\*\-\•\u2022]/g, '')          // any remaining bullet chars
      .replace(/[`"']/g, '')                   // remove quotes/backticks
      .trim();

    let finalLabel: string | null = null;

    const lines = cleaned.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
    const candidate = lines.length ? lines[lines.length - 1] : cleaned;
    // remove trailing punctuation
    const single = candidate.replace(/[^\p{L}\p{N}\s]/gu, '').trim(); // letters/numbers/spaces
    // if single contains multiple words, take last word (common when model echoes choices)
    const words = single.split(/\s+/).filter(Boolean);
    if (words.length === 1) {
      finalLabel = words[0];
    } else if (words.length > 1) {
      // attempt to find a word that looks like a label (capitalized or matches common sentiment words)
      const prefer = words.find(w => /^(positive|neutral|negative)$/i.test(w));
      finalLabel = prefer ?? words[words.length - 1];
    } else {
      finalLabel = null;
    }

    // Final normalization and fallback
    if (finalLabel) {
      finalLabel = finalLabel.trim();
      // normalize capitalization
      finalLabel = finalLabel.charAt(0).toUpperCase() + finalLabel.slice(1).toLowerCase();
    } else {
      finalLabel = 'Unknown';
    }

    const latency = Date.now() - start;

    return {
      technique: 'zero_shot',
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
