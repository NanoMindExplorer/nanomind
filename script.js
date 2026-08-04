// ==========================================
// KONFIGURASI UTAMA
// ==========================================
const CONFIG = {
    GITHUB_USERNAME: 'NanoMindExplorer',
    REPO_NAME: 'nanomind',
    BRANCH: 'main',
    DB_FILE: 'db.json',
    X_ARTICLES_FILE: 'x-articles.json',
    // Fallback bila x-articles.json belum tersedia (mis. cache lama)
    X_ARTICLES: {
        enabled: true,
        username: 'Deadmouse_jpeg',
        displayName: 'Noob Sensei',
        categoryId: 'x-articles',
        apiBase: 'https://api.fxtwitter.com',
        cacheMinutes: 10,
        statusIds: [
            '2084516281261388041',
            '2080914975363666184',
            '2080309949025136833',
            '2079807062414946724',
            '2079487993669148749',
            '2078757179172278617',
            '2078444870843421031',
            '2078391497687269414',
            '2078128754002739280',
            '2076342065613668432',
            '2076175759325237529'
        ]
    },
    MEDIUM_ARTICLES_FILE: 'medium-articles.json',
    // Fallback bila medium-articles.json belum tersedia (mis. cache lama)
    MEDIUM_ARTICLES: {
        enabled: true,
        username: '0wlsky',
        displayName: 'nanomind',
        categoryId: 'medium-articles',
        cacheMinutes: 10
    },
    TELEGRAM_POSTS_FILE: 'telegram-posts.json',
    TELEGRAM: {
        enabled: true,
        channel: 'nanojournal',
        channelUrl: 'https://t.me/nanojournal',
        previewUrl: 'https://t.me/s/nanojournal',
        categoryId: 'telegram',
        cacheMinutes: 5
    }
};
const DISPATCH_PAGE_SIZE = 7;

let state = {
    data: null, isAdmin: false,
    editingProjectId: null, editingLinkId: null, editingArticleId: null, editingCategoryId: null,
    dispatchFilter: 'all', dispatchPage: 1,
    lastFocusedEl: null,
    xArticlesConfig: null,
    mediumArticlesConfig: null,
    telegramConfig: null,
    telegramFilter: 'all',
    telegramPage: 1,
    // Loading flags — cegah render kosong yang wipe placeholder sebelum fetch selesai
    xArticlesLoading: false,
    mediumArticlesLoading: false,
    registryPollStarted: false
};
let articleBlocks = [];
const $ = (id) => document.getElementById(id);

document.addEventListener('DOMContentLoaded', () => {
    injectLivingBackground();
    injectSharedChrome();
    setupEventListeners();
    setupMobileMenu();
    setupBackToTop();
    setupSearchPalette();
    setupOfflineBanner();
    setupXRetryButtons();
    setupMediumRetryButtons();
    setupRailDragScroll();
    setupTelegramRetryButtons();
    setupTelegramCardClicks();
    setupCardClickFeedback();
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
// GHIBLI-INSPIRED BACKGROUND — static 1080p art (no video = no shake)
// ==========================================
function injectLivingBackground() {
    if (document.getElementById('livingBg')) return;
    document.body.classList.add('has-living-bg');

    const root = document.createElement('div');
    root.id = 'livingBg';
    root.className = 'living-bg';
    root.setAttribute('aria-hidden', 'true');
    // Static image only — looping video caused visible shake/vibration
    root.innerHTML = `
        <div class="living-bg-poster"></div>
        <div class="living-bg-glow"></div>
        <div class="living-bg-veil"></div>
        <div class="living-bg-noise"></div>
    `;
    document.body.prepend(root);
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
                    <a href="telegram.html" class="nav-link" data-nav="telegram"><i class="fab fa-telegram" style="font-size:0.92em;margin-right:4px;"></i>Telegram</a>
                    <a href="watch.html" class="nav-link" data-nav="watch">Watch</a>
                    <a href="about.html" class="nav-link" data-nav="about">About</a>
                </div>
                <div class="flex items-center gap-2">
                    <span class="admin-status" id="adminStatus" title="Mode editor aktif"><i class="fas fa-pen-nib"></i> Editor</span>
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
            <a href="telegram.html" class="nav-link" data-nav="telegram"><i class="fab fa-telegram" style="font-size:0.92em;margin-right:4px;"></i>Telegram</a>
            <a href="watch.html" class="nav-link" data-nav="watch">Watch</a>
            <a href="about.html" class="nav-link" data-nav="about">About</a>`;
    }
    const footerPh = $('footerPlaceholder');
    if (footerPh) {
        footerPh.innerHTML = `
        <footer class="site-footer">
            <div class="footer-inner">
                <div class="footer-brand">
                    <div class="footer-logo">
                        <svg viewBox="0 0 100 100" aria-hidden="true">
                            <circle cx="50" cy="50" r="38" fill="none" stroke="#C9974A" stroke-width="4"/>
                            <polygon points="50,13 59,50 41,50" fill="#C9974A"/>
                            <polygon points="50,87 59,50 41,50" fill="#5C5A48"/>
                            <circle cx="50" cy="50" r="7" fill="#14140F" stroke="#C9974A" stroke-width="3.5"/>
                        </svg>
                        <span class="footer-name" id="footerBrandName">Nanomind Explorer</span>
                    </div>
                    <p class="footer-tagline" id="footerTagline"></p>
                </div>
                <div>
                    <p class="footer-col-title">Explore</p>
                    <ul class="footer-nav">
                        <li><a href="index.html">Dispatches</a></li>
                        <li><a href="telegram.html">Telegram</a></li>
                        <li><a href="watch.html">Watch</a></li>
                        <li><a href="about.html">About</a></li>
                    </ul>
                </div>
                <div>
                    <p class="footer-col-title">Connect</p>
                    <ul class="footer-social" id="footerSocialList">
                        <li><a href="https://x.com/Deadmouse_jpeg" target="_blank" rel="noopener noreferrer"><i class="fab fa-x-twitter"></i> @Deadmouse_jpeg</a></li>
                        <li><a href="https://github.com/NanoMindExplorer" target="_blank" rel="noopener noreferrer"><i class="fab fa-github"></i> GitHub</a></li>
                    </ul>
                </div>
            </div>
            <div class="footer-bottom">
                <span>&copy; <span id="footerYear"></span> <span id="footerCopyBrand">Nanomind Explorer</span>. All dispatches reserved.</span>
                <span class="t-meta">Journal over the landscape</span>
            </div>
        </footer>`;
        $('footerYear').textContent = new Date().getFullYear();
    }
    // Reading progress bar (article page)
    if ($('articleContent') && !document.getElementById('readingProgress')) {
        const bar = document.createElement('div');
        bar.id = 'readingProgress';
        bar.className = 'reading-progress';
        bar.setAttribute('aria-hidden', 'true');
        document.body.appendChild(bar);
    }
    injectModals();
    markActiveNav();
}

function updateFooterSocial(links) {
    const list = $('footerSocialList');
    if (!list) return;
    const fromData = (links || []).filter(l => l.url).slice(0, 5);
    if (!fromData.length) return;
    list.innerHTML = fromData.map(l => {
        const icon = l.icon ? `<i class="${escapeHtml(l.icon)}"></i>` : '<i class="fas fa-link"></i>';
        return `<li><a href="${escapeHtml(l.url)}" target="_blank" rel="noopener noreferrer">${icon} ${escapeHtml(l.title || l.url)}</a></li>`;
    }).join('');
}

function setupReadingProgress() {
    const bar = $('readingProgress');
    const surface = document.querySelector('.reading-surface') || $('articleContent');
    if (!bar || !surface) return;
    // rAF-throttled supaya scroll gak nge-trigger layout thrashing.
    let ticking = false;
    const onScroll = () => {
        if (ticking) return;
        ticking = true;
        window.requestAnimationFrame(() => {
            const rect = surface.getBoundingClientRect();
            const total = surface.offsetHeight - window.innerHeight;
            if (total <= 0) {
                bar.style.width = '100%';
                ticking = false;
                return;
            }
            // Progress based on how far we've scrolled through the article surface
            const scrolled = Math.min(Math.max(-rect.top, 0), total);
            const pct = Math.min(100, Math.max(0, (scrolled / total) * 100));
            bar.style.width = pct + '%';
            ticking = false;
        });
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll, { passive: true });
    onScroll();
}

function markActiveNav() {
    const path = location.pathname.split('/').pop() || 'index.html';
    const current = (path === '' || path === 'index.html' || path === 'article.html') ? 'home'
        : (path === 'about.html' ? 'about'
        : (path === 'watch.html' ? 'watch'
        : (path === 'telegram.html' ? 'telegram' : '')));
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
                <label class="flex items-center gap-2 text-sm" style="color:var(--muted-on-ink)"><input type="checkbox" id="articleFeatured"> Prioritas (jika tanggal sama; hero tetap otomatis artikel terbaru)</label>
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
    // Throttled via rAF — listener scroll bare bikin jank di mobile / long page.
    let ticking = false;
    const update = () => {
        btn.classList.toggle('show', window.scrollY > 500);
        ticking = false;
    };
    window.addEventListener('scroll', () => {
        if (ticking) return;
        ticking = true;
        window.requestAnimationFrame(update);
    }, { passive: true });
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
    // Telegram posts (di-cache di state.telegramPosts setelah loadTelegramPage pertama)
    (state.telegramPosts || []).forEach(p => {
        const text = (p.textPlain || '').toLowerCase();
        if (text.includes(q) || (p.links || []).some(l => (l.text || '').toLowerCase().includes(q))) {
            results.push({
                icon: 'fa-telegram',
                label: tgExcerpt(p.textPlain || '(post tanpa teks)', 80),
                meta: 'Telegram · #' + p.postId,
                href: p.url,
                external: true
            });
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
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('sw.js', { updateViaCache: 'none' })
            .then(reg => {
                // Cek update SW setiap 1 jam
                setInterval(() => reg.update().catch(() => {}), 60 * 60 * 1000);
            })
            .catch(() => {});
        // CATATAN: JANGAN auto-reload pada controllerchange.
        // Reload otomatis bikin reload loop (variable 'refreshing' reset pada
        // new page load) → artikel gak pernah sempat render. SW v18 sudah
        // network-first untuk HTML/JS/CSS + cache-bust ?v=18 → user pasti
        // dapat code baru pada navigasi berikutnya tanpa perlu reload paksa.
        // Listen for messages from SW (untuk debug saja)
        navigator.serviceWorker.addEventListener('message', (event) => {
            if (event.data && event.data.type === 'SW_UPDATED') {
                console.log('[SW] updated to:', event.data.version);
            }
        });
    });
}

// ==========================================
// LOAD DATA
// ==========================================
function githubRawUrl(file) {
    return `https://raw.githubusercontent.com/${CONFIG.GITHUB_USERNAME}/${CONFIG.REPO_NAME}/${CONFIG.BRANCH}/${file}`;
}

/** Coba file lokal dulu (dev server), lalu fallback ke raw GitHub.
 *  Cache-bust query supaya SW/CDN tidak menyajikan registry JSON usang
 *  (x-articles / medium-articles berubah tiap auto-sync). */
async function fetchJsonPreferLocal(file) {
    const bust = (url) => {
        const sep = url.includes('?') ? '&' : '?';
        return `${url}${sep}_=${Date.now()}`;
    };
    try {
        const local = await fetch(bust(file), { cache: 'no-store' });
        if (local.ok) return await local.json();
    } catch (e) { /* ignore */ }
    const remote = await fetch(bust(githubRawUrl(file)), { cache: 'no-store' });
    if (!remote.ok) throw new Error(`Failed to load ${file}`);
    return await remote.json();
}

function ensureXArticlesCategory() {
    if (!state.data) return;
    const cats = state.data.categories || (state.data.categories = []);
    if (!cats.some(c => c.id === 'x-articles')) {
        cats.push({
            id: 'x-articles',
            name: 'X Articles',
            accent: 'slate',
            description: 'Artikel long-form yang diterbitkan di X (@Deadmouse_jpeg), ditarik otomatis ke situs ini.'
        });
    }
}

function ensureMediumArticlesCategory() {
    if (!state.data) return;
    const cats = state.data.categories || (state.data.categories = []);
    if (!cats.some(c => c.id === 'medium-articles')) {
        cats.push({
            id: 'medium-articles',
            name: 'Medium',
            accent: 'moss',
            description: 'Tulisan yang diterbitkan di Medium (@0wlsky), ditarik otomatis ke situs ini.'
        });
    }
}

async function loadData() {
    try {
        state.data = await fetchJsonPreferLocal(CONFIG.DB_FILE);
        state.data.profile = state.data.profile || {};
        state.data.site = state.data.site || {};
        state.data.categories = state.data.categories || [];
        state.data.articles = state.data.articles || [];
        state.data.projects = state.data.projects || [];
        state.data.links = state.data.links || [];
        state.data.videos = state.data.videos || [];
        ensureXArticlesCategory();
        ensureMediumArticlesCategory();

        // === Pre-load registries + Medium (konten penuh di JSON) ===
        // X: placeholder dulu (perlu FixTweet live). Medium: convert & merge
        // SEBELUM renderPageContent supaya rail tidak sempat kosong.
        state.xArticlesLoading = true;
        state.mediumArticlesLoading = true;

        if ($('xArticlesRail') || $('articleContent')) {
            const xCfg = await loadXArticlesRegistry();
            if ($('xArticlesRail')) renderXArticlesRailPlaceholder(xCfg);
        }
        try {
            const medArts = await loadMediumArticles();
            if (medArts && medArts.length) mergeMediumArticlesIntoState(medArts);
        } catch (medErr) {
            console.warn('Medium Articles initial load failed', medErr);
        } finally {
            state.mediumArticlesLoading = false;
        }

        // === Render page — X masih loading → rail pakai placeholder, tidak di-wipe ===
        renderPageContent();

        // === Background: X Articles via FixTweet (progressive + auto-retry) ===
        bootstrapXArticlesLoad().catch(xErr => console.warn('X Articles bootstrap failed', xErr));

        // Medium sudah di state; re-fetch registry di background bila cache stale
        // (loadMediumArticles hormati sessionStorage + lastSync).
        loadMediumArticles()
            .then(medArts => {
                if (medArts && medArts.length) {
                    mergeMediumArticlesIntoState(medArts);
                    refreshArticleSurfaces({ medium: true });
                }
            })
            .catch(medErr => console.warn('Medium Articles background load failed', medErr));

        // Poll registry tiap beberapa menit + saat tab kembali visible
        // supaya artikel baru dari GHA auto-sync tampil tanpa hard reload.
        startRegistryAutoRefresh();

    } catch (err) {
        console.error('Load failed', err);
        state.xArticlesLoading = false;
        state.mediumArticlesLoading = false;
        state.data = { profile: { name: 'Failed to Load', bio: 'Cek konfigurasi script.js' }, site: {}, categories: [], articles: [], projects: [], links: [], videos: [] };
        renderPageContent();
        showToast('Gagal memuat data. Cek koneksi internet.', 'error');
    } finally {
        hideHomepageSkeletons();
        hideLoader();
    }
}

/**
 * Load X articles di background: progressive render tiap batch, lalu
 * auto-retry ID yang gagal/belum sempat (tanpa minta user klik "Coba lagi").
 */
async function bootstrapXArticlesLoad() {
    state.xArticlesLoading = true;
    try {
        const apply = (xArts) => {
            if (!xArts || !xArts.length || !state.data) return;
            mergeXArticlesIntoState(xArts);
            refreshArticleSurfaces({ x: true });
        };

        // Pass 1: deadline longgar + progress callback supaya card terisi bertahap
        let xArts = await loadXArticles({
            deadline: Date.now() + 45000,
            onProgress: apply
        });
        apply(xArts);

        // Pass 2–3: ambil sisa ID yang gagal (rate-limit / timeout) otomatis
        for (let pass = 0; pass < 2; pass++) {
            const cfg = state.xArticlesConfig || await loadXArticlesRegistry();
            const have = new Set(
                (state.data.articles || [])
                    .filter(a => a.source === 'x' && a.xStatusId)
                    .map(a => String(a.xStatusId))
            );
            const missing = (cfg.statusIds || []).filter(id => !have.has(String(id)));
            if (!missing.length) break;
            await new Promise(r => setTimeout(r, 1500 * (pass + 1)));
            // Invalidate partial session cache supaya fetch ulang dijalankan
            try {
                sessionStorage.removeItem(xArticlesCacheKey(cfg.username));
            } catch (e) { /* ignore */ }
            const more = await loadXArticles({
                deadline: Date.now() + 30000,
                onlyIds: missing,
                onProgress: (partial) => {
                    // Gabung partial dengan yang sudah ada di state
                    const existing = (state.data.articles || []).filter(a => a.source === 'x');
                    const byId = new Map(existing.map(a => [a.id, a]));
                    (partial || []).forEach(a => byId.set(a.id, a));
                    apply(Array.from(byId.values()));
                }
            });
            if (more && more.length) {
                const existing = (state.data.articles || []).filter(a => a.source === 'x');
                const byId = new Map(existing.map(a => [a.id, a]));
                more.forEach(a => byId.set(a.id, a));
                const all = Array.from(byId.values()).sort((a, b) => new Date(b.date) - new Date(a.date));
                apply(all);
                // Cache penuh hanya jika semua ID sukses
                const cfg2 = state.xArticlesConfig;
                if (cfg2 && all.length >= (cfg2.statusIds || []).length) {
                    writeXArticlesCache(cfg2, all);
                }
            }
        }
    } finally {
        state.xArticlesLoading = false;
        // Final paint: kalau tetap 0, tampilkan empty state; kalau ada, pastikan rail final
        refreshArticleSurfaces({ x: true });
    }
}

/** Re-render rail + dispatch + hero (lead = artikel terbaru) tanpa full page rebuild. */
function refreshArticleSurfaces(opts = {}) {
    if (!state.data) return;
    const arts = state.data.articles || [];
    // Hero / lead story: selalu ikuti artikel paling baru (X/Medium/Dispatches)
    if (opts.hero !== false && $('heroFeature')) {
        renderHero(arts);
    }
    if (opts.x !== false && $('xArticlesRail')) renderXArticlesRail(arts);
    if (opts.medium !== false && $('mediumArticlesRail')) renderMediumArticlesRail(arts);
    if ($('dispatchGrid')) {
        // Update category pills count + grid (all = feed terbaru unified)
        if ($('categoryPills') && state.data.categories) {
            renderCategoryPills(state.data.categories, state.dispatchFilter);
        }
        renderDispatchGrid();
    }
    // Article page: kalau sedang buka id x-/medium- yang baru masuk state, render
    if ($('articleContent') && opts.x !== false) {
        const params = new URLSearchParams(location.search);
        const id = params.get('id');
        if (id && (id.startsWith('x-') || id.startsWith('medium-'))) {
            const found = arts.find(a => a.id === id);
            if (found && !document.querySelector('.article-body, .article-header') && !document.querySelector('.reading-surface')) {
                renderArticleIntoContent(found);
            }
        }
    }
}

/**
 * Auto-refresh registry JSON (x-articles.json / medium-articles.json) tanpa hard reload.
 * - Interval 4 menit
 * - Saat tab kembali visible (user balik ke tab)
 * Deteksi perubahan lastSync / statusIds / jumlah Medium posts → re-fetch konten.
 */
function startRegistryAutoRefresh() {
    if (state.registryPollStarted) return;
    state.registryPollStarted = true;
    // Poll sering: GHA sync X/Medium ~15 menit; client tarik JSON biar artikel
    // baru tampil tanpa hard reload (juga coba live Medium RSS via jina).
    const INTERVAL_MS = 2 * 60 * 1000;

    const tick = () => {
        if (document.visibilityState === 'hidden') return;
        refreshRegistriesFromNetwork().catch(err => console.warn('Registry refresh failed', err));
        // Live Medium: coba RSS langsung (bypass jeda GHA) bila CORS/jina memungkinkan
        livePullMediumFromRss().catch(() => {});
    };

    // First refresh ~90s after load (beri waktu bootstrap X selesai)
    setTimeout(tick, 90 * 1000);
    setInterval(tick, INTERVAL_MS);
    document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') tick();
    });
    // Online kembali → tarik registry segar
    window.addEventListener('online', () => {
        setTimeout(tick, 800);
    });
}

