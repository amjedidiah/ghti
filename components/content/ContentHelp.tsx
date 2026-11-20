import { HelpCircle } from "lucide-react";

/** How to put videos and files where students can reach them. */
function ContentHelp() {
  return (
    <details className="group rounded-xl border border-border bg-card p-4 sm:p-5">
      <summary className="flex cursor-pointer list-none items-center gap-2 font-semibold text-primary">
        <HelpCircle className="size-5 text-accent-strong" aria-hidden />
        How to add videos and files
      </summary>
      <div className="mt-4 space-y-4 text-sm leading-relaxed text-secondary">
        <div>
          <h3 className="font-semibold text-primary">Videos (YouTube)</h3>
          <ol className="mt-1 list-decimal space-y-1 pl-5">
            <li>Upload the video to the ministry&apos;s YouTube channel.</li>
            <li>
              Set <strong className="text-primary">Visibility</strong> to{" "}
              <strong className="text-primary">Unlisted</strong> (not Public, not Private).
            </li>
            <li>Choose Share → Copy, and paste the link here.</li>
          </ol>
        </div>
        <div>
          <h3 className="font-semibold text-primary">Files (Google Drive)</h3>
          <ol className="mt-1 list-decimal space-y-1 pl-5">
            <li>Upload the file to the ministry&apos;s Google Drive.</li>
            <li>
              Choose Share → General access →{" "}
              <strong className="text-primary">Anyone with the link</strong>, as{" "}
              <strong className="text-primary">Viewer</strong>.
            </li>
            <li>
              For read-only files, open the sharing settings (gear) and untick &quot;Viewers can
              download, print and copy&quot;.
            </li>
            <li>Choose Copy link, and paste it here. Link one file, not a folder.</li>
          </ol>
        </div>
        <p>
          Students never see these links: they open videos here and files through the portal, which
          checks they are on the course first.
        </p>
      </div>
    </details>
  );
}

export default ContentHelp;
