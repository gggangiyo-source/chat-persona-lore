(function () {
    'use strict';

    const EXTENSION_NAME = 'chat_persona_lore';
    const PROMPT_ID = 'chat_persona_lore_injection';

    const DEFAULT_SETTINGS = {
        enabled: true,
        injectionPosition: 0,
        injectionDepth: 0,
        injectionRole: 0,
        chatData: {},
        customPresets: [],
        customWorlds: [],
    };

    const DEFAULT_CHAT_DATA = {
        title: '',
        world: '',
        character: '',
        user: '',
        relationship: '',
        sceneRules: '',
        continuity: '',
        lorebookName: '',
        detailEntries: [],
    };

    const BASIC_FIELDS = ['title', 'world', 'character', 'user', 'relationship', 'sceneRules', 'continuity'];

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
        {
            id: 'sexpistols',
            name: '섹스피스톨즈(수인)',
            icon: 'fa-paw',
            data: {
                title: '섹스피스톨즈식 수인 세계관 설정',
                world: '이 채팅은 인간과 동물적 형질을 지닌 수인/혼혈 계통이 공존하는 세계관을 사용한다. 종족 계통, 본능, 페로몬 또는 향, 서열, 짝/각인, 혈통과 번식에 대한 사회적 규범이 관계와 갈등에 영향을 줄 수 있다. 구체적인 종족, 능력, 신체 특징, 사회 제도는 사용자가 적은 설정을 우선한다.',
                character: '캐릭터에게 수인 계통, 동물적 특징, 본능적 반응, 혈통상 위치, 사회적 역할이 추가될 수 있다. 단, 기본 성격과 말투는 유지하고 이 채팅방 설정을 그 위에 반드시 함께 적용한다.',
                sceneRules: '수인 세계관 요소는 장면의 분위기와 관계성에 꾸준히 반영한다. 사용자가 적은 종족/본능/관계 규칙은 기존 persona보다 우선하는 채팅방 전용 필수 설정으로 취급한다.',
            },
        },
        {
            id: 'domsubverse',
            name: '돔섭버스',
            icon: 'fa-hand-sparkles',
            data: {
                title: '돔섭버스 채팅 설정',
                world: '이 채팅은 돔/섭 성향과 동조, 명령, 안정화, 규율, 상호 합의가 사회적 관계와 개인 정체성에 영향을 주는 돔섭버스 세계관을 사용한다. 돔, 섭, 스위치, 미분화 등 세부 분류와 제도는 사용자가 적은 설정을 우선한다.',
                relationship: '관계성에서는 권력 차이보다 상호 인식, 신뢰, 경계, 합의, 보호와 긴장감을 중요하게 다룬다. 사용자가 적은 관계 규칙과 금지 사항은 반드시 유지한다.',
                sceneRules: '돔섭버스 요소는 기본 persona를 삭제하지 않고 그 위에 덧씌워지는 필수 채팅방 설정이다. 명시된 경계, 안전 장치, 호칭, 규칙, 금지 사항은 항상 우선 적용한다.',
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
        if (!Array.isArray(settings.customWorlds)) settings.customWorlds = [];
        migratePriorityDefaults(settings);
        return settings;
    }

    function migratePriorityDefaults(settings) {
        if (settings.priorityDefaultsVersion === 2) return;

        const isOldDefault =
            Number(settings.injectionPosition) === 1 &&
            Number(settings.injectionDepth) === 4 &&
            Number(settings.injectionRole) === 0;

        if (isOldDefault) {
            settings.injectionPosition = 0;
            settings.injectionDepth = 0;
            settings.injectionRole = 0;
            saveSettings();
        }

        settings.priorityDefaultsVersion = 2;
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
            if (data[field] === undefined) data[field] = clone(value);
        }
        if (!Array.isArray(data.detailEntries)) data.detailEntries = [];
        return data;
    }

    function section(label, value) {
        const text = String(value || '').trim();
        return text ? `## ${label}\n${text}` : '';
    }

    function buildDetailSections(data) {
        const entries = Array.isArray(data.detailEntries) ? data.detailEntries : [];
        const active = entries.filter((entry) => entry && entry.enabled && String(entry.note || '').trim());
        if (!active.length) return '';

        const lines = [
            '## Detailed Lorebook Overrides',
            'These are narrow per-lorebook-entry additions. They add detail on top of the main Chat Persona Lore settings and never erase the quick-edit page settings.',
            '',
        ];

        active.forEach((entry, index) => {
            lines.push(
                `### ${index + 1}. ${entry.title || entry.keys || 'Lorebook Entry'}`,
                `Source keys: ${entry.keys || 'N/A'}`,
                String(entry.note || '').trim(),
                '',
            );
        });

        while (lines[lines.length - 1] === '') lines.pop();
        return lines.join('\n');
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
        const detailSection = buildDetailSections(data);
        if (detailSection) parts.push(detailSection);

        if (!parts.length) return '';

        return [
            `[${data.title.trim() || 'Chat-specific persona and world notes'}]`,
            'PRIORITY OVERRIDE: The following notes are mandatory chat-specific canon for this chat. They must be applied together with the existing character card and persona, but they override any conflicting or overlapping detail from the base persona, character sheet, scenario, or character card.',
            'CONFLICT RULE: If the base persona/character sheet says one thing and these notes say another, these notes win. Example: if the base says a character is a smoker but these notes say non-smoker, treat the character as a non-smoker in this chat. Do not blend, soften, ignore, revert, or explain away the override.',
            'SCOPE RULE: Preserve the base personality, voice, and background only where these notes are silent. Apply the World Setting, Character Additions, User Persona Additions, Relationship, Scene Rules, and Continuity Notes exactly as active constraints for this chat.',
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
        for (const field of BASIC_FIELDS) {
            data[field] = $(`#cpl-${field}`).val() || '';
        }
        return data;
    }

    function hasAnyData(data) {
        return Object.values(data || {}).some((value) => String(value || '').trim());
    }

    function applyPresetData(data) {
        const target = getChatData();
        for (const field of BASIC_FIELDS) {
            target[field] = data[field] || '';
        }
        saveSettings();
        loadFields();
        updateInjection();
    }

    function collectWorldDraftData() {
        return {
            title: $('#cpl-title').val() || '',
            world: $('#cpl-world').val() || '',
            character: $('#cpl-character').val() || '',
            user: $('#cpl-user').val() || '',
            relationship: $('#cpl-relationship').val() || '',
            sceneRules: $('#cpl-sceneRules').val() || '',
            continuity: $('#cpl-continuity').val() || '',
        };
    }

    function saveCurrentWorldDraft() {
        const name = String($('#cpl-world-name').val() || '').trim();
        const data = collectWorldDraftData();
        if (!name) {
            showToast('World name is required.', 'warning');
            $('#cpl-world-name').focus();
            return;
        }
        if (!String(data.world || '').trim()) {
            showToast('World Setting is required to save a world draft.', 'warning');
            $('#cpl-world').focus();
            return;
        }

        const settings = getSettings();
        const existing = settings.customWorlds.find((world) => world.name === name);
        if (existing && !confirm(`Overwrite "${name}" world draft?`)) return;

        const draft = {
            id: existing ? existing.id : `world_${Date.now()}`,
            name,
            data,
            updatedAt: new Date().toISOString(),
        };

        if (existing) {
            Object.assign(existing, draft);
        } else {
            settings.customWorlds.push(draft);
        }

        $('#cpl-world-name').val('');
        saveSettings();
        renderCustomWorlds();
        showToast('World draft saved.', 'success');
    }

    function deleteCustomWorld(id) {
        const settings = getSettings();
        const world = settings.customWorlds.find((item) => item.id === id);
        if (!world) return;
        if (!confirm(`Delete "${world.name}" world draft?`)) return;
        settings.customWorlds = settings.customWorlds.filter((item) => item.id !== id);
        saveSettings();
        renderCustomWorlds();
    }

    function downloadJson(filename, payload) {
        const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    }

    function exportPresetLibrary() {
        const settings = getSettings();
        downloadJson('chat-persona-lore-presets.json', {
            type: 'chat-persona-lore-preset-library',
            version: 1,
            exportedAt: new Date().toISOString(),
            customPresets: settings.customPresets || [],
            customWorlds: settings.customWorlds || [],
        });
    }

    function importPresetLibraryFile(file) {
        if (!file) return;
        const reader = new FileReader();
        reader.onload = function (event) {
            try {
                const payload = JSON.parse(event.target.result);
                const importedPresets = Array.isArray(payload.customPresets) ? payload.customPresets : [];
                const importedWorlds = Array.isArray(payload.customWorlds) ? payload.customWorlds : [];
                if (!importedPresets.length && !importedWorlds.length) {
                    showToast('No Chat Persona Lore presets found in this JSON.', 'warning');
                    return;
                }

                const settings = getSettings();
                mergeNamedList(settings.customPresets, importedPresets, 'preset');
                mergeNamedList(settings.customWorlds, importedWorlds, 'world');
                saveSettings();
                renderSavedPresets();
                renderCustomWorlds();
                showToast('Preset library imported.', 'success');
            } catch (error) {
                console.error('[Chat Persona Lore] Import failed', error);
                showToast('Could not import JSON.', 'error');
            }
        };
        reader.readAsText(file);
    }

    function mergeNamedList(target, incoming, prefix) {
        incoming.forEach((item) => {
            if (!item || !item.name || !item.data) return;
            const copy = clone(item);
            const existing = target.find((current) => current.name === copy.name);
            if (existing) {
                Object.assign(existing, copy, { id: existing.id, updatedAt: new Date().toISOString() });
            } else {
                copy.id = copy.id || `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
                target.push(copy);
            }
        });
    }

    function normalizeLorebookEntries(payload) {
        const rawEntries = payload && (payload.entries || payload.world_info || payload.data || payload);
        const list = Array.isArray(rawEntries) ? rawEntries : Object.values(rawEntries || {});
        return list.map((entry, index) => {
            const keys = Array.isArray(entry.key)
                ? entry.key.join(', ')
                : Array.isArray(entry.keys)
                    ? entry.keys.join(', ')
                    : String(entry.key || entry.keys || entry.keyword || '').trim();
            const title = String(entry.comment || entry.name || entry.title || keys || `Entry ${index + 1}`).trim();
            const source = String(entry.content || entry.entry || entry.text || '').trim();
            return {
                id: `lore_${Date.now()}_${index}_${Math.random().toString(36).slice(2, 6)}`,
                title,
                keys,
                source,
                enabled: false,
                note: '',
            };
        }).filter((entry) => entry.title || entry.keys || entry.source);
    }

    // ---- SillyTavern에 이미 등록된 로어북(World Info) 연동 ----

    function getAllWorldNames() {
        const ctx = getContext();
        if (Array.isArray(ctx.world_names)) return ctx.world_names.slice();
        if (Array.isArray(window.world_names)) return window.world_names.slice();
        return [];
    }

    function getCharacterBoundWorldNames() {
        // 현재 캐릭터에 연결된(★) 로어북 이름들을 추정
        const ctx = getContext();
        const bound = new Set();
        try {
            const char = ctx.characters && ctx.characterId !== undefined ? ctx.characters[ctx.characterId] : null;
            const primary = char && char.data && char.data.extensions && char.data.extensions.world;
            if (primary) bound.add(String(primary));

            // 채팅 메타데이터에 추가로 연결된 보조 로어북들 (있는 경우)
            const extraBooks = ctx.chat_metadata && ctx.chat_metadata.world_info && ctx.chat_metadata.world_info.globalSelect;
            if (Array.isArray(extraBooks)) extraBooks.forEach((name) => bound.add(String(name)));
        } catch (error) {
            console.warn('[Chat Persona Lore] Could not resolve character-bound lorebooks', error);
        }
        return bound;
    }

    function populateLorebookSelect() {
        const select = document.getElementById('cpl-lorebook-select');
        if (!select) return;

        const names = getAllWorldNames();
        const bound = getCharacterBoundWorldNames();

        const currentValue = select.value;
        select.innerHTML = '<option value="">SillyTavern에 로드된 로어북 선택...</option>';

        if (!names.length) {
            const opt = document.createElement('option');
            opt.value = '';
            opt.disabled = true;
            opt.textContent = '등록된 로어북이 없습니다';
            select.appendChild(opt);
            return;
        }

        // 캐릭터에 연결된 로어북을 목록 상단으로 정렬
        const sorted = names.slice().sort((a, b) => {
            const aBound = bound.has(a) ? 0 : 1;
            const bBound = bound.has(b) ? 0 : 1;
            if (aBound !== bBound) return aBound - bBound;
            return a.localeCompare(b);
        });

        for (const name of sorted) {
            const opt = document.createElement('option');
            opt.value = name;
            opt.textContent = bound.has(name) ? `★ ${name}` : name;
            select.appendChild(opt);
        }

        if (currentValue && names.includes(currentValue)) select.value = currentValue;
    }

    async function loadSelectedLorebook() {
        const select = document.getElementById('cpl-lorebook-select');
        const name = select ? select.value : '';
        if (!name) {
            showToast('불러올 로어북을 선택해 주세요.', 'warning');
            return;
        }

        const ctx = getContext();
        if (typeof ctx.loadWorldInfo !== 'function') {
            showToast('이 SillyTavern 버전에서는 로어북을 직접 불러올 수 없습니다.', 'error');
            return;
        }

        try {
            const worldData = await ctx.loadWorldInfo(name);
            if (!worldData) {
                showToast(`"${name}" 로어북을 불러오지 못했습니다.`, 'error');
                return;
            }

            const entries = normalizeLorebookEntries(worldData);
            if (!entries.length) {
                showToast('이 로어북에는 항목이 없습니다.', 'warning');
                return;
            }

            const data = getChatData();
            // 같은 이름으로 이미 불러온 적이 있으면 기존 enabled/note 값을 보존
            const previousByKey = new Map(
                (Array.isArray(data.detailEntries) ? data.detailEntries : [])
                    .map((entry) => [`${entry.title}|${entry.keys}`, entry]),
            );

            const merged = entries.map((entry) => {
                const prev = previousByKey.get(`${entry.title}|${entry.keys}`);
                return prev ? { ...entry, enabled: prev.enabled, note: prev.note } : entry;
            });

            data.lorebookName = name;
            data.detailEntries = merged;
            saveSettings();
            renderDetailEntries();
            updateInjection();
            showToast(`"${name}" 로어북을 불러왔습니다. (${merged.length}개 항목)`, 'success');
        } catch (error) {
            console.error('[Chat Persona Lore] Lorebook load failed', error);
            showToast('로어북을 불러오는 중 오류가 발생했습니다.', 'error');
        }
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

    function renderCustomWorlds() {
        const container = document.getElementById('cpl-custom-worlds');
        if (!container) return;

        const worlds = getSettings().customWorlds;
        if (!worlds.length) {
            container.innerHTML = '<div class="cpl-empty">No custom worlds yet.</div>';
            return;
        }

        container.innerHTML = worlds.map((world) => `
            <div class="cpl-saved-preset" data-id="${escapeHtml(world.id)}">
                <button class="cpl-world-apply cpl-saved-apply" type="button" data-id="${escapeHtml(world.id)}">
                    <i class="fa-solid fa-globe"></i>
                    <span>${escapeHtml(world.name)}</span>
                </button>
                <button class="cpl-world-delete cpl-saved-delete" type="button" title="Delete" data-id="${escapeHtml(world.id)}">
                    <i class="fa-solid fa-xmark"></i>
                </button>
            </div>
        `).join('');
    }

    function renderDetailEntries() {
        const container = document.getElementById('cpl-detail-entries');
        const source = document.getElementById('cpl-lorebook-source');
        if (!container) return;

        populateLorebookSelect();

        const data = getChatData();
        const entries = Array.isArray(data.detailEntries) ? data.detailEntries : [];
        if (source) source.textContent = data.lorebookName ? `불러옴: ${data.lorebookName} (${entries.length}개 항목)` : '불러온 로어북 없음.';

        if (!entries.length) {
            container.innerHTML = '<div class="cpl-empty cpl-detail-empty">위에서 로어북을 선택하고 "불러오기"를 누르면 항목별 override 토글이 생성됩니다.</div>';
            return;
        }

        container.innerHTML = entries.map((entry, index) => `
            <div class="cpl-detail-item" data-index="${index}">
                <label class="cpl-detail-toggle">
                    <input class="cpl-detail-enabled" type="checkbox" data-index="${index}" ${entry.enabled ? 'checked' : ''}>
                    <span>${escapeHtml(entry.title || `Entry ${index + 1}`)}</span>
                </label>
                <div class="cpl-detail-meta">${escapeHtml(entry.keys || 'No keys')}</div>
                <textarea class="cpl-detail-note" data-index="${index}" placeholder="이 로어북 항목에만 추가하거나 덮어쓸 설정을 한 칸에 적어주세요.">${escapeHtml(entry.note || '')}</textarea>
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
                    <div class="cpl-card-title">내 세계관</div>
                    <div class="cpl-card-note">현재 입력값을 재사용 가능한 세계관 초안으로 저장합니다.</div>
                    <div class="cpl-save-row">
                        <input id="cpl-world-name" type="text" placeholder="세계관 이름">
                        <button id="cpl-save-world" class="cpl-mini-button" type="button" title="현재 세계관 저장">
                            <i class="fa-solid fa-plus"></i>
                        </button>
                    </div>
                    <div id="cpl-custom-worlds" class="cpl-saved-list"></div>
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
                    <div class="cpl-import-export-row">
                        <button id="cpl-export-presets" class="cpl-button" type="button"><i class="fa-solid fa-file-export"></i> Export JSON</button>
                        <button id="cpl-import-presets" class="cpl-button" type="button"><i class="fa-solid fa-file-import"></i> Import JSON</button>
                        <input id="cpl-import-presets-file" type="file" accept="application/json,.json" hidden>
                    </div>
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
                <div class="cpl-tabs">
                    <button class="cpl-tab active" type="button" data-page="quick"><i class="fa-solid fa-pen"></i> Quick Edit</button>
                    <button class="cpl-tab" type="button" data-page="detail"><i class="fa-solid fa-layer-group"></i> Detail Overrides</button>
                </div>

                <section id="cpl-page-quick" class="cpl-page active">
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
                </section>

                <section id="cpl-page-detail" class="cpl-page">
                    <div class="cpl-detail-toolbar">
                        <div>
                            <div class="cpl-card-title">로어북 불러오기</div>
                            <div id="cpl-lorebook-source" class="cpl-card-note">불러온 로어북 없음.</div>
                        </div>
                        <div class="cpl-detail-actions">
                            <select id="cpl-lorebook-select" class="cpl-lorebook-select">
                                <option value="">SillyTavern에 로드된 로어북 선택...</option>
                            </select>
                            <button id="cpl-refresh-lorebooks" class="cpl-icon-btn" type="button" title="목록 새로고침"><i class="fa-solid fa-rotate"></i></button>
                            <button id="cpl-load-lorebook" class="cpl-button" type="button"><i class="fa-solid fa-book-open"></i> 불러오기</button>
                        </div>
                    </div>
                    <div class="cpl-card-note">SillyTavern에 현재 등록되어 있는 로어북(World Info) 중에서 선택해서 불러옵니다. 캐릭터에 연결된 로어북은 ★ 표시됩니다. 항목별로 켜고 끄면서 채팅 전용 override를 추가하세요. 기본 설정 탭의 값은 절대 지워지지 않습니다.</div>
                    <div id="cpl-detail-entries" class="cpl-detail-list"></div>
                </section>

                <div class="cpl-preview-wrap">
                    <div class="cpl-preview-bar"><i class="fa-solid fa-terminal"></i> Injection Preview</div>
                    <pre id="cpl-preview" class="cpl-preview"></pre>
                </div>
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

        for (const field of BASIC_FIELDS) {
            $(`#cpl-${field}`).val(data[field] || '');
        }

        renderSavedPresets();
        renderCustomWorlds();
        renderDetailEntries();
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

        $(document).on('click', '.cpl-tab', function () {
            const page = this.dataset.page;
            $('.cpl-tab').removeClass('active');
            $(this).addClass('active');
            $('.cpl-page').removeClass('active');
            $(`#cpl-page-${page}`).addClass('active');
            if (page === 'detail') renderDetailEntries();
        });

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

        $(document).on('click', '#cpl-export-presets', exportPresetLibrary);

        $(document).on('click', '#cpl-import-presets', function () {
            $('#cpl-import-presets-file').val('').trigger('click');
        });

        $(document).on('change', '#cpl-import-presets-file', function (event) {
            importPresetLibraryFile(event.target.files && event.target.files[0]);
        });

        $(document).on('click', '#cpl-save-world', saveCurrentWorldDraft);

        $(document).on('click', '.cpl-world-apply', function () {
            const world = getSettings().customWorlds.find((item) => item.id === this.dataset.id);
            if (!world) return;
            if (hasAnyData(collectCurrentData()) && !confirm(`현재 입력값을 "${world.name}" 세계관으로 교체할까요?`)) return;
            applyPresetData(world.data);
            showToast('세계관을 적용했습니다.', 'success');
        });

        $(document).on('click', '.cpl-world-delete', function () {
            deleteCustomWorld(this.dataset.id);
        });

        $(document).on('click', '#cpl-refresh-lorebooks', function () {
            populateLorebookSelect();
            showToast('로어북 목록을 새로고침했습니다.', 'info');
        });

        $(document).on('click', '#cpl-load-lorebook', function () {
            loadSelectedLorebook();
        });

        $(document).on('change', '.cpl-detail-enabled', function () {
            const data = getChatData();
            const entry = data.detailEntries[Number(this.dataset.index)];
            if (!entry) return;
            entry.enabled = this.checked;
            saveSettings();
            updateInjection();
        });

        $(document).on('input', '.cpl-detail-note', function () {
            const data = getChatData();
            const entry = data.detailEntries[Number(this.dataset.index)];
            if (!entry) return;
            entry.note = this.value;
            saveSettings();
            updateInjection();
        });

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
