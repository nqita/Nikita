import { describe, expect, it, vi } from 'vitest';
import { run } from './openai';
import type { Message } from '../types';

const MESSAGES: Message[] = [
  { role: 'system', content: 'You are Nikita.' },
  { role: 'user', content: 'Hello' },
];

function createFetchResponse(payload: unknown) {
  return {
    ok: true,
    json: vi.fn().mockResolvedValue(payload),
    text: vi.fn().mockResolvedValue(''),
  };
}

describe('run', () => {
  it('prefers Cloudflare AI by default when both providers are configured', async () => {
    const cfRun = vi.fn().mockResolvedValue({ response: 'cloudflare-response' });
    const fetchSpy = vi.spyOn(globalThis, 'fetch');
    fetchSpy.mockResolvedValue(createFetchResponse({
      choices: [{ message: { content: 'openai-response' } }],
    }) as unknown as Response);

    const result = await run(
      { messages: MESSAGES, maxTokens: 128 },
      {
        cfAI: { run: cfRun } as unknown as Ai,
        openaiApiKey: 'test-key',
      }
    );

    expect(result.content).toBe('cloudflare-response');
    expect(result.model.provider).toBe('cloudflare');
    expect(cfRun).toHaveBeenCalledTimes(1);
    expect(fetchSpy).not.toHaveBeenCalled();

    fetchSpy.mockRestore();
  });

  it('falls back to OpenAI when Cloudflare AI fails and OpenAI is configured', async () => {
    const cfRun = vi.fn().mockRejectedValue(new Error('cf failed'));
    const fetchSpy = vi.spyOn(globalThis, 'fetch');
    fetchSpy.mockResolvedValue(createFetchResponse({
      choices: [{ message: { content: 'openai-response' } }],
    }) as unknown as Response);

    const result = await run(
      { messages: MESSAGES, maxTokens: 128 },
      {
        cfAI: { run: cfRun } as unknown as Ai,
        openaiApiKey: 'test-key',
        spendMode: 'paid-fallback',
      }
    );

    expect(result.content).toBe('openai-response');
    expect(result.model.provider).toBe('openai');
    expect(fetchSpy).toHaveBeenCalledTimes(1);

    fetchSpy.mockRestore();
  });

  it('blocks paid fallback in free-only mode', async () => {
    const cfRun = vi.fn().mockRejectedValue(new Error('cf failed'));
    const fetchSpy = vi.spyOn(globalThis, 'fetch');
    fetchSpy.mockResolvedValue(createFetchResponse({
      choices: [{ message: { content: 'openai-response' } }],
    }) as unknown as Response);

    await expect(() =>
      run(
        { messages: MESSAGES, maxTokens: 128 },
        {
          cfAI: { run: cfRun } as unknown as Ai,
          openaiApiKey: 'test-key',
          spendMode: 'free-only',
        }
      )
    ).rejects.toThrow('cf failed');

    expect(fetchSpy).not.toHaveBeenCalled();
    fetchSpy.mockRestore();
  });

  it('uses Cloudflare fallback model when the primary model fails', async () => {
    const cfRun = vi
      .fn()
      .mockRejectedValueOnce(new Error('primary failed'))
      .mockResolvedValueOnce({ response: 'fallback-response' });

    const result = await run(
      { messages: MESSAGES, maxTokens: 128 },
      {
        cfAI: { run: cfRun } as unknown as Ai,
        cfModel: '@cf/meta/llama-3.3-70b-instruct-fp8-fast',
        cfFallbackModel: '@cf/meta/llama-3.1-8b-instruct-fp8-fast',
      }
    );

    expect(result.content).toBe('fallback-response');
    expect(result.model.provider).toBe('cloudflare');
    expect(result.model.fallback).toBe(true);
    expect(cfRun).toHaveBeenNthCalledWith(
      1,
      '@cf/meta/llama-3.3-70b-instruct-fp8-fast',
      expect.any(Object)
    );
    expect(cfRun).toHaveBeenNthCalledWith(
      2,
      '@cf/meta/llama-3.1-8b-instruct-fp8-fast',
      expect.any(Object)
    );
  });

  it('uses route-specific models when provided', async () => {
    const cfRun = vi.fn().mockResolvedValue({ response: 'cloudflare-response' });

    const result = await run(
      { messages: MESSAGES, maxTokens: 128, route: 'analyze', quality: 'best' },
      {
        cfAI: { run: cfRun } as unknown as Ai,
        cfModel: '@cf/meta/llama-3.3-70b-instruct-fp8-fast',
        cfAnalyzeModel: '@cf/meta/llama-4-scout-17b-16e-instruct',
        cfFallbackModel: '@cf/meta/llama-3.1-8b-instruct-fp8-fast',
      }
    );

    expect(result.content).toBe('cloudflare-response');
    expect(result.model.model).toBe('@cf/meta/llama-4-scout-17b-16e-instruct');
    expect(cfRun).toHaveBeenCalledWith(
      '@cf/meta/llama-4-scout-17b-16e-instruct',
      expect.any(Object)
    );
  });
});
