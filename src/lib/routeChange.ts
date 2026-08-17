export const ROUTE_CHANGE_EVENT = 'cpg:routechange';

export function dispatchRouteChange() {
  window.dispatchEvent(new Event(ROUTE_CHANGE_EVENT));
}

export function subscribeRouteChange(handler: () => void) {
  window.addEventListener(ROUTE_CHANGE_EVENT, handler);
  return () => window.removeEventListener(ROUTE_CHANGE_EVENT, handler);
}
