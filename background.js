'use strict';

const DEFAULT_TOKENS = [
    'ocid=socialflow_facebook',
    'fb_action_ids',
    'bffb',
    'ref=fb',
    'spref=fb',
    'cid=fbs',
    'ref=tn_tn',
    'CMP=fb',
    'fb_comment_id',
    'mb=fb',
    'notif_t=like',
    'polycard_client',
];

const UTM_PATTERN = /([\?&]utm_(src|source|medium|term|campaign|content|cid|reader)=[^&#]*)/ig;

function stripTokensFromString(raw, list_of_tokens, separator) {
    let result = raw;
    for (const token of list_of_tokens) {
        const escaped = token.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const reg = new RegExp(
            `(^[${separator}]${escaped}[^&#]*|[&]${escaped}[^&#]*)`,
            'ig'
        );
        result = result.replace(reg, '');
    }
    if (raw.length > 0 && result.length > 0) {
        const lead_char = raw[0];
        if (result[0] !== lead_char && (lead_char === '?' || lead_char === '#')) {
            result = lead_char + result.replace(/^[&]/, '');
        }
    }
    return result;
}

async function getSettings() {
    return new Promise((resolve) => {
        chrome.storage.sync.get({
            on: false,
            stripUtm: false,
            tokens: DEFAULT_TOKENS,
            excludedDomains: [],
        }, resolve);
    });
}

async function setIcon(state) {
    const icons = {
        on:      { 48: 'icon-48.png' },
        off:     { 48: 'icon-48r.png' },
        cleaned: { 48: 'icon-48g.png' },
    };
    await chrome.action.setIcon({ path: icons[state] });
}

// Returns true if hostname matches domain exactly or is a subdomain of domain.
// Example: domainMatches('shop.example.com', 'example.com') => true
//          domainMatches('example.com', 'example.com')      => true
//          domainMatches('othersite.com', 'example.com')    => false
function domainMatches(hostname, domain) {
    return hostname === domain || hostname.endsWith('.' + domain);
}

// Finds the first excluded domain entry whose domain matches the given hostname.
// Returns the entry object { domain, tokens } or null if no match.
function findExcludedEntry(hostname, list_of_excluded_domains) {
    for (const entry of list_of_excluded_domains) {
        if (domainMatches(hostname, entry.domain)) {
            return entry;
        }
    }
    return null;
}

function stripUrl(raw_url, { stripUtm, tokens, excludedDomains }) {
    let parsed;
    try {
        parsed = new URL(raw_url);
    } catch {
        return raw_url;
    }

    const hostname = parsed.hostname;
    const excluded_entry = findExcludedEntry(hostname, excludedDomains);

    // Decide which token list to apply.
    // If the domain is excluded: use only its own tokens (may be empty).
    // If not excluded: use global tokens.
    const list_of_tokens_to_apply = excluded_entry !== null
        ? excluded_entry.tokens
        : tokens;

    let search = parsed.search;

    // UTM stripping only applies when the domain is NOT excluded.
    if (excluded_entry === null && stripUtm && search) {
        search = search.replace(UTM_PATTERN, '');
    }

    if (search) {
        search = stripTokensFromString(search, list_of_tokens_to_apply, '?');
        parsed.search = search === '?' ? '' : search;
    }

    let hash = parsed.hash;
    if (hash) {
        hash = stripTokensFromString(hash, list_of_tokens_to_apply, '#');
        parsed.hash = hash === '#' ? '' : hash;
    }

    return parsed.toString();
}

chrome.tabs.onUpdated.addListener(async (tab_id, change_info, tab) => {
    if (change_info.status !== 'loading' || !tab.url) return;
    if (!tab.url.startsWith('http')) return;

    const settings = await getSettings();
    if (!settings.on) return;

    const cleaned = stripUrl(tab.url, settings);

    if (cleaned !== tab.url) {
        await chrome.tabs.update(tab_id, { url: cleaned });
        await setIcon('cleaned');
        setTimeout(() => setIcon('on'), 2500);
    }
});

chrome.action.onClicked.addListener(async () => {
    const { on } = await getSettings();
    const next = !on;
    await chrome.storage.sync.set({ on: next });
    await setIcon(next ? 'on' : 'off');
});

chrome.runtime.onStartup.addListener(async () => {
    const { on } = await getSettings();
    await setIcon(on ? 'on' : 'off');
});

chrome.runtime.onInstalled.addListener(async () => {
    const { on } = await getSettings();
    await setIcon(on ? 'on' : 'off');
});
