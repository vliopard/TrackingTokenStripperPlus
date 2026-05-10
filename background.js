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
            // 'on' has no default here intentionally.
            // If storage has not resolved yet, 'on' will be undefined.
            // Callers must treat undefined as "do not change icon state".
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

    // If 'on' is undefined, storage has not resolved — do nothing.
    if (settings.on !== true) return;

    const cleaned = stripUrl(tab.url, settings);

    if (cleaned !== tab.url) {
        await chrome.tabs.update(tab_id, { url: cleaned });
        await setIcon('cleaned');
        // Use chrome.alarms instead of setTimeout so the callback
        // survives service worker suspension (Bug 1 fix).
        await chrome.alarms.create('restore-icon', { delayInMinutes: 1 / 24 }); // ~2.5 seconds
    }
});

// Fires when the restore-icon alarm expires, returning icon to blue.
chrome.alarms.onAlarm.addListener(async (alarm) => {
    if (alarm.name !== 'restore-icon') return;
    const settings = await getSettings();
    // Only restore to blue if extension is still on.
    if (settings.on === true) {
        await setIcon('on');
    }
});

chrome.action.onClicked.addListener(async () => {
    const { on } = await getSettings();
    const next = !on;
    await chrome.storage.sync.set({ on: next });
    await setIcon(next ? 'on' : 'off');
});

// Shared handler for both onStartup and onInstalled.
// Only sets the icon when 'on' is definitively true or false.
// If 'on' is undefined (storage not yet available), the icon is
// not changed — avoiding the red-icon bug caused by the default
// value resolving before sync storage is ready (Bug 2 fix).
async function syncIconWithStorage() {
    const { on } = await getSettings();
    if (on === true)  await setIcon('on');
    if (on === false) await setIcon('off');
    // on === undefined: storage not ready yet, do not touch the icon.
}

chrome.runtime.onStartup.addListener(syncIconWithStorage);
chrome.runtime.onInstalled.addListener(syncIconWithStorage);
