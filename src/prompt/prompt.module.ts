import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { PromptController } from './prompt.controller';
import { PromptService } from './prompt.service';
import { ZeroShotService } from './techniques/zero-shot.service';
import { FewShotService } from './techniques/few-shot.service';
import { LlmClient } from './utils/llm-client';
import { ChainOfThoughtService } from './techniques/chain-of-thought.service';

@Module({
  imports: [HttpModule],
  controllers: [PromptController],
  providers: [
    PromptService,  
    LlmClient,
    ZeroShotService, 
    FewShotService,
    ChainOfThoughtService,
    //PALMService,
    //SelfConsistencyService,
    //DirectionalStimulusService,
    //ReflextionService,
    //RAGService,
    //ReActService,
  ]
})
export class PromptModule {}
