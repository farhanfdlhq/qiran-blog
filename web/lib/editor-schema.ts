/** Ekstensi Tiptap yang dipakai bersama oleh editor (browser) dan perender (server). */
import StarterKit from "@tiptap/starter-kit";
import Highlight from "@tiptap/extension-highlight";
import Image from "@tiptap/extension-image";

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
  ];
}
