// ==========================================
// KONFIGURASI UTAMA
// ==========================================
const CONFIG = {
    GITHUB_USERNAME: 'NanoMindExplorer',
    REPO_NAME: 'nanomind',
    BRANCH: 'main',
    DB_FILE: 'db.json'
};
const DISPATCH_PAGE_SIZE = 7;

let state = {
    data: null, isAdmin: false,
    editingProjectId: null, editingLinkId: null, editingArticleId: null, editingCategoryId: null,
    dispatchFilter: 'all', dispatchPage: 1,
    lastFocusedEl: null
};
let articleBlocks = [];
const $ = (id) => document.getElementById(id);

document.addEventListener('DOMContentLoaded', () => {
    injectSharedChrome();
    setupEventListeners();
    setupMobileMenu();
    setupBackToTop();
    setupSearchPalette();
    registerServiceWorker();
    checkAdminSession();
    loadData();
});

function hideLoader() {
    const l = $('pageLoader');
    if (!l) return;
    l.classList.add('hide');
    setTimeout(() => l.remove(), 600);
}

// ==========================================
// SHARED CHROME — nav, footer, modals (dipakai di semua halaman)
// ==========================================
function injectSharedChrome() {
    const navPh = $('navPlaceholder');
    if (navPh) {
        navPh.innerHTML = `
        <nav class="site-nav">
            <div class="nav-inner">
                <a href="index.html" class="brand">
                    <svg class="brand-mark" viewBox="0 0 100 100" aria-hidden="true">
                        <circle cx="50" cy="50" r="38" fill="none" stroke="#C9974A" stroke-width="4"/>
                        <polygon points="50,13 59,50 41,50" fill="#C9974A"/>
                        <polygon points="50,87 59,50 41,50" fill="#5C5A48"/>
                        <circle cx="50" cy="50" r="7" fill="#14140F" stroke="#C9974A" stroke-width="3.5"/>
                    </svg>
                    <div>
                        <span class="brand-name" id="navBrandName">Nanomind Explorer</span>
                        <span class="brand-tagline font-ui" id="navBrandTagline"></span>
                    </div>
                </a>
                <div class="nav-links">
                    <a href="index.html" class="nav-link" data-nav="home">Dispatches</a>
                    <a href="watch.html" class="nav-link" data-nav="watch">Watch</a>
                    <a href="about.html" class="nav-link" data-nav="about">About</a>
                </div>
                <div class="flex items-center gap-2">
                    <button class="nav-icon-btn" id="navSearchBtn" title="Search (Ctrl+K)" aria-label="Cari"><i class="fas fa-search"></i></button>
                    <button class="nav-icon-btn mobile-menu-btn" id="mobileMenuBtnNav" aria-label="Buka menu" aria-expanded="false"><i class="fas fa-bars"></i></button>
                </div>
            </div>
        </nav>`;
    }
    const mobilePanel = $('mobileNavPanel');
    if (mobilePanel) {
        mobilePanel.innerHTML = `
            <a href="index.html" class="nav-link" data-nav="home">Dispatches</a>
            <a href="watch.html" class="nav-link" data-nav="watch">Watch</a>
            <a href="about.html" class="nav-link" data-nav="about">About</a>`;
    }
    const footerPh = $('footerPlaceholder');
    if (footerPh) {
        footerPh.innerHTML = `
        <footer class="site-footer">
            <div class="footer-inner">
                <p>&copy; <span id="footerYear"></span> <span id="footerBrandName">Nanomind Explorer</span>. All dispatches reserved.</p>
                <p class="font-display" style="font-style:italic; color:var(--muted-on-ink)" id="footerTagline"></p>
            </div>
        </footer>`;
        $('footerYear').textContent = new Date().getFullYear();
    }
    injectModals();
    markActiveNav();
}

function markActiveNav() {
    const path = location.pathname.split('/').pop() || 'index.html';
    const current = (path === '' || path === 'index.html' || path === 'article.html') ? 'home' : (path === 'about.html' ? 'about' : (path === 'watch.html' ? 'watch' : ''));
    document.querySelectorAll('.nav-link').forEach(a => a.classList.toggle('active', a.dataset.nav === current));
}

