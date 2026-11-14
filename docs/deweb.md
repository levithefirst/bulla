# Publishing Bulla to DeWEB (and a plain HTTPS fallback)

Sources: TapeKit README "Site owner handbook" and SPEC (see `docs/research.md` §3). No publishing CLI exists yet, so nothing here wraps one, and no `tapekit` flags are used.

## Why the build is DeWEB-ready

- Vite `base: "./"`: every asset URL is relative (`./assets/index-*.js`).
- Hash routing (`#/invoice/12`): works under the TapeKit gateway, the preview viewer (which only renders the home page for History-API routes), and any static host without rewrites.
- No CDNs, web fonts, analytics, or image optimizer. HTML and CSS contain no `https://` references. Runtime network calls go only to X Layer JSON-RPC nodes, which TapeKit treats as chain data.
- ASCII file names, no source maps, every file far below the 8.4 MB per-file limit.

## Package

```bash
npm run deweb:package            # X Layer mainnet build
```

Writes (gitignored) `deweb-out/`:

- `site/`: the exact files to upload
- `manifest.json`: per file `path`, `size`, `contentType`, `sha256`, `chunks` (24,000-byte chunks), plus a `manifestSha256`
- `bulla-site.tar.gz`: the same files
- `PUBLISH-CHECKLIST.md`: generated step list with the hash table

The script fails if a file has an unknown content type, exceeds the limit, is a source map, has a non-ASCII name, or if HTML/CSS reference off-chain URLs. It warns if no escrow address exists for the target network. Current build: about 670 KB in 10 files, including the self-hosted Geist fonts.

## Publish to the circuit container (human)

Prerequisites: escrow deployed and in `contracts/deployments.json` (rebuild after), a TapeOut circuit on X Layer whose container is opened (`docs/tapeout-binding.md`), gas in OKB.

1. Run `npm run deweb:package` and read `deweb-out/PUBLISH-CHECKLIST.md`.
2. Upload `deweb-out/site/` with either:
   - **Direct calls** to X Layer `SiteRegistry` `0xd6EFb7adCc9c83dC4924Ad56f6a8E4e969b9ADB6`: `putFile` per file, `appendChunk` for extra chunks, optional `setFallback(container, "index.html")`. Use the content types and SHA-256 values from `manifest.json`. This is the X Layer path, because HashPort's official pages (https://www.hashport.ai/ and https://www.hashport.ai/app) are BNB Chain only.
   - **HashPort console** only if it later adds X Layer support. Do not use it for an X Layer container today.
3. Activation (if the reader requires it): `DomainBinding.bind(name, container, months)` on the X Layer proxy `0x68809Fd2fb343aA57D0aeB7f33Defe477c9666f9`. `monthlyFee()` read 0 wei (native OKB) per 30 days on 14 Nov 2026; re-read immediately before paying.
4. Verify on the gateway: the official X Layer hostname is `https://<id>-2-<cpu>.tapekit.org/` (TapeKit `kernel/src/name.js`; example `https://1-2-344.tapekit.org/` for `1.2.344.tape`). You can also open `https://tapekit.org/?open=<name>`. Then check `/.tape/status` shows every file verified. Record the live URL.

## Record the published site

After publishing, fill `web/src/deweb.json` (shown in the app footer) and the matching block in `docs/SUBMISSION-DRAFT.md`:

```json
{
  "tapeName": "<#ID>.2.<cpu>.tape",
  "processor": "0x…",
  "circuitId": "<#ID>",
  "container": "0x…",
  "gatewayUrl": "https://…",
  "siteManifestSha256": "0x… (from deweb-out/manifest.json)",
  "publishedAt": "YYYY-MM-DD"
}
```

Then re-run `npm run deweb:package` and re-upload the changed files (`index.html` hash stays, the JS bundle changes). Because the footer value is baked into the bundle, the manifest hash you record is the one from the run before this edit; note both if you republish.

## Plain HTTPS fallback (same contract)

The DeWEB copy is the TapeOut-hosted one: its bytes live in the circuit container on X Layer and are verified by TapeKit. A plain HTTPS host is only a convenience mirror for judges or users whose browser has trouble with the gateway. It reads the same escrow contract, so receipts are identical.

Checklist:

- [ ] `npm run deweb:package` (same build as DeWEB)
- [ ] Upload `deweb-out/site/` to any static host (GitHub Pages on a private repo requires a paid plan; Cloudflare Pages, Netlify, or an S3 bucket all work). No rewrites needed (hash routing).
- [ ] Open `<mirror>/#/invoice/<id>` with no wallet and confirm it shows the same data as the DeWEB copy
- [ ] Label the mirror on the submission as "HTTPS mirror; canonical copy is on DeWEB"
- [ ] Keep the repo private; publishing the built site does not require making the repo public
