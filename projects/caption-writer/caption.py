"""
AI Caption & Alt-Text Writer
----------------------------
Sends a photo to Claude and gets back:
  - an Instagram caption
  - hashtags
  - alt text (a description for people using screen readers)

Usage:
    python3 caption.py photo.jpg
    python3 caption.py shoot/*.jpg --tone "playful, short" --save

Options:
    --tone "..."   The voice of the caption (default: calm and confident, no emojis)
    --about "..."  Extra context Claude can't see in the photo, e.g. "perfume campaign for Mon Etoile"
    --save         Also save the results as a .txt file next to each photo

Setup (once):
    python3 -m pip install --user anthropic pillow
    Then add your API key to your Mac (see README.md). The key is never written in this file.
"""

import argparse
import base64
import io
import json
import os
import sys
from pathlib import Path

import anthropic
from PIL import Image, ImageOps

MODEL = "claude-opus-5-5"

# Claude works best with images up to about 1568px on the long side, and big camera
# files are slow to upload, so every photo is shrunk to this size first.
MAX_SIDE = 1568

# The exact shape of the answer we want back. Claude is required to follow it,
# so the result can always be read as JSON.
RESULT_SCHEMA = {
    "type": "object",
    "properties": {
        "caption": {"type": "string"},
        "hashtags": {"type": "array", "items": {"type": "string"}},
        "alt_text": {"type": "string"},
    },
    "required": ["caption", "hashtags", "alt_text"],
    "additionalProperties": False,
}

INSTRUCTIONS = """You write social media copy for a photographer and retoucher's Instagram.

Look at the photo and return:
- caption: 1 to 3 short lines in the requested tone. Speak about the image and the mood, not about "this photo". No hashtags in the caption.
- hashtags: 8 to 15 relevant hashtags, each starting with #, mixing specific ones (subject, style, technique) with a few broader photography ones.
- alt_text: one or two plain sentences describing what is visibly in the image for someone who can't see it. Describe people by what they wear, do and express, not by assumed identity. Under 250 characters.

Never invent facts the photo doesn't show, such as names, places or brands, unless they're given in the context below."""


def photo_as_base64_jpeg(path):
    """Open a photo, turn it upright, shrink it, and return it as base64 JPEG text."""
    with Image.open(path) as img:
        img = ImageOps.exif_transpose(img).convert("RGB")
        img.thumbnail((MAX_SIDE, MAX_SIDE))  # shrinks in place, keeping the shape
        buffer = io.BytesIO()
        img.save(buffer, "JPEG", quality=88)
    return base64.standard_b64encode(buffer.getvalue()).decode("utf-8")


def describe_photo(client, path, tone, about):
    prompt = f"Tone: {tone}"
    if about:
        prompt += f"\nContext from the photographer: {about}"

    response = client.beta.messages.create(
        model=MODEL,
        max_tokens=4000,
        system=INSTRUCTIONS,
        messages=[{
            "role": "user",
            "content": [
                {
                    "type": "image",
                    "source": {
                        "type": "base64",
                        "media_type": "image/jpeg",
                        "data": photo_as_base64_jpeg(path),
                    },
                },
                {"type": "text", "text": prompt},
            ],
        }],
        output_config={
            "effort": "low",  # a simple task, so a quick, inexpensive answer is enough
            "format": {"type": "json_schema", "schema": RESULT_SCHEMA},
        },
        # If Claude's safety checks decline a request, retry it on Anthropic's
        # recommended fallback model instead of failing.
        betas=["server-side-fallback-2026-07-01"],
        fallbacks="default",
    )

    if response.stop_reason == "refusal":
        raise RuntimeError("Claude declined to describe this photo.")
    if response.stop_reason == "max_tokens":
        raise RuntimeError("The answer was cut off. Try again.")

    text = next(block.text for block in response.content if block.type == "text")
    return json.loads(text)


def format_result(result):
    return (
        f"Caption:\n{result['caption']}\n\n"
        f"Hashtags:\n{' '.join(result['hashtags'])}\n\n"
        f"Alt text:\n{result['alt_text']}\n"
    )


def main():
    parser = argparse.ArgumentParser(description="Write Instagram captions, hashtags and alt text with Claude.")
    parser.add_argument("photos", nargs="+", type=Path, help="One or more photo files")
    parser.add_argument("--tone", default="calm and confident, no emojis")
    parser.add_argument("--about", default="", help="Context Claude can't see in the photo")
    parser.add_argument("--save", action="store_true", help="Save a .txt next to each photo")
    args = parser.parse_args()

    # Reads your key from the ANTHROPIC_API_KEY setting on your Mac.
    if not os.environ.get("ANTHROPIC_API_KEY"):
        sys.exit("No API key found. Add ANTHROPIC_API_KEY to your Mac first (see README.md).")
    client = anthropic.Anthropic()

    for path in args.photos:
        if not path.is_file():
            print(f"✗ Can't find {path}\n")
            continue

        print(f"── {path.name} ──")
        try:
            result = describe_photo(client, path, args.tone, args.about)
        except anthropic.AuthenticationError:
            sys.exit("Your API key wasn't accepted. Check the ANTHROPIC_API_KEY setting (see README.md).")
        except anthropic.RateLimitError:
            print("✗ Too many requests right now. Wait a minute and try again.\n")
            continue
        except anthropic.APIConnectionError:
            sys.exit("Couldn't reach the Claude API. Check your internet connection.")
        except anthropic.APIStatusError as error:
            print(f"✗ The API returned an error ({error.status_code}): {error.message}\n")
            continue
        except (RuntimeError, OSError) as error:
            print(f"✗ {error}\n")
            continue

        text = format_result(result)
        print(text)
        if args.save:
            out = path.with_name(path.stem + "-caption.txt")
            out.write_text(text, encoding="utf-8")
            print(f"Saved to {out.name}\n")


if __name__ == "__main__":
    main()
