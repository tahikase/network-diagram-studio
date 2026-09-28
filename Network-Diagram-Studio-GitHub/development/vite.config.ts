import { defineConfig, type Plugin, type ResolvedConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwind from '@tailwindcss/vite'
import { viteSingleFile } from 'vite-plugin-singlefile'
import { fileURLToPath } from 'node:url'
import { isAbsolute, relative, resolve } from 'node:path'
import { checkReleaseAudience, checkReleaseHistory, type ReleaseHistoryCheck } from './scripts/check-release-history.mjs'
import { productionIdentity, wireRuntimeHtml } from './scripts/patch-sidecars.mjs'

const root = fileURLToPath(new URL('.', import.meta.url))
const assets = resolve(root, 'package')

export default defineConfig(({ command, mode }) => {
  if (mode !== 'public') throw new Error('This project builds production only. Use npm run dev or npm run build.')
  let release: ReleaseHistoryCheck | undefined
  const releaseHistory: Plugin = {
    name: 'release-history-completeness',
    configResolved(config: ResolvedConfig) {
      checkReleaseAudience(root)
      if (config.command !== 'build') return
      release = checkReleaseHistory(root)
      const destination = relative(resolve(root, '.release'), resolve(root, config.build.outDir))
      if (!destination || destination.startsWith('..') || isAbsolute(destination) || config.build.emptyOutDir !== false) {
        throw new Error('Builds must stage inside development/.release without clearing an output directory.')
      }
    },
    transformIndexHtml() {
      if (!release) return []
      if (checkReleaseHistory(root).digest !== release.digest) {
        throw new Error('Release inputs changed during the build. Rebuild the complete release.')
      }
      return [{ tag: 'meta', attrs: { name: 'nds-release-history', content: `${release.version}:${release.digest}` }, injectTo: 'head' }]
    },
  }

  const developmentRuntime: Plugin = {
    name: 'production-development-runtime',
    apply: 'serve',
    enforce: 'pre',
    configureServer(server) {
      server.middlewares.use((request, _response, next) => {
        if (request.url === '/') request.url = '/index.public.html'
        next()
      })
    },
    transformIndexHtml: {
      order: 'pre',
      handler(html) { return wireRuntimeHtml(html, assets) },
    },
    transform(code, id) {
      if (!id.replaceAll('\\', '/').startsWith(root.replaceAll('\\', '/') + 'src/')) return null
      return { code: productionIdentity(code), map: null }
    },
  }

  const nativeCaptureHooks: Plugin = {
    name: 'native-capture-hooks',
    enforce: 'pre',
    transform(code, id) {
      if (!id.replaceAll('\\', '/').endsWith('/html-to-image/es/clone-node.js')) return null
      const anchor = '        cloneSelectValue(nativeNode, clonedNode);\n    }\n    return clonedNode;'
      const source = code.replaceAll('\r\n', '\n')
      if (source.split(anchor).length !== 2) {
        throw new Error('html-to-image clone contract changed; review the native capture integration before rebuilding.')
      }
      return {
        code: source.replace(anchor, `        cloneSelectValue(nativeNode, clonedNode);
        window.ndsLeafAppearance?.prepareExport(nativeNode, clonedNode);
        window.ndsNotesLayout?.prepareExport(nativeNode, clonedNode);
    }
    if (isSVGElement(nativeNode)) window.__ndsProductionCapture?.prepareSvg(nativeNode, clonedNode);
    return clonedNode;`),
        map: null,
      }
    },
  }

  const stubDemoCatalogs: Plugin = {
    name: 'stub-demo-catalogs',
    enforce: 'pre',
    resolveId(source, importer) {
      for (const mod of ['learn-diagrams', 'learn-topologies']) {
        if (!source.includes(`${mod}.generated`)) continue
        if (importer?.includes(`${mod}.empty`)) return null
        return resolve(root, `src/demo/${mod}.empty.ts`)
      }
      if (source.includes('templates/registry')) {
        if (importer?.includes('registry.empty')) return null
        return resolve(root, 'src/demo/templates/registry.empty.ts')
      }
      return null
    },
  }

  return {
    root,
    publicDir: assets,
    server: { host: '127.0.0.1' },
    plugins: [
      releaseHistory, developmentRuntime, react(), tailwind(),
      viteSingleFile(), nativeCaptureHooks, stubDemoCatalogs,
    ],
    build: {
      outDir: resolve(root, '.release', 'unpackaged'),
      emptyOutDir: false,
      copyPublicDir: false,
      assetsInlineLimit: 100_000_000,
      cssCodeSplit: false,
      rollupOptions: {
        input: resolve(root, 'index.public.html'),
        output: { inlineDynamicImports: true },
      },
    },
    optimizeDeps: command === 'serve' ? { exclude: ['html-to-image'] } : undefined,
  }
})
