(() => {
  "use strict";

  const HOLD_MS = 3000; // durée d'appui pour ouvrir le pack
  const TEAR_Y = 15; // hauteur (en %) de la ligne de déchirure
  const RARITY_ORDER = ["commun", "rare", "epique", "legendaire"];
  const RARITY_LABEL = { commun: "Commun", rare: "Rare", epique: "Épique", legendaire: "Légendaire" };
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const $ = (id) => document.getElementById(id);
  const pack = $("pack");
  const packWrap = $("packWrap");
  const packTop = $("packTop");
  const packBody = $("packBody");
  const tearLine = $("tearLine");
  const deck = $("deck");
  const hud = $("hud");
  const hint = $("hint");
  const progressBar = $("progressBar");
  const summary = $("summary");
  const summaryGrid = $("summaryGrid");
  const flash = $("flash");
  const fx = $("fx");

  const css = getComputedStyle(document.documentElement);
  const brand = (name) => css.getPropertyValue(name).trim();

  let state = "idle"; // idle | charging | opening | deck | done
  let progress = 0;
  let holding = false;
  let lastTime = 0;
  let raf = 0;
  let cards = [];

  /* ------------------------------------------------------------------
     Construction du pack : le même visuel est cloné en deux morceaux
     découpés le long d'une ligne de déchirure irrégulière.
  ------------------------------------------------------------------ */
  function buildPack() {
    const tpl = $("packArt");
    packTop.replaceChildren(tpl.content.cloneNode(true));
    packBody.replaceChildren(tpl.content.cloneNode(true));

    const pts = [];
    const steps = 18;
    for (let i = 0; i <= steps; i++) {
      const x = (i / steps) * 100;
      const y = TEAR_Y + (i % 2 ? 1.4 : -1.4) + (Math.random() * 1.6 - 0.8);
      pts.push([x, y]);
    }
    const line = pts.map(([x, y]) => `${x}% ${y}%`);
    packTop.style.clipPath = `polygon(0 0, 100% 0, ${[...line].reverse().join(", ")})`;
    packBody.style.clipPath = `polygon(${line.join(", ")}, 100% 100%, 0 100%)`;
    tearLine.setAttribute("points", pts.map(([x, y]) => `${x},${y}`).join(" "));
  }

  /* ------------------------------------------------------------------
     Appui long : secousse + grossissement progressifs
  ------------------------------------------------------------------ */
  function startHold(e) {
    if (state !== "idle" && state !== "charging") return;
    if (e && e.pointerId !== undefined) pack.setPointerCapture(e.pointerId);
    holding = true;
    if (state === "idle") {
      state = "charging";
      lastTime = performance.now();
      raf = requestAnimationFrame(tick);
    }
    hint.textContent = "Continue d'appuyer…";
  }

  function endHold() {
    if (!holding) return;
    holding = false;
    if (state === "charging") hint.textContent = "Maintiens le booster appuyé pour l'ouvrir";
  }

  function tick(now) {
    const dt = now - lastTime;
    lastTime = now;
    // la jauge redescend plus vite qu'elle ne monte quand on relâche
    progress += holding ? dt / HOLD_MS : -dt / 500;
    progress = Math.max(0, Math.min(1, progress));
    renderCharge(progress);

    if (progress >= 1) {
      openPack();
      return;
    }
    if (progress <= 0 && !holding) {
      state = "idle";
      pack.style.transform = "";
      return;
    }
    raf = requestAnimationFrame(tick);
  }

  function renderCharge(p) {
    const e = p * p;
    const amp = holding && !reducedMotion ? 0.6 + e * 7 : 0;
    const x = (Math.random() * 2 - 1) * amp;
    const y = (Math.random() * 2 - 1) * amp * 0.6;
    const r = (Math.random() * 2 - 1) * (holding && !reducedMotion ? 0.3 + e * 3.5 : 0);
    const s = 1 + 0.08 * (1 - (1 - p) * (1 - p));
    pack.style.transform = `translate(${x}px, ${y}px) rotate(${r}deg) scale(${s})`;
    tearLine.style.strokeDashoffset = String(1 - p);
    progressBar.style.width = `${p * 100}%`;
    if (holding && navigator.vibrate && Math.random() < e * 0.15) navigator.vibrate(8);
  }

  /* ------------------------------------------------------------------
     Ouverture : le haut se déchire et tombe, les cartes sortent
  ------------------------------------------------------------------ */
  async function openPack() {
    state = "opening";
    holding = false;
    hint.textContent = "";
    pack.style.transform = "scale(1.08)";
    if (navigator.vibrate) navigator.vibrate([30, 40, 60]);
    flashScreen(0.5);

    buildDeck();

    packTop.style.transformOrigin = `100% ${TEAR_Y}%`;
    const tear = packTop.animate(
      [
        { transform: "none", opacity: 1 },
        { transform: "translate(3%, -7%) rotate(-7deg)", opacity: 1, offset: 0.25 },
        { transform: "translate(14%, 90vh) rotate(32deg)", opacity: 0 },
      ],
      { duration: reducedMotion ? 400 : 1200, easing: "cubic-bezier(.45,0,.8,.4)", fill: "forwards" }
    );
    tearLine.style.opacity = "0";

    await wait(reducedMotion ? 150 : 380);

    // les cartes montent hors du pack
    await deck.animate(
      [{ transform: "translateY(0)" }, { transform: "translateY(-55%)" }],
      { duration: reducedMotion ? 300 : 700, easing: "cubic-bezier(.2,.9,.3,1.15)", fill: "forwards" }
    ).finished;

    // le pack tombe, les cartes se posent au centre
    const drop = packWrap.animate(
      [{ transform: "none", opacity: 1 }, { transform: "translateY(75vh) rotate(-6deg)", opacity: 0 }],
      { duration: reducedMotion ? 300 : 750, easing: "cubic-bezier(.5,0,.75,0)", fill: "forwards" }
    );
    deck.style.zIndex = "3";
    await deck.animate(
      [{ transform: "translateY(-55%)" }, { transform: "translateY(0)" }],
      { duration: reducedMotion ? 300 : 800, easing: "cubic-bezier(.2,.8,.2,1)", fill: "forwards" }
    ).finished;
    await Promise.all([drop.finished, tear.finished]);
    packWrap.hidden = true;

    state = "deck";
    hud.classList.add("is-deck");
    updateHint();
  }

  /* ------------------------------------------------------------------
     Cartes
  ------------------------------------------------------------------ */
  function buildDeck() {
    const data = [...window.BOOSTER_CARDS].sort(
      (a, b) => RARITY_ORDER.indexOf(a.rarity) - RARITY_ORDER.indexOf(b.rarity)
    );
    deck.replaceChildren();
    cards = data.map((c, i) => {
      const el = document.createElement("div");
      el.className = "card";
      el.dataset.rarity = c.rarity;
      el.setAttribute("role", "button");
      el.setAttribute("tabindex", "-1");
      el.setAttribute("aria-label", "Carte face cachée. Touche pour la retourner.");
      el.innerHTML = `
        <div class="card-tilt">
          <div class="card-inner">
            <div class="card-face card-back">
              <div class="card-back-logo"><span class="logo-plus">+</span>positive</div>
            </div>
            <div class="card-face card-front">${frontHTML(c)}</div>
          </div>
        </div>`;
      el.addEventListener("click", onCardClick);
      el.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onCardClick.call(el, e); }
      });
      el.addEventListener("pointermove", onTilt);
      el.addEventListener("pointerleave", resetTilt);
      el.querySelectorAll("a").forEach((a) => a.addEventListener("click", (e) => e.stopPropagation()));
      deck.appendChild(el);
      return { el, data: c };
    });
    layoutDeck();
  }

  // pile : la première carte du tableau est au-dessus
  function layoutDeck() {
    cards.forEach(({ el }, i) => {
      el.style.zIndex = String(100 - i);
      el.style.transform = `translate(${i * 7}px, ${i * -5}px) rotate(${i * 3}deg)`;
      el.classList.toggle("is-top", i === 0);
      el.tabIndex = i === 0 ? 0 : -1;
    });
  }

  function frontHTML(c) {
    const total = window.BOOSTER_CARDS.length;
    const n = window.BOOSTER_CARDS.indexOf(c) + 1;
    const gems = "◆".repeat(RARITY_ORDER.indexOf(c.rarity) + 1);
    const img = c.image
      ? `<img src="${esc(c.image)}" alt="${esc(c.imageAlt || c.title)}" draggable="false">`
      : placeholderArt(c);
    const facts = (c.facts || [])
      .map((f) => `<div><dt>${esc(f.label)}</dt><dd>${esc(f.value)}</dd></div>`)
      .join("");
    const link = c.link
      ? `<a href="${esc(c.link.url)}" target="_blank" rel="noopener">${esc(c.link.label)} →</a>`
      : `<span class="mini-logo">+positive</span>`;
    return `
      <div class="front">
        <div class="front-head">
          <div>
            <span class="front-type">${esc(c.type)}</span>
            <h2 class="front-title">${esc(c.title)}</h2>
          </div>
          <div class="front-energy" title="Énergie positive"><small>PE</small>${c.energy ?? ""}<span class="logo-plus">+</span></div>
        </div>
        <div class="front-img">${img}</div>
        <div class="front-band">
          <span>N° ${String(n).padStart(3, "0")}/${String(total).padStart(3, "0")}</span>
          <span class="rarity-pill"><span class="gems">${gems}</span>${RARITY_LABEL[c.rarity] || c.rarity}</span>
        </div>
        <p class="front-desc">${esc(c.description)}</p>
        ${c.ability ? `<div class="front-ability"><strong>${esc(c.ability.name)}</strong>${esc(c.ability.text)}</div>` : ""}
        <dl class="front-facts">${facts}</dl>
        <div class="front-foot"><span class="mini-logo">+positive</span>${c.link ? link : "<span>Édition 2026</span>"}</div>
      </div>`;
  }

  // illustration générée aux couleurs de la marque quand aucune image n'est fournie
  function placeholderArt(c) {
    const p = brand("--brand-primary");
    const s = brand("--brand-secondary");
    const t = brand("--brand-tertiary");
    const d = brand("--brand-dark");
    const initials = c.title.replace(/[^A-Za-zÀ-ÿ ]/g, "").split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();
    const gid = `g-${c.id}`;
    return `
      <svg viewBox="0 0 160 100" role="img" aria-label="${esc(c.imageAlt || c.title)}">
        <defs><linearGradient id="${gid}" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stop-color="${p}"/><stop offset="1" stop-color="${s}"/></linearGradient></defs>
        <rect width="160" height="100" fill="url(#${gid})"/>
        <circle cx="132" cy="18" r="34" fill="${t}" opacity=".55"/>
        <circle cx="22" cy="92" r="28" fill="${d}" opacity=".18"/>
        <text x="80" y="66" text-anchor="middle" font-family="Syne, sans-serif" font-weight="800" font-size="46" fill="${d}">${esc(initials)}</text>
        <text x="138" y="88" text-anchor="middle" font-family="Syne, sans-serif" font-weight="800" font-size="22" fill="#fff">+</text>
      </svg>`;
  }

  function onCardClick() {
    if (state !== "deck") return;
    const top = cards[0];
    if (!top || top.el !== this) return;

    if (!top.el.classList.contains("is-flipped")) {
      top.el.classList.add("is-flipped");
      top.el.setAttribute("aria-label", `${top.data.title}, carte ${RARITY_LABEL[top.data.rarity]}. Touche pour continuer.`);
      celebrate(top);
      updateHint();
    } else {
      dismissTop();
    }
  }

  async function dismissTop() {
    state = "busy";
    const { el } = cards.shift();
    resetTilt.call(el);
    const dir = Math.random() < 0.5 ? -1 : 1;
    await el.animate(
      [
        { transform: getComputedStyle(el).transform },
        { transform: `translate(${dir * 110}vw, -10vh) rotate(${dir * 35}deg)`, opacity: 0.6 },
      ],
      { duration: reducedMotion ? 250 : 550, easing: "cubic-bezier(.5,0,.8,.3)", fill: "forwards" }
    ).finished;
    el.remove();
    layoutDeck();
    if (cards.length) {
      state = "deck";
      cards[0].el.focus({ preventScroll: true });
      updateHint();
    } else {
      showSummary();
    }
  }

  function updateHint() {
    const top = cards[0];
    if (!top) return;
    const total = window.BOOSTER_CARDS.length;
    const n = total - cards.length + 1;
    hint.textContent = top.el.classList.contains("is-flipped")
      ? `Carte ${n}/${total} · touche pour la suivante`
      : `Carte ${n}/${total} · touche pour la retourner`;
  }

  /* ------------------------------------------------------------------
     Effet holographique : la carte suit le pointeur
  ------------------------------------------------------------------ */
  function onTilt(e) {
    if (reducedMotion || !this.classList.contains("is-flipped")) return;
    const r = this.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width;
    const py = (e.clientY - r.top) / r.height;
    const tilt = this.querySelector(".card-tilt");
    tilt.style.transform = `rotateX(${(0.5 - py) * 16}deg) rotateY(${(px - 0.5) * 18}deg)`;
    this.style.setProperty("--mx", `${px * 100}%`);
    this.style.setProperty("--my", `${py * 100}%`);
  }
  function resetTilt() {
    const tilt = this.querySelector(".card-tilt");
    if (tilt) tilt.style.transform = "";
  }

  /* ------------------------------------------------------------------
     Effets de rareté
  ------------------------------------------------------------------ */
  function celebrate({ el, data }) {
    const level = RARITY_ORDER.indexOf(data.rarity);
    if (level < 1) return;
    const colorVar = { rare: "--r-rare", epique: "--r-epique", legendaire: "--r-legendaire" }[data.rarity];
    const colors = [brand(colorVar), brand("--brand-primary"), brand("--brand-secondary"), "#ffffff"];
    setTimeout(() => {
      if (level >= 3) flashScreen(0.7);
      if (level >= 2 && navigator.vibrate) navigator.vibrate(level >= 3 ? [40, 30, 80] : 40);
      burst(el.getBoundingClientRect(), colors, [0, 16, 36, 70][level]);
    }, reducedMotion ? 0 : 280);
  }

  function burst(rect, colors, count) {
    if (reducedMotion) return;
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    for (let i = 0; i < count; i++) {
      const p = document.createElement("div");
      const color = colors[i % colors.length];
      const isPlus = i % 4 === 0;
      p.className = "particle" + (isPlus ? " is-plus" : "");
      if (isPlus) { p.textContent = "+"; p.style.color = color; } else p.style.background = color;
      p.style.left = `${cx}px`;
      p.style.top = `${cy}px`;
      fx.appendChild(p);
      const a = Math.random() * Math.PI * 2;
      const d = 120 + Math.random() * Math.max(rect.width, 220) * 1.3;
      const size = 0.5 + Math.random();
      p.animate(
        [
          { transform: `translate(-50%,-50%) scale(${size})`, opacity: 1 },
          { transform: `translate(calc(-50% + ${Math.cos(a) * d}px), calc(-50% + ${Math.sin(a) * d + 60}px)) scale(0) rotate(${Math.random() * 360}deg)`, opacity: 0 },
        ],
        { duration: 900 + Math.random() * 700, easing: "cubic-bezier(.1,.8,.3,1)", fill: "forwards" }
      ).finished.then(() => p.remove());
    }
  }

  function flashScreen(strength) {
    if (reducedMotion) return;
    flash.animate([{ opacity: strength }, { opacity: 0 }], { duration: 500, easing: "ease-out" });
  }

  /* ------------------------------------------------------------------
     Récap + nouveau booster
  ------------------------------------------------------------------ */
  function showSummary() {
    state = "done";
    hud.style.opacity = "0";
    const data = [...window.BOOSTER_CARDS].sort(
      (a, b) => RARITY_ORDER.indexOf(b.rarity) - RARITY_ORDER.indexOf(a.rarity)
    );
    summaryGrid.replaceChildren(
      ...data.map((c, i) => {
        const m = document.createElement("div");
        m.className = "mini-card";
        m.dataset.rarity = c.rarity;
        m.innerHTML = `<div class="card-face card-front">${frontHTML(c)}</div>`;
        return m;
      })
    );
    summary.hidden = false;
    $("again").focus({ preventScroll: true });
  }

  function reset() {
    summary.hidden = true;
    deck.replaceChildren();
    deck.getAnimations().forEach((a) => a.cancel());
    deck.style.zIndex = "";
    packTop.getAnimations().forEach((a) => a.cancel());
    packWrap.getAnimations().forEach((a) => a.cancel());
    packWrap.hidden = false;
    pack.style.transform = "";
    tearLine.style.opacity = "";
    progress = 0;
    renderCharge(0);
    buildPack();
    hud.classList.remove("is-deck");
    hud.style.opacity = "";
    hint.textContent = "Maintiens le booster appuyé pour l'ouvrir";
    state = "idle";
    packWrap.animate(
      [{ transform: "translateY(60vh) rotate(8deg)", opacity: 0 }, { transform: "none", opacity: 1 }],
      { duration: 700, easing: "cubic-bezier(.2,.9,.3,1.1)" }
    );
    pack.focus({ preventScroll: true });
  }

  /* ------------------------------------------------------------------
     Utilitaires & écouteurs
  ------------------------------------------------------------------ */
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  function esc(s) {
    return String(s ?? "").replace(/[&<>"']/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[ch]);
  }

  pack.addEventListener("pointerdown", (e) => { e.preventDefault(); startHold(e); });
  pack.addEventListener("pointerup", endHold);
  pack.addEventListener("pointercancel", endHold);
  pack.addEventListener("lostpointercapture", endHold);
  pack.addEventListener("contextmenu", (e) => e.preventDefault());
  pack.addEventListener("keydown", (e) => {
    if ((e.key === " " || e.key === "Enter") && !e.repeat) { e.preventDefault(); startHold(); }
  });
  pack.addEventListener("keyup", (e) => {
    if (e.key === " " || e.key === "Enter") endHold();
  });
  $("again").addEventListener("click", reset);

  buildPack();
})();
