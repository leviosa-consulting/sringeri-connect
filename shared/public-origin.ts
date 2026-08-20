const REPLIT_HOST_SUFFIXES = [".replit.dev", ".replit.app", ".repl.co"];

function isReplitHostname(hostname: string): boolean {
  const normalizedHostname = hostname.toLowerCase();
  return REPLIT_HOST_SUFFIXES.some((suffix) => normalizedHostname.endsWith(suffix));
}

/**
 * Converts a browser origin into the public origin used for app-generated URLs.
 *
 * Replit's development server listens on internal port 5000, while the public
 * HTTPS domain is served through the default external port. Local development
 * and non-Replit hosts must keep their explicit ports.
 */
export function normalizePublicOrigin(origin: string): string {
  const url = new URL(origin);

  if (isReplitHostname(url.hostname) && url.port === "5000") {
    url.port = "";
  }

  return url.origin;
}

export function getPublicUrl(origin: string, path: string): string {
  return new URL(path, normalizePublicOrigin(origin)).toString();
}