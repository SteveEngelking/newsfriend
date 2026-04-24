// Loads the bundled logo and returns a base64 data URI so it embeds inline
// in downloaded standalone HTML files (works offline, on file://, etc.)
import logoUrl from '@/assets/logo.jpg';

let cached: string | null = null;
let inflight: Promise<string> | null = null;

export async function getLogoDataUri(): Promise<string> {
  if (cached) return cached;
  if (inflight) return inflight;
  inflight = (async () => {
    try {
      const res = await fetch(logoUrl);
      const blob = await res.blob();
      const dataUri: string = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = () => reject(reader.error);
        reader.readAsDataURL(blob);
      });
      cached = dataUri;
      return dataUri;
    } catch {
      // Fallback to absolute URL on production domain
      cached = 'https://newsfriend.org/logo.jpg';
      return cached;
    } finally {
      inflight = null;
    }
  })();
  return inflight;
}
