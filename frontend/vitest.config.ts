import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    alias: [
      {
        find: '@ionic/core/components',
        replacement: '@ionic/core/components/index.js',
      },
    ],
  },
  test: {
    server: {
      deps: {
        inline: [/@ionic/],
      },
    },
  },
  ssr: {
    noExternal: [/@ionic/],
  },
});
