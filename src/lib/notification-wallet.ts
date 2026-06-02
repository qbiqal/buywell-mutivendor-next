import { and, desc, eq, gte, sql } from "drizzle-orm";
import { db } from "./db";
import { notificationWallets, notificationWalletTransactions } from "./db/schema";

export const NOTIFICATION_WALLET_CHANNELS = ["whatsapp", "email", "sms"] as const;
export type NotificationWalletChannel = typeof NOTIFICATION_WALLET_CHANNELS[number];
export type NotificationWalletTransactionType = "credit" | "debit" | "reversal" | "adjustment";

export function isNotificationWalletChannel(value: string): value is NotificationWalletChannel {
  return NOTIFICATION_WALLET_CHANNELS.includes(value as NotificationWalletChannel);
}

export async function ensureNotificationWallet(channel: NotificationWalletChannel) {
  await db.insert(notificationWallets).values({ channel }).onConflictDoNothing();
  const [wallet] = await db.select().from(notificationWallets).where(eq(notificationWallets.channel, channel)).limit(1);
  return wallet;
}

export async function ensureNotificationWallets() {
  for (const channel of NOTIFICATION_WALLET_CHANNELS) {
    await ensureNotificationWallet(channel);
  }
}

export async function getNotificationWalletDashboard(limit = 40) {
  await ensureNotificationWallets();
  const [wallets, transactions] = await Promise.all([
    db.select().from(notificationWallets).orderBy(notificationWallets.channel),
    db.select().from(notificationWalletTransactions)
      .orderBy(desc(notificationWalletTransactions.createdAt))
      .limit(limit),
  ]);
  return { wallets, transactions };
}

export async function creditNotificationWallet(params: {
  channel: NotificationWalletChannel;
  credits: number;
  reason?: string | null;
  referenceType?: string | null;
  referenceId?: string | null;
  createdBy?: string | null;
  type?: Exclude<NotificationWalletTransactionType, "debit">;
}) {
  const credits = Math.floor(params.credits);
  if (!Number.isFinite(credits) || credits <= 0) {
    throw new Error("Credits must be greater than zero");
  }

  return db.transaction(async (tx) => {
    await tx.insert(notificationWallets).values({ channel: params.channel }).onConflictDoNothing();
    const [wallet] = await tx.select().from(notificationWallets).where(eq(notificationWallets.channel, params.channel)).limit(1);
    if (!wallet) throw new Error("Notification wallet unavailable");

    const [updated] = await tx.update(notificationWallets)
      .set({
        balanceCredits: sql`${notificationWallets.balanceCredits} + ${credits}`,
        updatedAt: new Date(),
      })
      .where(eq(notificationWallets.id, wallet.id))
      .returning({
        id: notificationWallets.id,
        channel: notificationWallets.channel,
        balanceCredits: notificationWallets.balanceCredits,
        lowBalanceThreshold: notificationWallets.lowBalanceThreshold,
        isEnabled: notificationWallets.isEnabled,
      });

    const [transaction] = await tx.insert(notificationWalletTransactions).values({
      walletId: wallet.id,
      channel: params.channel,
      type: params.type ?? "credit",
      credits,
      balanceAfter: updated.balanceCredits,
      reason: params.reason ?? null,
      referenceType: params.referenceType ?? null,
      referenceId: params.referenceId ?? null,
      createdBy: params.createdBy ?? null,
    }).returning();

    return { wallet: updated, transaction };
  });
}

export async function debitNotificationWallet(params: {
  channel: NotificationWalletChannel;
  credits?: number;
  reason?: string | null;
  referenceType?: string | null;
  referenceId?: string | null;
}) {
  const credits = Math.max(1, Math.floor(params.credits ?? 1));
  await ensureNotificationWallet(params.channel);

  return db.transaction(async (tx) => {
    const [updated] = await tx.update(notificationWallets)
      .set({
        balanceCredits: sql`${notificationWallets.balanceCredits} - ${credits}`,
        updatedAt: new Date(),
      })
      .where(and(
        eq(notificationWallets.channel, params.channel),
        eq(notificationWallets.isEnabled, true),
        gte(notificationWallets.balanceCredits, credits),
      ))
      .returning({
        id: notificationWallets.id,
        channel: notificationWallets.channel,
        balanceCredits: notificationWallets.balanceCredits,
      });

    if (!updated) {
      const [wallet] = await tx.select().from(notificationWallets).where(eq(notificationWallets.channel, params.channel)).limit(1);
      const disabled = wallet && !wallet.isEnabled;
      return {
        success: false as const,
        status: "skipped" as const,
        configured: false,
        error: disabled
          ? `${params.channel} wallet is disabled`
          : `${params.channel} wallet has insufficient credits`,
        balanceCredits: wallet?.balanceCredits ?? 0,
      };
    }

    const [transaction] = await tx.insert(notificationWalletTransactions).values({
      walletId: updated.id,
      channel: params.channel,
      type: "debit",
      credits,
      balanceAfter: updated.balanceCredits,
      reason: params.reason ?? null,
      referenceType: params.referenceType ?? null,
      referenceId: params.referenceId ?? null,
    }).returning();

    return {
      success: true as const,
      status: "sent" as const,
      configured: true,
      transactionId: transaction.id,
      balanceCredits: updated.balanceCredits,
    };
  });
}

export async function reverseNotificationDebit(params: {
  channel: NotificationWalletChannel;
  debitTransactionId?: string | null;
  reason: string;
}) {
  return creditNotificationWallet({
    channel: params.channel,
    credits: 1,
    type: "reversal",
    reason: params.reason,
    referenceType: "wallet_transaction",
    referenceId: params.debitTransactionId ?? null,
  });
}
