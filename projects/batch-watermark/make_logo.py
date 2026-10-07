"""
Makes a simple sample logo (initials in a circle) with a transparent background,
so you can try the watermarker before you have a real logo.

Usage:
    python3 make_logo.py            # makes logo.png with "RB"
    python3 make_logo.py XY         # makes logo.png with other initials
"""

import sys

from PIL import Image, ImageDraw, ImageFont

initials = sys.argv[1] if len(sys.argv) > 1 else "RB"
size = 600

# "RGBA" with alpha 0 = a fully transparent canvas.
logo = Image.new("RGBA", (size, size), (0, 0, 0, 0))
draw = ImageDraw.Draw(logo)

# A white ring.
ring = 24
draw.ellipse((ring, ring, size - ring, size - ring), outline=(255, 255, 255, 255), width=ring)

# The initials, centred. Use a Mac system font if it's there, otherwise Pillow's built-in one.
try:
    font = ImageFont.truetype("/System/Library/Fonts/Helvetica.ttc", 230)
except OSError:
    font = ImageFont.load_default(size=230)
draw.text((size / 2, size / 2), initials, font=font, fill=(255, 255, 255, 255), anchor="mm")

logo.save("logo.png")
print("Saved logo.png")
