import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getTagBySlug, listPublished } from "@/lib/posts";
import { siteSettings } from "@/lib/settings";
import { ArchiveList } from "@/components/PostList";
import { shareMeta } from "@/lib/meta";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const tag = getTagBySlug((await params).slug);
  if (!tag) return {};
  const s = siteSettings();
  const title = `Tag ${tag.name}`;
  const description = tag.description || `Tulisan bertag ${tag.name} di ${s.site_title}.`;
  const url = `/tag/${tag.slug}/`;
  return { title, description, alternates: { canonical: url }, ...shareMeta({ title: `${title} · ${s.site_title}`, description, path: url }) };
}

export default async function TagPage({ params }: Props) {
  const tag = getTagBySlug((await params).slug);
  if (!tag) notFound();
  const { items, total } = listPublished({ page: 1, tagSlug: tag.slug, perPage: 200 });
  const s = siteSettings();
  return (
    <ArchiveList posts={items} title={`Tulisan dengan tag ${tag.name}`} titleTag="h1" top
      lead={<p className="lead-soft">{tag.description || `Semua tulisan di ${s.site_title} dengan tag ${tag.name}.`} {total ? `Ada ${total} tulisan.` : "Belum ada tulisan."}</p>} />
  );
}
