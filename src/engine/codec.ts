// Real levels are stored as gzip + base64 JSON so a diff or a stray `cat` shows noise, not a
// story. Uses web-standard streams, so the same code runs in the browser, Vitest and scripts.
import { parseLevel, type Level, type ParseResult } from './schema.ts'

export async function encodeLevel(level: Level): Promise<string> {
  const json = new Blob([JSON.stringify(level)]).stream()
  const gzip = await new Response(json.pipeThrough(new CompressionStream('gzip'))).bytes()
  return toBase64(gzip)
}

export type DecodeResult = ParseResult | { ok: false; issues: [{ path: ''; code: 'CORRUPT' }] }

export async function decodeLevel(text: string): Promise<DecodeResult> {
  let json: unknown
  try {
    const gzip = new Blob([fromBase64(text.trim())]).stream()
    json = JSON.parse(await new Response(gzip.pipeThrough(new DecompressionStream('gzip'))).text())
  } catch {
    return { ok: false, issues: [{ path: '', code: 'CORRUPT' }] }
  }
  return parseLevel(json)
}

function toBase64(bytes: Uint8Array): string {
  let binary = ''
  for (let i = 0; i < bytes.length; i += 0x8000) binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000))
  return btoa(binary)
}

function fromBase64(text: string): Uint8Array<ArrayBuffer> {
  return Uint8Array.from(atob(text), c => c.charCodeAt(0))
}
