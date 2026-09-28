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
