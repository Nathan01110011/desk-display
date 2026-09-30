import { ArrowLeft } from 'lucide-react';
import type { ButtonHTMLAttributes } from 'react';

export default function BackButton({ className = '', ...props }: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button type="button" className={`inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/10 px-4 py-2 text-base font-bold text-white transition-colors hover:bg-white/20 active:bg-white/25 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white disabled:opacity-40 ${className}`} {...props}>
      <ArrowLeft size={20} aria-hidden="true" /> Back
    </button>
  );
}
