"""Export supplied Flow masters as scroll-friendly MP4s and first-frame WebPs.

Run from the repository root: python scripts/prepare-landing-videos.py --ffmpeg PATH
This is an asset export, independent of application build/tests. Masters are never
overwritten. FFmpeg is a local authoring tool, not a production dependency.
"""
import argparse
import json
import re
import subprocess
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
MEDIA = ROOT / 'src/presentation/public/assets/landing'
SOURCES = {
    'hero-desktop': 'hero-desktop.mp4',
    'hero-mobile': 'hero-mobile.mp4',
    'inicial-desktop': 'inicial-deskto.mp4',  # Preserve the supplied master name.
    'inicial-mobile': 'inicial-mobile.mp4',
    'boletin-desktop': 'boletin-desktop.mp4',
    'boletin-mobile': 'boletin-mobile.mp4',
}


def metadata(ffmpeg, path):
    result = subprocess.run([ffmpeg, '-hide_banner', '-i', str(path)], capture_output=True, text=True, encoding='utf-8', errors='replace')
    duration = re.search(r'Duration: (\d+):(\d+):([\d.]+)', result.stderr)
    size = re.search(r'Video:.*?\b(\d{2,5})x(\d{2,5})\b', result.stderr)
    return {
        'duration': round(int(duration[1]) * 3600 + int(duration[2]) * 60 + float(duration[3]), 3) if duration else None,
        'width': int(size[1]) if size else None,
        'height': int(size[2]) if size else None,
    }


def export_video(item, ffmpeg):
    slot, filename = item
    source = MEDIA / 'video' / filename
    output = MEDIA / 'video/web-v1' / f'{slot}.mp4'
    poster = MEDIA / 'posters/web-v1' / f'{slot}.webp'
    if not source.is_file():
        raise FileNotFoundError(source)
    output.parent.mkdir(parents=True, exist_ok=True)
    poster.parent.mkdir(parents=True, exist_ok=True)
    mobile = slot.endswith('mobile')
    scale = '720:1280' if mobile else '1440:810'
    # 24 fps, a keyframe every 6 frames, no B-frames: bound seek work per scroll.
    # faststart places the MP4 index at the front for progressive HTTP delivery.
    command = [ffmpeg, '-hide_banner', '-loglevel', 'error', '-nostdin', '-y',
               '-i', str(source), '-map', '0:v:0', '-an', '-sn', '-dn',
               '-vf', f'scale={scale}:force_original_aspect_ratio=decrease:force_divisible_by=2:flags=lanczos,setsar=1',
               '-r', '24', '-c:v', 'libx264', '-preset', 'medium', '-crf', '25',
               '-maxrate', '2200k' if mobile else '3500k', '-bufsize', '7000k',
               '-pix_fmt', 'yuv420p', '-profile:v', 'main', '-g', '6', '-keyint_min', '6',
               '-sc_threshold', '0', '-bf', '0', '-movflags', '+faststart', '-map_metadata', '-1',
               '-threads', '2', str(output)]
    subprocess.run(command, check=True)
    subprocess.run([ffmpeg, '-hide_banner', '-loglevel', 'error', '-nostdin', '-y',
                    '-i', str(output), '-frames:v', '1', '-c:v', 'libwebp', '-quality', '85',
                    str(poster)], check=True)
    original_bytes = source.stat().st_size
    exported_bytes = output.stat().st_size
    result = {
        'id': slot, 'source': source.relative_to(ROOT).as_posix(),
        'web': output.relative_to(ROOT).as_posix(), 'poster': poster.relative_to(ROOT).as_posix(),
        'originalBytes': original_bytes, 'webBytes': exported_bytes,
        'reductionPercent': round((1 - exported_bytes / original_bytes) * 100, 1),
        **metadata(ffmpeg, output),
    }
    print(f'{slot}: {original_bytes / 1e6:.2f} -> {exported_bytes / 1e6:.2f} MB ({result["reductionPercent"]}% less)', flush=True)
    return result


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--ffmpeg', required=True, help='Path to a local FFmpeg executable')
    args = parser.parse_args()
    ffmpeg = str(Path(args.ffmpeg).resolve())
    with ThreadPoolExecutor(max_workers=2) as pool:
        videos = list(pool.map(lambda item: export_video(item, ffmpeg), SOURCES.items()))
    manifest = {
        'codec': 'H.264', 'fps': 24, 'keyframeInterval': 6, 'audio': False,
        'originalBytes': sum(v['originalBytes'] for v in videos),
        'webBytes': sum(v['webBytes'] for v in videos), 'videos': videos,
    }
    manifest_path = MEDIA / 'video/web-v1/manifest.json'
    manifest_path.write_text(json.dumps(manifest, indent=2, ensure_ascii=False) + '\n', encoding='utf-8')
    print(f'Total: {manifest["originalBytes"] / 1e6:.2f} -> {manifest["webBytes"] / 1e6:.2f} MB', flush=True)


if __name__ == '__main__':
    main()
