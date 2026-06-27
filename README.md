# Chat Persona Lore

Chat Persona Lore is a SillyTavern extension for chat-specific persona and world notes.

It does not edit your base persona. Instead, it saves extra notes per chat and injects them into the generation prompt through SillyTavern's extension prompt API. It opens from the magic-wand Extensions menu beside the message input area.

## What It Is For

- Add a world setting that must apply to the current chat.
- Add temporary or alternate character settings.
- Add user persona additions for one room.
- Keep relationship dynamics, tone rules, and continuity notes separate from the base persona.
- Save your own reusable presets.
- Preview exactly what will be injected.

## Install

1. Create a GitHub repository.
2. Upload the contents of this folder to the repository root.
   - `manifest.json` must be at the top level of the repository.
   - Do not upload it as `outputs/chat-persona-lore/manifest.json`.
2. In SillyTavern, open Extensions.
3. Use Install Extension and paste the GitHub repository URL.
4. Refresh SillyTavern.
5. Click the magic-wand Extensions menu beside the message input and open Chat Persona Lore.

## Usage

1. Open a chat.
2. Click the magic-wand Extensions menu.
3. Select Chat Persona Lore.
4. Fill in any fields you want: World Setting, Character Notes, User Notes, Relationship, Scene Rules, or Continuity Notes.
5. Keep Enabled checked.
6. The notes are injected only for the current chat.

## Presets

The popup includes built-in draft buttons for:

- Omegaverse
- Sentinelverse
- Sex Pistols-style furry / therian setting
- Dom/sub verse

You can also enter your own settings, type a preset name, and save the current form as a reusable preset. Saved presets can be applied or deleted from the popup.

## Prompt Priority

The injected prompt tells the model to treat Chat Persona Lore entries as mandatory chat-specific canon. The base persona should still be preserved where possible, but these chat-specific settings should not be ignored, erased, weakened, or overwritten by the base persona.

## Injection Defaults

- Position: In Chat
- Depth: 4
- Role: System

These can be changed from the extension panel.

## Notes

This extension was designed as a lighter companion to world/persona workflows such as AU World Builder. It focuses on manual per-chat control instead of automatic world generation.
