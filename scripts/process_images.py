import os, sys
from PIL import Image
import numpy as np, cv2
from rembg import remove, new_session

SRC = "/root/.claude/uploads/acdaaf28-8606-5c80-b179-4fac7c136e4a/"
OUT = "/home/user/Vue/src/assets/img/"
os.makedirs(OUT, exist_ok=True)

# (uploadId, slug)
IMAGES = [
 ("c8d10d29","field-chore-jacket"),("8b27071c","linen-boxy-shirt"),("d13295fc","cloud-zip-hoodie"),
 ("414a2b85","rust-corduroy-suit"),("3a29797b","sage-wide-leg-suit"),("ea96d3ce","sunburst-kaftan-set"),
 ("78d83e6e","butter-poplin-set"),("5c74b6e7","mocha-knit-cardigan"),("bb4f57f2","ivory-pleated-jumpsuit"),
 ("8b793ecc","indigo-denim-set"),("06e30390","aso-oke-gele-set"),("52e090b9","ember-knit-denim"),
 ("95d10d2a","cobalt-stripe-cardigan"),("ee912c86","palm-print-blazer"),("dd1b3dea","charcoal-crew-denim"),
 ("39e608c7","sand-resort-set"),("b6816bb1","stone-wash-hoodie-set"),
]
# UI overlays to inpaint: slug -> list of (x0,y0,x1,y1) in source px
INPAINT = {
 "field-chore-jacket": [(15,840,85,895)],
 "linen-boxy-shirt": [(645,15,725,65),(18,840,75,895)],
}
CUTOUTS = ["sunburst-kaftan-set","ivory-pleated-jumpsuit","sand-resort-set","charcoal-crew-denim","palm-print-blazer","sage-wide-leg-suit","cobalt-stripe-cardigan","field-chore-jacket"]

sess = new_session("u2net_human_seg")
for uid, slug in IMAGES:
    im = Image.open(f"{SRC}{uid}-image.jpg").convert("RGB")
    if slug in INPAINT:
        arr = cv2.cvtColor(np.array(im), cv2.COLOR_RGB2BGR)
        mask = np.zeros(arr.shape[:2], np.uint8)
        for x0,y0,x1,y1 in INPAINT[slug]: mask[y0:y1,x0:x1] = 255
        arr = cv2.inpaint(arr, mask, 7, cv2.INPAINT_TELEA)
        im = Image.fromarray(cv2.cvtColor(arr, cv2.COLOR_BGR2RGB))
    # upscale 1.5x with lanczos for crisper display on retina; keep modest size
    w,h = im.size
    big = im.resize((int(w*1.5), int(h*1.5)), Image.LANCZOS)
    big.save(f"{OUT}{slug}.webp", "WEBP", quality=88, method=6)
    if slug in CUTOUTS:
        cut = remove(big, session=sess, alpha_matting=True, alpha_matting_foreground_threshold=240, alpha_matting_background_threshold=15, alpha_matting_erode_size=8)
        bbox = cut.getbbox()
        cut = cut.crop(bbox)
        cut.save(f"{OUT}{slug}-cutout.webp", "WEBP", quality=90, method=6, lossless=False)
        print("cutout", slug, cut.size)
    print("ok", slug)
