import { defineConfig } from 'vite';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
export default defineConfig({ base: './', server: { port: 5185, strictPort: true }, plugins: [{ name: 'version-offline-cache', writeBundle(options, bundle) {
  const version = createHash('sha256').update(Object.keys(bundle).sort().join('\n')).digest('hex').slice(0, 16);
  const source = fs.readFileSync('public/sw.js', 'utf8').replace("`${CACHE_PREFIX}v1`", '`' + '${CACHE_PREFIX}' + version + '`');
  fs.writeFileSync((options.dir || 'dist') + '/sw.js', source);
} }] });
