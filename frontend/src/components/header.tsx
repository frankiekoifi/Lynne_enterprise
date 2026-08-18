import Link from "next/link";
import { Logo } from "@/components/logo";
import { CartButton } from "@/components/cart-button";
import { AccountMenu } from "@/components/account-menu";
import { MobileNav } from "@/components/mobile-nav";
import { getCurrentUser } from "@/lib/session";
import { getSettings } from "@/lib/settings";

const navLinks = [
  { href: "/", label: "Home" },
  { href: "/shop", label: "Shop" },
  { href: "/categories", label: "Categories" },
  { href: "/lipa-polepole", label: "Lipa Polepole" },
  { href: "/about", label: "About" },
  { href: "/contact", label: "Contact" },
];

export async function Header() {
  const [user, settings] = await Promise.all([getCurrentUser(), getSettings()]);

  return (
    <header className="sticky top-0 z-40 border-b border-ink-100 bg-white/95 backdrop-blur">
      <div className="hidden border-b border-ink-100 bg-ink-950 text-ink-200 sm:block">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-1.5 text-xs sm:px-6">
          <p>
            📞 {settings.phone} · ✉️ {settings.email}
          </p>
          <p className="font-medium text-brand-300">
            Buy in full or Lipa Polepole — pay gradually
          </p>
        </div>
      </div>

      <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-3 sm:px-6">
        <Logo className="mr-auto" />

        <nav className="hidden items-center gap-1 lg:flex">
          {navLinks.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="rounded-lg px-3 py-2 text-sm font-semibold text-ink-700 hover:bg-ink-100 hover:text-ink-900"
            >
              {l.label}
            </Link>
          ))}
        </nav>

        <form action="/shop" method="get" className="relative hidden md:block">
          <input
            type="search"
            name="q"
            placeholder="Search products…"
            className="h-10 w-44 rounded-xl border border-ink-200 bg-ink-50 pl-9 pr-3 text-sm focus:w-56 focus:border-brand-500 focus:bg-white focus:outline-none transition-all"
          />
          <svg
            viewBox="0 0 24 24"
            className="absolute left-3 top-2.5 size-5 text-ink-700/50"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <circle cx="11" cy="11" r="7" />
            <path strokeLinecap="round" d="m20 20-3-3" />
          </svg>
        </form>

        <CartButton />
        <AccountMenu user={user ? { fullName: user.fullName, role: user.role } : null} />
        <MobileNav />
      </div>
    </header>
  );
}
