# On-chain and official-page checks (win-audit items 4 and 8)

Written: Wednesday 18 Nov 2026, about 01:30 Africa/Lagos (UTC+1), by Grok Bot. Read-only: `eth_call`, `eth_getCode`, `eth_getStorageAt`, and official pages. No transactions were sent.

This file answers WIN-AUDIT.md top-10 items 4 and 8, so Claude can finish BullaEscrow v2 without guessing.

Rule: every on-chain or official-page fact has a source. Anything not shown is marked UNKNOWN.

## Verdict for Claude (pass this first)

- **Container `execute` exists and works.** An opened X Layer container can move assets out with ERC-6551 `execute(address to, uint256 value, bytes data, uint8 operation)`. `executeCall(address,uint256,bytes)` does **not** exist (selector absent, call reverts). Pay-to-container is a go, if the seller's container is opened.
- **Call rules, confirmed live:** `operation` must be `0` (CALL). `operation = 1` (delegatecall) reverts `OnlyCall()` (`0x90afeb14`). The holder must attach `EXEC_FEE()` as `msg.value`. On X Layer that fee read **0.0013 OKB** (`1300000000000000` wei). With the fee, `execute` from the circuit holder succeeded (simulation). Without the fee it reverted `ProtocolFeeTooLow(uint256,uint256)` (`0xafd49700`).
- **Open first.** `execute` is gated on the opener's `isOpened` flag. Official TapeKit issue #5 (maintainer reproduction, 28 Sep 2026) shows an unopened but deployed container reverts `NotPaid()` (`0x34e4a710`) until `open()` is paid. `open()` fee on the X Layer opener is **0.08 OKB** (`FEE()` = `80000000000000000` wei).
- **TapeSend hub is live on X Layer.** The official client lists chain 196 as `active: true`. The hub proxy has code, its ERC-1967 implementation matches the client's pinned address, and a real opened container already has `outboxCount = 5`. The hub is **not sealed** (`isSealed() = false`). `send/README.md` still says, in a 18 Sep 2026 status line, that Base and X Layer were "planned but not active"; that line is stale next to `send/module/src/chain.js`.

SPEC Appendix B.4 only documents `token()` on the container. `execute` is not in the appendix. The evidence below is bytecode, live `eth_call`, and the official issue.

## 1. Factory and opener have code (X Layer, chain 196)

Addresses from TapeKit `kernel/src/config.js` (`L2_CONTRACTS` / `XLAYER_MAINNET`, comment: read-checked on X Layer on 19 Sep 2026) and SPEC.md Appendix B / section 3.1 for the interfaces. RPC: `https://rpc.xlayer.tech`. At block **76192362** (18 Nov 2026, 01:23:18 Africa/Lagos):

| Contract | Address | Bytecode size |
| --- | --- | --- |
| Processor factory (proxy) | `0x1f09DAeFA827f02CBb40967cc91b259763760761` | 130 bytes |
| Container opener | `0x536adD8F30f03b69f6fbF29d425A816A0dC50106` | 2,604 bytes |
| SiteRegistry (proxy) | `0xd6EFb7adCc9c83dC4924Ad56f6a8E4e969b9ADB6` | 176 bytes |
| ERC-6551 registry | `0x000000006551c19487814612e58FE06813775758` | 571 bytes |

`factory.cpuCount()` = **427** (was 419 in `docs/research.md` on 14 Nov 2026). `factory.cpuAt(0)` = `0x839bdD6fa7A66416A609A735e11DE5411B98574e`.

Opener views:

- `FEE()` = `80000000000000000` (0.08 OKB)
- `implementation()` = `0xAC4F791353eE9F06e2C50Ae4C34680D28Ea52a57` (601-byte mid-proxy, see section 3)
- `registry()` = `0x000000006551c19487814612e58FE06813775758`

The factory's ERC-1967 implementation slot currently reads `0x336e9F0F4c3fEe7C8c803377e4DEA00293f4ae2a` (9,376 bytes of code). TapeKit `factorySeal.implementation` for X Layer is `0xb41C1E7602EB5734BE2430b72178cCb814A5293d` (also has code, 7,734 bytes). The two addresses differ. Meaning of the mismatch: UNKNOWN. Both addresses have code. This does not affect `accountOf` / `isOpened` / `execute`.

