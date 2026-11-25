import { useEffect } from 'react';
import { Toaster } from '@/components/ui/sonner';
import { TooltipProvider } from '@/components/ui/tooltip';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createBrowserRouter, RouterProvider, useRouteError, isRouteErrorResponse } from 'react-router-dom';
import AuthProvider from '@/features/auth/AuthProvider';
import { routers } from './router';
const queryClient = new QueryClient({ defaultOptions: { queries: { retry: 1, staleTime: 15_000, gcTime: 60_000, refetchOnWindowFocus: true }, mutations: { retry: false } } });
function RouteRecovery() {
  const error = useRouteError();
  const notFound = isRouteErrorResponse(error) && error.status === 404;
  return <main role="alert" className="flex min-h-screen items-center justify-center bg-background p-6"><section className="max-w-lg rounded-xl border bg-card p-8 text-card-foreground"><p className="text-xs font-semibold tracking-widest text-muted-foreground">AMCF · Gestão médico-pericial</p><h1 className="mt-4 text-2xl font-semibold">{notFound ? 'Página não encontrada' : 'Não foi possível carregar esta página'}</h1><p className="mt-3 text-sm text-muted-foreground">Tente carregar novamente ou retorne à visão geral. Se o problema persistir, informe à administração a página acessada e o horário do erro.</p><div className="mt-6 flex flex-wrap gap-3"><button type="button" className="rounded-md bg-primary px-4 py-2 text-primary-foreground" onClick={() => window.location.reload()}>Tentar novamente</button><a className="rounded-md border px-4 py-2" href="/">Voltar ao início</a></div></section></main>;
}
const router = createBrowserRouter(routers.map(route => ({ ...route, errorElement: <RouteRecovery />, children: route.children.map(child => ({ ...child, errorElement: <RouteRecovery /> })) })));
export default function App() {
  useEffect(() => { document.documentElement.lang = 'pt-BR'; }, []);
  return <QueryClientProvider client={queryClient}><AuthProvider><TooltipProvider><Toaster richColors position="top-right" /><RouterProvider router={router} /></TooltipProvider></AuthProvider></QueryClientProvider>;
}
