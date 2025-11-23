// src/run/techniques/cot.service.ts
import { Injectable } from '@nestjs/common';
import { LlmClient } from '../utils/llm-client';
import { buildChainOfThoughtPrompt } from '../utils/templates';
import { parseSection } from '../utils/parser';

@Injectable()
export class ChainOfThoughtService {
  constructor(private readonly llm: LlmClient) {}

  async run(inputText: string, params: any = {}) {
    const start = Date.now();
    const instruction = params?.instruction ?? 'Reason step-by-step, then give a concise final answer.';

    const prompt = buildChainOfThoughtPrompt(inputText, instruction);

    // For CoT you may use temperature 0.0 to keep reasoning deterministic in a demo,
    // but CoT often benefits from some sampling. Default 0.0 for predictable demos.
    const out = await this.llm.generate(prompt, {
      temperature: typeof params?.temperature !== 'undefined' ? params.temperature : 0.0,
      maxOutputTokens: params?.maxTokens ?? 500
    });

    const text = String(out.text ?? '').trim();

    // parse REASONING and FINAL_ANSWER sections from the returned text
    const reasoning = parseSection(text, 'REASONING') ?? '';
    let finalRaw = parseSection(text, 'FINAL_ANSWER') ?? '';
    if (!finalRaw) {
      // fallback: try splitting by last double newline (model often leaves blank line)
      const parts = text.split(/\n\s*\n/).map(p => p.trim()).filter(Boolean);
      finalRaw = parts.length ? parts[parts.length - 1] : '';
    }
    const finalAnswer = finalRaw ? finalRaw.trim() : 'Unknown';

    const latency = Date.now() - start;

    return {
      technique: 'chain_of_thought',
      prompt,
      outputs: [
        {
          reasoning,
          finalAnswer,
          raw: out.raw,
          rawText: text,
          usage: out.usage ?? null,
          latencyMs: latency
        }
      ]
    };
  }
}
