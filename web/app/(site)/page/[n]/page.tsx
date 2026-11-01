import { notFound, redirect } from "next/navigation";
import type { Metadata } from "next";
import { listPublished } from "@/lib/posts";
import { ArchiveList } from "@/components/PostList";

type Props = { params: Promise<{ n: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { n } = await params;
  return { title: `Semua tulisan, halaman ${n}`, alternates: { canonical: `/page/${n}/` } };
}

export default async function Paged({ params }: Props) {
  const n = Number((await params).n);
  if (!Number.isInteger(n) || n < 1) notFound();
  if (n === 1) redirect("/");
  const { items, page, pages } = listPublished({ page: n });
  if (!items.length) notFound();
  return <ArchiveList posts={items} title="Semua tulisan" titleTag="h1" page={page} pages={pages} base="/" top />;
}
