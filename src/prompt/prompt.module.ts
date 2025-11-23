import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { PromptController } from './prompt.controller';
import { PromptService } from './prompt.service';
import { ZeroShotService } from './techniques/zero-shot.service';
import { LlmClient } from './utils/llm-client';

@Module({
  imports: [HttpModule],
  controllers: [PromptController],
  providers: [PromptService, ZeroShotService, LlmClient]
})
export class PromptModule {}
