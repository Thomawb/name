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
  const tearGuide = $("tearGuide");
  const deck = $("deck");
  const hud = $("hud");
  const hint = $("hint");
  const progressBar = $("progressBar");
  const summary = $("summary");
  const summaryGrid = $("summaryGrid");
  const fx = $("fx");

  const css = getComputedStyle(document.documentElement);
  const brand = (name) => css.getPropertyValue(name).trim();

  let state = "idle"; // idle | charging | opening | deck | done
  let progress = 0;
  let holding = false;
  let lastTime = 0;
  let phase = 0;
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

    // découpe droite ; léger chevauchement pour qu'aucune couture ne soit visible avant la déchirure
    packTop.style.clipPath = `inset(0 0 ${100 - TEAR_Y}% 0)`;
    packBody.style.clipPath = `inset(${TEAR_Y - 0.6}% 0 0 0)`;
    pack.style.setProperty("--tear-y", `${TEAR_Y}%`);
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
    // la fréquence d'oscillation augmente doucement avec la charge
    phase += dt * 0.001 * Math.PI * 2 * (2.5 + progress * 4.5);
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
    // secousse sinusoïdale (pas d'aléatoire) : l'amplitude suit la charge, donc tout retombe en douceur
    const e = p * p;
    const amp = reducedMotion ? 0 : p * 1.2 + e * 3;
    const rot = reducedMotion ? 0 : p * 0.6 + e * 1.8;
    const x = Math.sin(phase) * amp;
    const y = Math.cos(phase * 1.3) * amp * 0.35;
    const r = Math.sin(phase * 0.85 + 1) * rot;
    const s = 1 + 0.07 * (1 - (1 - p) * (1 - p));
    pack.style.transform = `translate(${x}px, ${y}px) rotate(${r}deg) scale(${s})`;
    pack.style.setProperty("--tear-p", p);
    progressBar.style.width = `${p * 100}%`;
    if (holding && navigator.vibrate && Math.random() < e * 0.08) navigator.vibrate(6);
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
    tearGuide.style.opacity = "0";

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
            <div class="card-face card-back trame">
              <div class="card-back-logo" role="img" aria-label="agence positive"></div>
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
    const img = c.image
      ? `<img src="${esc(c.image)}" alt="${esc(c.imageAlt || c.title)}" draggable="false">`
      : placeholderArt(c);
    const facts = (c.facts || [])
      .map((f) => `<div><dt>${esc(f.label)}</dt><dd>${esc(f.value)}</dd></div>`)
      .join("");
    const end = c.link
      ? `<a href="${esc(c.link.url)}" target="_blank" rel="noopener">${esc(c.link.label)} →</a>`
      : `<span class="foot-logo" role="img" aria-label="agence positive"></span>`;
    return `
      <div class="front">
        <div class="front-media">
          ${img}
          <span class="rarity-pill">${RARITY_LABEL[c.rarity] || c.rarity}</span>
        </div>
        <div class="front-body trame">
          <span class="front-type">${esc(c.type)}</span>
          <h2 class="front-title">${esc(c.title)}</h2>
          <p class="front-desc">${esc(c.description)}</p>
          ${facts ? `<dl class="front-facts">${facts}</dl>` : ""}
          <div class="front-foot">
            <span class="front-energy"><small>Énergie positive</small>${c.energy ?? ""}</span>
            ${end}
          </div>
        </div>
      </div>`;
  }

  // illustration provisoire quand aucune image n'est fournie
  function placeholderArt(c) {
    const color = brand(`--r-${c.rarity}`) || brand("--r-commun");
    const initials = c.title.replace(/[^A-Za-zÀ-ÿ ]/g, "").split(" ").map((w) => w[0]).join("").slice(0, 2);
    return `
      <svg viewBox="0 0 160 100" preserveAspectRatio="xMidYMid slice" role="img" aria-label="${esc(c.imageAlt || c.title)}">
        <rect width="160" height="100" fill="${brand("--media")}"/>
        <circle cx="80" cy="50" r="36" fill="${color}"/>
        <text x="80" y="50" text-anchor="middle" dominant-baseline="central" font-family="Bohemian Soul, Georgia, serif" font-size="38" fill="${brand("--ink")}">${esc(initials)}</text>
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
    const colors = [brand(colorVar), brand("--r-commun"), brand("--ink")];
    setTimeout(() => {
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
      p.className = "particle";
      p.style.background = color;
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
    tearGuide.style.opacity = "";
    phase = 0;
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
