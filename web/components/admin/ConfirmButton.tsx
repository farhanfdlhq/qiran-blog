"use client";
import { useFeedback } from "@/components/Feedback";

/** Tombol submit yang minta konfirmasi lewat dialog qiran sebelum mengirim form. */
export function ConfirmButton({ children, title, message, confirmLabel, danger, name, value }: {
  children: React.ReactNode; title: string; message?: string; confirmLabel?: string; danger?: boolean; name?: string; value?: string;
}) {
  const { confirm } = useFeedback();
  return (
    <button type="button" className={`btn btn-small ${danger ? "btn-danger" : "btn-quiet"}`}
      onClick={async (e) => {
        const btn = e.currentTarget;
        const res = await confirm({ title, body: message, confirmLabel: confirmLabel ?? "Ya, lanjutkan", danger });
        if (res !== "confirm") return;
        const form = btn.form;
        if (!form) return;
        if (name) {
          const hidden = document.createElement("input");
          hidden.type = "hidden"; hidden.name = name; hidden.value = value ?? "";
          form.appendChild(hidden);
          form.requestSubmit();
          hidden.remove();
        } else form.requestSubmit();
      }}>
      {children}
    </button>
  );
}
