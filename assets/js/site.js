/* ------------------------------------------------------------------
   site.js — lê assets/../data/posts.json e monta os feeds do portal.
   Não depende de servidor: funciona 100% como site estático.
-------------------------------------------------------------------*/

const MONTHS = ["janeiro","fevereiro","março","abril","maio","junho","julho","agosto","setembro","outubro","novembro","dezembro"];

function formatDate(iso){
  const [y,m,d] = iso.split("-").map(Number);
  return `${d} de ${MONTHS[m-1]} de ${y}`;
}

/* Mostra a foto de capa do post quando existe; cai no placeholder
   "espaço para foto" apenas quando o post ainda não tem imagem. */
function thumbHTML(post){
  const cls = post.category === "patrulha-mp" ? "thumb pmp-thumb" : "thumb";
  if (post.cover){
    return `<div class="${cls}"><img src="${post.cover}" alt="${post.title}" style="width:100%; height:100%; object-fit:cover;"></div>`;
  }
  return `
    <div class="${cls}">
      <div class="ph-icon">
        <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4">
          <rect x="3" y="5" width="18" height="14" rx="1.5"/>
          <circle cx="9" cy="11" r="2"/>
          <path d="M3 16l5-4 4 3 4-5 5 6"/>
        </svg>
        Espaço para foto da cobertura
      </div>
    </div>`;
}

function tagLabel(category){
  return category === "patrulha-mp" ? "Patrulha Maria da Penha" : "Notícias";
}

/* ------------------------------------------------------------------
   Motor genérico de slider — usado no destaque da home e na galeria
   de fotos de um post. Precisa de um elemento com uma ".track" (as
   fatias dentro) e, opcionalmente, botões ".slider-arrow.prev/.next"
   e uma ".slider-dots" com um <button> por fatia.
-------------------------------------------------------------------*/
function initSlider(root, opts = {}){
  const { autoplay = false, interval = 6000 } = opts;
  const track = root.querySelector(".track");
  const slides = [...track.children];
  const dotsWrap = root.querySelector(".slider-dots");
  let idx = 0;
  let timer = null;

  function go(i){
    idx = (i + slides.length) % slides.length;
    track.style.transform = `translateX(-${idx * 100}%)`;
    if (dotsWrap){
      [...dotsWrap.children].forEach((d, di) => d.classList.toggle("active", di === idx));
    }
  }
  function restart(){
    if (!autoplay) return;
    clearInterval(timer);
    timer = setInterval(() => go(idx + 1), interval);
  }
  root.querySelector(".slider-arrow.prev")?.addEventListener("click", (e) => {
    e.preventDefault(); go(idx - 1); restart();
  });
  root.querySelector(".slider-arrow.next")?.addEventListener("click", (e) => {
    e.preventDefault(); go(idx + 1); restart();
  });
  if (dotsWrap){
    [...dotsWrap.children].forEach((d, di) => d.addEventListener("click", () => { go(di); restart(); }));
  }
  go(0);
  restart();
}

function placeholderBgHTML(category){
  const cls = category === "patrulha-mp" ? "ph-bg pmp-thumb" : "ph-bg";
  return `
    <div class="${cls}">
      <div class="ph-icon">
        <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4">
          <rect x="3" y="5" width="18" height="14" rx="1.5"/>
          <circle cx="9" cy="11" r="2"/>
          <path d="M3 16l5-4 4 3 4-5 5 6"/>
        </svg>
        Espaço para foto da cobertura
      </div>
    </div>`;
}

function heroSlideHTML(post){
  return `
    <a class="hero-slide" href="post.html?slug=${post.slug}">
      ${post.cover ? `<img src="${post.cover}" alt="${post.title}">` : placeholderBgHTML(post.category)}
      <div class="overlay"></div>
      <div class="info">
        <span class="tag ${post.category}">${tagLabel(post.category)}</span>
        <h2>${post.title}</h2>
        <p>${post.excerpt}</p>
        <span class="date">${formatDate(post.date)}</span>
      </div>
    </a>`;
}

/* Slide de destaque no topo da home, com as N notícias mais recentes.
   Troca sozinho e também por seta / bolinhas. Retorna os slugs
   mostrados, para o feed logo abaixo não repetir essas notícias. */
async function renderHeroSlider(containerId, opts = {}){
  const { count = 4 } = opts;
  const el = document.getElementById(containerId);
  if (!el) return [];

  const posts = (await loadPosts()).slice(0, count);
  if (posts.length === 0){ el.innerHTML = ""; return []; }

  const innerId = containerId + "-inner";
  el.innerHTML = `
    <div class="hero-slider" id="${innerId}">
      <div class="track">${posts.map(heroSlideHTML).join("")}</div>
      ${posts.length > 1 ? `
        <button class="slider-arrow prev" aria-label="Notícia anterior">&#8592;</button>
        <button class="slider-arrow next" aria-label="Próxima notícia">&#8594;</button>
        <div class="slider-dots">${posts.map((_, i) => `<button class="${i === 0 ? "active" : ""}" aria-label="Ir para notícia ${i + 1}"></button>`).join("")}</div>
      ` : ""}
    </div>`;

  if (posts.length > 1){
    initSlider(document.getElementById(innerId), { autoplay: true, interval: 6000 });
  }
  return posts.map(p => p.slug);
}

async function loadPosts(){
  const res = await fetch("data/posts.json");
  const posts = await res.json();
  return posts.sort((a,b) => new Date(b.date) - new Date(a.date));
}

