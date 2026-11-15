import { ArrowRight, Clock } from "lucide-react";
import Link from "next/link";

import LevelBadge from "@/components/programmes/LevelBadge";
import type { ProgrammeSummary } from "@/lib/programmes";

/** Programme summary card: level badge, title, duration, "View programme". The whole card is clickable. */
function ProgrammeCard({ programme }: { programme: ProgrammeSummary }) {
  return (
    <article className="group relative flex h-full flex-col rounded-xl border border-border bg-card p-6 shadow-sm outline-offset-2 outline-focus transition-shadow hover:shadow-md has-[a:focus-visible]:outline-2">
      <LevelBadge level={programme.level} className="self-start" />

      <h3 className="mt-4 font-display text-xl leading-snug font-bold text-primary">
        <Link
          href={`/academics/${programme.slug}`}
          className="after:absolute after:inset-0 after:rounded-xl focus-visible:outline-none"
        >
          {programme.title}
        </Link>
      </h3>

      <p className="mt-2 flex items-center gap-1.5 text-sm text-secondary">
        <Clock className="size-4 shrink-0" aria-hidden />
        {programme.duration}
      </p>

      {programme.description && (
        <p className="mt-4 line-clamp-3 text-sm leading-relaxed text-secondary">
          {programme.description}
        </p>
      )}

      <p
        aria-hidden
        className="mt-auto flex items-center gap-1 pt-6 text-sm font-semibold text-accent-strong"
      >
        View programme
        <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
      </p>
    </article>
  );
}

export default ProgrammeCard;
