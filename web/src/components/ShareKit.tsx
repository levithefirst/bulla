import { CopyButton } from "./Copy";
import { Qr } from "./Qr";

/**
 * Share kit: copy link, QR, and prefilled X and Telegram posts. Plain links, no SDKs, nothing posted
 * automatically: the user reviews the text in X or Telegram first.
 * - X web intent: https://twitter.com/intent/tweet?text=&url= (https://developer.x.com/en/docs/x-for-websites/tweet-button/guides/web-intent)
 * - Telegram share: https://t.me/share/url?url=&text= (https://core.telegram.org/widgets/share)
 */
export function shareText(o: { invoiceId: bigint; memo: string; amount: string; chainName: string }) {
  const what = o.memo ? `${o.memo}, ` : "";
  return `Invoice #${o.invoiceId} on Bulla: ${what}${o.amount} in milestone escrow on ${o.chainName}. Public receipt, no wallet needed:`;
}

export function ShareKit({ link, invoiceId, memo, amount, chainName }: { link: string; invoiceId: bigint; memo: string; amount: string; chainName: string }) {
  const text = shareText({ invoiceId, memo, amount, chainName });
  const x = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(link)}`;
  const tg = `https://t.me/share/url?url=${encodeURIComponent(link)}&text=${encodeURIComponent(text)}`;
  return (
    <section className="card share" aria-labelledby="share-title" data-testid="share-kit">
      <h2 id="share-title">Share this receipt</h2>
      <p className="muted small">Anyone with the link can read it. No wallet needed.</p>
      <div className="share-qr">
        <Qr value={link} size={152} label={`QR code linking to invoice ${invoiceId} receipt`} />
      </div>
      <div className="row">
        <CopyButton value={link} label="Copy receipt link" text="Copy link" testid="copy-link" />
        <a className="btn btn-ghost btn-sm" href={x} target="_blank" rel="noreferrer noopener" data-testid="share-x" aria-label="Share on X (opens a prefilled post you can edit)">
          Share on X
        </a>
        <a className="btn btn-ghost btn-sm" href={tg} target="_blank" rel="noreferrer noopener" data-testid="share-telegram" aria-label="Share on Telegram (opens a prefilled message you can edit)">
          Telegram
        </a>
        <button className="btn btn-ghost btn-sm" onClick={() => window.print()}>
          Print
        </button>
      </div>
    </section>
  );
}
