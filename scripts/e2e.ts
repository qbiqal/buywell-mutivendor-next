import fs from "fs";
import net from "net";
import path from "path";
import { spawn, type ChildProcess } from "child_process";
import { eq, gt } from "drizzle-orm";
import type Redis from "ioredis";

function loadLocalEnv() {
  const envPath = path.join(process.cwd(), ".env.local");
  if (!fs.existsSync(envPath)) return;
  for (const line of fs.readFileSync(envPath, "utf8").split(/\r?\n/)) {
    if (!line || line.trim().startsWith("#")) continue;
    const idx = line.indexOf("=");
    if (idx === -1) continue;
    const key = line.slice(0, idx).trim();
    const value = line.slice(idx + 1).trim();
    process.env[key] ??= value;
  }
}

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

async function findPort(start: number): Promise<number> {
  for (let port = start; port < start + 50; port += 1) {
    const available = await new Promise<boolean>((resolve) => {
      const server = net.createServer();
      server.once("error", () => resolve(false));
      server.once("listening", () => server.close(() => resolve(true)));
      server.listen(port, "127.0.0.1");
    });
    if (available) return port;
  }
  throw new Error("No available local port found for E2E server");
}

async function waitForOk(url: string, timeoutMs = 30000) {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    try {
      const res = await fetch(url);
      if (res.ok) return;
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw new Error(`Timed out waiting for ${url}`);
}

async function isOk(url: string) {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(2000) });
    return res.ok;
  } catch {
    return false;
  }
}

async function expectStatus(url: string, status: number, init?: RequestInit) {
  const res = await fetch(url, init);
  assert(res.status === status, `${url} returned ${res.status}, expected ${status}`);
  return res;
}

async function expectJsonSuccess(url: string, init?: RequestInit) {
  const res = await expectStatus(url, 200, init);
  const data = await res.json();
  assert(data.success === true, `${url} did not return success=true`);
  return data;
}

