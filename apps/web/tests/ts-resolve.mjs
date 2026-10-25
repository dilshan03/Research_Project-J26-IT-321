/**
 * Lets the Node unit tests import app modules that use Vite-style extension-less relative imports
 * (e.g. `import { localized } from './language'`). Register with:
 *   node --experimental-strip-types --import ./tests/ts-resolve.mjs --test <files>
 */
import { register } from 'node:module';

register(
  'data:text/javascript,' +
    encodeURIComponent(`
export async function resolve(specifier, context, next) {
  try {
    return await next(specifier, context);
  } catch (err) {
    const relative = specifier.startsWith('./') || specifier.startsWith('../');
    if (relative && !/\\.[cm]?[jt]sx?$/.test(specifier)) {
      try { return await next(specifier + '.ts', context); } catch { /* fall through */ }
    }
    throw err;
  }
}
`)
);
