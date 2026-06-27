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
        continuity: '',
    };

    const PRESETS = {
        omegaverse: {
            title: 'Omegaverse chat setting',
            world: 'This chat uses an omegaverse setting. Secondary genders such as alpha, beta, and omega may affect social customs, instincts, scent, bonds, and status. Keep the setting internally consistent with the user-provided details.',
            sceneRules: 'Do not overwrite the base persona. Apply omegaverse elements only as chat-specific context. Respect any explicit boundaries written in this chat.',
        },
        sentinelverse: {
            title: 'Sentinelverse chat setting',
            world: 'This chat uses a sentinel/guide setting. Sentinels may have heightened senses or combat roles, while guides may stabilize, support, or bond with them. Keep abilities and institutions consistent with the user-provided details.',
            sceneRules: 'Do not overwrite the base persona. Apply sentinelverse elements only as chat-specific context. Favor continuity over sudden new rules.',
        },
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
            if (settings[key] === undefined) settings[key] = clone(value);
        }
        if (!settings.chatData || typeof settings.chatData !== 'object') settings.chatData = {};
        return settings;
    }

    function saveSettings() {
        const ctx = getContext();
        if (typeof ctx.saveSettingsDebounced === 'function') {
            ctx.saveSettingsDebounced();
        } else if (typeof window.saveSettingsDebounced === 'function') {
            window.saveSettingsDebounced();
        }
    }

    function getChatKey() {
        const ctx = getContext();
        if (ctx.chatId) return String(ctx.chatId);
        if (ctx.chat_metadata && ctx.chat_metadata.chat_id) return String(ctx.chat_metadata.chat_id);
        if (ctx.characters && ctx.characterId !== undefined && ctx.characters[ctx.characterId]) {
            return `${ctx.characters[ctx.characterId].name || 'character'}:${ctx.chatId || 'default'}`;
        }
        return 'global-fallback';
    }

    function getChatData() {
        const settings = getSettings();
        const key = getChatKey();
        if (!settings.chatData[key]) settings.chatData[key] = clone(DEFAULT_CHAT_DATA);
        const data = settings.chatData[key];
        for (const [field, value] of Object.entries(DEFAULT_CHAT_DATA)) {
            if (data[field] === undefined) data[field] = value;
        }
        return data;
    }

    function section(label, value) {
        const text = String(value || '').trim();
        return text ? `## ${label}\n${text}` : '';
    }

    function buildPrompt() {
        const data = getChatData();
        const parts = [
            section('World Setting', data.world),
            section('Character Additions', data.character),
            section('User Persona Additions', data.user),
            section('Relationship And Dynamic', data.relationship),
            section('Scene Rules And Tone', data.sceneRules),
            section('Continuity Notes', data.continuity),
        ].filter(Boolean);

        if (!parts.length) return '';

        return [
            `[${data.title.trim() || 'Chat-specific persona and world notes'}]`,
            'Use these notes only for the current chat. Treat them as additions to the existing persona, not replacements, unless a note explicitly says otherwise.',
            '',
            ...parts,
        ].join('\n');
    }

    function estimateTokens(text) {
        return Math.ceil(String(text || '').length / 3.7);
    }

    function updatePreview() {
        const preview = document.getElementById('cpl-preview');
        const tokens = document.getElementById('cpl-token-count');
        if (!preview || !tokens) return;
        const prompt = buildPrompt();
        preview.textContent = prompt || '입력된 채팅 전용 설정이 없습니다.';
        tokens.textContent = `~${estimateTokens(prompt)} tokens`;
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

    function setChatField(field, value) {
        getChatData()[field] = value;
        saveSettings();
        updateInjection();
    }

    function showToast(message, type) {
        if (window.toastr && typeof toastr[type || 'info'] === 'function') {
            toastr[type || 'info'](message);
        }
    }

    function renderPopup() {
        if (document.getElementById('chat-persona-lore-popup')) return;

        const html = `
<div id="chat-persona-lore-popup" class="cpl-popup" style="display:none;">
    <div class="cpl-backdrop" data-cpl-close="1"></div>
    <div class="cpl-window" role="dialog" aria-modal="true" aria-labelledby="cpl-heading">
        <div class="cpl-topbar">
            <div class="cpl-brand">
                <div class="cpl-icon"><i class="fa-solid fa-wand-magic-sparkles"></i></div>
                <div>
                    <h3 id="cpl-heading">Chat Persona Lore</h3>
                    <p>채팅방 전용 persona / 세계관 보조 설정</p>
                </div>
            </div>
            <div class="cpl-top-actions">
                <span id="cpl-token-count" class="cpl-token-pill">~0 tokens</span>
                <button id="cpl-close" class="cpl-icon-btn" type="button" title="닫기"><i class="fa-solid fa-xmark"></i></button>
            </div>
        </div>

        <div class="cpl-body">
            <aside class="cpl-sidebar">
                <label class="cpl-switch">
                    <input id="cpl-enabled" type="checkbox">
                    <span></span>
                    <strong>주입 사용</strong>
                </label>

                <div class="cpl-card">
                    <div class="cpl-card-title">프리셋 초안</div>
                    <button class="cpl-preset" type="button" data-preset="omegaverse"><i class="fa-solid fa-venus-mars"></i> 오메가버스</button>
                    <button class="cpl-preset" type="button" data-preset="sentinelverse"><i class="fa-solid fa-shield-halved"></i> 센티넬버스</button>
                </div>

                <div class="cpl-card">
                    <div class="cpl-card-title">주입 위치</div>
                    <label>Position
                        <select id="cpl-position">
                            <option value="0">Before Main</option>
                            <option value="1">In Chat</option>
                            <option value="2">After Main</option>
                        </select>
                    </label>
                    <label>Depth
                        <input id="cpl-depth" type="number" min="0" max="999" step="1">
                    </label>
                    <label>Role
                        <select id="cpl-role">
                            <option value="0">System</option>
                            <option value="1">User</option>
                            <option value="2">Assistant</option>
                        </select>
                    </label>
                </div>
            </aside>

            <main class="cpl-main">
                <label class="cpl-field cpl-title-field">제목
                    <input id="cpl-title" type="text" placeholder="예: 센티넬버스 AU, 현대 오메가버스 설정">
                </label>

                <div class="cpl-field-grid">
                    <label class="cpl-field">세계관
                        <textarea id="cpl-world" placeholder="이 채팅방에서만 적용할 세계관, 시대, 규칙, 조직, 문화..."></textarea>
                    </label>
                    <label class="cpl-field">캐릭터 설정
                        <textarea id="cpl-character" placeholder="캐릭터의 채팅방 전용 직업, 입장, 비밀, 상태, 능력..."></textarea>
                    </label>
                    <label class="cpl-field">유저 설정
                        <textarea id="cpl-user" placeholder="유저 persona에 추가할 역할, 외형, 신분, 능력, 현재 상태..."></textarea>
                    </label>
                    <label class="cpl-field">관계 / 다이내믹
                        <textarea id="cpl-relationship" placeholder="둘의 관계, 과거사, 감정선, 거리감, 금기나 약속..."></textarea>
                    </label>
                    <label class="cpl-field">장면 규칙 / 톤
                        <textarea id="cpl-sceneRules" placeholder="문체, 분위기, 진행 속도, 반드시 지킬 규칙, 피할 전개..."></textarea>
                    </label>
                    <label class="cpl-field">연속성 메모
                        <textarea id="cpl-continuity" placeholder="이 채팅에서 계속 유지되어야 하는 사실, 사건, 약속..."></textarea>
                    </label>
                </div>

                <div class="cpl-footer">
                    <button id="cpl-copy" class="cpl-button" type="button"><i class="fa-solid fa-copy"></i> 미리보기 복사</button>
                    <button id="cpl-clear" class="cpl-button cpl-danger" type="button"><i class="fa-solid fa-trash"></i> 현재 채팅 비우기</button>
                </div>

                <pre id="cpl-preview" class="cpl-preview"></pre>
            </main>
        </div>
    </div>
</div>`;

        document.body.insertAdjacentHTML('beforeend', html);
    }

    function loadFields() {
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

    function openPopup() {
        renderPopup();
        bindPopupEvents();
        loadFields();
        $('#chat-persona-lore-popup').fadeIn(120);
    }

    function closePopup() {
        $('#chat-persona-lore-popup').fadeOut(100);
    }

    let popupEventsBound = false;
    function bindPopupEvents() {
        if (popupEventsBound) return;
        popupEventsBound = true;

        $(document).on('click', '#cpl-close, [data-cpl-close]', closePopup);

        $(document).on('change', '#cpl-enabled', function () {
            getSettings().enabled = this.checked;
            saveSettings();
            updateInjection();
        });

        $(document).on('input', '#cpl-title, #cpl-world, #cpl-character, #cpl-user, #cpl-relationship, #cpl-sceneRules, #cpl-continuity', function () {
            setChatField(this.id.replace('cpl-', ''), this.value);
        });

        $(document).on('change input', '#cpl-position, #cpl-depth, #cpl-role', function () {
            const settings = getSettings();
            settings.injectionPosition = Number($('#cpl-position').val());
            settings.injectionDepth = Number($('#cpl-depth').val());
            settings.injectionRole = Number($('#cpl-role').val());
            saveSettings();
            updateInjection();
        });

        $(document).on('click', '.cpl-preset', function () {
            const preset = PRESETS[this.dataset.preset];
            if (!preset) return;
            Object.entries(preset).forEach(([field, value]) => {
                if (!getChatData()[field]) setChatField(field, value);
            });
            loadFields();
            showToast('프리셋 초안을 채웠습니다. 원하는 부분을 이어서 수정하세요.', 'success');
        });

        $(document).on('click', '#cpl-copy', function () {
            const prompt = buildPrompt();
            if (!prompt) return;
            navigator.clipboard.writeText(prompt).then(
                () => showToast('미리보기를 복사했습니다.', 'success'),
                () => showToast('복사에 실패했습니다.', 'error'),
            );
        });

        $(document).on('click', '#cpl-clear', function () {
            if (!confirm('현재 채팅의 Chat Persona Lore 설정을 비울까요?')) return;
            getSettings().chatData[getChatKey()] = clone(DEFAULT_CHAT_DATA);
            saveSettings();
            loadFields();
            updateInjection();
        });
    }

    function addMenuButton() {
        let retries = 0;
        function tryAdd() {
            if (document.getElementById('chat-persona-lore-menu-item')) return;
            const menu = document.getElementById('extensionsMenu');
            if (!menu) {
                if (retries++ < 30) setTimeout(tryAdd, 500);
                return;
            }

            const item = document.createElement('div');
            item.id = 'chat-persona-lore-menu-item';
            item.className = 'list-group-item flex-container flexGap5 interactable';
            item.tabIndex = 0;
            item.role = 'listitem';
            item.innerHTML = '<div class="fa-solid fa-wand-magic-sparkles extensionsMenuExtensionButton"></div> Chat Persona Lore';
            item.addEventListener('click', function () {
                openPopup();
                jQuery('#extensionsMenu').hide();
            });
            menu.appendChild(item);
        }
        tryAdd();
    }

    function bindSillyTavernEvents() {
        const ctx = getContext();
        if (!ctx.eventSource || !ctx.event_types) return;

        if (ctx.event_types.CHAT_CHANGED) {
            ctx.eventSource.on(ctx.event_types.CHAT_CHANGED, function () {
                loadFields();
                updateInjection();
            });
        }
        if (ctx.event_types.GENERATION_STARTED) {
            ctx.eventSource.on(ctx.event_types.GENERATION_STARTED, updateInjection);
        }
        if (ctx.event_types.CHARACTER_MESSAGE_RENDERED) {
            ctx.eventSource.on(ctx.event_types.CHARACTER_MESSAGE_RENDERED, updateInjection);
        }
    }

    jQuery(function () {
        getSettings();
        renderPopup();
        bindPopupEvents();
        addMenuButton();
        bindSillyTavernEvents();
        updateInjection();
        console.log('[Chat Persona Lore] Loaded');
    });

    window.ChatPersonaLore = {
        openPopup,
        closePopup,
        getSettings,
        getChatData,
        buildPrompt,
        updateInjection,
    };
})();
