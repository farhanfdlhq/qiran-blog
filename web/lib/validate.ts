/**
 * Validasi form dengan pesan buatan sendiri (bahasa Indonesia, gaya situs), pengganti balon validasi bawaan browser.
 * Form diberi noValidate; fungsi ini memakai aturan HTML yang sama (required, type, minLength, pattern).
 */
function messageFor(el: HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement): string {
  const v = el.validity;
  const label = el.labels?.[0]?.textContent?.trim().replace(/\s*\(.*\)$/, "") || "Kolom ini";
  if (v.valueMissing) return `${label} wajib diisi.`;
  if (v.typeMismatch && el.type === "email") return "Format email belum benar, contoh: nama@gmail.com.";
  if (v.typeMismatch && el.type === "url") return "Alamat harus diawali https://.";
  if (v.tooShort) return `${label} minimal ${(el as HTMLInputElement).minLength} karakter.`;
  if (v.tooLong) return `${label} maksimal ${(el as HTMLInputElement).maxLength} karakter.`;
  if (v.patternMismatch) return el.title || `${label} belum sesuai format.`;
  return `${label} belum benar.`;
}

function clear(el: Element) {
  el.removeAttribute("aria-invalid");
  const id = el.getAttribute("data-err-id");
  if (id) document.getElementById(id)?.remove();
  el.removeAttribute("data-err-id");
}

/** Mengembalikan true kalau valid. Kalau tidak, pesan ditampilkan di bawah kolom dan kolom pertama difokuskan. */
export function validateForm(form: HTMLFormElement): boolean {
  const fields = Array.from(form.querySelectorAll<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>("input, textarea, select"))
    .filter((el) => el.type !== "hidden" && !el.disabled && !el.closest("[aria-hidden='true']"));
  let first: HTMLElement | null = null;
  for (const el of fields) {
    clear(el);
    if (el.checkValidity()) continue;
    const id = `err-${Math.random().toString(36).slice(2, 8)}`;
    const msg = document.createElement("p");
    msg.className = "field-error";
    msg.id = id;
    msg.textContent = messageFor(el);
    (el.closest(".pw-wrap") ?? el).insertAdjacentElement("afterend", msg);
    el.setAttribute("aria-invalid", "true");
    el.setAttribute("data-err-id", id);
    el.setAttribute("aria-describedby", [el.getAttribute("aria-describedby"), id].filter(Boolean).join(" "));
    el.addEventListener("input", () => clear(el), { once: true });
    first ??= el;
  }
  first?.focus();
  return !first;
}
