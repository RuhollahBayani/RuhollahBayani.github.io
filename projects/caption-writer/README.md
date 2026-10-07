# AI Caption & Alt-Text Writer

Give it a photo and Claude writes an Instagram caption, hashtags, and alt text (a short description for people who use screen readers).

## Setup (once)

1. Install the libraries:

   ```bash
   python3 -m pip install --user anthropic pillow
   ```

2. Add your API key to your Mac. Keep it private; never put it in code or share it.

   - Get a key at console.anthropic.com → API Keys.
   - Open your shell settings file in TextEdit:

     ```bash
     touch ~/.zshrc && open -e ~/.zshrc
     ```

   - Add this line at the bottom, with your key between the quotes, then save:

     ```
     export ANTHROPIC_API_KEY="your-key-here"
     ```

   - Close Terminal and open a new window so it picks up the key.

## Use it

```bash
python3 caption.py photo.jpg
```

Several photos at once, with a tone and some context:

```bash
python3 caption.py ~/Desktop/shoot/*.jpg --tone "playful, short" --about "perfume campaign for Mon Etoile" --save
```

| Option | What it does |
|---|---|
| `--tone "..."` | The voice of the caption. Default: calm and confident, no emojis |
| `--about "..."` | Context Claude can't see in the photo, like a brand or location |
| `--save` | Saves the result as `photo-caption.txt` next to each photo |

## Cost

Each photo is one request to Claude Opus 5.5. Photos are shrunk to 1568px before sending, which keeps each request to a few cents or less. You can see your usage at console.anthropic.com.
