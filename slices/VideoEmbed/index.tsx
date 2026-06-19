"use client";

import Image from "next/image";
import { useState } from "react";
import type { Content } from "@prismicio/client";
import type { SliceComponentProps } from "@prismicio/react";
import { RichText } from "@/foundation/rich-text/RichText";

export type VideoEmbedProps = SliceComponentProps<Content.VideoEmbedSlice>;

type VideoEmbedData = {
  embedUrl: string;
  thumbnailUrl: string;
  title: string;
};

function getYouTubeID(url: string): string {
  try {
    const parsedUrl = new URL(url);

    if (parsedUrl.hostname === "youtu.be") {
      return parsedUrl.pathname.split("/").filter(Boolean)[0] ?? "";
    }

    if (parsedUrl.hostname.endsWith("youtube.com")) {
      if (parsedUrl.pathname === "/watch") {
        return parsedUrl.searchParams.get("v") ?? "";
      }

      if (parsedUrl.pathname.startsWith("/embed/") || parsedUrl.pathname.startsWith("/shorts/")) {
        return parsedUrl.pathname.split("/").filter(Boolean)[1] ?? "";
      }
    }
  } catch {
    return "";
  }

  return "";
}

function getVideoEmbedData(url: string): VideoEmbedData | null {
  const youtubeID = getYouTubeID(url);

  if (!youtubeID) {
    return null;
  }

  return {
    embedUrl: `https://www.youtube-nocookie.com/embed/${youtubeID}?autoplay=1&rel=0`,
    thumbnailUrl: `https://i.ytimg.com/vi/${youtubeID}/hqdefault.jpg`,
    title: "Watch video",
  };
}

export default function VideoEmbed({ slice }: VideoEmbedProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const embedUrl = slice.primary.embed_url;
  const video = embedUrl ? getVideoEmbedData(embedUrl) : null;

  return (
    <section className="mb-9" data-slice-type={slice.slice_type} data-slice-variation={slice.variation}>
      {video ? (
        <div className="relative aspect-video overflow-hidden bg-[#111]">
          {isPlaying ? (
            <iframe
              className="absolute inset-0 h-full w-full"
              src={video.embedUrl}
              title={video.title}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
            />
          ) : (
            <button
              type="button"
              className="group absolute inset-0 block h-full w-full cursor-pointer border-0 bg-black p-0"
              onClick={() => setIsPlaying(true)}
              aria-label={video.title}
            >
              <Image
                src={video.thumbnailUrl}
                alt={`${video.title} thumbnail`}
                fill
                unoptimized
                sizes="(min-width: 768px) 680px, calc(100vw - 48px)"
                className="object-cover opacity-90 transition group-hover:opacity-75"
              />
              <span className="absolute inset-0 flex items-center justify-center">
                <span className="flex h-16 w-16 items-center justify-center rounded-full bg-white/92 text-ink shadow-sm transition group-hover:scale-105">
                  <span className="ml-1 h-0 w-0 border-y-[12px] border-l-[18px] border-y-transparent border-l-current" />
                </span>
              </span>
            </button>
          )}
        </div>
      ) : embedUrl ? (
        <a
          href={embedUrl}
          className="flex min-h-[320px] items-center justify-center bg-[#f0ebe3] text-[13px] tracking-[0.05em] uppercase text-[#aaa]"
        >
          Watch video
        </a>
      ) : (
        <div className="flex min-h-[320px] items-center justify-center bg-[#f0ebe3] text-[13px] tracking-[0.05em] uppercase text-[#aaa]">
          Video pending import
        </div>
      )}
      <div className="mt-3 text-[12px] leading-[1.7] text-[#999]">
        <RichText field={slice.primary.caption} />
        <RichText field={slice.primary.credit} />
      </div>
    </section>
  );
}
