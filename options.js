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

// ── DOM refs ──────────────────────────────────────────────────────────────────
const toggle_on       = document.getElementById('toggle-on');
const toggle_utm      = document.getElementById('toggle-utm');
const token_list      = document.getElementById('token-list');
const new_token_input = document.getElementById('new-token-input');
const btn_add_token   = document.getElementById('btn-add-token');
const btn_reset       = document.getElementById('btn-reset');
const btn_import      = document.getElementById('btn-import');
const btn_export      = document.getElementById('btn-export');
const file_input      = document.getElementById('file-input');
const status_pill     = document.getElementById('status-pill');
const status_text     = document.getElementById('status-text');
const toast_el        = document.getElementById('toast');
const domain_list     = document.getElementById('domain-list');
const new_domain_input = document.getElementById('new-domain-input');
const btn_add_domain  = document.getElementById('btn-add-domain');
const summary_global  = document.getElementById('summary-global');
const summary_domains = document.getElementById('summary-domains');
const summary_dtokens = document.getElementById('summary-dtokens');

// ── State (mirrors storage) ───────────────────────────────────────────────────
// list_of_global_tokens: string[]
// list_of_excluded_domains: { domain: string, tokens: string[] }[]
let list_of_global_tokens    = [];
let list_of_excluded_domains = [];

// ── Toast ─────────────────────────────────────────────────────────────────────
function showToast(message) {
    toast_el.textContent = message;
    toast_el.classList.add('show');
    setTimeout(() => toast_el.classList.remove('show'), 2200);
}

// ── Status pill ───────────────────────────────────────────────────────────────
function updateStatusPill(is_on) {
    status_pill.classList.toggle('active', is_on);
    status_text.textContent = is_on ? 'ACTIVE' : 'INACTIVE';
}

// ── Summary counts ────────────────────────────────────────────────────────────
function updateSummary() {
    const count_of_domain_tokens = list_of_excluded_domains.reduce(
        (total, entry) => total + entry.tokens.length,
        0
    );
    summary_global.textContent  = list_of_global_tokens.length;
    summary_domains.textContent = list_of_excluded_domains.length;
    summary_dtokens.textContent = count_of_domain_tokens;
}

// ── Save helpers ──────────────────────────────────────────────────────────────
function saveGlobalTokens(callback) {
    chrome.storage.sync.set({ tokens: list_of_global_tokens }, () => {
        updateSummary();
        if (callback) callback();
        else showToast('Saved ✓');
    });
}

function saveExcludedDomains(callback) {
    chrome.storage.sync.set({ excludedDomains: list_of_excluded_domains }, () => {
        updateSummary();
        if (callback) callback();
        else showToast('Saved ✓');
    });
}

// ── Tab navigation ────────────────────────────────────────────────────────────
function initTabs() {
    const list_of_tabs   = document.querySelectorAll('.tab');
    const list_of_panels = document.querySelectorAll('.panel');

    list_of_tabs.forEach((tab) => {
        tab.addEventListener('click', () => {
            list_of_tabs.forEach(t => t.classList.remove('active'));
            list_of_panels.forEach(p => p.classList.remove('active'));
            tab.classList.add('active');
            document.getElementById('panel-' + tab.dataset.tab).classList.add('active');
        });
    });
}

// ── Global token list rendering ───────────────────────────────────────────────
function renderGlobalTokens() {
    token_list.innerHTML = '';
    list_of_global_tokens.forEach((token_value, index) => {
        const chip = document.createElement('span');
        chip.className = 'token-chip';

        const name_span = document.createElement('span');
        name_span.className = 'chip-name';
        name_span.textContent = token_value;

        const remove_btn = document.createElement('button');
        remove_btn.className = 'chip-remove';
        remove_btn.textContent = '×';
        remove_btn.setAttribute('aria-label', 'Remove token ' + token_value);
        remove_btn.addEventListener('click', () => {
            list_of_global_tokens.splice(index, 1);
            renderGlobalTokens();
            saveGlobalTokens();
        });

        chip.appendChild(name_span);
        chip.appendChild(remove_btn);
        token_list.appendChild(chip);
    });
}