function injectModals() {
    const ph = $('modalsPlaceholder');
    if (!ph) return;
    ph.innerHTML = `
    <div class="modal-overlay" id="loginModal">
        <div class="modal-content">
            <div class="text-center mb-8">
                <div class="w-14 h-14 rounded-lg flex items-center justify-center text-xl mx-auto mb-4" style="background:var(--brass-soft); color:var(--brass);"><i class="fas fa-lock"></i></div>
                <h3 class="font-display font-semibold text-xl" style="color:var(--parchment-text)">Editor Access</h3>
                <p class="mt-2 text-sm" style="color:var(--muted-on-ink)">Masukkan GitHub Token untuk mengedit</p>
            </div>
            <input type="password" class="input-field mb-4" id="tokenInput" placeholder="ghp_xxxxxxxxxxxxxxxxx">
            <div class="flex gap-3"><button class="btn-ghost flex-1" id="cancelLoginBtn">Cancel</button><button class="btn-primary flex-1" id="loginBtn">Login</button></div>
        </div>
    </div>

    <div class="modal-overlay" id="profileModal">
        <div class="modal-content">
            <h3 class="font-display font-semibold text-xl mb-6" style="color:var(--parchment-text)">Edit Profile</h3>
            <div class="space-y-4">
                <div><label class="block text-sm mb-2" style="color:var(--muted-on-ink)">Name</label><input type="text" class="input-field" id="profileName"></div>
                <div><label class="block text-sm mb-2" style="color:var(--muted-on-ink)">Bio</label><textarea class="input-field" id="profileBio" rows="2"></textarea></div>
                <div><label class="block text-sm mb-2" style="color:var(--muted-on-ink)">Avatar URL</label><input type="text" class="input-field" id="profileAvatar"></div>
                <div><label class="block text-sm mb-2" style="color:var(--muted-on-ink)">Site Title</label><input type="text" class="input-field" id="siteTitle"></div>
                <div><label class="block text-sm mb-2" style="color:var(--muted-on-ink)">Tagline</label><input type="text" class="input-field" id="siteTagline"></div>
            </div>
            <div class="flex gap-3 mt-6"><button class="btn-ghost flex-1" id="cancelProfileBtn">Cancel</button><button class="btn-primary flex-1" id="saveProfileBtn">Save</button></div>
        </div>
    </div>

    <div class="modal-overlay" id="projectModal">
        <div class="modal-content">
            <h3 class="font-display font-semibold text-xl mb-6" id="projectModalTitle" style="color:var(--parchment-text)">Add Project</h3>
            <div class="space-y-4">
                <div><label class="block text-sm mb-2" style="color:var(--muted-on-ink)">Title</label><input type="text" class="input-field" id="projectTitle"></div>
                <div><label class="block text-sm mb-2" style="color:var(--muted-on-ink)">Description</label><textarea class="input-field" id="projectDesc" rows="3"></textarea></div>
                <div><label class="block text-sm mb-2" style="color:var(--muted-on-ink)">Image URL</label><input type="text" class="input-field" id="projectImage"></div>
                <div><label class="block text-sm mb-2" style="color:var(--muted-on-ink)">Project URL</label><input type="text" class="input-field" id="projectUrl"></div>
                <div><label class="block text-sm mb-2" style="color:var(--muted-on-ink)">Tags (pisah koma)</label><input type="text" class="input-field" id="projectTags"></div>
                <div><label class="block text-sm mb-2" style="color:var(--muted-on-ink)">Dispatch terkait (opsional)</label><select class="input-field" id="projectArticleId"><option value="">— Tidak ada —</option></select></div>
            </div>
            <div class="flex gap-3 mt-6"><button class="btn-ghost flex-1" id="cancelProjectBtn">Cancel</button><button class="btn-primary flex-1" id="saveProjectBtn">Save</button></div>
        </div>
    </div>

    <div class="modal-overlay" id="linkModal">
        <div class="modal-content">
            <h3 class="font-display font-semibold text-xl mb-6" id="linkModalTitle" style="color:var(--parchment-text)">Add Link</h3>
            <div class="space-y-4">
                <div><label class="block text-sm mb-2" style="color:var(--muted-on-ink)">Title</label><input type="text" class="input-field" id="linkTitle"></div>
                <div><label class="block text-sm mb-2" style="color:var(--muted-on-ink)">URL</label><input type="text" class="input-field" id="linkUrl"></div>
                <div><label class="block text-sm mb-2" style="color:var(--muted-on-ink)">Icon Class (Font Awesome)</label><input type="text" class="input-field" id="linkIcon" placeholder="fab fa-github"></div>
            </div>
            <div class="flex gap-3 mt-6"><button class="btn-ghost flex-1" id="cancelLinkBtn">Cancel</button><button class="btn-primary flex-1" id="saveLinkBtn">Save</button></div>
        </div>
    </div>

    <div class="modal-overlay" id="categoryModal">
        <div class="modal-content">
            <h3 class="font-display font-semibold text-xl mb-6" id="categoryModalTitle" style="color:var(--parchment-text)">Add Category</h3>
            <div class="space-y-4">
                <div><label class="block text-sm mb-2" style="color:var(--muted-on-ink)">Name</label><input type="text" class="input-field" id="categoryName" placeholder="Technology"></div>
                <div><label class="block text-sm mb-2" style="color:var(--muted-on-ink)">Accent Color</label>
                    <select class="input-field" id="categoryAccent">
                        <option value="brass">Brass (emas)</option>
                        <option value="rust">Rust (merah bata)</option>
                        <option value="moss">Moss (hijau lumut)</option>
                        <option value="slate">Slate (biru abu)</option>
                    </select>
                </div>
                <div><label class="block text-sm mb-2" style="color:var(--muted-on-ink)">Description</label><textarea class="input-field" id="categoryDescription" rows="2"></textarea></div>
            </div>
            <div class="flex gap-3 mt-6">
                <button class="btn-ghost flex-1" id="cancelCategoryBtn">Cancel</button>
                <button class="btn-ghost hidden" id="deleteCategoryBtn" style="color:var(--rust); border-color:var(--rust);">Delete</button>
                <button class="btn-primary flex-1" id="saveCategoryBtn">Save</button>
            </div>
        </div>
    </div>

    <div class="modal-overlay" id="potdModal">
        <div class="modal-content">
            <h3 class="font-display font-semibold text-xl mb-6" style="color:var(--parchment-text)">Edit Photo of the Day</h3>
            <div class="space-y-4">
                <div><label class="block text-sm mb-2" style="color:var(--muted-on-ink)">Image URL</label><input type="text" class="input-field" id="potdImage"></div>
                <div><label class="block text-sm mb-2" style="color:var(--muted-on-ink)">Caption</label><textarea class="input-field" id="potdCaption" rows="2"></textarea></div>
                <div><label class="block text-sm mb-2" style="color:var(--muted-on-ink)">Credit</label><input type="text" class="input-field" id="potdCredit"></div>
            </div>
            <div class="flex gap-3 mt-6"><button class="btn-ghost flex-1" id="cancelPotdBtn">Cancel</button><button class="btn-primary flex-1" id="savePotdBtn">Save</button></div>
        </div>
    </div>

    <div class="modal-overlay" id="articleModal">
        <div class="modal-content" style="max-width:680px;">
            <h3 class="font-display font-semibold text-xl mb-6" id="articleModalTitle" style="color:var(--parchment-text)">New Dispatch</h3>
            <div class="space-y-4">
                <div><label class="block text-sm mb-2" style="color:var(--muted-on-ink)">Title</label><input type="text" class="input-field" id="articleTitle"></div>
                <div><label class="block text-sm mb-2" style="color:var(--muted-on-ink)">Dek (subjudul singkat)</label><textarea class="input-field" id="articleDek" rows="2"></textarea></div>
                <div class="grid grid-cols-2 gap-3">
                    <div><label class="block text-sm mb-2" style="color:var(--muted-on-ink)">Category</label><select class="input-field" id="articleCategory"></select></div>
                    <div><label class="block text-sm mb-2" style="color:var(--muted-on-ink)">Read Time (menit)</label><input type="number" min="1" class="input-field" id="articleReadTime" value="5"></div>
                </div>
                <div><label class="block text-sm mb-2" style="color:var(--muted-on-ink)">Cover Image URL</label><input type="text" class="input-field" id="articleCoverImage"></div>
                <div class="grid grid-cols-2 gap-3">
                    <div><label class="block text-sm mb-2" style="color:var(--muted-on-ink)">Author</label><input type="text" class="input-field" id="articleAuthor"></div>
                    <div><label class="block text-sm mb-2" style="color:var(--muted-on-ink)">Date</label><input type="date" class="input-field" id="articleDate"></div>
                </div>
                <div><label class="block text-sm mb-2" style="color:var(--muted-on-ink)">Tags (pisah koma)</label><input type="text" class="input-field" id="articleTags"></div>
                <label class="flex items-center gap-2 text-sm" style="color:var(--muted-on-ink)"><input type="checkbox" id="articleFeatured"> Jadikan headline utama (hero homepage)</label>
                <div class="pt-2">
                    <label class="block text-sm mb-2" style="color:var(--muted-on-ink)">Isi Dispatch</label>
                    <p class="text-xs mb-2" style="color:var(--muted-on-ink); line-height:1.5;">
                        Tip: Sisipkan tautan inline dengan <code style="background:rgba(255,255,255,0.06); padding:1px 5px; border-radius:3px;">[label](https://url.com)</code>, atau tarik link dari halaman About dengan <code style="background:rgba(255,255,255,0.06); padding:1px 5px; border-radius:3px;">{{link:ID}}</code> (contoh: <code style="background:rgba(255,255,255,0.06); padding:1px 5px; border-radius:3px;">{{link:link1}}</code>). URL telanjang akan otomatis jadi tautan.
                    </p>
                    <div id="blockEditorList"></div>
                    <div class="block-add-row mt-2">
                        <button type="button" class="block-add-btn" data-block-type="paragraph"><i class="fas fa-paragraph"></i> Paragraf</button>
                        <button type="button" class="block-add-btn" data-block-type="heading"><i class="fas fa-heading"></i> Judul Bagian</button>
                        <button type="button" class="block-add-btn" data-block-type="image"><i class="fas fa-image"></i> Gambar</button>
                        <button type="button" class="block-add-btn" data-block-type="quote"><i class="fas fa-quote-left"></i> Kutipan</button>
                        <button type="button" class="block-add-btn" data-block-type="link"><i class="fas fa-link"></i> Tautan</button>
                        <button type="button" class="block-add-btn" data-block-type="video"><i class="fas fa-video"></i> Video</button>
                        <button type="button" class="block-add-btn" data-block-type="video-short"><i class="fas fa-mobile-screen"></i> Video Short</button>
                    </div>
                </div>
            </div>
            <div class="flex gap-3 mt-6"><button class="btn-ghost flex-1" id="cancelArticleBtn">Cancel</button><button class="btn-primary flex-1" id="saveArticleBtn">Publish</button></div>
        </div>
    </div>

    <div class="modal-overlay" id="caseStudyModal">
        <div class="modal-content case-study-content">
            <button class="modal-close-btn" id="caseStudyClose" aria-label="Tutup"><i class="fas fa-times"></i></button>
            <img id="csImage" class="case-study-image" src="" alt="">
            <div class="case-study-body">
                <div class="flex flex-wrap gap-2 mb-3" id="csTags"></div>
                <h3 class="font-display font-semibold text-2xl mb-2" id="csTitle" style="color:var(--parchment-text)"></h3>
                <p class="text-sm mb-4 font-ui" id="csDesc" style="color:var(--muted-on-ink)"></p>
                <div class="flex flex-wrap items-center gap-2 mb-5" id="csGithubBadges"></div>
                <div class="flex gap-3 flex-wrap">
                    <a href="#" id="csVisitBtn" target="_blank" rel="noopener" class="btn-primary flex-1 justify-center">Visit Project</a>
                    <a href="#" id="csReadArticleBtn" class="btn-ghost flex-1 justify-center hidden">Baca Dispatch</a>
                </div>
            </div>
        </div>
    </div>

    <div class="modal-overlay" id="searchModal">
        <div class="modal-content">
            <div class="search-input-row">
                <i class="fas fa-search"></i>
                <input type="text" class="search-input" id="searchInput" placeholder="Cari dispatch, project, atau link..." autocomplete="off" autocapitalize="off" spellcheck="false">
                <span class="search-hint">ESC</span>
            </div>
            <div class="search-results" id="searchResults"><p class="search-empty">Ketik untuk mencari dispatch, project, atau link.</p></div>
        </div>
    </div>

    <div class="modal-overlay" id="videoModal">
        <div class="modal-content">
            <h3 class="font-display font-semibold text-xl mb-6" id="videoModalTitle" style="color:var(--parchment-text)">Add Video</h3>
            <div class="space-y-4">
                <div><label class="block text-sm mb-2" style="color:var(--muted-on-ink)">Type</label>
                    <select class="input-field" id="videoType">
                        <option value="youtube">YouTube (Landscape)</option>
                        <option value="youtube-short">YouTube Shorts (Portrait)</option>
                    </select>
                </div>
                <div><label class="block text-sm mb-2" style="color:var(--muted-on-ink)">URL</label><input type="text" class="input-field" id="videoUrl" placeholder="https://youtube.com/watch?v=... atau /shorts/..."></div>
                <div><label class="block text-sm mb-2" style="color:var(--muted-on-ink)">Title</label><input type="text" class="input-field" id="videoTitle"></div>
                <div><label class="block text-sm mb-2" style="color:var(--muted-on-ink)">Caption</label><textarea class="input-field" id="videoCaption" rows="2"></textarea></div>
                <div><label class="block text-sm mb-2" style="color:var(--muted-on-ink)">Tags (pisah koma)</label><input type="text" class="input-field" id="videoTags"></div>
                <div><label class="block text-sm mb-2" style="color:var(--muted-on-ink)">Dispatch terkait (opsional)</label><select class="input-field" id="videoArticleId"><option value="">— Tidak ada —</option></select></div>
            </div>
            <div class="flex gap-3 mt-6"><button class="btn-ghost flex-1" id="cancelVideoBtn">Cancel</button><button class="btn-primary flex-1" id="saveVideoBtn">Save</button></div>
        </div>
    </div>

    <div class="modal-overlay" id="videoLightboxModal">
        <div class="modal-content">
            <button class="modal-close-btn" id="videoLightboxClose" aria-label="Tutup"><i class="fas fa-times"></i></button>
            <div class="vlb-frame" id="vlbFrame"></div>
            <p class="vlb-caption" id="vlbCaption"></p>
        </div>
    </div>`;

    document.querySelectorAll('.block-add-btn').forEach(btn => {
        btn.addEventListener('click', () => { articleBlocks.push({ type: btn.dataset.blockType }); renderBlockEditor(); });
    });
}

// ==========================================
// MOBILE MENU / BACK TO TOP
// ==========================================
function setupMobileMenu() {
    const btn = $('mobileMenuBtnNav'), panel = $('mobileNavPanel'), backdrop = $('mobileNavBackdrop');
    if (!btn || !panel || !backdrop) return;
    const openPanel = () => { panel.classList.add('open'); backdrop.classList.add('open'); btn.setAttribute('aria-expanded', 'true'); };
    const closePanel = () => { panel.classList.remove('open'); backdrop.classList.remove('open'); btn.setAttribute('aria-expanded', 'false'); };
    btn.addEventListener('click', () => panel.classList.contains('open') ? closePanel() : openPanel());
    backdrop.addEventListener('click', closePanel);
    panel.querySelectorAll('a').forEach(a => a.addEventListener('click', closePanel));
}
function setupBackToTop() {
    const btn = $('backToTopBtn');
    if (!btn) return;
    window.addEventListener('scroll', () => btn.classList.toggle('show', window.scrollY > 500));
    btn.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
}

