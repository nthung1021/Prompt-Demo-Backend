import { Injectable } from '@nestjs/common';
import { ZeroShotService } from './techniques/zero-shot.service';
import { LlmClient } from './utils/llm-client';
import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';
import { FewShotService } from './techniques/few-shot.service';
import { ChainOfThoughtService } from './techniques/chain-of-thought.service';
import { PalService } from './techniques/pal.service';
import { SelfConsistencyService } from './techniques/self-consistency.service';
import { DirectionalStimulusService } from './techniques/directional-stimulus.service';
import { ReActService } from './techniques/react.service';

@Injectable()
export class PromptService {
  constructor(
    private readonly zeroShot: ZeroShotService,
    private readonly fewShot: FewShotService,
    private readonly chainOfThought: ChainOfThoughtService,
    private readonly palService: PalService,
    private readonly selfConsistency: SelfConsistencyService,
    private readonly directionalStimulus: DirectionalStimulusService,
    private readonly reactService: ReActService,
    private readonly llm: LlmClient,
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
      case 'pal':
        result = await this.palService.run(inputText, params);
        break;
      case 'self_consistency':
        result = await this.selfConsistency.run(inputText, params);
        break;
      case 'directional_stimulus':
        result = await this.directionalStimulus.run(inputText, params);
        break;
      case 'reflextion':
        // result = await this.reflextion.run(inputText, params);
        break;
      case 'rag':
        // result = await this.RAG.run(inputText, params);
        break;
      case 'react':
        result = await this.reactService.run(inputText, params);
        break;
      default:
        throw new Error('Unsupported technique');
    }

    // include model meta
    return {
      technique,
      model: this.llm.modelName,
      ...result,
    };
  }
}
