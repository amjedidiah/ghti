import { youTubeEmbedUrl } from "@/lib/links";

/**
 * An unlisted YouTube lesson video, privacy-enhanced (youtube-nocookie.com):
 * no YouTube cookies until it plays; captions on where the video has them.
 */
function LessonPlayer({ youtubeId, title }: { youtubeId: string; title: string }) {
  return (
    <div className="aspect-video w-full overflow-hidden rounded-lg border border-border bg-black">
      <iframe
        src={youTubeEmbedUrl(youtubeId)}
        title={`Video: ${title}`}
        loading="lazy"
        allow="accelerometer; encrypted-media; gyroscope; picture-in-picture; web-share"
        allowFullScreen
        referrerPolicy="strict-origin-when-cross-origin"
        className="size-full"
      />
    </div>
  );
}

export default LessonPlayer;
