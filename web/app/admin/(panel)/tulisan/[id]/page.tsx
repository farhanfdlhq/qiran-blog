import { notFound, redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { getFullById, canEdit, isScheduled } from "@/lib/posts";
import { isoToWibInput } from "@/lib/time";
import { PostEditor } from "@/components/admin/PostEditor";

export default async function EditPost({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const post = getFullById(Number((await params).id));
  if (!post) notFound();
  if (!canEdit(user, post)) redirect("/admin/");
  let json: unknown = null;
  try {
    json = post.content_json ? JSON.parse(post.content_json) : null;
  } catch {
    json = null;
  }
  return (
    <PostEditor
      initial={{
        id: post.id,
        type: post.type,
        title: post.title === "Tanpa judul" ? "" : post.title,
        slug: post.slug,
        excerpt: post.excerpt,
        json,
        html: post.content_html,
        tags: post.tags.map((t) => t.name).join(", "),
        featureImage: post.feature_image,
        featureImageAlt: post.feature_image_alt,
        featureImageCaption: post.feature_image_caption,
        allowComments: post.allow_comments === 1,
        publishAt: post.published_at ? isoToWibInput(post.published_at) : "",
        status: post.status,
        scheduled: isScheduled(post),
        authorName: post.author?.name ?? "",
      }}
    />
  );
}
