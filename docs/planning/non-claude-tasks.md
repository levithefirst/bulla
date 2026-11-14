# TapeInvoice — tasks Claude Code cannot do

Human or human-supervised wallet work only. Claude may write checklists, not sign, fund, or submit.

## Before / during Phase 1
- Confirm official X Layer RPCs, chain IDs, and explorer from OKX / X Layer docs (ignore model-invented values).
- Confirm the ERC-20 used for escrow (prefer a liquid stablecoin if one is actually usable). Sign off in research.md.
- Create the remote git host if you want one; Claude can write local files only.

## Wallets, gas, and funding
- Designate self-custodial test and production wallets (seller, buyer, fee recipient). Never paste a production seed into chat or the repo.
- Get testnet tokens, then mainnet gas plus escrow-token balances. Claude cannot run a faucet, a CEX withdrawal, or your wallet extension.
- Pay all gas. Done = balances for deploy, container open, site publish, and one full demo invoice (fund + fee).

## TapeOut circuit and container
- If tape-out / container-open is a signed official UI flow, you must click and sign. Done = a real X Layer circuit id + container the contract can record.

## Deploys and publish that need a live signature
- Deploy the contract to X Layer testnet, then mainnet, from a wallet you control. Verify on the official explorer if supported. Done = address in deployments.json, explorer, and the UI config all match.
- Publish site bytes to SiteRegistry / DeWEB with official tooling or UI, and confirm a layperson URL (TapeKit reader and/or official gateway). If needed, create a boring HTTPS static host as fallback. Done = both links open the live app and read the deployed contract.

## Submission, video, and Demo Day
- Record the optional demo video (≤ 3 minutes): problem, core flow, users and business model, TapeOut use. Claude can write the script only.
- Submit the official Google Form before 7 December 2026, 23:59 UTC: access link and/or processor address plus circuit ID; product, users/reach, revenue, retention, TapeOut features, and the approved late-payment citations. Claude must not submit the form as you.
- Confirm eligibility (18+ or age of majority / legal entity; not a restricted person under X Layer ToS).
- If shortlisted, attend the offline Demo Day. Prize receipt needs a self-custodial wallet you control — organizers will not ask for your seed.

## Legal and policy
- Accept event and tool terms. v1 is an unaudited payment tool, not legal advice in every jurisdiction. The fund-button warning about circuit-holder control must ship.
