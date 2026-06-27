# Chat Persona Lore

Chat Persona Lore is a small SillyTavern extension for chat-specific persona and world notes.

It does not edit your base persona. Instead, it saves extra notes per chat and injects them into the generation prompt through SillyTavern's extension prompt API.

## What It Is For

- Add a world setting that applies only to the current chat.
- Add temporary or alternate character settings.
- Add user persona additions for one room.
- Keep relationship dynamics, tone rules, and continuity notes separate from the base persona.
- Preview exactly what will be injected.

## Install

1. Upload this folder as the root of a GitHub repository.
2. In SillyTavern, open Extensions.
3. Use Install Extension and paste the GitHub repository URL.
4. Refresh SillyTavern.
5. Open Extensions settings and find Chat Persona Lore.

## Usage

1. Open a chat.
2. Fill in any fields you want: World Setting, Character Notes, User Notes, Relationship, Scene Rules, or Continuity Notes.
3. Keep Enabled checked.
4. The notes are injected only for the current chat.

## Injection Defaults

- Position: In Chat
- Depth: 4
- Role: System

These can be changed from the extension panel.

## Notes

This extension was designed as a lighter companion to world/persona workflows such as AU World Builder. It focuses on manual per-chat control instead of automatic world generation.
