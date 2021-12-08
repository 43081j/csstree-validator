import { writeFileSync } from 'fs';
import { resolve, basename } from 'path';
import esbuild from 'esbuild';
import { createRequire } from 'module';

const { version } = createRequire(import.meta.url)('../package.json');

async function build() {
    const genModules = {
        [resolve('lib/version.js')]: () => `export const version = "${version}";`
    };
    const genModulesFilter = new RegExp('(' + Object.keys(genModules).join('|').replace(/\./g, '\\.') + ')$');
    const genModuleCache = new Map();
    const genModule = (fn) => {
        if (!genModuleCache.has(fn)) {
            genModuleCache.set(fn, genModules[fn]());
        }

        return genModuleCache.get(fn);
    };
    const plugins = [{
        name: 'replace',
        setup({ onLoad }) {
            onLoad({ filter: genModulesFilter }, args => ({
                contents: genModule(args.path)
            }));
        }
    }];

    await Promise.all([
        esbuild.build({
            entryPoints: ['lib/validate.js'],
            outfile: 'dist/csstree-validator.js',
            format: 'iife',
            globalName: 'csstreeValidator',
            bundle: true,
            minify: true,
            logLevel: 'info',
            plugins
        }),

        esbuild.build({
            entryPoints: ['lib/validate.js'],
            outfile: 'dist/csstree-validator.esm.js',
            format: 'esm',
            bundle: true,
            minify: true,
            logLevel: 'info',
            plugins
        })
    ]);

    for (const [key, value] of genModuleCache) {
        const fn = basename(key);
        writeFileSync(`dist/${fn}`, value);
    }
}

build();
