/// <reference types="vite/client" />

// Fix for "process is not defined" error
interface ImportMetaEnv {
  readonly VITE_FIRECRAWL_API_KEY: string
  readonly VITE_AZURE_API_KEY: string
  readonly VITE_AZURE_ENDPOINT: string
  // Add other env variables as needed
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

// Fix for ethereum error
interface Window {
  ethereum?: any;
}
