import { Injectable } from '@nestjs/common';
import { LlmClient } from '../utils/llm-client';
import {
  buildDirectionalStimuliGeneratorPrompt,
  buildDirectionalStimulusSolverPrompt,
} from '../utils/templates';

@Injectable()
export class DirectionalStimulusService {
  constructor(private readonly llm: LlmClient) {}

  async run(inputText: string, params: any = {}) {
    const start = Date.now();

    // 1. Generate Stimuli
    const genPrompt = buildDirectionalStimuliGeneratorPrompt(inputText);
    const genOut = await this.llm.generate(genPrompt, {
      temperature: 0.7,
      maxOutputTokens: 500,
    });
    console.log(genOut.text);
    const genText = String(genOut.text ?? '').trim();

    // Parse stimuli
    const stimuliMatch = genText.match(/Directional Stimuli:\s*([\s\S]*)/i);
    const stimuliBlock = stimuliMatch ? stimuliMatch[1].trim() : genText;

    // 2. Solve with Stimuli
    const solvePrompt = buildDirectionalStimulusSolverPrompt(
      inputText,
      stimuliBlock,
    );
    const solveOut = await this.llm.generate(solvePrompt, {
      temperature: 0.0,
      maxOutputTokens: 500,
    });
    const solveText = String(solveOut.text ?? '').trim();

    // Parse answer and justification
    const answerMatch = solveText.match(
      /Answer:\s*([\s\S]*?)(?=\nJustification:|$)/i,
    );
    const justificationMatch = solveText.match(/Justification:\s*([\s\S]*)/i);

    const finalAnswer = answerMatch ? answerMatch[1].trim() : 'Unknown';
    const justification = justificationMatch
      ? justificationMatch[1].trim()
      : solveText; // Fallback to full text if parsing fails

    const latency = Date.now() - start;

    return {
      technique: 'directional_stimulus',
      prompt: `[Generator Prompt]:\n${genPrompt}\n\n[Solver Prompt]:\n${solvePrompt}`,
      outputs: [
        {
          stimuli: stimuliBlock,
          finalAnswer,
          justification,
          raw: { generator: genOut.raw, solver: solveOut.raw },
          rawText: `[Generator Output]:\n${genText}\n\n[Solver Output]:\n${solveText}`,
          usage: {
            generator: genOut.usage,
            solver: solveOut.usage,
            totalTokenCount:
              (genOut.usage?.totalTokenCount ?? 0) +
              (solveOut.usage?.totalTokenCount ?? 0),
          },
          latencyMs: latency,
        },
      ],
    };
  }
}
