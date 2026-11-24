import dns from 'node:dns';
import net from 'node:net';

type LookupCallback = (
  err: NodeJS.ErrnoException | null,
  address: string | dns.LookupAddress[],
  family?: number
) => void;

type LookupOptions = dns.LookupOptions;

/**
 * Make every outgoing connection prefer IPv4.
 *
 * On this Windows host the system resolver (getaddrinfo) returns a single IPv6 address for
 * Cloudflare-fronted hosts such as the TikTok sign server, and IPv6 routing here is flaky. Every
 * (re)connect to the live room then hung ~20s on `connect ETIMEDOUT 2606:4700:…` before retrying.
 * `dns.setDefaultResultOrder('ipv4first')` can't help because no IPv4 address is returned at all,
 * so we ask DNS for A records first and fall back to the system lookup when there are none.
 * Loopback/single-label names (localhost, hosts-file entries) keep the original lookup.
 */
export function installPreferIpv4Lookup(): void {
  const systemLookup = dns.lookup.bind(dns) as (
    hostname: string,
    options: LookupOptions,
    callback: LookupCallback
  ) => void;

  const preferIpv4Lookup = (
    hostname: string,
    optionsOrCallback: LookupOptions | number | LookupCallback,
    maybeCallback?: LookupCallback
  ): void => {
    const callback = (typeof optionsOrCallback === 'function' ? optionsOrCallback : maybeCallback) as LookupCallback;
    const options: LookupOptions =
      typeof optionsOrCallback === 'function'
        ? {}
        : typeof optionsOrCallback === 'number'
          ? { family: optionsOrCallback }
          : optionsOrCallback ?? {};

    const keepSystemLookup = options.family === 6 || net.isIP(hostname) !== 0 || !hostname.includes('.');
    if (keepSystemLookup) {
      systemLookup(hostname, options, callback);
      return;
    }

    dns.resolve4(hostname, (err, addresses) => {
      if (err || addresses.length === 0) {
        systemLookup(hostname, options, callback);
        return;
      }
      if (options.all) {
        callback(null, addresses.map((address) => ({ address, family: 4 })));
        return;
      }
      callback(null, addresses[0], 4);
    });
  };

  (dns as unknown as { lookup: typeof preferIpv4Lookup }).lookup = preferIpv4Lookup;
}
