# Walkthrough video

The video on `/guide` (`public/assets/walkthrough.mp4`, captions `walkthrough.en.vtt`, poster `walkthrough-poster.jpg`) is made here.
Not deployed: only `public/` is published.

| File | What it is |
| --- | --- |
| `SCRIPT.md` | The voiceover script with timings and the example figures |
| `cues.json` | The lines: caption text (on screen) and spoken text (for the placeholder voice) |
| `voice.py` | Makes a placeholder narration with Kokoro, plus `timings.json` and the captions |
| `stage.html` | The 1920×1080 animation. `render(t)` draws the frame at t seconds from `timings.json` |
| `render.py` | Draws every frame with Playwright and encodes with ffmpeg; muxes the narration |

## Rebuild with the placeholder voice

```
pip install kokoro-onnx soundfile playwright
# model files: kokoro-v1.0.onnx and voices-v1.0.bin from
# https://github.com/thewh1teagle/kokoro-onnx/releases/tag/model-files-v1.0
python3 video/voice.py <model dir> out/
python3 video/render.py out/ out/walkthrough.mp4          # --silent for no audio
```

## Use a real recording

Put the recording at `out/narration.wav` and write `out/timings.json` with each line's start and end (seconds) in the same
shape `voice.py` produces; the animation and captions follow it. Then run `render.py` as above.

## When the app changes

Update the figures in `stage.html` (pay table, questions, result) and the lines in `cues.json`, using the live app to get the numbers.
