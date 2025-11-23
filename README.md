<p align="center">
  <a href="http://nestjs.com/" target="blank"><img src="https://nestjs.com/img/logo-small.svg" width="120" alt="Nest Logo" /></a>
</p>

[circleci-image]: https://img.shields.io/circleci/build/github/nestjs/nest/master?token=abc123def456
[circleci-url]: https://circleci.com/gh/nestjs/nest

  <p align="center">A progressive <a href="http://nodejs.org" target="_blank">Node.js</a> framework for building efficient and scalable server-side applications.</p>
    <p align="center">
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/v/@nestjs/core.svg" alt="NPM Version" /></a>
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/l/@nestjs/core.svg" alt="Package License" /></a>
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/dm/@nestjs/common.svg" alt="NPM Downloads" /></a>
<a href="https://circleci.com/gh/nestjs/nest" target="_blank"><img src="https://img.shields.io/circleci/build/github/nestjs/nest/master" alt="CircleCI" /></a>
<a href="https://discord.gg/G7Qnnhy" target="_blank"><img src="https://img.shields.io/badge/discord-online-brightgreen.svg" alt="Discord"/></a>
<a href="https://opencollective.com/nest#backer" target="_blank"><img src="https://opencollective.com/nest/backers/badge.svg" alt="Backers on Open Collective" /></a>
<a href="https://opencollective.com/nest#sponsor" target="_blank"><img src="https://opencollective.com/nest/sponsors/badge.svg" alt="Sponsors on Open Collective" /></a>
  <a href="https://paypal.me/kamilmysliwiec" target="_blank"><img src="https://img.shields.io/badge/Donate-PayPal-ff3f59.svg" alt="Donate us"/></a>
    <a href="https://opencollective.com/nest#sponsor"  target="_blank"><img src="https://img.shields.io/badge/Support%20us-Open%20Collective-41B883.svg" alt="Support us"></a>
  <a href="https://twitter.com/nestframework" target="_blank"><img src="https://img.shields.io/twitter/follow/nestframework.svg?style=social&label=Follow" alt="Follow us on Twitter"></a>
