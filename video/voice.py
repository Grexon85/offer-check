"""Make the narration: one clip per cue, then a single track with gaps, plus timings.json for the stage and captions.
Usage: python3 video/voice.py <kokoro model dir> <out dir>
Needs: pip install kokoro-onnx soundfile; model files kokoro-v1.0.onnx and voices-v1.0.bin from
https://github.com/thewh1teagle/kokoro-onnx/releases/tag/model-files-v1.0"""
import json, sys, os
import numpy as np, soundfile as sf
from kokoro_onnx import Kokoro

here = os.path.dirname(os.path.abspath(__file__))
model_dir, out = sys.argv[1], sys.argv[2]
os.makedirs(out, exist_ok=True)
cfg = json.load(open(os.path.join(here, "cues.json")))
k = Kokoro(os.path.join(model_dir, "kokoro-v1.0.onnx"), os.path.join(model_dir, "voices-v1.0.bin"))

SR = 24000
lead = 0.45                        # silence before the first line
track, t, prev_scene, timings = [np.zeros(int(lead * SR), dtype=np.float32)], lead, None, []
for i, c in enumerate(cfg["cues"]):
    if prev_scene is not None:
        gap = cfg["sceneGap"] if c["scene"] != prev_scene else cfg["gap"]
        track.append(np.zeros(int(gap * SR), dtype=np.float32)); t += gap
    samples, sr = k.create(c["say"], voice=cfg["voice"], speed=cfg["speed"], lang="en-gb")
    assert sr == SR
    # trim leading/trailing near-silence so gaps are what we set
    idx = np.where(np.abs(samples) > 0.01)[0]
    samples = samples[max(0, idx[0] - 240): idx[-1] + 2400] if len(idx) else samples
    dur = len(samples) / SR
    timings.append({"i": i, "scene": c["scene"], "caption": c["caption"], "start": round(t, 3), "end": round(t + dur, 3)})
    track.append(samples.astype(np.float32)); t += dur
    prev_scene = c["scene"]
    print(f"{i:2d} {c['scene']:5s} {t - dur:6.2f} → {t:6.2f}  {c['caption'][:60]}")

tail = 2.2                         # hold the end card
track.append(np.zeros(int(tail * SR), dtype=np.float32)); t += tail
audio = np.concatenate(track)
sf.write(os.path.join(out, "narration.wav"), audio, SR)
json.dump({"duration": round(t, 3), "cues": timings}, open(os.path.join(out, "timings.json"), "w"), indent=1)

def ts(x):
    h, m = divmod(x, 3600); m, s = divmod(m, 60)
    return f"{int(h):02d}:{int(m):02d}:{s:06.3f}"
with open(os.path.join(out, "walkthrough.en.vtt"), "w") as f:
    f.write("WEBVTT\n")
    for c in timings:
        f.write(f"\n{c['i'] + 1}\n{ts(c['start'])} --> {ts(c['end'])}\n{c['caption']}\n")
print(f"total {t:.2f}s")
