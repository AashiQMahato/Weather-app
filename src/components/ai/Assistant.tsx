'use client';

import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { ArrowUp, Check, Copy, Database, Eraser, MessageCircle, Square, TriangleAlert } from 'lucide-react';
import { streamChat } from '@/lib/api';
import { usePersistentState } from '@/hooks/usePersistentState';
import { usePreferences } from '@/providers/PreferencesProvider';
import { useToast } from '@/providers/ToastProvider';
import { useAiStatus } from '@/providers/WeatherProvider';
import { AiBadge } from './AiBadge';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  /** Places whose live data the answer used. */
  places?: string[];
  fetchedAt?: string;
  error?: boolean;
}

const MAX_INPUT = 500;
const HISTORY_SENT = 10;

const SUGGESTIONS = [
  'Will it rain today?',
  'Should I carry an umbrella?',
  'What should I wear today?',
  'Is it a good day for cycling?',
  'Compare Kathmandu and Pokhara weather',
  'What is the best time for an outdoor walk?',
  "Explain today's UV index",
  'Why does it feel different from the actual temperature?',
  'Is tomorrow suitable for travelling?',
];

/** Renders **bold**, bullet lists and line breaks without injecting HTML. */
function RichText({ text }: { text: string }) {
  const inline = (line: string) =>
    line.split(/(\*\*[^*]+\*\*)/g).map((part, i) =>
      part.startsWith('**') && part.endsWith('**') ? (
        <strong key={i} className="font-semibold text-ink">
          {part.slice(2, -2)}
        </strong>
      ) : (
        <span key={i}>{part}</span>
      ),
    );
  const blocks: React.ReactNode[] = [];
  let list: string[] = [];
  const flush = () => {
    if (list.length) {
      blocks.push(
        <ul key={`l${blocks.length}`} className="my-1.5 list-disc space-y-1 pl-5">
          {list.map((item, i) => (
            <li key={i}>{inline(item)}</li>
          ))}
        </ul>,
      );
      list = [];
    }
  };
  text.split('\n').forEach((raw) => {
    const line = raw.trimEnd();
    const bullet = line.match(/^\s*[-*•]\s+(.*)/);
    if (bullet) return list.push(bullet[1]);
    flush();
    if (line.trim()) blocks.push(<p key={`p${blocks.length}`} className="my-1.5 first:mt-0 last:mb-0">{inline(line)}</p>);
  });
  flush();
  return <>{blocks}</>;
}

function TypingDots() {
  return (
    <span className="inline-flex items-center gap-1 py-1" role="status" aria-label="Assistant is typing">
      {[0, 1, 2].map((i) => (
        <motion.span key={i} className="size-1.5 rounded-full bg-ink-3" animate={{ y: [0, -4, 0], opacity: [0.5, 1, 0.5] }} transition={{ duration: 0.9, repeat: Infinity, delay: i * 0.15 }} />
      ))}
    </span>
  );
}

