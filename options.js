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
const btnImport  = document.getElementById('btnImport');
const btnExport  = document.getElementById('btnExport');
const fileInput  = document.getElementById('fileInput');
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

// ── Export tokens as .txt ─────────────────────────────────────────────────────
// Each token is written on its own line.
// Empty lines and lines starting with # are ignored on import.
btnExport.addEventListener('click', () => {
    chrome.storage.sync.get({ tokens: DEFAULT_TOKENS }, ({ tokens }) => {
        const file_content = tokens.join('\n');
        const blob_to_save = new Blob([file_content], { type: 'text/plain' });
        const object_url   = URL.createObjectURL(blob_to_save);

        const link_element = document.createElement('a');
        link_element.href     = object_url;
        link_element.download = 'tokens.txt';
        link_element.click();

        URL.revokeObjectURL(object_url);
        showToast('Exported tokens.txt ✓');
    });
});

// ── Import tokens from .txt ───────────────────────────────────────────────────
// Reads the file, splits by newline, trims whitespace from each line,
// removes empty lines and lines starting with #, then merges with
// existing tokens (duplicates are skipped).
btnImport.addEventListener('click', () => {
    fileInput.value = '';  // reset so the same file can be re-selected
    fileInput.click();
});

fileInput.addEventListener('change', () => {
    const selected_file = fileInput.files[0];
    if (!selected_file) return;

    const file_reader = new FileReader();

    file_reader.onload = (event) => {
        const raw_text          = event.target.result;
        const list_of_new_tokens = raw_text
            .split('\n')
            .map(line => line.trim())
            .filter(line => line.length > 0 && !line.startsWith('#'));

        if (list_of_new_tokens.length === 0) {
            showToast('No valid tokens found in file');
            return;
        }

        chrome.storage.sync.get({ tokens: DEFAULT_TOKENS }, ({ tokens }) => {
            const list_of_existing_tokens = tokens;
            const list_of_merged_tokens   = [...list_of_existing_tokens];
            let count_of_added_tokens     = 0;

            for (const token_value of list_of_new_tokens) {
                if (!list_of_merged_tokens.includes(token_value)) {
                    list_of_merged_tokens.push(token_value);
                    count_of_added_tokens++;
                }
            }

            renderTokens(list_of_merged_tokens);
            save({ tokens: list_of_merged_tokens });
            showToast(`Imported ${count_of_added_tokens} new token(s) ✓`);
        });
    };

    file_reader.readAsText(selected_file);
});
