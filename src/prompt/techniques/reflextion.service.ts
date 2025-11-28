import { Injectable } from '@nestjs/common';
import { LlmClient } from '../utils/llm-client';
import { buildReflexionPrompt } from '../utils/templates';
import { parseSection } from '../utils/parser';

interface ReflexionStep {
  type: 'initial' | 'reflection' | 'revision';
  stepNumber: number;
  content: string;
}

@Injectable()
export class ReflexionService {
  constructor(private readonly llm: LlmClient) {}

  async run(inputText: string, params: any = {}) {
    const start = Date.now();
    const maxReflections = params?.maxReflections ?? 3;

    // Build Reflextion prompt
    const prompt = buildReflexionPrompt(inputText, { maxReflections });

    // Generate the reflextion response
    const out = await this.llm.generate(prompt, {
      temperature: params?.temperature ?? 0.1,
      maxOutputTokens: params?.maxTokens ?? 1500,
    });

    const text = String(out.text ?? '').trim();

    // Parse the reflextion steps
    const steps = this.parseReflexionSteps(text);
    
    // Extract final answer
    const finalAnswer = parseSection(text, 'FINAL_ANSWER') || 
                       this.extractLastSolution(steps) ||
                       'Unable to determine final answer';

    const latency = Date.now() - start;

    return {
      technique: 'reflextion',
      prompt,
      outputs: [
        {
          steps,
          finalAnswer,
          reflectionCount: this.countReflections(steps),
          reasoning: this.formatReasoning(steps),
          raw: out.raw,
          rawText: text,
          usage: out.usage ?? null,
          latencyMs: latency,
        },
      ],
    };
  }

  private parseReflexionSteps(text: string): ReflexionStep[] {
    const steps: ReflexionStep[] = [];

    // Parse initial attempt
    const initialAttempt = parseSection(text, 'INITIAL_ATTEMPT');
    if (initialAttempt) {
      steps.push({
        type: 'initial',
        stepNumber: 0,
        content: initialAttempt.trim(),
      });
    }

    // Parse reflection and revision cycles
    for (let i = 1; i <= 5; i++) {
      const reflection = parseSection(text, `REFLECTION_${i}`);
      const revision = parseSection(text, `REVISED_SOLUTION_${i}`);

      if (reflection) {
        steps.push({
          type: 'reflection',
          stepNumber: i,
          content: reflection.trim(),
        });
      }

      if (revision) {
        steps.push({
          type: 'revision',
          stepNumber: i,
          content: revision.trim(),
        });
      }

      // If no reflection or revision found for this iteration, stop
      if (!reflection && !revision) {
        break;
      }
    }

    return steps;
  }

  private countReflections(steps: ReflexionStep[]): number {
    return steps.filter(step => step.type === 'reflection').length;
  }

  private extractLastSolution(steps: ReflexionStep[]): string | null {
    // Find the last revision or initial attempt
    const lastRevision = steps
      .filter(step => step.type === 'revision')
      .pop();
    
    if (lastRevision) {
      return lastRevision.content;
    }

    const initialAttempt = steps.find(step => step.type === 'initial');
    return initialAttempt ? initialAttempt.content : null;
  }

  private formatReasoning(steps: ReflexionStep[]): string {
    return steps
      .map((step, index) => {
        let prefix = '';
        switch (step.type) {
          case 'initial':
            prefix = '🎯 Initial Attempt:';
            break;
          case 'reflection':
            prefix = `🤔 Reflexion ${step.stepNumber}:`;
            break;
          case 'revision':
            prefix = `📝 Revised Solution ${step.stepNumber}:`;
            break;
        }
        return `${prefix}\n${step.content}`;
      })
      .join('\n\n');
  }
}