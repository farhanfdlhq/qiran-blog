import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getUserBySlug } from "@/lib/users";
import { listPublished } from "@/lib/posts";
import { siteSettings } from "@/lib/settings";
import { imgVariant } from "@/lib/site";
import { ArchiveList } from "@/components/PostList";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const u = getUserBySlug((await params).slug);
  if (!u) return {};
  return { title: `Tulisan ${u.name}`, description: u.bio || undefined, alternates: { canonical: `/author/${u.slug}/` } };
}

export default async function AuthorPage({ params }: Props) {
  const u = getUserBySlug((await params).slug);
  if (!u) notFound();
  const { items, total } = listPublished({ page: 1, authorSlug: u.slug, perPage: 200 });
  const s = siteSettings();
  return (
    <ArchiveList posts={items} title={`Tulisan ${u.name}`} titleTag="h1" top
      lead={
        <>
          {u.avatar ? <img className="avatar" src={imgVariant(u.avatar, 720)} alt="" width={72} height={72} /> : null}
          <p className="lead-soft">{u.bio || `Semua tulisan ${u.name} di ${s.site_title}.`} {total ? `Ada ${total} tulisan.` : "Belum ada tulisan."}</p>
        </>
      } />
  );
}
