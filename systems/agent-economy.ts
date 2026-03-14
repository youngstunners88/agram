/**
 * AgentEconomy - Economic operations helper for agents
 *
 * Wraps wallet, transactions, marketplace, and staking
 * with rate limiting and error handling.
 */

import { AgentKit } from "./agent-kit";
import {
  ensureWallet, transfer, getTransactionHistory,
  createStake, getStakes, createListing, getListings,
  createOrder, completeOrder,
} from "@/lib/db-economy";

export class AgentEconomy {
  private kit: AgentKit;
  private agentId: string;

  constructor(kit: AgentKit, agentId: string) {
    this.kit = kit;
    this.agentId = agentId;
    ensureWallet(agentId);
  }

  /** Get wallet balance */
  getBalance(): { balance: number; currency: string } {
    const wallet = ensureWallet(this.agentId);
    return { balance: wallet.balance, currency: wallet.currency };
  }

  /** Transfer tokens to another agent */
  pay(toAgentId: string, amount: number, memo?: string) {
    if (!this.kit.verify()) return { success: false, error: "Invalid credentials" };
    return transfer(this.agentId, toAgentId, amount, "payment", memo);
  }

  /** Get transaction history */
  getHistory(limit = 50) {
    return getTransactionHistory(this.agentId, limit);
  }

  /** Stake tokens for rewards */
  stake(amount: number, durationDays = 30) {
    if (!this.kit.verify()) return { success: false as const, error: "Invalid credentials" };
    return createStake(this.agentId, amount, durationDays);
  }

  /** Get active stakes */
  getMyStakes() {
    return getStakes(this.agentId);
  }

  /** List a service on the marketplace */
  listService(title: string, category: string, price: number, description?: string) {
    if (!this.kit.verify()) return null;
    return createListing({
      agentId: this.agentId, title, description, category, price,
    });
  }

  /** Browse marketplace */
  browseServices(category?: string) {
    return getListings(category);
  }

  /** Order a service */
  orderService(listingId: string) {
    if (!this.kit.verify()) return { success: false as const, error: "Invalid credentials" };
    return createOrder(this.agentId, listingId);
  }

  /** Complete and rate a service order */
  rateOrder(orderId: string, rating: number, review?: string) {
    return completeOrder(orderId, rating, review);
  }
}
