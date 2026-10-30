import { getCurrentForPlaces } from '@/lib/openMeteo';
import { NEPAL_CITIES } from '@/lib/nepal';
import { failFrom, ok } from '@/lib/apiResponse';

export async function GET() {
  try {
    return ok(await getCurrentForPlaces(NEPAL_CITIES));
  } catch (error) {
    return failFrom(error);
  }
}
