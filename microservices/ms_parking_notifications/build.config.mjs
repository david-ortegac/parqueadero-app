import { build } from 'esbuild';
import { writeFileSync, mkdirSync, existsSync } from 'fs';

const sharedConfig = {
  entryPoints: ['src/index.ts'],
  bundle: true,
  platform: 'node',
  target: 'node22',
  external: ['@aws-sdk/client-dynamodb', '@aws-sdk/lib-dynamodb'],
  sourcemap: true,
  minify: false,
  metafile: true,
};

async function buildForLambda() {
  try {
    console.log('🔨 Iniciando build para AWS Lambda ms_parking_notifications...');

    if (!existsSync('dist')) {
      mkdirSync('dist', { recursive: true });
    }

    if (!existsSync('releases')) {
      mkdirSync('releases', { recursive: true });
    }

    const result = await build({
      ...sharedConfig,
      outfile: 'dist/index.js',
      format: 'cjs',
    });

    console.log('✅ Build completado exitosamente');
    console.log(
      `📦 Tamaño del bundle: ${(result.metafile.outputs['dist/index.js'].bytes / 1024).toFixed(2)} KB`,
    );

    const packageJson = {
      name: 'ms-parking-notifications',
      version: '1.0.0',
      main: 'index.js',
      type: 'commonjs',
      dependencies: {},
    };

    writeFileSync('dist/package.json', JSON.stringify(packageJson, null, 2));
    console.log('✅ package.json creado en dist/');
  } catch (error) {
    console.error('❌ Error en el build:', error);
    process.exit(1);
  }
}

buildForLambda();
