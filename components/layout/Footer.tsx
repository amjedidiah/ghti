import { Mail, MapPin, Phone } from "lucide-react";
import { cacheLife } from "next/cache";
import Link from "next/link";

import SocialIcon from "@/components/layout/SocialIcon";
import { footerLinks, ghtiNavLinks, site, socialLinks } from "@/lib/site";

/** Cached so the prerendered shell can show the year (Cache Components forbids a bare `new Date()`). */
async function CurrentYear() {
  "use cache";
  cacheLife("days");
  return new Date().getFullYear();
}

/**
 * Shared CRM footer (ported from cwl and protection): a navy band, then the
 * copyright line and social links. GHTI's contact details appear once supplied.
 */
function Footer() {
  const { address, phone, email } = site.contact;
  const hasContact = Boolean(address || phone || email);

  return (
    <footer>
      <section className="bg-brand-deep text-on-brand">
        <div className="mx-auto grid max-w-7xl gap-8 px-4 py-12 sm:px-6 md:grid-cols-2 lg:px-8">
          <div>
            <p className="font-display text-3xl font-bold tracking-tight">{site.name}</p>
            <p className="mt-2 text-sm text-on-brand-muted">
              {site.fullName ?? `A ${site.ministry} institution`}
            </p>
            <p className="mt-4 text-sm text-on-brand-muted">God Bless You</p>
          </div>

          <div className="grid gap-6 sm:grid-cols-2">
            <nav aria-label="Footer">
              <ul className="space-y-2 text-sm">
                {[...ghtiNavLinks, ...footerLinks].map((link) => (
                  <li key={link.href}>
                    <Link href={link.href} className="text-on-brand-muted hover:text-on-brand">
                      {link.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>

            {hasContact && (
              <address className="space-y-2 text-sm text-on-brand-muted not-italic">
                {address && (
                  <p className="flex gap-2">
                    <MapPin className="mt-0.5 size-4 shrink-0" aria-hidden />
                    <span>{address}</span>
                  </p>
                )}
                {phone && (
                  <p className="flex gap-2">
                    <Phone className="mt-0.5 size-4 shrink-0" aria-hidden />
                    <a href={`tel:${phone.replace(/\s+/g, "")}`} className="hover:text-on-brand">
                      {phone}
                    </a>
                  </p>
                )}
                {email && (
                  <p className="flex gap-2">
                    <Mail className="mt-0.5 size-4 shrink-0" aria-hidden />
                    <a href={`mailto:${email}`} className="hover:text-on-brand">
                      {email}
                    </a>
                  </p>
                )}
              </address>
            )}
          </div>
        </div>
      </section>

      <div className="border-t border-border bg-bg">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-6 px-4 py-8 sm:px-6 md:flex-row lg:px-8">
          <p className="text-center text-sm text-secondary md:text-left">
            &copy; <CurrentYear />{" "}
            <a href={site.ministryUrl} className="font-medium text-brand hover:underline">
              {site.ministry}
            </a>
            . All rights reserved.
          </p>
          <ul className="flex items-center gap-2">
            {socialLinks.map((link) => (
              <li key={link.name}>
                <a
                  href={link.href}
                  aria-label={link.name}
                  title={link.name}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex size-11 items-center justify-center rounded-md text-secondary transition-colors hover:bg-muted hover:text-brand"
                >
                  <SocialIcon name={link.name} />
                </a>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </footer>
  );
}

export default Footer;
