/// <reference types="vite/client" />
interface ImportMetaEnv {
  readonly VITE_BULLA_NETWORK?: string;
  readonly VITE_ESCROW_ADDRESS?: string;
  readonly VITE_ESCROW_TOKEN?: string;
  readonly VITE_RPC_URL?: string;
  readonly VITE_MOCK?: string;
  readonly VITE_DEPLOY_BLOCK?: string;
}
interface ImportMeta {
  readonly env: ImportMetaEnv;
}
interface Window {
  okxwallet?: unknown;
}
