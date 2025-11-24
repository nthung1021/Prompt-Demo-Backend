import { Injectable } from '@nestjs/common';
import { LlmClient } from '../utils/llm-client';
import { buildSelfConsistencyPrompt } from '../utils/templates';
import { parseSection } from '../utils/parser';

@Injectable()
export class SelfConsistencyService {
  constructor(private readonly llm: LlmClient) {}

  async run(inputText: string, params: any = {}) {
    const start = Date.now();
    const instruction =
      params?.instruction ??
      'You are solving this problem using self-consistency.';

    const prompt = buildSelfConsistencyPrompt(inputText, instruction);

    // Self-consistency usually benefits from higher temperature to generate diverse paths
    const out = await this.llm.generate(prompt, {
      temperature:
        typeof params?.temperature !== 'undefined' ? params.temperature : 0.7,
      maxOutputTokens: params?.maxTokens ?? 1000,
    });

    const text = String(out.text ?? '').trim();

    // Parse Reasoning Paths and Final Answer
    // We look for "Reasoning Paths:" and "Final Answer:"

    let reasoningPathsBlock = '';
    let finalAnswer = 'Unknown';

    // Simple regex extraction
    const pathsMatch = text.match(
      /Reasoning Paths:\s*([\s\S]*?)(?=Final Answer:|$)/i,
    );
    if (pathsMatch) {
      reasoningPathsBlock = pathsMatch[1].trim();
    }

    const finalMatch = text.match(/Final Answer:\s*([\s\S]*)/i);
    if (finalMatch) {
      finalAnswer = finalMatch[1].trim();
    }

    // Parse individual paths if possible (numbered list)
    const paths = reasoningPathsBlock
      .split(/\n\d+\.\s+/)
      .map((p) => p.trim())
      .filter(Boolean);

    // If split didn't work well (e.g. model didn't use 1. 2. format correctly), just return the block
    const reasoning = paths.length > 0 ? paths : [reasoningPathsBlock];

    const latency = Date.now() - start;

    return {
      technique: 'self_consistency',
      prompt,
      outputs: [
        {
          reasoningPaths: reasoning, // Array of strings
          finalAnswer,
          raw: out.raw,
          rawText: text,
          usage: out.usage ?? null,
          latencyMs: latency,
        },
      ],
    };
  }
}
