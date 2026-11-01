/** Tanda qiran: huruf q dari dua belahan (Qirana dan Qirani) yang bertemu di tengah. */
export function LogoMark({ size = 28, className }: { size?: number; className?: string }) {
  return (
    <svg className={className} width={size} height={size} viewBox="0 0 64 64" aria-hidden="true" focusable="false">
      <rect width="64" height="64" rx="15" fill="#161c1a" />
      <path d="M29 17.5a12.5 12.5 0 0 0 0 25" fill="none" stroke="#e3e2da" strokeWidth="7" />
      <path d="M29 17.5a12.5 12.5 0 0 1 12.5 12.5a12.5 12.5 0 0 1 -12.5 12.5" fill="none" stroke="#9fc7b8" strokeWidth="7" />
      <path d="M41.5 18v32" fill="none" stroke="#9fc7b8" strokeWidth="7" strokeLinecap="round" />
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