</p>
  <!--[![Backers on Open Collective](https://opencollective.com/nest/backers/badge.svg)](https://opencollective.com/nest#backer)
  [![Sponsors on Open Collective](https://opencollective.com/nest/sponsors/badge.svg)](https://opencollective.com/nest#sponsor)-->

## Description

[Nest](https://github.com/nestjs/nest) framework TypeScript starter repository.

# Introduction

Prompt Engineering Demo App - A web application that allow users to test all the prompt techniques (used for AI && LLMs), with detail template for each techniques (both input and output)

# Add New Prompt Technique — Backend Guide

This document explains **how to add a new prompt technique** to the demo app . It is written for team members who will implement a new technique (for example: ReAct, RAG, Self-Consistency, PAL). Follow the steps below to add the technique cleanly, consistently, and safely.

---

# Backend — Overview

**Goal:** Add a new technique handler (service + prompt template + parsing) and wire it into the single run endpoint (`POST /prompt/run`). The backend builds prompts, calls the LLM, parses responses, and returns a standardized JSON result the frontend expects.

## Where to add files

Typical structure (existing files):

```
src/prompt/
  prompt.controller.ts      // single endpoint that dispatches technique
  prompt.service.ts         // orchestrator
  dto/run-request.dto.ts
  techniques/
    zero-shot.service.ts
    few-shot.service.ts
    cot.service.ts
    ... (place new service here)
  utils/
    templates.ts         // prompt builders
    parser.ts            // parse helpers (parseSection, parseJSON, etc.)
    llm-client.ts        // wrapper to call Google GenAI / other provider
  presets.ts
```

## Step-by-step — Backend

### 1. Decide technique ID

Choose a short machine-safe key used in requests and routing, e.g. `react`, `rag`, `self_consistency`.

### 2. Add prompt builder (templates.ts)

Open `src/prompt/utils/templates.ts` and add a new builder function that returns a **strict** prompt. The builder should accept:

* `input: string`
* `params: object` (optional) — e.g. `examples`, `instructions`

**Guidelines for the prompt**

* Be explicit about the desired output format (JSON, single-label, numbered reasoning, or action blocks).
* For structured outputs ask for `Return ONLY valid JSON matching: {...}` if you want machine-parsable output.
* Add an `IMPORTANT:` block that instructs the model not to add extra text.

**Example signature**

```ts
export function buildReactPrompt(input: string, opts?: { toolSpec?: string }) {
  const inText = sanitizeInput(input);
  return `You are an assistant that can REASON and ACT.\n\nText:\n"${inText}"\n\nINSTRUCTIONS: ...`;
}
```

### 3. Create technique service

Create a file `src/prompt/techniques/<tech-key>.service.ts` e.g. `react.service.ts`.
Follow the pattern used by implemented techniques here (e.g. `cot.service.ts`):

* Build the prompt using the new builder function.
* Call `this.llm.generate(prompt, { temperature, maxOutputTokens })`.
* Parse the returned object (your `LlmClient` returns `{ text, raw, usage }`).
* Extract and normalize the fields you will return to the frontend.

**Return format (standard)**

```json
{
  "technique": "react",
  "prompt": "...",
  "outputs": [
    {
      "reasoning": "...",         // optional
      "finalAnswer": "...",       // required if applicable
      "actions": [...],            // optional
      "raw": { ... },              // original provider JSON
      "usage": { ... },
      "latencyMs": 123
    }
  ]
}
```

**Parsing tips**

* If you request `REASONING:` and `FINAL_ANSWER:` in the prompt, use `parseSection(text, 'REASONING')` and `parseSection(text, 'FINAL_ANSWER')` (see `parser.ts`).
* If you request JSON output, try `JSON.parse(text)` but guard it with `try/catch` and fallback to regex extraction.
* Always include `raw` and `usage` in the output for debugging.

### 4. Wire service into RunService

Open `src/prompt/prompt.service.ts` and add a `case` handling for your technique ID — call the new service's `run(inputText, params)` method. Keep the controller unchanged (single endpoint). Example:

```ts
case 'react':
  result = await this.reactService.run(inputText, params);
  break;
```

Remember to add the new service to `RunModule` providers.

### 5. Add tests / local manual checks

* Unit test the prompt builder: ensure the prompt contains required headers.
* Mock `LlmClient.generate` to test parsing logic.
* Manual check: run `curl` via the existing endpoint and verify `outputs[0].raw` and `outputs[0].finalAnswer`.

### 6. Validation & safety

* Enforce `maxInputLength` and `maxExamples`.
* If you accept retrieval documents (RAG), sanitize and limit passed content.
* Rate-limit and token-limit to avoid large costs.

### 7. Allowed techniques

* All the allowed techniques are mentioned in:

1. `prompt.controller.ts`: In the `allowed_techniques` array
2. `prompt.service.ts`: In the `runSingleTechnique` function, there is a switch-case function that includes all the techniques (minimum amount to implement). But the calling functions have not included yet (you have to **create a new service for the corresponding technique** and then call the function in the case).

* If you want to implement any techniques that is not mentioned in these files, feel free to add it (if you can), but make sure both the file have the technique you want to make
* However, you **must include the technique service** (e.g. RAGService, ReActService) you implemented in the `Provider` of `prompt.module.ts`, if not, you code will not run properly.

---

# Example: Adding `react` (ReAct) technique — Minimal Files

**Backend**

* `src/prompt/utils/templates.ts` — add `buildReactPrompt(input, opts)`
* `src/prompt/techniques/react.service.ts` — implement `run(input, params)`
* `src/prompt/prompt.module.ts` — register `ReactService`
* `src/prompt/prompt.service.ts` — call `this.reactService.run(...)` in dispatcher

---

# Helpful patterns & snippets

## Backend: prompt builder snippet (templates.ts)

```ts
export function buildReactPrompt(input: string, opts: any = {}) {
  const text = sanitizeInput(input);
  return `You are an agent that can reason and take actions.\nText:\n"${text}"\n\nINSTRUCTIONS: First produce REASONING under 'REASONING:' as numbered steps. Then produce ACTIONS as a JSON array under 'ACTIONS:' where each action is {"tool":"...","input":"..."}. Finally produce FINAL_ANSWER:.\nREASONING:\n1)\n2)\nACTIONS:\n[]\nFINAL_ANSWER:`;
}
```

## Backend: service skeleton (techniques/react.service.ts)

```ts
@Injectable()
export class ReactService {
  constructor(private readonly llm: LlmClient) {}
  async run(input: string, params:any={}){
    const prompt = buildReactPrompt(input, params);
    const out = await this.llm.generate(prompt, { temperature: params.temperature ?? 0.0, maxOutputTokens: params.maxOutputTokens ?? 500 });
    const text = out.text ?? out.rawText ?? JSON.stringify(out.raw);
    const reasoning = parseSection(text, 'REASONING');
    const actionsJson = parseSection(text, 'ACTIONS');
    let actions = null;
    try{ actions = actionsJson ? JSON.parse(actionsJson) : null } catch(e){ actions = null }
    const finalAnswer = parseSection(text, 'FINAL_ANSWER') ?? (text.split('\n').pop() ?? 'Unknown');
    return { technique: 'react', prompt, outputs:[{ reasoning, actions, finalAnswer, raw: out.raw, usage: out.usage }] };
  }
}
```

---

# Testing & QA checklist

* [ ] Unit test prompt builder output (string contains required headers)
* [ ] Mock LlmClient and test parsing of `raw` to ensure `reasoning` + `finalAnswer` extraction
* [ ] Manual E2E: run frontend page → server → model → ensure final answer and reasoning appear in UI
* [ ] Validate token usage & set safe defaults (maxOutputTokens, example count)
* [ ] Add small README in `src/run/README.md` describing the technique contract

---

# Troubleshooting tips

* If model returns extra text, first inspect `outputs[0].raw` and `rawText`. Adjust prompt to be stricter and shorten `maxOutputTokens`.
* Use `temperature: 0.0` for deterministic classification tasks.
* If you need structured JSON output, enforce `Return ONLY valid JSON matching: {...}` and parse with `JSON.parse()` on the backend.

---

## Project setup

```bash
$ npm install
```

## Compile and run the project

```bash
# development
$ npm run start

# watch mode
$ npm run start:dev

# production mode
$ npm run start:prod
```

## Run tests

```bash
# unit tests
$ npm run test

# e2e tests
$ npm run test:e2e

# test coverage
$ npm run test:cov
```

## Deployment

When you're ready to deploy your NestJS application to production, there are some key steps you can take to ensure it runs as efficiently as possible. Check out the [deployment documentation](https://docs.nestjs.com/deployment) for more information.

If you are looking for a cloud-based platform to deploy your NestJS application, check out [Mau](https://mau.nestjs.com), our official platform for deploying NestJS applications on AWS. Mau makes deployment straightforward and fast, requiring just a few simple steps:

```bash
$ npm install -g @nestjs/mau
$ mau deploy
```

With Mau, you can deploy your application in just a few clicks, allowing you to focus on building features rather than managing infrastructure.

## Resources

Check out a few resources that may come in handy when working with NestJS:

- Visit the [NestJS Documentation](https://docs.nestjs.com) to learn more about the framework.
- For questions and support, please visit our [Discord channel](https://discord.gg/G7Qnnhy).
- To dive deeper and get more hands-on experience, check out our official video [courses](https://courses.nestjs.com/).
- Deploy your application to AWS with the help of [NestJS Mau](https://mau.nestjs.com) in just a few clicks.
- Visualize your application graph and interact with the NestJS application in real-time using [NestJS Devtools](https://devtools.nestjs.com).
- Need help with your project (part-time to full-time)? Check out our official [enterprise support](https://enterprise.nestjs.com).
- To stay in the loop and get updates, follow us on [X](https://x.com/nestframework) and [LinkedIn](https://linkedin.com/company/nestjs).
- Looking for a job, or have a job to offer? Check out our official [Jobs board](https://jobs.nestjs.com).

## Support

Nest is an MIT-licensed open source project. It can grow thanks to the sponsors and support by the amazing backers. If you'd like to join them, please [read more here](https://docs.nestjs.com/support).

## Stay in touch

- Author - [Kamil Myśliwiec](https://twitter.com/kammysliwiec)
- Website - [https://nestjs.com](https://nestjs.com/)
- Twitter - [@nestframework](https://twitter.com/nestframework)

## License

Nest is [MIT licensed](https://github.com/nestjs/nest/blob/master/LICENSE).
