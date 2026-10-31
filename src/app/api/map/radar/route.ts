import { getRadarFrames } from '@/lib/weather/radar';
import { fail, ok } from '@/lib/utils/apiResponse';

export async function GET() {
  try {
    return ok(await getRadarFrames());
  } catch (error) {
    console.error('Radar frames failed:', error);
    return fail('Radar data is temporarily unavailable.', 503);
  }
}
