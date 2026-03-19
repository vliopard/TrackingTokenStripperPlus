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
    'polycard_client',  // MercadoLibre recommendation tracker
];

const UTM_PATTERN = /([\?&]utm_(src|source|medium|term|campaign|content|cid|reader)=[^&#]*)/ig;

// Strips matching tokens from a raw query/fragment string like
// "?foo=1&bar=2" or "#polycard_client=xyz&other=1"
function stripTokensFromString(raw, tokens, separator) {
    let result = raw;
    for (const token of tokens) {
        const escaped = token.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        // Match token at start (after separator) or after & separator
        const reg = new RegExp(
            `(^[${separator}]${escaped}[^&#]*|[&]${escaped}[^&#]*)`,
            'ig'
        );
        result = result.replace(reg, '');
    }
    // Restore leading separator if it was swallowed
    if (raw.length > 0 && result.length > 0) {
        const leadChar = raw[0];
        if (result[0] !== leadChar && (leadChar === '?' || leadChar === '#')) {
            result = leadChar + result.replace(/^[&]/, '');
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

function stripUrl(rawUrl, { stripUtm, tokens }) {
    let parsed;
    try {
        parsed = new URL(rawUrl);
    } catch {
        return rawUrl; // Not a valid URL — leave as-is
    }

    // ── Query string (?foo=1&bar=2) ───────────────────────────────────────────
    let search = parsed.search; // e.g. "?foo=1&bar=2"

    if (stripUtm && search) {
        search = search.replace(UTM_PATTERN, '');
    }

    if (search) {
        search = stripTokensFromString(search, tokens, '?');
        // Normalize: if all params were removed, clear the '?'
        parsed.search = search === '?' ? '' : search;
    }

    // ── Hash fragment (#key=val&other=val) ────────────────────────────────────
    let hash = parsed.hash; // e.g. "#polycard_client=recommendations"

    if (hash) {
        hash = stripTokensFromString(hash, tokens, '#');
        parsed.hash = hash === '#' ? '' : hash;
    }

    return parsed.toString();
}

// Listen for tab updates and clean URLs
chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
    if (changeInfo.status !== 'loading' || !tab.url) return;
    if (!tab.url.startsWith('http')) return;

    const settings = await getSettings();
    if (!settings.on) return;

    const cleaned = stripUrl(tab.url, settings);

    if (cleaned !== tab.url) {
        await chrome.tabs.update(tabId, { url: cleaned });
        await setIcon('cleaned');
        setTimeout(() => setIcon('on'), 2500);
    }
});

// Toggle on/off via action button click
chrome.action.onClicked.addListener(async () => {
    const { on } = await getSettings();
    const next = !on;
    await chrome.storage.sync.set({ on: next });
    await setIcon(next ? 'on' : 'off');
});

// Sync icon state on startup
chrome.runtime.onStartup.addListener(async () => {
    const { on } = await getSettings();
    await setIcon(on ? 'on' : 'off');
});

chrome.runtime.onInstalled.addListener(async () => {
    const { on } = await getSettings();
    await setIcon(on ? 'on' : 'off');
});
