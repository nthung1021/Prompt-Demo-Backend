import { IsArray, IsIn, IsInt, IsNotEmpty, IsOptional, IsString, Max, Min } from 'class-validator';

export const ALLOWED_TECHNIQUES = ['zero_shot', 'few_shot', 'cot'] as const;
export type Technique = typeof ALLOWED_TECHNIQUES[number];

export class RunParamsDto {
  @IsOptional()
  @IsString()
  constraints?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(5)
  selfConsistencyRuns?: number;

  @IsOptional()
  @IsString()
  temperature?: number | string;
}

export class RunRequestDto {
  @IsString()
  @IsNotEmpty()
  inputText: string;

  @IsArray()
  @IsNotEmpty()
  techniques: string[];

  @IsOptional()
  params?: RunParamsDto;
}
