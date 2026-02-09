"use client";

import { useFormStatus } from "react-dom";

export function SubmitButton({
  children,
  pendingText,
  className,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { pendingText?: string }) {
  const { pending } = useFormStatus();
  return (
    <button disabled={pending} className={className} {...props}>
      {pending ? (pendingText ?? "Running...") : children}
    </button>
  );
}