/**
 * Live Medium pull: tarik feed RSS @0wlsky lewat jina reader (CORS * sering
 * tersedia) lalu merge post baru ke state. Fallback diam-diam kalau gagal —
 * GHA sync medium-articles.json tetap jadi sumber utama.
 */
async function livePullMediumFromRss() {
    if (!state.data) return;
    const username = (state.mediumArticlesConfig && state.mediumArticlesConfig.username)
        || (CONFIG.MEDIUM_ARTICLES && CONFIG.MEDIUM_ARTICLES.username)
        || '0wlsky';
    const feedUrl = `https://medium.com/feed/@${encodeURIComponent(username)}`;
    // Coba jina dulu (markdown/XML text), lalu raw feed langsung
    const sources = [
        `https://r.jina.ai/${feedUrl}`,
        feedUrl
    ];
    let xmlText = '';
    for (const url of sources) {
        try {
            const res = await fetch(url, { cache: 'no-store', mode: 'cors' });
            if (!res.ok) continue;
            const text = await res.text();
            if (text && text.includes('<item') && text.includes('<title')) {
                xmlText = text;
                break;
            }
            // jina kadang bungkus XML di markdown code fence
            if (text && text.includes('<item')) {
                xmlText = text;
                break;
            }
        } catch (e) { /* try next */ }
    }
    if (!xmlText) return;

    let items = [];
    try {
        const doc = new DOMParser().parseFromString(xmlText, 'text/xml');
        const nodes = Array.from(doc.querySelectorAll('item'));
        items = nodes.map(item => {
            const get = (tag) => {
                const el = item.getElementsByTagName(tag)[0]
                    || item.getElementsByTagNameNS('http://purl.org/dc/elements/1.1/', tag)[0]
                    || item.getElementsByTagNameNS('http://purl.org/rss/1.0/modules/content/', tag)[0];
                return el ? (el.textContent || '').trim() : '';
            };
            // content:encoded
            let contentHtml = '';
            const encoded = item.getElementsByTagNameNS('http://purl.org/rss/1.0/modules/content/', 'encoded')[0]
                || item.getElementsByTagName('content:encoded')[0]
                || item.querySelector('encoded');
            if (encoded) contentHtml = encoded.textContent || '';
            if (!contentHtml) contentHtml = get('description');
            const title = get('title');
            const link = get('link');
            const guid = get('guid') || link;
            const pubDate = get('pubDate');
            const creator = get('creator') || username;
            if (!title || !link) return null;
            // cover from first img
            let coverImage = '';
            const imgM = contentHtml.match(/<img[^>]+src=["']([^"']+)["']/i);
            if (imgM) coverImage = imgM[1];
            const excerpt = (contentHtml.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()).slice(0, 220);
            return {
                guid, title, link, pubDate, creator,
                categories: Array.from(item.getElementsByTagName('category')).map(c => (c.textContent || '').trim()).filter(Boolean),
                excerpt,
                coverImage,
                contentHtml
            };
        }).filter(Boolean);
    } catch (e) {
        return;
    }
    if (!items.length) return;

    // Pastikan registry config ada
    if (!state.mediumArticlesConfig) {
        try { await loadMediumArticlesRegistry(); } catch (e) { /* ignore */ }
    }
    const cfg = state.mediumArticlesConfig || {
        enabled: true, username, displayName: username, categoryId: 'medium-articles', posts: []
    };
    // Merge posts by guid/link
    const byKey = new Map((cfg.posts || []).map(p => [p.guid || p.link, p]));
    let added = 0;
    items.forEach(p => {
        const k = p.guid || p.link;
        if (!byKey.has(k)) added += 1;
        byKey.set(k, p);
    });
    cfg.posts = Array.from(byKey.values());
    cfg.lastSync = new Date().toISOString();
    state.mediumArticlesConfig = cfg;

    if (added === 0 && (state.data.articles || []).some(a => a.source === 'medium')) {
        // Tidak ada post baru di feed — biarkan state
        return;
    }

    try {
        sessionStorage.removeItem(mediumArticlesCacheKey(username));
    } catch (e) { /* ignore */ }

    const medArts = items.map(p => {
        try { return convertMediumPostToArticle(p, cfg); } catch (e) { return null; }
    }).filter(Boolean);
    // Also convert any older registry posts not in this batch
    if (cfg.posts.length > items.length) {
        cfg.posts.forEach(p => {
            try {
                const a = convertMediumPostToArticle(p, cfg);
                if (a && !medArts.some(x => x.id === a.id)) medArts.push(a);
            } catch (e) { /* ignore */ }
        });
    }
    if (medArts.length) {
        mergeMediumArticlesIntoState(medArts);
        refreshArticleSurfaces({ medium: true, x: false });
        if (added > 0) {
            console.log(`[Medium live] +${added} post dari RSS`);
        }
    }
}

async function refreshRegistriesFromNetwork() {
    if (!state.data) return;

    // --- X registry ---
    const prevX = state.xArticlesConfig;
    const prevXKey = prevX
        ? `${prevX.lastSync || ''}|${(prevX.statusIds || []).join(',')}`
        : '';
    // Paksa network (cache: no-store sudah di fetchJsonPreferLocal)
    let xCfg;
    try {
        xCfg = await loadXArticlesRegistry();
    } catch (e) {
        xCfg = null;
    }
    if (xCfg) {
        const nextXKey = `${xCfg.lastSync || ''}|${(xCfg.statusIds || []).join(',')}`;
        const have = new Set(
            (state.data.articles || [])
                .filter(a => a.source === 'x' && a.xStatusId)
                .map(a => String(a.xStatusId))
        );
        const missing = (xCfg.statusIds || []).filter(id => !have.has(String(id)));
        const registryChanged = nextXKey !== prevXKey;

        // Tarik ID baru (registry berubah) ATAU recovery ID yang gagal di load awal
        if ((registryChanged || missing.length) && missing.length && !state.xArticlesLoading) {
            if (registryChanged) {
                try {
                    sessionStorage.removeItem(xArticlesCacheKey(xCfg.username));
                } catch (e) { /* ignore */ }
            }
            state.xArticlesLoading = true;
            try {
                const more = await loadXArticles({
                    deadline: Date.now() + 40000,
                    onlyIds: missing,
                    onProgress: (partial) => {
                        const existing = (state.data.articles || []).filter(a => a.source === 'x');
                        const byId = new Map(existing.map(a => [a.id, a]));
                        (partial || []).forEach(a => byId.set(a.id, a));
                        mergeXArticlesIntoState(Array.from(byId.values()));
                        refreshArticleSurfaces({ x: true, medium: false });
                    }
                });
                if (more && more.length) {
                    const existing = (state.data.articles || []).filter(a => a.source === 'x');
                    const byId = new Map(existing.map(a => [a.id, a]));
                    more.forEach(a => byId.set(a.id, a));
                    const all = Array.from(byId.values()).sort((a, b) => new Date(b.date) - new Date(a.date));
                    mergeXArticlesIntoState(all);
                    if (all.length >= (xCfg.statusIds || []).length) {
                        writeXArticlesCache(xCfg, all);
                    }
                }
            } finally {
                state.xArticlesLoading = false;
                refreshArticleSurfaces({ x: true, medium: false });
            }
        } else if ($('xArticlesRail') && (xCfg.statusIds || []).length) {
            const countEl = $('xLiveCount');
            const xCount = (state.data.articles || []).filter(a => a.source === 'x').length;
            if (countEl && xCount) countEl.textContent = String(xCount);
        }
    }

    // --- Medium registry ---
    const prevM = state.mediumArticlesConfig;
    const prevMKey = prevM
        ? `${prevM.lastSync || ''}|${(prevM.posts || []).map(p => p.guid || p.link).join(',')}`
        : '';
    // Peek registry dulu (tanpa buang session cache) lewat loadMediumArticlesRegistry
    let peeked = null;
    try {
        peeked = await loadMediumArticlesRegistry();
    } catch (e) {
        peeked = null;
    }
    if (peeked) {
        const nextMKey = `${peeked.lastSync || ''}|${(peeked.posts || []).map(p => p.guid || p.link).join(',')}`;
        const mediumMissing = !(state.data.articles || []).some(a => a.source === 'medium');
        if (nextMKey !== prevMKey || mediumMissing) {
            try {
                sessionStorage.removeItem(mediumArticlesCacheKey(peeked.username));
            } catch (e) { /* ignore */ }
            try {
                const medArts = await loadMediumArticles();
                if (medArts && medArts.length) {
                    mergeMediumArticlesIntoState(medArts);
                    refreshArticleSurfaces({ medium: true, x: false });
                }
            } catch (e) {
                console.warn('Medium registry refresh failed', e);
            }
        }
    }
}

