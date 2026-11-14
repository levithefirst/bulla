/// <reference types="vite/client" />
interface ImportMetaEnv {
  readonly VITE_BULLA_NETWORK?: string;
  readonly VITE_ESCROW_ADDRESS?: string;
  readonly VITE_ESCROW_TOKEN?: string;
  readonly VITE_RPC_URL?: string;
  readonly VITE_MOCK?: string;
  readonly VITE_DEPLOY_BLOCK?: string;
  readonly VITE_JUDGE_ESCROW_ADDRESS?: string;
  readonly VITE_JUDGE_TOKEN?: string;
  readonly VITE_JUDGE_DEPLOY_BLOCK?: string;
  readonly VITE_JUDGE_URL?: string;
  /** TESTNET-ONLY demo gas tank key. Set only for the judge build. Never mainnet, never committed. */
  readonly VITE_DEMO_GAS_TANK_KEY?: string;
}
interface ImportMeta {
  readonly env: ImportMetaEnv;
}
interface Window {
  okxwallet?: unknown;
}

/** true only for xlayerTestnet and localhost builds (see vite.config.ts). */
declare const __JUDGE_BUILD__: boolean;
