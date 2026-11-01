"use client";

export function ConfirmButton({ children, message, danger, ...rest }: { children: React.ReactNode; message: string; danger?: boolean; name?: string; value?: string }) {
  return (
    <button {...rest} type="submit" className={`btn btn-small ${danger ? "btn-danger" : "btn-quiet"}`}
      onClick={(e) => { if (!window.confirm(message)) e.preventDefault(); }}>
      {children}
    </button>
  );
}
