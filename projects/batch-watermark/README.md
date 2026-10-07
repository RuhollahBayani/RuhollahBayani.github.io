# Batch Watermarker

Resizes a whole folder of photos for Instagram (1080 px wide) and stamps a logo in the corner.

## Setup (once)

```bash
python3 -m pip install --user pillow
```

## Use it

```bash
python3 watermark.py ~/Desktop/my-shoot ~/Desktop/my-shoot-instagram --logo logo.png
```

- Your original photos are never changed. Finished copies go into the output folder.
- Phone and camera photos are turned upright automatically.
- Files that aren't photos are skipped.

## Options

| Option | Default | What it does |
|---|---|---|
| `--width` | `1080` | Width of the finished photos in pixels |
| `--position` | `bottom-right` | `bottom-right`, `bottom-left`, `top-right` or `top-left` |
| `--logo-size` | `0.15` | Logo width as a fraction of the photo (0.15 = 15%) |
| `--opacity` | `0.8` | 0 = invisible, 1 = solid |
| `--margin` | `0.03` | Gap from the edge, as a fraction of the photo width |

## No logo yet?

`make_logo.py` makes a simple one with your initials in a circle:

```bash
python3 make_logo.py RB
```

Use a PNG with a transparent background for your real logo.