// ==========================================
// SEARCH PALETTE
// ==========================================
function setupSearchPalette() {
    document.addEventListener('click', (e) => {
        if (e.target.closest('#searchFab') || e.target.closest('#navSearchBtn')) openSearch();
    });
    document.addEventListener('keydown', (e) => {
        if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
            e.preventDefault();
            $('searchModal').classList.contains('active') ? closeModal('searchModal') : openSearch();
        }
    });
    const input = $('searchInput');
    if (input) input.addEventListener('input', (e) => renderSearchResults(e.target.value));
}
function openSearch() {
    openModal('searchModal');
    setTimeout(() => { const i = $('searchInput'); if (i) { i.value = ''; i.focus(); renderSearchResults(''); } }, 60);
}
function fuzzySearchAll(q) {
    q = q.toLowerCase();
    const results = [];
    if (!state.data) return results;
    (state.data.articles || []).forEach(a => {
        if ((a.title || '').toLowerCase().includes(q) || (a.tags || []).some(t => t.toLowerCase().includes(q)) || (a.dek || '').toLowerCase().includes(q)) {
            results.push({ icon: 'fa-feather-pointed', label: a.title, meta: 'Dispatch', href: `article.html?id=${a.id}` });
        }
    });
    (state.data.projects || []).forEach(p => {
        if ((p.title || '').toLowerCase().includes(q)) {
            results.push({ icon: 'fa-compass-drafting', label: p.title, meta: 'Project', href: `about.html#project-${p.id}` });
        }
    });
    (state.data.links || []).forEach(l => {
        if ((l.title || '').toLowerCase().includes(q)) {
            results.push({ icon: 'fa-link', label: l.title, meta: 'Link', href: l.url, external: true });
        }
    });
    (state.data.videos || []).forEach(v => {
        const label = v.title || v.caption || 'Video';
        if (label.toLowerCase().includes(q) || (v.tags || []).some(t => t.toLowerCase().includes(q))) {
            results.push({ icon: v.type === 'youtube-short' ? 'fa-mobile-screen' : 'fa-video', label, meta: v.type === 'youtube-short' ? 'Short' : 'Video', href: `watch.html?open=${v.id}` });
        }
    });
    return results;
}
function renderSearchResults(q) {
    const wrap = $('searchResults');
    if (!wrap) return;
    if (!q.trim()) { wrap.innerHTML = '<p class="search-empty">Ketik untuk mencari dispatch, project, atau link.</p>'; return; }
    const results = fuzzySearchAll(q).slice(0, 8);
    if (!results.length) { wrap.innerHTML = `<p class="search-empty">Tidak ada hasil untuk "${escapeHtml(q)}".</p>`; return; }
    wrap.innerHTML = results.map(r => `
        <button type="button" class="search-result-item" data-href="${escapeHtml(r.href)}" data-external="${r.external ? '1' : '0'}">
            <span class="sr-icon"><i class="fas ${r.icon}"></i></span>
            <span class="flex-1 text-left"><span class="sr-label block">${escapeHtml(r.label)}</span><span class="sr-meta">${r.meta}</span></span>
        </button>`).join('');
    wrap.querySelectorAll('.search-result-item').forEach(btn => {
        btn.addEventListener('click', () => {
            closeModal('searchModal');
            if (btn.dataset.external === '1') window.open(btn.dataset.href, '_blank');
            else location.href = btn.dataset.href;
        });
    });
}

// ==========================================
// PWA — service worker
// ==========================================
function registerServiceWorker() {
    if (!('serviceWorker' in navigator)) return;
    window.addEventListener('load', () => { navigator.serviceWorker.register('sw.js').catch(() => {}); });
}

// ==========================================
// LOAD DATA
// ==========================================
async function loadData() {
    const rawUrl = `https://raw.githubusercontent.com/${CONFIG.GITHUB_USERNAME}/${CONFIG.REPO_NAME}/${CONFIG.BRANCH}/${CONFIG.DB_FILE}`;
    try {
        const res = await fetch(rawUrl, { cache: 'no-store' });
        if (!res.ok) throw new Error('Failed');
        state.data = await res.json();
        state.data.profile = state.data.profile || {};
        state.data.site = state.data.site || {};
        state.data.categories = state.data.categories || [];
        state.data.articles = state.data.articles || [];
        state.data.projects = state.data.projects || [];
        state.data.links = state.data.links || [];
        state.data.videos = state.data.videos || [];
        renderPageContent();
    } catch (err) {
        console.error('Load failed', err);
        state.data = { profile: { name: 'Failed to Load', bio: 'Cek konfigurasi script.js' }, site: {}, categories: [], articles: [], projects: [], links: [], videos: [] };
        renderPageContent();
        showToast('Gagal memuat data. Cek koneksi internet.', 'error');
    } finally {
        hideLoader();
    }
}

// ==========================================
// PAGE DISPATCHER
// ==========================================
function renderPageContent() {
    if (!state.data) return;
    const { profile, site, categories, articles, photoOfDay, projects, links } = state.data;

    const navBrandName = $('navBrandName'); if (navBrandName) navBrandName.textContent = site.title || profile.name || 'Nanomind Explorer';
    const navBrandTagline = $('navBrandTagline'); if (navBrandTagline) navBrandTagline.textContent = site.tagline || '';
    const footerBrandName = $('footerBrandName'); if (footerBrandName) footerBrandName.textContent = site.title || profile.name || '';
    const footerTagline = $('footerTagline'); if (footerTagline) footerTagline.textContent = site.tagline || '';
    document.title = site.title ? `${site.title} — Dispatches from the Frontier` : document.title;

    if ($('heroFeature')) {
        renderHero(articles);
        renderPhotoOfDay(photoOfDay);
        renderCategoryPills(categories, state.dispatchFilter);
        renderDispatchGrid();
    }
    if ($('articleContent')) {
        renderArticlePage();
    }
    if ($('aboutName')) {
        $('aboutAvatar').src = profile.avatar || 'https://via.placeholder.com/132';
        $('aboutName').textContent = profile.name || 'Your Name';
        $('aboutBio').textContent = profile.bio || '';
        renderProjects(projects);
        attachGithubBadges(projects);
        renderLinks(links);
    }
    if ($('videoGrid')) {
        renderVideoFilterTabs();
        renderVideoGallery();
        const openId = new URLSearchParams(location.search).get('open');
        if (openId) setTimeout(() => openVideoLightbox(openId), 300);
    }

    setTimeout(() => {
        document.querySelectorAll('.reveal').forEach(el => { if (isElementInViewport(el)) el.classList.add('visible'); });
    }, 100);
    setupScrollObserver();
}

// ==========================================
// HOMEPAGE — Hero, Photo of the Day, Dispatch Grid
// ==========================================
function renderHero(articles) {
    const wrap = $('heroFeature');
    if (!wrap) return;
    const featured = (articles || []).find(a => a.featured) || articles[0];
    if (!featured) {
        wrap.innerHTML = `<div class="max-w-[1200px] mx-auto px-6 py-24 text-center font-ui" style="color:var(--muted-on-ink)">Belum ada dispatch. Mulai tulis yang pertama lewat tombol admin di pojok kanan bawah.</div>`;
        return;
    }
    const cat = (state.data.categories || []).find(c => c.id === featured.category) || { name: 'Dispatch', accent: 'brass' };
    wrap.className = 'accent-' + (cat.accent || 'brass');
    wrap.innerHTML = `
        <div class="hero-feature">
            <img src="${featured.coverImage}" alt="${escapeHtml(featured.title)}">
            <svg class="route-line" viewBox="0 0 200 400" style="left:6%; top:4%; width:100px; height:60%;" aria-hidden="true"><path d="M20,10 C60,80 10,160 90,220 S140,340 100,380" /></svg>
            <div class="hero-feature-content">
                <span class="eyebrow" style="color:#fff;">${escapeHtml(cat.name)}</span>
                <h1 class="mt-5">${escapeHtml(featured.title)}</h1>
                ${featured.dek ? `<p class="dek">${escapeHtml(featured.dek)}</p>` : ''}
                <a href="article.html?id=${featured.id}" class="btn-primary mt-8"><i class="fas fa-book-open"></i> Baca Dispatch</a>
            </div>
        </div>`;
}

function renderPhotoOfDay(potd) {
    const wrap = $('potdSection');
    if (!wrap) return;
    if (!potd || !potd.image) {
        wrap.innerHTML = state.isAdmin ? `<button class="btn-ghost admin-only" id="editPotdBtn"><i class="fas fa-camera-retro"></i> Set Photo of the Day</button>` : '';
        const btn = $('editPotdBtn'); if (btn) btn.addEventListener('click', openPotdModal);
        return;
    }
    wrap.innerHTML = `
        <div class="potd">
            <div class="potd-image"><img src="${potd.image}" alt="Photo of the day" loading="lazy"></div>
            <div class="potd-text">
                <span class="potd-label"><i class="fas fa-camera-retro"></i> Photo of the Day</span>
                <p class="potd-caption">${escapeHtml(potd.caption || '')}</p>
                ${potd.credit ? `<p class="potd-credit">— ${escapeHtml(potd.credit)}</p>` : ''}
                <button class="btn-ghost mt-6 admin-only" id="editPotdBtn" style="align-self:flex-start;"><i class="fas fa-pen"></i> Edit</button>
            </div>
        </div>`;
    const btn = $('editPotdBtn'); if (btn) btn.addEventListener('click', openPotdModal);
}

