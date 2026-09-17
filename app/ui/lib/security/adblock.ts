// Oriel WhisperGuard — client-side ad shield data (host blocklist).
//
// Runs entirely inside our OWN page. We only refuse to make requests to
// known ad/tracker hosts and evict injected ad DOM. We never touch — or
// spoof — the requests we send to streaming providers, so embed servers
// cannot detect that a shield is present.

/** Hostname suffix rules. `entries` match the host and any subdomain. */
export interface AdBlockRule {
  host: string;
  reason: string;
}

export const AD_BLOCK_RULES: AdBlockRule[] = [
  // Popunder / popup networks
  { host: "popads.net", reason: "popunder network" },
  { host: "propellerads.com", reason: "popunder/redirect network" },
  { host: "popcash.net", reason: "popunder network" },
  { host: "hilltopads.net", reason: "popunder network" },
  { host: "onclickpredictiv.com", reason: "click/redirect network" },
  { host: "clicksotraffic.com", reason: "redirect network" },
  { host: "youradexchange.com", reason: "rebill/redirect scheme" },
  { host: "adsterra.com", reason: "popunder/redirect network" },
  { host: "adcashtraffic.com", reason: "popunder network" },
  { host: "adcash.com", reason: "popunder network" },
  { host: "mobuppsads.com", reason: "redirect network" },
  { host: "traffcore.com", reason: "click/redirect network" },
  { host: "adsrec.com", reason: "click/redirect network" },
  { host: "cmdol.online", reason: "popunder network" },
  { host: "chpter.com", reason: "popunder network" },

  // Common ad exchanges / trackers
  { host: "doubleclick.net", reason: "Google ad exchange" },
  { host: "googlesyndication.com", reason: "Google Ads" },
  { host: "googletagservices.com", reason: "Google tag manager" },
  { host: "google-analytics.com", reason: "analytics" },
  { host: "scorecardresearch.com", reason: "audience tracking" },
  { host: "quantserve.com", reason: "audience tracking" },
  { host: "criteo.com", reason: "ad retargeting" },
  { host: "taboola.com", reason: "native ads" },
  { host: "outbrain.com", reason: "native ads" },
  { host: "adnxs.com", reason: "AppNexus ad exchange" },
  { host: "rubiconproject.com", reason: "ad exchange" },
  { host: "openx.net", reason: "ad exchange" },
  { host: "casalemedia.com", reason: "ad exchange" },
  { host: "lijit.com", reason: "PubMatic" },
  { host: "pubmatic.com", reason: "ad exchange" },
  { host: "amazon-adsystem.com", reason: "Amazon ad system" },
  { host: "adsrvr.org", reason: "The Trade Desk" },
  { host: "fwmrm.net", reason: "FreeWheel ad serving" },
  { host: "moatads.com", reason: "ad verification" },
  { host: "2mdn.net", reason: "DoubleClick video ads" },
];

/** Normalize to a lowercased, port-stripped hostname. */
function hostOf(url: string): string {
  try {
    return new URL(url, window.location.origin).hostname.toLowerCase();
  } catch {
    return "";
  }
}

/** True if `host` equals a rule host or is a subdomain of one. */
function matchesRuleHost(host: string, ruleHost: string): boolean {
  return host === ruleHost || host.endsWith(`.${ruleHost}`);
}

/** Returns the matching rule for a URL, or null if it's allowed. */
export function blockedRuleFor(url: string): AdBlockRule | null {
  const host = hostOf(url);
  if (!host) return null;
  for (const rule of AD_BLOCK_RULES) {
    if (matchesRuleHost(host, rule.host)) return rule;
  }
  return null;
}