// ── Excluded domain list rendering ───────────────────────────────────────────
function renderDomainList() {
    domain_list.innerHTML = '';

    if (list_of_excluded_domains.length === 0) {
        const empty_msg = document.createElement('p');
        empty_msg.className = 'empty-msg';
        empty_msg.textContent = 'No excluded domains added yet.';
        domain_list.appendChild(empty_msg);
        return;
    }

    list_of_excluded_domains.forEach((entry, domain_index) => {
        const card = document.createElement('div');
        card.className = 'domain-card';

        // ── Card header ───────────────────────────────────────────────────────
        const header = document.createElement('div');
        header.className = 'domain-header';

        const domain_name_span = document.createElement('span');
        domain_name_span.className = 'domain-name';
        domain_name_span.textContent = entry.domain;

        const count_badge = document.createElement('span');
        count_badge.className = entry.tokens.length > 0 ? 'badge' : 'badge none';
        count_badge.textContent = entry.tokens.length > 0
            ? entry.tokens.length + ' own token' + (entry.tokens.length > 1 ? 's' : '')
            : 'no own tokens';

        const chevron_icon = document.createElement('i');
        chevron_icon.className = 'ti ti-chevron-down chevron';
        chevron_icon.setAttribute('aria-hidden', 'true');

        header.appendChild(domain_name_span);
        header.appendChild(count_badge);
        header.appendChild(chevron_icon);

        // ── Card body (collapsed by default) ─────────────────────────────────
        const body = document.createElement('div');
        body.className = 'domain-body';
        body.style.display = 'none';

        const body_label = document.createElement('p');
        body_label.className = 'domain-body-label';
        body_label.textContent = 'Tokens stripped only on ' + entry.domain + ' and its subdomains:';

        // Add token row inside domain card
        const add_row = document.createElement('div');
        add_row.className = 'domain-add-row';

        const domain_token_input = document.createElement('input');
        domain_token_input.type = 'text';
        domain_token_input.className = 'text-input';
        domain_token_input.placeholder = 'e.g. custom_tracker';

        const add_token_btn = document.createElement('button');
        add_token_btn.className = 'btn-primary small';
        add_token_btn.textContent = '+ Add';
        add_token_btn.addEventListener('click', () => {
            const value = domain_token_input.value.trim();
            if (!value) return;
            if (entry.tokens.includes(value)) {
                showToast('Token already exists for this domain');
                return;
            }
            entry.tokens.push(value);
            domain_token_input.value = '';
            saveExcludedDomains();
            renderDomainList();
        });

        domain_token_input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') add_token_btn.click();
        });

        add_row.appendChild(domain_token_input);
        add_row.appendChild(add_token_btn);

        // Domain token chips
        const chip_container = document.createElement('div');
        chip_container.className = 'chip-container';

        if (entry.tokens.length === 0) {
            const no_tokens_msg = document.createElement('p');
            no_tokens_msg.className = 'empty-msg small';
            no_tokens_msg.textContent = 'No domain-specific tokens added yet.';
            chip_container.appendChild(no_tokens_msg);
        } else {
            entry.tokens.forEach((token_value, token_index) => {
                const chip = document.createElement('span');
                chip.className = 'token-chip';

                const name_span = document.createElement('span');
                name_span.className = 'chip-name';
                name_span.textContent = token_value;

                const remove_btn = document.createElement('button');
                remove_btn.className = 'chip-remove';
                remove_btn.textContent = '×';
                remove_btn.setAttribute('aria-label', 'Remove token ' + token_value);
                remove_btn.addEventListener('click', () => {
                    entry.tokens.splice(token_index, 1);
                    saveExcludedDomains();
                    renderDomainList();
                });

                chip.appendChild(name_span);
                chip.appendChild(remove_btn);
                chip_container.appendChild(chip);
            });
        }

        // Scope note
        const scope_note = document.createElement('div');
        scope_note.className = 'scope-note';
        scope_note.innerHTML = 'Global tokens are <strong>not</strong> applied to this domain or its subdomains. Only the tokens listed above will be stripped here.';

        // Remove domain button
        const remove_domain_btn = document.createElement('button');
        remove_domain_btn.className = 'btn-danger-link';
        remove_domain_btn.textContent = 'Remove this domain';
        remove_domain_btn.addEventListener('click', () => {
            list_of_excluded_domains.splice(domain_index, 1);
            saveExcludedDomains();
            renderDomainList();
        });

        body.appendChild(body_label);
        body.appendChild(add_row);
        body.appendChild(chip_container);
        body.appendChild(scope_note);
        body.appendChild(remove_domain_btn);

        // Toggle expand/collapse
        header.addEventListener('click', () => {
            const is_open = body.style.display !== 'none';
            body.style.display = is_open ? 'none' : 'block';
            chevron_icon.classList.toggle('open', !is_open);
        });

        card.appendChild(header);
        card.appendChild(body);
        domain_list.appendChild(card);
    });
}

// ── Add global token ──────────────────────────────────────────────────────────
btn_add_token.addEventListener('click', () => {
    const value = new_token_input.value.trim();
    if (!value) return;
    if (list_of_global_tokens.includes(value)) {
        showToast('Token already exists');
        return;
    }
    list_of_global_tokens.push(value);
    new_token_input.value = '';
    renderGlobalTokens();
    saveGlobalTokens();
});

new_token_input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') btn_add_token.click();
});

// ── Add excluded domain ───────────────────────────────────────────────────────
btn_add_domain.addEventListener('click', () => {
    // Strip protocol if the user accidentally typed it (e.g. https://example.com)
    let raw_value = new_domain_input.value.trim();
    try {
        const parsed = new URL(raw_value.includes('://') ? raw_value : 'https://' + raw_value);
        raw_value = parsed.hostname;
    } catch {
        // not a valid URL structure; use trimmed value as-is
    }

    if (!raw_value) return;

    const already_exists = list_of_excluded_domains.some(entry => entry.domain === raw_value);
    if (already_exists) {
        showToast('Domain already in exclusion list');
        return;
    }

    list_of_excluded_domains.push({ domain: raw_value, tokens: [] });
    new_domain_input.value = '';
    saveExcludedDomains();
    renderDomainList();
});

