"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Order } from "@/lib/trading/types";

interface OpenOrdersTableProps {
  orders: Order[];
}

export default function OpenOrdersTable({ orders }: OpenOrdersTableProps) {
  const router = useRouter();
  const [cancellingId, setCancellingId] = useState<string | null>(null);

  async function handleCancel(orderId: string) {
    setCancellingId(orderId);
    try {
      const res = await fetch(`/api/trading/order/${orderId}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      router.refresh();
    } catch (err) {
      console.error("Cancel failed:", err);
    } finally {
      setCancellingId(null);
    }
  }

  if (orders.length === 0) {
    return (
      <div className="rounded-2xl border border-border bg-surface p-4">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-[0.2em] text-gold">
          Open Orders
        </h2>
        <p className="py-2 text-center text-sm text-zinc-500">
          No open orders
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-border bg-surface p-4">
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-[0.2em] text-gold">
        Open Orders
      </h2>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border text-left text-xs text-zinc-500">
              <th className="pb-2">Pair</th>
              <th className="pb-2">Side</th>
              <th className="pb-2">Price</th>
              <th className="pb-2">Qty</th>
              <th className="pb-2">Filled</th>
              <th className="pb-2"></th>
            </tr>
          </thead>
          <tbody>
            {orders.map((order) => (
              <tr key={order.id} className="border-b border-border/50">
                <td className="py-2 text-xs text-zinc-300">{order.pair}</td>
                <td className="py-2">
                  <span
                    className={`text-xs font-semibold uppercase ${
                      order.side === "buy" ? "text-green-400" : "text-red-400"
                    }`}
                  >
                    {order.side}
                  </span>
                </td>
                <td className="py-2 font-mono text-xs text-white">
                  {order.price
                    ? `$${parseFloat(order.price).toFixed(2)}`
                    : "Market"}
                </td>
                <td className="py-2 font-mono text-xs text-zinc-300">
                  {parseFloat(order.quantity).toFixed(2)}
                </td>
                <td className="py-2 font-mono text-xs text-zinc-500">
                  {parseFloat(order.filledQuantity).toFixed(2)}
                </td>
                <td className="py-2 text-right">
                  <button
                    onClick={() => handleCancel(order.id)}
                    disabled={cancellingId === order.id}
                    className="rounded border border-red-500/30 px-2 py-0.5 text-xs text-red-400 transition-colors hover:bg-red-500/10 disabled:opacity-50"
                  >
                    {cancellingId === order.id ? "..." : "Cancel"}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
