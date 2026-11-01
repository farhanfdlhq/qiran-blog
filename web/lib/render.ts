/** Mengubah isi editor jadi HTML aman untuk ditampilkan. */
import sanitizeHtml from "sanitize-html";

const ALLOWED: sanitizeHtml.IOptions = {
  allowedTags: [
    "p", "br", "h2", "h3", "h4", "strong", "b", "em", "i", "u", "s", "mark", "code", "pre",
    "blockquote", "ul", "ol", "li", "a", "img", "figure", "figcaption", "hr",
  ],
  allowedAttributes: {
    a: ["href", "title", "rel", "target"],
    img: ["src", "alt", "title", "width", "height", "loading"],
    figure: ["class"],
    p: ["class"],
  },
  allowedClasses: { figure: ["kg-width-wide", "kg-width-full", "kg-image-card"], p: [] },
  allowedSchemes: ["http", "https", "mailto"],
  allowedSchemesByTag: { img: ["http", "https"] },
  allowProtocolRelative: false,
  transformTags: {
    a: (tagName, attribs) => {
      const external = /^https?:\/\//i.test(attribs.href || "");
      return {
        tagName,
        attribs: external ? { ...attribs, rel: "noopener noreferrer", target: "_blank" } : attribs,
      };
    },
    img: (tagName, attribs) => ({ tagName, attribs: { ...attribs, loading: "lazy" } }),
  },
};

export function sanitize(html: string): string {
  return sanitizeHtml(html, ALLOWED);
}