function renderCategoryPills(categories, activeFilter) {
    const wrap = $('categoryPills');
    if (!wrap) return;
    let html = `<button class="cat-pill ${activeFilter === 'all' ? 'active' : ''}" data-cat="all">All</button>`;
    (categories || []).forEach(c => {
        html += `<span class="inline-flex items-center gap-1">
            <button class="cat-pill ${activeFilter === c.id ? 'active' : ''}" data-cat="${c.id}">${escapeHtml(c.name)}</button>
            ${state.isAdmin ? `<button class="admin-only" data-edit-cat="${c.id}" style="color:var(--muted-on-ink); font-size:11px; padding:4px;"><i class="fas fa-pen"></i></button>` : ''}
        </span>`;
    });
    if (state.isAdmin) html += `<button class="cat-pill admin-only" id="manageCategoriesBtn" style="border-style:dashed;"><i class="fas fa-plus"></i> Category</button>`;
    wrap.innerHTML = html;
    wrap.querySelectorAll('[data-cat]').forEach(btn => {
        btn.addEventListener('click', () => {
            state.dispatchFilter = btn.dataset.cat;
            state.dispatchPage = 1;
            renderCategoryPills(state.data.categories, state.dispatchFilter);
            renderDispatchGrid();
        });
    });
    wrap.querySelectorAll('[data-edit-cat]').forEach(btn => {
        btn.addEventListener('click', (e) => { e.stopPropagation(); openCategoryModal(btn.dataset.editCat); });
    });
    const manageBtn = $('manageCategoriesBtn');
    if (manageBtn) manageBtn.addEventListener('click', () => openCategoryModal());
}

function renderDispatchGrid() {
    const wrap = $('dispatchGrid');
    if (!wrap) return;
    const all = (state.data.articles || []).slice().sort((a, b) => new Date(b.date) - new Date(a.date));
    const filtered = (state.dispatchFilter && state.dispatchFilter !== 'all') ? all.filter(a => a.category === state.dispatchFilter) : all;
    const visibleCount = state.dispatchPage * DISPATCH_PAGE_SIZE;
    const visible = filtered.slice(0, visibleCount);

    $('dispatchEmpty').classList.toggle('hidden', visible.length > 0);
    wrap.innerHTML = visible.map((a, i) => dispatchCardHtml(a, i)).join('');
    const loadMoreBtn = $('dispatchLoadMoreBtn');
    if (loadMoreBtn) {
        loadMoreBtn.classList.toggle('hidden', visibleCount >= filtered.length);
        loadMoreBtn.onclick = () => {
            state.dispatchPage++;
            renderDispatchGrid();
            setTimeout(() => document.querySelectorAll('.reveal').forEach(el => { if (isElementInViewport(el)) el.classList.add('visible'); }), 50);
        };
    }
    setupScrollObserver();
}

function dispatchCardHtml(a, i) {
    const cat = (state.data.categories || []).find(c => c.id === a.category) || { name: 'Dispatch', accent: 'brass' };
    const pos = i % 5;
    let span, sizeClass;
    if (pos === 0) { span = 'span-4'; sizeClass = 'size-lg'; }
    else if (pos === 1) { span = 'span-2'; sizeClass = 'size-sm'; }
    else { span = 'span-2'; sizeClass = 'size-md'; }
    return `
        <a href="article.html?id=${a.id}" class="dispatch-card ${sizeClass} ${span} accent-${cat.accent || 'brass'} reveal">
            <div class="thumb"><img src="${a.coverImage}" alt="${escapeHtml(a.title)}" loading="lazy"></div>
            <div class="card-body">
                <span class="card-eyebrow">${escapeHtml(cat.name)}</span>
                <h3>${escapeHtml(a.title)}</h3>
                <div class="card-meta"><span>${formatDate(a.date)}</span><span>·</span><span>${a.readTime || 5} min</span></div>
            </div>
        </a>`;
}

// ==========================================
// ARTICLE PAGE
// ==========================================
// Render teks paragraf/heading/quote dengan dukungan tautan inline:
//   [label](https://url.com)         → tautan Markdown style
//   {{link:ID}}                       → tarik otomatis dari daftar links di halaman About
//   https://example.com               → URL telanjang otomatis jadi tautan
function renderTextWithLinks(text) {
    if (!text) return '';
    // Escape dulu untuk keamanan
    let safe = escapeHtml(text);
    // 1) Placeholder {{link:ID}} — tarik dari state.data.links
    safe = safe.replace(/\{\{link:([a-zA-Z0-9_-]+)\}\}/g, (m, id) => {
        const link = (state.data && state.data.links || []).find(l => l.id === id);
        if (!link) return `<span class="broken-link" title="Link tidak ditemukan di halaman About">[link? ${escapeHtml(id)}]</span>`;
        const label = escapeHtml(link.title || link.url || 'link');
        const href = escapeHtml(link.url || '#');
        const icon = link.icon ? `<i class="${escapeHtml(link.icon)}"></i> ` : '';
        return `<a href="${href}" target="_blank" rel="noopener noreferrer" class="inline-link about-link" data-link-id="${escapeHtml(id)}">${icon}${label}</a>`;
    });
    // 2) Markdown style [label](url)
    safe = safe.replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, (m, label, url) => {
        return `<a href="${url}" target="_blank" rel="noopener noreferrer" class="inline-link">${label}</a>`;
    });
    // 3) URL telanjang yang belum tertangkap (tidak dalam atribut href)
    safe = safe.replace(/(^|[^"'>=\(])(https?:\/\/(?:www\.)?[^\s<]+\.[^\s<]+)/g, (m, prefix, url) => {
        // Hindari URL yang sudah ada di dalam atribut href="..."
        return `${prefix}<a href="${url}" target="_blank" rel="noopener noreferrer" class="inline-link bare-url">${url}</a>`;
    });
    return safe;
}

// Cari objek link berdasarkan ref ID (untuk block tipe 'link' yang ditarik dari halaman About)
// URL selalu ditarik dari About (agar sinkron otomatis), tetapi label/ikon bisa di-override
// oleh teks kustom yang ditulis admin di artikel.
function resolveLinkBlock(b) {
    if (b.linkRef) {
        const ref = (state.data && state.data.links || []).find(l => l.id === b.linkRef);
        if (ref) {
            return {
                text: (b.text && b.text.trim()) ? b.text : (ref.title || ref.url),
                url: ref.url,                                  // URL selalu sync dari About
                icon: (b.icon && b.icon.trim()) ? b.icon : (ref.icon || ''),
                fromAbout: true
            };
        }
    }
    return {
        text: b.text || b.url || '',
        url: b.url || '',
        icon: b.icon || '',
        fromAbout: false
    };
}

function renderArticleBody(blocks) {
    let html = '';
    let leadDone = false;
    (blocks || []).forEach(b => {
        if (b.type === 'paragraph') {
            const cls = !leadDone ? ' class="lead"' : '';
            html += `<p${cls}>${renderTextWithLinks(b.text || '')}</p>`;
            leadDone = true;
        } else if (b.type === 'heading') {
            html += `<h2>${renderTextWithLinks(b.text || '')}</h2>`;
        } else if (b.type === 'image') {
            html += `<figure><img src="${b.url}" alt="${escapeHtml(b.caption || '')}" loading="lazy">`;
            if (b.caption || b.credit) html += `<figcaption>${escapeHtml(b.caption || '')}${b.credit ? ` — ${escapeHtml(b.credit)}` : ''}</figcaption>`;
            html += `</figure>`;
        } else if (b.type === 'quote') {
            html += `<blockquote>${renderTextWithLinks(b.text || '')}${b.attribution ? `<cite>${escapeHtml(b.attribution)}</cite>` : ''}</blockquote>`;
        } else if (b.type === 'link') {
            const resolved = resolveLinkBlock(b);
            if (resolved.url) {
                const icon = resolved.icon ? `<i class="${escapeHtml(resolved.icon)}"></i>` : '<i class="fas fa-arrow-up-right-from-square"></i>';
                const badge = resolved.fromAbout ? '<span class="link-from-about" title="Ditarik otomatis dari halaman About"><i class="fas fa-link"></i></span>' : '';
                html += `<a href="${escapeHtml(resolved.url)}" target="_blank" rel="noopener noreferrer" class="article-link-block">${icon}<span>${escapeHtml(resolved.text)}</span>${badge}</a>`;
            }
        } else if (b.type === 'video' || b.type === 'video-short') {
            const id = extractYouTubeId(b.url);
            const orientClass = b.type === 'video-short' ? ' portrait' : '';
            html += `<div class="article-video${orientClass}">${id ? `<iframe src="https://www.youtube.com/embed/${id}" allow="autoplay; encrypted-media" allowfullscreen loading="lazy"></iframe>` : '<p style="padding:20px;">Video tidak valid</p>'}</div>`;
        }
    });
    return html;
}

function renderArticlePage() {
    const params = new URLSearchParams(location.search);
    const id = params.get('id');
    const article = (state.data.articles || []).find(a => a.id === id);
    const content = $('articleContent');
    if (!article) {
        $('articleNotFound').style.display = 'block';
        content.innerHTML = '';
        return;
    }
    $('articleNotFound').style.display = 'none';
    const cat = (state.data.categories || []).find(c => c.id === article.category) || { name: 'Dispatch', accent: 'brass' };

    document.title = `${article.title} — Nanomind Explorer`;
    const setMeta = (id2, val) => { const el = $(id2); if (el) el.setAttribute('content', val || ''); };
    setMeta('pageDescription', article.dek);
    setMeta('ogTitle', article.title);
    setMeta('ogDescription', article.dek);
    setMeta('ogImage', article.coverImage);

    content.className = 'accent-' + (cat.accent || 'brass');
    content.innerHTML = `
        <div class="article-hero">
            <img src="${article.coverImage}" alt="${escapeHtml(article.title)}">
            <div class="article-hero-content">
                <span class="eyebrow" style="color:#fff;">${escapeHtml(cat.name)}</span>
                <h1 class="mt-4">${escapeHtml(article.title)}</h1>
                ${article.dek ? `<p class="dek">${escapeHtml(article.dek)}</p>` : ''}
                <div class="byline-row">
                    <span>${escapeHtml(article.author || '')}</span>
                    <span class="sep"></span>
                    <span>${formatDate(article.date)}</span>
                    <span class="sep"></span>
                    <span>${article.readTime || 5} min baca</span>
                </div>
            </div>
        </div>
        <div class="reading-surface">
            ${renderArticleBody(article.body)}
            ${(article.tags || []).length ? `<div class="tag-row">${article.tags.map(t => `<span class="tag-chip">${escapeHtml(t)}</span>`).join('')}</div>` : ''}
            <div class="mt-10 admin-only" style="display:flex; gap:10px;" id="articleAdminControls">
                <button class="btn-ghost on-paper" id="editArticleBtn"><i class="fas fa-pen"></i> Edit Dispatch</button>
                <button class="btn-ghost on-paper" id="deleteArticleBtn" style="color:var(--rust); border-color:var(--rust);"><i class="fas fa-trash"></i> Delete</button>
            </div>
        </div>`;

    const editBtn = $('editArticleBtn'); if (editBtn) editBtn.addEventListener('click', () => openArticleModal(article.id));
    const delBtn = $('deleteArticleBtn'); if (delBtn) delBtn.addEventListener('click', () => deleteArticle(article.id));

    renderRelated(article);
}

