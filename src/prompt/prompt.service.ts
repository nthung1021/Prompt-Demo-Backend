import { Injectable } from '@nestjs/common';
import { ZeroShotService } from './techniques/zero-shot.service';
import { LlmClient } from './utils/llm-client';
import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';

@Injectable()
export class PromptService {
  constructor(
    private readonly zeroShot: ZeroShotService,
    private readonly llm: LlmClient
  ) {}

  async runSingleTechnique(inputText: string, technique: string, params: any) {
    // sanitize and enforce input size in LlmClient; here we forward
    let result;
    switch (technique) {
      case 'zero_shot':
        result = await this.zeroShot.run(inputText, params);
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
