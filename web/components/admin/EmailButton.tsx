"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { changeUserEmail } from "@/app/actions/admin";
import { useFeedback } from "@/components/Feedback";
import { FormDialog } from "./Dialog";

/** Tombol "Ubah email" di halaman Pengguna (hanya tampil untuk admin). */
export function EmailButton({ id, name, email }: { id: number; name: string; email: string }) {
  const [open, setOpen] = useState(false);
  const { toast } = useFeedback();
  const router = useRouter();
  return (
    <>
      <button type="button" className="btn btn-quiet btn-small" onClick={() => setOpen(true)}>Ubah email</button>
      <FormDialog
        open={open}
        title={`Email untuk ${name}`}
        submitLabel="Simpan email"
        fields={[{ name: "email", label: "Email baru", type: "email", value: email, required: true, hint: "Dipakai untuk masuk ke panel. Password tidak berubah." }]}
        onSubmit={async ({ email: next }) => {
          try {
            const r = await changeUserEmail(id, next);
            toast(r.message ?? "Selesai.", r.ok ? "ok" : "err");
            if (r.ok) { setOpen(false); router.refresh(); }
          } catch {
            toast("Gagal menyimpan. Periksa koneksi lalu coba lagi.", "err");
          }
        }}
        onClose={() => setOpen(false)}
      />
    </>
  );
}