/**
 * Wrapper untuk loadXArticles() dengan batas waktu.
 *
 * FIX: implementasi lama pakai Promise.race([loadXArticles(), timeoutReject]).
 * Kalau timeout duluan, race REJECT dan SELURUH hasil yang sudah berhasil
 * ditarik ikut terbuang — padahal fetchXStatus() bisa retry sampai ~3x
 * percobaan @ 18 detik/percobaan per status ID (bisa >20 detik total kalau
 * FixTweet lambat/rate-limited), jadi timeout 20 detik sering kepotong
 * padahal 8-9 dari 10 artikel sebenarnya sudah sukses ditarik. Sekarang
 * loadXArticles() menerima `deadline` dan SELALU mengembalikan apapun yang
 * berhasil dikumpulkan sejauh itu — gak pernah all-or-nothing lagi.
 */
async function loadXArticlesWithTimeout(ms = 45000) {
    return loadXArticles({ deadline: Date.now() + ms });
}

function hideHomepageSkeletons() {
    ['heroSkeleton', 'potdSkeleton', 'xRailSkeleton', 'mediumRailSkeleton', 'dispatchSkeleton'].forEach(id => {
        const el = $(id);
        if (el) el.remove();
    });
}

// ==========================================
// X ARTICLES — live dari @Deadmouse_jpeg via FixTweet
// ==========================================
async function loadXArticlesRegistry() {
    let registry = null;
    try {
        registry = await fetchJsonPreferLocal(CONFIG.X_ARTICLES_FILE);
    } catch (e) {
        registry = null;
    }
    const fallback = CONFIG.X_ARTICLES || {};
    const cfg = {
        enabled: (registry && registry.enabled !== undefined) ? registry.enabled : (fallback.enabled !== false),
        username: (registry && registry.username) || fallback.username || 'Deadmouse_jpeg',
        displayName: (registry && registry.displayName) || fallback.displayName || 'Noob Sensei',
        categoryId: (registry && registry.categoryId) || fallback.categoryId || 'x-articles',
        apiBase: ((registry && registry.apiBase) || fallback.apiBase || 'https://api.fxtwitter.com').replace(/\/$/, ''),
        cacheMinutes: (registry && registry.cacheMinutes) || fallback.cacheMinutes || 30,
        lastSync: (registry && registry.lastSync) || null,
        statusIds: [
            ...new Set([
                ...((registry && registry.statusIds) || []),
                ...(fallback.statusIds || [])
            ].map(String).filter(Boolean))
        ]
    };
    // Merge status IDs tambahan dari db.json jika ada
    const fromDb = (state.data && state.data.xArticles && state.data.xArticles.statusIds) || [];
    fromDb.forEach(id => { if (id && !cfg.statusIds.includes(String(id))) cfg.statusIds.push(String(id)); });
    if (state.data && state.data.xArticles) {
        if (state.data.xArticles.enabled === false) cfg.enabled = false;
        if (state.data.xArticles.username) cfg.username = state.data.xArticles.username;
    }
    // Invalidate browser session cache if registry sync is newer than cache
    // atau set statusId berubah (artikel baru dari auto-sync GHA).
    try {
        const cacheKey = xArticlesCacheKey(cfg.username);
        const raw = sessionStorage.getItem(cacheKey);
        if (raw) {
            const parsed = JSON.parse(raw);
            const cacheTs = parsed && parsed.ts ? parsed.ts : 0;
            const syncTs = cfg.lastSync ? (Date.parse(cfg.lastSync) || 0) : 0;
            if (syncTs && cacheTs && syncTs > cacheTs) {
                sessionStorage.removeItem(cacheKey);
            } else {
                const cachedIds = new Set((parsed.articles || []).map(a => String(a.xStatusId)));
                if (cfg.statusIds.some(id => !cachedIds.has(String(id)))
                    || (parsed.articles || []).length !== cfg.statusIds.length) {
                    sessionStorage.removeItem(cacheKey);
                }
            }
        }
    } catch (e) { /* ignore */ }

    state.xArticlesConfig = cfg;
    return cfg;
}

function xArticlesCacheKey(username) {
    return `nanomind_x_articles_v1_${username}`;
}

function readXArticlesCache(cfg) {
    try {
        const raw = sessionStorage.getItem(xArticlesCacheKey(cfg.username));
        if (!raw) return null;
        const parsed = JSON.parse(raw);
        if (!parsed || !parsed.ts || !Array.isArray(parsed.articles)) return null;
        const maxAge = (cfg.cacheMinutes || 30) * 60 * 1000;
        if (Date.now() - parsed.ts > maxAge) return null;
        // Pastikan cache memuat semua statusId yang diminta
        const cachedIds = new Set(parsed.articles.map(a => a.xStatusId));
        if (cfg.statusIds.some(id => !cachedIds.has(id))) return null;
        return parsed.articles;
    } catch (e) {
        return null;
    }
}

function writeXArticlesCache(cfg, articles) {
    try {
        sessionStorage.setItem(xArticlesCacheKey(cfg.username), JSON.stringify({ ts: Date.now(), articles }));
    } catch (e) { /* quota / private mode */ }
}

async function fetchWithTimeout(url, ms = 18000) {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), ms);
    try {
        return await fetch(url, { cache: 'no-store', signal: ctrl.signal });
    } finally {
        clearTimeout(timer);
    }
}

async function fetchXStatus(cfg, statusId, retries = 2) {
    const url = `${cfg.apiBase}/${encodeURIComponent(cfg.username)}/status/${encodeURIComponent(statusId)}`;
    let lastErr;
    for (let attempt = 0; attempt <= retries; attempt++) {
        try {
            if (attempt > 0) await new Promise(r => setTimeout(r, 600 * attempt));
            const res = await fetchWithTimeout(url, 18000);
            if (!res.ok) throw new Error(`HTTP ${res.status} for ${statusId}`);
            const data = await res.json();
            const tweet = data.tweet || data;
            if (!tweet || !tweet.article) throw new Error(`No article on status ${statusId}`);
            return tweet;
        } catch (err) {
            lastErr = err;
        }
    }
    throw lastErr || new Error(`Failed ${statusId}`);
}

function estimateReadTimeFromBlocks(blocks) {
    const text = (blocks || []).map(b => {
        if (b.type === 'list') return (b.items || []).join(' ');
        return b.text || '';
    }).join(' ');
    const words = text.trim().split(/\s+/).filter(Boolean).length;
    return Math.max(1, Math.ceil(words / 200));
}

function parseTwitterDate(str) {
    if (!str) return new Date().toISOString().slice(0, 10);
    const d = new Date(str);
    if (isNaN(d)) {
        // "Thu Jul 23 15:11:56 +0000 2026"
        const d2 = new Date(str.replace(/\+(\d{4})/, 'GMT+$1'));
        if (!isNaN(d2)) return d2.toISOString().slice(0, 10);
        return new Date().toISOString().slice(0, 10);
    }
    return d.toISOString().slice(0, 10);
}

/** Konversi Draft.js-style blocks dari X Article → body nanomind */
function convertXContentBlocks(content) {
    const rawBlocks = (content && content.blocks) || [];
    const out = [];
    let listBuf = null; // { type:'list', ordered:bool, items:[] }

    const flushList = () => {
        if (listBuf && listBuf.items.length) out.push(listBuf);
        listBuf = null;
    };

    rawBlocks.forEach(b => {
        const type = b.type || 'unstyled';
        const text = (b.text || '').trim();

        if (type === 'unordered-list-item' || type === 'ordered-list-item') {
            const ordered = type === 'ordered-list-item';
            if (!listBuf || listBuf.ordered !== ordered) {
                flushList();
                listBuf = { type: 'list', ordered, items: [] };
            }
            if (text) listBuf.items.push(text);
            return;
        }

        flushList();

        if (type === 'header-one' || type === 'header-two' || type === 'header-three') {
            if (text) out.push({ type: 'heading', text });
        } else if (type === 'blockquote') {
            if (text) out.push({ type: 'quote', text });
        } else if (type === 'atomic') {
            // media atomic — skip tanpa entity image mapping yang andal
        } else {
            // unstyled / default
            if (text) out.push({ type: 'paragraph', text });
        }
    });
    flushList();
    return out;
}

function normalizeXImageUrl(url) {
    if (!url) return '';
    let u = String(url).trim();
    if (u.startsWith('//')) u = 'https:' + u;
    // Prefer large variant for pbs.twimg.com media
    if (/pbs\.twimg\.com\/media\//i.test(u) && !/[?&]name=/.test(u)) {
        u += (u.includes('?') ? '&' : '?') + 'name=large';
    }
    return u;
}

function extractXArticleCover(tweet, art) {
    const mi = art && art.cover_media && art.cover_media.media_info;
    let cover = (mi && (mi.original_img_url || mi.url || mi.preview_image_url)) || '';
    if (!cover && art && art.cover_image) cover = art.cover_image;
    if (!cover && tweet) {
        // some payloads put cover on top-level media
        const media = (tweet.media && tweet.media.photos && tweet.media.photos[0]) || null;
        if (media) cover = media.url || media.original_img_url || '';
        if (!cover && tweet.article && tweet.article.cover_media) {
            const c = tweet.article.cover_media;
            cover = (c.media_info && c.media_info.original_img_url) || c.url || '';
        }
    }
    return normalizeXImageUrl(cover);
}

function convertXTweetToArticle(tweet, cfg) {
    const art = tweet.article || {};
    const cover = extractXArticleCover(tweet, art);
    const body = convertXContentBlocks(art.content);
    const statusId = String(tweet.id || tweet.tweetID || '');
    const articleId = String(art.id || statusId);
    const preview = (art.preview_text || '').replace(/\n+/g, ' ').trim();
    const author = (tweet.author && (tweet.author.name || tweet.author.screen_name))
        || cfg.displayName
        || cfg.username;
    const date = parseTwitterDate(art.created_at || tweet.created_at);
    const xUrl = `https://x.com/${cfg.username}/status/${statusId}`;
    const articleUrl = art.id
        ? `https://x.com/i/article/${art.id}`
        : xUrl;

    return {
        id: `x-${statusId || articleId}`,
        title: art.title || 'Untitled X Article',
        dek: preview,
        category: cfg.categoryId || 'x-articles',
        coverImage: cover || (tweet.author && (tweet.author.avatar_url || tweet.author.avatarUrl)) || '',
        author,
        date,
        readTime: estimateReadTimeFromBlocks(body),
        featured: false,
        tags: ['x-articles', `@${cfg.username}`],
        body,
        source: 'x',
        xStatusId: statusId,
        xArticleId: articleId,
        xUrl,
        articleUrl,
        likes: tweet.likes || 0,
        views: tweet.views || 0
    };
}

async function loadXArticles(opts = {}) {
    const cfg = await loadXArticlesRegistry();
    if (!cfg.enabled || !cfg.statusIds.length) return [];

    // onlyIds: fetch subset (auto-retry / registry poll ID baru)
    const targetIds = (opts.onlyIds && opts.onlyIds.length)
        ? opts.onlyIds.map(String)
        : cfg.statusIds.slice();
    if (!targetIds.length) return [];

    // Cache penuh hanya dipakai kalau minta SEMUA id (bukan subset retry)
    if (!opts.onlyIds) {
        const cached = readXArticlesCache(cfg);
        if (cached) {
            if (typeof opts.onProgress === 'function') {
                try { opts.onProgress(cached); } catch (e) { /* ignore */ }
            }
            return cached;
        }
    }

    // Fetch paralel terbatas + retry di fetchXStatus (hindari rate-limit FixTweet)
    const CONCURRENCY = 3;
    const results = [];
    const ids = targetIds.slice();
    // Deadline: default 45 detik (lebih longgar dari 20s lama yang sering kepotong)
    const deadline = opts.deadline || (Date.now() + 45000);
    let progressTick = 0;

    async function worker() {
        while (ids.length) {
            const remaining = deadline - Date.now();
            if (remaining <= 800) break; // sisa waktu terlalu mepet, stop ambil ID baru
            const statusId = ids.shift();
            try {
                // Retry penuh (2x) kalau waktu masih longgar, retry minim/0 kalau mepet
                const retries = remaining > 14000 ? 2 : (remaining > 7000 ? 1 : 0);
                const tweet = await fetchXStatus(cfg, statusId, retries);
                results.push(convertXTweetToArticle(tweet, cfg));
                // Progressive UI: setiap artikel sukses → callback (throttle ringan)
                progressTick += 1;
                if (typeof opts.onProgress === 'function' && (progressTick === 1 || progressTick % 2 === 0 || !ids.length)) {
                    const snapshot = results.slice().sort((a, b) => new Date(b.date) - new Date(a.date));
                    try { opts.onProgress(snapshot); } catch (e) { /* ignore */ }
                }
            } catch (err) {
                console.warn('Gagal tarik X article', statusId, err);
            }
        }
    }
    // Tunggu workers; grace period → results parsial tetap dikembalikan (bukan all-or-nothing)
    const graceMs = Math.max(500, deadline - Date.now() + 1500);
    await Promise.race([
        Promise.all(Array.from({ length: Math.min(CONCURRENCY, targetIds.length) }, () => worker())),
        new Promise(resolve => setTimeout(resolve, graceMs))
    ]);

    results.sort((a, b) => new Date(b.date) - new Date(a.date));
    // Cache penuh HANYA jika minta semua ID registry DAN semuanya sukses
    if (!opts.onlyIds && results.length && !ids.length && results.length >= cfg.statusIds.length) {
        writeXArticlesCache(cfg, results);
    }
    return results;
}

function mergeXArticlesIntoState(xArts) {
    if (!state.data) return;
    const local = (state.data.articles || []).filter(a => a.source !== 'x');
    // Jangan timpa id lokal yang kebetulan sama
    const localIds = new Set(local.map(a => a.id));
    const mergedX = xArts.filter(a => !localIds.has(a.id));
    state.data.articles = [...local, ...mergedX];
}

