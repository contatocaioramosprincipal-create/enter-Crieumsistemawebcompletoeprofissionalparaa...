import { useEffect } from 'react';
import { Toaster } from '@/components/ui/sonner';
import { TooltipProvider } from '@/components/ui/tooltip';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import AuthProvider from '@/features/auth/AuthProvider';
import { routers } from './router';
const queryClient = new QueryClient({ defaultOptions: { queries: { retry: 1, staleTime: 15_000, gcTime: 60_000, refetchOnWindowFocus: true }, mutations: { retry: false } } });
const router = createBrowserRouter(routers);
export default function App() {
  useEffect(() => { document.documentElement.lang = 'pt-BR'; }, []);
  return <QueryClientProvider client={queryClient}><AuthProvider><TooltipProvider><Toaster richColors position="top-right" /><RouterProvider router={router} /></TooltipProvider></AuthProvider></QueryClientProvider>;
}
