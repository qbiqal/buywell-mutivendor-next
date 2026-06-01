const ALLOWED_TAGS = new Set([
  "a",
  "blockquote",
  "br",
  "code",
  "div",
  "em",
  "h2",
  "h3",
  "h4",
  "hr",
  "img",
  "li",
  "ol",
  "p",
  "pre",
  "span",
  "strong",
  "ul",
]);

const ALLOWED_ATTRS = new Set(["alt", "href", "rel", "src", "target", "title"]);
const URI_ATTRS = new Set(["href", "src"]);

export function sanitizeHtml(input: string): string {
  if (!input) return "";

  return input
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<\s*(\/?)\s*([a-z0-9]+)([^>]*)>/gi, (_match, closing: string, tagRaw: string, attrsRaw: string) => {
      const tag = tagRaw.toLowerCase();
      if (!ALLOWED_TAGS.has(tag)) return "";
      if (closing) return `</${tag}>`;
      const attrs = sanitizeAttributes(attrsRaw);
      return `<${tag}${attrs}>`;
    });
}

function sanitizeAttributes(attrsRaw: string): string {
  const attrs: string[] = [];
  attrsRaw.replace(/([a-z0-9:-]+)\s*=\s*("([^"]*)"|'([^']*)'|([^\s"'>]+))/gi, (_match, nameRaw: string, _quoted: string, v1: string, v2: string, v3: string) => {
    const name = nameRaw.toLowerCase();
    if (name.startsWith("on") || !ALLOWED_ATTRS.has(name)) return "";

    const value = (v1 ?? v2 ?? v3 ?? "").trim();
    if (URI_ATTRS.has(name) && !isSafeUrl(value)) return "";

    attrs.push(`${name}="${escapeAttr(value)}"`);
    return "";
  });

  if (attrs.some((attr) => attr === 'target="_blank"') && !attrs.some((attr) => attr.startsWith("rel="))) {
    attrs.push('rel="noopener noreferrer"');
  }

  return attrs.length ? ` ${attrs.join(" ")}` : "";
}

function isSafeUrl(value: string): boolean {
  if (!value) return false;
  if (value.startsWith("/") || value.startsWith("#")) return true;
  if (/^(https?:|mailto:|tel:)/i.test(value)) return true;
  if (/^data:image\/(png|jpeg|jpg|gif|webp);base64,/i.test(value)) return true;
  return false;
}

function escapeAttr(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}
