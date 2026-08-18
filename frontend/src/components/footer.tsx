import Link from "next/link";
import { Container } from "@/components/ui";
import { Logo } from "@/components/logo";
import { getSettings } from "@/lib/settings";

export async function Footer() {
  const s = await getSettings();
  return (
    <footer className="mt-16 border-t border-ink-100 bg-ink-950 text-ink-200">
      <Container className="py-12">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <Logo light />
            <p className="mt-4 max-w-xs text-sm text-ink-200/70">{s.description}</p>
          </div>
          <div>
            <h4 className="text-sm font-semibold text-white">Shop</h4>
            <ul className="mt-3 space-y-2 text-sm text-ink-200/80">
              <li><Link href="/shop" className="hover:text-white">All products</Link></li>
              <li><Link href="/shop?lipa=1" className="hover:text-white">Lipa Polepole</Link></li>
              <li><Link href="/categories" className="hover:text-white">Categories</Link></li>
              <li><Link href="/cart" className="hover:text-white">Cart</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="text-sm font-semibold text-white">Company</h4>
            <ul className="mt-3 space-y-2 text-sm text-ink-200/80">
              <li><Link href="/about" className="hover:text-white">About us</Link></li>
              <li><Link href="/contact" className="hover:text-white">Contact</Link></li>
              <li><Link href="/account" className="hover:text-white">My account</Link></li>
              <li><Link href="/admin" className="hover:text-white">Admin</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="text-sm font-semibold text-white">Get in touch</h4>
            <ul className="mt-3 space-y-2 text-sm text-ink-200/80">
              <li>📞 {s.phone}</li>
              <li>✉️ {s.email}</li>
              <li>📍 {s.address}</li>
            </ul>
          </div>
        </div>
        <div className="mt-10 flex flex-col items-center justify-between gap-3 border-t border-white/10 pt-6 text-xs text-ink-200/60 sm:flex-row">
          <p>© {new Date().getFullYear()} {s.businessName}. All rights reserved.</p>
          <p>Buy in full or pay gradually with Lipa Polepole.</p>
        </div>
      </Container>
    </footer>
  );
}
