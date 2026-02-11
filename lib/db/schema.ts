import { pgTable, uuid, text, timestamp, decimal, unique } from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  firebaseUid: text("firebase_uid").unique().notNull(),
  email: text("email").unique().notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const wallets = pgTable(
  "wallets",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .references(() => users.id)
      .notNull(),
    currency: text("currency").notNull(), // 'USDT' | 'USDC'
    balance: decimal("balance", { precision: 18, scale: 8 }).default("0").notNull(),
    availableBalance: decimal("available_balance", { precision: 18, scale: 8 })
      .default("0")
      .notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [unique("wallets_user_currency").on(table.userId, table.currency)]
);

export const transactions = pgTable("transactions", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .references(() => users.id)
    .notNull(),
  walletId: uuid("wallet_id")
    .references(() => wallets.id)
    .notNull(),
  type: text("type").notNull(), // deposit | withdrawal | withdrawal_fee
  currency: text("currency").notNull(), // USDT | USDC
  amount: decimal("amount", { precision: 18, scale: 8 }).notNull(), // positive=credit, negative=debit
  balanceAfter: decimal("balance_after", { precision: 18, scale: 8 }).notNull(),
  referenceId: uuid("reference_id"),
  referenceType: text("reference_type"),
  description: text("description"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
