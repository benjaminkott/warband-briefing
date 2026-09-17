/// <reference types="vite/client" />

import type { BriefingApi } from '../../preload/index'

declare global {
  interface Window {
    briefing: BriefingApi
  }
}

export {}
