import type { ReactNode } from 'react';
export default function PageHeader({ eyebrow = 'ESPAÇO DE TRABALHO', title, description, children }: { eyebrow?: string; title: string; description: string; children?: ReactNode }) {
  return <div className="page-heading"><div><p className="eyebrow">{eyebrow}</p><h1 className="mt-2 text-[28px] font-semibold leading-tight tracking-tight">{title}</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">{description}</p></div>{children && <div className="flex shrink-0 items-center gap-2">{children}</div>}</div>;
}
