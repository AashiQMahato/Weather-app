import 'server-only';
import type Groq from 'groq-sdk';
import { clock as formatClock, longDate } from '../weather/format';
import { findPlace, getWeather } from '../weather/openMeteo';
import type { ClockFormat, Units } from '../types';
import { describeError, getGroq, modelOptions, resolveModel, userMessage } from './client';
import { buildFacts } from './facts';
import { chatSystem } from './prompts';
import type { ChatEvent } from './schemas';

type Message = Groq.Chat.Completions.ChatCompletionMessageParam;
type ToolCall = Groq.Chat.Completions.ChatCompletionMessageToolCall;

const MAX_TOOL_ROUNDS = 2;
const MAX_CALLS_PER_ROUND = 3;

const TOOLS: Groq.Chat.Completions.ChatCompletionTool[] = [
  {
    type: 'function',
    function: {
      name: 'get_weather',
      description: 'Get live current conditions and the forecast for a named place (city, town or landmark).',
      parameters: {
        type: 'object',
        properties: { location: { type: 'string', description: 'Place name, e.g. "Pokhara" or "Paris, France"' } },
        required: ['location'],
      },
    },
  },
];

interface ChatOptions {
  place: { name: string; latitude: number; longitude: number };
  units: Units;
  clock: ClockFormat;
  messages: { role: 'user' | 'assistant'; content: string }[];
}

/** Streams NDJSON ChatEvents. Weather is fetched here, never taken from the client. */
export function streamChat(options: ChatOptions): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();
  return new ReadableStream({
    async start(controller) {
      const send = (event: ChatEvent) => controller.enqueue(encoder.encode(`${JSON.stringify(event)}\n`));
      try {
        const [model, report] = await Promise.all([
          resolveModel(),
          getWeather({ latitude: options.place.latitude, longitude: options.place.longitude }),
        ]);
        const facts = buildFacts(report, options.place.name, options.units, options.clock);
        const places = [options.place.name];
        send({ type: 'context', places, fetchedAt: report.fetchedAt, model });

        const nowLabel = `${longDate(report.current.time)}, ${formatClock(report.current.time, options.clock)}`;
        const messages: Message[] = [
          { role: 'system', content: chatSystem(facts, nowLabel) },
          ...options.messages.map((m) => ({ role: m.role, content: m.content }) as Message),
        ];

        for (let round = 0; round <= MAX_TOOL_ROUNDS; round++) {
          const stream = await getGroq().chat.completions.create({
            model,
            messages,
            tools: TOOLS,
            tool_choice: round < MAX_TOOL_ROUNDS ? 'auto' : 'none',
            temperature: 0.4,
            max_completion_tokens: 700,
            stream: true,
            ...modelOptions(model),
          });

          let text = '';
          const calls: ToolCall[] = [];
          for await (const chunk of stream) {
            const delta = chunk.choices[0]?.delta;
            if (!delta) continue;
            if (delta.content) {
              text += delta.content;
              send({ type: 'delta', text: delta.content });
            }
            for (const call of delta.tool_calls ?? []) {
              const slot = (calls[call.index] ??= { id: '', type: 'function', function: { name: '', arguments: '' } });
              if (call.id) slot.id = call.id;
              if (call.function?.name) slot.function.name += call.function.name;
              if (call.function?.arguments) slot.function.arguments += call.function.arguments;
            }
          }

          const toolCalls = calls.filter(Boolean).slice(0, MAX_CALLS_PER_ROUND);
          if (toolCalls.length === 0) break;

          messages.push({ role: 'assistant', content: text || null, tool_calls: toolCalls });
          for (const call of toolCalls) {
            messages.push({ role: 'tool', tool_call_id: call.id, content: await runTool(call, options, places) });
          }
          send({ type: 'context', places: [...places], fetchedAt: new Date().toISOString(), model });
        }
        send({ type: 'done' });
      } catch (error) {
        console.error('AI chat failed:', describeError(error));
        send({ type: 'error', message: userMessage(error) });
      } finally {
        controller.close();
      }
    },
  });
}

async function runTool(call: ToolCall, options: ChatOptions, places: string[]): Promise<string> {
  if (call.function.name !== 'get_weather') return JSON.stringify({ error: 'Unknown tool.' });
  let location = '';
  try {
    location = String((JSON.parse(call.function.arguments || '{}') as { location?: unknown }).location ?? '').slice(0, 80);
  } catch {
    return JSON.stringify({ error: 'Invalid tool arguments.' });
  }
  if (!location) return JSON.stringify({ error: 'No location given.' });
  try {
    const place = await findPlace(location);
    if (!place) return JSON.stringify({ error: `No place found matching "${location}".` });
    const report = await getWeather(place);
    const label = [place.name, place.subtitle].filter(Boolean).join(', ');
    if (!places.includes(place.name)) places.push(place.name);
    const facts = buildFacts(report, label, options.units, options.clock);
    // Trim to keep the context small: drop the hourly list for secondary places.
    return JSON.stringify({ ...facts, next24h: facts.next24h.filter((_, i) => i % 2 === 0) });
  } catch (error) {
    return JSON.stringify({ error: `Weather lookup failed: ${describeError(error)}` });
  }
}
