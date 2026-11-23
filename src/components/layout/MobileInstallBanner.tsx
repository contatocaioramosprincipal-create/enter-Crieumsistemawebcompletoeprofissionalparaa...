import { useEffect, useState } from 'react';
import { Download, Smartphone, Share2, X, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface InstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

type Platform = 'ios' | 'android' | 'other';

function isInstalled() {
  const navigatorWithStandalone = navigator as Navigator & { standalone?: boolean };
  return window.matchMedia('(display-mode: standalone)').matches || navigatorWithStandalone.standalone === true;
}

/**
 * CTA visível em celulares, tanto antes quanto depois do login.
 * Android Chrome: usa beforeinstallprompt quando disponível.
 * iOS: explica "Compartilhar > Adicionar à Tela de Início".
 * Não simula downloads nem pede permissões indevidas.
 */
export default function MobileInstallBanner() {
  const [mobile, setMobile] = useState(false);
  const [installed, setInstalled] = useState(false);
  const [platform, setPlatform] = useState<Platform>('other');
  const [installPrompt, setInstallPrompt] = useState<InstallPromptEvent | null>(null);
  const [showHelp, setShowHelp] = useState(false);
  const [working, setWorking] = useState(false);

  useEffect(() => {
    const screen = window.matchMedia('(max-width: 767px)');
    const standalone = window.matchMedia('(display-mode: standalone)');
    const userAgent = navigator.userAgent;
    setPlatform(/iPad|iPhone|iPod/.test(userAgent) ? 'ios' : /Android/i.test(userAgent) ? 'android' : 'other');

    const updateVisibility = () => {
      setMobile(screen.matches || /Android|iPhone|iPad|iPod/i.test(navigator.userAgent));
      setInstalled(isInstalled());
    };
    updateVisibility();

    const captureInstall = (event: Event) => {
      event.preventDefault();
      setInstallPrompt(event as InstallPromptEvent);
    };
    const onInstalled = () => {
      setInstalled(true);
      setInstallPrompt(null);
      setShowHelp(false);
    };

    screen.addEventListener('change', updateVisibility);
    standalone.addEventListener('change', updateVisibility);
    window.addEventListener('beforeinstallprompt', captureInstall);
    window.addEventListener('appinstalled', onInstalled);
    return () => {
      screen.removeEventListener('change', updateVisibility);
      standalone.removeEventListener('change', updateVisibility);
      window.removeEventListener('beforeinstallprompt', captureInstall);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);

  const install = async () => {
    if (!installPrompt) {
      setShowHelp(true);
      return;
    }
    setWorking(true);
    try {
      await installPrompt.prompt();
      await installPrompt.userChoice;
      setInstallPrompt(null);
    } catch {
      setShowHelp(true);
    } finally {
      setWorking(false);
    }
  };

  if (!mobile || installed) return null;

  return <section aria-label="Instalar aplicativo AMCF no celular" className="mx-0 mt-4 rounded-xl border border-primary/15 bg-gradient-to-r from-[#eaf0f6] via-[#f5f7fa] to-white p-4 text-foreground shadow-sm md:hidden">
    <div className="flex items-start gap-3">
      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-primary/10 bg-white shadow-sm">
        <img src="/icon-192.png" alt="" width="36" height="36" className="h-9 w-9 rounded-lg object-contain" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="flex items-center gap-2 text-sm font-semibold"><Smartphone size={16} /> AMCF no seu celular</p>
        <p className="mt-1 text-xs leading-5 text-muted-foreground">Instale o sistema na tela inicial e acesse como um aplicativo. Sem precisar de loja de apps.</p>
      </div>
    </div>
    <Button type="button" className="mt-3 h-11 w-full text-sm font-semibold" disabled={working} onClick={() => void install()}>
      <Download size={17} />{working ? 'Abrindo instalação…' : 'Instalar aplicativo no celular'}
    </Button>
    <button type="button" className="mt-2 w-full text-center text-xs font-medium text-primary underline-offset-2 hover:underline" onClick={() => setShowHelp(value => !value)}>
      {showHelp ? 'Ocultar instruções' : 'Como instalar no meu celular?'}
    </button>
    {showHelp && <div className="mt-3 rounded-lg border bg-white p-3 text-xs leading-6" role="region" aria-label="Instruções de instalação">
      <div className="mb-2 flex items-center justify-between gap-2">
        <strong>Instalar o AMCF</strong>
        <button type="button" aria-label="Fechar instruções" className="rounded p-1 hover:bg-muted" onClick={() => setShowHelp(false)}><X size={16} /></button>
      </div>
      {platform === 'ios'
        ? <p><Share2 size={14} className="mr-1 inline" /> No <strong>Safari</strong>, toque em <strong>Compartilhar</strong>, depois <strong>Adicionar à Tela de Início</strong> e <strong>Adicionar</strong>. Se estiver em outro navegador, abra este endereço no Safari.</p>
        : <p>Abra o AMCF no <strong>Chrome</strong>, toque no menu de <strong>três pontos (⋮)</strong>, escolha <strong>Instalar aplicativo</strong> ou <strong>Adicionar à tela inicial</strong> e confirme.</p>}
      <p className="mt-2 flex items-start gap-2 text-muted-foreground"><CheckCircle2 size={14} className="mt-1 shrink-0" /> O acesso continua protegido pelo login individual e segundo fator de segurança. O sistema requer conexão à internet.</p>
    </div>}
  </section>;
}
