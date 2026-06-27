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
        customPresets: [],
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

    const BUILTIN_PRESETS = [
        {
            id: 'omegaverse',
            name: '오메가버스',
            icon: 'fa-venus-mars',
            data: {
                title: '오메가버스 채팅 설정',
                world: '이 채팅은 오메가버스 세계관을 사용한다. 알파, 베타, 오메가 같은 2차 성별은 사회적 관습, 본능, 향, 각인, 지위, 관계 규범에 영향을 줄 수 있다. 사용자가 추가로 적은 세부 설정을 우선하며, 세계관 규칙은 채팅 안에서 일관되게 유지한다.',
                sceneRules: '기본 persona를 덮어쓰지 않는다. 오메가버스 요소는 이 채팅방 전용 보조 설정으로만 적용한다. 사용자가 명시한 경계와 금지 사항을 우선한다.',
            },
        },
        {
            id: 'sentinelverse',
            name: '센티넬버스',
            icon: 'fa-shield-halved',
            data: {
                title: '센티넬버스 채팅 설정',
                world: '이 채팅은 센티넬/가이드 세계관을 사용한다. 센티넬은 강화된 감각, 전투 능력, 폭주 위험을 가질 수 있고, 가이드는 안정화, 동조, 결속, 회복과 관련된 역할을 가질 수 있다. 사용자가 추가로 적은 기관, 계급, 능력 규칙을 우선한다.',
                sceneRules: '기본 persona를 덮어쓰지 않는다. 센티넬버스 요소는 이 채팅방 전용 보조 설정으로만 적용한다. 갑작스러운 새 규칙보다 이미 적힌 연속성을 우선한다.',
            },
        },
    ];

    function getContext() {
        if (window.SillyTavern && typeof window.SillyTavern.getContext === 'function') {
            return window.SillyTavern.getContext();
        }
        return {};
    }

    function clone(value) {
        return JSON.parse(JSON.stringify(value));
    }

    function escapeHtml(value) {
        return String(value || '').replace(/[&<>"']/g, function (char) {
            return {
                '&': '&amp;',
                '<': '&lt;',
                '>': '&gt;',
                '"': '&quot;',
                "'": '&#039;',
            }[char];
        });
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
        if (!Array.isArray(settings.customPresets)) settings.customPresets = [];
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

    function collectCurrentData() {
        const data = {};
        for (const field of Object.keys(DEFAULT_CHAT_DATA)) {
            data[field] = $(`#cpl-${field}`).val() || '';
        }
        return data;
    }

    function hasAnyData(data) {
        return Object.values(data || {}).some((value) => String(value || '').trim());
    }

    function applyPresetData(data) {
        const target = getChatData();
        for (const field of Object.keys(DEFAULT_CHAT_DATA)) {
            target[field] = data[field] || '';
        }
        saveSettings();
        loadFields();
        updateInjection();
    }

    function saveCurrentPreset() {
        const name = String($('#cpl-preset-name').val() || '').trim();
        const data = collectCurrentData();
        if (!name) {
            showToast('프리셋 이름을 입력해 주세요.', 'warning');
            $('#cpl-preset-name').focus();
            return;
        }
        if (!hasAnyData(data)) {
            showToast('저장할 설정이 없습니다.', 'warning');
            return;
        }

        const settings = getSettings();
        const existing = settings.customPresets.find((preset) => preset.name === name);
        if (existing && !confirm(`"${name}" 프리셋을 덮어쓸까요?`)) return;

        const preset = {
            id: existing ? existing.id : `preset_${Date.now()}`,
            name,
            data,
            updatedAt: new Date().toISOString(),
        };

        if (existing) {
            Object.assign(existing, preset);
        } else {
            settings.customPresets.push(preset);
        }

        $('#cpl-preset-name').val('');
        saveSettings();
        renderSavedPresets();
        showToast('프리셋을 저장했습니다.', 'success');
    }

    function deleteCustomPreset(id) {
        const settings = getSettings();
        const preset = settings.customPresets.find((item) => item.id === id);
        if (!preset) return;
        if (!confirm(`"${preset.name}" 프리셋을 삭제할까요?`)) return;
        settings.customPresets = settings.customPresets.filter((item) => item.id !== id);
        saveSettings();
        renderSavedPresets();
    }

    function showToast(message, type) {
        if (window.toastr && typeof toastr[type || 'info'] === 'function') {
            toastr[type || 'info'](message);
        }
    }

    function renderSavedPresets() {
        const container = document.getElementById('cpl-saved-presets');
        if (!container) return;

        const presets = getSettings().customPresets;
        if (!presets.length) {
            container.innerHTML = '<div class="cpl-empty">저장된 프리셋이 없습니다.</div>';
            return;
        }

        container.innerHTML = presets.map((preset) => `
            <div class="cpl-saved-preset" data-id="${escapeHtml(preset.id)}">
                <button class="cpl-saved-apply" type="button" data-id="${escapeHtml(preset.id)}">
                    <i class="fa-solid fa-bookmark"></i>
                    <span>${escapeHtml(preset.name)}</span>
                </button>
                <button class="cpl-saved-delete" type="button" title="삭제" data-id="${escapeHtml(preset.id)}">
                    <i class="fa-solid fa-xmark"></i>
                </button>
            </div>
        `).join('');
    }

    function renderPopup() {
        if (document.getElementById('chat-persona-lore-popup')) return;

        const builtInPresetHtml = BUILTIN_PRESETS.map((preset) => `
            <button class="cpl-preset" type="button" data-preset="${preset.id}">
                <i class="fa-solid ${preset.icon}"></i>
                <span>${preset.name}</span>
            </button>
        `).join('');

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
                    <span class="cpl-switch-track"></span>
                    <strong>프롬프트 주입</strong>
                </label>

                <div class="cpl-card">
                    <div class="cpl-card-title">세계관 초안</div>
                    <div class="cpl-card-note">누르면 현재 입력값을 프리셋 내용으로 교체합니다.</div>
                    ${builtInPresetHtml}
                </div>

                <div class="cpl-card">
                    <div class="cpl-card-title">내 프리셋</div>
                    <div class="cpl-save-row">
                        <input id="cpl-preset-name" type="text" placeholder="프리셋 이름">
                        <button id="cpl-save-preset" class="cpl-mini-button" type="button" title="현재 입력값 저장">
                            <i class="fa-solid fa-plus"></i>
                        </button>
                    </div>
                    <div id="cpl-saved-presets" class="cpl-saved-list"></div>
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

        renderSavedPresets();
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
            const preset = BUILTIN_PRESETS.find((item) => item.id === this.dataset.preset);
            if (!preset) return;
            if (hasAnyData(collectCurrentData()) && !confirm(`현재 입력값을 "${preset.name}" 초안으로 교체할까요?`)) return;
            applyPresetData(preset.data);
            showToast('세계관 초안을 적용했습니다.', 'success');
        });

        $(document).on('click', '#cpl-save-preset', saveCurrentPreset);

        $(document).on('click', '.cpl-saved-apply', function () {
            const preset = getSettings().customPresets.find((item) => item.id === this.dataset.id);
            if (!preset) return;
            if (hasAnyData(collectCurrentData()) && !confirm(`현재 입력값을 "${preset.name}" 프리셋으로 교체할까요?`)) return;
            applyPresetData(preset.data);
            showToast('프리셋을 적용했습니다.', 'success');
        });

        $(document).on('click', '.cpl-saved-delete', function () {
            deleteCustomPreset(this.dataset.id);
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
