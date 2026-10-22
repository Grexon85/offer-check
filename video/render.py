"""Render the walkthrough: draw stage.html frame by frame, then mux with the narration.
Usage: python3 video/render.py <dir with timings.json [+ narration.wav]> <out.mp4> [--silent] [--frames a,b,c]
Serve nothing: the stage is opened from disk. Needs Playwright (Chromium) and ffmpeg."""
import asyncio, json, os, subprocess, sys
from playwright.async_api import async_playwright

here = os.path.dirname(os.path.abspath(__file__))
src, out = sys.argv[1], sys.argv[2]
silent = "--silent" in sys.argv
only = None
if "--frames" in sys.argv:
    only = [float(x) for x in sys.argv[sys.argv.index("--frames") + 1].split(",")]
timings = json.load(open(os.path.join(src, "timings.json")))
FPS = 30

async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch()
        pg = await b.new_page(viewport={"width": 1920, "height": 1080})
        await pg.goto("file://" + os.path.join(here, "stage.html"))
        await pg.evaluate("document.fonts.ready")
        await pg.evaluate("t => init(t)", timings)
        await pg.evaluate("document.fonts.ready")
        if only:
            for t in only:
                await pg.evaluate(f"render({t})")
                await pg.screenshot(path=f"{out}-{t:06.2f}.png")
            await b.close(); return
        n = int(timings["duration"] * FPS)
        vid = out + ".video.mp4"
        ff = subprocess.Popen(["ffmpeg", "-v", "error", "-y", "-f", "image2pipe", "-framerate", str(FPS), "-c:v", "mjpeg", "-i", "-",
                               "-c:v", "libx264", "-preset", "slow", "-crf", "20", "-pix_fmt", "yuv420p", "-tune", "animation", vid],
                              stdin=subprocess.PIPE)
        for f in range(n):
            await pg.evaluate(f"render({f / FPS})")
            ff.stdin.write(await pg.screenshot(type="jpeg", quality=95))
            if f % 300 == 0: print(f"frame {f}/{n}", flush=True)
        ff.stdin.close(); ff.wait()
        await b.close()
        if silent:
            os.replace(vid, out)
        else:
            subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", vid, "-i", os.path.join(src, "narration.wav"),
                            "-c:v", "copy", "-c:a", "aac", "-b:a", "128k", "-ar", "44100", "-ac", "1",
                            "-af", "loudnorm=I=-16:TP=-1.5:LRA=11", "-shortest", "-movflags", "+faststart", out], check=True)
            os.remove(vid)
        print("wrote", out)

asyncio.run(main())