`eth_getLogs` on `https://rpc.xlayer.tech` was rejected (even 2,000-block windows), so opened circuits were found with `eth_call`, not events.

## 2. `accountOf` and `isOpened` work on a real opened circuit

Live example, processor 0 (`name()` = `OnlyTestXLayer`), circuit `#1`:

| Field | Value |
| --- | --- |
| Processor | `0x839bdD6fa7A66416A609A735e11DE5411B98574e` |
| tokenId | `1` |
| `opener.accountOf(processor, 1)` | `0xE2E5FfD861C8a0b50Ce21A7bcbDD6Bb5aaC250aB` |
| `opener.isOpened` | `true` |
| `opener.isDeployed` | `true` |
| `ownerOf(1)` | `0x571d447f4f24688eC35Ccf07f1D6993655F6aF15` |
| `container.token()` | `(196, 0x839bdD6fa7A66416A609A735e11DE5411B98574e, 1)` (matches) |
| `container.owner()` | same as `ownerOf(1)` |
| Container bytecode | 173 bytes, EIP-1167 prefix `0x363d3d373d3d3d363d73` + impl `0xAC4F791353eE9F06e2C50Ae4C34680D28Ea52a57` |

`accountOf` is deterministic and returned the same address that already had code. `token()` reverse-resolves to the same processor and id, as SPEC section 3.3 requires.

This circuit was found by scanning `isOpened(cpuAt(0), id)` for id 1..80; `#1` was already opened. A wider census of opened circuits: UNKNOWN (logs were unavailable on this RPC).

## 3. Can the container move ERC-20 out? Yes, via `execute`

### Proxy chain (no verified Solidity source found)

The 173-byte account is an EIP-1167 proxy. Its target, `0xAC4F791353eE9F06e2C50Ae4C34680D28Ea52a57` (keccak256 of runtime `0x0d49365f294d31947d1714d936e78c49ad6ddb7107f47e48c9b887909fc0ceb1`), is itself a 601-byte forwarder. It reads `implementation()` (`0x5c60da1b`) from a hardcoded beacon `0x9b135f586F7850A3Fa92210c298F732b20bC8f44`. That beacon currently returns the logic contract:

**`0x6B6fDa1483367e939314070a4f233c1DFD35996B`** (4,723 bytes, keccak256 of runtime `0x35c8784456b264c8ef8bf87190e5ecf73b7d9d2a84f9c21253648dbc2d38aa04`).

No verified source for this logic was found. Explorer contract-verification API calls returned URL-not-found. TapeKit issue #5 states that the opener and container contracts "are not in this repository".

### Selectors in the logic bytecode

| Signature | Selector | In logic bytecode | Live call |
| --- | --- | --- | --- |
| `execute(address,uint256,bytes,uint8)` | `0x51945447` | present | works (see below) |
| `executeCall(address,uint256,bytes)` | `0x9e5d4c49` | absent | reverts |
| `execute(address,uint256,bytes)` | `0xb61d27f6` | absent | not called |
| `token()` | `0xfc0c546a` | present | works |
| `owner()` | `0x8da5cb5b` | present | works |
| `isValidSigner(address,bytes)` | `0x523e3260` | present | not called |
| `isValidSignature(bytes32,bytes)` | `0x1626ba7e` | present | not called |
| `supportsInterface(bytes4)` | `0x01ffc9a7` | present | not called |
| `state()` | `0xc19d93fb` | present | returns `0` |
| `EXEC_FEE()` | `0x00124bf4` | not found as a literal PUSH4 | works; returns `1300000000000000` |

### Simulations (eth_call only, from the current holder `0x571d447f4f24688eC35Ccf07f1D6993655F6aF15`)

On container `0xE2E5FfD861C8a0b50Ce21A7bcbDD6Bb5aaC250aB`:

- `execute(address(0), 0, 0x, 0)` with no value: reverts `0xafd49700` = `ProtocolFeeTooLow(uint256,uint256)`.
- `execute(address(0), 0, 0x, 0)` with value `0.0013 OKB`: **success**.
- `execute(address(1), 0, 0x, 1)` with the fee: reverts `0x90afeb14` = `OnlyCall()`.
- `executeCall(...)`: reverts (no such function).

