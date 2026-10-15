import { lazy, Suspense, useState } from 'react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { Bot, LoaderCircle, X } from 'lucide-react';

const PericiaAssistantPage = lazy(() => import('@/features/assistant/PericiaAssistantPage'));

/**
 * Global, authenticated CRM launcher. A force-mounted Radix dialog preserves
 * the conversation as the user switches between CRM pages and closes the panel.
 * It does not expose a public n8n chat URL; all requests use the AMCF bridge.
 */
export default function FloatingPericiaAssistant() {
  const [open, setOpen] = useState(false);

  return (
    <DialogPrimitive.Root open={open} onOpenChange={setOpen}>
      <DialogPrimitive.Trigger asChild>
        <button
          type="button"
          aria-label="Abrir conversa com o Assistente de Perícia"
          title="Conversar com o Assistente de Perícia"
          className="fixed bottom-5 right-5 z-40 flex h-14 w-14 items-center justify-center rounded-full border-2 border-gold-light/70 bg-sidebar text-gold-light shadow-[0_8px_30px_rgba(0,0,0,0.24)] transition-transform hover:scale-105 hover:bg-sidebar-accent focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring sm:bottom-7 sm:right-7"
        >
          <Bot size={28} strokeWidth={1.7} aria-hidden="true" />
        </button>
      </DialogPrimitive.Trigger>

      <DialogPrimitive.Portal forceMount>
        <DialogPrimitive.Overlay
          forceMount
          className="fixed inset-0 z-50 bg-overlay/45 data-[state=closed]:hidden"
        />
        <DialogPrimitive.Content
          forceMount
          aria-describedby="amcf-floating-assistant-description"
          className="fixed inset-3 z-[60] flex min-h-0 flex-col overflow-hidden rounded-xl border border-border bg-background shadow-2xl outline-none data-[state=closed]:hidden sm:bottom-6 sm:left-auto sm:right-6 sm:top-auto sm:h-[min(740px,calc(100dvh-3rem))] sm:w-[450px]"
        >
          <header className="flex shrink-0 items-center gap-3 border-b bg-sidebar px-4 py-3 text-sidebar-foreground">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-gold-light/40 text-gold-light">
              <Bot size={22} aria-hidden="true" />
            </div>
            <div className="min-w-0 flex-1">
              <DialogPrimitive.Title className="text-sm font-semibold">Assistente de Perícia</DialogPrimitive.Title>
              <DialogPrimitive.Description id="amcf-floating-assistant-description" className="mt-1 text-[11px] text-sidebar-foreground/65">
                Converse sem sair desta tela
              </DialogPrimitive.Description>
            </div>
            <DialogPrimitive.Close
              aria-label="Fechar conversa"
              className="rounded-md p-2 text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-foreground focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold-light"
            >
              <X size={19} aria-hidden="true" />
            </DialogPrimitive.Close>
          </header>

          <div className="min-h-0 flex-1 overflow-hidden p-3">
            <Suspense fallback={<div role="status" className="flex h-full items-center justify-center gap-2 text-xs text-muted-foreground"><LoaderCircle className="h-4 w-4 animate-spin" /> Carregando assistente…</div>}>
              <PericiaAssistantPage compact />
            </Suspense>
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