// ==========================================
// MEDIUM ARTICLES — tarik live dari medium-articles.json
// (registry itu sendiri disinkron via GitHub Actions dari RSS resmi Medium,
//  lihat tools/sync-medium-articles.py). Berbeda dari X, konten lengkap
//  (content:encoded) sudah tersedia di registry, jadi tidak perlu fetch
//  per-artikel saat halaman dibuka — cukup konversi HTML → blocks di sini.
// ==========================================
async function loadMediumArticlesRegistry() {
    let registry = null;
    try {
        registry = await fetchJsonPreferLocal(CONFIG.MEDIUM_ARTICLES_FILE);
    } catch (e) {
        registry = null;
    }
    const fallback = CONFIG.MEDIUM_ARTICLES || {};
    const cfg = {
        enabled: (registry && registry.enabled !== undefined) ? registry.enabled : (fallback.enabled !== false),
        username: (registry && registry.username) || fallback.username || '0wlsky',
        displayName: (registry && registry.displayName) || fallback.displayName || 'nanomind',
        categoryId: (registry && registry.categoryId) || fallback.categoryId || 'medium-articles',
        cacheMinutes: (registry && registry.cacheMinutes) || fallback.cacheMinutes || 30,
        lastSync: (registry && registry.lastSync) || null,
        posts: (registry && Array.isArray(registry.articles)) ? registry.articles : []
    };
    state.mediumArticlesConfig = cfg;
    return cfg;
}

function mediumArticlesCacheKey(username) {
    return `nanomind_medium_articles_v1_${username}`;
}

function readMediumArticlesCache(cfg) {
    try {
        const raw = sessionStorage.getItem(mediumArticlesCacheKey(cfg.username));
        if (!raw) return null;
        const parsed = JSON.parse(raw);
        if (!parsed || !parsed.ts || !Array.isArray(parsed.articles)) return null;
        const maxAge = (cfg.cacheMinutes || 30) * 60 * 1000;
        if (Date.now() - parsed.ts > maxAge) return null;
        if (parsed.count !== cfg.posts.length) return null;
        if (cfg.lastSync && parsed.lastSync !== cfg.lastSync) return null;
        return parsed.articles;
    } catch (e) {
        return null;
    }
}

function writeMediumArticlesCache(cfg, articles) {
    try {
        sessionStorage.setItem(mediumArticlesCacheKey(cfg.username), JSON.stringify({
            ts: Date.now(), count: cfg.posts.length, lastSync: cfg.lastSync, articles
        }));
    } catch (e) { /* quota / private mode */ }
}

function normalizeMediumImageUrl(url) {
    if (!url) return '';
    let u = String(url).trim();
    if (u.startsWith('//')) u = 'https:' + u;
    // Upsize thumbnail Medium (…/resize:fill:100:100/…) ke lebar yang layak baca
    u = u.replace(/resize:(fill|fit):\d+:?\d*/i, 'resize:fit:1400');
    return u;
}

/** Konversi HTML content:encoded dari RSS Medium → body blocks nanomind (sama seperti convertXContentBlocks). */
function convertMediumHtmlToBlocks(html) {
    const out = [];
    if (!html) return out;
    let doc;
    try {
        doc = new DOMParser().parseFromString(html, 'text/html');
    } catch (e) {
        return out;
    }
    const root = doc.body;
    if (!root) return out;

    // Ganti <a href> jadi markdown [label](url) (dipahami renderTextWithLinks),
    // baru ambil textContent — mempertahankan tautan inline tanpa perlu block tipe baru.
    const textWithLinks = (el) => {
        const clone = el.cloneNode(true);
        clone.querySelectorAll('a[href]').forEach(a => {
            const label = (a.textContent || '').trim();
            const href = a.getAttribute('href') || '';
            if (label && /^https?:\/\//i.test(href)) {
                a.replaceWith(doc.createTextNode(`[${label}](${href})`));
            } else if (label) {
                a.replaceWith(doc.createTextNode(label));
            }
        });
        return (clone.textContent || '').replace(/\s+/g, ' ').trim();
    };

    const pushImage = (imgEl, captionText) => {
        const src = imgEl.getAttribute('src') || imgEl.getAttribute('data-src') || '';
        if (!src) return;
        out.push({ type: 'image', url: normalizeMediumImageUrl(src), caption: captionText || imgEl.getAttribute('alt') || '' });
    };

    const walk = (nodes) => {
        nodes.forEach(node => {
            if (node.nodeType !== 1) return; // elemen saja
            const tag = node.tagName.toLowerCase();
            if (tag === 'figure') {
                const img = node.querySelector('img');
                const cap = node.querySelector('figcaption');
                if (img) pushImage(img, cap ? textWithLinks(cap) : '');
                else walk(Array.from(node.children));
                return;
            }
            if (tag === 'img') { pushImage(node, ''); return; }
            if (tag === 'p') {
                const onlyImg = node.querySelector('img');
                if (onlyImg && (node.textContent || '').trim() === '') { pushImage(onlyImg, ''); return; }
                const text = textWithLinks(node);
                if (text) out.push({ type: 'paragraph', text });
                return;
            }
            if (/^h[1-4]$/.test(tag)) {
                const text = textWithLinks(node);
                if (text) out.push({ type: 'heading', text });
                return;
            }
            if (tag === 'blockquote') {
                const text = textWithLinks(node);
                if (text) out.push({ type: 'quote', text });
                return;
            }
            if (tag === 'ul' || tag === 'ol') {
                const items = Array.from(node.querySelectorAll(':scope > li')).map(li => textWithLinks(li)).filter(Boolean);
                if (items.length) out.push({ type: 'list', ordered: tag === 'ol', items });
                return;
            }
            if (tag === 'pre') {
                const text = (node.textContent || '').trim();
                if (text) out.push({ type: 'paragraph', text });
                return;
            }
            if (tag === 'iframe') {
                const src = node.getAttribute('src') || '';
                if (extractYouTubeId(src)) out.push({ type: 'video', url: src });
                else if (src) out.push({ type: 'link', text: 'Lihat lampiran', url: src });
                return;
            }
            if (tag === 'hr') return;
            // Wrapper generik (div/section) → turun ke elemen anak
            if (node.children && node.children.length) { walk(Array.from(node.children)); return; }
            const text = textWithLinks(node);
            if (text) out.push({ type: 'paragraph', text });
        });
    };

    walk(Array.from(root.children));
    return out;
}

function convertMediumPostToArticle(post, cfg) {
    const body = convertMediumHtmlToBlocks(post.contentHtml || '');
    const rawId = post.guid || post.link || '';
    const idSafe = rawId.replace(/[^a-zA-Z0-9]+/g, '-').replace(/^-+|-+$/g, '').split('-').pop() || generateId();
    let cover = normalizeMediumImageUrl(post.coverImage || '');
    if (!cover) {
        const firstImg = body.find(b => b.type === 'image');
        if (firstImg) cover = firstImg.url;
    }
    return {
        id: `medium-${idSafe}`,
        title: post.title || 'Untitled Medium Story',
        dek: post.excerpt || '',
        category: cfg.categoryId || 'medium-articles',
        coverImage: cover,
        author: post.creator || cfg.displayName || cfg.username,
        date: post.pubDate ? String(post.pubDate).slice(0, 10) : new Date().toISOString().slice(0, 10),
        readTime: estimateReadTimeFromBlocks(body),
        featured: false,
        tags: ['medium-articles', ...(post.categories || [])],
        body,
        source: 'medium',
        mediumUrl: post.link || ''
    };
}

async function loadMediumArticles() {
    const cfg = await loadMediumArticlesRegistry();
    if (!cfg.enabled || !cfg.posts.length) return [];

    const cached = readMediumArticlesCache(cfg);
    if (cached) return cached;

    const results = cfg.posts.map(post => {
        try {
            return convertMediumPostToArticle(post, cfg);
        } catch (err) {
            console.warn('Gagal konversi Medium post', post && post.link, err);
            return null;
        }
    }).filter(Boolean);

    results.sort((a, b) => new Date(b.date) - new Date(a.date));
    writeMediumArticlesCache(cfg, results);
    return results;
}

function mergeMediumArticlesIntoState(medArts) {
    if (!state.data) return;
    const rest = (state.data.articles || []).filter(a => a.source !== 'medium');
    const restIds = new Set(rest.map(a => a.id));
    const mergedM = medArts.filter(a => !restIds.has(a.id));
    state.data.articles = [...rest, ...mergedM];
}

// ==========================================
// TELEGRAM POSTS — dari @nanojournal (sync via GitHub Actions ke telegram-posts.json)
// ==========================================
async function loadTelegramRegistry() {
    let registry = null;
    try {
        registry = await fetchJsonPreferLocal(CONFIG.TELEGRAM_POSTS_FILE);
    } catch (e) {
        registry = null;
    }
    const fallback = CONFIG.TELEGRAM || {};
    const cfg = {
        enabled: (registry && registry.enabled !== undefined) ? registry.enabled : (fallback.enabled !== false),
        channel: (registry && registry.channel) || fallback.channel || 'nanojournal',
        channelUrl: (registry && registry.channelUrl) || fallback.channelUrl || `https://t.me/${fallback.channel || 'nanojournal'}`,
        previewUrl: (registry && registry.previewUrl) || fallback.previewUrl || `https://t.me/s/${fallback.channel || 'nanojournal'}`,
        categoryId: (registry && registry.categoryId) || fallback.categoryId || 'telegram',
        cacheMinutes: (registry && registry.cacheMinutes) || fallback.cacheMinutes || 5,
        lastSync: (registry && registry.lastSync) || null,
        lastSyncStats: (registry && registry.lastSyncStats) || null,
        posts: (registry && Array.isArray(registry.posts)) ? registry.posts : []
    };
    state.telegramConfig = cfg;
    return cfg;
}

function telegramCacheKey(channel) {
    return `nanomind_telegram_v1_${channel}`;
}

function readTelegramCache(cfg) {
    try {
        const raw = sessionStorage.getItem(telegramCacheKey(cfg.channel));
        if (!raw) return null;
        const parsed = JSON.parse(raw);
        if (!parsed || !parsed.ts || !Array.isArray(parsed.posts)) return null;
        const maxAge = (cfg.cacheMinutes || 5) * 60 * 1000;
        if (Date.now() - parsed.ts > maxAge) return null;
        if (cfg.lastSync && parsed.lastSync !== cfg.lastSync) return null;
        return parsed.posts;
    } catch (e) {
        return null;
    }
}

function writeTelegramCache(cfg, posts) {
    try {
        sessionStorage.setItem(telegramCacheKey(cfg.channel), JSON.stringify({
            ts: Date.now(), count: posts.length, lastSync: cfg.lastSync, posts
        }));
    } catch (e) { /* quota / private mode */ }
}

/** Sanitize Telegram HTML (sudah di-escape oleh parser Python) menjadi safe innerHTML.
 *  Kita izinkan: <br>, <b>, <i>, <strong>, <em>, <a>, <s>, <u>, <code>, <pre>.
 *  Selain itu di-strip. */
function sanitizeTgHtml(html) {
    if (!html) return '';
    // Unescape dulu supaya bisa di-parse
    const txt = document.createElement('textarea');
    txt.innerHTML = html;
    const raw = txt.value;
    // Parse ke DOM
    const doc = new DOMParser().parseFromString(`<div>${raw}</div>`, 'text/html');
    const root = doc.body.firstChild;
    if (!root) return '';
    const ALLOWED = new Set(['B', 'I', 'STRONG', 'EM', 'A', 'BR', 'S', 'U', 'CODE', 'PRE', 'SPAN']);
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT);
    const toRemove = [];
    let node;
    while ((node = walker.nextNode())) {
        if (!ALLOWED.has(node.tagName)) {
            toRemove.push(node);
            continue;
        }
        if (node.tagName === 'A') {
            const href = node.getAttribute('href') || '';
            // Hanya izinkan http/https/mailto; selain itu strip jadi text
            if (!/^(https?:|mailto:)/i.test(href)) {
                toRemove.push(node);
                continue;
            }
            node.setAttribute('target', '_blank');
            node.setAttribute('rel', 'noopener noreferrer');
            node.classList.add('inline-link');
        }
        // Strip inline style, class asli Telegram, dst — biar gak bentrok
        if (node.tagName !== 'A') {
            node.removeAttribute('style');
            node.removeAttribute('class');
        }
    }
    toRemove.forEach(n => {
        // ganti elemen dengan text content-nya (preserve content)
        const parent = n.parentNode;
        if (parent) {
            while (n.firstChild) parent.insertBefore(n.firstChild, n);
            parent.removeChild(n);
        }
    });
    return root.innerHTML;
}

