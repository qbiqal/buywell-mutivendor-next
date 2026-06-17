"use client";
import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import styles from "./CustomerHeader.module.css";
import { LogoIcon } from "@/components/ui/Logo";

export interface PublicNavItem {
  label: string;
  href: string;
  opensNewTab?: boolean;
  children?: PublicNavItem[];
}

const NAV_LINKS: PublicNavItem[] = [
  { label: "Shop",    href: "/shop" },
  { label: "Blog",    href: "/blog" },
  { label: "Contact", href: "/contact" },
];

interface CustomerHeaderProps {
  user?: { firstName: string; email: string; role: string } | null;
  navLinks?: PublicNavItem[];
  landingNavLinks?: PublicNavItem[];
  siteNavLinks?: PublicNavItem[];
  ecommerceEnabled?: boolean;
  cartSlot?: React.ReactNode;
  topOffset?: number;
  logoUrl?: string;
  siteName?: string;
}

export function CustomerHeader({
  user,
  navLinks,
  landingNavLinks,
  siteNavLinks,
  ecommerceEnabled = true,
  cartSlot = null,
  topOffset = 0,
  logoUrl = "",
  siteName = "BuyWell",
}: CustomerHeaderProps) {
  const pathname = usePathname();
  const router   = useRouter();
  const [scrolled,       setScrolled]       = useState(false);
  const [menuOpen,       setMenuOpen]       = useState(false);
  const [dropdownOpen,   setDropdownOpen]   = useState(false);
  const [openSubMenus,   setOpenSubMenus]   = useState<Set<string>>(new Set());
  const [walletBalance, setWalletBalance] = useState<number | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Fetch ecommerce wallet balance for logged-in customers
  useEffect(() => {
    if (!user || user.role === "admin" || user.role === "qbiqal") return;
    fetch("/api/customer/bwallet/balance")
      .then(r => r.json())
      .then(d => { if (d.success && d.linked) setWalletBalance(d.balance); })
      .catch(() => {});
  }, [user]);

  // Close dropdown when clicking outside
  useEffect(() => {
    if (!dropdownOpen) return;
    function handle(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, [dropdownOpen]);

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/");
    router.refresh();
  }

  const resolvedNavLinks = pathname === "/"
    ? (landingNavLinks?.length ? landingNavLinks : navLinks ?? NAV_LINKS)
    : (siteNavLinks?.length ? siteNavLinks : navLinks ?? NAV_LINKS);
  const isAdminUser = user?.role === "admin" || user?.role === "qbiqal";

  return (
    <>
    <header className={[styles.header, scrolled ? styles.scrolled : ""].join(" ")} style={topOffset ? { top: topOffset } : undefined}>
      <div className={styles.inner}>
        {/* Logo */}
        <Link href="/" className={styles.logo}>
          {logoUrl ? (
            <img src={logoUrl} alt={siteName} className={styles.logoImage} />
          ) : (
            <>
              <LogoIcon size={36} />
              <span>Buy<span className={styles.logoAccent}>Well</span></span>
            </>
          )}
        </Link>

        {/* Desktop nav */}
        <nav className={styles.nav}>
          {resolvedNavLinks.map((l) => (
            <div key={`${l.href}-${l.label}`} className={styles.navGroup}>
              <Link
                href={l.href}
                target={l.opensNewTab ? "_blank" : undefined}
                rel={l.opensNewTab ? "noopener noreferrer" : undefined}
                className={[styles.navLink, isActive(pathname, l.href) ? styles.active : ""].join(" ")}
              >
                {l.label}
                {!!l.children?.length && <span className={styles.navChevron}>▾</span>}
              </Link>
              {!!l.children?.length && (
                <div className={styles.subNav}>
                  {l.children.map((child) => (
                    <Link
                      key={`${child.href}-${child.label}`}
                      href={child.href}
                      target={child.opensNewTab ? "_blank" : undefined}
                      rel={child.opensNewTab ? "noopener noreferrer" : undefined}
                      className={styles.subNavLink}
                    >
                      {child.label}
                    </Link>
                  ))}
                </div>
              )}
            </div>
          ))}
        </nav>

        {/* Right actions */}
        <div className={styles.actions}>
          {ecommerceEnabled && cartSlot}

          {/* Sell CTA — hidden on mobile (shown in drawer) */}
          {!isAdminUser && (
            <Link href="/become-vendor" className={styles.sellBtn}>Sell on BuyWell</Link>
          )}

          {user ? (
            <>
              {/* Admin shortcut — always visible in topbar for admins */}
              {isAdminUser && (
                <Link href="/admin/dashboard" className={styles.adminBtn}>⚙️ Admin Panel</Link>
              )}
              <div className={styles.userMenu} ref={dropdownRef}>
                <button
                  className={styles.userBtn}
                  onClick={() => setDropdownOpen((o) => !o)}
                  aria-expanded={dropdownOpen}
                >
                  <div className={styles.avatar}>{user.firstName[0].toUpperCase()}</div>
                  <span className={styles.userName}>{user.firstName}</span>
                  <span className={styles.chevron}>{dropdownOpen ? "▴" : "▾"}</span>
                </button>
                {dropdownOpen && (
                  <div className={styles.dropdown}>
                    {isAdminUser ? (
                      /* Admin dropdown — no customer-specific links */
                      <>
                        <Link href="/admin/dashboard" className={styles.dropdownItem} onClick={() => setDropdownOpen(false)}>📊 Dashboard</Link>
                        <Link href="/admin/orders" className={styles.dropdownItem} onClick={() => setDropdownOpen(false)}>📦 Orders</Link>
                        <Link href="/admin/settings" className={styles.dropdownItem} onClick={() => setDropdownOpen(false)}>⚙️ Settings</Link>
                        <div className={styles.dropdownDivider} />
                        <button onClick={handleLogout} className={[styles.dropdownItem, styles.logoutBtn].join(" ")}>
                          🚪 Logout
                        </button>
                      </>
                    ) : (
                      /* Customer dropdown */
                      <>
                        {walletBalance !== null && (
                          <>
                            <div className={styles.walletChip}>
                              <span>👛</span>
                              <span>₹{(walletBalance / 100).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                            </div>
                            <div className={styles.dropdownDivider} />
                          </>
                        )}
                        {ecommerceEnabled && (
                          <>
                            <Link href="/orders" className={styles.dropdownItem} onClick={() => setDropdownOpen(false)}>📦 My Orders</Link>
                            <Link href="/profile" className={styles.dropdownItem} onClick={() => setDropdownOpen(false)}>👤 Profile</Link>
                          </>
                        )}
                        <Link href="/notifications" className={styles.dropdownItem} onClick={() => setDropdownOpen(false)}>🔔 Notifications</Link>
                        <div className={styles.dropdownDivider} />
                        <button onClick={handleLogout} className={[styles.dropdownItem, styles.logoutBtn].join(" ")}>
                          🚪 Logout
                        </button>
                      </>
                    )}
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className={styles.authBtns}>
              <Link href="/login" className={styles.loginBtn}>Login</Link>
              <Link href="/register" className={styles.registerBtn}>Get Started</Link>
            </div>
          )}

          {/* Mobile menu toggle */}
          <button className={styles.mobileMenu} onClick={() => setMenuOpen(!menuOpen)} aria-label="Menu">
            {menuOpen ? "✕" : "☰"}
          </button>
        </div>
      </div>

      {/* Mobile drawer */}
      {menuOpen && (
        <div className={styles.mobileDrawer}>
          {resolvedNavLinks.map((l) => {
            const hasChildren = !!l.children?.length;
            const isSubOpen = openSubMenus.has(l.label);
            return (
              <div key={`${l.href}-${l.label}`} className={styles.mobileGroup}>
                {hasChildren ? (
                  <button
                    className={[styles.mobileLink, styles.mobileParentBtn].join(" ")}
                    onClick={() => setOpenSubMenus((prev) => {
                      const next = new Set(prev);
                      next.has(l.label) ? next.delete(l.label) : next.add(l.label);
                      return next;
                    })}
                  >
                    {l.label}
                    <span className={[styles.mobileChevron, isSubOpen ? styles.mobileChevronOpen : ""].join(" ")} aria-hidden>›</span>
                  </button>
                ) : (
                  <Link
                    href={l.href}
                    target={l.opensNewTab ? "_blank" : undefined}
                    rel={l.opensNewTab ? "noopener noreferrer" : undefined}
                    className={styles.mobileLink}
                    onClick={() => setMenuOpen(false)}
                  >
                    {l.label}
                  </Link>
                )}
                {hasChildren && (
                  <div className={[styles.mobileSubList, isSubOpen ? styles.mobileSubListOpen : ""].join(" ")}>
                    {l.children!.map((child) => (
                      <Link
                        key={`${child.href}-${child.label}`}
                        href={child.href}
                        target={child.opensNewTab ? "_blank" : undefined}
                        rel={child.opensNewTab ? "noopener noreferrer" : undefined}
                        className={styles.mobileSubLink}
                        onClick={() => setMenuOpen(false)}
                      >
                        {child.label}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
          {!isAdminUser && (
            <Link href="/become-vendor" className={[styles.mobileLink, styles.mobileSellLink].join(" ")} onClick={() => setMenuOpen(false)}>🏪 Sell on BuyWell</Link>
          )}
          {user ? (
            <>
              {ecommerceEnabled && (
                <>
                  <Link href="/orders" className={styles.mobileLink} onClick={() => setMenuOpen(false)}>My Orders</Link>
                  <Link href="/profile" className={styles.mobileLink} onClick={() => setMenuOpen(false)}>Profile</Link>
                </>
              )}
              <Link href="/notifications" className={styles.mobileLink} onClick={() => setMenuOpen(false)}>Notifications</Link>
              <button onClick={handleLogout} className={styles.mobileLogout}>Logout</button>
            </>
          ) : (
            <>
              <Link href="/login" className={styles.mobileLink} onClick={() => setMenuOpen(false)}>Login</Link>
              <Link href="/register" className={styles.mobileCta} onClick={() => setMenuOpen(false)}>Get Started</Link>
            </>
          )}
        </div>
      )}
    </header>

    </>
  );
}

function isActive(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  if (href.startsWith("/#")) return pathname === "/";
  return pathname.startsWith(href.split("?")[0]);
}
