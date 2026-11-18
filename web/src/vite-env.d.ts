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
  /** TapeOut stand-in overrides: localhost / testnet only (mainnet build refuses them). */
  readonly VITE_TAPEOUT_OPENER?: string;
  readonly VITE_TAPEOUT_FACTORY?: string;
  readonly VITE_TAPEOUT_PROCESSOR?: string;
  readonly VITE_JUDGE_TAPEOUT_OPENER?: string;
  readonly VITE_JUDGE_TAPEOUT_FACTORY?: string;
  readonly VITE_JUDGE_TAPEOUT_PROCESSOR?: string;
  /** Judge mode: max testnet OKB (in wei) the gas tank may send per run. */
  readonly VITE_DEMO_RUN_CAP_WEI?: string;
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
