// src/run/utils/llm-client.ts
import axios from 'axios';
import { Injectable } from '@nestjs/common';
import * as dotenv from 'dotenv';
dotenv.config();

@Injectable()
export class LlmClient {
  provider = process.env.LLM_PROVIDER ?? 'google';
  apiUrlBase = process.env.LLM_API_URL ?? '';
  apiKey = process.env.LLM_API_KEY ?? '';
  modelName = process.env.LLM_MODEL ?? 'gemini-2.0-flash';

  async generate(prompt: string, opts: any = {}): Promise<{ text: string; raw: any; usage?: any; modelVersion?: string; responseId?: string }> {
    if (!prompt) return { text: '', raw: null };

    const timeoutMs = 20000;
    try {
      if (this.provider === 'google') {
        const url = `${this.apiUrlBase}?key=${this.apiKey}`;
        const body: any = {
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: typeof opts.temperature !== 'undefined' ? opts.temperature : 0.0,
            maxOutputTokens: typeof opts.maxOutputTokens !== 'undefined' ? opts.maxOutputTokens : (opts.maxTokens ?? 300),
          },
        };

        const resp = await axios.post(url, body, {
          headers: { 'Content-Type': 'application/json' },
          timeout: timeoutMs,
        });

        const data = resp.data ?? {};
        // Default returned pieces
        let extractedText = '';
        let usage = data.usageMetadata ?? data?.usage ?? null;
        const modelVersion = data.modelVersion ?? null;
        const responseId = data.responseId ?? null;

        if (Array.isArray(data.candidates) && data.candidates.length > 0) {
          const candidate = data.candidates[0];
          // candidate.content may be an object (with parts) or array
          const content = candidate.content ?? candidate?.message?.content ?? null;
          // If content has parts array
          if (content) {
            const parts = Array.isArray(content.parts) ? content.parts : Array.isArray(content) ? content : null;
            if (parts && parts.length > 0) {
              const textParts: string[] = [];
              for (const p of parts) {
                // handle different possible shapes
                if (typeof p === 'string') textParts.push(p);
                else if (p?.text) textParts.push(p.text);
                else if (p?.message?.content?.parts) {
                  for (const sp of p.message.content.parts) {
                    if (sp?.text) textParts.push(sp.text);
                  }
                } else if (p?.type === 'text' && p?.text) {
                  textParts.push(p.text);
                }
              }
              extractedText = textParts.join('').trim();
            } else if (typeof content === 'string') {
              extractedText = content;
            }
          }
          // fallback: candidate.display or candidate.message.content
          if (!extractedText) {
            if (candidate.display) extractedText = String(candidate.display);
            else if (candidate?.message?.content) {
              // message.content may contain parts
              const mc = candidate.message.content;
              if (Array.isArray(mc.parts)) {
                extractedText = mc.parts.map((p: any) => p?.text ?? '').join('').trim();
              } else if (typeof mc === 'string') {
                extractedText = mc;
              }
            }
          }
        } else {
          // Other shapes: data.output, data.text, data.candidates[0].message, etc.
          if (typeof data.output === 'string') extractedText = data.output;
          else if (typeof data.text === 'string') extractedText = data.text;
          else if (data?.candidates?.[0]?.message?.content) {
            const mc = data.candidates[0].message.content;
            if (mc?.parts) extractedText = mc.parts.map((p: any) => p?.text ?? '').join('').trim();
            else if (typeof mc === 'string') extractedText = mc;
          }
        }

        // Final fallback: if nothing found, serialize raw data so frontend can inspect it
        if (!extractedText) extractedText = JSON.stringify(data);

        return { text: extractedText, raw: data, usage, modelVersion, responseId };
      } else {
        // OpenAI-like flow: keep previous parsing
        const url = this.apiUrlBase;
        const body = {
          model: this.modelName,
          prompt,
          temperature: opts.temperature ?? 0.0,
          max_tokens: opts.maxTokens ?? 300,
        };
        const resp = await axios.post(url, body, {
          headers: { Authorization: `Bearer ${this.apiKey}`, 'Content-Type': 'application/json' },
          timeout: timeoutMs,
        });
        const data = resp.data ?? {};
        let text = '';
        if (data?.choices?.[0]?.text) text = data.choices[0].text;
        else if (data?.choices?.[0]?.message?.content) text = data.choices[0].message.content;
        else text = JSON.stringify(data);
        return { text, raw: data, usage: data?.usage ?? null };
      }
    } catch (err: any) {
      console.error('LLM call error', err?.response?.data ?? err?.message);
      const errMsg = err?.response?.data?.error?.message ?? err?.message ?? 'Unknown Error Occurs';
      return { text: `LLM_ERROR: ${errMsg}`, raw: err?.response?.data ?? err?.message };
    }
  }
}
