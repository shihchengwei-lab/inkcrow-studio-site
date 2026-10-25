export const routePath = (path: string) => path.replace(/\/+$/, "") || "/";
const SITE_ROUTES = new Set(["/", "/privacy", "/terms"]);

/** 點擊、操作意圖與視窗預載共用相同的站內目的地規則。 */
export function destination(target: EventTarget | null, currentPath = location.pathname) {
  const anchor = target instanceof Element ? target.closest<HTMLAnchorElement>("a[href]") : null;
  if (!anchor || (anchor.target && anchor.target !== "_self") || anchor.hasAttribute("download")) return null;
  const url = new URL(anchor.href, location.href);
  if (url.origin !== location.origin || !SITE_ROUTES.has(routePath(url.pathname))) return null;
  if (routePath(url.pathname) === routePath(currentPath)) return null;
  return { url, anchor };
}
