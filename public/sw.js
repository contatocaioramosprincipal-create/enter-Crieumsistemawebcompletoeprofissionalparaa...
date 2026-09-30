// Service worker mínimo do AMCF: existe apenas para tornar o app instalável
// (Adicionar à Tela de Início). Não faz cache e não intercepta respostas —
// o conteúdo continua vindo sempre da rede, igual ao sistema atual.
self.addEventListener('install', () => { self.skipWaiting(); });

self.addEventListener('activate', (event) => { event.waitUntil(self.clients.claim()); });

self.addEventListener('fetch', () => { /* sem respondWith: passagem direta para a rede */ });