/** Convert satu post Telegram → shape yang dipakai renderTelegramFeed. */
function normalizeTelegramPost(p, cfg) {
    const id = String(p.postId || '');
    const url = p.url || (cfg.channelUrl ? `${cfg.channelUrl}/${id}` : `https://t.me/${cfg.channel}/${id}`);
    const dt = p.datetime || new Date().toISOString();
    const textPlain = (p.textPlain || '').trim();
    const textHtml = sanitizeTgHtml(p.textHtml || '');
    const photos = Array.isArray(p.photos) ? p.photos.slice(0, 4) : [];
    const links = Array.isArray(p.links) ? p.links.filter(l => l && l.href) : [];
    // Preview: ambil link non-telegram pertama (skip link ke post telegram sendiri)
    const externalLink = links.find(l => /^https?:\/\//i.test(l.href) && !/^https?:\/\/t\.me\//i.test(l.href));
    return {
        id,
        postId: id,
        channel: cfg.channel,
        url,
        datetime: dt,
        date: dt.slice(0, 10),
        textPlain,
        textHtml,
        photos,
        links,
        externalLink,
        views: p.views || '',
        replyTo: p.replyTo || null,
        source: 'telegram'
    };
}

async function loadTelegramPosts() {
    const cfg = await loadTelegramRegistry();
    if (!cfg.enabled) return { cfg, posts: [] };
    const cached = readTelegramCache(cfg);
    if (cached) return { cfg, posts: cached };
    const posts = cfg.posts
        .map(p => { try { return normalizeTelegramPost(p, cfg); } catch (e) { return null; } })
        .filter(Boolean)
        .sort((a, b) => parseInt(b.postId, 10) - parseInt(a.postId, 10));
    writeTelegramCache(cfg, posts);
    return { cfg, posts };
}

const TELEGRAM_PAGE_SIZE = 20;

/** Escape & truncate helper untuk preview text. */
function tgExcerpt(text, max = 280) {
    const t = (text || '').replace(/\s+/g, ' ').trim();
    if (t.length <= max) return t;
    return t.slice(0, max - 1).trimEnd() + '…';
}

function tgCardHtml(p) {
    const date = formatDate(p.date);
    const rel = formatRelativeDate(p.date);
    const hasPhoto = p.photos.length > 0;
    const hasLink = !!p.externalLink;
    const coverPhoto = p.photos[0] || '';
    const extraPhotos = p.photos.length > 1 ? `<span class="tg-photo-count">+${p.photos.length - 1}</span>` : '';
    const photoBlock = hasPhoto ? `
        <div class="tg-card-photo">
            <img src="${escapeHtml(coverPhoto)}" alt="" loading="lazy" decoding="async" onerror="this.style.display='none'">
            ${extraPhotos}
        </div>` : '';
    const textBlock = p.textHtml
        ? `<div class="tg-card-text">${p.textHtml}</div>`
        : (hasPhoto
            ? `<div class="tg-card-text tg-card-text--muted"><em>(Post ini hanya berisi media)</em></div>`
            : `<div class="tg-card-text tg-card-text--muted"><em>(Post tanpa teks)</em></div>`);
    const linkBlock = hasLink ? `
        <a class="tg-card-link" href="${escapeHtml(p.externalLink.href)}" target="_blank" rel="noopener noreferrer">
            <i class="fas fa-arrow-up-right-from-square"></i>
            <span>${escapeHtml(tgExcerpt(p.externalLink.text || p.externalLink.href, 70))}</span>
        </a>` : '';
    const viewsBlock = p.views ? `<span class="tg-meta-item"><i class="far fa-eye"></i> ${escapeHtml(p.views)}</span>` : '';
    return `
        <article class="tg-card reveal" data-tg-post="${escapeHtml(p.postId)}" data-hasphoto="${hasPhoto ? '1' : '0'}" data-haslink="${hasLink ? '1' : '0'}" tabindex="0" role="link" aria-label="Buka post Telegram ${escapeHtml(date)}">
            <a class="tg-card-permalink" href="${escapeHtml(p.url)}" target="_blank" rel="noopener noreferrer" aria-label="Buka post asli di Telegram" title="Buka di Telegram">
                <i class="fab fa-telegram"></i>
            </a>
            ${photoBlock}
            <div class="tg-card-body">
                ${textBlock}
                ${linkBlock}
                <div class="tg-card-meta">
                    <span class="tg-meta-item"><i class="far fa-clock"></i> ${escapeHtml(date)} <span class="tg-meta-rel">(${escapeHtml(rel)})</span></span>
                    ${viewsBlock}
                    <span class="tg-meta-item">#${escapeHtml(p.postId)}</span>
                </div>
            </div>
        </article>`;
}

function applyTelegramFilter(posts) {
    const f = state.telegramFilter || 'all';
    if (f === 'withphoto') return posts.filter(p => p.photos.length > 0);
    if (f === 'textonly') return posts.filter(p => p.photos.length === 0 && p.textPlain);
    if (f === 'withlink') return posts.filter(p => p.externalLink);
    return posts;
}

function renderTelegramFeed(posts) {
    const wrap = $('tgFeed');
    const empty = $('tgEmpty');
    const skeleton = $('tgSkeleton');
    const loadMore = $('tgLoadMoreBtn');
    if (skeleton) skeleton.style.display = 'none';
    if (!wrap) return;

    const filtered = applyTelegramFilter(posts);
    const visibleCount = state.telegramPage * TELEGRAM_PAGE_SIZE;
    const visible = filtered.slice(0, visibleCount);

    if (!filtered.length) {
        wrap.innerHTML = '';
        if (empty) empty.classList.remove('hidden');
        if (loadMore) loadMore.classList.add('hidden');
        return;
    }
    if (empty) empty.classList.add('hidden');

    wrap.innerHTML = visible.map(p => tgCardHtml(p)).join('');
    if (loadMore) {
        loadMore.classList.toggle('hidden', visibleCount >= filtered.length);
        loadMore.onclick = () => {
            state.telegramPage++;
            renderTelegramFeed(posts);
            setTimeout(() => document.querySelectorAll('.reveal').forEach(el => { if (isElementInViewport(el)) el.classList.add('visible'); }), 50);
        };
    }
    setupScrollObserver();
}

function setupTelegramFilterTabs(posts) {
    const wrap = $('tgFilterBar');
    if (!wrap) return;
    wrap.querySelectorAll('[data-tgfilter]').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.tgfilter === state.telegramFilter);
        btn.onclick = () => {
            state.telegramFilter = btn.dataset.tgfilter;
            state.telegramPage = 1;
            setupTelegramFilterTabs(posts);
            renderTelegramFeed(posts);
        };
    });
}

async function renderTelegramPage() {
    const countEl = $('tgLiveCount');
    const pill = $('tgLivePill');
    const empty = $('tgEmpty');
    try {
        const { cfg, posts } = await loadTelegramPosts();
        state.telegramPosts = posts; // expose supaya search palette bisa nemu
        if (pill && cfg.lastSync) pill.title = `Auto-sync terakhir: ${cfg.lastSync}`;
        if (countEl) countEl.textContent = String(posts.length);
        setupTelegramFilterTabs(posts);
        renderTelegramFeed(posts);
    } catch (err) {
        console.warn('Telegram load failed', err);
        if (countEl) countEl.textContent = '0';
        if (empty) {
            empty.classList.remove('hidden');
            const sk = $('tgSkeleton'); if (sk) sk.style.display = 'none';
        }
    }
}

function setupTelegramRetryButtons() {
    const retry = async () => {
        try {
            if (state.telegramConfig && state.telegramConfig.channel) {
                sessionStorage.removeItem(telegramCacheKey(state.telegramConfig.channel));
            }
        } catch (e) { /* ignore */ }
        const sk = $('tgSkeleton'); if (sk) sk.style.display = 'flex';
        const empty = $('tgEmpty'); if (empty) empty.classList.add('hidden');
        await renderTelegramPage();
    };
    const b1 = $('tgRetryBtn'); if (b1) b1.addEventListener('click', retry);
    const b2 = $('tgEmptyRetryBtn'); if (b2) b2.addEventListener('click', retry);
}

/**
 * FIX: tgCardHtml() cuma bikin satu ikon kecil (.tg-card-permalink) yang
 * benar-benar <a> — sisa kartu (foto, teks, meta) statis & gak bisa diklik
 * sama sekali. User natural-nya coba klik teks/foto buat baca post, gak
 * nemu apa-apa. Fix: delegasikan klik di seluruh #tgFeed (container-nya gak
 * pernah diganti, cuma innerHTML-nya — jadi bind SEKALI, tetap kepasang
 * walau kartu di-render ulang) — buka post asli kalau klik area kartu yang
 * bukan link/tombol lain (link eksternal di dalam teks tetap jalan normal).
 */
function setupTelegramCardClicks() {
    const wrap = $('tgFeed');
    if (!wrap || wrap.dataset.cardClickBound) return;
    wrap.dataset.cardClickBound = '1';
    wrap.addEventListener('click', (e) => {
        // Kalau yang diklik adalah <a> asli (permalink icon, link eksternal
        // di dalam teks pesan, dst) — biarkan browser handle secara normal.
        if (e.target.closest('a')) return;
        const card = e.target.closest('.tg-card');
        if (!card) return;
        const permalink = card.querySelector('.tg-card-permalink');
        const url = permalink ? permalink.getAttribute('href') : null;
        if (url) window.open(url, '_blank', 'noopener,noreferrer');
    });
    // Aksesibilitas: kartu bisa di-fokus & dibuka pakai keyboard (Enter/Space)
    wrap.addEventListener('keydown', (e) => {
        if (e.key !== 'Enter' && e.key !== ' ') return;
        const card = e.target.closest('.tg-card');
        if (!card || e.target.closest('a')) return;
        e.preventDefault();
        const permalink = card.querySelector('.tg-card-permalink');
        const url = permalink ? permalink.getAttribute('href') : null;
        if (url) window.open(url, '_blank', 'noopener,noreferrer');
    });
}