function renderRelated(article) {
    const wrap = $('relatedGrid');
    const section = $('relatedSection');
    if (!wrap || !section) return;
    const sameCategory = (state.data.articles || []).filter(a => a.id !== article.id && a.category === article.category);
    const others = (state.data.articles || []).filter(a => a.id !== article.id && a.category !== article.category);
    const combined = [...sameCategory, ...others].slice(0, 3);
    if (!combined.length) { section.classList.add('hidden'); return; }
    section.classList.remove('hidden');
    wrap.innerHTML = combined.map((a, i) => dispatchCardHtml(a, i + 1)).join('');
}

// ==========================================
// ABOUT PAGE — Projects & Links
// ==========================================
function renderProjects(projects) {
    const wrap = $('projectsGrid');
    if (!wrap) return;
    if (!projects || !projects.length) { wrap.innerHTML = `<p class="font-ui" style="color:var(--muted-on-ink)">Belum ada project.</p>`; return; }
    wrap.innerHTML = '';
    projects.forEach(p => {
        const tags = (p.tags || []).map(t => `<span class="tag-chip" style="background:rgba(255,255,255,0.05); color:var(--muted-on-ink);">${escapeHtml(t)}</span>`).join('');
        const card = document.createElement('div');
        card.className = 'workshop-card reveal';
        card.id = 'project-' + p.id;
        card.dataset.id = p.id;
        card.innerHTML = `
            <div class="edit-btn" onclick="event.stopPropagation(); openProjectModal('${p.id}')"><i class="fas fa-pen text-xs"></i></div>
            <div class="delete-btn" onclick="event.stopPropagation(); deleteProject('${p.id}')"><i class="fas fa-trash text-xs"></i></div>
            <h3 class="font-display font-semibold text-xl mb-2" style="color:var(--parchment-text)">${escapeHtml(p.title || '')}</h3>
            <p class="font-ui text-sm mb-4" style="color:var(--muted-on-ink)">${escapeHtml(p.description || '')}</p>
            <div class="flex flex-wrap gap-2 project-tags-row mb-1">${tags}</div>`;
        card.addEventListener('click', (e) => {
            if (e.target.closest('.edit-btn') || e.target.closest('.delete-btn')) return;
            openCaseStudy(p.id);
        });
        wrap.appendChild(card);
    });
}

function renderLinks(links) {
    const wrap = $('linksList');
    if (!wrap) return;
    if (!links || !links.length) { wrap.innerHTML = `<p class="font-ui" style="color:var(--muted-on-ink)">Belum ada link.</p>`; return; }
    wrap.innerHTML = '';
    links.forEach(l => {
        const card = document.createElement('div');
        card.className = 'link-row reveal';
        card.style.position = 'relative';
        card.tabIndex = 0;
        card.innerHTML = `
            <div class="edit-btn" onclick="event.stopPropagation(); openLinkModal('${l.id}')"><i class="fas fa-pen text-xs"></i></div>
            <div class="delete-btn" onclick="event.stopPropagation(); deleteLink('${l.id}')"><i class="fas fa-trash text-xs"></i></div>
            <div class="icon-box"><i class="${l.icon}"></i></div>
            <div class="flex-1 min-w-0">
                <h4 class="font-ui font-semibold truncate" style="color:var(--parchment-text)">${escapeHtml(l.title)}</h4>
                <p class="font-ui text-xs truncate" style="color:var(--muted-on-ink)">${escapeHtml(l.url)}</p>
            </div>
            <i class="fas fa-arrow-right" style="color:var(--muted-on-ink)"></i>`;
        const go = () => window.open(l.url, '_blank');
        card.addEventListener('click', (e) => { if (e.target.closest('.edit-btn') || e.target.closest('.delete-btn')) return; go(); });
        card.addEventListener('keydown', (e) => { if (e.key === 'Enter') go(); });
        wrap.appendChild(card);
    });
}

// ==========================================
// WATCH PAGE — Videos & Shorts
// ==========================================
function renderVideoFilterTabs() {
    const wrap = $('videoFilterTabs');
    if (!wrap) return;
    state.videoFilter = state.videoFilter || 'all';
    wrap.querySelectorAll('[data-vfilter]').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.vfilter === state.videoFilter);
        btn.onclick = () => { state.videoFilter = btn.dataset.vfilter; renderVideoFilterTabs(); renderVideoGallery(); };
    });
}
function videoCardHtml(v, orientation) {
    const isPortrait = orientation === 'portrait';
    const id = extractYouTubeId(v.url);
    const thumb = id ? `https://img.youtube.com/vi/${id}/hqdefault.jpg` : '';
    return `
        <div class="video-card ${isPortrait ? 'portrait' : 'landscape'} reveal" data-video-id="${v.id}" role="button" tabindex="0">
            <div class="edit-btn" onclick="event.stopPropagation(); openVideoModal('${v.id}')"><i class="fas fa-pen text-xs"></i></div>
            <div class="delete-btn" onclick="event.stopPropagation(); deleteVideo('${v.id}')"><i class="fas fa-trash text-xs"></i></div>
            <div class="vthumb-wrap">
                <span class="vtype-chip">${v.type === 'youtube-short' ? 'Shorts' : 'Video'}</span>
                ${thumb ? `<img src="${thumb}" alt="${escapeHtml(v.title || '')}" loading="lazy" onerror="this.style.display='none'">` : ''}
                <div class="vplay-badge"><i class="fas fa-play"></i></div>
                ${(v.caption || v.title) ? `<div class="vcaption-overlay">${escapeHtml(v.caption || v.title)}</div>` : ''}
            </div>
        </div>`;
}
function renderVideoGallery() {
    const shelfWrap = $('shortsShelfWrap'), shelfGrid = $('shortsShelfGrid'), grid = $('videoGrid'), emptyMsg = $('videoEmpty');
    if (!grid) return;
    const videos = state.data.videos || [];
    const shorts = videos.filter(v => v.type === 'youtube-short');
    const landscape = videos.filter(v => v.type === 'youtube');
    const filter = state.videoFilter || 'all';

    const showShelf = (filter === 'all' || filter === 'shorts') && shorts.length > 0;
    shelfWrap.classList.toggle('hidden', !showShelf);
    shelfGrid.innerHTML = showShelf ? shorts.map(v => videoCardHtml(v, 'portrait')).join('') : '';

    const gridSource = (filter === 'all' || filter === 'landscape') ? landscape : [];
    grid.innerHTML = gridSource.map(v => videoCardHtml(v, 'landscape')).join('');

    emptyMsg.classList.toggle('hidden', showShelf || gridSource.length > 0);

    document.querySelectorAll('[data-video-id]').forEach(card => {
        card.addEventListener('click', (e) => {
            if (e.target.closest('.edit-btn') || e.target.closest('.delete-btn')) return;
            openVideoLightbox(card.dataset.videoId);
        });
        card.addEventListener('keydown', (e) => { if (e.key === 'Enter') openVideoLightbox(card.dataset.videoId); });
    });
    setTimeout(() => document.querySelectorAll('.reveal').forEach(el => { if (isElementInViewport(el)) el.classList.add('visible'); }), 50);
    setupScrollObserver();
}
function openVideoLightbox(id) {
    const v = (state.data.videos || []).find(x => x.id === id);
    if (!v) return;
    const vid = extractYouTubeId(v.url);
    const frame = $('vlbFrame');
    frame.className = 'vlb-frame ' + (v.type === 'youtube-short' ? 'portrait' : 'landscape');
    frame.innerHTML = vid
        ? `<iframe src="https://www.youtube.com/embed/${vid}?autoplay=1&rel=0" allow="autoplay; encrypted-media; picture-in-picture" allowfullscreen></iframe>`
        : `<div style="padding:24px;color:#fff;">URL tidak valid</div>`;
    $('vlbCaption').textContent = v.caption || v.title || '';
    openModal('videoLightboxModal');
}
function closeVideoLightbox() {
    const f = $('vlbFrame'); if (f) f.innerHTML = '';
    closeModal('videoLightboxModal');
}
function openVideoModal(id = null) {
    state.editingVideoId = id;
    const artSelect = $('videoArticleId');
    artSelect.innerHTML = '<option value="">— Tidak ada —</option>' + (state.data.articles || []).map(a => `<option value="${a.id}">${escapeHtml(a.title)}</option>`).join('');
    if (id) {
        const v = state.data.videos.find(x => x.id === id);
        if (!v) return;
        $('videoModalTitle').textContent = 'Edit Video';
        $('videoType').value = v.type || 'youtube';
        $('videoUrl').value = v.url || '';
        $('videoTitle').value = v.title || '';
        $('videoCaption').value = v.caption || '';
        $('videoTags').value = (v.tags || []).join(', ');
        artSelect.value = v.articleId || '';
    } else {
        $('videoModalTitle').textContent = 'Add Video';
        $('videoType').value = 'youtube';
        $('videoUrl').value = ''; $('videoTitle').value = ''; $('videoCaption').value = ''; $('videoTags').value = '';
        artSelect.value = '';
    }
    openModal('videoModal');
}
async function saveVideo() {
    const url = $('videoUrl').value.trim();
    if (!url || !extractYouTubeId(url)) { showToast('URL YouTube tidak valid.', 'error'); return; }
    const data = {
        id: state.editingVideoId || generateId(),
        type: $('videoType').value,
        url,
        title: $('videoTitle').value.trim(),
        caption: $('videoCaption').value.trim(),
        tags: $('videoTags').value.split(',').map(t => t.trim()).filter(Boolean),
        articleId: $('videoArticleId').value || null,
        date: new Date().toISOString().slice(0, 10)
    };
    state.data.videos = state.data.videos || [];
    if (state.editingVideoId) {
        const i = state.data.videos.findIndex(x => x.id === state.editingVideoId);
        state.data.videos[i] = data;
    } else {
        state.data.videos.push(data);
    }
    await saveToGitHub();
    closeModal('videoModal');
    renderVideoGallery();
}
async function deleteVideo(id) {
    if (!confirm('Hapus video ini?')) return;
    state.data.videos = (state.data.videos || []).filter(x => x.id !== id);
    await saveToGitHub();
    renderVideoGallery();
}

