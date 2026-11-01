/** Tanda qiran: huruf q dari dua belahan (Qirana dan Qirani) yang bertemu di tengah. */
export function LogoMark({ size = 28, className, tile = true }: { size?: number; className?: string; tile?: boolean }) {
  // Tanpa kotak, warna ikut latar: belahan kiri memakai warna teks, kanan memakai --logo-accent
  const left = tile ? "#e3e2da" : "currentColor";
  const right = tile ? "#9fc7b8" : "var(--logo-accent, #9fc7b8)";
  return (
    <svg className={className} width={size} height={size} viewBox="0 0 64 64" aria-hidden="true" focusable="false">
      {tile ? <rect width="64" height="64" rx="15" fill="#161c1a" /> : null}
      <path d="M29 17.5a12.5 12.5 0 0 0 0 25" fill="none" style={{ stroke: left }} strokeWidth="7" />
      <path d="M29 17.5a12.5 12.5 0 0 1 12.5 12.5a12.5 12.5 0 0 1 -12.5 12.5" fill="none" style={{ stroke: right }} strokeWidth="7" />
      <path d="M41.5 18v32" fill="none" style={{ stroke: right }} strokeWidth="7" strokeLinecap="round" />
    </svg>
  );
}

export function Wordmark({ name, size = 28 }: { name: string; size?: number }) {
  return (
    <>
      <LogoMark size={size} className="logo-mark" />
      <span>{name}</span>
    </>
  );
}
