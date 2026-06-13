import cv2
import numpy as np

IMG_PATH = "/root/.claude/uploads/f053a387-14bf-59d7-9a67-fe335885bb38/f720f6b7-1000020912.jpg"
OUT_FULL = "/home/user/Spinfinity/track_contours.svg"
OUT_CROP = "/home/user/Spinfinity/track_contours_crop.svg"

img = cv2.imread(IMG_PATH)
img_rgb = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
H, W = img.shape[:2]

# Red detection
r = img_rgb[:,:,0].astype(int)
g = img_rgb[:,:,1].astype(int)
b = img_rgb[:,:,2].astype(int)
red_mask = ((r > 150) & (g < 80) & (b < 80)).astype(np.uint8) * 255

# Morphological cleanup
k5 = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (5, 5))
red_mask = cv2.morphologyEx(red_mask, cv2.MORPH_CLOSE, k5)
red_mask = cv2.morphologyEx(red_mask, cv2.MORPH_OPEN, k5)

# ── Smooth edges with Gaussian blur then re-threshold ──────────────────────────
blurred = cv2.GaussianBlur(red_mask.astype(np.float32), (21, 21), 0)
smooth_mask = (blurred > 60).astype(np.uint8) * 255

# Contour detection on smoothed mask
contours, hierarchy = cv2.findContours(smooth_mask, cv2.RETR_CCOMP, cv2.CHAIN_APPROX_NONE)

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

# ── Catmull-Rom → Cubic Bézier conversion ──────────────────────────────────────
def catmull_rom_to_bezier(pts, tension=0.5):
    """Convert Catmull-Rom spline points to SVG cubic bezier path (closed)."""
    n = len(pts)
    if n < 3:
        return ""
    path = f"M {pts[0][0]:.1f},{pts[0][1]:.1f}"
    for i in range(n):
        p0 = pts[(i - 1) % n]
        p1 = pts[i]
        p2 = pts[(i + 1) % n]
        p3 = pts[(i + 2) % n]
        # Control points
        cp1x = p1[0] + (p2[0] - p0[0]) * tension / 3
        cp1y = p1[1] + (p2[1] - p0[1]) * tension / 3
        cp2x = p2[0] - (p3[0] - p1[0]) * tension / 3
        cp2y = p2[1] - (p3[1] - p1[1]) * tension / 3
        path += f" C {cp1x:.1f},{cp1y:.1f} {cp2x:.1f},{cp2y:.1f} {p2[0]:.1f},{p2[1]:.1f}"
    path += " Z"
    return path

def smooth_contour_path(cnt, n_pts=120, tension=0.5):
    """Resample contour to n_pts equidistant points then apply Catmull-Rom."""
    pts = cnt.reshape(-1, 2).astype(float)
    # Compute arc-length parameterization (open chain, wrap manually)
    diffs = np.diff(pts, axis=0)
    dists = np.sqrt((diffs**2).sum(axis=1))
    cumsum = np.concatenate([[0], np.cumsum(dists)])  # length n
    total = cumsum[-1]
    t = np.linspace(0, total, n_pts, endpoint=False)
    # Interpolate x and y
    xs = np.interp(t, cumsum, pts[:,0])
    ys = np.interp(t, cumsum, pts[:,1])
    resampled = list(zip(xs, ys))
    return catmull_rom_to_bezier(resampled, tension)

# Number of points: more for outer (longer), fewer for holes
outer_d = smooth_contour_path(track_outer[1], n_pts=160, tension=0.4)
holes_d = []
for _, cnt, area in track_holes:
    n = max(40, min(100, int(len(cnt) * 0.6)))
    holes_d.append(smooth_contour_path(cnt, n_pts=n, tension=0.4))

combined_d = outer_d + " " + " ".join(holes_d)

def make_svg(vx, vy, vw, vh, out_w=None, out_h=None):
    ow = out_w or vw
    oh = out_h or vh
    hole_paths = "\n  ".join(
        f'<path fill="none" stroke="#CC0000" stroke-width="3" stroke-linejoin="round" d="{d}"/>'
        for d in holes_d if d
    )
    return f'''<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg"
     width="{ow}" height="{oh}"
     viewBox="{vx} {vy} {vw} {vh}">

  <!-- Track fill: evenodd so holes are transparent -->
  <path fill-rule="evenodd" fill="rgba(220,30,30,0.30)"
        d="{combined_d}"/>

  <!-- Exterior contour (smooth) -->
  <path fill="none" stroke="#FF0000" stroke-width="3.5"
        stroke-linejoin="round" stroke-linecap="round"
        d="{outer_d}"/>

  <!-- Interior contours (smooth) -->
  {hole_paths}
</svg>'''

# Bounding box
all_pts = np.vstack([track_outer[1].reshape(-1,2)] + [c.reshape(-1,2) for _,c,_ in track_holes])
x0, y0 = int(all_pts[:,0].min()), int(all_pts[:,1].min())
x1, y1 = int(all_pts[:,0].max()), int(all_pts[:,1].max())
PAD = 40
x0, y0 = max(0, x0-PAD), max(0, y0-PAD)
x1, y1 = min(W, x1+PAD), min(H, y1+PAD)
cw, ch = x1-x0, y1-y0

with open(OUT_FULL, "w") as f:
    f.write(make_svg(0, 0, W, H))
print(f"Full SVG: {OUT_FULL}")

scale = 800 / cw
with open(OUT_CROP, "w") as f:
    f.write(make_svg(x0, y0, cw, ch, int(cw*scale), int(ch*scale)))
print(f"Crop SVG: {OUT_CROP}")

# Debug image
debug = img.copy()
# Re-extract from smooth mask for display
contours2, hier2 = cv2.findContours(smooth_mask, cv2.RETR_CCOMP, cv2.CHAIN_APPROX_NONE)
cv2.drawContours(debug, [track_outer[1]], -1, (0,255,0), 3)
for _, cnt, _ in track_holes:
    cv2.drawContours(debug, [cnt], -1, (0,128,255), 3)
cv2.imwrite("/home/user/Spinfinity/debug_contours.jpg", debug)
print("Debug image saved.")
