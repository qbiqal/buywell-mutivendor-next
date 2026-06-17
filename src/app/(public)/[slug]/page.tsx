import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getCmsPageBySlug } from "@/lib/cms";
import { isModuleEnabled, type ModuleKey } from "@/lib/modules";
import { buildSeoMetadata } from "@/lib/seo";
import styles from "./cms-page.module.css";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const page = await getCmsPageBySlug(slug);
  if (!page) return {};
  return buildSeoMetadata(`/${page.slug}`, {
    title: page.metaTitle || page.title,
    description: page.metaDescription || page.excerpt,
    keywords: page.keywords,
    canonicalPath: `/${page.slug}`,
    canonicalUrl: page.canonicalUrl,
    ogImageUrl: page.ogImageUrl,
    noIndex: page.noIndex,
    noFollow: page.noFollow,
  });
}

export default async function PublicCMSPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const page = await getCmsPageBySlug(slug);
  if (!page) notFound();
  if (!(await isVisibleModule(page.moduleKey))) notFound();

  return (
    <article className={styles.page}>
      <header className={styles.header}>
        <p className={styles.eyebrow}>BuyWell Marketplace</p>
        <h1>{page.title}</h1>
        {page.excerpt && <p>{page.excerpt}</p>}
      </header>
      <div className={styles.content} dangerouslySetInnerHTML={{ __html: page.content }} />
    </article>
  );
}

async function isVisibleModule(moduleKey: string): Promise<boolean> {
  if (moduleKey === "core") return true;
  return isModuleEnabled(moduleKey as ModuleKey);
}
