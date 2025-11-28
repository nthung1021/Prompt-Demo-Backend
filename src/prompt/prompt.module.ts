import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { PromptController } from './prompt.controller';
import { DocumentController } from './document.controller';
import { PromptService } from './prompt.service';
import { ZeroShotService } from './techniques/zero-shot.service';
import { FewShotService } from './techniques/few-shot.service';
import { RAGService } from './techniques/rag.service';
import { LlmClient } from './utils/llm-client';
import { DocumentService } from './utils/document.service';
import { ChainOfThoughtService } from './techniques/chain-of-thought.service';
import { PalService } from './techniques/pal.service';
import { SelfConsistencyService } from './techniques/self-consistency.service';
import { DirectionalStimulusService } from './techniques/directional-stimulus.service';
import { ReActService } from './techniques/react.service';
import { ReflexionService } from './techniques/reflextion.service';

@Module({
  imports: [HttpModule],
  controllers: [PromptController, DocumentController],
  providers: [
    PromptService,
    DocumentService,
    LlmClient,
    ZeroShotService,
    FewShotService,
    ChainOfThoughtService,
    PalService,
    SelfConsistencyService,
    DirectionalStimulusService,
    ReActService,
    ReflexionService,
    RAGService,
  ],
})
export class PromptModule {}
