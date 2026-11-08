/** Ekstensi Tiptap yang dipakai editor di browser. */
import { Node, mergeAttributes } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Highlight from "@tiptap/extension-highlight";
import Image from "@tiptap/extension-image";

/** Teks sumber disimpan sebagai "(Sumber: …)" supaya tetap terbaca tanpa CSS (RSS, pencarian, PDF). */
export function sourceLabel(source: string): string {
  return `(Sumber: ${source})`;
}

export function sourceFromLabel(text: string): string {
  return text.trim().replace(/^\(\s*Sumber:\s*/i, "").replace(/\)\s*$/, "").trim();
}

/**
 * Gambar dengan keterangan dan sumber. Nomor "Gambar N." dibuat otomatis saat tampil.
 * HTML: <figure class="qiran-fig"><img><figcaption><span class="fig-caption">…</span> <span class="fig-source">(Sumber: …)</span></figcaption></figure>
 */
export const QiranFigure = Node.create({
  name: "qiranFigure",
  group: "block",
  atom: true,
  draggable: true,
  selectable: true,

  addAttributes() {
    return { src: { default: "" }, alt: { default: "" }, caption: { default: "" }, source: { default: "" } };
  },

  parseHTML() {
    return [
      {
        tag: "figure.qiran-fig",
        getAttrs: (el) => {
          const dom = el as HTMLElement;
          const img = dom.querySelector("img");
          if (!img?.getAttribute("src")) return false;
          return {
            src: img.getAttribute("src"),
            alt: img.getAttribute("alt") ?? "",
            caption: dom.querySelector(".fig-caption")?.textContent?.trim() ?? "",
            source: sourceFromLabel(dom.querySelector(".fig-source")?.textContent ?? ""),
          };
        },
      },
    ];
  },

  renderHTML({ node, HTMLAttributes }) {
    const { caption, source, src, alt } = node.attrs as { caption: string; source: string; src: string; alt: string };
    const parts: unknown[] = [];
    if (caption) parts.push(["span", { class: "fig-caption" }, caption]);
    if (caption && source) parts.push(" ");
    if (source) parts.push(["span", { class: "fig-source" }, sourceLabel(source)]);
    void HTMLAttributes;
    return ["figure", mergeAttributes({ class: "qiran-fig" }), ["img", { src, alt }], ["figcaption", {}, ...parts]] as never;
  },
});

export function editorExtensions() {
  return [
    StarterKit.configure({
      heading: { levels: [2, 3] },
      link: {
        openOnClick: false,
        autolink: true,
        protocols: ["http", "https", "mailto"],
        HTMLAttributes: { rel: "noopener noreferrer" },
        isAllowedUri: (url, ctx) => /^(https?:|mailto:|\/)/i.test(url) && ctx.defaultValidate(url),
      },
    }),
    Highlight,
    Image.configure({ inline: false, allowBase64: false }),
    QiranFigure,
  ];
}