export function Assistant() {
  const { place, units, clock } = usePreferences();
  const ai = useAiStatus();
  const toast = useToast();
  const [messages, setMessages] = usePersistentState<ChatMessage[]>('skycast:v2:chat', []);
  const [input, setInput] = useState('');
  const [streaming, setStreaming] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const controllerRef = useRef<AbortController | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages]);

  useEffect(() => () => controllerRef.current?.abort(), []);

  const send = async (text: string) => {
    const question = text.trim().slice(0, MAX_INPUT);
    if (!question || streaming) return;
    const userMsg: ChatMessage = { id: crypto.randomUUID(), role: 'user', content: question };
    const replyId = crypto.randomUUID();
    const history = [...messages.filter((m) => !m.error), userMsg].slice(-HISTORY_SENT).map(({ role, content }) => ({ role, content }));
    setMessages((list) => [...list, userMsg, { id: replyId, role: 'assistant', content: '' }]);
    setInput('');
    setStreaming(true);
    const controller = new AbortController();
    controllerRef.current = controller;
    const patch = (fn: (m: ChatMessage) => ChatMessage) => setMessages((list) => list.map((m) => (m.id === replyId ? fn(m) : m)));

    try {
      await streamChat(
        { place, units, clock, messages: history },
        (event) => {
          if (event.type === 'context') patch((m) => ({ ...m, places: event.places, fetchedAt: event.fetchedAt }));
          else if (event.type === 'delta') patch((m) => ({ ...m, content: m.content + event.text }));
          else if (event.type === 'error') patch((m) => ({ ...m, content: m.content || event.message, error: !m.content }));
        },
        controller.signal,
      );
    } catch (error) {
      if (controller.signal.aborted) patch((m) => ({ ...m, content: m.content || 'Stopped.' }));
      else patch((m) => ({ ...m, content: error instanceof Error ? error.message : 'Something went wrong.', error: true }));
    } finally {
      setStreaming(false);
      controllerRef.current = null;
      inputRef.current?.focus();
    }
  };

  const copy = async (m: ChatMessage) => {
    try {
      await navigator.clipboard.writeText(m.content);
      setCopied(m.id);
      window.setTimeout(() => setCopied(null), 1500);
    } catch {
      toast('Copy is not available here', 'info');
    }
  };

  const disabled = ai.checked && !ai.enabled;
  const last = messages[messages.length - 1];

  return (
    <section aria-label="AI weather assistant" className="panel flex h-[min(78dvh,720px)] min-h-[520px] flex-col overflow-hidden">
      <header className="flex items-center justify-between gap-3 border-b border-line px-5 py-4">
        <div className="flex items-center gap-3">
          <AiBadge thinking={streaming} />
          <div>
            <h2 className="text-[15px] font-semibold">Skycast Assistant</h2>
            <p className="text-xs text-ink-3">Answers from live weather for {place.name}</p>
          </div>
        </div>
        {messages.length > 0 && (
          <button
            type="button"
            onClick={() => {
              controllerRef.current?.abort();
              setMessages([]);
            }}
            className="inline-flex h-8 items-center gap-1.5 rounded-full border border-line px-3 text-xs font-medium text-ink-2 hover:bg-ink/[0.06] hover:text-ink"
          >
            <Eraser className="size-3.5" aria-hidden /> Clear
          </button>
        )}
      </header>

      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-5 sm:px-5" aria-live="polite">
        {messages.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center text-center">
            <span className="grid size-14 place-items-center rounded-2xl glass-1">
              <MessageCircle className="size-6 text-ink-2" aria-hidden />
            </span>
            <p className="mt-4 text-base font-semibold">Ask anything about the weather</p>
            <p className="mt-1 max-w-sm text-sm text-ink-3">I check live forecasts for {place.name} and any other place you mention.</p>
            <div className="mt-6 flex max-w-lg flex-wrap justify-center gap-2">
              {SUGGESTIONS.slice(0, 6).map((s) => (
                <button key={s} type="button" disabled={disabled} onClick={() => send(s)} className="rounded-full border border-line glass-1 px-3.5 py-2 text-sm text-ink-2 transition-colors hover:bg-ink/[0.08] hover:text-ink disabled:opacity-50">
                  {s}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <ul className="space-y-5">
            <AnimatePresence initial={false}>
              {messages.map((m) => (
                <motion.li key={m.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className={m.role === 'user' ? 'flex justify-end' : 'flex gap-3'}>
                  {m.role === 'user' ? (
                    <p className="max-w-[85%] rounded-3xl rounded-br-lg bg-ink px-4 py-2.5 text-[15px] text-canvas">{m.content}</p>
                  ) : (
                    <>
                      <AiBadge size="sm" />
                      <div className="min-w-0 max-w-[88%] flex-1">
                        <div className={`rounded-3xl rounded-tl-lg px-4 py-3 text-[15px] leading-relaxed ${m.error ? 'bg-critical/10 text-critical' : 'glass-1 text-ink-2'}`}>
                          {m.error && <TriangleAlert className="mb-1 size-4" aria-hidden />}
                          {m.content ? <RichText text={m.content} /> : <TypingDots />}
                        </div>
                        {m.content && !m.error && !(streaming && m.id === last?.id) && (
                          <div className="mt-1.5 flex flex-wrap items-center gap-2 px-1 text-[11px] text-ink-3">
                            {m.places && (
                              <span className="inline-flex items-center gap-1 rounded-full glass-1 px-2 py-0.5" title="Answer grounded in live forecast data">
                                <Database className="size-3" aria-hidden />
                                Live data: {m.places.join(', ')}
                              </span>
                            )}
                            <span>Advice is AI-generated</span>
                            <button type="button" onClick={() => copy(m)} className="ml-auto inline-flex items-center gap-1 rounded-full px-2 py-0.5 hover:bg-ink/[0.06] hover:text-ink" aria-label="Copy response">
                              {copied === m.id ? <Check className="size-3" /> : <Copy className="size-3" />}
                              {copied === m.id ? 'Copied' : 'Copy'}
                            </button>
                          </div>
                        )}
                      </div>
                    </>
                  )}
                </motion.li>
              ))}
            </AnimatePresence>
          </ul>
        )}
      </div>

      <div className="border-t border-line p-3 sm:p-4">
        {messages.length > 0 && !streaming && (
          <div className="no-scrollbar -mx-1 mb-2 flex gap-1.5 overflow-x-auto px-1">
            {SUGGESTIONS.filter((s) => !messages.some((m) => m.content === s))
              .slice(0, 4)
              .map((s) => (
                <button key={s} type="button" onClick={() => send(s)} disabled={disabled} className="shrink-0 rounded-full border border-line px-3 py-1.5 text-xs text-ink-2 hover:bg-ink/[0.06] hover:text-ink disabled:opacity-50">
                  {s}
                </button>
              ))}
          </div>
        )}
        {disabled ? (
          <p className="rounded-2xl glass-1 px-4 py-3 text-sm text-ink-2">The assistant is offline: {ai.reason ?? 'AI is not configured on this deployment.'}</p>
        ) : (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              send(input);
            }}
            className="flex items-end gap-2 rounded-3xl border border-line glass-1 p-1.5 pl-4 focus-within:border-ink/30"
          >
            <label htmlFor="assistant-input" className="sr-only">
              Ask about the weather
            </label>
            <textarea
              id="assistant-input"
              ref={inputRef}
              value={input}
              rows={1}
              maxLength={MAX_INPUT}
              onChange={(e) => {
                setInput(e.target.value);
                e.target.style.height = 'auto';
                e.target.style.height = `${Math.min(e.target.scrollHeight, 120)}px`;
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  send(input);
                }
              }}
              placeholder={`Ask about ${place.name}'s weather…`}
              className="max-h-[120px] flex-1 resize-none bg-transparent py-2 text-[15px] placeholder:text-ink-3 focus:outline-none"
            />
            {input.length > MAX_INPUT - 80 && <span className="tabular self-center text-[11px] text-ink-3">{MAX_INPUT - input.length}</span>}
            {streaming ? (
              <button type="button" onClick={() => controllerRef.current?.abort()} aria-label="Stop generating" className="grid size-9 shrink-0 place-items-center rounded-full bg-ink text-canvas">
                <Square className="size-3.5 fill-current" />
              </button>
            ) : (
              <button type="submit" disabled={!input.trim()} aria-label="Send" className="grid size-9 shrink-0 place-items-center rounded-full bg-ink text-canvas transition-opacity disabled:opacity-30">
                <ArrowUp className="size-4" />
              </button>
            )}
          </form>
        )}
        <p className="mt-2 px-1 text-[11px] text-ink-3">Uses live Open-Meteo forecasts. No historical data. AI can make mistakes and never replaces official warnings.</p>
      </div>
    </section>
  );
}
