// Downloads everything the journey needs before it opens, with real progress, and keeps each file in memory
// (as a blob: URL) so nothing loads from the network mid-journey. asset(url) gives the in-memory copy if there is one.
// Story narration is not included: it only plays when you press Listen, so it streams then.
const blobs = new Map();

/** The in-memory copy of url once it has been preloaded, else url itself. */
export const asset = (url) => blobs.get(url) ?? url;

/** Fetch one file, reporting bytes as they arrive. Tries up to three times. */
async function getOne(url, onBytes) {
  for (let attempt = 1; ; attempt++) {
    let got = 0;
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error(`${res.status} ${url}`);
      const total = Number(res.headers.get('content-length')) || 0;
      if (attempt === 1) onBytes(0, total);      // count each file's size once, even if it is retried
      const reader = res.body.getReader(), parts = [];
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        parts.push(value); got += value.length; onBytes(value.length, 0);
      }
      const type = res.headers.get('content-type') || '';
      blobs.set(url, URL.createObjectURL(new Blob(parts, { type })));
      return true;
    } catch (err) {
      onBytes(-got, 0);                       // take back what this attempt counted
      if (attempt >= 3) { console.warn('could not preload', url, err); return false; }
      await new Promise((r) => setTimeout(r, 600 * attempt));
    }
  }
}

/** Downloads all urls (six at a time). onProgress(fraction 0…1, bytesLoaded, bytesTotal). Resolves with the failures.
 *  Until every file has reported its size, the fraction is scaled down by the share of sizes known, so it never jumps back. */
export async function preload(urls, onProgress) {
  const list = [...new Set(urls)], failed = [];
  let loaded = 0, total = 0, known = 0, next = 0, shown = 0;
  const report = () => {
    const f = total ? (loaded / total) * (known / list.length) : 0;
    shown = Math.max(shown, Math.min(0.999, f));
    onProgress(shown, loaded, total);
  };
  const work = async () => {
    while (next < list.length) {
      const url = list[next++];
      const ok = await getOne(url, (d, t) => { loaded += d; if (t) { total += t; known++; } report(); });
      if (!ok) failed.push(url);
    }
  };
  await Promise.all(Array.from({ length: Math.min(6, list.length) }, work));
  onProgress(1, loaded, total);
  return failed;
}