function cardHTML(post){
  return `
    <a class="card" href="post.html?slug=${post.slug}">
      ${thumbHTML(post)}
      <div class="body">
        <div class="meta">
          <span class="tag ${post.category}">${tagLabel(post.category)}</span>
          <span class="date">${formatDate(post.date)}</span>
        </div>
        <h3>${post.title}</h3>
        <p class="excerpt">${post.excerpt}</p>
        <span class="read">Ler matéria completa →</span>
      </div>
    </a>`;
}

function featuredHTML(post){
  return `
    <a class="featured" href="post.html?slug=${post.slug}">
      ${thumbHTML(post)}
      <div class="body">
        <div class="meta">
          <span class="tag ${post.category}">${tagLabel(post.category)}</span>
          <span class="date">${formatDate(post.date)}</span>
        </div>
        <h2 class="title">${post.title}</h2>
        <p class="excerpt">${post.excerpt}</p>
        <span class="read">Ler matéria completa →</span>
      </div>
    </a>`;
}

/* Monta um feed dentro de #<containerId>, opcionalmente filtrado por
   categoria, com destaque do primeiro item e botão "carregar mais".
   excludeSlugs evita repetir notícias já mostradas no slide de topo. */
async function renderFeed(containerId, opts = {}){
  const { category = null, pageSize = 6, showFeatured = true, excludeSlugs = [] } = opts;
  const el = document.getElementById(containerId);
  if (!el) return;

  let posts = await loadPosts();
  if (category) posts = posts.filter(p => p.category === category);
  if (excludeSlugs.length) posts = posts.filter(p => !excludeSlugs.includes(p.slug));

  if (posts.length === 0){
    el.innerHTML = `<p style="color:var(--ink-soft)">Nenhuma postagem publicada nesta categoria ainda.</p>`;
    return;
  }

  let featured = null;
  let rest = posts;
  if (showFeatured){
    featured = posts[0];
    rest = posts.slice(1);
  }

  let shown = pageSize;
  const gridId = containerId + "-grid";

  function paint(){
    const visible = rest.slice(0, shown);
    el.innerHTML = `
      ${featured ? featuredHTML(featured) : ""}
      <div class="grid" id="${gridId}">
        ${visible.map(cardHTML).join("")}
      </div>
      ${shown < rest.length ? `<div class="loadmore-wrap"><button class="btn btn-outline-navy" id="${gridId}-more">Carregar mais notícias</button></div>` : ""}
    `;
    const moreBtn = document.getElementById(`${gridId}-more`);
    if (moreBtn){
      moreBtn.addEventListener("click", () => { shown += pageSize; paint(); });
    }
  }
  paint();
}

/* Página de post individual — lê ?slug= da URL */
async function renderSinglePost(containerId){
  const el = document.getElementById(containerId);
  if (!el) return;
  const slug = new URLSearchParams(window.location.search).get("slug");
  const posts = await loadPosts();
  const post = posts.find(p => p.slug === slug);

  if (!post){
    el.innerHTML = `<div class="wrap" style="padding:60px 24px; text-align:center;">
      <h1 style="font-size:1.4rem;">Postagem não encontrada</h1>
      <p style="color:var(--ink-soft); margin-top:10px;"><a class="back-link" href="index.html">← Voltar para Notícias</a></p>
    </div>`;
    return;
  }

  document.title = post.title + " — Notícias GCM Iguatu";

  const backHref = post.category === "patrulha-mp" ? "patrulha-maria-da-penha.html" : "index.html";
  const backLabel = post.category === "patrulha-mp" ? "← Voltar para Patrulha Maria da Penha" : "← Voltar para Notícias";

  el.innerHTML = `
    <div class="wrap" style="padding-top:36px;">
      <a class="back-link" href="${backHref}">${backLabel}</a>
      <div class="post-head">
        <span class="tag ${post.category}">${tagLabel(post.category)}</span>
        <h1>${post.title}</h1>
        <span class="date">${formatDate(post.date)}</span>
      </div>
      <div class="post-cover">${thumbHTML(post)}</div>
      <div class="post-body">
        ${post.body.map(p => `<p>${p}</p>`).join("")}
      </div>
      ${post.gallery && post.gallery.length ? `
        <div class="post-slider" id="postGallerySlider">
          <div class="track">${post.gallery.map(src => `
            <div class="post-slide">
              <img class="bg" src="${src}" alt="" aria-hidden="true">
              <img class="fg" src="${src}" alt="${post.title}">
            </div>`).join("")}</div>
          ${post.gallery.length > 1 ? `
            <button class="slider-arrow prev" aria-label="Foto anterior">&#8592;</button>
            <button class="slider-arrow next" aria-label="Próxima foto">&#8594;</button>
            <div class="slider-dots">${post.gallery.map((_, i) => `<button class="${i === 0 ? "active" : ""}" aria-label="Ir para foto ${i + 1}"></button>`).join("")}</div>
          ` : ""}
        </div>` : ""}
    </div>
  `;

  const gallerySlider = document.getElementById("postGallerySlider");
  if (gallerySlider && post.gallery.length > 1){
    initSlider(gallerySlider, { autoplay: false });
  }
}

/* Menu hambúrguer + estado ativo da aba atual */
function initNav(){
  const toggle = document.getElementById("navToggle");
  const list = document.getElementById("tabList");
  if (toggle && list){
    toggle.addEventListener("click", () => {
      toggle.classList.toggle("open");
      list.classList.toggle("open");
    });
  }
  const current = window.location.pathname.split("/").pop() || "index.html";
  document.querySelectorAll("nav.tabs a").forEach(a => {
    const href = a.getAttribute("href");
    if (href === current || (current === "" && href === "index.html")){
      a.classList.add("active");
    }
  });
}

document.addEventListener("DOMContentLoaded", initNav);
