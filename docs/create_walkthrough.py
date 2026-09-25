"""Build a captioned product walkthrough from captured production screenshots.

Requires Pillow and ffmpeg. The screenshots in docs/media contain only synthetic
Voltaris records and were captured from the deployed products.
"""

from __future__ import annotations

import subprocess
import tempfile
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont


ROOT = Path(__file__).resolve().parent
MEDIA = ROOT / "media"
OUTPUT = ROOT / "voltaris-walkthrough.mp4"
FONT = Path("/System/Library/Fonts/Supplemental/Arial.ttf")
BOLD = Path("/System/Library/Fonts/Supplemental/Arial Bold.ttf")
SIZE = (1280, 720)

SCENES = [
    ("title", 4, "", ""),
    ("01-command-incident.jpg", 7, "01 / Command", "An EV charger fault enters a real operations queue."),
    ("06-command-analysis.jpg", 9, "Evidence-backed assessment", "The AI finding cites stored runbooks, maintenance, and contract records."),
    ("02-command-evidence.jpg", 7, "Inspect the sources", "Every cited excerpt can be opened and checked."),
    ("08-command-work-order.jpg", 9, "Human-approved dispatch", "Skill, availability, SLA risk, and forecast cost precede a scheduled order."),
    ("03-command-audit.jpg", 7, "Accountable actions", "Analysis, proposal, and approval are recorded in the audit trail."),
    ("04-margin-overview.jpg", 9, "02 / Margin", "Actual revenue, cost, and margin come from posted PostgreSQL events."),
    ("05-margin-backlog.jpg", 9, "One connected data model", "Command's approved order appears as forecast backlog, outside actual margin."),
    ("10-margin-ai-answer.jpg", 9, "Ask the business", "AI explains computed metrics and keeps the underlying numbers visible."),
    ("09-margin-safe-fallback.jpg", 5, "A safe fallback", "Unsupported AI wording yields a clearly labeled computed answer."),
    ("11-margin-records.jpg", 8, "Trace every figure", "Managers can inspect the posted financial source records."),
    ("outro", 7, "", ""),
]


def font(size: int, bold: bool = False) -> ImageFont.FreeTypeFont:
    return ImageFont.truetype(str(BOLD if bold else FONT), size)


def solid_slide(title: bool) -> Image.Image:
    image = Image.new("RGB", SIZE, "#1d2535")
    draw = ImageDraw.Draw(image)
    for y in range(720):
        alpha = y / 720
        draw.line((0, y, 1280, y), fill=(int(29 + 12 * alpha), int(37 + 10 * alpha), int(53 + 24 * alpha)))
    draw.rounded_rectangle((86, 92, 146, 152), radius=14, fill="#d87755")
    draw.text((105, 104), "V", font=font(37, True), fill="white")
    draw.text((166, 99), "VOLTARIS ENERGY", font=font(25, True), fill="white")
    draw.line((87, 183, 1190, 183), fill="#465164", width=2)
    if title:
        draw.text((88, 252), "Two connected products.", font=font(59, True), fill="white")
        draw.text((88, 334), "One accountable workflow.", font=font(59, True), fill="white")
        draw.text((90, 454), "COMMAND  /  MARGIN", font=font(29, True), fill="#e18a6d")
        draw.text((90, 571), "90-second product walkthrough  ·  fictional data  ·  real workflows", font=font(23), fill="#d3d9e4")
    else:
        draw.text((88, 252), "Explore the live products", font=font(63, True), fill="white")
        draw.text((90, 380), "Command  ·  voltaris-energy-platform-command.vercel.app", font=font(26), fill="#e4e9f2")
        draw.text((90, 429), "Margin       ·  voltaris-energy-platform-margin.vercel.app", font=font(26), fill="#e4e9f2")
        draw.text((90, 578), "Source and case study: github.com/code-cra7t/voltaris-energy-platform", font=font(22), fill="#e18a6d")
    return image


def screenshot_slide(filename: str, heading: str, detail: str) -> Image.Image:
    image = Image.open(MEDIA / filename).convert("RGB").resize(SIZE, Image.Resampling.LANCZOS).convert("RGBA")
    layer = Image.new("RGBA", SIZE, (0, 0, 0, 0))
    draw = ImageDraw.Draw(layer)
    draw.rectangle((0, 608, 1280, 720), fill=(24, 32, 48, 236))
    draw.rounded_rectangle((47, 630, 53, 692), radius=3, fill="#df835f")
    draw.text((74, 624), heading, font=font(30, True), fill="white")
    draw.text((75, 667), detail, font=font(21), fill="#e6e9f0")
    return Image.alpha_composite(image, layer).convert("RGB")


def run(command: list[str]) -> None:
    result = subprocess.run(command, capture_output=True, text=True)
    if result.returncode:
        raise RuntimeError(result.stderr[-3000:])


def main() -> None:
    assert sum(duration for _, duration, _, _ in SCENES) == 90
    with tempfile.TemporaryDirectory(prefix="voltaris-walkthrough-") as temp:
        folder = Path(temp)
        clips = []
        for index, (source, seconds, heading, detail) in enumerate(SCENES):
            image = solid_slide(source == "title") if source in {"title", "outro"} else screenshot_slide(source, heading, detail)
            frame = folder / f"frame-{index:02d}.png"
            clip = folder / f"clip-{index:02d}.mp4"
            image.save(frame)
            run([
                "ffmpeg", "-hide_banner", "-loglevel", "error", "-y", "-loop", "1", "-framerate", "24",
                "-i", str(frame), "-t", str(seconds),
                "-vf", f"zoompan=z='min(zoom+0.00018,1.045)':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=1:s=1280x720:fps=24,fade=t=in:st=0:d=0.25,fade=t=out:st={seconds-0.25}:d=0.25",
                "-c:v", "libx264", "-preset", "veryfast", "-crf", "23", "-pix_fmt", "yuv420p", "-r", "24", str(clip),
            ])
            clips.append(clip)
            print(f"Rendered scene {index + 1}/{len(SCENES)}", flush=True)
        playlist = folder / "playlist.txt"
        playlist.write_text("".join(f"file '{clip}'\n" for clip in clips))
        run(["ffmpeg", "-hide_banner", "-loglevel", "error", "-y", "-f", "concat", "-safe", "0", "-i", str(playlist), "-c", "copy", "-movflags", "+faststart", str(OUTPUT)])
    print(f"Created {OUTPUT}")


if __name__ == "__main__":
    main()
