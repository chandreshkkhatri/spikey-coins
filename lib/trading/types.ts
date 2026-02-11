import type { InferSelectModel } from "drizzle-orm";
import type { orders, trades, positions } from "@/lib/db/schema";

export type Order = InferSelectModel<typeof orders>;
export type Trade = InferSelectModel<typeof trades>;
export type Position = InferSelectModel<typeof positions>;

export type OrderSide = "buy" | "sell";
export type OrderType = "limit" | "market";
export type OrderStatus = "open" | "partial" | "filled" | "cancelled";
export type PositionSide = "long" | "short";
export type PositionStatus = "open" | "closed" | "liquidated";

export interface OrderBookLevel {
  price: string;
  quantity: string;
  orderCount: number;
}

export interface OrderBookSnapshot {
  pair: string;
  bids: OrderBookLevel[];
  asks: OrderBookLevel[];
  timestamp: string;
}

export interface MatchResult {
  fills: Fill[];
  remainingQuantity: string;
  orderStatus: OrderStatus;
}

export interface Fill {
  makerOrderId: string;
  makerUserId: string;
  price: string;
  quantity: string;
  makerFee: string;
  takerFee: string;
}

export interface PriceData {
  gold: number;
  silver: number;
  timestamp: string;
}

export interface MarkPriceData {
  indexPrice: string;
  markPrice: string;
  orderBookMid: string | null;
  fundingRate: string;
  nextFundingAt: string;
}
