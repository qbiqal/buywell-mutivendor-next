import { emptyMenus, isSafeMenuHref } from "../src/lib/cms";
import { absoluteUrl } from "../src/lib/seo";
import { sanitizeHtml } from "../src/lib/sanitize";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

async function main() {
  assert(isSafeMenuHref("/about"), "Internal menu URLs should be allowed");
  assert(isSafeMenuHref("#contact"), "Anchor menu URLs should be allowed");
  assert(isSafeMenuHref("https://example.com"), "HTTPS external URLs should be allowed");
  assert(isSafeMenuHref("mailto:test@example.com"), "Mailto URLs should be allowed");
  assert(!isSafeMenuHref("javascript:alert(1)"), "Script URLs must be rejected");

  const menus = emptyMenus();
  assert(Array.isArray(menus.landing_header), "Landing header menu should exist");
  assert(Array.isArray(menus.site_header), "Site header menu should exist");
  assert(Array.isArray(menus.footer), "Footer menu should exist");

  assert(absoluteUrl("https://example.com", "/about") === "https://example.com/about", "Absolute URL should join path");
  assert(absoluteUrl("https://example.com", "about") === "https://example.com/about", "Absolute URL should normalize missing slash");
  assert(absoluteUrl("https://example.com", "https://cdn.example.com/a.png") === "https://cdn.example.com/a.png", "Absolute URL should preserve full URLs");

  const sanitized = sanitizeHtml('<p>Hello</p><script>alert(1)</script><a href="javascript:bad()">bad</a>');
  assert(!sanitized.includes("<script"), "Sanitizer should remove scripts");
  assert(!sanitized.includes("javascript:"), "Sanitizer should remove unsafe hrefs");

  console.log("[unit] OK: CMS, SEO, and sanitizer helper checks passed.");
}

main()
  .catch((err) => {
    console.error("[unit] FAILED:", err.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    const [{ pool }, { redis }] = await Promise.all([
      import("../src/lib/db"),
      import("../src/lib/redis"),
    ]);
    await pool.end().catch(() => {});
    (redis as unknown as { disconnect?: () => void }).disconnect?.();
  });
