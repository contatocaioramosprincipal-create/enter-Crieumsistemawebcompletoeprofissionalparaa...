import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import { Bot, LoaderCircle, X } from 'lucide-react';

const PericiaAssistantPage = lazy(() => import('@/features/assistant/PericiaAssistantPage'));

/**
 * Accessible non-modal assistant drawer shared by all authenticated CRM pages.
 * Use a plain React toggle rather than a force-mounted modal/overlay: the
 * launcher must remain clickable and never block interaction with the CRM.
 * Once opened, the chat remains mounted when hidden to preserve its state
 * while navigating between modules.
 */
export default function FloatingPericiaAssistant() {
  const [open, setOpen] = useState(false);
  const [openedOnce, setOpenedOnce] = useState(false);
  const closeRef = useRef<HTMLButtonElement>(null);
  const launcherRef = useRef<HTMLButtonElement>(null);

  const toggle = () => {
    if (!open) setOpenedOnce(true);
    setOpen(value => !value);
  };

  useEffect(() => {
    if (open) closeRef.current?.focus();
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false);
        launcherRef.current?.focus();
      }
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [open]);

  return (
    <>
      <button
        ref={launcherRef}
        type="button"
        onClick={toggle}
        aria-label={open ? 'Ocultar Assistente Virtual' : 'Abrir Assistente Virtual'}
        aria-expanded={open}
        aria-controls="amcf-floating-assistant"
        title={open ? 'Ocultar Assistente Virtual' : 'Abrir Assistente Virtual'}
        className="fixed bottom-4 right-4 z-[90] flex h-14 items-center gap-2 rounded-full border border-gold-light/60 bg-sidebar px-4 text-sidebar-foreground shadow-[0_8px_30px_rgba(0,0,0,0.28)] transition-colors hover:bg-sidebar-accent focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold-light sm:bottom-6 sm:right-6"
      >
        <Bot size={24} strokeWidth={1.8} className="shrink-0 text-gold-light" aria-hidden="true" />
        <span className="whitespace-nowrap text-sm font-semibold">Assistente Virtual</span>
      </button>

      {openedOnce && (
        <section
          id="amcf-floating-assistant"
          role="dialog"
          aria-modal="false"
          aria-labelledby="amcf-floating-assistant-title"
          aria-describedby="amcf-floating-assistant-description"
          aria-hidden={!open}
          inert={!open}
          className={`fixed bottom-[88px] right-3 z-[80] h-[calc(100dvh-108px)] w-[calc(100vw-1.5rem)] max-w-[450px] min-h-0 flex-col overflow-hidden rounded-xl border border-border bg-background shadow-2xl sm:bottom-[96px] sm:right-6 sm:h-[min(710px,calc(100dvh-120px))] ${open ? 'flex' : 'hidden'}`}
        >
          <header className="flex shrink-0 items-center gap-3 border-b bg-sidebar px-4 py-3 text-sidebar-foreground">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-gold-light/40 text-gold-light">
              <Bot size={22} aria-hidden="true" />
            </div>
            <div className="min-w-0 flex-1">
              <h2 id="amcf-floating-assistant-title" className="text-sm font-semibold">Assistente Virtual</h2>
              <p id="amcf-floating-assistant-description" className="mt-1 text-[11px] text-sidebar-foreground/65">
                Apoio à perícia médica sem sair desta tela
              </p>
            </div>
            <button
              ref={closeRef}
              type="button"
              aria-label="Fechar Assistente Virtual"
              onClick={() => { setOpen(false); launcherRef.current?.focus(); }}
              className="rounded-md p-2 text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-foreground focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold-light"
            >
              <X size={19} aria-hidden="true" />
            </button>
          </header>
          <div className="min-h-0 flex-1 overflow-hidden p-3">
            <Suspense fallback={<div role="status" className="flex h-full items-center justify-center gap-2 text-xs text-muted-foreground"><LoaderCircle className="h-4 w-4 animate-spin" /> Carregando assistente…</div>}>
              <PericiaAssistantPage compact />
            </Suspense>
          </div>
        </section>
      )}
    </>
  );
}
