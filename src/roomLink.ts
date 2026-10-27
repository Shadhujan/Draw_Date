export function roomUrl(room: string) {
  const url = new URL(window.location.origin + window.location.pathname);
  url.searchParams.set('room', room);
  return url.toString();
}
