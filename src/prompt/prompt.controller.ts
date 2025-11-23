import { Body, Controller, HttpException, HttpStatus, Post } from '@nestjs/common';
import { PromptService } from './prompt.service';
import { RunRequestDto } from './dto/run-request.dto';

const allowed_techniques = [
  'zero_shot',
  'few_shot',
  'chain_of_thought'
]

@Controller('prompt')
export class PromptController {
  constructor(private readonly promptService: PromptService) {}

  @Post('run')
  async promptTechnique(@Body() body: RunRequestDto) {
    // Enforce exactly one technique selected
    if (!body.techniques || body.techniques.length !== 1) {
      throw new HttpException(
        { message: 'Exactly one technique must be selected', allowed: allowed_techniques },
        HttpStatus.BAD_REQUEST
      );
    }
    const technique = body.techniques[0];
    if (!allowed_techniques.includes(technique)) {
      throw new HttpException({ message: 'Technique not supported' }, HttpStatus.BAD_REQUEST);
    }
    return this.promptService.runSingleTechnique(body.inputText, technique, body.params ?? {});
  }
}
