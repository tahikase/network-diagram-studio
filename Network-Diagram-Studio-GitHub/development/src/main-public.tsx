// Entry point for the public build (`npm run build:public`).
//
// Byte-for-byte the same as main.tsx and main-demo.tsx on purpose — all three
// mount the same root. A build is separated by its MODE and its entry HTML
// (title, favicon), never by mounting a different tree. `index-demo.css` is
// the shared stylesheet all three entries import; the name is a leftover from
// when the demo build was a different program.
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index-demo.css'
import DemoApp from './DemoApp.tsx'
import { initializeRuntime } from './runtime/initialize'
import { prepareIconStorage } from './persistence/auto-save'

initializeRuntime()
void prepareIconStorage().then(() => {
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <DemoApp />
    </StrictMode>,
  )
})
