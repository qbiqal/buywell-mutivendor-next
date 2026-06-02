import { revalidatePath } from "next/cache";

export function revalidateSiteShell(): void {
  for (const path of ["/", "/home", "/blog", "/shop", "/sitemap.xml", "/robots.txt", "/admin"]) {
    revalidatePath(path);
  }
}

export function revalidateCmsPaths(paths: string[] = []): void {
  revalidateSiteShell();
  for (const path of paths) {
    if (path.startsWith("/")) revalidatePath(path);
  }
}