An ERC-20 `transfer` was not simulated (this container's token balances were not read). The working `execute` path is a CALL, which is the standard ERC-6551 way to send an ERC-20. Treat "token transfer specifically" as inferred from that path, not as a separate live token test.

Independent confirmation: TapeKit issue #5, maintainer comment by TheCYPER, 28 Sep 2026. They reproduced on X Layer that an opened container's `execute` goes through once `EXEC_FEE()` is attached (they recorded 0.0013 OKB on X Layer, 0.0002 BNB on BSC), and that `delegatecall` is rejected with `OnlyCall()`. That matches today's reads.

### Implication for Bulla v2

Pay-to-container is safe to ship as an opt-in, with these product rules:

1. Require `opener.isOpened(processor, circuitId)` before allowing the flag, or warn that funds can go in but cannot come out until `open()` is paid (0.08 OKB).
2. Document that withdrawing USDC from the container costs `EXEC_FEE()` (0.0013 OKB today) on each `execute`. Re-read `EXEC_FEE()` before telling the user a number; it can change if the beacon implementation changes.
3. Default remains: pay the seller. That matches the Claude prompt's fallback if `execute` had been UNKNOWN. It is no longer UNKNOWN.

## 4. TapeSend hub on X Layer: live, unsealed

Official addresses and status:

- Hub proxy (same on every chain): `0xe61A9C7213a6Aa616C246a2B569e555B417b25ee` ([send/README.md](https://github.com/TapeOutProtocol/TapeKit/blob/main/send/README.md), `send/module/src/chain.js` `HUB_MAINNET`)
- Client-pinned X Layer implementation: `0xdCC57797089eBD9f26e686379A4323f353a3F9C6` (`HUB_IMPLEMENTATIONS_BY_CHAIN[196]`)
- `CHAINS` entry for X Layer: `{ chainId: 196, short: 'xlayer', active: true }` with the comment that the hub implementation was deployed and checked on 19 Sep 2026

Live reads, same block as section 1:

| Check | Result |
| --- | --- |
| Hub proxy code | 78 bytes (proxy) |
| ERC-1967 implementation | `0xdCC57797089eBD9f26e686379A4323f353a3F9C6` (matches pin; 12,700 bytes) |
| `isSealed()` | `false` |
| `owner()` | `0x571d447f4f24688eC35Ccf07f1D6993655F6aF15` (same as the test circuit holder) |
| `factory()` | X Layer factory above |
| `accountImplementation()` | `0xAC4F791353eE9F06e2C50Ae4C34680D28Ea52a57` (matches opener.implementation) |
| `registry()` | `0x000000006551c19487814612e58FE06813775758` |
| `circuitBeacon()` | `0xf70d1ed4f62CF3780157B0b421b7E2F45bD0991C` |
| `circuitImplementation()` | `0x977f217887E085D298Cb3819cDAD5A0ee35F29B2` |
| `payments()` | `0x13b8AFa4Fd1b29B09D23A57A75ba8D3078d44858` |
| `MAX_PAYLOAD()` | 16,000 |
| `send(address,uint256,bytes32,bytes32,bytes)` selector | present in the implementation |
| Event topics `Sent`, `KeyPublished`, `KeyRevoked` (signatures from `HUB_SIG` in `chain.js`) | present in the implementation |
| `outboxCount(0xE2E5FfD861C8a0b50Ce21A7bcbDD6Bb5aaC250aB)` | **5** |
| First word of `outboxPage(...)[0]` | TAP-10 endpoint for chainId 56 (BNB Smart Chain) and container `0xFee65A912faBF91d2Ee96d4A90B4c95B061206A7` |

So the hub is deployed, client-recognized, wired to the X Layer TapeOut contracts, and has already carried messages from this X Layer container. It is still upgradeable (`isSealed() = false`), which the official README also warns about.

Go/no-go for a TapeSend seam in Bulla: **go, as a later stretch**, not as a v2 blocker. The hub is live. It is unsealed, and the official README still says it is not independently audited.

## 5. How a project gets listed on the voting board

Official board: [https://web3.okx.com/xlayer/hackathon-voting](https://web3.okx.com/xlayer/hackathon-voting) (title: "X Layer Hackathon Voting | TapeOut Accelerate | OKX Wallet").

The page's "Register project" and "Register now" buttons, and the official activity API field `registerProjectUrl`, all point to:

**[https://docs.google.com/forms/d/1XvJyYRK-afryFsKChhbLncqYOs0obusO7gaXoZe2zrM/edit](https://docs.google.com/forms/d/1XvJyYRK-afryFsKChhbLncqYOs0obusO7gaXoZe2zrM/edit)**

Source: `GET https://web3.okx.com/priapi/v1/wallet/onchainfun/activity/hackathon/xlayer_tapeout_2026` (activity code `xlayer_tapeout_2026`, status `PROGRESS`), captured from the official page on 18 Nov 2026 at 01:27 Africa/Lagos.

Caveats:

- The published URL is a Google Forms **`/edit`** link, not a `/viewform` link. That may be a misconfiguration. This environment could not open the form questions (Google required a sign-in after a cookie wall), so the form's fields, eligibility, and whether it is publicly fillable are **UNKNOWN**.
- The official event submission form on the Build X page is a **different URL**: [https://forms.gle/EoDNbxQ65dev1wFd9](https://forms.gle/EoDNbxQ65dev1wFd9), which resolves to `https://docs.google.com/forms/d/e/1FAIpQLScyVnDmyzxRyBxszLUWbwV5kVbpmZJ3JS6oyOxqjALRvhR1kg/viewform`. Whether that form and the voting-board form are the same document is **UNKNOWN** (the public IDs differ; a published `/d/e/...` id is not comparable to an `/d/.../edit` id without opening both).
- @Blonskr (10 Nov 2026, via [tapeout.link/news/2120076495263518945](https://tapeout.link/news/2120076495263518945)): entries in the developer program can be seen on the X Layer leaderboard. That is consistent with "submit, then appear," but it does not spell out the exact pipeline or review delay.

Voting close, from the same official API: `activityEndTime = 1797602400000` = **18 Dec 2026, 14:00 UTC** = **18 Dec 2026, 15:00 Africa/Lagos** = **18 Dec 2026, 22:00 UTC+8**. That matches the community wording "12/18 22:00" in [tapeout.link/news/2120844009090515117](https://tapeout.link/news/2120844009090515117), and fixes the timezone that WIN-AUDIT.md left unstated.

Voting start, same API: `activityStartTime = 1794326400000` = 10 Nov 2026, 16:00 UTC (11 Nov 2026, 00:00 UTC+8).

Eligibility, from the official page and API `coinExchangeDetails`:

- 5 BEM = 1 vote (`0x60e62efa9405d6873c5deabd4e6cc91c25363952` on X Layer)
- 300 FAB = 1 vote (`0x72f349b1eee7833b26f8c81a8410775a4e231ed2`)
- 1 TapeCode-Test NFT = 1 vote (`0x0e91460d6823c711643e650a9a4c0cc21de41614`)
- Cap 10 votes per address. Votes are final; you can only add more. Unusual activity is flagged and reviewed.

Live totals at 01:27 Africa/Lagos, 18 Nov 2026: **32 projects, 1,012 votes, 306 voter addresses**.

Action for Fluid: fill the voting-board register form (the `/edit` URL above) as well as the official event form, unless opening them shows they are the same form. If the `/edit` link fails, use the official Telegram in section 6 and ask for a view link.

## 6. Demo Day and the livestream slot

**Official event page** ([https://web3.okx.com/xlayer/build-x-series](https://web3.okx.com/xlayer/build-x-series)):

- The event is listed as "Online/Offline Demo Day".
- "The hackathon takes place online, with shortlisted teams attending offline Demo Day."
- Submission is through [https://forms.gle/EoDNbxQ65dev1wFd9](https://forms.gle/EoDNbxQ65dev1wFd9) by 7 Dec 2026, 23:59 UTC.
- For inquiries and technical support the page links **here** to Telegram: [https://t.me/+-7ouB60aYig2MmM1](https://t.me/+-7ouB60aYig2MmM1).

No other public "apply for Demo Day" form is named on that page. How the shortlist is chosen, and whether it uses the voting board, is **UNKNOWN**.

**First Demo Show / X Layer TapeOut Live** already happened: 5 Nov 2026, 20:00 HKT. Signup for that show closed 3 Nov 2026. Source: [tapeout.link/news/2117252782499782817](https://tapeout.link/news/2117252782499782817) (citing @TapeOutCF, @BruceBlue, @OKXWallet_CN). Projects could still be submitted to the hackathon after that close. A public signup form for a later Demo Day was **not found**.

**Livestream slot:** @Blonskr and @OKXWallet_CN say top-ranked works on the leaderboard may appear on the X Layer x TapeOut livestream ([tapeout.link/news/2120076495263518945](https://tapeout.link/news/2120076495263518945), [tapeout.link/news/2120844009090515117](https://tapeout.link/news/2120844009090515117)). No separate application form for the livestream was found. The route that is documented is: get listed, get votes, rank high. The exact rank cutoff is **UNKNOWN**.

## 7. How to get the 1,500 BEM grants

@BruceBlue (quoted in [tapeout.link/news/2120844009090515117](https://tapeout.link/news/2120844009090515117)): the foundation put up 1,500 BEM, "planned through Demo Day and final selection, to support about 10 excellent teams." @TapeOutCF is named as the source of the extra 1,500 BEM in the same item and in [tapeout.link/news/2121157147937608150](https://tapeout.link/news/2121157147937608150) ("about 10 teams with real deliverables").

No separate BEM-grant application URL was found on the official event page, the voting page, or those news items. The documented route is: enter the hackathon, go through Demo Day and final judging, and be one of the roughly 10 teams they pick. Exact selection rules, payout amounts per team, and a dedicated form: **UNKNOWN**.

For questions: official Telegram [https://t.me/+-7ouB60aYig2MmM1](https://t.me/+-7ouB60aYig2MmM1).

## 8. The 32-project list, and clones

Captured from `GET .../xlayer_tapeout_2026/projects` on the official voting page, 18 Nov 2026, 01:27 Africa/Lagos. Ordered as the API returned them (by votes, then the rest). `realtimeVoteCount` is omitted in the API for projects with no votes; those are shown as 0.

| # | Project | Votes | Site |
| --- | --- | --- | --- |
| 1 | EmberWorld | 336 | http://1-2-300.tapeoutscan.io/ |
| 2 | TapeAI | 288 | https://tapeai.net/ |
| 3 | TapeUp | 207 | https://tapeup.io/ |
| 4 | FabX Miner Desk | 70 | https://fabx.leolabs.me/ |
| 5 | tapeXO | 70 | https://tapexo.app/ |
| 6 | CoTape | 15 | https://app.cotape.net |
| 7 | TapeZero | 9 | https://tapezero.xyz |
| 8 | TapeXCafé | 6 | https://1-2-357.tapekit.org/ |
| 9 | TapeLaunch | 6 | https://tapelaunch.ai/ |
| 10 | PeekBox | 3 | tape://1.2.339.tape/ |
| 11 | TapeSurge 晶涌协议 | 1 | https://app.tapesurge.com/?chain=1952 |
| 12 | Tape Desktop | 1 | http://app.dewebdesk.link |
| 13 | BBBFi | 0 | http://bbbfi.com |
| 14 | TapeOut Audit | 0 | https://arindam5294.github.io/tapeout-audit/ |
| 15 | DegenDNA | 0 | https://degendna.fun/ |
| 16 | Trend0x Inc | 0 | https://trend0x.com |
| 17 | TapeRNG | 0 | https://tape.futool.com |
| 18 | TypeFly | 0 | https://tapefly.xyz |
| 19 | TapeWeave | 0 | GitHub Pages demo (0xcaptain888/TapeWeave) |
| 20 | Fizzl | 0 | https://fizzl.eu |
| 21 | SnapVault | 0 | https://www.snapvault.cc/ |
| 22 | OwlGate | 0 | https://owlgate.xyz/ |
| 23 | 海豚Agent Temas | 0 | https://11-2-4.tapekit.org/ |
| 24 | TapeExit | 0 | https://wangyangmingsss.github.io/tapeexit/ |
| 25 | TOPEOUT | 0 | https://7-2-260.tapekit.org/ |
| 26 | Tapestry | 0 | https://11648-0.tapekit.org/mmi |
| 27 | TapePool | 0 | https://www.tapepool.io/ |
| 28 | Tape Live | 0 | site omitted in the API |
| 29 | Sumplus SafeRouter Receipt Desk | 0 | https://2-2-409-open.tapekit.org/v1/index.html |
| 30 | ProofDrop | 0 | https://proofdrop.uconfidant.tech/ |
| 31 | TapeOut Mecha Lab | 0 | http://tapemecha.com/ |
| 32 | Laika | 0 | site omitted in the API |

Bulla is **not** on the board yet. No project is named Bulla or TapeFlow.

Clone / overlap check, from the API `projectDesc` text only (sites were not opened in this pass):

- No listed project describes milestone invoices, freelancer escrow, or a USDC invoice flow like Bulla.
- **ProofDrop** uses an escrow contract for giveaway prizes, plus a taped-out circuit for the draw. Different job, same word "escrow".
- **Sumplus SafeRouter Receipt Desk** verifies signed quotes and receipts for AI API bills. Billing verification, not seller/buyer invoice escrow.
- **CoTape** is a collaborative tape-out funding desk (designers and funders, on-chain splits). Adjacent to "paying a builder," but it is about tape-out funding, not invoices.

The top three (EmberWorld, TapeAI, TapeUp) already hold most of the votes (336 + 288 + 207 = 831 of 1,012). Listing soon still matters for the livestream path, but catching the vote lead this late would take a real campaign.

## 9. Still UNKNOWN

- Verified Solidity source for the container logic at `0x6B6fDa1483367e939314070a4f233c1DFD35996B`.
- A live ERC-20 `transfer` through `execute` (the CALL path was proven; a token was not moved in simulation).
- Whether the voting-board Google Form and the official event form are the same document, and what the register form actually asks (both required a Google sign-in from this environment).
- How long after that register form a project appears on the 32-project board, and whether there is a manual review.
- How the official "offline Demo Day" shortlist is chosen, and any application route other than the official submission form.
- A public application form for later livestream episodes, or for the 1,500 BEM grants, other than "enter the hackathon and be selected."
- Why the factory's current ERC-1967 implementation differs from TapeKit's `factorySeal.implementation`.

## Sources

- TapeKit config: https://github.com/TapeOutProtocol/TapeKit/blob/main/kernel/src/config.js
- TapeKit SPEC Appendix B: https://github.com/TapeOutProtocol/TapeKit/blob/main/SPEC.md
- TapeKit issue #5 (execute, NotPaid, EXEC_FEE, OnlyCall): https://github.com/TapeOutProtocol/TapeKit/issues/5
- TapeSend README and hub addresses: https://github.com/TapeOutProtocol/TapeKit/blob/main/send/README.md
- TapeSend chain config (X Layer `active: true`, pinned impl): https://github.com/TapeOutProtocol/TapeKit/blob/main/send/module/src/chain.js
- DeWebHub source (view functions used above): https://github.com/TapeOutProtocol/TapeKit/blob/main/send/contracts/src/DeWebHub.sol
- X Layer RPC used: https://rpc.xlayer.tech (chain 196, block 76192362)
- Official voting board: https://web3.okx.com/xlayer/hackathon-voting
- Official activity / projects APIs under `/priapi/v1/wallet/onchainfun/activity/hackathon/xlayer_tapeout_2026` (and `/projects`, `/vote-detail`), captured from that page
- Official event page and submission form: https://web3.okx.com/xlayer/build-x-series , https://forms.gle/EoDNbxQ65dev1wFd9
- Official event Telegram (page link labelled "here"): https://t.me/+-7ouB60aYig2MmM1
- Leaderboard and BEM-grant coverage: https://tapeout.link/news/2120844009090515117 , https://tapeout.link/news/2120076495263518945 , https://tapeout.link/news/2121157147937608150
- First Demo Show close and date: https://tapeout.link/news/2117252782499782817
