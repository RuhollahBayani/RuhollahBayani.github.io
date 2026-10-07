# Shot-list Skill for Claude

A Claude Skill that turns a client brief into a full photo shoot plan: shot list, lighting setups, schedule, retouch and grade plan, and gear checklist.

A Skill is a set of instructions Claude loads automatically when a task matches. You don't need code or an API key, so it works in the Claude app.

## Add it to Claude

1. Zip the `shot-list` folder: right-click it in Finder → **Compress "shot-list"**.
2. In Claude, open **Settings → Capabilities → Skills** and upload `shot-list.zip`.
3. Start a chat and paste a brief, such as "Plan a 2-hour studio portrait shoot, low-key, black suit, 5 finals for Instagram".

To use it in Claude Code instead, copy the `shot-list` folder into `~/.claude/skills/`.

## Make it yours

Edit `shot-list/SKILL.md`: change the sections, your usual lenses, your export sizes or your writing style. Claude follows whatever the file says.

See `example.md` for a plan it produced from a real brief.
