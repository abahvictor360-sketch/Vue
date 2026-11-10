/* Vue — site behaviour. No framework, no dependencies. */
(() => {
  "use strict";
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const P = window.VUE_PRODUCTS || [];
  const byId = (id) => P.find((p) => p.id === id);
  const money = (n) => "$" + Number(n).toFixed(0);
  const store = {
    get(k, d) { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch { return d; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} },
    del(k) { try { localStorage.removeItem(k); } catch {} },
  };
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------- toast ---------- */
  let tt;
  function toast(msg) {
    const t = $("#toast"); if (!t) return;
    t.textContent = msg; t.classList.add("is-on");
    clearTimeout(tt); tt = setTimeout(() => t.classList.remove("is-on"), 2600);
  }

  /* ---------- nav ---------- */
  const nav = $("#nav"), burger = $("#burger"), sheet = $("#sheet");
  burger?.addEventListener("click", () => {
    const open = burger.getAttribute("aria-expanded") === "true";
    burger.setAttribute("aria-expanded", String(!open)); sheet.hidden = open;
  });
  let lastY = 0;
  addEventListener("scroll", () => {
    const y = scrollY;
    if (nav) nav.classList.toggle("is-hidden", y > lastY && y > 240 && sheet?.hidden !== false);
    lastY = y;
  }, { passive: true });

  /* ---------- liquid glass: light follows pointer ---------- */
  document.addEventListener("pointermove", (e) => {
    const g = e.target.closest?.(".glass"); if (!g) return;
    const r = g.getBoundingClientRect();
    g.style.setProperty("--mx", e.clientX - r.left + "px");
    g.style.setProperty("--my", e.clientY - r.top + "px");
  }, { passive: true });

  /* ---------- page transitions ---------- */
  document.addEventListener("click", (e) => {
    const a = e.target.closest("a[href]");
    if (!a || e.target.closest("button") || e.defaultPrevented || e.metaKey || e.ctrlKey || e.shiftKey || a.target || a.hasAttribute("download")) return;
    const u = new URL(a.href, location.href);
    if (u.origin !== location.origin || (u.pathname === location.pathname && u.hash)) return;
    if (reduce) return;
    e.preventDefault(); document.body.classList.add("is-leaving");
    setTimeout(() => (location.href = u.href), 220);
  });
  addEventListener("pageshow", (e) => { if (e.persisted) document.body.classList.remove("is-leaving"); });

  /* ---------- split headline words + reveal ---------- */
  $$(".split").forEach((el) => {
    const words = el.textContent.trim().split(/\s+/);
    const em = el.querySelector("em");
    if (em) { /* keep emphasis wrapper */
      const html = [...el.childNodes].map((n) => n.nodeType === 3 ? n.textContent : n.outerHTML).join("");
      let i = 0;
      el.innerHTML = html.replace(/(<em>)([^<]+)(<\/em>)|([^\s<][^\s<]*)/g, (m, o, inner, c, plain) => {
        if (inner) return inner.trim().split(/\s+/).map((w) => `<span class="w"><span style="--i:${i++}"><em>${w}</em></span></span>`).join(" ");
        return `<span class="w"><span style="--i:${i++}">${plain}</span></span>`;
      });
    } else el.innerHTML = words.map((w, i) => `<span class="w"><span style="--i:${i}">${w}</span></span>`).join(" ");
  });
  const io = "IntersectionObserver" in window ? new IntersectionObserver((es) => es.forEach((e) => {
    if (e.isIntersecting) { e.target.classList.add("is-in"); if (e.target.dataset.count) countUp(e.target); io.unobserve(e.target); }
  }), { threshold: 0.14, rootMargin: "0px 0px -6% 0px" }) : null;
  function observeAll(root = document) {
    $$(".reveal,.split,[data-count]", root).forEach((el, i) => {
      if (!el.style.getPropertyValue("--d") && el.dataset.stagger != null) el.style.setProperty("--d", (i % 6) * 0.08 + "s");
      io ? io.observe(el) : el.classList.add("is-in");
    });
  }
  function countUp(el) {
    const end = parseFloat(el.dataset.count), dec = (el.dataset.count.split(".")[1] || "").length, suf = el.dataset.suffix || "";
    if (reduce) { el.textContent = end.toFixed(dec) + suf; return; }
    const t0 = performance.now(), D = 1600;
    (function f(t) {
      const k = Math.min(1, (t - t0) / D), e = 1 - Math.pow(1 - k, 4);
      el.textContent = (end * e).toFixed(dec) + suf; if (k < 1) requestAnimationFrame(f);
    })(t0);
  }
  observeAll();

  /* ---------- cart ---------- */
  const CART = "vue.cart.v1";
  let cart = store.get(CART, []);
  const drawer = $("#drawer");
  const save = () => { store.set(CART, cart); renderCart(); };
  function addToCart(id, size = "M", color) {
    const k = cart.find((i) => i.id === id && i.size === size && i.color === color);
    k ? k.qty++ : cart.push({ id, size, color, qty: 1 });
    save(); toast(`Added “${byId(id)?.name}” to your bag`);
  }
  function renderCart() {
    const n = cart.reduce((a, i) => a + i.qty, 0), badge = $("#cartCount");
    if (badge) { badge.hidden = !n; badge.textContent = n; }
    const box = $("#drawerItems"); if (!box) return;
    if (!cart.length) {
      box.innerHTML = `<div class="empty"><svg width="54" height="54" viewBox="0 0 24 24" fill="none" stroke="#9aa3b5" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"><path d="M6 8h12l-1 12H7L6 8z"/><path d="M9 8V6a3 3 0 016 0v2"/></svg><p>Your bag is empty.<br>Find something that tells your story.</p><a class="btn btn--blue" href="/shop">Explore the collection</a></div>`;
    } else {
      box.innerHTML = cart.map((i, idx) => { const p = byId(i.id); if (!p) return ""; return `
        <div class="citem"><img src="/assets/img/${p.id}.webp" alt=""><div><strong>${p.name}</strong><small>Size ${i.size}</small>
        <div class="qty"><button data-q="-1" data-i="${idx}" aria-label="Decrease">−</button><span>${i.qty}</span><button data-q="1" data-i="${idx}" aria-label="Increase">+</button></div></div>
        <strong>${money(p.price * i.qty)}</strong></div>`; }).join("");
    }
    const total = cart.reduce((a, i) => a + (byId(i.id)?.price || 0) * i.qty, 0);
    const t = $("#drawerTotal"); if (t) t.textContent = money(total);
  }
  const openCart = () => { drawer.classList.add("is-open"); drawer.setAttribute("aria-hidden", "false"); };
  const closeCart = () => { drawer.classList.remove("is-open"); drawer.setAttribute("aria-hidden", "true"); };
  $("#cartBtn")?.addEventListener("click", openCart);
  drawer?.addEventListener("click", (e) => {
    if (e.target.closest("[data-close]")) closeCart();
    const q = e.target.closest("[data-q]");
    if (q) { const it = cart[+q.dataset.i]; it.qty += +q.dataset.q; if (it.qty < 1) cart.splice(+q.dataset.i, 1); save(); }
  });
  addEventListener("keydown", (e) => { if (e.key === "Escape") { closeCart(); closeLb(); } });
  $("#checkoutBtn")?.addEventListener("click", () => {
    if (!cart.length) return toast("Your bag is empty");
    if (!session()) { store.set("vue.next", location.pathname + location.search); toast("Please log in to check out"); setTimeout(() => (location.href = "/login?next=" + encodeURIComponent(location.pathname)), 700); return; }
    cart = []; save(); closeCart(); toast("🎉 Order placed (demo) — thank you, " + session().name.split(" ")[0] + "!");
  });
  document.addEventListener("click", (e) => {
    const b = e.target.closest("[data-add]"); if (!b) return; e.preventDefault();
    const p = byId(b.dataset.add); addToCart(b.dataset.add, b.dataset.size || (p?.category === "Heritage" ? "M" : "M"), b.dataset.color);
    openCartSoon();
  });
  let cs; const openCartSoon = () => { clearTimeout(cs); cs = setTimeout(openCart, 350); };
  renderCart();

  /* ---------- auth (demo, browser-only) ---------- */
  const USERS = "vue.users.v1", SESS = "vue.session.v1";
  const session = () => store.get(SESS, null);
  async function hash(pw, salt) {
    if (!crypto?.subtle) return btoa(salt + pw);
    const b = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(salt + pw));
    return [...new Uint8Array(b)].map((x) => x.toString(16).padStart(2, "0")).join("");
  }
  const rnd = () => [...crypto.getRandomValues(new Uint8Array(8))].map((x) => x.toString(16)).join("");
  function paintAuth() {
    const s = session();
    $$("[data-auth-link]").forEach((a) => {
      a.textContent = s ? "Hi, " + s.name.split(" ")[0] : "Log in";
      a.setAttribute("href", s ? "/account" : "/login");
    });
  }
  paintAuth();

  const loginPage = $("#authForms");
  if (loginPage) {
    const next = new URLSearchParams(location.search).get("next") || store.get("vue.next", "/") || "/";
    const tabs = $(".tabs"), pIn = $("#panelLogin"), pUp = $("#panelSignup");
    const setTab = (t) => { tabs.dataset.tab = t; pIn.hidden = t !== "login"; pUp.hidden = t !== "signup"; $$(".tabs button").forEach((b) => b.setAttribute("aria-selected", b.dataset.t === t)); };
    $$(".tabs button").forEach((b) => b.addEventListener("click", () => setTab(b.dataset.t)));
    $$("[data-switch]").forEach((b) => b.addEventListener("click", (e) => { e.preventDefault(); setTab(b.dataset.switch); }));
    if (location.hash === "#signup") setTab("signup");
    $$("[data-pw]").forEach((b) => b.addEventListener("click", () => { const i = b.parentElement.querySelector("input"); i.type = i.type === "password" ? "text" : "password"; b.textContent = i.type === "password" ? "Show" : "Hide"; }));
    const done = (u) => { store.set(SESS, { name: u.name, email: u.email }); store.del("vue.next"); toast("Welcome, " + u.name.split(" ")[0] + " ✦"); setTimeout(() => (location.href = next.startsWith("/") ? next : "/"), 700); };
    $("#formLogin").addEventListener("submit", async (e) => {
      e.preventDefault(); const f = new FormData(e.target), em = f.get("email").trim().toLowerCase(), err = $("#errLogin");
      const u = store.get(USERS, {})[em];
      if (!u || (await hash(f.get("password"), u.salt)) !== u.hash) { err.textContent = "Email or password is incorrect."; return; }
      err.textContent = ""; done({ name: u.name, email: em });
    });
    $("#formSignup").addEventListener("submit", async (e) => {
      e.preventDefault(); const f = new FormData(e.target), em = f.get("email").trim().toLowerCase(), err = $("#errSignup");
      const pw = f.get("password"), users = store.get(USERS, {});
      if (pw.length < 8) { err.textContent = "Use at least 8 characters."; return; }
      if (pw !== f.get("confirm")) { err.textContent = "Passwords don’t match."; return; }
      if (users[em]) { err.textContent = "An account with that email already exists. Try logging in."; return; }
      const salt = rnd(); users[em] = { name: f.get("name").trim(), salt, hash: await hash(pw, salt) }; store.set(USERS, users);
      err.textContent = ""; done({ name: users[em].name, email: em });
    });
    $$("[data-sso]").forEach((b) => b.addEventListener("click", () => toast(b.dataset.sso + " sign-in is a demo button — use email to try the flow.")));
    if (session()) location.replace("/account");
  }

  /* ---------- wishlist ---------- */
  let wish = store.get("vue.wish", []);
  document.addEventListener("click", (e) => {
    const h = e.target.closest("[data-wish]"); if (!h) return; e.preventDefault(); e.stopPropagation();
    const id = h.dataset.wish, on = wish.includes(id);
    wish = on ? wish.filter((x) => x !== id) : [...wish, id]; store.set("vue.wish", wish);
    h.classList.toggle("is-on", !on); h.setAttribute("aria-pressed", String(!on)); toast(on ? "Removed from saved" : "Saved to your wishlist");
  });
  const heart = (id) => `<button class="heart glass ${wish.includes(id) ? "is-on" : ""}" data-wish="${id}" aria-label="Save to wishlist" aria-pressed="${wish.includes(id)}"><svg width="18" height="18" viewBox="0 0 24 24"><path d="M12 21s-7.5-4.6-9.5-9.2C1.1 8.4 3 5 6.4 5c2 0 3.6 1.1 4.6 2.6h2C14 6.1 15.600 5 17.600 5 21 5 22.900 8.400 21.500 11.800 19.500 16.400 12 21 12 21z"/></svg></button>`;
  function card(p) {
    return `<a class="pcard reveal" href="/product/${p.id}">
      <div class="pcard__img">${p.badge ? `<span class="tag">${p.badge}</span>` : ""}${heart(p.id)}
        <img loading="lazy" src="/assets/img/${p.id}.webp" alt="${p.name}">
        <button class="btn btn--blue btn--sm btn--block quick" data-add="${p.id}">Quick add — ${money(p.price)}</button></div>
      <div class="pcard__meta"><strong>${p.name}</strong><span>${money(p.price)}</span></div><div class="pcard__cat">${p.category} · ★ ${p.rating.toFixed(1)}</div></a>`;
  }

  const acct = $("#account");
  if (acct) {
    const s = session();
    if (!s) location.replace("/login?next=/account");
    else {
      $("#acName").textContent = s.name; $("#acEmail").textContent = s.email; $("#acAvatar").textContent = s.name[0].toUpperCase();
      $("#logout").addEventListener("click", () => { store.del(SESS); toast("Logged out"); setTimeout(() => (location.href = "/"), 500); });
      const w = store.get("vue.wish", []);
      const box = $("#acWish");
      box.innerHTML = w.length ? w.map((id) => byId(id)).filter(Boolean).map(card).join("") : `<p class="muted">Nothing saved yet. Tap the heart on any piece to keep it here.</p>`;
      observeAll(box);
    }
  }

  /* ---------- shop ---------- */
  const grid = $("#pgrid");
  if (grid) {
    const qs = new URLSearchParams(location.search);
    const st = { cat: qs.get("cat") || "All", col: qs.get("collection") || "", q: "", sort: "featured" };
    const cats = ["All", ...new Set(P.map((p) => p.category))];
    const chips = $("#chips");
    chips.innerHTML = cats.map((c) => `<button class="chip" data-c="${c}">${c}</button>`).join("");
    const draw = () => {
      let list = P.filter((p) => (st.cat === "All" || p.category === st.cat) && (!st.col || p.collection === st.col) &&
        (!st.q || (p.name + " " + p.category + " " + p.blurb).toLowerCase().includes(st.q)));
      if (st.sort === "low") list.sort((a, b) => a.price - b.price);
      if (st.sort === "high") list.sort((a, b) => b.price - a.price);
      if (st.sort === "rating") list.sort((a, b) => b.rating - a.rating);
      $$(".chip", chips).forEach((c) => c.classList.toggle("is-on", c.dataset.c === st.cat));
      grid.innerHTML = list.length ? list.map(card).join("") : `<div class="noresult"><h3>No pieces found</h3><p>Try a different search or category.</p></div>`;
      $("#count").textContent = list.length + (list.length === 1 ? " piece" : " pieces");
      requestAnimationFrame(() => observeAll(grid));
    };
    chips.addEventListener("click", (e) => { const c = e.target.closest(".chip"); if (c) { st.cat = c.dataset.c; st.col = ""; draw(); } });
    $("#q").addEventListener("input", (e) => { st.q = e.target.value.trim().toLowerCase(); draw(); });
    $("#sort").addEventListener("change", (e) => { st.sort = e.target.value; draw(); });
    draw();
  }
  const rel = $("#related"); if (rel) observeAll(rel);

  /* ---------- product page ---------- */
  const pdp = $("#pdp");
  if (pdp) {
    const id = pdp.dataset.id; let size = "M", color = byId(id)?.colors[0];
    $("#sizes").addEventListener("click", (e) => { const b = e.target.closest(".size"); if (!b) return; size = b.dataset.s; $$(".size").forEach((x) => x.classList.toggle("is-on", x === b)); });
    $(".swatches").addEventListener("click", (e) => { const b = e.target.closest(".swatch"); if (!b) return; color = b.dataset.color; $$(".swatch").forEach((x) => x.classList.toggle("is-on", x === b)); });
    $("#addBtn").addEventListener("click", () => { addToCart(id, size, color); openCartSoon(); });
    $("#buyBtn").addEventListener("click", () => { addToCart(id, size, color); openCart(); $("#checkoutBtn").focus(); });
    const h = $("#pdpHeart"); if (h) h.classList.toggle("is-on", wish.includes(id));
  }

  /* ---------- hero ---------- */
  const hero = $("#hero");
  if (hero) {
    const slides = [
      { img: "sunburst-kaftan-set", g1: "#c6e4ff", g2: "#3f86ff", b1: "#ffffff", b2: "#79b4ff", tag: "New season — Resort", em: "#0b63f6" },
      { img: "ivory-pleated-jumpsuit", g1: "#fde7c9", g2: "#e9a56a", b1: "#fff6e6", b2: "#ffc58a", tag: "Quiet luxury — Linen", em: "#b4531a" },
      { img: "sand-resort-set", g1: "#d9f0e1", g2: "#5fb48f", b1: "#f2fff7", b2: "#8fe0b8", tag: "Summer edit — Relaxed", em: "#1b7a55" },
    ];
    const imgs = $$("#heroFig img"), steps = $$("#heroSteps button");
    let cur = 0, timer;
    const go = (i) => {
      cur = (i + slides.length) % slides.length; const s = slides[cur];
      const c = hero.style; c.setProperty("--g1", s.g1); c.setProperty("--g2", s.g2); c.setProperty("--b1", s.b1); c.setProperty("--b2", s.b2); c.setProperty("--em", s.em);
      imgs.forEach((im, k) => im.classList.toggle("is-on", k === cur));
      steps.forEach((b, k) => b.classList.toggle("is-on", k === cur));
      $("#heroTag").textContent = s.tag;
    };
    steps.forEach((b, i) => b.addEventListener("click", () => { go(i); restart(); }));
    const restart = () => { clearInterval(timer); if (!reduce) timer = setInterval(() => go(cur + 1), 5200); };
    go(0); restart();
    hero.addEventListener("pointermove", (e) => {
      if (reduce) return; const r = hero.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width - 0.5, y = (e.clientY - r.top) / r.height - 0.5;
      imgs.forEach((im) => { im.style.setProperty("--tx", x * -26 + "px"); im.style.setProperty("--ty", y * -16 + "px"); });
    });
  }

  /* ---------- magnetic buttons ---------- */
  if (!reduce && matchMedia("(hover:hover)").matches) {
    $$(".btn--blue,.btn--dark").forEach((b) => {
      b.addEventListener("pointermove", (e) => { const r = b.getBoundingClientRect(); b.style.transform = `translate(${(e.clientX - r.left - r.width / 2) * 0.14}px,${(e.clientY - r.top - r.height / 2) * 0.22}px)`; });
      b.addEventListener("pointerleave", () => (b.style.transform = ""));
    });
  }

  /* ---------- lookbook lightbox ---------- */
  const lb = $("#lightbox"); let lbi = 0, lbs = [];
  function closeLb() { lb?.classList.remove("is-open"); }
  if (lb) {
    lbs = $$(".mitem");
    const show = (i) => { lbi = (i + lbs.length) % lbs.length; $("img", lb).src = lbs[lbi].dataset.full; $("img", lb).alt = lbs[lbi].dataset.name; };
    lbs.forEach((m, i) => m.addEventListener("click", (e) => { e.preventDefault(); show(i); lb.classList.add("is-open"); }));
    lb.addEventListener("click", (e) => { if (e.target === lb || e.target.closest("[data-x]")) closeLb(); const n = e.target.closest(".nxt"); if (n) show(lbi + (n.classList.contains("n") ? 1 : -1)); });
    addEventListener("keydown", (e) => { if (!lb.classList.contains("is-open")) return; if (e.key === "ArrowRight") show(lbi + 1); if (e.key === "ArrowLeft") show(lbi - 1); });
  }

  /* ---------- forms ---------- */
  document.addEventListener("submit", (e) => {
    if (e.target.matches("[data-newsletter]")) { e.preventDefault(); e.target.reset(); toast("You’re on the list ✦ Welcome to Vue."); }
    if (e.target.id === "contactForm") { e.preventDefault(); e.target.reset(); $("#contactOk").textContent = "Thanks — we’ll reply within one business day."; toast("Message sent (demo)"); }
  });
})();
