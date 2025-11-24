import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { PromptController } from './prompt.controller';
import { PromptService } from './prompt.service';
import { ZeroShotService } from './techniques/zero-shot.service';
import { FewShotService } from './techniques/few-shot.service';
import { LlmClient } from './utils/llm-client';
import { ChainOfThoughtService } from './techniques/chain-of-thought.service';
import { PalService } from './techniques/pal.service';

@Module({
  imports: [HttpModule],
  controllers: [PromptController],
  providers: [
    PromptService,
    LlmClient,
    ZeroShotService,
    FewShotService,
    ChainOfThoughtService,
    PalService,
    //SelfConsistencyService,
    //DirectionalStimulusService,
    //ReflextionService,
    //RAGService,
    //ReActService,
  ],
})
export class PromptModule {}
