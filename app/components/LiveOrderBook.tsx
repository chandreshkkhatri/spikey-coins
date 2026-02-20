"use client";

import { useEffect, useState, useCallback } from "react";
import OrderBook from "./OrderBook";
import type { OrderBookLevel } from "@/lib/trading/types";
import type { AccentColor } from "@/lib/trading/constants";

interface LiveOrderBookProps {
    pair: string;
    initialBids: OrderBookLevel[];
    initialAsks: OrderBookLevel[];
    accentColor?: AccentColor;
    pollIntervalMs?: number;
}

export default function LiveOrderBook({
    pair,
    initialBids,
    initialAsks,
    accentColor = "gold",
    pollIntervalMs = 2000,
}: LiveOrderBookProps) {
    const [bids, setBids] = useState<OrderBookLevel[]>(initialBids);
    const [asks, setAsks] = useState<OrderBookLevel[]>(initialAsks);

    const fetchOrderBook = useCallback(async () => {
        try {
            const res = await fetch(`/api/trading/orderbook/${pair}?depth=20`);
            if (!res.ok) return;
            const data = await res.json();
            if (data.success) {
                setBids(data.bids);
                setAsks(data.asks);
            }
        } catch {
            // Silently skip on network errors — next poll will retry
        }
    }, [pair]);

    useEffect(() => {
        const id = setInterval(fetchOrderBook, pollIntervalMs);
        return () => clearInterval(id);
    }, [fetchOrderBook, pollIntervalMs]);

    return (
        <OrderBook bids={bids} asks={asks} pair={pair} accentColor={accentColor} />
    );
}
