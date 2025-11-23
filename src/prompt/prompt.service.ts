import { Injectable } from '@nestjs/common';
import { ZeroShotService } from './techniques/zero-shot.service';
import { LlmClient } from './utils/llm-client';
import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';
import { FewShotService } from './techniques/few-shot.service';
import { ChainOfThoughtService } from './techniques/chain-of-thought.service';

@Injectable()
export class PromptService {
  constructor(
    private readonly zeroShot: ZeroShotService,
    private readonly fewShot: FewShotService,
    private readonly chainOfThought: ChainOfThoughtService,
    private readonly llm: LlmClient
  ) {}

  async runSingleTechnique(inputText: string, technique: string, params: any) {
    // sanitize and enforce input size in LlmClient; here we forward
    let result;
    switch (technique) {
      case 'zero_shot':
        result = await this.zeroShot.run(inputText, params);
        break;
      case 'few_shot':
        result = await this.fewShot.run(inputText, params);
        break;
      case 'chain_of_thought':
        result = await this.chainOfThought.run(inputText, params);
        break;
      default:
        throw new Error('Unsupported technique');
    }

    // include model meta
    return {
      technique,
      model: this.llm.modelName,
      ...result
    };
  }
}
