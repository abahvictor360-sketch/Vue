// Renders promo.html to frames, then ffmpeg encodes MP4. Usage: node render.cjs <outfile.mp4> [siteUrl]
const { chromium } = require("playwright");
const { execSync } = require("child_process");
const fs = require("fs"), path = require("path");
const out = path.resolve(process.argv[2] || "vue-promo-mobile.mp4");
const url = process.argv[3] || "";
const FPS = 30, DUR = 18, dir = path.join(__dirname, "frames");
fs.rmSync(dir, { recursive: true, force: true }); fs.mkdirSync(dir, { recursive: true });
(async () => {
  const b = await chromium.launch({ args: ["--allow-file-access-from-files"] });
  const pg = await (await b.newContext({ viewport: { width: 1080, height: 1920 }, deviceScaleFactor: 1 })).newPage();
  await pg.goto("file://" + path.join(__dirname, "promo.html") + (url ? "?url=" + encodeURIComponent(url) : ""));
  await pg.evaluate(() => window.ready); await pg.waitForTimeout(500);
  const N = FPS * DUR;
  for (let i = 0; i < N; i++) {
    await pg.evaluate((t) => window.seek(t), i / FPS);
    await pg.screenshot({ path: path.join(dir, `f${String(i).padStart(4, "0")}.jpg`), type: "jpeg", quality: 92 });
  }
  await b.close();
  execSync(`ffmpeg -y -loglevel error -framerate ${FPS} -i ${dir}/f%04d.jpg -c:v libx264 -preset slow -crf 18 -pix_fmt yuv420p -movflags +faststart -vf "format=yuv420p" ${out}`);
  console.log("wrote", out);
})();