async function postJson(url: string, body: Record<string, unknown>, init?: RequestInit) {
  const res = await fetch(url, {
    ...init,
    method: "POST",
    headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  assert(data.success === true, `${url} did not return success=true`);
  return { res, data };
}

async function startServer(port: number): Promise<ChildProcess> {
  const child = spawn(
    process.execPath,
    ["node_modules/next/dist/bin/next", "dev", "--turbopack", "--port", String(port)],
    {
      cwd: process.cwd(),
      env: { ...process.env, PORT: String(port) },
      stdio: ["ignore", "pipe", "pipe"],
    },
  );

  child.stdout?.on("data", (chunk) => process.stdout.write(`[e2e:next] ${chunk}`));
  child.stderr?.on("data", (chunk) => process.stderr.write(`[e2e:next] ${chunk}`));
  return child;
}

async function stopServer(child: ChildProcess) {
  if (child.killed) return;
  child.kill("SIGTERM");
  await new Promise((resolve) => setTimeout(resolve, 1000));
  if (!child.killed) child.kill("SIGKILL");
}

async function resolveE2EBase() {
  const explicitBase = process.env.E2E_BASE_URL?.replace(/\/$/, "");
  if (explicitBase) {
    await waitForOk(`${explicitBase}/api/health`);
    return { base: explicitBase, server: undefined as ChildProcess | undefined };
  }

  const existingBase = "http://localhost:3000";
  if (await isOk(`${existingBase}/api/health`)) {
    console.log(`[e2e] Reusing existing dev server at ${existingBase}`);
    return { base: existingBase, server: undefined as ChildProcess | undefined };
  }

  const port = await findPort(3100);
  const base = `http://localhost:${port}`;
  const server = await startServer(port);
  await waitForOk(`${base}/api/health`);
  return { base, server };
}

let closePool: (() => Promise<unknown>) | undefined;
let closeRedis: (() => void) | undefined;

async function clearRedisPrefix(redis: Redis, prefix: string) {
  let cursor = "0";
  const keyPrefix = redis.options?.keyPrefix ?? "";
  do {
    const [nextCursor, keys] = await redis.scan(cursor, "MATCH", `${keyPrefix}${prefix}*`, "COUNT", "100");
    cursor = nextCursor;
    if (keys.length > 0) {
      const pipeline = redis.pipeline();
      for (const key of keys) {
        pipeline.del(keyPrefix && key.startsWith(keyPrefix) ? key.slice(keyPrefix.length) : key);
      }
      await pipeline.exec();
    }
  } while (cursor !== "0");
}

async function main() {
  loadLocalEnv();
  const [{ db, media, notificationDeliveries, notifications, orders, otpCodes, pool, productVariants, users, whatsappLogs }, { setSiteConfig }, { redis }] = await Promise.all([
    import("../src/lib/db"),
    import("../src/lib/config"),
    import("../src/lib/redis"),
  ]);
  closePool = () => pool.end();
  closeRedis = () => redis.disconnect();

  const tempEmail = `e2e.customer.${Date.now()}@example.test`;
  let mediaId: string | undefined;
  let orderId: string | undefined;
  let proofPath: string | undefined;
  let variantId: string | undefined;
  let originalStock: number | undefined;

  await clearRedisPrefix(redis, "rate:auth:");
  await setSiteConfig("module_cms_enabled", "true", "modules");
  await setSiteConfig("module_blog_enabled", "true", "modules");
  await setSiteConfig("module_ecommerce_enabled", "true", "modules");
  await setSiteConfig("payment_offline_qr_enabled", "true", "payment");
  await setSiteConfig("whatsapp_enabled", "false", "whatsapp");
  await setSiteConfig("whatsapp_order_notify", "false", "whatsapp");

  const { base, server } = await resolveE2EBase();

  try {
    await expectStatus(`${base}/`, 200);
    await expectStatus(`${base}/home`, 200);
    await expectStatus(`${base}/shop`, 200);
    await expectStatus(`${base}/blog`, 200);
    await expectStatus(`${base}/forgot-password`, 200);
    await expectStatus(`${base}/reset-password`, 200);
    await expectStatus(`${base}/verify-email`, 200);
    await expectStatus(`${base}/sitemap.xml`, 200);
    await expectStatus(`${base}/robots.txt`, 200);
    await expectJsonSuccess(`${base}/api/products`);
    await expectJsonSuccess(`${base}/api/blog`);
    await expectJsonSuccess(`${base}/api/cms`);

    const registered = await postJson(`${base}/api/auth/register`, {
      email: tempEmail,
      password: "customer123",
      firstName: "E2E",
      lastName: "Customer",
      phone: "+919999999999",
    });
    const customerId = registered.data.data.id as string;
    const customerCookie = registered.res.headers.get("set-cookie")?.split(";")[0];
    assert(customerCookie, "Customer registration did not return auth cookie");
    const customerHeaders = { headers: { cookie: customerCookie } };

    const verificationCode = registered.data.data.emailVerification?.debugCode as string | undefined;
    assert(verificationCode, "Registration did not return local email verification debug code");
    const verifyEmail = await postJson(`${base}/api/auth/verify-email`, {
      email: tempEmail,
      code: verificationCode,
    });
    assert(verifyEmail.data.success === true, "Email verification failed");

    await expectStatus(`${base}/notifications`, 200, customerHeaders);
    const notificationList = await expectJsonSuccess(`${base}/api/notifications`, customerHeaders);
    assert(notificationList.data.length >= 1, "Customer notifications did not include registration notification");
    const markRead = await fetch(`${base}/api/notifications`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", cookie: customerCookie },
      body: JSON.stringify({ markAll: true }),
    });
    assert(markRead.status === 200, `Mark notifications read returned ${markRead.status}, expected 200`);

    const forgotPassword = await postJson(`${base}/api/auth/forgot-password`, { email: tempEmail });
    const resetCode = forgotPassword.data.data.debugCode as string | undefined;
    assert(resetCode, "Forgot password did not return local reset debug code");
    await postJson(`${base}/api/auth/reset-password`, {
      email: tempEmail,
      code: resetCode,
      password: "customer456",
    });
    await postJson(`${base}/api/auth/login`, {
      email: tempEmail,
      password: "customer456",
    });

    const adminLogin = await postJson(`${base}/api/auth/login`, {
      email: "admin@aprasnaturals.com",
      password: "admin123",
    });
    const adminCookie = adminLogin.res.headers.get("set-cookie")?.split(";")[0];
    assert(adminCookie, "Admin login did not return auth cookie");
    const adminHeaders = { headers: { cookie: adminCookie } };

    await expectStatus(`${base}/admin/customers`, 200, adminHeaders);
    const customerList = await expectJsonSuccess(`${base}/api/admin/customers?search=${encodeURIComponent(tempEmail)}`, adminHeaders);
    assert(customerList.pagination.total >= 1, "Admin customer list did not find E2E customer");
    const customerDetail = await expectJsonSuccess(`${base}/api/admin/customers/${customerId}`, adminHeaders);
    assert(customerDetail.data.customer.email === tempEmail, "Admin customer detail returned wrong customer");

    await expectStatus(`${base}/admin/media`, 200, adminHeaders);
    const pngBytes = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAFgwJ/luz7VwAAAABJRU5ErkJggg==", "base64");
    const mediaForm = new FormData();
    mediaForm.append("file", new Blob([pngBytes], { type: "image/png" }), "e2e-media.png");
    mediaForm.append("folder", "e2e");
    const mediaUpload = await fetch(`${base}/api/media/upload`, {
      method: "POST",
      headers: { cookie: adminCookie },
      body: mediaForm,
    });
    assert(mediaUpload.status === 201, `Media upload returned ${mediaUpload.status}, expected 201`);
    const uploadedMedia = await mediaUpload.json();
    assert(uploadedMedia.success === true, "Media upload did not return success=true");
    mediaId = uploadedMedia.data.id as string;

    const mediaList = await expectJsonSuccess(`${base}/api/admin/media?folder=e2e&search=e2e-media`, adminHeaders);
    assert(mediaList.data.some((item: { id: string }) => item.id === mediaId), "Admin media list did not include uploaded media");

    const mediaPatch = await fetch(`${base}/api/admin/media/${mediaId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", cookie: adminCookie },
      body: JSON.stringify({ alt: "E2E media", folder: "e2e" }),
    });
    assert(mediaPatch.status === 200, `Media patch returned ${mediaPatch.status}, expected 200`);

    const mediaDelete = await fetch(`${base}/api/admin/media/${mediaId}`, {
      method: "DELETE",
      headers: { cookie: adminCookie },
    });
    assert(mediaDelete.status === 200, `Media delete returned ${mediaDelete.status}, expected 200`);
    mediaId = undefined;

    await expectStatus(`${base}/admin/analytics`, 200, adminHeaders);
    const analytics = await expectJsonSuccess(`${base}/api/admin/analytics?days=7`, adminHeaders);
    assert(Array.isArray(analytics.data.revenueByDay), "Analytics revenueByDay is not an array");
    assert(analytics.data.revenueByDay.length === 7, "Analytics did not return 7 daily points");
    const analyticsCsv = await expectStatus(`${base}/api/admin/analytics?days=7&format=csv`, 200, adminHeaders);
    assert((analyticsCsv.headers.get("content-type") ?? "").includes("text/csv"), "Analytics CSV did not return text/csv");

    await expectStatus(`${base}/admin/whatsapp`, 200, adminHeaders);
    await expectJsonSuccess(`${base}/api/admin/whatsapp`, adminHeaders);
    const manualWhatsApp = await fetch(`${base}/api/admin/whatsapp`, {
      method: "POST",
      headers: { "Content-Type": "application/json", cookie: adminCookie },
      body: JSON.stringify({
        phone: "+919999999999",
        customerName: "E2E Customer",
        message: "E2E WhatsApp smoke test",
      }),
    });
    assert(manualWhatsApp.status === 200, `WhatsApp manual send returned ${manualWhatsApp.status}, expected 200`);
    const manualWhatsAppJson = await manualWhatsApp.json();
    assert(manualWhatsAppJson.success === true, "WhatsApp manual send did not return success=true");

    const [variant] = await db
      .select({ id: productVariants.id, stock: productVariants.stock })
      .from(productVariants)
      .where(gt(productVariants.stock, 0))
      .limit(1);
    assert(variant, "No product variant available for order E2E");
    variantId = variant.id;
    originalStock = variant.stock;

    const guestOrder = await postJson(`${base}/api/orders`, {
      items: [{ variantId, quantity: 1 }],
      isSampleRequest: false,
      address: {
        name: "E2E Guest",
        phone: "+919888888888",
        line1: "E2E Street",
        city: "Ranchi",
        state: "Jharkhand",
        pincode: "834005",
      },
    });
    orderId = guestOrder.data.data.orderId as string;
    const uploadToken = guestOrder.data.data.uploadToken as string | undefined;
    assert(uploadToken, "Order create did not return payment proof upload token");

    const proofForm = new FormData();
    proofForm.append("proof", new Blob([pngBytes], { type: "image/png" }), "e2e-proof.png");
    proofForm.append("token", uploadToken);
    const proofUpload = await fetch(`${base}/api/orders/${orderId}/upload-proof`, {
      method: "POST",
      body: proofForm,
    });
    assert(proofUpload.status === 200, `Payment proof upload returned ${proofUpload.status}, expected 200`);
    const proofUploadJson = await proofUpload.json();
    assert(proofUploadJson.success === true, "Payment proof upload did not return success=true");
    const proofUrl = proofUploadJson.data?.proofUrl as string | undefined;
    if (proofUrl?.startsWith("/uploads/")) {
      proofPath = path.join(process.cwd(), "public", proofUrl);
    }

    const [variantAfterOrder] = await db
      .select({ stock: productVariants.stock })
      .from(productVariants)
      .where(eq(productVariants.id, variantId));
    assert(variantAfterOrder?.stock === originalStock - 1, "Order did not decrement variant stock");

    const verifyPayment = await fetch(`${base}/api/admin/orders/${orderId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", cookie: adminCookie },
      body: JSON.stringify({ verifyPayment: true, note: "E2E verified payment" }),
    });
    assert(verifyPayment.status === 200, `Admin verify payment returned ${verifyPayment.status}, expected 200`);

    const shipOrder = await fetch(`${base}/api/admin/orders/${orderId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", cookie: adminCookie },
      body: JSON.stringify({ status: "shipped", courier: "E2E Courier", trackingNumber: "E2E123" }),
    });
    assert(shipOrder.status === 200, `Admin ship order returned ${shipOrder.status}, expected 200`);

    const shippedDetail = await expectJsonSuccess(`${base}/api/admin/orders/${orderId}`, adminHeaders);
    assert(shippedDetail.data.status === "shipped", "Order was not marked shipped");

    const orderWhatsApp = await fetch(`${base}/api/admin/orders/${orderId}/whatsapp`, {
      method: "POST",
      headers: { "Content-Type": "application/json", cookie: adminCookie },
      body: JSON.stringify({ templateKey: "order_confirmed" }),
    });
    assert(orderWhatsApp.status === 200, `Order WhatsApp resend returned ${orderWhatsApp.status}, expected 200`);

    await setSiteConfig("module_blog_enabled", "false", "modules");
    const disabledBlog = await expectStatus(`${base}/api/blog`, 404);
    const disabledBlogJson = await disabledBlog.json();
    assert(disabledBlogJson.code === "MODULE_DISABLED", "Blog API did not report MODULE_DISABLED");
    await setSiteConfig("module_blog_enabled", "true", "modules");

    await setSiteConfig("module_ecommerce_enabled", "false", "modules");
    const disabledProducts = await expectStatus(`${base}/api/products`, 404);
    const disabledProductsJson = await disabledProducts.json();
    assert(disabledProductsJson.code === "MODULE_DISABLED", "Products API did not report MODULE_DISABLED");
    const disabledCustomers = await expectStatus(`${base}/api/admin/customers`, 404, adminHeaders);
    const disabledCustomersJson = await disabledCustomers.json();
    assert(disabledCustomersJson.code === "MODULE_DISABLED", "Admin customers API did not report MODULE_DISABLED");
    const disabledAnalytics = await expectStatus(`${base}/api/admin/analytics`, 404, adminHeaders);
    const disabledAnalyticsJson = await disabledAnalytics.json();
    assert(disabledAnalyticsJson.code === "MODULE_DISABLED", "Admin analytics API did not report MODULE_DISABLED");
    if (orderId) {
      const disabledOrderWhatsApp = await expectStatus(`${base}/api/admin/orders/${orderId}/whatsapp`, 404, {
        ...adminHeaders,
        method: "POST",
        headers: { "Content-Type": "application/json", cookie: adminCookie },
        body: JSON.stringify({ templateKey: "order_confirmed" }),
      });
      const disabledOrderWhatsAppJson = await disabledOrderWhatsApp.json();
      assert(disabledOrderWhatsAppJson.code === "MODULE_DISABLED", "Order WhatsApp API did not report MODULE_DISABLED");
    }
    await expectJsonSuccess(`${base}/api/admin/media`, adminHeaders);
    await expectJsonSuccess(`${base}/api/admin/whatsapp`, adminHeaders);
    await setSiteConfig("module_ecommerce_enabled", "true", "modules");

    console.log("[e2e] OK: live routes, APIs, and module gates verified.");
  } finally {
    await setSiteConfig("module_cms_enabled", "true", "modules").catch(() => {});
    await setSiteConfig("module_blog_enabled", "true", "modules").catch(() => {});
    await setSiteConfig("module_ecommerce_enabled", "true", "modules").catch(() => {});
    await setSiteConfig("whatsapp_enabled", "true", "whatsapp").catch(() => {});
    await setSiteConfig("whatsapp_order_notify", "true", "whatsapp").catch(() => {});
    await db.delete(whatsappLogs).where(eq(whatsappLogs.recipientPhone, "+919999999999")).catch(() => {});
    await db.delete(whatsappLogs).where(eq(whatsappLogs.recipientPhone, "+919888888888")).catch(() => {});
    await db.delete(notificationDeliveries).where(eq(notificationDeliveries.recipient, tempEmail)).catch(() => {});
    await db.delete(otpCodes).where(eq(otpCodes.target, tempEmail)).catch(() => {});
    if (tempEmail) {
      const rows = await db.select({ id: users.id }).from(users).where(eq(users.email, tempEmail)).catch(() => []);
      const tempUserId = rows[0]?.id;
      if (tempUserId) {
        await db.delete(notificationDeliveries).where(eq(notificationDeliveries.userId, tempUserId)).catch(() => {});
        await db.delete(notificationDeliveries).where(eq(notificationDeliveries.recipient, tempUserId)).catch(() => {});
        await db.delete(notifications).where(eq(notifications.userId, tempUserId)).catch(() => {});
      }
    }
    if (orderId) await db.delete(orders).where(eq(orders.id, orderId)).catch(() => {});
    if (variantId && originalStock !== undefined) {
      await db.update(productVariants).set({ stock: originalStock }).where(eq(productVariants.id, variantId)).catch(() => {});
    }
    await db.delete(users).where(eq(users.email, tempEmail)).catch(() => {});
    if (mediaId) await db.delete(media).where(eq(media.id, mediaId)).catch(() => {});
    if (proofPath) fs.rmSync(proofPath, { force: true });
    await clearRedisPrefix(redis, "rate:auth:").catch(() => {});
    if (server) await stopServer(server);
    await closePool?.().catch(() => {});
    closeRedis?.();
  }
}

main().catch((err) => {
  console.error("[e2e] FAILED:", err.message);
  process.exitCode = 1;
});