new_domain_input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') btn_add_domain.click();
});

// ── Toggles ───────────────────────────────────────────────────────────────────
toggle_on.addEventListener('change', () => {
    const is_on = toggle_on.checked;
    updateStatusPill(is_on);
    chrome.storage.sync.set({ on: is_on }, () => {
        // Tell the background service worker to update the toolbar icon
        // immediately. Without this, the icon only updates on next startup.
        chrome.runtime.sendMessage({ type: 'sync-icon' });
        showToast('Saved ✓');
    });
});

toggle_utm.addEventListener('change', () => {
    chrome.storage.sync.set({ stripUtm: toggle_utm.checked }, () => showToast('Saved ✓'));
});

// ── Global Export ─────────────────────────────────────────────────────────────
btn_export.addEventListener('click', () => {
    const config_object = {
        tokens: list_of_global_tokens,
        excludedDomains: list_of_excluded_domains,
    };
    const json_string  = JSON.stringify(config_object, null, 2);
    const blob_to_save = new Blob([json_string], { type: 'application/json' });
    const object_url   = URL.createObjectURL(blob_to_save);

    const link_element    = document.createElement('a');
    link_element.href     = object_url;
    link_element.download = 'ttsp-config.json';
    link_element.click();

    URL.revokeObjectURL(object_url);
    showToast('Exported ttsp-config.json ✓');
});

// ── Global Import ─────────────────────────────────────────────────────────────
btn_import.addEventListener('click', () => {
    file_input.value = '';
    file_input.click();
});

file_input.addEventListener('change', () => {
    const selected_file = file_input.files[0];
    if (!selected_file) return;

    const file_reader = new FileReader();
    file_reader.onload = (event) => {
        let parsed_config;
        try {
            parsed_config = JSON.parse(event.target.result);
        } catch {
            showToast('Error: file is not valid JSON');
            return;
        }

        const has_valid_tokens  = Array.isArray(parsed_config.tokens);
        const has_valid_domains = Array.isArray(parsed_config.excludedDomains);

        if (!has_valid_tokens || !has_valid_domains) {
            showToast('Error: file format is invalid');
            return;
        }

        list_of_global_tokens    = parsed_config.tokens;
        list_of_excluded_domains = parsed_config.excludedDomains;

        chrome.storage.sync.set(
            { tokens: list_of_global_tokens, excludedDomains: list_of_excluded_domains },
            () => {
                renderGlobalTokens();
                renderDomainList();
                updateSummary();
                showToast('Configuration imported ✓');
            }
        );
    };
    file_reader.readAsText(selected_file);
});

// ── Global Reset ──────────────────────────────────────────────────────────────
btn_reset.addEventListener('click', () => {
    if (!confirm('Reset to defaults?\n\nThis will restore the 12 default global tokens and remove all excluded domains. Your on/off and UTM settings will not change.')) return;

    list_of_global_tokens    = [...DEFAULT_TOKENS];
    list_of_excluded_domains = [];

    chrome.storage.sync.set(
        { tokens: list_of_global_tokens, excludedDomains: list_of_excluded_domains },
        () => {
            renderGlobalTokens();
            renderDomainList();
            updateSummary();
            showToast('Reset to defaults ✓');
        }
    );
});

// ── Initial load ──────────────────────────────────────────────────────────────
chrome.storage.sync.get({
    on: false,
    stripUtm: false,
    tokens: DEFAULT_TOKENS,
    excludedDomains: [],
}, ({ on, stripUtm, tokens, excludedDomains }) => {
    toggle_on.checked  = on;
    toggle_utm.checked = stripUtm;
    updateStatusPill(on);

    list_of_global_tokens    = tokens;
    list_of_excluded_domains = excludedDomains;

    renderGlobalTokens();
    renderDomainList();
    updateSummary();
});

// ── Tab init ──────────────────────────────────────────────────────────────────
initTabs();

// ── Live sync from background ─────────────────────────────────────────────────
// Fires whenever chrome.storage.sync changes — including when the toolbar
// button toggles 'on' from background.js while this options page is open.
// Updates the status pill and the toggle checkbox without requiring F5.
chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== 'sync') return;

    if (changes.on !== undefined) {
        const new_value = changes.on.newValue;
        toggle_on.checked = new_value;
        updateStatusPill(new_value);
    }

    if (changes.stripUtm !== undefined) {
        toggle_utm.checked = changes.stripUtm.newValue;
    }

    if (changes.tokens !== undefined) {
        list_of_global_tokens = changes.tokens.newValue;
        renderGlobalTokens();
        updateSummary();
    }

    if (changes.excludedDomains !== undefined) {
        list_of_excluded_domains = changes.excludedDomains.newValue;
        renderDomainList();
        updateSummary();
    }
});
