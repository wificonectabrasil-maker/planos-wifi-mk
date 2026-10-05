"use client";

import { useEffect, useRef } from "react";

const VIDEO_SRC = "/videos/claro-pacotes-hero.mp4";
const HERO_VIDEO_POSTER = "/images/hero-claro-poster.webp";

function playSilentVideo(video: HTMLVideoElement) {
  video.muted = true;
  video.defaultMuted = true;
  video.volume = 0;
  // No src/source exists before the delay, so autoplay cannot fetch the video early.
  if (!video.getAttribute("src")) {
    video.src = VIDEO_SRC;
    video.load();
  }
  void video.play().catch(() => {
    // Keep the poster visible if the browser blocks autoplay.
  });
}

export function HeroVideoBackground() {
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = videoRef.current;
    const container = containerRef.current;
    if (!video || !container) return;
    video.muted = true;
    video.defaultMuted = true;
    video.volume = 0;

    let timer: ReturnType<typeof setTimeout> | undefined;
    let delayElapsed = false;
    let inView = typeof IntersectionObserver === "undefined";

    const playWhenAllowed = () => {
      if (!delayElapsed || !inView || document.hidden) {
        video.pause();
        return;
      }
      playSilentVideo(video);
    };

    const scheduleVideo = () => {
      timer = setTimeout(() => {
        delayElapsed = true;
        playWhenAllowed();
      }, 3000);
    };

    const observer = typeof IntersectionObserver !== "undefined"
      ? new IntersectionObserver(([entry]) => {
          inView = entry.isIntersecting;
          playWhenAllowed();
        })
      : null;
    observer?.observe(container);

    if (document.readyState === "complete") scheduleVideo();
    else window.addEventListener("load", scheduleVideo, { once: true });
    document.addEventListener("visibilitychange", playWhenAllowed);

    return () => {
      clearTimeout(timer);
      window.removeEventListener("load", scheduleVideo);
      document.removeEventListener("visibilitychange", playWhenAllowed);
      observer?.disconnect();
      video.pause();
    };
  }, []);

  return (
    <div className="wifi-hero-video-background" ref={containerRef} aria-hidden="true">
      <video
        ref={videoRef}
        className="wifi-hero-background-video"
        poster={HERO_VIDEO_POSTER}
        preload="none"
        autoPlay
        loop
        muted
        playsInline
        controls={false}
        disablePictureInPicture
        disableRemotePlayback
        tabIndex={-1}
      />
      <div className="wifi-hero-video-shade" />
    </div>
  );
}
