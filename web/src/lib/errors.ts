import { BaseError } from "viem";
import { ContractRevert } from "./rpc";

const FRIENDLY: Record<string, string> = {
  UnsupportedToken: "This escrow only accepts its configured token.",
  InvalidAmount: "Amount is invalid (zero, or the token delivered less than the invoice amount).",
  InvalidBuyer: "Buyer address is invalid (empty or the same as the seller).",
  DueInPast: "The due date must be in the future.",
  MissingContainerId: "A TapeOut circuit container id is required.",
  MissingDeliveryHash: "A delivery hash is required.",
  InvoiceNotFound: "No invoice with this id.",
  NotSeller: "Only the seller can do this.",
  NotBuyer: "Only the buyer can do this.",
  NotParty: "Only the seller or the buyer can do this.",
  WrongState: "The invoice is not in a state that allows this action.",
  PastDue: "The due date has passed.",
  NotYetDue: "The refund time-lock has not passed yet.",
  AlreadyConsented: "You already consented to cancel.",
  ReentrancyGuardReentrantCall: "Re-entrant call blocked.",
  ERC20InsufficientAllowance: "Token allowance too low. Approve first.",
  ERC20InsufficientBalance: "Not enough token balance.",
  OwnableUnauthorizedAccount: "Only the owner can do this.",
};

export function parseError(e: unknown): string {
  if (e instanceof ContractRevert) {
    const name = e.errorName;
    return FRIENDLY[name] ? `${FRIENDLY[name]} (${name})` : `Reverted: ${name}`;
  }
  const code = (e as { code?: number })?.code;
  if (code === 4001) return "You rejected the request in your wallet.";
  if (code === 4100) return "The wallet has not authorized this site. Connect again.";
  if (e instanceof BaseError) return e.shortMessage || e.message;
  if (e instanceof Error) return e.message;
  return String(e);
}
