// This file is part of @robomous/opencv-js-react project from Robomous.
// It is subject to the license terms in the LICENSE file found in the top-level directory

import { defineConfig } from 'tsup';
import { copyFile, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm', 'cjs'],
  dts: true,
  sourcemap: true,
  minify: true,
  clean: true,
  external: ['react', 'react-dom', 'react/jsx-runtime'],
  treeshake: true,
  async onSuccess() {
    const src = 'src/assets/opencv';
    const dest = 'dist/assets/opencv';
    if (existsSync(src)) {
      await mkdir(dest, { recursive: true });
      const { readdirSync } = await import('node:fs');
      for (const file of readdirSync(src)) {
        if (file.endsWith('.js') || file.endsWith('.wasm') || file.endsWith('.md')) {
          await copyFile(`${src}/${file}`, `${dest}/${file}`);
        }
      }
    }
  },
});
