import type { Metadata } from 'next';
import { AiView } from '@/components/views/AiView';

export const metadata: Metadata = { title: 'AI Weather', description: 'AI weather analyst, assistant, recommendations and risk insights powered by Groq.' };

export default function AiPage() {
  return <AiView />;
}
