import { AiUnavailableError, describeError, isAiConfigured, resolveModel } from '@/lib/groq/client';
import { ok } from '@/lib/utils/apiResponse';

/** Whether AI features are available, and which verified model is in use. Never returns the key. */
export async function GET() {
  if (!isAiConfigured()) return ok({ enabled: false, model: null, reason: 'GROQ_API_KEY is not set.' }, 'private');
  try {
    return ok({ enabled: true, model: await resolveModel(), reason: null }, 'private');
  } catch (error) {
    return ok({ enabled: false, model: null, reason: error instanceof AiUnavailableError ? error.message : describeError(error) }, 'private');
  }
}
