import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const baseUrl = (process.env.NEXT_PUBLIC_APP_URL || "https://aprasnaturals.com").replace(/\/$/, "");

  return {
    rules: {
      userAgent: "*",
      allow: ["/", "/home", "/coming-soon", "/shop", "/blog"],
      disallow: [
        "/admin",
        "/api",
        "/checkout",
        "/orders",
        "/profile",
        "/notifications",
        "/login",
        "/register",
        "/forgot-password",
        "/reset-password",
        "/verify-email",
      ],
    },
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
