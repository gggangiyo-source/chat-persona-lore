(function () {
    'use strict';

    const EXTENSION_NAME = 'chat_persona_lore';
    const PROMPT_ID = 'chat_persona_lore_injection';

    const DEFAULT_SETTINGS = {
        enabled: true,
        injectionPosition: 1,
        injectionDepth: 4,
        injectionRole: 0,
        chatData: {},
    };

    const DEFAULT_CHAT_DATA = {
        title: '',
        world: '',
        character: '',
        user: '',
        relationship: '',
        sceneRules: '',
        memory: '',
    };

    function getContext() {
        if (window.SillyTavern && typeof window.SillyTavern.getContext === 'function') {
            return window.SillyTavern.getContext();
        }
        return {};
    }

    function clone(value) {
        return JSON.parse(JSON.stringify(value));
    }

    function getSettings() {
        const ctx = getContext();
        const extensionSettings = ctx.extensionSettings || window.extension_settings || {};
        window.extension_settings = extensionSettings;

        if (!extensionSettings[EXTENSION_NAME]) {
            extensionSettings[EXTENSION_NAME] = clone(DEFAULT_SETTINGS);
        }

        const settings = extensionSettings[EXTENSION_NAME];
        for (const [key, value] of Object.entries(DEFAULT_SETTINGS)) {
            if (settings[key] === undefined) {
                settings[key] = clone(value);
            }
        }

        return settings;
    }

    function saveSettings() {
        const ctx = getContext();
        if (typeof ctx.saveSettingsDebounced === 'function') {
            ctx.saveSettingsDebounced();
            return;
        }
        if (typeof window.saveSettingsDebounced === 'function') {
            window.saveSettingsDebounced();
        }
    }

    function getChatKey() {
        const ctx = getContext();
        if (ctx.chatId) return String(ctx.chatId);
        if (ctx.chat_metadata && ctx.chat_metadata.chat_id) return String(ctx.chat_metadata.chat_id);
        if (ctx.characters && ctx.characterId !== undefined && ctx.characters[ctx.characterId]) {
            const characterName = ctx.characters[ctx.characterId].name || 'unknown-character';
            return `${characterName}:${ctx.chatId || 'default'}`;
        }
        return 'global-fallback';
    }

    function getChatData() {
        const settings = getSettings();
        const chatKey = getChatKey();
        if (!settings.chatData[chatKey]) {
            settings.chatData[chatKey] = clone(DEFAULT_CHAT_DATA);
        }
        const data = settings.chatData[chatKey];
        for (const [key, value] of Object.entries(DEFAULT_CHAT_DATA)) {
            if (data[key] === undefined) data[key] = value;
        }
        return data;
    }

    function setChatField(field, value) {
        const data = getChatData();
        data[field] = value;
        saveSettings();
        updateInjection();
    }

    function section(label, value) {
        const text = String(value || '').trim();
        return text ? `## ${label}\n${text}` : '';
    }

    function buildPrompt() {
        const data = getChatData();
        const parts = [
            section('Chat-Specific World Setting', data.world),
            section('Chat-Specific Character Notes', data.character),
            section('Chat-Specific User Notes', data.user),
            section('Relationship And Dynamic', data.relationship),
            section('Scene Rules And Tone', data.sceneRules),
            section('Continuity Notes', data.memory),
        ].filter(Boolean);

        if (!parts.length) return '';

        const title = data.title.trim() || 'Additional chat-specific persona and world notes';
        return [
            `[${title}]`,
            'Use the following notes only for this chat. Treat them as additions to the existing persona, not replacements, unless they explicitly say otherwise.',
            '',
            ...parts,
        ].join('\n');
    }

    function updateInjection() {
        const ctx = getContext();
        if (typeof ctx.setExtensionPrompt !== 'function') return;

        const settings = getSettings();
        const prompt = settings.enabled ? buildPrompt() : '';
        if (prompt) {
            ctx.setExtensionPrompt(
                PROMPT_ID,
                prompt,
                Number(settings.injectionPosition),
                Number(settings.injectionDepth),
                true,
                Number(settings.injectionRole),
            );
        } else {
            ctx.setExtensionPrompt(PROMPT_ID, '', -1, 0);
        }

        updatePreview();
    }

    function estimateTokens(text) {
        return Math.ceil(String(text || '').length / 3.7);
    }

    function updatePreview() {
        const preview = document.getElementById('cpl-preview');
        const counter = document.getElementById('cpl-token-count');
        if (!preview || !counter) return;

        const prompt = buildPrompt();
        preview.textContent = prompt || 'No chat-specific notes will be injected.';
        counter.textContent = `~${estimateTokens(prompt)} tokens`;
    }

    function setFieldValues() {
        const settings = getSettings();
        const data = getChatData();

        $('#cpl-enabled').prop('checked', !!settings.enabled);
        $('#cpl-position').val(String(settings.injectionPosition));
        $('#cpl-depth').val(String(settings.injectionDepth));
        $('#cpl-role').val(String(settings.injectionRole));

        for (const field of Object.keys(DEFAULT_CHAT_DATA)) {
            $(`#cpl-${field}`).val(data[field] || '');
        }

        updatePreview();
    }

    function copyPreview() {
        const prompt = buildPrompt();
        if (!prompt) return;
        navigator.clipboard.writeText(prompt).then(
            () => window.toastr && toastr.success('Copied prompt preview.'),
            () => window.toastr && toastr.error('Could not copy prompt preview.'),
        );
    }

    function clearCurrentChat() {
        if (!confirm('Clear Chat Persona Lore notes for this chat?')) return;
        const settings = getSettings();
        settings.chatData[getChatKey()] = clone(DEFAULT_CHAT_DATA);
        saveSettings();
        setFieldValues();
        updateInjection();
    }

    function renderSettings() {
        const html = `
<div id="cpl-settings" class="cpl-panel">
    <div class="cpl-header">
        <div>
            <div class="cpl-title">Chat Persona Lore</div>
            <div class="cpl-subtitle">Chat-specific persona and world prompt notes</div>
        </div>
        <label class="checkbox_label cpl-enabled-row">
            <input id="cpl-enabled" type="checkbox">
            Enabled
        </label>
    </div>

    <div class="cpl-grid">
        <label>
            Title
            <input id="cpl-title" class="text_pole" type="text" placeholder="Optional prompt section title">
        </label>
        <label>
            Position
            <select id="cpl-position" class="text_pole">
                <option value="0">Before Main Prompt</option>
                <option value="1">In Chat</option>
                <option value="2">After Main Prompt</option>
            </select>
        </label>
        <label>
            Depth
            <input id="cpl-depth" class="text_pole" type="number" min="0" max="999" step="1">
        </label>
        <label>
            Role
            <select id="cpl-role" class="text_pole">
                <option value="0">System</option>
                <option value="1">User</option>
                <option value="2">Assistant</option>
            </select>
        </label>
    </div>

    <label>World Setting<textarea id="cpl-world" class="text_pole cpl-textarea" placeholder="Worldview, location, period, genre rules, social norms..."></textarea></label>
    <label>Character Notes<textarea id="cpl-character" class="text_pole cpl-textarea" placeholder="Chat-only character settings, alternate role, secrets, current objective..."></textarea></label>
    <label>User Notes<textarea id="cpl-user" class="text_pole cpl-textarea" placeholder="Chat-only user persona additions, role, appearance, status..."></textarea></label>
    <label>Relationship And Dynamic<textarea id="cpl-relationship" class="text_pole cpl-textarea" placeholder="Relationship premise, emotional distance, history, boundaries..."></textarea></label>
    <label>Scene Rules And Tone<textarea id="cpl-sceneRules" class="text_pole cpl-textarea" placeholder="Tone, pacing, forbidden outcomes, style instructions..."></textarea></label>
    <label>Continuity Notes<textarea id="cpl-memory" class="text_pole cpl-textarea" placeholder="Facts that should stay true in this chat only..."></textarea></label>

    <div class="cpl-actions">
        <span id="cpl-token-count" class="cpl-token-count">~0 tokens</span>
        <button id="cpl-copy" class="menu_button" type="button">Copy Preview</button>
        <button id="cpl-clear" class="menu_button danger" type="button">Clear This Chat</button>
    </div>

    <pre id="cpl-preview" class="cpl-preview"></pre>
</div>`;

        $('#extensions_settings').append(html);
    }

    function bindEvents() {
        $('#cpl-enabled').on('change', function () {
            const settings = getSettings();
            settings.enabled = this.checked;
            saveSettings();
            updateInjection();
        });

        $('#cpl-position, #cpl-depth, #cpl-role').on('change input', function () {
            const settings = getSettings();
            settings.injectionPosition = Number($('#cpl-position').val());
            settings.injectionDepth = Number($('#cpl-depth').val());
            settings.injectionRole = Number($('#cpl-role').val());
            saveSettings();
            updateInjection();
        });

        Object.keys(DEFAULT_CHAT_DATA).forEach((field) => {
            $(`#cpl-${field}`).on('input', function () {
                setChatField(field, this.value);
            });
        });

        $('#cpl-copy').on('click', copyPreview);
        $('#cpl-clear').on('click', clearCurrentChat);
    }

    function bindSillyTavernEvents() {
        const ctx = getContext();
        if (!ctx.eventSource || !ctx.event_types) return;

        const reload = () => {
            setFieldValues();
            updateInjection();
        };

        if (ctx.event_types.CHAT_CHANGED) ctx.eventSource.on(ctx.event_types.CHAT_CHANGED, reload);
        if (ctx.event_types.CHARACTER_MESSAGE_RENDERED) ctx.eventSource.on(ctx.event_types.CHARACTER_MESSAGE_RENDERED, updateInjection);
        if (ctx.event_types.GENERATION_STARTED) ctx.eventSource.on(ctx.event_types.GENERATION_STARTED, updateInjection);
    }

    jQuery(function () {
        getSettings();
        renderSettings();
        bindEvents();
        bindSillyTavernEvents();
        setFieldValues();
        updateInjection();
        console.log('[Chat Persona Lore] Loaded');
    });

    window.ChatPersonaLore = {
        getSettings,
        getChatData,
        updateInjection,
    };
})();
