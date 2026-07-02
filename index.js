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
        greeting: {
            apiSource: 'sillytavern',
            connectionProfile: '',
            customApiUrl: '',
            customApiKey: '',
            customApiModel: '',
            customApiMaxTokens: 1000,
            customApiTimeout: 120,
        },
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
        greetingCount: 1,
        greetingTone: '',
        greetingExtra: '',
        greetings: [],
        savedGreetings: [],
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
        if (!settings.greeting || typeof settings.greeting !== 'object') {
            settings.greeting = clone(DEFAULT_SETTINGS.greeting);
        } else {
            for (const [key, value] of Object.entries(DEFAULT_SETTINGS.greeting)) {
                if (settings.greeting[key] === undefined) settings.greeting[key] = value;
            }
        }
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
        if (!Array.isArray(data.greetings)) data.greetings = [];
        if (!Array.isArray(data.savedGreetings)) data.savedGreetings = [];
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

    // ---- 인사말(첫 메시지) 자동 생성 ----

    function getPersonaNames() {
        const ctx = getContext();
        const char = getCurrentCharacter();
        return {
            charName: ctx.name2 || (char && char.name) || '',
            userName: ctx.name1 || '',
        };
    }

    function asCleanText(value) {
        if (value === undefined || value === null) return '';
        if (Array.isArray(value)) return value.map(asCleanText).filter(Boolean).join('\n');
        if (typeof value === 'object') return '';
        return String(value).trim();
    }

    function firstText(...values) {
        for (const value of values) {
            const text = asCleanText(value);
            if (text) return text;
        }
        return '';
    }

    function truncateContextText(text, maxLength) {
        const clean = asCleanText(text);
        if (!clean || clean.length <= maxLength) return clean;
        return `${clean.slice(0, maxLength).trim()}\n[truncated]`;
    }

    function getCharacterCardContext() {
        const char = getCurrentCharacter();
        if (!char) return '';
        const data = char.data || {};
        const sections = [
            section('Character Card - Description', firstText(data.description, char.description)),
            section('Character Card - Personality', firstText(data.personality, char.personality)),
            section('Character Card - Scenario', firstText(data.scenario, char.scenario)),
            section('Character Card - First Message Reference', firstText(data.first_mes, char.first_mes)),
            section('Character Card - Message Examples', firstText(data.mes_example, char.mes_example)),
            section('Character Card - Creator Notes', firstText(data.creator_notes, data.creator_notes_multilingual, char.creator_notes)),
        ].filter(Boolean);
        return truncateContextText(sections.join('\n\n'), 12000);
    }

    function getUserPersonaContext() {
        const ctx = getContext();
        const candidates = [];
        try {
            candidates.push(
                ctx.persona,
                ctx.userPersona,
                ctx.persona_description,
                ctx.power_user && ctx.power_user.persona_description,
                ctx.powerUserSettings && ctx.powerUserSettings.persona_description,
                window.power_user && window.power_user.persona_description,
                window.persona_description,
            );

            const selectedName = firstText(
                ctx.name1,
                ctx.power_user && ctx.power_user.persona,
                ctx.powerUserSettings && ctx.powerUserSettings.persona,
                window.power_user && window.power_user.persona,
            );
            const personaStore = ctx.personas || window.personas || (window.power_user && window.power_user.personas);
            if (personaStore && typeof personaStore === 'object') {
                candidates.push(personaStore[selectedName]);
                for (const value of Object.values(personaStore)) {
                    if (asCleanText(value).includes(selectedName)) candidates.push(value);
                }
            }
        } catch (error) {
            console.warn('[Chat Persona Lore] persona context lookup failed', error);
        }
        const text = candidates.map(asCleanText).filter(Boolean).find(Boolean) || '';
        return truncateContextText(text, 5000);
    }

    function getAuthorsNoteContext() {
        const ctx = getContext();
        const notes = [];
        function pushNote(label, value) {
            const text = asCleanText(value);
            if (text) notes.push(section(label, text));
        }

        try {
            const metadata = ctx.chat_metadata || {};
            pushNote("Author's Note", metadata.note_prompt || metadata.authors_note || metadata.author_note);
            pushNote("Author's Note", ctx.note_prompt || ctx.authors_note || ctx.author_note);
            pushNote("Author's Note", window.note_prompt || window.authors_note || window.author_note);

            const extensionPrompts = ctx.extensionPrompts || window.extension_prompts || {};
            if (extensionPrompts && typeof extensionPrompts === 'object') {
                for (const [key, value] of Object.entries(extensionPrompts)) {
                    if (key === PROMPT_ID) continue;
                    const prompt = value && typeof value === 'object' ? firstText(value.value, value.content, value.prompt) : value;
                    if (/author|note|persona|scenario|memory/i.test(key)) pushNote(`Active Extension Prompt - ${key}`, prompt);
                }
            }
        } catch (error) {
            console.warn('[Chat Persona Lore] author note lookup failed', error);
        }

        const unique = [...new Set(notes.filter(Boolean))];
        return truncateContextText(unique.join('\n\n'), 6000);
    }

    function buildSillyTavernGreetingContext() {
        const parts = [
            section('Current SillyTavern Character Card', getCharacterCardContext()),
            section('Current SillyTavern User Persona', getUserPersonaContext()),
            section("Current SillyTavern Author's Note And Active Prompts", getAuthorsNoteContext()),
        ].filter(Boolean);
        return parts.join('\n\n');
    }

    function buildGreetingPrompt(count, tone, extra) {
        const canon = buildPrompt();
        const tavernContext = buildSillyTavernGreetingContext();
        const { charName, userName } = getPersonaNames();
        const lines = [
            'You are drafting opening greeting messages (the very first in-character message) for a roleplay chat inside SillyTavern.',
            charName ? `Character name: ${charName}` : '',
            userName ? `User name: ${userName}` : '',
            tavernContext ? `Current SillyTavern chat context that must be respected:\n${tavernContext}` : '',
            canon ? `Mandatory chat-specific canon that must be respected:\n${canon}` : '',
            `Write ${count} distinct greeting drafts. Each draft must be a complete, self-contained opening message written strictly in-character, consistent with the character card, user persona, author's note, active prompts, and chat-specific canon above.`,
            tone ? `Desired tone/style: ${tone}` : '',
            extra ? `Additional instructions: ${extra}` : '',
            'Output format rules: separate each draft with a line that contains only ---, and output nothing else (no numbering, no titles, no meta commentary, no explanations).',
        ].filter(Boolean);
        return lines.join('\n\n');
    }

    function parseGreetingResponse(text, expectedCount) {
        const raw = String(text || '').trim();
        if (!raw) return [];
        let parts = raw.split(/\n\s*-{3,}\s*\n/g).map((chunk) => chunk.trim()).filter(Boolean);
        if (parts.length < 2) {
            parts = raw.split(/\n\s*\d+[.).]\s+/g).map((chunk) => chunk.trim()).filter(Boolean);
        }
        if (!parts.length) parts = [raw];
        const limit = expectedCount && expectedCount < parts.length ? expectedCount : parts.length;
        return parts.slice(0, limit);
    }

    // ---- 연결 프로필 (SillyTavern 자체 API 연결 재사용) ----

    function getConnectionProfiles() {
        try {
            const ctx = getContext();
            const cm = ctx.extensionSettings && ctx.extensionSettings.connectionManager;
            return cm ? cm.profiles || [] : [];
        } catch (error) {
            return [];
        }
    }

    function getConnectionProfileName(id) {
        const profile = getConnectionProfiles().find((item) => item.id === id);
        return profile ? profile.name : null;
    }

    function getCurrentConnectionProfileName() {
        try {
            const ctx = getContext();
            const cm = ctx.extensionSettings && ctx.extensionSettings.connectionManager;
            if (cm && cm.selectedProfile) {
                const profile = cm.profiles.find((item) => item.id === cm.selectedProfile);
                return profile ? profile.name : null;
            }
        } catch (error) {
            // 무시
        }
        return null;
    }

    async function switchConnectionProfile(name) {
        if (!name) return false;
        try {
            const ctx = getContext();
            const runSlash = ctx.executeSlashCommandsWithOptions || ctx.executeSlashCommands;
            if (runSlash) {
                await runSlash(`/profile ${name}`);
                await new Promise((resolve) => setTimeout(resolve, 1200));
                return true;
            }
        } catch (error) {
            console.warn('[Chat Persona Lore] profile switch failed', error);
        }
        return false;
    }

    // ---- API 호출 ----
    // 기본값은 SillyTavern에 이미 설정되어 있는 연결(및 API 키)을 그대로 재사용한다.
    // 별도의 OpenAI 호환 API를 쓰고 싶을 때만 URL/모델/키를 직접 입력해서 사용한다.

    async function callGreetingApi(prompt) {
        const settings = getSettings();
        const g = settings.greeting;

        if (g.apiSource === 'openai') {
            if (!g.customApiUrl) throw new Error('Custom API URL이 설정되지 않았습니다.');
            const headers = { 'Content-Type': 'application/json' };
            if (g.customApiKey) headers['Authorization'] = `Bearer ${g.customApiKey}`;
            const body = {
                model: g.customApiModel || 'gpt-4o',
                messages: [{ role: 'user', content: prompt }],
                max_tokens: g.customApiMaxTokens || 1000,
            };
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), (g.customApiTimeout || 120) * 1000);
            try {
                const response = await fetch(g.customApiUrl, {
                    method: 'POST',
                    headers,
                    body: JSON.stringify(body),
                    signal: controller.signal,
                });
                clearTimeout(timeoutId);
                if (!response.ok) {
                    const errText = await response.text();
                    throw new Error(`HTTP ${response.status}: ${errText.slice(0, 200)}`);
                }
                const data = await response.json();
                const choice = data && data.choices && data.choices[0];
                const result = choice ? (choice.message ? choice.message.content : choice.text) : '';
                if (!result) throw new Error('Custom API 응답이 비어있습니다.');
                return result;
            } catch (error) {
                clearTimeout(timeoutId);
                throw error;
            }
        }

        // SillyTavern에 이미 연결된 API를 그대로 사용
        const ctx = getContext();
        let switchedProfile = false;
        let originalProfile = null;

        try {
            if (g.connectionProfile) {
                const targetName = getConnectionProfileName(g.connectionProfile);
                if (targetName) {
                    originalProfile = getCurrentConnectionProfileName();
                    if (originalProfile !== targetName) {
                        switchedProfile = await switchConnectionProfile(targetName);
                    }
                }
            }

            const timeoutMs = (g.customApiTimeout || 120) * 1000;
            function withTimeout(promise) {
                let timer;
                return Promise.race([
                    promise,
                    new Promise((_, reject) => {
                        timer = setTimeout(() => reject(new Error(`API 시간 초과 (${Math.round(timeoutMs / 1000)}초)`)), timeoutMs);
                    }),
                ]).finally(() => clearTimeout(timer));
            }

            let result = '';
            if (typeof ctx.generateRaw === 'function') {
                result = await withTimeout(ctx.generateRaw({ prompt, maxContext: null, quietToLoud: false, skipWIAN: false, skipAN: false }));
            } else if (typeof ctx.generateQuietPrompt === 'function') {
                result = await withTimeout(ctx.generateQuietPrompt(prompt, false, false));
            } else if (typeof window.generateQuietPrompt === 'function') {
                result = await withTimeout(window.generateQuietPrompt(prompt, false, false));
            }

            if (!result) throw new Error('API 응답이 비어있습니다. (SillyTavern에 연결된 API가 있는지 확인해 주세요.)');
            return result;
        } finally {
            if (switchedProfile && originalProfile) await switchConnectionProfile(originalProfile);
        }
    }

    async function callGreetingApiWithRetry(prompt, retries) {
        const maxRetries = retries || 2;
        let lastError;
        for (let attempt = 0; attempt < maxRetries; attempt++) {
            try {
                return await callGreetingApi(prompt);
            } catch (error) {
                lastError = error;
                const message = String((error && error.message) || '').toLowerCase();
                if (message.includes('시간 초과') || message.includes('timeout') || message.includes('abort')) break;
                if (attempt < maxRetries - 1) {
                    await new Promise((resolve) => setTimeout(resolve, 1500 * (attempt + 1)));
                }
            }
        }
        throw lastError;
    }

    function setGreetingBusy(isBusy) {
        const btn = document.getElementById('cpl-greeting-generate');
        if (!btn) return;
        btn.disabled = isBusy;
        btn.innerHTML = isBusy
            ? '<i class="fa-solid fa-spinner fa-spin"></i> 생성 중...'
            : '<i class="fa-solid fa-wand-magic-sparkles"></i> 인사말 생성';
    }

    async function generateGreetings() {
        const data = getChatData();
        const count = Math.min(Math.max(Number(data.greetingCount) || 1, 1), 8);
        const prompt = buildGreetingPrompt(count, data.greetingTone, data.greetingExtra);

        setGreetingBusy(true);
        try {
            const result = await callGreetingApiWithRetry(prompt, 2);
            const parts = parseGreetingResponse(result, count);
            if (!parts.length) throw new Error('생성된 내용이 없습니다.');

            const newEntries = parts.map((text) => ({
                id: `greet_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
                text,
                createdAt: new Date().toISOString(),
            }));

            data.greetings = [...newEntries, ...(Array.isArray(data.greetings) ? data.greetings : [])].slice(0, 30);
            saveSettings();
            renderGreetings();
            showToast(`인사말 ${newEntries.length}개를 생성했습니다.`, 'success');
        } catch (error) {
            console.error('[Chat Persona Lore] Greeting generation failed', error);
            showToast(`인사말 생성 실패: ${(error && error.message) || error}`, 'error');
        } finally {
            setGreetingBusy(false);
        }
    }

    function copyGreeting(id) {
        const data = getChatData();
        const item = [...(data.greetings || []), ...(data.savedGreetings || [])].find((entry) => entry.id === id);
        if (!item) return;
        navigator.clipboard.writeText(item.text).then(
            () => showToast('인사말을 복사했습니다.', 'success'),
            () => showToast('복사에 실패했습니다.', 'error'),
        );
    }

    function saveGreeting(id) {
        const data = getChatData();
        const item = (data.greetings || []).find((entry) => entry.id === id);
        if (!item) return;
        const alreadySaved = (data.savedGreetings || []).some((entry) => String(entry.text || '').trim() === String(item.text || '').trim());
        if (alreadySaved) {
            showToast('이미 저장된 인사말입니다.', 'info');
            return;
        }
        data.savedGreetings = [{
            id: `saved_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
            text: item.text,
            createdAt: item.createdAt || new Date().toISOString(),
            savedAt: new Date().toISOString(),
        }, ...(data.savedGreetings || [])].slice(0, 50);
        saveSettings();
        renderGreetings();
        showToast('인사말을 저장했습니다.', 'success');
    }

    function deleteGreeting(id) {
        const data = getChatData();
        data.greetings = (data.greetings || []).filter((entry) => entry.id !== id);
        saveSettings();
        renderGreetings();
    }

    function deleteSavedGreeting(id) {
        const data = getChatData();
        data.savedGreetings = (data.savedGreetings || []).filter((entry) => entry.id !== id);
        saveSettings();
        renderGreetings();
    }

    function renderGreetings() {
        const container = document.getElementById('cpl-greeting-list');
        if (!container) return;
        const data = getChatData();
        const list = Array.isArray(data.greetings) ? data.greetings : [];
        if (!list.length) {
            container.innerHTML = '<div class="cpl-empty">아직 생성된 인사말이 없습니다.</div>';
            return;
        }
        container.innerHTML = list.map((item) => `
            <div class="cpl-greeting-item" data-id="${escapeHtml(item.id)}">
                <pre class="cpl-greeting-text">${escapeHtml(item.text)}</pre>
                <div class="cpl-greeting-actions">
                    <button class="cpl-greeting-copy cpl-mini-button" type="button" data-id="${escapeHtml(item.id)}" title="복사"><i class="fa-solid fa-copy"></i></button>
                    <button class="cpl-greeting-delete cpl-mini-button" type="button" data-id="${escapeHtml(item.id)}" title="삭제"><i class="fa-solid fa-xmark"></i></button>
                </div>
            </div>
        `).join('');
    }

    function renderGreetings() {
        const container = document.getElementById('cpl-greeting-list');
        if (!container) return;
        const data = getChatData();
        const list = Array.isArray(data.greetings) ? data.greetings : [];
        const saved = Array.isArray(data.savedGreetings) ? data.savedGreetings : [];
        if (!list.length && !saved.length) {
            container.innerHTML = '<div class="cpl-empty">아직 생성되거나 저장된 인사말이 없습니다.</div>';
            return;
        }
        const savedHtml = saved.length ? `
            <div class="cpl-greeting-section-title"><i class="fa-solid fa-star"></i> 저장한 인사말</div>
            ${saved.map((item) => `
                <div class="cpl-greeting-item cpl-greeting-saved" data-id="${escapeHtml(item.id)}">
                    <pre class="cpl-greeting-text">${escapeHtml(item.text)}</pre>
                    <div class="cpl-greeting-actions">
                        <button class="cpl-greeting-copy cpl-mini-button" type="button" data-id="${escapeHtml(item.id)}" title="복사"><i class="fa-solid fa-copy"></i></button>
                        <button class="cpl-greeting-delete-saved cpl-mini-button" type="button" data-id="${escapeHtml(item.id)}" title="저장 삭제"><i class="fa-solid fa-bookmark-slash"></i></button>
                    </div>
                </div>
            `).join('')}
        ` : '';
        const generatedHtml = list.length ? `
            <div class="cpl-greeting-section-title"><i class="fa-solid fa-clock-rotate-left"></i> 생성된 인사말</div>
            ${list.map((item) => `
                <div class="cpl-greeting-item" data-id="${escapeHtml(item.id)}">
                    <pre class="cpl-greeting-text">${escapeHtml(item.text)}</pre>
                    <div class="cpl-greeting-actions">
                        <button class="cpl-greeting-copy cpl-mini-button" type="button" data-id="${escapeHtml(item.id)}" title="복사"><i class="fa-solid fa-copy"></i></button>
                        <button class="cpl-greeting-save cpl-mini-button" type="button" data-id="${escapeHtml(item.id)}" title="저장"><i class="fa-solid fa-star"></i></button>
                        <button class="cpl-greeting-delete cpl-mini-button" type="button" data-id="${escapeHtml(item.id)}" title="삭제"><i class="fa-solid fa-xmark"></i></button>
                    </div>
                </div>
            `).join('')}
        ` : '<div class="cpl-empty">생성된 인사말이 없습니다.</div>';
        container.innerHTML = savedHtml + generatedHtml;
    }

    function toggleGreetingApiSourceUI() {
        const source = $('#cpl-greeting-api-source').val();
        $('#cpl-greeting-st-settings').toggle(source !== 'openai');
        $('#cpl-greeting-openai-settings').toggle(source === 'openai');
    }

    function populateGreetingConnectionProfiles() {
        const select = document.getElementById('cpl-greeting-connection-profile');
        if (!select) return;
        const profiles = getConnectionProfiles();
        select.innerHTML = '<option value="">현재 API 연결 사용</option>' +
            profiles.map((p) => `<option value="${escapeHtml(p.id)}">${escapeHtml(p.name || p.id)}</option>`).join('');
        const settings = getSettings();
        if (settings.greeting.connectionProfile) select.value = settings.greeting.connectionProfile;
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

    // ---- SillyTavern에 이미 등록된 로어북(World Info) 연동 ----

    async function getStRequestHeaders() {
        const headers = { 'Content-Type': 'application/json' };
        const csrfMeta = document.querySelector('meta[name="csrf-token"]');
        if (csrfMeta) headers['X-CSRF-Token'] = csrfMeta.getAttribute('content');
        try {
            const scriptModule = await import('../../../../script.js');
            if (typeof scriptModule.getRequestHeaders === 'function') {
                Object.assign(headers, scriptModule.getRequestHeaders());
            }
        } catch (error) {
            // script.js 경로를 못 찾아도 수동 헤더로 계속 진행
        }
        return headers;
    }

    function getAllWorldNames() {
        const ctx = getContext();

        // 방법 1: ST DOM의 #world_editor_select에서 직접 읽기 (가장 안정적, ST가 항상 world_names로 채워놓음)
        try {
            const options = document.querySelectorAll('#world_editor_select option');
            if (options.length > 0) {
                const names = [];
                options.forEach((opt) => {
                    const text = (opt.textContent || '').trim();
                    const val = opt.value;
                    if (text && val !== '' && val !== 'None') names.push(text);
                });
                if (names.length > 0) return names;
            }
        } catch (error) {
            console.warn('[Chat Persona Lore] DOM world list read failed', error);
        }

        // 방법 2: getContext()/window 전역의 world_names 배열
        if (Array.isArray(ctx.world_names)) return ctx.world_names.slice();
        if (Array.isArray(window.world_names)) return window.world_names.slice();
        return [];
    }

    async function refreshWorldNamesFromApi() {
        // DOM과 전역 변수에 아직 로어북 목록이 채워지지 않았을 때를 위한 API 폴백
        try {
            const headers = await getStRequestHeaders();
            const response = await fetch('/api/worldinfo/list', { method: 'POST', headers, body: JSON.stringify({}) });
            if (response.ok) {
                const data = await response.json();
                const names = Array.isArray(data) ? data : (data.worldNames || data.world_names || []);
                if (names.length > 0) return names;
            }
        } catch (error) {
            console.warn('[Chat Persona Lore] /api/worldinfo/list failed', error);
        }

        try {
            const headers = await getStRequestHeaders();
            const response = await fetch('/api/settings/get', { method: 'POST', headers, body: JSON.stringify({}) });
            if (response.ok) {
                const data = await response.json();
                if (Array.isArray(data.world_names) && data.world_names.length > 0) return data.world_names;
            }
        } catch (error) {
            console.warn('[Chat Persona Lore] /api/settings/get fallback failed', error);
        }

        return [];
    }

    function getCurrentCharacter() {
        const ctx = getContext();
        try {
            if (Array.isArray(ctx.characters) && ctx.characterId !== undefined && ctx.characterId !== null) {
                return ctx.characters[ctx.characterId] || null;
            }
        } catch (error) {
            // 무시
        }
        return null;
    }

    function getCharacterBoundWorldNames() {
        // 현재 캐릭터/채팅에 연결된(★) 로어북 이름들을 추정
        const ctx = getContext();
        const bound = new Set();
        try {
            const char = getCurrentCharacter();
            const primary = char && char.data && char.data.extensions && char.data.extensions.world;
            if (primary) bound.add(String(primary));

            // 채팅 메타데이터에 추가로 연결된 보조 로어북들 (있는 경우)
            const wi = ctx.chat_metadata && ctx.chat_metadata.world_info;
            const extraBooks = wi && (wi.globalSelect || wi.charLore);
            if (Array.isArray(extraBooks)) extraBooks.forEach((name) => bound.add(String(name)));

            // 전역으로 활성화된 World Info 셀렉터 (있는 경우)
            if (Array.isArray(ctx.world_info?.globalSelect)) {
                ctx.world_info.globalSelect.forEach((name) => bound.add(String(name)));
            }
        } catch (error) {
            console.warn('[Chat Persona Lore] Could not resolve character-bound lorebooks', error);
        }
        return bound;
    }

    function extractWorldInfoEntries(book, sourceName) {
        if (!book) return [];
        const rawEntries = book.entries
            ? (Array.isArray(book.entries) ? book.entries : Object.values(book.entries))
            : (Array.isArray(book) ? book : Object.values(book));

        return rawEntries.filter(Boolean).map((entry, index) => {
            const keys = entry.key || entry.keys || [];
            const keysText = Array.isArray(keys) ? keys.join(', ') : String(keys || '');
            const title = String(entry.comment || entry.name || keysText || `Entry ${index + 1}`).trim();
            const content = String(entry.content || entry.entry || entry.text || '').trim();
            return {
                id: `lore_${Date.now()}_${index}_${Math.random().toString(36).slice(2, 6)}`,
                title,
                keys: keysText,
                source: content,
                enabled: false,
                note: '',
                origin: sourceName,
            };
        }).filter((entry) => entry.title || entry.keys || entry.source);
    }

    async function fetchWorldInfoBookByName(name) {
        const ctx = getContext();

        // 방법 1: ST의 공식 컨텍스트 API (있는 경우 가장 신뢰도 높음)
        if (typeof ctx.loadWorldInfo === 'function') {
            try {
                const book = await ctx.loadWorldInfo(name);
                if (book) return book;
            } catch (error) {
                console.warn('[Chat Persona Lore] ctx.loadWorldInfo failed, falling back to REST API', error);
            }
        }

        // 방법 2: /api/worldinfo/get REST 엔드포인트 (POST)
        try {
            const headers = await getStRequestHeaders();
            const response = await fetch('/api/worldinfo/get', {
                method: 'POST',
                headers,
                body: JSON.stringify({ name }),
            });
            if (response.ok) return await response.json();
        } catch (error) {
            console.warn('[Chat Persona Lore] POST /api/worldinfo/get failed', error);
        }

        // 방법 3: GET 변형 (구버전 호환)
        try {
            const response = await fetch(`/api/worldinfo/get?name=${encodeURIComponent(name)}`);
            if (response.ok) return await response.json();
        } catch (error) {
            console.warn('[Chat Persona Lore] GET /api/worldinfo/get failed', error);
        }

        return null;
    }

    async function loadCharacterBoundLorebookEntries() {
        // 현재 캐릭터에 연결된 로어북(외부 WI 북 + 카드 내장 character_book)을 모두 불러와 중복 제거 후 병합
        const allEntries = [];
        const seen = new Set();
        const sourcesUsed = [];

        const char = getCurrentCharacter();
        const worldName = char && char.data && char.data.extensions && char.data.extensions.world;

        if (worldName) {
            const book = await fetchWorldInfoBookByName(worldName);
            if (book) {
                const entries = extractWorldInfoEntries(book, worldName);
                entries.forEach((entry) => {
                    const hash = `${entry.title}|${entry.keys}|${entry.source.slice(0, 200)}`;
                    if (!seen.has(hash)) {
                        seen.add(hash);
                        allEntries.push(entry);
                    }
                });
                if (entries.length) sourcesUsed.push(worldName);
            }
        }

        const charBook = char && char.data && char.data.character_book;
        if (charBook) {
            const entries = extractWorldInfoEntries(charBook, '캐릭터 카드 내장 로어북');
            entries.forEach((entry) => {
                const hash = `${entry.title}|${entry.keys}|${entry.source.slice(0, 200)}`;
                if (!seen.has(hash)) {
                    seen.add(hash);
                    allEntries.push(entry);
                }
            });
            if (entries.length) sourcesUsed.push('캐릭터 카드 내장 로어북');
        }

        return { entries: allEntries, sourceLabel: sourcesUsed.join(' + ') };
    }

    async function populateLorebookSelect() {
        const select = document.getElementById('cpl-lorebook-select');
        if (!select) return;

        let names = getAllWorldNames();
        if (!names.length) {
            // DOM/전역 변수에 아직 목록이 없으면 REST API로 한 번 더 시도
            names = await refreshWorldNamesFromApi();
        }
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

    function mergeEntriesPreservingOverrides(entries) {
        const data = getChatData();
        // 같은 이름으로 이미 불러온 적이 있으면 기존 enabled/note 값을 보존
        const previousByKey = new Map(
            (Array.isArray(data.detailEntries) ? data.detailEntries : [])
                .map((entry) => [`${entry.title}|${entry.keys}`, entry]),
        );

        return entries.map((entry) => {
            const prev = previousByKey.get(`${entry.title}|${entry.keys}`);
            return prev ? { ...entry, enabled: prev.enabled, note: prev.note } : entry;
        });
    }

    async function loadSelectedLorebook() {
        const select = document.getElementById('cpl-lorebook-select');
        const name = select ? select.value : '';
        if (!name) {
            showToast('불러올 로어북을 선택해 주세요.', 'warning');
            return;
        }

        try {
            const worldData = await fetchWorldInfoBookByName(name);
            if (!worldData) {
                showToast(`"${name}" 로어북을 불러오지 못했습니다.`, 'error');
                return;
            }

            const entries = extractWorldInfoEntries(worldData, name);
            if (!entries.length) {
                showToast('이 로어북에는 항목이 없습니다.', 'warning');
                return;
            }

            const data = getChatData();
            data.lorebookName = name;
            data.detailEntries = mergeEntriesPreservingOverrides(entries);
            saveSettings();
            renderDetailEntries();
            updateInjection();
            showToast(`"${name}" 로어북을 불러왔습니다. (${entries.length}개 항목)`, 'success');
        } catch (error) {
            console.error('[Chat Persona Lore] Lorebook load failed', error);
            showToast('로어북을 불러오는 중 오류가 발생했습니다.', 'error');
        }
    }

    async function loadBoundLorebook() {
        // 현재 채팅 캐릭터에 실제로 연결되어 있는 로어북(외부 WI 북 + 카드 내장 로어북)을 한 번에 불러오기
        const char = getCurrentCharacter();
        if (!char) {
            showToast('현재 채팅에 캐릭터가 없습니다.', 'warning');
            return;
        }

        try {
            const { entries, sourceLabel } = await loadCharacterBoundLorebookEntries();
            if (!entries.length) {
                showToast('이 캐릭터에 연결된 로어북 항목을 찾지 못했습니다.', 'warning');
                return;
            }

            const data = getChatData();
            data.lorebookName = sourceLabel || '캐릭터 연결 로어북';
            data.detailEntries = mergeEntriesPreservingOverrides(entries);
            saveSettings();
            renderDetailEntries();
            updateInjection();
            showToast(`캐릭터 연결 로어북을 불러왔습니다. (${entries.length}개 항목, ${sourceLabel})`, 'success');
        } catch (error) {
            console.error('[Chat Persona Lore] Bound lorebook load failed', error);
            showToast('캐릭터 로어북을 불러오는 중 오류가 발생했습니다.', 'error');
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
                    <button class="cpl-tab" type="button" data-page="greeting"><i class="fa-solid fa-message"></i> Greetings</button>
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
                            <button id="cpl-load-bound" class="cpl-button cpl-primary" type="button"><i class="fa-solid fa-link"></i> 캐릭터 연결 로어북 불러오기</button>
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

                <section id="cpl-page-greeting" class="cpl-page">
                    <div class="cpl-card cpl-greeting-panel">
                        <div class="cpl-card-title">Greeting Generator</div>
                        <div class="cpl-card-note">현재 Quick Edit와 Detail Overrides 내용을 반영해서 첫 인사말 후보를 생성합니다.</div>

                        <div class="cpl-split-row">
                            <label>생성 개수
                                <input id="cpl-greeting-count" type="number" min="1" max="8" step="1">
                            </label>
                            <label>API 연결
                                <select id="cpl-greeting-api-source">
                                    <option value="sillytavern">SillyTavern 현재 연결 사용</option>
                                    <option value="openai">OpenAI 호환 API 직접 입력</option>
                                </select>
                            </label>
                        </div>

                        <div id="cpl-greeting-st-settings">
                            <label>연결 프로필
                                <select id="cpl-greeting-connection-profile">
                                    <option value="">현재 API 연결 사용</option>
                                </select>
                            </label>
                        </div>

                        <div id="cpl-greeting-openai-settings" class="cpl-greeting-api-box">
                            <label>API URL
                                <input id="cpl-greeting-custom-url" type="text" placeholder="https://api.openai.com/v1/chat/completions">
                            </label>
                            <div class="cpl-split-row">
                                <label>Model
                                    <input id="cpl-greeting-custom-model" type="text" placeholder="gpt-4o">
                                </label>
                                <label>Max Tokens
                                    <input id="cpl-greeting-max-tokens" type="number" min="128" max="8000" step="64">
                                </label>
                            </div>
                            <div class="cpl-split-row">
                                <label>API Key
                                    <input id="cpl-greeting-custom-key" type="password" placeholder="sk-...">
                                </label>
                                <label>Timeout (sec)
                                    <input id="cpl-greeting-timeout" type="number" min="10" max="600" step="5">
                                </label>
                            </div>
                        </div>

                        <label>분위기 / 스타일
                            <input id="cpl-greeting-tone" type="text" placeholder="예: 어둡고 긴장감 있게, 달콤한 로맨스, 미스터리한 첫 만남">
                        </label>
                        <label>추가 출력 지시
                            <textarea id="cpl-greeting-extra" placeholder="예: 2인칭으로 시작하지 말기, 장소 묘사를 먼저 넣기, 대사는 한 줄만 포함하기"></textarea>
                        </label>

                        <div class="cpl-greeting-controls">
                            <button id="cpl-greeting-generate" class="cpl-button cpl-primary" type="button"><i class="fa-solid fa-wand-magic-sparkles"></i> 그리팅 생성</button>
                            <button id="cpl-greeting-clear" class="cpl-button cpl-danger" type="button"><i class="fa-solid fa-trash"></i> 목록 비우기</button>
                        </div>
                    </div>

                    <div id="cpl-greeting-list" class="cpl-greeting-list"></div>
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
        $('#cpl-greeting-count').val(String(data.greetingCount || 1));
        $('#cpl-greeting-tone').val(data.greetingTone || '');
        $('#cpl-greeting-extra').val(data.greetingExtra || '');
        $('#cpl-greeting-api-source').val(settings.greeting.apiSource || 'sillytavern');
        $('#cpl-greeting-custom-url').val(settings.greeting.customApiUrl || '');
        $('#cpl-greeting-custom-key').val(settings.greeting.customApiKey || '');
        $('#cpl-greeting-custom-model').val(settings.greeting.customApiModel || '');
        $('#cpl-greeting-max-tokens').val(String(settings.greeting.customApiMaxTokens || 1000));
        $('#cpl-greeting-timeout').val(String(settings.greeting.customApiTimeout || 120));
        populateGreetingConnectionProfiles();
        toggleGreetingApiSourceUI();
        renderGreetings();
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
            if (page === 'greeting') {
                populateGreetingConnectionProfiles();
                toggleGreetingApiSourceUI();
                renderGreetings();
            }
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

        $(document).on('click', '#cpl-load-bound', function () {
            loadBoundLorebook();
        });

        $(document).on('click', '#cpl-load-lorebook', function () {
            loadSelectedLorebook();
        });

        $(document).on('change input', '#cpl-greeting-count, #cpl-greeting-tone, #cpl-greeting-extra', function () {
            const data = getChatData();
            data.greetingCount = Math.min(Math.max(Number($('#cpl-greeting-count').val()) || 1, 1), 8);
            data.greetingTone = $('#cpl-greeting-tone').val();
            data.greetingExtra = $('#cpl-greeting-extra').val();
            saveSettings();
        });

        $(document).on('change input', '#cpl-greeting-api-source, #cpl-greeting-connection-profile, #cpl-greeting-custom-url, #cpl-greeting-custom-key, #cpl-greeting-custom-model, #cpl-greeting-max-tokens, #cpl-greeting-timeout', function () {
            const greeting = getSettings().greeting;
            greeting.apiSource = $('#cpl-greeting-api-source').val() || 'sillytavern';
            greeting.connectionProfile = $('#cpl-greeting-connection-profile').val() || '';
            greeting.customApiUrl = $('#cpl-greeting-custom-url').val() || '';
            greeting.customApiKey = $('#cpl-greeting-custom-key').val() || '';
            greeting.customApiModel = $('#cpl-greeting-custom-model').val() || '';
            greeting.customApiMaxTokens = Number($('#cpl-greeting-max-tokens').val()) || 1000;
            greeting.customApiTimeout = Number($('#cpl-greeting-timeout').val()) || 120;
            saveSettings();
            toggleGreetingApiSourceUI();
        });

        $(document).on('click', '#cpl-greeting-generate', generateGreetings);

        $(document).on('click', '.cpl-greeting-copy', function () {
            copyGreeting(this.dataset.id);
        });

        $(document).on('click', '.cpl-greeting-save', function () {
            saveGreeting(this.dataset.id);
        });

        $(document).on('click', '.cpl-greeting-delete', function () {
            deleteGreeting(this.dataset.id);
        });

        $(document).on('click', '.cpl-greeting-delete-saved', function () {
            deleteSavedGreeting(this.dataset.id);
        });

        $(document).on('click', '#cpl-greeting-clear', function () {
            const data = getChatData();
            if (!Array.isArray(data.greetings) || !data.greetings.length) return;
            if (!confirm('생성된 인사말 목록을 모두 비울까요?')) return;
            data.greetings = [];
            saveSettings();
            renderGreetings();
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
