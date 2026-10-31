import { getCurrentForPlaces } from '@/lib/weather/openMeteo';
import { NEPAL_CITIES } from '@/lib/weather/nepal';
import { failFrom, ok } from '@/lib/utils/apiResponse';

export async function GET() {
  try {
    return ok(await getCurrentForPlaces(NEPAL_CITIES));
  } catch (error) {
    return failFrom(error);
  }
}
