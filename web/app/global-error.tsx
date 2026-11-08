"use client";
import "./site.css";
import { ErrorView } from "@/components/ErrorView";

// Dipakai kalau kerangka halaman utama sendiri yang gagal
export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="id" data-mode="auto">
      <body>
        <ErrorView reset={reset} digest={error.digest} error={error} />
      </body>
    </html>
  );
}
