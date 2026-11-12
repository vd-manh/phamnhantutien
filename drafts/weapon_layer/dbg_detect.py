import sys, os
import numpy as np
from PIL import Image
import cv2
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from detect import detect

d = sys.argv[1]
outs = []
for i in range(6):
    fr = np.asarray(Image.open(f"{d}/f{i}.png").convert("RGB")).copy()
    r = detect(fr, cx=fr.shape[1] / 2)
    dbg = fr.copy()
    if r is None:
        print(i, "NOT FOUND")
    else:
        dbg[r["mask"]] = (255, 0, 0)
        cv2.circle(dbg, tuple(int(v) for v in r["grip"]), 8, (0, 200, 0), 3)
        cv2.circle(dbg, tuple(int(v) for v in r["tip"]), 8, (255, 0, 255), 3)
        print(i, "len %.0f grip %s tip %s" % (r["length"], r["grip"].round(), r["tip"].round()))
    outs.append(dbg)
o = np.concatenate(outs, 1)[250:600]
Image.fromarray(o).save(f"{d}/detect.png")
