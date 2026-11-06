export const ROUTES = [
  { id: 'documents', label: 'Documents', path: '#/documents' },
  { id: 'extract', label: 'Extract JSON', path: '#/extract' },
  { id: 'chat', label: 'Local chat', path: '#/chat' },
  { id: 'settings', label: 'Settings', path: '#/settings' }
] as const;
export type RouteId = typeof ROUTES[number]['id'];
export function routeFromHash(hash: string): RouteId {
  const path = hash.startsWith('#/') ? hash.slice(2).split(/[?#]/, 1)[0] : '';
  return ROUTES.find(route => route.id === path)?.id ?? 'documents';
}