// ==========================================
// PAGE DISPATCHER
// ==========================================
function renderPageContent() {
    if (!state.data) return;
    const { profile, site, categories, articles, photoOfDay, projects, links } = state.data;

    const navBrandName = $('navBrandName'); if (navBrandName) navBrandName.textContent = site.title || profile.name || 'Nanomind Explorer';
    const navBrandTagline = $('navBrandTagline'); if (navBrandTagline) navBrandTagline.textContent = site.tagline || '';
    const brand = site.title || profile.name || 'Nanomind Explorer';
    const footerBrandName = $('footerBrandName'); if (footerBrandName) footerBrandName.textContent = brand;
    const footerCopyBrand = $('footerCopyBrand'); if (footerCopyBrand) footerCopyBrand.textContent = brand;
    const footerTagline = $('footerTagline'); if (footerTagline) footerTagline.textContent = site.tagline || profile.bio || '';
    updateFooterSocial(links);
    if ($('heroFeature') || $('articleContent') || $('aboutName') || $('videoGrid')) {
        // keep path-specific titles; homepage:
        if ($('heroFeature') && site.title) document.title = `${site.title} — Dispatches from the Frontier`;
    }

    if ($('heroFeature')) {
        renderHero(articles);
        renderPhotoOfDay(photoOfDay);
        renderXArticlesRail(articles);
        renderMediumArticlesRail(articles);
        renderCategoryPills(categories, state.dispatchFilter);
        renderDispatchGrid();
    }
    if ($('articleContent')) {
        renderArticlePage();
    }
    if ($('aboutName')) {
        const av = $('aboutAvatar');
        if (av) {
            av.src = mediaUrl(profile.avatar) || profile.avatar || 'media/avatar.webp';
            av.onerror = () => { av.onerror = null; av.src = 'media/avatar.jpg'; };
        }
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
    if ($('tgFeed')) {
        renderTelegramPage();
    }

    setTimeout(() => {
        document.querySelectorAll('.reveal').forEach(el => { if (isElementInViewport(el)) el.classList.add('visible'); });
    }, 100);
    setupScrollObserver();
    enhanceImages();
}

/** Progressive image polish: async decode + soft fade-in */
function enhanceImages(root) {
    const scope = root || document;
    scope.querySelectorAll('img').forEach(img => {
        if (img.dataset.enhanced === '1') return;
        img.dataset.enhanced = '1';
        try { img.decoding = 'async'; } catch (e) { /* ignore */ }
        if (!img.getAttribute('loading') && !img.hasAttribute('fetchpriority')) {
            img.loading = 'lazy';
        }
        const mark = () => img.classList.add('img-fade', 'is-loaded');
        if (img.complete && img.naturalWidth > 0) {
            mark();
        } else {
            img.classList.add('img-fade');
            img.addEventListener('load', mark, { once: true });
            img.addEventListener('error', mark, { once: true });
        }
    });
}

// ==========================================
// HOMEPAGE — Hero, Photo of the Day, Dispatch Grid
// ==========================================

/**
 * Timestamp untuk sort "terbaru dulu".
 * - Tanggal ISO / YYYY-MM-DD dari field date
 * - X status snowflake (lebih presisi dari tanggal hari saja)
 * - Medium: guid tidak berisi waktu; andalkan pubDate/date
 */
function articleSortTime(a) {
    if (!a) return 0;
    // Prefer explicit full datetime if present
    const raw = a.date || a.pubDate || a.created_at || '';
    const parsed = Date.parse(raw);
    let t = isNaN(parsed) ? 0 : parsed;

    // X snowflake → ms since epoch (Twitter epoch)
    const sid = a.xStatusId || (a.id && String(a.id).startsWith('x-') ? String(a.id).slice(2) : '');
    if (sid && /^\d{15,}$/.test(String(sid))) {
        try {
            const snowMs = Number((BigInt(String(sid)) >> 22n) + 1288834974657n);
            // Pakai snowflake jika lebih baru / date cuma ke-hari (midnight)
            if (snowMs > t) t = snowMs;
        } catch (e) { /* ignore */ }
    }
    return t;
}

/**
 * Lead story di hero + posisi teratas journal:
 * SELALU artikel paling baru dari X / Medium / Dispatches lokal.
 * Flag `featured` cuma tie-breaker (bukan pin permanen yang mengalahkan post baru).
 */
function pickLeadArticle(articles) {
    const list = (articles || []).filter(a => a && (a.title || a.id));
    if (!list.length) return null;
    return list.slice().sort((a, b) => {
        const dt = articleSortTime(b) - articleSortTime(a);
        if (dt !== 0) return dt;
        if (a.featured && !b.featured) return -1;
        if (!a.featured && b.featured) return 1;
        return String(b.id || '').localeCompare(String(a.id || ''));
    })[0];
}

function leadSourceLabel(article) {
    if (!article) return { name: 'Dispatch', accent: 'brass' };
    if (article.source === 'x') {
        return { name: 'X Articles · Terbaru', accent: 'slate' };
    }
    if (article.source === 'medium') {
        return { name: 'Medium · Terbaru', accent: 'moss' };
    }
    const cat = (state.data.categories || []).find(c => c.id === article.category);
    if (cat) return { name: `${cat.name} · Terbaru`, accent: cat.accent || 'brass' };
    return { name: 'Build Log · Terbaru', accent: 'brass' };
}

function renderHero(articles) {
    const wrap = $('heroFeature');
    if (!wrap) return;
    const list = articles || (state.data && state.data.articles) || [];
    // Auto: post terbaru (X / Medium / Dispatches) di posisi paling atas (hero)
    const featured = pickLeadArticle(list);
    if (!featured) {
        wrap.innerHTML = `<div class="section-surface mx-6 text-center font-ui" style="color:var(--muted-on-ink)">Belum ada dispatch. Mulai tulis yang pertama lewat tombol admin di pojok kanan bawah.</div>`;
        wrap.className = 'hero-slot';
        return;
    }
    const cat = leadSourceLabel(featured);
    const ctaLabel = featured.source === 'x'
        ? 'Baca X Article'
        : (featured.source === 'medium' ? 'Baca di Medium' : 'Baca Dispatch');
    const ctaIcon = featured.source === 'x'
        ? 'fab fa-x-twitter'
        : (featured.source === 'medium' ? 'fab fa-medium' : 'fas fa-book-open');
    wrap.className = 'hero-slot accent-' + (cat.accent || 'brass');
    wrap.innerHTML = `
        <div class="hero-feature">
            ${imgTag(featured.coverImage, featured.title, 'fetchpriority="high"')}
            <svg class="route-line" viewBox="0 0 200 400" style="left:12px; top:4%; width:80px; height:50%;" aria-hidden="true"><path d="M20,10 C60,80 10,160 90,220 S140,340 100,380" /></svg>
            <div class="hero-feature-content" style="left:0;top:0;bottom:0;right:auto;margin:0;height:100%;">
                <div class="hero-content-glass">
                    <span class="eyebrow" style="color:#fff;">${escapeHtml(cat.name)}</span>
                    <h1 class="mt-4">${escapeHtml(featured.title)}</h1>
                    ${featured.dek ? `<p class="dek">${escapeHtml(featured.dek)}</p>` : ''}
                    <div class="hero-meta-row">
                        ${dateMetaHtml(featured.date)}
                        <span aria-hidden="true">·</span>
                        <span>${featured.readTime || 5} min baca</span>
                    </div>
                    <div class="hero-cta-row">
                        <a href="article.html?id=${encodeURIComponent(featured.id)}" class="btn-primary"><i class="${ctaIcon}"></i> ${ctaLabel}</a>
                    </div>
                </div>
            </div>
        </div>`;
    enhanceImages(wrap);
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
            <div class="potd-image">${imgTag(potd.image, 'Photo of the day', 'loading="lazy" decoding="async"')}</div>
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
    // "All" = feed terbaru (Build Log stream: local + X + Medium)
    let html = `<button class="cat-pill ${activeFilter === 'all' ? 'active' : ''}" data-cat="all">Terbaru</button>`;
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

function getArticlesSorted() {
    return (state.data.articles || []).slice().sort((a, b) => {
        const dt = articleSortTime(b) - articleSortTime(a);
        if (dt !== 0) return dt;
        if (a.featured && !b.featured) return -1;
        if (!a.featured && b.featured) return 1;
        return 0;
    });
}

/**
 * Grid Dispatches (Build Log stream):
 * - "all": gabungan lokal + X + Medium, TERBARU di paling atas (kartu besar pertama)
 * - filter kategori: hanya kategori itu, tetap sort terbaru dulu
 * Rail X/Medium tetap ada sebagai pintasan; grid "all" jadi feed unified.
 */
function getDispatchArticles() {
    const all = getArticlesSorted();
    const filter = state.dispatchFilter || 'all';
    if (filter === 'all') return all;
    if (filter === 'x-articles') return all.filter(a => a.source === 'x' || a.category === 'x-articles');
    if (filter === 'medium-articles') return all.filter(a => a.source === 'medium' || a.category === 'medium-articles');
    // Build Log / Deep Dive / … — local category; juga sertakan import yang di-tag category itu
    return all.filter(a => a.category === filter);
}

function renderXArticlesRail(articles) {
    const rail = $('xArticlesRail');
    const section = $('xArticlesSection');
    const empty = $('xArticlesEmpty');
    if (!rail) return;

    const xList = (articles || [])
        .filter(a => a.source === 'x')
        .sort((a, b) => new Date(b.date) - new Date(a.date));

    const countEl = $('xLiveCount');
    const expected = (state.xArticlesConfig && state.xArticlesConfig.statusIds)
        ? state.xArticlesConfig.statusIds.length
        : xList.length;
    // Saat loading: tampilkan progress "3/10", bukan 0 yang menyesatkan
    if (countEl) {
        countEl.textContent = state.xArticlesLoading && expected > xList.length
            ? `${xList.length}/${expected}`
            : String(xList.length || expected || 0);
    }
    const pill = $('xLivePill');
    if (pill && state.xArticlesConfig && state.xArticlesConfig.lastSync) {
        const sync = state.xArticlesConfig.lastSync;
        pill.title = `Auto-sync terakhir: ${sync}`;
    }

    if (!xList.length) {
        // FIX race: JANGAN wipe rail ke empty state selagi masih loading.
        // renderPageContent() dulu memanggil ini sebelum FixTweet selesai →
        // placeholder hilang & user harus reload manual. Pertahankan /
        // render ulang placeholder sampai fetch beres (atau gagal total).
        if (state.xArticlesLoading && state.xArticlesConfig && (state.xArticlesConfig.statusIds || []).length) {
            // Hindari re-paint berulang kalau placeholder sudah ada
            if (!rail.querySelector('.x-card-placeholder') && !rail.querySelector('.x-card')) {
                renderXArticlesRailPlaceholder(state.xArticlesConfig);
            }
            if (empty) empty.classList.add('hidden');
            if (section) section.classList.remove('is-empty');
            return;
        }
        rail.innerHTML = '';
        if (empty) empty.classList.remove('hidden');
        if (section) section.classList.add('is-empty');
        return;
    }
    if (empty) empty.classList.add('hidden');
    if (section) section.classList.remove('is-empty');

    rail.innerHTML = xList.map(a => `
        <a href="article.html?id=${encodeURIComponent(a.id)}" class="x-card from-x reveal">
            <div class="x-thumb">
                ${imgTag(a.coverImage, a.title, 'loading="lazy" decoding="async"')}
                <span class="x-source-badge" title="X Articles"><i class="fab fa-x-twitter"></i> X</span>
            </div>
            <div class="x-body">
                <h3>${escapeHtml(a.title)}</h3>
                ${a.dek ? `<p class="x-dek">${escapeHtml(a.dek)}</p>` : ''}
                <div class="x-meta">
                    ${dateMetaHtml(a.date)}
                    <span aria-hidden="true">·</span>
                    <span>${a.readTime || 5} min</span>
                </div>
            </div>
        </a>
    `).join('');
    enhanceImages(rail);
}

/**
 * Render PLACEHOLDER cards untuk X Articles dari registry (status IDs).
 * Dipanggil SEGERA setelah db.json load, sebelum fxtwitter fetch selesai.
 * User lihat rail terisi dengan cards yang bisa diklik → langsung navigasi
 * ke article.html (yang akan direct-fetch artikel by-ID via fallback).
 *
 * Setelah loadXArticles() selesai di background, renderXArticlesRail()
 * dipanggil lagi untuk ganti placeholder dengan cards berisi content asli
 * (title, cover image, dek, dll dari fxtwitter API).
 */
function renderXArticlesRailPlaceholder(cfg) {
    const rail = $('xArticlesRail');
    const section = $('xArticlesSection');
    const empty = $('xArticlesEmpty');
    if (!rail || !cfg || !cfg.statusIds || !cfg.statusIds.length) return;

    if (empty) empty.classList.add('hidden');
    if (section) section.classList.remove('is-empty');

    const countEl = $('xLiveCount');
    if (countEl) countEl.textContent = String(cfg.statusIds.length);
    const pill = $('xLivePill');
    if (pill && cfg.lastSync) {
        pill.title = `Auto-sync terakhir: ${cfg.lastSync}`;
    }

    // Render placeholder cards — bisa diklik, navigasi ke article.html
    // yang akan direct-fetch artikel by-ID.
    rail.innerHTML = cfg.statusIds.map(statusId => `
        <a href="article.html?id=x-${encodeURIComponent(statusId)}" class="x-card reveal x-card-placeholder">
            <div class="x-thumb">
                <div class="x-thumb-placeholder" aria-hidden="true">
                    <i class="fab fa-x-twitter"></i>
                </div>
                <span class="x-source-badge" title="X Articles"><i class="fab fa-x-twitter"></i> X</span>
            </div>
            <div class="x-body">
                <h3>Memuat artikel…</h3>
                <p class="x-dek x-dek-placeholder">Klik untuk membaca artikel dari X</p>
                <div class="x-meta">
                    <span class="x-meta-placeholder">···</span>
                    <span>·</span>
                    <span>— min</span>
                </div>
            </div>
        </a>
    `).join('');
}

function renderMediumArticlesRail(articles) {
    const rail = $('mediumArticlesRail');
    const section = $('mediumArticlesSection');
    const empty = $('mediumArticlesEmpty');
    if (!rail) return;

    const list = (articles || [])
        .filter(a => a.source === 'medium')
        .sort((a, b) => new Date(b.date) - new Date(a.date));

    const countEl = $('mediumLiveCount');
    const expectedM = (state.mediumArticlesConfig && state.mediumArticlesConfig.posts)
        ? state.mediumArticlesConfig.posts.length
        : list.length;
    if (countEl) {
        countEl.textContent = state.mediumArticlesLoading && expectedM > list.length
            ? `${list.length}/${expectedM}`
            : String(list.length || expectedM || 0);
    }
    const pill = $('mediumLivePill');
    if (pill && state.mediumArticlesConfig && state.mediumArticlesConfig.lastSync) {
        pill.title = `Auto-sync terakhir: ${state.mediumArticlesConfig.lastSync}`;
    }

    if (!list.length) {
        // Jangan flash empty state saat Medium masih loading
        if (state.mediumArticlesLoading) {
            if (empty) empty.classList.add('hidden');
            if (section) section.classList.remove('is-empty');
            return;
        }
        rail.innerHTML = '';
        if (empty) empty.classList.remove('hidden');
        if (section) section.classList.add('is-empty');
        return;
    }
    if (empty) empty.classList.add('hidden');
    if (section) section.classList.remove('is-empty');

    rail.innerHTML = list.map(a => `
        <a href="article.html?id=${encodeURIComponent(a.id)}" class="x-card from-medium reveal">
            <div class="x-thumb">
                ${imgTag(a.coverImage, a.title, 'loading="lazy" decoding="async"')}
                <span class="x-source-badge" title="Medium"><i class="fab fa-medium"></i> Medium</span>
            </div>
            <div class="x-body">
                <h3>${escapeHtml(a.title)}</h3>
                ${a.dek ? `<p class="x-dek">${escapeHtml(a.dek)}</p>` : ''}
                <div class="x-meta">
                    ${dateMetaHtml(a.date)}
                    <span aria-hidden="true">·</span>
                    <span>${a.readTime || 5} min</span>
                </div>
            </div>
        </a>
    `).join('');
    enhanceImages(rail);
}

function renderDispatchGrid() {
    const wrap = $('dispatchGrid');
    if (!wrap) return;
    const filtered = getDispatchArticles();
    const visibleCount = state.dispatchPage * DISPATCH_PAGE_SIZE;
    const visible = filtered.slice(0, visibleCount);

    const emptyEl = $('dispatchEmpty');
    if (emptyEl) emptyEl.classList.toggle('hidden', visible.length > 0);
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
    enhanceImages(wrap);
}

function dispatchCardHtml(a, i) {
    const cat = (state.data.categories || []).find(c => c.id === a.category) || { name: 'Dispatch', accent: 'brass' };
    const pos = i % 5;
    let span, sizeClass;
    if (pos === 0) { span = 'span-4'; sizeClass = 'size-lg'; }
    else if (pos === 1) { span = 'span-2'; sizeClass = 'size-sm'; }
    else { span = 'span-2'; sizeClass = 'size-md'; }
    const sourceBadge = a.source === 'x'
        ? `<span class="x-source-badge" title="Ditarik live dari X Articles"><i class="fab fa-x-twitter"></i> X</span>`
        : a.source === 'medium'
            ? `<span class="x-source-badge" title="Ditarik live dari Medium"><i class="fab fa-medium"></i> Medium</span>`
            : '';
    const sourceClass = a.source === 'x' ? ' from-x' : (a.source === 'medium' ? ' from-medium' : '');
    const dek = a.dek
        ? `<p class="card-dek">${escapeHtml(a.dek)}</p>`
        : '';
    return `
        <a href="article.html?id=${encodeURIComponent(a.id)}" class="dispatch-card ${sizeClass} ${span} accent-${cat.accent || 'brass'} reveal${sourceClass}">
            <div class="thumb">
                ${imgTag(a.coverImage, a.title, 'loading="lazy" decoding="async"')}
                ${sourceBadge}
            </div>
            <div class="card-body">
                <span class="card-eyebrow">${escapeHtml(cat.name)}</span>
                <h3>${escapeHtml(a.title)}</h3>
                ${dek}
                <div class="card-meta">${dateMetaHtml(a.date)}<span>·</span><span>${a.readTime || 5} min</span></div>
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
            const idAttr = b._tocId ? ` id="${escapeHtml(b._tocId)}"` : '';
            html += `<h2${idAttr}>${renderTextWithLinks(b.text || '')}</h2>`;
        } else if (b.type === 'image') {
            html += `<figure>${imgTag(b.url, b.caption || '', 'loading="lazy" decoding="async"')}`;
            if (b.caption || b.credit) html += `<figcaption>${escapeHtml(b.caption || '')}${b.credit ? ` — ${escapeHtml(b.credit)}` : ''}</figcaption>`;
            html += `</figure>`;
        } else if (b.type === 'quote') {
            html += `<blockquote>${renderTextWithLinks(b.text || '')}${b.attribution ? `<cite>${escapeHtml(b.attribution)}</cite>` : ''}</blockquote>`;
        } else if (b.type === 'list') {
            const tag = b.ordered ? 'ol' : 'ul';
            const items = (b.items || []).map(item => `<li>${renderTextWithLinks(item)}</li>`).join('');
            html += `<${tag} class="article-list">${items}</${tag}>`;
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

function buildArticleToc(blocks) {
    const heads = (blocks || []).filter(b => b.type === 'heading' && (b.text || '').trim());
    if (heads.length < 2) return { html: '', withIds: blocks || [] };
    const withIds = (blocks || []).map((b, i) => {
        if (b.type !== 'heading') return b;
        return { ...b, _tocId: `sec-${i}` };
    });
    const items = withIds.filter(b => b._tocId).map(b =>
        `<li><a href="#${b._tocId}">${escapeHtml(b.text)}</a></li>`
    ).join('');
    return {
        html: `<nav class="article-toc" aria-label="Daftar isi"><p class="article-toc-title">Daftar isi</p><ol>${items}</ol></nav>`,
        withIds
    };
}

function injectJsonLd(article) {
    document.querySelectorAll('script[data-jsonld="article"]').forEach(n => n.remove());
    const cover = mediaUrl(article.coverImage) || article.coverImage || '';
    const absCover = cover.startsWith('http') ? cover : `https://nanomindexplorer.github.io/nanomind/${cover.replace(/^\.\//, '')}`;
    const data = {
        '@context': 'https://schema.org',
        '@type': 'Article',
        headline: article.title,
        description: article.dek || '',
        image: absCover ? [absCover] : undefined,
        datePublished: article.date,
        author: { '@type': 'Person', name: article.author || 'Nanomind Explorer' },
        publisher: { '@type': 'Organization', name: 'Nanomind Explorer' },
        mainEntityOfPage: location.href
    };
    const s = document.createElement('script');
    s.type = 'application/ld+json';
    s.dataset.jsonld = 'article';
    s.textContent = JSON.stringify(data);
    document.head.appendChild(s);
}

function bindArticleShare(article) {
    const copyBtn = $('shareCopyBtn');
    const xBtn = $('shareXBtn');
    const url = location.href;
    const text = `${article.title}${article.dek ? ' — ' + article.dek : ''}`;
    if (copyBtn) {
        copyBtn.addEventListener('click', async () => {
            try {
                await navigator.clipboard.writeText(url);
                showToast('Tautan disalin.', 'success');
            } catch (e) {
                showToast('Gagal menyalin tautan.', 'error');
            }
        });
    }
    if (xBtn) {
        xBtn.addEventListener('click', () => {
            const share = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`;
            window.open(share, '_blank', 'noopener,noreferrer');
        });
    }
}

function renderArticlePage() {
    const params = new URLSearchParams(location.search);
    const id = params.get('id');
    const content = $('articleContent');
    const notFound = $('articleNotFound');
    const article = (state.data.articles || []).find(a => a.id === id);

    if (article) {
        if (notFound) notFound.style.display = 'none';
        renderArticleIntoContent(article);
        return;
    }

    // === Fallback: artikel belum ada di state.data.articles ===
    // Ini terjadi saat user klik link X/Medium langsung (mis. dari search engine
    // atau share), padahal loadXArticles() belum kelar / gagal fetch sebagian.
    // Kita fetch langsung by-ID biar halaman tetap kebuka, bukan 404.
    if (id && id.startsWith('x-')) {
        const statusId = id.slice(2);
        if (/^\d{10,}$/.test(statusId)) {
            content.innerHTML = `
                <div class="article-loading-state" role="status" aria-live="polite">
                    <div class="article-loading-spinner" aria-hidden="true"></div>
                    <p>Menarik artikel dari X…</p>
                    <p class="article-loading-sub">Mungkin butuh beberapa detik.</p>
                </div>`;
            if (notFound) notFound.style.display = 'none';
            (async () => {
                try {
                    const cfg = state.xArticlesConfig || await loadXArticlesRegistry();
                    const tweet = await fetchXStatus(cfg, statusId, /*retries*/ 2);
                    const art = convertXTweetToArticle(tweet, cfg);
                    // merge supaya renderRelated & lookup berikutnya bisa nemu
                    if (state.data && Array.isArray(state.data.articles)) {
                        if (!state.data.articles.some(a => a.id === art.id)) state.data.articles.push(art);
                    }
                    renderArticleIntoContent(art);
                } catch (err) {
                    console.warn('Direct X article fetch failed', err);
                    content.innerHTML = '';
                    if (notFound) {
                        notFound.style.display = 'block';
                        notFound.innerHTML = `
                            <p class="eyebrow justify-center mb-4">X Article</p>
                            <h1 class="font-display text-3xl mb-4" style="color:var(--parchment-text)">Artikel belum bisa dimuat</h1>
                            <p class="mb-6 section-sub" style="margin:0 auto 1.5rem;">Koneksi ke X/FixTweet terganggu atau artikel sudah tidak publik. Coba lagi, atau buka langsung di X.</p>
                            <div class="flex flex-wrap gap-3 justify-center">
                                <button type="button" class="btn-primary inline-flex" onclick="location.reload()"><i class="fas fa-rotate"></i> Coba lagi</button>
                                <a class="btn-ghost inline-flex" href="https://x.com/${encodeURIComponent((state.xArticlesConfig && state.xArticlesConfig.username) || 'Deadmouse_jpeg')}/status/${encodeURIComponent(statusId)}" target="_blank" rel="noopener noreferrer"><i class="fab fa-x-twitter"></i> Buka di X</a>
                                <a href="index.html" class="btn-ghost inline-flex">Kembali ke Dispatches</a>
                            </div>`;
                    }
                }
            })();
            return;
        }
    }

    if (id && id.startsWith('medium-')) {
        // ID Medium di-generate dari GUID/URL — kita reload registry & cari match
        // berdasarkan suffix id. Kalau ketemu, convert & render.
        const idSuffix = id.slice(7);
        content.innerHTML = `
            <div class="article-loading-state" role="status" aria-live="polite">
                <div class="article-loading-spinner" aria-hidden="true"></div>
                <p>Menarik artikel dari Medium…</p>
            </div>`;
        if (notFound) notFound.style.display = 'none';
        (async () => {
            try {
                const cfg = await loadMediumArticlesRegistry();
                const post = (cfg.posts || []).find(p => {
                    const raw = (p.guid || p.link || '');
                    const safe = raw.replace(/[^a-zA-Z0-9]+/g, '-').replace(/^-+|-+$/g, '').split('-').pop() || '';
                    return safe === idSuffix;
                });
                if (!post) throw new Error('Post tidak ada di registry');
                const art = convertMediumPostToArticle(post, cfg);
                if (state.data && Array.isArray(state.data.articles)) {
                    if (!state.data.articles.some(a => a.id === art.id)) state.data.articles.push(art);
                }
                renderArticleIntoContent(art);
            } catch (err) {
                console.warn('Direct Medium article lookup failed', err);
                content.innerHTML = '';
                if (notFound) {
                    notFound.style.display = 'block';
                    notFound.innerHTML = `
                        <p class="eyebrow justify-center mb-4">Medium</p>
                        <h1 class="font-display text-3xl mb-4" style="color:var(--parchment-text)">Artikel belum bisa dimuat</h1>
                        <p class="mb-6 section-sub" style="margin:0 auto 1.5rem;">Registry Medium belum ter-load atau koneksi terganggu. Coba lagi, atau buka langsung di Medium.</p>
                        <div class="flex flex-wrap gap-3 justify-center">
                            <button type="button" class="btn-primary inline-flex" onclick="location.reload()"><i class="fas fa-rotate"></i> Coba lagi</button>
                            <a href="index.html" class="btn-ghost inline-flex">Kembali ke Dispatches</a>
                        </div>`;
                }
            }
        })();
        return;
    }

    // Bener-bener gak ketemu & bukan prefix x-/medium-
    if (notFound) notFound.style.display = 'block';
    content.innerHTML = '';
}

// Render isi artikel ke #articleContent — di-refactor dari renderArticlePage
// supaya bisa dipanggil ulang setelah direct-fetch.
function renderArticleIntoContent(article) {
    const content = $('articleContent');
    if (!content || !article) return;
    const notFound = $('articleNotFound');
    if (notFound) notFound.style.display = 'none';
    const cat = (state.data.categories || []).find(c => c.id === article.category) || { name: 'Dispatch', accent: 'brass' };
    const isX = article.source === 'x';
    const isMedium = article.source === 'medium';
    const isImported = isX || isMedium;
    const rt = article.readTime || 5;

    document.title = `${article.title} — Nanomind Explorer`;
    const setMeta = (id2, val) => { const el = $(id2); if (el) el.setAttribute('content', val || ''); };
    setMeta('pageDescription', article.dek);
    setMeta('ogTitle', article.title);
    setMeta('ogDescription', article.dek);
    setMeta('ogImage', mediaUrl(article.coverImage) || article.coverImage);
    injectJsonLd(article);

    const toc = buildArticleToc(article.body);
    const bodyBlocks = toc.withIds;

    const xSourceHtml = isX ? `
        <div class="x-article-source">
            <div class="x-article-source-inner">
                <i class="fab fa-x-twitter"></i>
                <div>
                    <strong>Sumber: X Articles</strong>
                    <p>Diterbitkan oleh @${escapeHtml((state.xArticlesConfig && state.xArticlesConfig.username) || 'Deadmouse_jpeg')} di X. Konten ditarik live ke situs ini.</p>
                </div>
                <a href="${escapeHtml(article.articleUrl || article.xUrl || '#')}" target="_blank" rel="noopener noreferrer" class="btn-primary">
                    <i class="fab fa-x-twitter"></i> Baca di X
                </a>
            </div>
        </div>` : '';

    const mediumSourceHtml = isMedium ? `
        <div class="x-article-source">
            <div class="x-article-source-inner">
                <i class="fab fa-medium"></i>
                <div>
                    <strong>Sumber: Medium</strong>
                    <p>Diterbitkan oleh @${escapeHtml((state.mediumArticlesConfig && state.mediumArticlesConfig.username) || '0wlsky')} di Medium. Konten ditarik live ke situs ini.</p>
                </div>
                <a href="${escapeHtml(article.mediumUrl || '#')}" target="_blank" rel="noopener noreferrer" class="btn-primary">
                    <i class="fab fa-medium"></i> Baca di Medium
                </a>
            </div>
        </div>` : '';

    const adminControls = isImported ? '' : `
            <div class="mt-10 admin-only" id="articleAdminControls">
                <button class="btn-ghost on-paper" id="editArticleBtn"><i class="fas fa-pen"></i> Edit Dispatch</button>
                <button class="btn-ghost on-paper" id="deleteArticleBtn" style="color:var(--rust); border-color:var(--rust);"><i class="fas fa-trash"></i> Delete</button>
            </div>`;

    const shareHtml = `
        <div class="article-share">
            <span class="share-label">Bagikan</span>
            <button type="button" class="share-btn" id="shareCopyBtn"><i class="fas fa-link"></i> Salin tautan</button>
            <button type="button" class="share-btn" id="shareXBtn"><i class="fab fa-x-twitter"></i> Bagikan ke X</button>
        </div>`;

    content.className = 'accent-' + (cat.accent || 'brass');
    content.innerHTML = `
        <div class="article-hero">
            ${imgTag(article.coverImage, article.title, 'fetchpriority="high"')}
            <div class="article-hero-content">
                <span class="eyebrow" style="color:#fff;">${escapeHtml(cat.name)}${isX ? ' · X' : (isMedium ? ' · Medium' : '')}</span>
                <h1 class="mt-4">${escapeHtml(article.title)}</h1>
                ${article.dek ? `<p class="dek">${escapeHtml(article.dek)}</p>` : ''}
                <div class="byline-row">
                    ${article.author ? `<span>${escapeHtml(article.author)}</span><span class="sep" aria-hidden="true"></span>` : ''}
                    <span>${formatDate(article.date)}</span>
                    <span class="byline-extra">(${formatRelativeDate(article.date)})</span>
                    <span class="sep" aria-hidden="true"></span>
                    <span>${rt} min baca</span>
                </div>
            </div>
        </div>
        <div class="reading-surface">
            ${toc.html}
            ${renderArticleBody(bodyBlocks)}
            ${(article.tags || []).length ? `<div class="tag-row">${article.tags.map(t => `<span class="tag-chip">${escapeHtml(t)}</span>`).join('')}</div>` : ''}
            ${shareHtml}
            ${xSourceHtml}
            ${mediumSourceHtml}
            ${adminControls}
        </div>`;

    // Heading anchors for TOC
    content.querySelectorAll('.reading-surface h2').forEach((h, idx) => {
        const blockHeads = bodyBlocks.filter(b => b.type === 'heading');
        if (blockHeads[idx] && blockHeads[idx]._tocId) h.id = blockHeads[idx]._tocId;
    });

    if (!isImported) {
        const editBtn = $('editArticleBtn'); if (editBtn) editBtn.addEventListener('click', () => openArticleModal(article.id));
        const delBtn = $('deleteArticleBtn'); if (delBtn) delBtn.addEventListener('click', () => deleteArticle(article.id));
    }

    bindArticleShare(article);
    renderRelated(article);
    setupReadingProgress();
    enhanceImages(content);
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
    if (id) {
        const existing = (state.data.articles || []).find(x => x.id === id);
        if (existing && existing.source === 'x') {
            showToast('Artikel X ditarik live — edit di X, bukan di sini.', 'error');
            return;
        }
        if (existing && existing.source === 'medium') {
            showToast('Artikel Medium ditarik live — edit di Medium, bukan di sini.', 'error');
            return;
        }
    }
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
    const cover = $('articleCoverImage').value.trim();
    if (!cover) { showToast('Cover image wajib diisi.', 'error'); return; }
    // Soft-validate cover URL/path loads (non-blocking if cors fails)
    try {
        await new Promise((resolve, reject) => {
            const im = new Image();
            im.onload = resolve;
            im.onerror = () => reject(new Error('Cover image tidak bisa dimuat. Cek URL/path.'));
            im.src = cover;
            setTimeout(resolve, 2500); // jangan blokir terlalu lama
        });
    } catch (e) {
        showToast(e.message || 'Cover image bermasalah.', 'error');
        return;
    }
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
    const target = (state.data.articles || []).find(x => x.id === id);
    if (target && target.source === 'x') {
        showToast('Artikel X tidak bisa dihapus dari situs. Hapus di X atau keluarkan status ID dari x-articles.json.', 'error');
        return;
    }
    if (target && target.source === 'medium') {
        showToast('Artikel Medium tidak bisa dihapus dari situs. Hapus di Medium — akan otomatis hilang dari feed saat sync berikutnya.', 'error');
        return;
    }
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
function dataForGithubSave() {
    // Jangan persist X Articles (sumber live) ke db.json
    const clone = JSON.parse(JSON.stringify(state.data || {}));
    clone.articles = (clone.articles || []).filter(a => a.source !== 'x');
    return clone;
}

async function saveToGitHub() {
    const token = localStorage.getItem('portfolio_github_token');
    if (!token) return showToast('Not logged in.', 'error');
    const saveBtns = document.querySelectorAll('.modal-content .btn-primary');
    saveBtns.forEach(b => b.disabled = true);
    const url = `https://api.github.com/repos/${CONFIG.GITHUB_USERNAME}/${CONFIG.REPO_NAME}/contents/${CONFIG.DB_FILE}`;
    let sha = null;
    try { const res = await fetch(url); if (res.ok) sha = (await res.json()).sha; } catch (e) {}
    const content = btoa(unescape(encodeURIComponent(JSON.stringify(dataForGithubSave(), null, 2))));
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
    if (!/^gh[pousr]_/.test(token) && !token.startsWith('github_pat_')) {
        showToast('Token GitHub sepertinya tidak valid (format).', 'error');
        return;
    }
    state.isAdmin = true;
    localStorage.setItem('portfolio_github_token', token);
    document.body.classList.add('admin-mode');
    document.querySelectorAll('.admin-only').forEach(el => el.classList.remove('hidden'));
    const fab = $('adminFab'); if (fab) fab.innerHTML = '<i class="fas fa-right-from-bracket"></i>';
    closeModal('loginModal');
    showToast('Mode editor aktif. Status: terhubung.', 'success');
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
function formatRelativeDate(dateStr) {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    if (isNaN(d)) return '';
    const diffMs = Date.now() - d.getTime();
    const day = 86400000;
    if (diffMs < 0) return 'segera';
    if (diffMs < day) return 'hari ini';
    if (diffMs < 2 * day) return 'kemarin';
    if (diffMs < 7 * day) return `${Math.floor(diffMs / day)} hari lalu`;
    if (diffMs < 30 * day) return `${Math.floor(diffMs / (7 * day))} minggu lalu`;
    if (diffMs < 365 * day) return `${Math.floor(diffMs / (30 * day))} bulan lalu`;
    return `${Math.floor(diffMs / (365 * day))} tahun lalu`;
}
function dateMetaHtml(dateStr) {
    const abs = formatDate(dateStr);
    const rel = formatRelativeDate(dateStr);
    if (!abs) return '';
    return `<span title="${escapeHtml(abs)}">${escapeHtml(abs)}</span>${rel ? `<span class="byline-extra">· ${escapeHtml(rel)}</span>` : ''}`;
}
/**
 * Rewrite only local / nanomind-repo asset paths to optimized media/*.webp.
 * Never touch external hosts (pbs.twimg.com, etc.) — that broke X article covers.
 */
function mediaUrl(url) {
    if (!url) return '';
    const s = String(url).trim();

    // External absolute URLs: keep as-is, except our own GitHub raw assets
    if (/^https?:\/\//i.test(s)) {
        const own = s.match(/raw\.githubusercontent\.com\/NanoMindExplorer\/nanomind\/[^/]+\/(.+)$/i)
            || s.match(/nanomindexplorer\.github\.io\/nanomind\/(.+)$/i);
        if (own) {
            const file = own[1].split('?')[0];
            const stem = file.replace(/^media\//, '').replace(/\.[^.]+$/, '');
            // only rewrite if we likely have a local optimized copy (common stems)
            if (stem && !file.includes('/')) {
                return `media/${stem}.webp`;
            }
            if (file.startsWith('media/')) {
                return file.replace(/\.(jpg|jpeg|png)$/i, '.webp');
            }
            return `media/${stem}.webp`;
        }
        return s; // pbs.twimg.com, other CDNs, etc.
    }

    // Relative local paths: media/foo.jpg or foo.jpg → media/foo.webp
    const m = s.match(/^(?:\.\/)?(?:media\/)?([a-zA-Z0-9_-]+)\.(webp|jpg|jpeg|png)$/i);
    if (m) return `media/${m[1]}.webp`;
    return s;
}

function imgTag(src, alt, extra = '') {
    const original = (src || '').trim();
    if (!original) {
        return `<img src="" alt="${escapeHtml(alt || '')}" ${extra}>`;
    }
    const s = mediaUrl(original) || original;

    // Local optimized assets → <picture> webp + jpg fallback
    if (/^media\/[a-zA-Z0-9_-]+\.webp$/i.test(s)) {
        const jpg = s.replace(/\.webp$/i, '.jpg');
        return `<picture><source srcset="${escapeHtml(s)}" type="image/webp"><img src="${escapeHtml(jpg)}" alt="${escapeHtml(alt || '')}" ${extra}></picture>`;
    }

    // External (X covers, etc.) — plain <img>, never force local path
    return `<img src="${escapeHtml(s)}" alt="${escapeHtml(alt || '')}" ${extra} referrerpolicy="no-referrer">`;
}

function setupOfflineBanner() {
    const banner = $('offlineBanner');
    if (!banner) return;
    const sync = () => banner.classList.toggle('hidden', navigator.onLine);
    window.addEventListener('online', sync);
    window.addEventListener('offline', sync);
    sync();
}

function setupXRetryButtons() {
    const retry = async () => {
        showToast('Memuat ulang X Articles…', 'info');
        try {
            sessionStorage.removeItem(xArticlesCacheKey((state.xArticlesConfig && state.xArticlesConfig.username) || CONFIG.X_ARTICLES.username));
            // Pakai bootstrap (progressive + auto-retry) biar konsisten dengan load awal
            await bootstrapXArticlesLoad();
            const n = (state.data && state.data.articles || []).filter(a => a.source === 'x').length;
            if (n) showToast(`${n} X Article dimuat.`, 'success');
            else showToast('Tidak ada X Article yang bisa ditarik.', 'error');
        } catch (e) {
            showToast('Gagal memuat X Articles.', 'error');
            state.xArticlesLoading = false;
            refreshArticleSurfaces({ x: true });
        }
    };
    const a = $('xRetryBtn'); if (a) a.addEventListener('click', retry);
    const b = $('xEmptyRetryBtn'); if (b) b.addEventListener('click', retry);
    const reset = $('dispatchEmptyReset');
    if (reset) reset.addEventListener('click', (e) => {
        e.preventDefault();
        state.dispatchFilter = 'all';
        state.dispatchPage = 1;
        if (state.data) {
            renderCategoryPills(state.data.categories, 'all');
            renderDispatchGrid();
        }
    });
}

function setupMediumRetryButtons() {
    const retry = async () => {
        showToast('Memuat ulang Medium Articles…', 'info');
        try {
            sessionStorage.removeItem(mediumArticlesCacheKey((state.mediumArticlesConfig && state.mediumArticlesConfig.username) || CONFIG.MEDIUM_ARTICLES.username));
            const medArts = await loadMediumArticles();
            if (medArts.length && state.data) {
                mergeMediumArticlesIntoState(medArts);
                renderMediumArticlesRail(state.data.articles);
                renderDispatchGrid();
                showToast(`${medArts.length} Medium Article dimuat.`, 'success');
            } else {
                showToast('Tidak ada Medium Article yang bisa ditarik.', 'error');
                renderMediumArticlesRail(state.data ? state.data.articles : []);
            }
        } catch (e) {
            showToast('Gagal memuat Medium Articles.', 'error');
        }
    };
    const a = $('mediumRetryBtn'); if (a) a.addEventListener('click', retry);
    const b = $('mediumEmptyRetryBtn'); if (b) b.addEventListener('click', retry);
}

/**
 * Klik-tahan-geser dengan mouse buat rail horizontal (X/Medium Articles).
 *
 * FIX KOMPREHENSIF (patch-7): HAPUS click handler block sepenuhnya.
 *
 * Bug sebelumnya: variable `moved` nyangkut setelah drag tanpa click.
 * Skenario:
 *   1. User drag rail 20px, mouseup di area rail KOSONG (bukan di card)
 *   2. Click event TIDAK fire (karena mouseup bukan di <a>)
 *   3. `moved` tetap 20 (tidak di-reset)
 *   4. User klik card → click handler: moved=20 > 15 → preventDefault →
 *      NAVIGASI DIBLOK! Artikel gak kebuka.
 *
 * Solusi: HAPUS click handler block. Drag-scroll tetap jalan (mouse down +
 * move + up geser rail), tapi click TIDAK PERNAH di-block. Kalau user drag
 * lalu mouseup di atas card, click fire → navigasi ke card itu (behavior
 * yang expected — user sudah lihat rail scroll, klik card untuk baca).
 *
 * Kalau user mau scroll rail tanpa navigasi, mouseup di area rail kosong
 * (bukan di atas card). Itu natural UX.
 */
/**
 * Geser rail horizontal (X/Medium Articles) pakai mouse.
 *
 * RIWAYAT: sebelumnya ini pakai custom mousedown/mousemove/mouseup buat
 * "drag-to-scroll" gaya carousel. Setelah 4 ronde percobaan fix (macam-
 * macam kombinasi preventDefault/threshold/dragstart-guard) klik kartu
 * MASIH kadang ke-block di device tertentu — dan yang paling penting,
 * user mengonfirmasi klik artikel jalan NORMAL sebelum fitur ini pernah
 * ada. Kesimpulannya: masalahnya bukan cara implementasinya, tapi
 * PENDEKATANNYA — apapun bentuk mousedown-di-atas-<a>-nya, itu ambil
 * alih start dari sequence klik natural, dan gampang rapuh lintas
 * browser/kondisi (native image-drag, focus, dst) dengan cara yang gak
 * selalu bisa diverifikasi dari simulasi headless.
 *
 * Fix definitif: HAPUS TOTAL mousedown-drag. Diganti 2 cara yang secara
 * STRUKTURAL gak mungkin nyentuh event apapun di kartu:
 *   1. Wheel: scroll mouse (vertikal, yang biasa) di atas rail otomatis
 *      diterjemahkan jadi geser horizontal.
 *   2. Tombol panah kiri/kanan — elemen terpisah, cuma manggil scrollBy().
 * Touch/trackpad/scrollbar tetap native (sudah jalan dari awal, gak
 * pernah jadi masalah — hanya mouse-drag yang diminta dan itu sekarang
 * digantikan wheel + tombol, bukan direplikasi lewat mousedown lagi).
 */
function enableRailDragScroll(rail) {
    if (!rail || rail.dataset.dragScrollBound) return;
    rail.dataset.dragScrollBound = '1';

    // Wheel vertikal di atas rail -> scroll horizontal. Event 'wheel' 100%
    // terpisah dari 'mousedown'/'click' — gak ada cara ini bisa ganggu
    // navigasi kartu.
    rail.addEventListener('wheel', (e) => {
        if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) return; // udah horizontal native (trackpad), biarkan
        if (e.deltaY === 0) return;
        e.preventDefault();
        rail.scrollLeft += e.deltaY;
    }, { passive: false });

    // Tombol panah — elemen BARU, bukan bagian dari kartu, click handler-nya
    // cuma scrollBy(). Gak ada jalan buat ini mem-block klik <a>.
    if (!rail.parentNode.classList.contains('rail-nav-wrap')) {
        const wrap = document.createElement('div');
        wrap.className = 'rail-nav-wrap';
        rail.parentNode.insertBefore(wrap, rail);
        wrap.appendChild(rail);
        [['prev', -360, 'left'], ['next', 360, 'right']].forEach(([dir, dist, icon]) => {
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = `rail-nav-btn rail-nav-${dir}`;
            btn.setAttribute('aria-label', dir === 'prev' ? 'Geser ke kiri' : 'Geser ke kanan');
            btn.innerHTML = `<i class="fas fa-chevron-${icon}" aria-hidden="true"></i>`;
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                rail.scrollBy({ left: dist, behavior: 'smooth' });
            });
            wrap.appendChild(btn);
        });
    }
}

function setupRailDragScroll() {
    enableRailDragScroll($('xArticlesRail'));
    enableRailDragScroll($('mediumArticlesRail'));
}

/**
 * Visible feedback saat user klik card → article.html.
 * Tampilkan loading overlay supaya user TAHU bahwa klik mereka terdaftar
 * dan halaman sedang dimuat. Ini penting karena navigasi antar halaman
 * di static site bisa feel "nothing happened" walau sebenarnya jalan.
 */
function setupCardClickFeedback() {
    // Event delegation — tangkap SEMUA click di document, cek apakah
    // target-nya adalah <a> card (x-card / dispatch-card / related card).
    document.addEventListener('click', (e) => {
        const link = e.target.closest('a.x-card, a.dispatch-card');
        if (!link) return;
        const href = link.getAttribute('href') || '';
        // Hanya untuk link ke article.html (bukan external)
        if (!href.startsWith('article.html')) return;
        // Tampilkan loading overlay
        showCardClickLoader();
    }, true); // capture phase — tampil SEBELUM navigasi
}

function showCardClickLoader() {
    // Hapus overlay lama kalau ada
    const existing = document.getElementById('cardClickLoader');
    if (existing) existing.remove();
    const loader = document.createElement('div');
    loader.id = 'cardClickLoader';
    loader.style.cssText = `
        position: fixed; top: 0; left: 0; right: 0; height: 3px;
        background: linear-gradient(90deg, transparent, var(--brass, #C9974A), transparent);
        background-size: 200% 100%;
        animation: cardClickLoaderSlide 1s linear infinite;
        z-index: 9999; pointer-events: none;
    `;
    document.body.appendChild(loader);
    // Auto-hapus setelah 5 detik (fallback kalau navigasi lambat)
    setTimeout(() => { if (loader.parentNode) loader.remove(); }, 5000);
}

// Inject keyframes untuk loader animation
(function injectCardClickLoaderStyle() {
    const style = document.createElement('style');
    style.textContent = `
        @keyframes cardClickLoaderSlide {
            0% { background-position: 200% 0; }
            100% { background-position: -200% 0; }
        }
    `;
    document.head.appendChild(style);
})();

function trapFocus(overlay) {
    if (!overlay) return;
    const focusable = overlay.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
    if (!focusable.length) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    const handler = (e) => {
        if (e.key !== 'Tab') return;
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    };
    overlay.addEventListener('keydown', handler);
    overlay._trapHandler = handler;
    setTimeout(() => first.focus(), 50);
}
function releaseFocusTrap(overlay) {
    if (overlay && overlay._trapHandler) {
        overlay.removeEventListener('keydown', overlay._trapHandler);
        delete overlay._trapHandler;
    }
}
function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}
function generateId() { return Date.now().toString(36) + Math.random().toString(36).substr(2); }
function openModal(id) {
    const el = $(id);
    if (!el) return;
    state.lastFocusedEl = document.activeElement;
    el.classList.add('active');
    el.setAttribute('aria-modal', 'true');
    el.setAttribute('role', 'dialog');
    trapFocus(el);
}
function closeModal(id) {
    const el = $(id);
    if (!el) return;
    releaseFocusTrap(el);
    el.classList.remove('active');
    if (state.lastFocusedEl && state.lastFocusedEl.focus) {
        try { state.lastFocusedEl.focus(); } catch (e) { /* ignore */ }
    }
}
function showToast(msg, type = 'info') {
    const t = document.createElement('div');
    t.className = `toast ${type}`;
    const icon = type === 'success' ? 'fa-check-circle' : (type === 'error' ? 'fa-exclamation-circle' : 'fa-circle-info');
    t.innerHTML = `<i class="fas ${icon}"></i><span>${escapeHtml(msg)}</span>`;
    document.body.appendChild(t);
    setTimeout(() => t.classList.add('show'), 100);
    setTimeout(() => { t.classList.remove('show'); setTimeout(() => t.remove(), 400); }, 3200);
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
