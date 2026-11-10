// Vue — tiny static site builder. Stitches partials into pages, emits product pages, sitemap, robots.
import fs from "node:fs";
import path from "node:path";

const ROOT = path.dirname(new URL(import.meta.url).pathname);
const SRC = path.join(ROOT, "src");
const OUT = path.join(ROOT, "dist");
const SITE = process.env.SITE_URL || "https://vue-fashion.vercel.app";
const products = JSON.parse(fs.readFileSync(path.join(SRC, "data/products.json"), "utf8"));

fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(OUT, { recursive: true });

const partial = (n) => fs.readFileSync(path.join(SRC, "partials", n + ".html"), "utf8");
const header = partial("header"), footer = partial("footer"), head = partial("head");
const looks = products.map((p) => `<a class="mitem reveal" href="/product/${p.id}" data-full="/assets/img/${p.id}.webp" data-name="${p.name}"><img loading="lazy" src="/assets/img/${p.id}.webp" alt="${p.name}"><span class="glass">${p.name} · $${p.price}</span></a>`).join("");
const money = (n) => "$" + n.toFixed(0);

function render(html, meta) {
  const nav = (key) => (meta.nav === key ? ' aria-current="page"' : "");
  let h = head
    .replaceAll("{{TITLE}}", meta.title)
    .replaceAll("{{DESC}}", meta.desc)
    .replaceAll("{{URL}}", SITE + meta.path)
    .replaceAll("{{IMAGE}}", SITE + (meta.image || "/assets/img/sunburst-kaftan-set.webp"))
    .replaceAll("{{LD}}", meta.ld ? `<script type="application/ld+json">${JSON.stringify(meta.ld)}</script>` : "");
  let hd = header.replace(/\{\{nav:(\w+)\}\}/g, (_, k) => nav(k));
  return html
    .replace("{{HEAD}}", h)
    .replace("{{HEADER}}", hd)
    .replace("{{FOOTER}}", footer)
    .replace("{{LOOKS}}", looks)
    .replaceAll("{{YEAR}}", new Date().getFullYear());
}

const urls = [];
function write(rel, html) {
  const f = path.join(OUT, rel);
  fs.mkdirSync(path.dirname(f), { recursive: true });
  fs.writeFileSync(f, html);
}

// 1) regular pages: src/pages/*.html with <!--meta {json} --> on first line
for (const file of fs.readdirSync(path.join(SRC, "pages"))) {
  const raw = fs.readFileSync(path.join(SRC, "pages", file), "utf8");
  const m = raw.match(/^<!--meta (.*?)-->/s);
  if (!m) throw new Error("missing meta in " + file);
  const meta = JSON.parse(m[1]);
  const body = raw.replace(m[0], "");
  if (meta.ld === "org") {
    meta.ld = {
      "@context": "https://schema.org", "@type": "Store", name: "Vue",
      description: meta.desc, url: SITE, image: SITE + "/assets/img/sunburst-kaftan-set.webp",
      slogan: "Wear Your Own Story.", priceRange: "$$",
    };
  }
  write(file, render(body, meta));
  if (!meta.noindex) urls.push(meta.path);
}

// 2) one static page per product (great for SEO + share previews)
const productTpl = fs.readFileSync(path.join(SRC, "templates/product.html"), "utf8");
for (const p of products) {
  const related = products.filter((x) => x.id !== p.id && (x.category === p.category || x.collection === p.collection)).slice(0, 4);
  const meta = {
    title: `${p.name} — ${p.category} | Vue`,
    desc: `${p.blurb} ${money(p.price)}. Shop ${p.name} at Vue — Wear Your Own Story.`,
    path: `/product/${p.id}`, nav: "shop", image: `/assets/img/${p.id}.webp`,
    ld: {
      "@context": "https://schema.org", "@type": "Product", name: p.name, image: SITE + `/assets/img/${p.id}.webp`,
      description: p.blurb, brand: { "@type": "Brand", name: "Vue" }, category: p.category,
      aggregateRating: { "@type": "AggregateRating", ratingValue: p.rating, reviewCount: p.reviews },
      offers: { "@type": "Offer", priceCurrency: "USD", price: p.price, availability: "https://schema.org/InStock", url: SITE + `/product/${p.id}` },
    },
  };
  const body = productTpl
    .replaceAll("{{ID}}", p.id).replaceAll("{{NAME}}", p.name).replaceAll("{{CATEGORY}}", p.category)
    .replaceAll("{{PRICE}}", money(p.price)).replaceAll("{{BLURB}}", p.blurb)
    .replaceAll("{{RATING}}", p.rating.toFixed(1)).replaceAll("{{REVIEWS}}", String(p.reviews))
    .replace("{{COLORS}}", p.colors.map((c, i) => `<button class="swatch${i ? "" : " is-on"}" style="--c:${c}" aria-label="Colour ${i + 1}" data-color="${c}"></button>`).join(""))
    .replace("{{RELATED}}", related.map((r) => `<a class="pcard reveal" href="/product/${r.id}"><div class="pcard__img"><img loading="lazy" src="/assets/img/${r.id}.webp" alt="${r.name}"></div><div class="pcard__meta"><strong>${r.name}</strong><span>${money(r.price)}</span></div></a>`).join(""));
  write(`product/${p.id}.html`, render(body, meta));
  urls.push(meta.path);
}

// 3) static assets + data
fs.cpSync(path.join(SRC, "assets"), path.join(OUT, "assets"), { recursive: true });
fs.writeFileSync(path.join(OUT, "assets/js/products.js"), "window.VUE_PRODUCTS=" + JSON.stringify(products) + ";");
if (fs.existsSync(path.join(ROOT, "public"))) fs.cpSync(path.join(ROOT, "public"), OUT, { recursive: true });

// 4) sitemap + robots
const now = new Date().toISOString().slice(0, 10);
write("sitemap.xml", `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.map((u) => `  <url><loc>${SITE}${u === "/" ? "" : u}</loc><lastmod>${now}</lastmod></url>`).join("\n")}\n</urlset>\n`);
write("robots.txt", `User-agent: *\nAllow: /\nDisallow: /account\nSitemap: ${SITE}/sitemap.xml\n`);
console.log(`Built ${urls.length} indexable pages → dist/`);
