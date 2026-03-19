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

// ── DOM refs ──────────────────────────────────────────────────────────────────
const toggleOn   = document.getElementById('toggleOn');
const toggleUtm  = document.getElementById('toggleUtm');
const tokenList  = document.getElementById('tokenList');
const newToken   = document.getElementById('newToken');
const btnAdd     = document.getElementById('btnAdd');
const btnReset   = document.getElementById('btnReset');
const statusPill = document.getElementById('statusPill');
const statusText = document.getElementById('statusText');
const toast      = document.getElementById('toast');

// ── Helpers ───────────────────────────────────────────────────────────────────
function showToast(msg) {
    toast.textContent = msg;
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 2000);
}

function save(patch) {
    chrome.storage.sync.set(patch, () => showToast('Saved ✓'));
}

function updateStatusPill(on) {
    statusPill.classList.toggle('active', on);
    statusText.textContent = on ? 'ACTIVE' : 'INACTIVE';
}

// ── Render token list ─────────────────────────────────────────────────────────
function renderTokens(tokens) {
    tokenList.innerHTML = '';
    tokens.forEach((token, idx) => {
        const item = document.createElement('div');
        item.className = 'token-item';

        const name = document.createElement('span');
        name.className = 'token-name';
        name.textContent = token;

        const btn = document.createElement('button');
        btn.className = 'btn-remove';
        btn.textContent = '×';
        btn.title = 'Remove token';
        btn.addEventListener('click', () => {
            const updated = [...tokens];
            updated.splice(idx, 1);
            renderTokens(updated);
            save({ tokens: updated });
        });

        item.appendChild(name);
        item.appendChild(btn);
        tokenList.appendChild(item);
    });
}

// ── Load settings ─────────────────────────────────────────────────────────────
chrome.storage.sync.get({
    on: false,
    stripUtm: false,
    tokens: DEFAULT_TOKENS,
}, ({ on, stripUtm, tokens }) => {
    toggleOn.checked  = on;
    toggleUtm.checked = stripUtm;
    updateStatusPill(on);
    renderTokens(tokens);
});

// ── Event listeners ───────────────────────────────────────────────────────────
toggleOn.addEventListener('change', () => {
    const on = toggleOn.checked;
    updateStatusPill(on);
    save({ on });
});

toggleUtm.addEventListener('change', () => {
    save({ stripUtm: toggleUtm.checked });
});

btnAdd.addEventListener('click', () => {
    const val = newToken.value.trim();
    if (!val) return;

    chrome.storage.sync.get({ tokens: DEFAULT_TOKENS }, ({ tokens }) => {
        if (tokens.includes(val)) {
            showToast('Token already exists');
            return;
        }
        const updated = [...tokens, val];
        renderTokens(updated);
        save({ tokens: updated });
        newToken.value = '';
    });
});

newToken.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') btnAdd.click();
});

btnReset.addEventListener('click', () => {
    if (!confirm('Reset all tokens to default list?')) return;
    renderTokens(DEFAULT_TOKENS);
    save({ tokens: DEFAULT_TOKENS });
});
