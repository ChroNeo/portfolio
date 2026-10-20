/**
 * Card thumbnails.
 *
 * The CMS owns the thumbnail: a `thumbnail` media field on the project entry,
 * optimised by Astro at build time. The local images below are the fallback for
 * a project whose thumbnail has not been uploaded yet, so a card never loses its
 * picture while content is being moved across.
 */
import type { ImageMetadata } from "astro";
import seniorProject from "../assets/images/projects/senior_project_thumb.jpg";
import test from "../assets/images/projects/test.jpg";
import { mediaUrl } from "./strapi";

export interface Thumbnail {
  src: string | ImageMetadata;
  width: number;
  height: number;
}

/** Keyed by slug, matching the file name the old MDX frontmatter used. */
const FALLBACK: Record<string, ImageMetadata> = {
  senior_project: seniorProject,
  test,
};

interface Media {
  url?: string | null;
  width?: number | null;
  height?: number | null;
}

/** The image to show on a project card, or `undefined` when there is none. */
export const thumbnailFor = (slug: string, media?: Media | null): Thumbnail | undefined => {
  if (media?.url) {
    const width = media.width ?? 1600;
    const height = media.height ?? Math.round((width * 9) / 16);
    return { src: mediaUrl(media.url), width, height };
  }

  const local = FALLBACK[slug];
  if (local === undefined) {
    return undefined;
  }

  return { src: local, width: local.width, height: local.height };
};

/** The height that keeps a thumbnail's aspect ratio at a given render width. */
export const heightAt = (thumbnail: Thumbnail, width: number): number =>
  Math.round((width * thumbnail.height) / thumbnail.width);
