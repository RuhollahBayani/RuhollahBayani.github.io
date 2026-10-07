"""
Batch Watermarker
-----------------
Resizes every photo in a folder for Instagram and stamps a logo in the corner.

Usage:
    python3 watermark.py INPUT_FOLDER OUTPUT_FOLDER --logo logo.png

Options:
    --width 1080          Width of the finished photos in pixels (Instagram uses 1080)
    --position bottom-right   Where the logo goes: bottom-right, bottom-left, top-right, top-left
    --logo-size 0.15      Logo width as a fraction of the photo width (0.15 = 15%)
    --opacity 0.8         How see-through the logo is, from 0 (invisible) to 1 (solid)
    --margin 0.03         Gap between the logo and the edge, as a fraction of the photo width

Example:
    python3 watermark.py ~/Desktop/shoot ~/Desktop/shoot-instagram --logo logo.png --position bottom-left
"""

import argparse
import sys
from pathlib import Path

from PIL import Image, ImageOps

# File types we know how to open.
PHOTO_TYPES = {".jpg", ".jpeg", ".png", ".webp", ".tif", ".tiff"}


def resize_to_width(photo, width):
    """Shrink a photo to the given width, keeping its shape. Small photos are left as they are."""
    if photo.width <= width:
        return photo
    height = round(photo.height * width / photo.width)
    # LANCZOS is a high-quality resizing method, good for photos.
    return photo.resize((width, height), Image.LANCZOS)


def prepare_logo(logo, photo_width, logo_size, opacity):
    """Scale the logo relative to the photo and make it see-through."""
    logo_width = round(photo_width * logo_size)
    logo_height = round(logo.height * logo_width / logo.width)
    logo = logo.resize((logo_width, logo_height), Image.LANCZOS)

    # The 4th channel ("A", alpha) controls transparency.
    # Multiplying it by the opacity makes the whole logo more see-through.
    alpha = logo.getchannel("A").point(lambda value: round(value * opacity))
    logo.putalpha(alpha)
    return logo


def logo_position(photo, logo, position, margin):
    """Work out the (x, y) of the logo's top-left corner."""
    gap = round(photo.width * margin)
    left = gap
    right = photo.width - logo.width - gap
    top = gap
    bottom = photo.height - logo.height - gap
    positions = {
        "top-left": (left, top),
        "top-right": (right, top),
        "bottom-left": (left, bottom),
        "bottom-right": (right, bottom),
    }
    return positions[position]


def process_photo(path, output_folder, logo, args):
    with Image.open(path) as photo:
        # Phones and cameras often save photos sideways with a note saying
        # "rotate me". exif_transpose applies that rotation so the photo is upright.
        photo = ImageOps.exif_transpose(photo).convert("RGB")
        photo = resize_to_width(photo, args.width)

        stamp = prepare_logo(logo, photo.width, args.logo_size, args.opacity)
        x, y = logo_position(photo, stamp, args.position, args.margin)
        # The third argument is the "mask": it tells paste to respect the logo's transparency.
        photo.paste(stamp, (x, y), stamp)

        output_path = output_folder / (path.stem + ".jpg")
        photo.save(output_path, "JPEG", quality=90, optimize=True)
        return output_path, photo.size


def main():
    parser = argparse.ArgumentParser(description="Resize photos for Instagram and add a logo.")
    parser.add_argument("input_folder", type=Path, help="Folder with the original photos")
    parser.add_argument("output_folder", type=Path, help="Folder to save the finished photos in")
    parser.add_argument("--logo", type=Path, required=True, help="Logo image, ideally a PNG with a transparent background")
    parser.add_argument("--width", type=int, default=1080)
    parser.add_argument("--position", default="bottom-right",
                        choices=["bottom-right", "bottom-left", "top-right", "top-left"])
    parser.add_argument("--logo-size", type=float, default=0.15)
    parser.add_argument("--opacity", type=float, default=0.8)
    parser.add_argument("--margin", type=float, default=0.03)
    args = parser.parse_args()

    # Check the inputs before doing any work, and explain any problem clearly.
    if not args.input_folder.is_dir():
        sys.exit(f"Can't find the input folder: {args.input_folder}")
    if not args.logo.is_file():
        sys.exit(f"Can't find the logo file: {args.logo}")
    if not 0 <= args.opacity <= 1:
        sys.exit("--opacity must be between 0 and 1")

    photos = sorted(p for p in args.input_folder.iterdir() if p.suffix.lower() in PHOTO_TYPES)
    if not photos:
        sys.exit(f"No photos found in {args.input_folder} (looking for {', '.join(sorted(PHOTO_TYPES))})")

    args.output_folder.mkdir(parents=True, exist_ok=True)
    logo = Image.open(args.logo).convert("RGBA")

    print(f"Processing {len(photos)} photo(s)…")
    done = 0
    for path in photos:
        try:
            output_path, (w, h) = process_photo(path, args.output_folder, logo, args)
            print(f"  ✓ {path.name} → {output_path.name} ({w}×{h})")
            done += 1
        except Exception as error:  # one bad file shouldn't stop the whole batch
            print(f"  ✗ {path.name}: {error}")

    print(f"Done. {done} of {len(photos)} saved to {args.output_folder}")


if __name__ == "__main__":
    main()
