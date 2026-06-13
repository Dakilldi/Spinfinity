import cv2
import numpy as np

IMG_PATH = "/root/.claude/uploads/f053a387-14bf-59d7-9a67-fe335885bb38/f720f6b7-1000020912.jpg"
OUT_FULL  = "/home/user/Spinfinity/track_contours.svg"
OUT_CROP  = "/home/user/Spinfinity/track_contours_crop.svg"

img = cv2.imread(IMG_PATH)
img_rgb = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
H, W = img.shape[:2]

# Red detection
r = img_rgb[:,:,0].astype(int)
g = img_rgb[:,:,1].astype(int)
b = img_rgb[:,:,2].astype(int)
red_mask = ((r > 150) & (g < 80) & (b < 80)).astype(np.uint8) * 255

kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (5,5))
red_mask = cv2.morphologyEx(red_mask, cv2.MORPH_CLOSE, kernel)
red_mask = cv2.morphologyEx(red_mask, cv2.MORPH_OPEN, kernel)

contours, hierarchy = cv2.findContours(red_mask, cv2.RETR_CCOMP, cv2.CHAIN_APPROX_TC89_KCOS)

MIN_AREA = 3000
track_outer = None
track_holes = []

for i, cnt in enumerate(contours):
    area = cv2.contourArea(cnt)
    if area < MIN_AREA:
        continue
    parent = hierarchy[0][i][3]
    if parent == -1:
        if track_outer is None or area > cv2.contourArea(track_outer[1]):
            track_outer = (i, cnt, area)
    else:
        track_holes.append((i, cnt, area))

print(f"Outer: area={track_outer[2]:.0f}, raw pts={len(track_outer[1])}")
for idx, cnt, area in track_holes:
    print(f"  Hole {idx}: area={area:.0f}, pts={len(cnt)}")

def approx_to_path(cnt, epsilon=0.001):
    peri = cv2.arcLength(cnt, True)
    eps = max(0.8, epsilon * peri)
    approx = cv2.approxPolyDP(cnt, eps, True)
    pts = approx.reshape(-1, 2)
    if len(pts) < 3:
        return "", pts
    d = f"M {pts[0][0]:.1f},{pts[0][1]:.1f}"
    for pt in pts[1:]:
        d += f" L {pt[0]:.1f},{pt[1]:.1f}"
    d += " Z"
    return d, pts

outer_d, outer_pts = approx_to_path(track_outer[1], 0.0008)
holes_d = []
for _, cnt, _ in track_holes:
    d, _ = approx_to_path(cnt, 0.001)
    if d:
        holes_d.append(d)

# Bounding box of the track with padding
all_cnts = [track_outer[1]] + [cnt for _, cnt, _ in track_holes]
all_pts = np.vstack([c.reshape(-1, 2) for c in all_cnts])
x0, y0 = int(all_pts[:,0].min()), int(all_pts[:,1].min())
x1, y1 = int(all_pts[:,0].max()), int(all_pts[:,1].max())
PAD = 30
x0, y0 = max(0, x0-PAD), max(0, y0-PAD)
x1, y1 = min(W, x1+PAD), min(H, y1+PAD)
cw, ch = x1-x0, y1-y0

print(f"\nBounding box: ({x0},{y0}) -> ({x1},{y1}), size={cw}x{ch}")

combined_d = outer_d + " " + " ".join(holes_d)

def make_svg(vx, vy, vw, vh, out_w=None, out_h=None):
    ow = out_w or vw
    oh = out_h or vh
    hole_paths = "\n  ".join(
        f'<path fill="none" stroke="#CC0000" stroke-width="3" stroke-linejoin="round" d="{d}"/>'
        for d in holes_d
    )
    return f'''<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg"
     width="{ow}" height="{oh}"
     viewBox="{vx} {vy} {vw} {vh}">

  <!-- Track fill (evenodd: interior voids = transparent) -->
  <path
    fill-rule="evenodd"
    fill="rgba(220,30,30,0.30)"
    d="{combined_d}"/>

  <!-- Exterior contour -->
  <path fill="none" stroke="#FF0000" stroke-width="3.5"
        stroke-linejoin="round" d="{outer_d}"/>

  <!-- Interior contours -->
  {hole_paths}
</svg>'''

# Full-image SVG
with open(OUT_FULL, "w") as f:
    f.write(make_svg(0, 0, W, H))
print(f"Full SVG saved: {OUT_FULL}")

# Cropped SVG (track only, ~800px wide for readability)
scale = 800 / cw
with open(OUT_CROP, "w") as f:
    f.write(make_svg(x0, y0, cw, ch, int(cw*scale), int(ch*scale)))
print(f"Crop SVG saved: {OUT_CROP}")