// ==========================================
// GITHUB PROOF-OF-WORK
// ==========================================
function extractGithubRepo(url) {
    if (!url) return null;
    const m = String(url).match(/github\.com\/([^\/\s?#]+)\/([^\/\s?#]+)/);
    return m ? { owner: m[1], repo: m[2] } : null;
}
async function fetchGithubStats(owner, repo) {
    const key = `gh_stats:${owner}/${repo}`;
    try { const cached = sessionStorage.getItem(key); if (cached) return JSON.parse(cached); } catch (e) {}
    try {
        const res = await fetch(`https://api.github.com/repos/${owner}/${repo}`);
        if (!res.ok) return null;
        const json = await res.json();
        let release = null;
        try { const relRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/releases/latest`); if (relRes.ok) release = (await relRes.json()).tag_name; } catch (e) {}
        const stats = { stars: json.stargazers_count, updatedAt: json.pushed_at || json.updated_at, language: json.language, release };
        try { sessionStorage.setItem(key, JSON.stringify(stats)); } catch (e) {}
        return stats;
    } catch (e) { return null; }
}
function relativeTime(dateStr) {
    if (!dateStr) return '';
    const diffDay = Math.floor((Date.now() - new Date(dateStr).getTime()) / 86400000);
    if (diffDay <= 0) return 'hari ini';
    if (diffDay === 1) return 'kemarin';
    if (diffDay < 30) return `${diffDay} hari lalu`;
    const diffMonth = Math.floor(diffDay / 30);
    if (diffMonth < 12) return `${diffMonth} bulan lalu`;
    return `${Math.floor(diffMonth / 12)} tahun lalu`;
}
function renderGithubBadges(stats) {
    if (!stats) return '<span class="gh-badge"><i class="fab fa-github"></i> Private / tidak ada repo publik</span>';
    const parts = [];
    if (typeof stats.stars === 'number') parts.push(`<span class="gh-badge"><i class="fas fa-star"></i> ${stats.stars} stars</span>`);
    if (stats.release) parts.push(`<span class="gh-badge"><i class="fas fa-tag"></i> ${escapeHtml(stats.release)}</span>`);
    if (stats.language) parts.push(`<span class="gh-badge"><i class="fas fa-code"></i> ${escapeHtml(stats.language)}</span>`);
    if (stats.updatedAt) parts.push(`<span class="gh-badge"><i class="fas fa-clock"></i> Update ${relativeTime(stats.updatedAt)}</span>`);
    return parts.join('') || '<span class="gh-badge">Data tidak tersedia</span>';
}
function attachGithubBadges(projects) {
    (projects || []).forEach(async (p) => {
        const repo = extractGithubRepo(p.url);
        if (!repo) return;
        const stats = await fetchGithubStats(repo.owner, repo.repo);
        if (!stats || typeof stats.stars !== 'number') return;
        const row = document.querySelector(`#project-${CSS.escape(p.id)} .project-tags-row`);
        if (!row) return;
        const badge = document.createElement('span');
        badge.className = 'gh-badge';
        badge.innerHTML = `<i class="fas fa-star"></i> ${stats.stars}`;
        row.appendChild(badge);
    });
}
function openCaseStudy(id) {
    const p = state.data.projects.find(x => x.id === id);
    if (!p) return;
    const img = $('csImage');
    if (p.image) { img.src = p.image; img.style.display = 'block'; } else { img.style.display = 'none'; }
    $('csTitle').textContent = p.title || '';
    $('csDesc').textContent = p.description || '';
    $('csTags').innerHTML = (p.tags || []).map(t => `<span class="tag-chip" style="background:rgba(255,255,255,0.05); color:var(--muted-on-ink);">${escapeHtml(t)}</span>`).join('');

    const visitBtn = $('csVisitBtn');
    if (p.url && p.url !== 'Private Only') { visitBtn.href = p.url; visitBtn.classList.remove('hidden'); visitBtn.textContent = 'Visit Project / Release'; }
    else visitBtn.classList.add('hidden');

    const readBtn = $('csReadArticleBtn');
    if (p.articleId && (state.data.articles || []).some(a => a.id === p.articleId)) {
        readBtn.href = `article.html?id=${p.articleId}`;
        readBtn.classList.remove('hidden');
    } else readBtn.classList.add('hidden');

    const repo = extractGithubRepo(p.url);
    if (repo) {
        $('csGithubBadges').innerHTML = '<span class="gh-badge">Loading live stats...</span>';
        fetchGithubStats(repo.owner, repo.repo).then(stats => { $('csGithubBadges').innerHTML = renderGithubBadges(stats); });
    } else {
        $('csGithubBadges').innerHTML = '';
    }
    openModal('caseStudyModal');
}

// ==========================================
// BLOCK EDITOR (dispatch body)
// ==========================================
function renderBlockEditor() {
    const list = $('blockEditorList');
    if (!list) return;
    list.innerHTML = articleBlocks.map((b, i) => blockEditorItemHtml(b, i)).join('');
    list.querySelectorAll('[data-remove]').forEach(btn => btn.addEventListener('click', () => { articleBlocks.splice(+btn.dataset.remove, 1); renderBlockEditor(); }));
    list.querySelectorAll('[data-up]').forEach(btn => btn.addEventListener('click', () => { const i = +btn.dataset.up; if (i > 0) { [articleBlocks[i - 1], articleBlocks[i]] = [articleBlocks[i], articleBlocks[i - 1]]; renderBlockEditor(); } }));
    list.querySelectorAll('[data-down]').forEach(btn => btn.addEventListener('click', () => { const i = +btn.dataset.down; if (i < articleBlocks.length - 1) { [articleBlocks[i + 1], articleBlocks[i]] = [articleBlocks[i], articleBlocks[i + 1]]; renderBlockEditor(); } }));
    list.querySelectorAll('[data-field]').forEach(inp => {
        inp.addEventListener('input', () => { articleBlocks[+inp.dataset.index][inp.dataset.field] = inp.value; });
    });
    // Saat user memilih link dari halaman About, auto-isi field URL/label/icon
    list.querySelectorAll('[data-link-ref]').forEach(sel => {
        sel.addEventListener('change', () => {
            const idx = +sel.dataset.linkRef;
            const linkId = sel.value;
            const block = articleBlocks[idx];
            if (!block) return;
            block.linkRef = linkId;
            if (linkId) {
                const ref = (state.data.links || []).find(l => l.id === linkId);
                if (ref) {
                    block.url = ref.url || block.url;
                    block.text = ref.title || block.text;
                    block.icon = ref.icon || block.icon;
                    renderBlockEditor();
                }
            } else {
                // Bisa dikosongkan tanpa menghapus field yang sudah terisi
            }
        });
    });
    // Tombol sisipkan placeholder {{link:ID}} ke textarea paragraf yang sedang aktif
    list.querySelectorAll('[data-insert-link]').forEach(btn => {
        btn.addEventListener('click', () => {
            const idx = +btn.dataset.insertLink;
            const sel = btn.previousElementSibling;
            const linkId = sel && sel.value;
            if (!linkId) { showToast('Pilih link dulu dari dropdown.', 'error'); return; }
            const block = articleBlocks[idx];
            if (!block) return;
            const placeholder = `{{link:${linkId}}}`;
            block.text = (block.text || '') + placeholder;
            renderBlockEditor();
        });
    });
}
function blockEditorItemHtml(b, i) {
    const controls = `<div class="block-type-label"><span>${b.type}</span><span class="flex gap-1">
        <button type="button" data-up="${i}" style="color:var(--muted-on-ink); padding:2px 6px;"><i class="fas fa-arrow-up"></i></button>
        <button type="button" data-down="${i}" style="color:var(--muted-on-ink); padding:2px 6px;"><i class="fas fa-arrow-down"></i></button>
        <button type="button" data-remove="${i}" style="color:var(--rust); padding:2px 6px;"><i class="fas fa-trash"></i></button>
    </span></div>`;
    let fields = '';
    if (b.type === 'paragraph') {
        // Helper: insert placeholder {{link:ID}} untuk inline pull dari About
        const aboutLinks = (state.data.links || []);
        const linkOptions = ['<option value="">— Pilih link dari About untuk disisipkan —</option>']
            .concat(aboutLinks.map(l => `<option value="${escapeHtml(l.id)}">${escapeHtml(l.title || l.url)}</option>`))
            .join('');
        const linkHelper = aboutLinks.length ? `<div class="flex gap-2 mt-2"><select class="input-field text-xs" data-link-options="${i}" style="flex:1; padding:8px 10px; font-size:12px;">${linkOptions}</select><button type="button" class="btn-ghost" data-insert-link="${i}" style="padding:8px 12px; font-size:12px;"><i class="fas fa-plus"></i> Sisipkan</button></div>` : '';
        fields = `<textarea class="input-field" rows="3" data-index="${i}" data-field="text" placeholder="Tulis paragraf... (bisa sisipkan [label](url) atau {{link:ID}})">${escapeHtml(b.text || '')}</textarea>${linkHelper}`;
    } else if (b.type === 'heading') {
        fields = `<input type="text" class="input-field" data-index="${i}" data-field="text" value="${escapeHtml(b.text || '')}" placeholder="Judul bagian...">`;
    } else if (b.type === 'image') {
        fields = `<input type="text" class="input-field mb-2" data-index="${i}" data-field="url" value="${escapeHtml(b.url || '')}" placeholder="URL gambar...">
            <input type="text" class="input-field mb-2" data-index="${i}" data-field="caption" value="${escapeHtml(b.caption || '')}" placeholder="Caption (opsional)">
            <input type="text" class="input-field" data-index="${i}" data-field="credit" value="${escapeHtml(b.credit || '')}" placeholder="Credit foto (opsional)">`;
    } else if (b.type === 'quote') {
        fields = `<textarea class="input-field mb-2" rows="2" data-index="${i}" data-field="text" placeholder="Isi kutipan...">${escapeHtml(b.text || '')}</textarea>
            <input type="text" class="input-field" data-index="${i}" data-field="attribution" value="${escapeHtml(b.attribution || '')}" placeholder="Atribusi (opsional)">`;
    } else if (b.type === 'link') {
        // Dropdown untuk menarik link dari halaman About secara otomatis
        const aboutLinks = (state.data.links || []);
        const linkOptions = ['<option value="">— Tautan Custom (ketik manual) —</option>']
            .concat(aboutLinks.map(l => `<option value="${escapeHtml(l.id)}" ${b.linkRef === l.id ? 'selected' : ''}>${escapeHtml(l.title || l.url)} (dari About)</option>`))
            .join('');
        fields = `<div class="mb-2">
                <label class="block text-xs mb-1" style="color:var(--muted-on-ink)">Tarik otomatis dari halaman About:</label>
                <select class="input-field" data-index="${i}" data-link-ref="${i}">${linkOptions}</select>
            </div>
            <input type="text" class="input-field mb-2" data-index="${i}" data-field="text" value="${escapeHtml(b.text || '')}" placeholder="Label tautan (opsional, default = URL)">
            <input type="text" class="input-field mb-2" data-index="${i}" data-field="url" value="${escapeHtml(b.url || '')}" placeholder="https://...">
            <input type="text" class="input-field" data-index="${i}" data-field="icon" value="${escapeHtml(b.icon || '')}" placeholder="Ikon Font Awesome (opsional, mis. fab fa-github)">`;
    } else if (b.type === 'video' || b.type === 'video-short') {
        fields = `<input type="text" class="input-field" data-index="${i}" data-field="url" value="${escapeHtml(b.url || '')}" placeholder="URL YouTube...">`;
    }
    return `<div class="block-editor-item">${controls}${fields}</div>`;
}

// ==========================================
// CRUD — ARTICLE (Dispatch)
// ==========================================
function openArticleModal(id = null) {
    state.editingArticleId = id;
    const catSelect = $('articleCategory');
    catSelect.innerHTML = (state.data.categories || []).map(c => `<option value="${c.id}">${escapeHtml(c.name)}</option>`).join('');
    if (id) {
        const a = state.data.articles.find(x => x.id === id);
        if (!a) return;
        $('articleModalTitle').textContent = 'Edit Dispatch';
        $('articleTitle').value = a.title || '';
        $('articleDek').value = a.dek || '';
        catSelect.value = a.category || '';
        $('articleReadTime').value = a.readTime || 5;
        $('articleCoverImage').value = a.coverImage || '';
        $('articleAuthor').value = a.author || (state.data.profile.name || '');
        $('articleDate').value = a.date || '';
        $('articleTags').value = (a.tags || []).join(', ');
        $('articleFeatured').checked = !!a.featured;
        articleBlocks = JSON.parse(JSON.stringify(a.body || []));
    } else {
        $('articleModalTitle').textContent = 'New Dispatch';
        $('articleTitle').value = ''; $('articleDek').value = ''; $('articleReadTime').value = 5;
        $('articleCoverImage').value = ''; $('articleAuthor').value = state.data.profile.name || '';
        $('articleDate').value = new Date().toISOString().slice(0, 10);
        $('articleTags').value = ''; $('articleFeatured').checked = false;
        articleBlocks = [{ type: 'paragraph', text: '' }];
    }
    renderBlockEditor();
    openModal('articleModal');
}
async function saveArticle() {
    const title = $('articleTitle').value.trim();
    if (!title) { showToast('Judul wajib diisi.', 'error'); return; }
    if (!$('articleCoverImage').value.trim()) { showToast('Cover image wajib diisi.', 'error'); return; }
    const cleanBlocks = articleBlocks.filter(b => {
        if (b.type === 'paragraph' || b.type === 'heading' || b.type === 'quote') return (b.text || '').trim();
        if (b.type === 'image' || b.type === 'video' || b.type === 'video-short') return (b.url || '').trim();
        if (b.type === 'link') return (b.url || '').trim() || (b.linkRef || '').trim();
        return false;
    });
    const data = {
        id: state.editingArticleId || generateId(),
        title,
        dek: $('articleDek').value.trim(),
        category: $('articleCategory').value,
        coverImage: $('articleCoverImage').value.trim(),
        author: $('articleAuthor').value.trim(),
        date: $('articleDate').value || new Date().toISOString().slice(0, 10),
        readTime: parseInt($('articleReadTime').value, 10) || 5,
        featured: $('articleFeatured').checked,
        tags: $('articleTags').value.split(',').map(t => t.trim()).filter(Boolean),
        body: cleanBlocks
    };
    if (data.featured) state.data.articles.forEach(a => { a.featured = false; });
    if (state.editingArticleId) {
        const i = state.data.articles.findIndex(x => x.id === state.editingArticleId);
        state.data.articles[i] = data;
    } else {
        state.data.articles.push(data);
    }
    await saveToGitHub();
    closeModal('articleModal');
    if ($('articleContent')) {
        location.href = `article.html?id=${data.id}`;
    } else {
        renderPageContent();
    }
}
async function deleteArticle(id) {
    if (!confirm('Hapus dispatch ini?')) return;
    state.data.articles = state.data.articles.filter(x => x.id !== id);
    await saveToGitHub();
    location.href = 'index.html';
}

// ==========================================
// CRUD — CATEGORY
// ==========================================
function slugify(s) { return s.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || generateId(); }
function openCategoryModal(id = null) {
    state.editingCategoryId = id;
    const delBtn = $('deleteCategoryBtn');
    if (id) {
        const c = state.data.categories.find(x => x.id === id);
        if (!c) return;
        $('categoryModalTitle').textContent = 'Edit Category';
        $('categoryName').value = c.name || ''; $('categoryAccent').value = c.accent || 'brass'; $('categoryDescription').value = c.description || '';
        delBtn.classList.remove('hidden');
    } else {
        $('categoryModalTitle').textContent = 'Add Category';
        $('categoryName').value = ''; $('categoryAccent').value = 'brass'; $('categoryDescription').value = '';
        delBtn.classList.add('hidden');
    }
    openModal('categoryModal');
}
async function saveCategory() {
    const name = $('categoryName').value.trim();
    if (!name) { showToast('Nama kategori wajib diisi.', 'error'); return; }
    const data = { id: state.editingCategoryId || slugify(name), name, accent: $('categoryAccent').value, description: $('categoryDescription').value.trim() };
    if (state.editingCategoryId) {
        const i = state.data.categories.findIndex(x => x.id === state.editingCategoryId);
        state.data.categories[i] = data;
    } else {
        if (state.data.categories.some(c => c.id === data.id)) { showToast('Kategori serupa sudah ada.', 'error'); return; }
        state.data.categories.push(data);
    }
    await saveToGitHub();
    closeModal('categoryModal');
    renderPageContent();
}
async function deleteCategoryHandler() {
    if (!state.editingCategoryId) return;
    if (!confirm('Hapus category ini? Dispatch yang memakainya tidak akan terhapus, hanya labelnya kembali ke default.')) return;
    state.data.categories = state.data.categories.filter(x => x.id !== state.editingCategoryId);
    await saveToGitHub();
    closeModal('categoryModal');
    renderPageContent();
}

// ==========================================
// CRUD — PHOTO OF THE DAY
// ==========================================
function openPotdModal() {
    const p = state.data.photoOfDay || {};
    $('potdImage').value = p.image || ''; $('potdCaption').value = p.caption || ''; $('potdCredit').value = p.credit || '';
    openModal('potdModal');
}
async function savePotd() {
    state.data.photoOfDay = { image: $('potdImage').value.trim(), caption: $('potdCaption').value.trim(), credit: $('potdCredit').value.trim(), date: new Date().toISOString().slice(0, 10) };
    await saveToGitHub();
    closeModal('potdModal');
    renderPhotoOfDay(state.data.photoOfDay);
}

// ==========================================
// CRUD — PROFILE / SITE
// ==========================================
function openProfileModal() {
    const p = state.data.profile || {}; const s = state.data.site || {};
    $('profileName').value = p.name || ''; $('profileBio').value = p.bio || ''; $('profileAvatar').value = p.avatar || '';
    $('siteTitle').value = s.title || ''; $('siteTagline').value = s.tagline || '';
    openModal('profileModal');
}
async function saveProfile() {
    state.data.profile = { ...(state.data.profile || {}), name: $('profileName').value.trim(), bio: $('profileBio').value.trim(), avatar: $('profileAvatar').value.trim() };
    state.data.site = { ...(state.data.site || {}), title: $('siteTitle').value.trim(), tagline: $('siteTagline').value.trim() };
    await saveToGitHub();
    closeModal('profileModal');
    renderPageContent();
}

// ==========================================
// CRUD — PROJECT
// ==========================================
function openProjectModal(id = null) {
    state.editingProjectId = id;
    const artSelect = $('projectArticleId');
    artSelect.innerHTML = '<option value="">— Tidak ada —</option>' + (state.data.articles || []).map(a => `<option value="${a.id}">${escapeHtml(a.title)}</option>`).join('');
    if (id) {
        const p = state.data.projects.find(x => x.id === id);
        if (!p) return;
        $('projectModalTitle').textContent = 'Edit Project';
        $('projectTitle').value = p.title || ''; $('projectDesc').value = p.description || '';
        $('projectImage').value = p.image || ''; $('projectUrl').value = p.url || '';
        $('projectTags').value = (p.tags || []).join(', '); artSelect.value = p.articleId || '';
    } else {
        $('projectModalTitle').textContent = 'Add Project';
        ['projectTitle', 'projectDesc', 'projectImage', 'projectUrl', 'projectTags'].forEach(x => $(x).value = '');
        artSelect.value = '';
    }
    openModal('projectModal');
}
async function saveProject() {
    const title = $('projectTitle').value.trim();
    if (!title) { showToast('Title wajib diisi.', 'error'); return; }
    const data = {
        id: state.editingProjectId || generateId(),
        title, description: $('projectDesc').value.trim(),
        image: $('projectImage').value.trim(), url: $('projectUrl').value.trim(),
        tags: $('projectTags').value.split(',').map(t => t.trim()).filter(Boolean),
        size: 'bento-item',
        articleId: $('projectArticleId').value || null
    };
    if (state.editingProjectId) {
        const i = state.data.projects.findIndex(x => x.id === state.editingProjectId);
        state.data.projects[i] = data;
    } else state.data.projects.push(data);
    await saveToGitHub();
    closeModal('projectModal');
    renderPageContent();
}
async function deleteProject(id) {
    if (!confirm('Delete this project?')) return;
    state.data.projects = state.data.projects.filter(x => x.id !== id);
    await saveToGitHub();
    renderPageContent();
}

// ==========================================
// CRUD — LINK
// ==========================================
function openLinkModal(id = null) {
    state.editingLinkId = id;
    if (id) {
        const l = state.data.links.find(x => x.id === id);
        if (!l) return;
        $('linkModalTitle').textContent = 'Edit Link';
        $('linkTitle').value = l.title; $('linkUrl').value = l.url; $('linkIcon').value = l.icon;
    } else {
        $('linkModalTitle').textContent = 'Add Link';
        $('linkTitle').value = ''; $('linkUrl').value = ''; $('linkIcon').value = '';
    }
    openModal('linkModal');
}
async function saveLink() {
    const data = { id: state.editingLinkId || generateId(), title: $('linkTitle').value.trim(), url: $('linkUrl').value.trim(), icon: $('linkIcon').value.trim() };
    if (state.editingLinkId) {
        const i = state.data.links.findIndex(x => x.id === state.editingLinkId);
        state.data.links[i] = data;
    } else state.data.links.push(data);
    await saveToGitHub();
    closeModal('linkModal');
    renderPageContent();
}
async function deleteLink(id) {
    if (!confirm('Delete this link?')) return;
    state.data.links = state.data.links.filter(x => x.id !== id);
    await saveToGitHub();
    renderPageContent();
}

// ==========================================
// GITHUB SAVE (admin write)
// ==========================================
async function saveToGitHub() {
    const token = localStorage.getItem('portfolio_github_token');
    if (!token) return showToast('Not logged in.', 'error');
    const saveBtns = document.querySelectorAll('.modal-content .btn-primary');
    saveBtns.forEach(b => b.disabled = true);
    const url = `https://api.github.com/repos/${CONFIG.GITHUB_USERNAME}/${CONFIG.REPO_NAME}/contents/${CONFIG.DB_FILE}`;
    let sha = null;
    try { const res = await fetch(url); if (res.ok) sha = (await res.json()).sha; } catch (e) {}
    const content = btoa(unescape(encodeURIComponent(JSON.stringify(state.data, null, 2))));
    const payload = { message: `Update ${new Date().toISOString()}`, content, branch: CONFIG.BRANCH };
    if (sha) payload.sha = sha;
    try {
        const res = await fetch(url, { method: 'PUT', headers: { 'Authorization': `Bearer ${token}`, 'Accept': 'application/vnd.github+json', 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
        if (res.ok) showToast('Saved successfully!', 'success');
        else { const err = await res.json(); throw new Error(err.message); }
    } catch (e) {
        showToast('Error saving: ' + e.message, 'error');
    } finally {
        saveBtns.forEach(b => b.disabled = false);
    }
}

// ==========================================
// ADMIN AUTH
// ==========================================
function checkAdminSession() {
    const token = localStorage.getItem('portfolio_github_token');
    const fab = $('adminFab');
    if (token) {
        state.isAdmin = true;
        document.body.classList.add('admin-mode');
        document.querySelectorAll('.admin-only').forEach(el => el.classList.remove('hidden'));
        if (fab) { fab.classList.remove('hidden'); fab.innerHTML = '<i class="fas fa-right-from-bracket"></i>'; }
    } else if (fab) {
        fab.classList.remove('hidden');
    }
}
function toggleAdminMode() {
    if (state.isAdmin) {
        localStorage.removeItem('portfolio_github_token');
        state.isAdmin = false;
        document.body.classList.remove('admin-mode');
        document.querySelectorAll('.admin-only').forEach(el => el.classList.add('hidden'));
        const fab = $('adminFab'); if (fab) fab.innerHTML = '<i class="fas fa-compass-drafting"></i>';
        renderPageContent();
    } else {
        openModal('loginModal');
    }
}
function handleLogin() {
    const token = $('tokenInput').value.trim();
    if (!token) { showToast('Token cannot be empty.', 'error'); return; }
    state.isAdmin = true;
    localStorage.setItem('portfolio_github_token', token);
    document.body.classList.add('admin-mode');
    document.querySelectorAll('.admin-only').forEach(el => el.classList.remove('hidden'));
    const fab = $('adminFab'); if (fab) fab.innerHTML = '<i class="fas fa-right-from-bracket"></i>';
    closeModal('loginModal');
    showToast('Welcome back, Editor!', 'success');
    renderPageContent();
}

// ==========================================
// EVENT LISTENERS
// ==========================================
function setupEventListeners() {
    document.addEventListener('click', (e) => {
        if (e.target.closest('#adminFab')) toggleAdminMode();
    });
    const bind = (id, evt, fn) => { const el = $(id); if (el) el.addEventListener(evt, fn); };

    bind('loginBtn', 'click', handleLogin);
    bind('cancelLoginBtn', 'click', () => closeModal('loginModal'));
    bind('tokenInput', 'keypress', (e) => { if (e.key === 'Enter') handleLogin(); });

    bind('editProfileBtn', 'click', openProfileModal);
    bind('saveProfileBtn', 'click', saveProfile);
    bind('cancelProfileBtn', 'click', () => closeModal('profileModal'));

    bind('addProjectBtn', 'click', () => openProjectModal());
    bind('saveProjectBtn', 'click', saveProject);
    bind('cancelProjectBtn', 'click', () => closeModal('projectModal'));

    bind('addLinkBtn', 'click', () => openLinkModal());
    bind('saveLinkBtn', 'click', saveLink);
    bind('cancelLinkBtn', 'click', () => closeModal('linkModal'));

    bind('addArticleBtn', 'click', () => openArticleModal());
    bind('saveArticleBtn', 'click', saveArticle);
    bind('cancelArticleBtn', 'click', () => closeModal('articleModal'));

    bind('saveCategoryBtn', 'click', saveCategory);
    bind('cancelCategoryBtn', 'click', () => closeModal('categoryModal'));
    bind('deleteCategoryBtn', 'click', deleteCategoryHandler);

    bind('savePotdBtn', 'click', savePotd);
    bind('cancelPotdBtn', 'click', () => closeModal('potdModal'));

    bind('addVideoBtn', 'click', () => openVideoModal());
    bind('saveVideoBtn', 'click', saveVideo);
    bind('cancelVideoBtn', 'click', () => closeModal('videoModal'));
    bind('videoLightboxClose', 'click', closeVideoLightbox);

    bind('caseStudyClose', 'click', () => closeModal('caseStudyModal'));

    document.querySelectorAll('.modal-overlay').forEach(ov => {
        ov.addEventListener('click', (e) => {
            if (e.target !== ov) return;
            if (ov.id === 'videoLightboxModal') closeVideoLightbox(); else closeModal(ov.id);
        });
    });
    document.addEventListener('keydown', (e) => {
        if (e.key !== 'Escape') return;
        const openOv = document.querySelector('.modal-overlay.active');
        if (!openOv) return;
        if (openOv.id === 'videoLightboxModal') closeVideoLightbox(); else closeModal(openOv.id);
    });
}

// ==========================================
// UTILS
// ==========================================
function extractYouTubeId(url) {
    if (!url) return null;
    const regex = /(?:youtube\.com\/(?:[^\/\n\s]+\/\S+\/|(?:v|e(?:mbed)?|shorts|live)\/|\S*?[?&]v=)|youtu\.be\/)([a-zA-Z0-9_-]{11})/;
    const match = String(url).match(regex);
    return match ? match[1] : null;
}
function formatDate(dateStr) {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    if (isNaN(d)) return dateStr;
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
    return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
}
function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}
function generateId() { return Date.now().toString(36) + Math.random().toString(36).substr(2); }
function openModal(id) { const el = $(id); if (el) el.classList.add('active'); }
function closeModal(id) { const el = $(id); if (el) el.classList.remove('active'); }
function showToast(msg, type = 'info') {
    const t = document.createElement('div');
    t.className = `toast ${type}`;
    t.innerHTML = `<i class="fas ${type === 'success' ? 'fa-check-circle' : 'fa-exclamation-circle'}"></i><span>${escapeHtml(msg)}</span>`;
    document.body.appendChild(t);
    setTimeout(() => t.classList.add('show'), 100);
    setTimeout(() => { t.classList.remove('show'); setTimeout(() => t.remove(), 400); }, 3000);
}
function isElementInViewport(el) {
    const r = el.getBoundingClientRect();
    return r.top >= 0 && r.left >= 0 && r.bottom <= (window.innerHeight || document.documentElement.clientHeight);
}
function setupScrollObserver() {
    if (!('IntersectionObserver' in window)) {
        document.querySelectorAll('.reveal').forEach(el => el.classList.add('visible'));
        return;
    }
    const obs = new IntersectionObserver((entries) => {
        entries.forEach(e => { if (e.isIntersecting) e.target.classList.add('visible'); });
    }, { threshold: 0.1 });
    document.querySelectorAll('.reveal:not(.visible)').forEach(el => obs.observe(el));
}

window.openProjectModal = openProjectModal;
window.deleteProject = deleteProject;
window.openLinkModal = openLinkModal;
window.deleteLink = deleteLink;
window.openVideoModal = openVideoModal;
window.deleteVideo = deleteVideo;
