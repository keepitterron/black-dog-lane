import react from '@vitejs/plugin-react'
import { defineConfig, type Plugin } from 'vite'

// Files in public/ are copied, not bundled, so the precache list names them explicitly.
const PUBLIC_FILES = [
  'manifest.webmanifest',
  'icons/icon-192.png',
  'icons/icon-512.png',
  'icons/maskable-512.png',
  'icons/apple-touch-icon.png',
  'icons/favicon.svg',
]

// Emits src/sw/sw.ts as /sw.js and fills in its precache list and cache version.
function precache(): Plugin {
  return {
    name: 'bdl-precache',
    apply: 'build',
    generateBundle(_options, bundle) {
      const sw = Object.values(bundle).find(file => file.type === 'chunk' && file.name === 'sw')
      if (sw?.type !== 'chunk') this.error('sw chunk missing')
      const files = Object.keys(bundle)
        .filter(name => name !== sw.fileName && !name.endsWith('.map'))
        .concat(PUBLIC_FILES)
        .toSorted()
      const urls = ['./', ...files.filter(name => name !== 'index.html')]
      const html = bundle['index.html']
      const htmlSource = html?.type === 'asset' ? String(html.source) : ''
      sw.code = sw.code
        .replaceAll('__SW_VERSION__', JSON.stringify(fnv1a(files.join('\n') + htmlSource)))
        .replaceAll('__SW_PRECACHE__', JSON.stringify(urls))
    },
  }
}

function fnv1a(text: string): string {
  let hash = 0x811c9dc5
  for (let i = 0; i < text.length; i++) hash = Math.imul(hash ^ text.charCodeAt(i), 0x01000193)
  return (hash >>> 0).toString(36)
}

export default defineConfig({
  base: '/black-dog-lane/',
  plugins: [react(), precache()],
  define: { __BUILD_ID__: JSON.stringify(process.env['GITHUB_SHA']?.slice(0, 7) ?? 'local') },
  build: {
    target: 'es2024',
    rolldownOptions: {
      input: { index: 'index.html', sw: 'src/sw/sw.ts' },
      output: {
        entryFileNames: chunk => (chunk.name === 'sw' ? 'sw.js' : 'assets/[name]-[hash].js'),
      },
    },
  },
})
