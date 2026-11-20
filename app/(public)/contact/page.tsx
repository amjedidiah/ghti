import { Clock, Mail, MapPin, Navigation, Phone } from "lucide-react";
import type { Metadata } from "next";

import ContactForm from "@/components/contact/ContactForm";
import PageHeader from "@/components/shared/PageHeader";
import Placeholder from "@/components/shared/Placeholder";
import { getSiteContent } from "@/lib/queries/site-content";
import { site } from "@/lib/site";

export const metadata: Metadata = {
  title: "Contact & directions",
  description: `Phone numbers, address and directions to ${site.name}.`,
};

// Details come from client input #10. The form sends to EMAIL_TO (step 2.6).

async function ContactPage() {
  const content = await getSiteContent();
  const { contactAddress: address, contactPhone: phone, contactEmail: email } = content;
  const mapQuery = content.mapQuery;

  return (
    <>
      <PageHeader eyebrow="Contact" title="Contact & directions">
        <p>Call, email or visit the GHTI office, or send us a message below.</p>
      </PageHeader>

      <div className="mx-auto grid w-full max-w-7xl gap-8 px-4 py-12 sm:px-6 lg:grid-cols-2 lg:px-8">
        <div className="space-y-4">
          <Detail icon={MapPin} label="Address">
            {address ? (
              <p className="whitespace-pre-line">{address}</p>
            ) : (
              <Placeholder what="campus address." input={10} />
            )}
          </Detail>
          <Detail icon={Phone} label="Phone">
            {phone ? (
              <a
                href={`tel:${phone.replace(/\s+/g, "")}`}
                className="font-semibold text-accent-strong hover:underline"
              >
                {phone}
              </a>
            ) : (
              <Placeholder what="office phone numbers." input={10} />
            )}
          </Detail>
          <Detail icon={Mail} label="Email">
            {email ? (
              <a
                href={`mailto:${email}`}
                className="font-semibold text-accent-strong hover:underline"
              >
                {email}
              </a>
            ) : (
              <Placeholder what="office email address." input={10} />
            )}
          </Detail>
          <Detail icon={Clock} label="Office hours">
            {content.officeHours ?? <Placeholder what="office hours." input={10} />}
          </Detail>
        </div>

        <div className="space-y-3">
          {mapQuery ? (
            <>
              <iframe
                title={`Map showing ${site.name}`}
                src={`https://www.google.com/maps?q=${encodeURIComponent(mapQuery)}&output=embed`}
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                className="aspect-[4/3] w-full rounded-xl border border-border"
              />
              <a
                href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(mapQuery)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-md bg-brand px-5 py-3 font-semibold text-on-brand hover:bg-brand-deep"
              >
                <Navigation className="size-4" aria-hidden />
                Get directions
              </a>
            </>
          ) : (
            <Placeholder
              what="map location (a Google Maps link or the exact address)."
              input={10}
            />
          )}
        </div>
      </div>

      <section
        aria-labelledby="message-heading"
        className="mx-auto w-full max-w-7xl px-4 pb-16 sm:px-6 lg:px-8"
      >
        <div className="relative max-w-2xl rounded-xl border border-border bg-card p-5 shadow-sm sm:p-8">
          <h2 id="message-heading" className="font-display text-2xl font-bold text-primary">
            Send us a message
          </h2>
          <p className="mt-2 mb-6 text-secondary">
            Questions about programmes, admissions or your studies. We reply by email.
          </p>
          <ContactForm />
        </div>
      </section>
    </>
  );
}

function Detail({
  icon: Icon,
  label,
  children,
}: {
  icon: typeof MapPin;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex gap-4 rounded-xl border border-border bg-card p-5 shadow-sm">
      <Icon className="mt-0.5 size-5 shrink-0 text-accent-strong" aria-hidden />
      <div className="min-w-0 flex-1 text-secondary">
        <h2 className="mb-1 font-semibold text-primary">{label}</h2>
        {children}
      </div>
    </div>
  );
}

export default ContactPage;
