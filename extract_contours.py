import cv2
import numpy as np

IMG_PATH = "/root/.claude/uploads/f053a387-14bf-59d7-9a67-fe335885bb38/f720f6b7-1000020912.jpg"
OUT_FULL = "/home/user/Spinfinity/track_contours.svg"
OUT_CROP = "/home/user/Spinfinity/track_contours_crop.svg"

img = cv2.imread(IMG_PATH)
img_rgb = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
H, W = img.shape[:2]

# ── Red mask (same as v1) ───────────────────────────────────────────────────
r = img_rgb[:,:,0].astype(int)
g = img_rgb[:,:,1].astype(int)
b = img_rgb[:,:,2].astype(int)
red_mask = ((r > 150) & (g < 80) & (b < 80)).astype(np.uint8) * 255

k5 = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (5, 5))
red_mask = cv2.morphologyEx(red_mask, cv2.MORPH_CLOSE, k5)
red_mask = cv2.morphologyEx(red_mask, cv2.MORPH_OPEN, k5)

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

# ── Smooth contour coordinates with Gaussian sliding window ────────────────
def smooth_contour(cnt, sigma=4):
    """Apply Gaussian smoothing to contour point coordinates (cyclic)."""
    pts = cnt.reshape(-1, 2).astype(float)
    n = len(pts)
    # Build Gaussian kernel
    ksize = int(6 * sigma) | 1   # odd, ~3*sigma each side
    half = ksize // 2
    x = np.arange(-half, half + 1)
    kernel = np.exp(-x**2 / (2 * sigma**2))
    kernel /= kernel.sum()
    # Cyclic convolution
    xs = np.pad(pts[:,0], half, mode='wrap')
    ys = np.pad(pts[:,1], half, mode='wrap')
    xs_smooth = np.convolve(xs, kernel, mode='valid')
    ys_smooth = np.convolve(ys, kernel, mode='valid')
    return np.stack([xs_smooth, ys_smooth], axis=1)

def pts_to_path(pts):
    d = f"M {pts[0][0]:.1f},{pts[0][1]:.1f}"
    for pt in pts[1:]:
        d += f" L {pt[0]:.1f},{pt[1]:.1f}"
    d += " Z"
    return d

def contour_to_path(cnt, epsilon=0.002, sigma=4):
    """Smooth coordinates then simplify with approxPolyDP."""
    smoothed = smooth_contour(cnt, sigma=sigma)
    # Wrap back to OpenCV format for approxPolyDP
    pts_cv = smoothed.reshape(-1,1,2).astype(np.float32)
    peri = cv2.arcLength(pts_cv, True)
    eps = max(1.0, epsilon * peri)
    approx = cv2.approxPolyDP(pts_cv, eps, True)
    return pts_to_path(approx.reshape(-1, 2))

# sigma=4 → smooths ~12px ripples, preserves overall shape
outer_d  = contour_to_path(track_outer[1], epsilon=0.0008, sigma=4)
holes_d  = [contour_to_path(cnt, epsilon=0.001, sigma=3) for _, cnt, _ in track_holes]

combined_d = outer_d + " " + " ".join(holes_d)

def make_svg(vx, vy, vw, vh, out_w=None, out_h=None):
    ow = out_w or vw
    oh = out_h or vh
    hole_paths = "\n  ".join(
        f'<path fill="none" stroke="#CC0000" stroke-width="3"'
        f' stroke-linejoin="round" stroke-linecap="round" d="{d}"/>'
        for d in holes_d if d
    )
    return f'''<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg"
     width="{ow}" height="{oh}"
     viewBox="{vx} {vy} {vw} {vh}">

  <!-- Track fill: evenodd so holes are transparent -->
  <path fill-rule="evenodd" fill="rgba(220,30,30,0.30)"
        d="{combined_d}"/>

  <!-- Exterior contour -->
  <path fill="none" stroke="#FF0000" stroke-width="3.5"
        stroke-linejoin="round" stroke-linecap="round"
        d="{outer_d}"/>

  <!-- Interior contours -->
  {hole_paths}
</svg>'''

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

# Debug overlay
debug = img.copy()
smooth_outer = smooth_contour(track_outer[1], sigma=4).astype(np.int32).reshape(-1,1,2)
cv2.polylines(debug, [smooth_outer], True, (0,255,0), 3)
for _, cnt, _ in track_holes:
    sc = smooth_contour(cnt, sigma=3).astype(np.int32).reshape(-1,1,2)
    cv2.polylines(debug, [sc], True, (0,128,255), 3)
cv2.imwrite("/home/user/Spinfinity/debug_contours.jpg", debug)
print("Debug saved.")
