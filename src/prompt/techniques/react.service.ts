import { Injectable } from '@nestjs/common';
import { LlmClient } from '../utils/llm-client';
import { buildReActPrompt } from '../utils/templates';

interface ReActStep {
  thought: string;
  action: string;
  actionInput: string;
  observation?: string;
}

@Injectable()
export class ReActService {
  constructor(private readonly llm: LlmClient) {}

  async run(inputText: string, params: any = {}) {
    const start = Date.now();
    const maxIterations = params?.maxIterations ?? 5;
    const toolSpec = params?.toolSpec ?? 'search, calculate, lookup, analyze';

    // Build ReAct prompt
    const prompt = buildReActPrompt(inputText, { toolSpec });
    
    const steps: ReActStep[] = [];
    let currentPrompt = prompt;
    let finalAnswer = '';
    let completed = false;

    for (let i = 0; i < maxIterations && !completed; i++) {
      // Generate next response
      const out = await this.llm.generate(currentPrompt, {
        temperature: params?.temperature ?? 0.1,
        maxOutputTokens: params?.maxTokens ?? 800,
      });

      const response = String(out.text ?? '').trim();
      
      // Parse the response to extract thought, action, and action input
      const step = this.parseReActStep(response);
      
      if (!step) {
        // If parsing fails, treat as final answer
        finalAnswer = response;
        break;
      }

      // Simulate tool execution
      const observation = this.simulateToolExecution(step.action, step.actionInput);
      step.observation = observation;
      
      steps.push(step);

      // Check if this is the final step
      if (step.action.toLowerCase() === 'finish') {
        finalAnswer = step.actionInput;
        completed = true;
        break;
      }

      // Prepare next iteration prompt
      currentPrompt += `\n\nThought: ${step.thought}\nAction: ${step.action}\nAction Input: ${step.actionInput}\nObservation: ${observation}\n\nThought:`;
    }

    // If no final answer was found, use the last observation or response
    if (!finalAnswer && steps.length > 0) {
      const lastStep = steps[steps.length - 1];
      finalAnswer = lastStep.observation || lastStep.actionInput || 'Unable to determine answer';
    }

    const latency = Date.now() - start;

    return {
      technique: 'react',
      prompt,
      outputs: [
        {
          steps,
          finalAnswer,
          completed,
          iterations: steps.length,
          reasoning: this.formatReasoning(steps),
          raw: { steps, iterations: steps.length },
          usage: { iterations: steps.length }, // Simple usage metric
          latencyMs: latency,
        },
      ],
    };
  }

  private parseReActStep(response: string): ReActStep | null {
    try {
      // Extract thought
      const thoughtMatch = response.match(/Thought:\s*(.*?)(?=\nAction:|$)/is);
      const thought = thoughtMatch?.[1]?.trim() || '';

      // Extract action
      const actionMatch = response.match(/Action:\s*(.*?)(?=\nAction Input:|$)/is);
      const action = actionMatch?.[1]?.trim() || '';

      // Extract action input
      const actionInputMatch = response.match(/Action Input:\s*(.*?)(?=\nObservation:|$)/is);
      const actionInput = actionInputMatch?.[1]?.trim() || '';

      if (!thought && !action) {
        return null;
      }

      return {
        thought,
        action,
        actionInput,
      };
    } catch (error) {
      console.error('Error parsing ReAct step:', error);
      return null;
    }
  }

  private simulateToolExecution(action: string, input: string): string {
    // This is a simulation of tool execution
    // In a real implementation, you would call actual tools/APIs
    
    const actionLower = action.toLowerCase();
    
    switch (actionLower) {
      case 'search':
        return `Search results for "${input}": Found relevant information about ${input}. This appears to be related to the query and provides context for analysis.`;
      
      case 'calculate':
        // Try to evaluate simple mathematical expressions
        try {
          // Basic safety check - only allow numbers, operators, and parentheses
          if (/^[\d\s+\-*/().,]+$/.test(input)) {
            const result = eval(input);
            return `Calculation result: ${input} = ${result}`;
          }
        } catch (e) {
          // Fall through to default calculation message
        }
        return `Calculation for "${input}": Mathematical computation completed with relevant numerical result.`;
      
      case 'lookup':
        return `Lookup result for "${input}": Found definition and relevant information that helps understand the context.`;
      
      case 'analyze':
        return `Analysis of "${input}": Examined the data/information and identified key patterns, relationships, and insights relevant to the question.`;
      
      case 'finish':
        return `Task completed with final answer: ${input}`;
      
      default:
        return `Executed ${action} with input "${input}": Operation completed successfully with relevant results.`;
    }
  }

  private formatReasoning(steps: ReActStep[]): string {
    return steps
      .map((step, index) => {
        let reasoning = `Step ${index + 1}:\n`;
        reasoning += `Thought: ${step.thought}\n`;
        reasoning += `Action: ${step.action} - ${step.actionInput}\n`;
        if (step.observation) {
          reasoning += `Result: ${step.observation}`;
        }
        return reasoning;
      })
      .join('\n\n');
  }
}