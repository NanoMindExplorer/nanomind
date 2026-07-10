// ==========================================
// KONFIGURASI UTAMA
// ==========================================
const CONFIG = {
    GITHUB_USERNAME: 'NanoMindExplorer', // Ganti username GitHub Anda
    REPO_NAME: 'nanomind', // Ganti nama repo Anda
    BRANCH: 'main',
    DB_FILE: 'db.json'
};
const PAGE_SIZE = 9; // jumlah item grid per halaman ("Load More")
const SHORT_TYPES = ['youtube-short', 'instagram', 'tiktok', 'video-short'];
const LANDSCAPE_TYPES = ['youtube', 'video'];
// ==========================================

let state = {
    data: null, isAdmin: false,
    editingProjectId: null, editingLinkId: null, editingMediaId: null,
    galleryFilter: 'all', gallerySearch: '', gridPage: 1,
    lastFocusedEl: null
};
const $ = (id) => document.getElementById(id);

document.addEventListener('DOMContentLoaded', () => {
    $('footerYear').textContent = new Date().getFullYear();
    setupEventListeners();
    setupCustomCursor();
    setupScrollProgress();
    setupMobileMenu();
    setupBackToTop();
    setupScrollSpyNav();
    checkAdminSession();
    loadData();
});

function hideLoader() {
    const l = $('pageLoader');
    if (!l) return;
    l.classList.add('hide');
    setTimeout(() => l.remove(), 600);
}

// Custom Cursor
function setupCustomCursor() {
    const dot = $('cursorDot');
    const outline = $('cursorOutline');
    if (!dot || !outline) return;
    window.addEventListener('mousemove', (e) => {
        dot.style.top = e.clientY + 'px'; dot.style.left = e.clientX + 'px';
        outline.style.top = e.clientY + 'px'; outline.style.left = e.clientX + 'px';
    });
    refreshCursorTargets();
}
// Re-bind hover listeners setiap kali ada elemen baru dirender (kartu media, project, dsb)
function refreshCursorTargets() {
    const outline = $('cursorOutline');
    if (!outline) return;
    document.querySelectorAll('a, button, .link-card, .glow-card, input, textarea, select, option, .filter-tab, [role="button"]').forEach(el => {
        if (el.dataset.cursorBound) return;
        el.dataset.cursorBound = '1';
        el.addEventListener('mouseenter', () => outline.classList.add('hover'));
        el.addEventListener('mouseleave', () => outline.classList.remove('hover'));
    });
}

// Scroll Progress
function setupScrollProgress() {
    window.addEventListener('scroll', () => {
        const scrollProgress = (window.scrollY / (document.documentElement.scrollHeight - window.innerHeight)) * 100;
        $('scrollProgress').style.width = scrollProgress + '%';
    });
}

// Mobile Nav Menu
function setupMobileMenu() {
    const btn = $('mobileMenuBtn'), panel = $('mobileNavPanel'), backdrop = $('mobileNavBackdrop');
    if (!btn || !panel || !backdrop) return;
    const openPanel = () => { panel.classList.add('open'); backdrop.classList.add('open'); btn.setAttribute('aria-expanded', 'true'); };
    const closePanel = () => { panel.classList.remove('open'); backdrop.classList.remove('open'); btn.setAttribute('aria-expanded', 'false'); };
    btn.addEventListener('click', () => panel.classList.contains('open') ? closePanel() : openPanel());
    backdrop.addEventListener('click', closePanel);
    panel.querySelectorAll('a, button').forEach(el => el.addEventListener('click', closePanel));
}

// Back to top
function setupBackToTop() {
    const btn = $('backToTopBtn');
    if (!btn) return;
    window.addEventListener('scroll', () => { btn.classList.toggle('show', window.scrollY > 500); });
    btn.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
}

// Scrollspy: highlight nav link sesuai section yang sedang dilihat
function setupScrollSpyNav() {
    const ids = ['home', 'portfolio', 'gallery', 'links'];
    const sections = ids.map(id => document.getElementById(id)).filter(Boolean);
    if (!sections.length || !('IntersectionObserver' in window)) return;
    const obs = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (!entry.isIntersecting) return;
            const id = entry.target.id;
            document.querySelectorAll('.nav-link').forEach(l => {
                l.classList.toggle('active', l.getAttribute('href') === '#' + id);
            });
        });
    }, { rootMargin: '-40% 0px -50% 0px', threshold: 0 });
    sections.forEach(s => obs.observe(s));
}

// Event Listeners
function setupEventListeners() {
    document.querySelectorAll('.nav-link').forEach(link => {
        link.addEventListener('click', (e) => {
            document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
            document.querySelectorAll(`.nav-link[href="${e.target.getAttribute('href')}"]`).forEach(l => l.classList.add('active'));
        });
    });

    $('adminFab').addEventListener('click', toggleAdminMode);
    $('loginBtn').addEventListener('click', handleLogin);
    $('cancelLoginBtn').addEventListener('click', () => closeModal('loginModal'));
    $('tokenInput').addEventListener('keypress', (e) => { if (e.key === 'Enter') handleLogin(); });

    $('editProfileBtn').addEventListener('click', openProfileModal);
    $('saveProfileBtn').addEventListener('click', saveProfile);
    $('cancelProfileBtn').addEventListener('click', () => closeModal('profileModal'));

    $('addProjectBtn').addEventListener('click', () => openProjectModal());
    $('saveProjectBtn').addEventListener('click', saveProject);
    $('cancelProjectBtn').addEventListener('click', () => closeModal('projectModal'));

    $('addMediaBtn').addEventListener('click', () => openMediaModal());
    $('saveMediaBtn').addEventListener('click', saveMedia);
    $('cancelMediaBtn').addEventListener('click', () => closeModal('mediaModal'));
    $('mediaType').addEventListener('change', (e) => updateMediaTypeHint(e.target.value));

    $('addLinkBtn').addEventListener('click', () => openLinkModal());
    $('saveLinkBtn').addEventListener('click', saveLink);
    $('cancelLinkBtn').addEventListener('click', () => closeModal('linkModal'));

    $('contactBtn').addEventListener('click', openContactLink);
    $('mobileContactBtn').addEventListener('click', openContactLink);

    // Gallery toolbar: tabs, search, load more
    document.querySelectorAll('#filterTabs .filter-tab').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('#filterTabs .filter-tab').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            state.galleryFilter = btn.dataset.filter;
            state.gridPage = 1;
            if (state.data) renderGallery(state.data.gallery);
        });
    });
    let searchDebounce;
    $('gallerySearchInput').addEventListener('input', (e) => {
        clearTimeout(searchDebounce);
        const val = e.target.value;
        searchDebounce = setTimeout(() => {
            state.gallerySearch = val;
            state.gridPage = 1;
            if (state.data) renderGallery(state.data.gallery);
        }, 250);
    });
    $('loadMoreBtn').addEventListener('click', () => {
        state.gridPage++;
        if (state.data) renderGallery(state.data.gallery);
    });

    // Lightbox close
    $('lightboxClose').addEventListener('click', closeLightbox);

    // Klik backdrop menutup modal manapun; ESC menutup modal yang aktif
    document.querySelectorAll('.modal-overlay').forEach(ov => {
        ov.addEventListener('click', (e) => {
            if (e.target !== ov) return;
            if (ov.id === 'lightboxModal') closeLightbox(); else closeModal(ov.id);
        });
    });
    document.addEventListener('keydown', (e) => {
        if (e.key !== 'Escape') return;
        const openOv = document.querySelector('.modal-overlay.active');
        if (!openOv) return;
        if (openOv.id === 'lightboxModal') closeLightbox(); else closeModal(openOv.id);
    });
}

function openContactLink() {
    const contactLink = state.data?.links?.find(l => l.icon.includes('envelope') || l.icon.includes('phone'));
    if (contactLink) window.open(contactLink.url, '_blank');
    else showToast('No contact link found.', 'error');
}

// Hint teks untuk media type
function updateMediaTypeHint(type) {
    const hints = {
        'image': 'Tip: Paste URL gambar langsung (jpg/png/webp).',
        'youtube': 'Tip: URL seperti https://www.youtube.com/watch?v=XXXX atau https://youtu.be/XXXX',
        'youtube-short': 'Tip: URL seperti https://youtube.com/shorts/XXXX atau https://youtu.be/XXXX — tampil portrait 9:16.',
        'instagram': 'Tip: URL seperti https://www.instagram.com/reel/XXXX/ — tampil portrait 9:16.',
        'tiktok': 'Tip: URL lengkap seperti https://www.tiktok.com/@user/video/1234567890123456789 (bukan link pendek vm.tiktok.com).',
        'video': 'Tip: Link langsung file .mp4 / .webm (landscape).',
        'video-short': 'Tip: Link langsung file video vertikal .mp4 / .webm (portrait/short).'
    };
    const hintEl = $('mediaTypeHint');
    if (hintEl) hintEl.textContent = hints[type] || '';
}

// Load Data
async function loadData() {
    const rawUrl = `https://raw.githubusercontent.com/${CONFIG.GITHUB_USERNAME}/${CONFIG.REPO_NAME}/${CONFIG.BRANCH}/${CONFIG.DB_FILE}`;
    try {
        const response = await fetch(rawUrl, { cache: 'no-store' });
        if (!response.ok) throw new Error('Failed');
        state.data = await response.json();
        if (!state.data.profile) state.data.profile = {};
        if (!state.data.projects) state.data.projects = [];
        if (!state.data.gallery) state.data.gallery = [];
        if (!state.data.links) state.data.links = [];
        renderData();
    } catch (error) {
        console.error("Load failed, using fallback", error);
        state.data = {
            profile: { name: 'Failed to Load', bio: 'Cek konfigurasi script.js', avatar: 'https://via.placeholder.com/120', logoText: '!' },
            projects: [], gallery: [], links: []
        };
        renderData();
        showToast('Gagal memuat data. Cek koneksi internet.', 'error');
    } finally {
        hideLoader();
    }
}

// Render Data
function renderData() {
    if (!state.data) return;
    const { profile, projects, gallery, links } = state.data;

    document.title = (profile.name ? profile.name + ' — Portfolio & Gallery' : 'Portfolio & Gallery');
    $('navName').textContent = profile.name || 'Portfolio';
    $('heroName').textContent = profile.name || 'Your Name';
    $('heroAvatar').src = profile.avatar || 'https://via.placeholder.com/120';
    $('footerName').textContent = profile.name || 'Your Name';

    const bioText = profile.bio || 'Welcome to my digital space.';
    typeWriter($('heroBioTypewriter'), bioText);

    renderStats(projects, gallery);
    renderProjects(projects);
    renderGallery(gallery);
    renderLinks(links);

    setTimeout(() => {
        document.querySelectorAll('.reveal').forEach(el => {
            if (isElementInViewport(el)) el.classList.add('visible');
        });
        setupMouseGlow();
        refreshCursorTargets();
    }, 100);
    setupScrollObserver();
}

// Stats ringkas di hero (dihitung dari data asli, bukan angka fiktif)
function renderStats(projects, gallery) {
    const wrap = $('statsRow');
    if (!wrap) return;
    const videoCount = (gallery || []).filter(m => SHORT_TYPES.includes(m.type) || LANDSCAPE_TYPES.includes(m.type)).length;
    const photoCount = (gallery || []).filter(m => m.type === 'image').length;
    const stats = [
        { num: (projects || []).length, label: 'Projects' },
        { num: videoCount, label: 'Videos' },
        { num: photoCount, label: 'Photos' }
    ].filter(s => s.num > 0);
    wrap.innerHTML = stats.map(s => `<div class="stat-chip"><span class="num">${s.num}</span><span class="label">${s.label}</span></div>`).join('');
}

// Render Projects
function renderProjects(projects) {
    const projectsGrid = $('projectsGrid');
    projectsGrid.innerHTML = '';
    if (!projects || projects.length === 0) {
        projectsGrid.innerHTML = '<p class="text-gray-500 col-span-full text-center py-8">No projects yet.</p>';
        return;
    }
    projects.forEach(project => {
        const tags = (project.tags || []).map(tag => `<span class="text-[10px] px-2 py-1 rounded-full bg-white/5 border border-white/10 text-gray-400">${escapeHtml(tag)}</span>`).join('');
        const sizeClass = project.size || 'bento-item';
        const card = document.createElement('div');
        card.className = `${sizeClass} glow-card glass rounded-2xl reveal`;
        card.innerHTML = `
            <div class="edit-btn" onclick="openProjectModal('${project.id}')"><i class="fas fa-pen text-xs"></i></div>
            <div class="delete-btn" onclick="deleteProject('${project.id}')"><i class="fas fa-trash text-xs"></i></div>
            <div class="relative h-full p-6 flex flex-col justify-between min-h-[200px]">
                ${project.image ? `<div class="absolute inset-0 rounded-2xl overflow-hidden opacity-30"><img src="${project.image}" alt="${escapeHtml(project.title || '')}" class="w-full h-full object-cover"></div>` : ''}
                <div class="relative z-10">
                    <h3 class="font-display font-bold text-xl mb-2">${escapeHtml(project.title || '')}</h3>
                    <p class="text-gray-400 text-sm mb-4">${escapeHtml(project.description || '')}</p>
                </div>
                <div class="relative z-10 flex items-center justify-between">
                    <div class="flex flex-wrap gap-2">${tags}</div>
                    ${project.url && project.url !== 'Private Only' ? `<a href="${project.url}" target="_blank" class="text-cyan-400 text-sm hover:gap-3 transition-all flex items-center gap-2">Visit <i class="fas fa-arrow-right text-xs"></i></a>` : project.url === 'Private Only' ? `<span class="text-gray-600 text-xs flex items-center gap-1"><i class="fas fa-lock"></i> Private</span>` : ''}
                </div>
            </div>`;
        projectsGrid.appendChild(card);
    });
}

// ===== Render Gallery (Shorts shelf + Landscape/Photos grid) dengan filter, search, pagination =====
function renderGallery(gallery) {
    const all = gallery || [];
    const q = state.gallerySearch.trim().toLowerCase();

    const matchesQuery = (m) => {
        if (!q) return true;
        const hay = [m.caption || '', ...(m.tags || [])].join(' ').toLowerCase();
        return hay.includes(q);
    };
    const filtered = all.filter(matchesQuery);

    const shorts = filtered.filter(m => SHORT_TYPES.includes(m.type));
    const landscapeAndPhotos = filtered.filter(m => !SHORT_TYPES.includes(m.type));

    const filter = state.galleryFilter;
    const showShelf = (filter === 'all' || filter === 'shorts') && shorts.length > 0;
    let gridSource;
    if (filter === 'all') gridSource = landscapeAndPhotos;
    else if (filter === 'shorts') gridSource = [];
    else if (filter === 'landscape') gridSource = filtered.filter(m => LANDSCAPE_TYPES.includes(m.type));
    else gridSource = filtered.filter(m => m.type === 'image'); // photos

    const shortsShelfWrap = $('shortsShelfWrap');
    const shortsShelfGrid = $('shortsShelfGrid');
    const mediaGrid = $('mediaGrid');

    shortsShelfWrap.classList.toggle('hidden', !showShelf);
    shortsShelfGrid.innerHTML = '';
    if (showShelf) shorts.forEach(m => shortsShelfGrid.appendChild(buildMediaCard(m, 'portrait')));

    const pageCount = state.gridPage * PAGE_SIZE;
    const visibleGrid = gridSource.slice(0, pageCount);
    mediaGrid.innerHTML = '';
    visibleGrid.forEach(m => mediaGrid.appendChild(buildMediaCard(m, 'landscape')));
    $('loadMoreBtn').classList.toggle('hidden', pageCount >= gridSource.length);

    let categoryTotal;
    if (filter === 'all') categoryTotal = shorts.length + landscapeAndPhotos.length;
    else if (filter === 'shorts') categoryTotal = shorts.length;
    else categoryTotal = gridSource.length;
    const shown = (showShelf ? shorts.length : 0) + visibleGrid.length;

    const countLabel = $('galleryCountLabel');
    countLabel.textContent = all.length ? `Menampilkan ${shown} dari ${categoryTotal} item` : '';

    const nothing = !showShelf && visibleGrid.length === 0;
    const emptyEl = $('galleryEmptyState');
    emptyEl.classList.toggle('hidden', !nothing);
    if (nothing) {
        emptyEl.textContent = all.length === 0
            ? 'Belum ada media. Tambahkan foto atau video!'
            : (q ? `Tidak ada hasil untuk "${state.gallerySearch}".` : 'Belum ada media di kategori ini.');
    }
}

function buildMediaCard(media, orientation) {
    const isPortrait = orientation === 'portrait';
    const wrap = document.createElement('div');
    wrap.className = isPortrait
        ? 'media-card media-card--portrait glow-card glass reveal'
        : `masonry-item glow-card glass rounded-2xl reveal relative media-card media-card--landscape type-${media.type}`;
    wrap.dataset.id = media.id;

    const isImage = media.type === 'image';
    wrap.innerHTML = `
        <div class="edit-btn" onclick="event.stopPropagation(); openMediaModal('${media.id}')"><i class="fas fa-pen text-xs"></i></div>
        <div class="delete-btn" onclick="event.stopPropagation(); deleteMedia('${media.id}')"><i class="fas fa-trash text-xs"></i></div>
        <div class="media-thumb-wrap" role="button" tabindex="0" aria-label="Buka media" onclick="openLightbox('${media.id}')" onkeydown="if(event.key==='Enter'){openLightbox('${media.id}')}">
            ${typeChip(media.type)}
            ${buildThumbInner(media)}
            ${!isImage ? `<div class="play-badge"><i class="fas fa-play"></i></div>` : ''}
            ${media.caption ? `<div class="media-caption-overlay">${escapeHtml(media.caption)}</div>` : ''}
        </div>`;
    return wrap;
}

function typeChip(type) {
    const map = {
        'youtube': ['yt', 'fab fa-youtube', 'VIDEO'],
        'youtube-short': ['yt', 'fab fa-youtube', 'SHORTS'],
        'instagram': ['ig', 'fab fa-instagram', 'REEL'],
        'tiktok': ['tt', 'fab fa-tiktok', 'TIKTOK'],
        'video': ['vid', 'fas fa-film', 'VIDEO'],
        'video-short': ['vid', 'fas fa-film', 'SHORT'],
        'image': ['img', 'fas fa-image', 'PHOTO']
    };
    const [cls, icon, label] = map[type] || ['img', 'fas fa-file', 'MEDIA'];
    return `<span class="type-chip ${cls}"><i class="${icon}"></i> ${label}</span>`;
}

function buildThumbInner(media) {
    const placeholder = (icon, label) => `<div class="thumb-placeholder"><i class="${icon}"></i><span>${label}</span></div>`;

    if (media.type === 'image') {
        return `<img src="${media.url}" alt="${escapeHtml(media.caption || 'Media')}" loading="lazy" onerror="this.style.display='none'">${placeholder('fas fa-image', 'Photo')}`;
    }
    if (media.type === 'youtube' || media.type === 'youtube-short') {
        const id = extractYouTubeId(media.url);
        if (id) return `<img src="https://img.youtube.com/vi/${id}/hqdefault.jpg" alt="Video thumbnail" loading="lazy" onerror="this.style.display='none'">${placeholder('fab fa-youtube', 'YouTube')}`;
        return placeholder('fas fa-exclamation-triangle', 'URL tidak valid');
    }
    if (media.thumbnail) {
        const iconMap = { instagram: 'fab fa-instagram', tiktok: 'fab fa-tiktok', video: 'fas fa-film', 'video-short': 'fas fa-film' };
        return `<img src="${media.thumbnail}" alt="Thumbnail" loading="lazy" onerror="this.style.display='none'">${placeholder(iconMap[media.type] || 'fas fa-photo-video', media.type)}`;
    }
    const fallbackMap = {
        instagram: ['fab fa-instagram', 'Instagram Reel'],
        tiktok: ['fab fa-tiktok', 'TikTok'],
        video: ['fas fa-film', 'Video'],
        'video-short': ['fas fa-film', 'Short Video']
    };
    const [icon, label] = fallbackMap[media.type] || ['fas fa-photo-video', 'Media'];
    return placeholder(icon, label);
}

// Render Links
function renderLinks(links) {
    const linksList = $('linksList');
    linksList.innerHTML = '';
    if (!links || links.length === 0) {
        linksList.innerHTML = '<p class="text-gray-500 col-span-full text-center py-8">No links yet.</p>';
        return;
    }
    links.forEach(link => {
        const card = document.createElement('div');
        card.className = 'link-card glow-card reveal';
        card.setAttribute('tabindex', '0');
        card.innerHTML = `
            <div class="edit-btn" onclick="openLinkModal('${link.id}')"><i class="fas fa-pen text-xs"></i></div>
            <div class="delete-btn" onclick="deleteLink('${link.id}')"><i class="fas fa-trash text-xs"></i></div>
            <div class="icon-box"><i class="${link.icon}"></i></div>
            <div class="flex-1 min-w-0">
                <h4 class="font-semibold truncate">${escapeHtml(link.title)}</h4>
                <p class="text-gray-500 text-xs truncate font-mono">${escapeHtml(link.url)}</p>
            </div>
            <i class="fas fa-arrow-right text-gray-600"></i>`;
        const go = () => window.open(link.url, '_blank');
        card.addEventListener('click', (e) => {
            if (e.target.closest('.edit-btn') || e.target.closest('.delete-btn')) return;
            go();
        });
        card.addEventListener('keydown', (e) => { if (e.key === 'Enter') go(); });
        linksList.appendChild(card);
    });
}

// ===== Lightbox =====
function openLightbox(id) {
    const m = state.data.gallery.find(x => x.id === id);
    if (!m) return;
    const frame = $('lightboxFrameWrap');
    const cap = $('lightboxCaption');
    frame.className = 'lightbox-frame-wrap';
    let inner = '';

    if (m.type === 'image') {
        frame.classList.add('auto');
        inner = `<img src="${m.url}" alt="${escapeHtml(m.caption || 'Media')}">`;
    } else if (m.type === 'youtube' || m.type === 'youtube-short') {
        frame.classList.add(m.type === 'youtube-short' ? 'portrait' : 'landscape');
        const id2 = extractYouTubeId(m.url);
        inner = id2
            ? `<iframe src="https://www.youtube.com/embed/${id2}?autoplay=1&rel=0&modestbranding=1" allow="autoplay; encrypted-media; picture-in-picture; web-share" allowfullscreen></iframe>`
            : `<div class="p-6 text-center text-sm text-gray-400">URL tidak valid</div>`;
    } else if (m.type === 'instagram') {
        frame.classList.add('portrait');
        const id2 = extractInstagramId(m.url);
        inner = id2
            ? `<iframe src="https://www.instagram.com/reel/${id2}/embed/" allow="autoplay; encrypted-media" allowfullscreen scrolling="no"></iframe>`
            : `<div class="p-6 text-center text-sm text-gray-400">URL tidak valid</div>`;
    } else if (m.type === 'tiktok') {
        frame.classList.add('portrait');
        const id2 = extractTikTokId(m.url);
        inner = id2
            ? `<iframe src="https://www.tiktok.com/embed/v2/${id2}" allow="autoplay; encrypted-media" allowfullscreen scrolling="no"></iframe>`
            : `<div class="p-6 text-center text-sm text-gray-400">URL tidak valid</div>`;
    } else if (m.type === 'video') {
        frame.classList.add('landscape');
        inner = `<video src="${m.url}" ${m.thumbnail ? `poster="${m.thumbnail}"` : ''} controls autoplay playsinline>Your browser does not support the video tag.</video>`;
    } else if (m.type === 'video-short') {
        frame.classList.add('portrait');
        inner = `<video src="${m.url}" ${m.thumbnail ? `poster="${m.thumbnail}"` : ''} controls autoplay playsinline>Your browser does not support the video tag.</video>`;
    }

    frame.innerHTML = inner;
    cap.textContent = m.caption || '';
    cap.classList.toggle('hidden', !m.caption);
    state.lastFocusedEl = document.activeElement;
    openModal('lightboxModal');
    $('lightboxClose').focus();
}
function closeLightbox() {
    $('lightboxFrameWrap').innerHTML = ''; // hentikan playback
    closeModal('lightboxModal');
    if (state.lastFocusedEl && state.lastFocusedEl.focus) state.lastFocusedEl.focus();
}

// Extract YouTube ID — mendukung /shorts/, /watch?v=, youtu.be, /embed/, /v/
function extractYouTubeId(url) {
    if (!url) return null;
    const regex = /(?:youtube\.com\/(?:[^\/\n\s]+\/\S+\/|(?:v|e(?:mbed)?|shorts|live)\/|\S*?[?&]v=)|youtu\.be\/)([a-zA-Z0-9_-]{11})/;
    const match = String(url).match(regex);
    return match ? match[1] : null;
}
// Extract Instagram Reel/Post ID — mendukung /reel/, /reels/, /p/, /tv/
function extractInstagramId(url) {
    if (!url) return null;
    const regex = /instagram\.com\/(?:reel|reels|p|tv|stories)\/([A-Za-z0-9_-]+)/;
    const match = String(url).match(regex);
    return match ? match[1] : null;
}
// Extract TikTok video ID dari URL lengkap (bukan link pendek vm.tiktok.com)
function extractTikTokId(url) {
    if (!url) return null;
    const regex = /tiktok\.com\/(?:@[\w.-]+\/video|embed(?:\/v2)?)\/(\d+)/;
    const match = String(url).match(regex);
    return match ? match[1] : null;
}

// Escape HTML untuk caption/teks (cegah XSS sederhana)
function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Typewriter
function typeWriter(el, text, i = 0) {
    if (!el) return;
    if (i === 0) el.innerHTML = '';
    if (i < text.length) {
        el.innerHTML = escapeHtml(text.substring(0, i + 1)) + '<span class="text-cyan-400 animate-pulse">|</span>';
        setTimeout(() => typeWriter(el, text, i + 1), 40);
    } else {
        el.innerHTML = escapeHtml(text);
    }
}

// Mouse Glow
function setupMouseGlow() {
    document.querySelectorAll('.glow-card').forEach(card => {
        if (card.dataset.glowBound) return;
        card.dataset.glowBound = '1';
        card.addEventListener('mousemove', (e) => {
            const rect = card.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            card.style.setProperty('--mouse-x', `${x}px`);
            card.style.setProperty('--mouse-y', `${y}px`);
        });
    });
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
    document.querySelectorAll('.reveal').forEach(el => obs.observe(el));
}

// Admin Auth
function checkAdminSession() {
    const token = localStorage.getItem('portfolio_github_token');
    if (token) {
        state.isAdmin = true;
        document.body.classList.add('admin-mode');
        document.querySelectorAll('.admin-only').forEach(btn => btn.classList.remove('hidden'));
        $('adminFab').innerHTML = '<i class="fas fa-sign-out-alt"></i>';
    }
}
function toggleAdminMode() {
    if (state.isAdmin) {
        localStorage.removeItem('portfolio_github_token');
        state.isAdmin = false;
        document.body.classList.remove('admin-mode');
        document.querySelectorAll('.admin-only').forEach(btn => btn.classList.add('hidden'));
        $('adminFab').innerHTML = '<i class="fas fa-cog"></i>';
    } else {
        openModal('loginModal');
    }
}
function handleLogin() {
    const token = $('tokenInput').value.trim();
    if (token) {
        state.isAdmin = true;
        localStorage.setItem('portfolio_github_token', token);
        document.body.classList.add('admin-mode');
        document.querySelectorAll('.admin-only').forEach(btn => btn.classList.remove('hidden'));
        $('adminFab').innerHTML = '<i class="fas fa-sign-out-alt"></i>';
        closeModal('loginModal');
        showToast('Welcome back, Admin!', 'success');
    } else {
        showToast('Token cannot be empty.', 'error');
    }
}

// CRUD Profile
function openProfileModal() {
    if (!state.data || !state.data.profile) {
        showToast('Data belum ter-load!', 'error');
        return;
    }
    const p = state.data.profile;
    $('profileName').value = p.name || '';
    $('profileBio').value = p.bio || '';
    $('profileAvatar').value = p.avatar || '';
    $('profileLogoText').value = p.logoText || '';
    openModal('profileModal');
}
async function saveProfile() {
    if (!state.data.profile) state.data.profile = {};
    state.data.profile = {
        name: $('profileName').value.trim(),
        bio: $('profileBio').value.trim(),
        avatar: $('profileAvatar').value.trim(),
        logoText: $('profileLogoText').value.trim()
    };
    await saveToGitHub();
    closeModal('profileModal');
    renderData();
}

// CRUD Project
function openProjectModal(id = null) {
    state.editingProjectId = id;
    if (id) {
        const p = state.data.projects.find(x => x.id === id);
        if (!p) return;
        $('projectModalTitle').textContent = 'Edit Project';
        $('projectTitle').value = p.title || ''; $('projectDesc').value = p.description || '';
        $('projectImage').value = p.image || ''; $('projectUrl').value = p.url || '';
        $('projectTags').value = (p.tags || []).join(', '); $('projectSize').value = p.size || 'bento-item';
    } else {
        $('projectModalTitle').textContent = 'Add Project';
        ['projectTitle', 'projectDesc', 'projectImage', 'projectUrl', 'projectTags'].forEach(x => $(x).value = '');
        $('projectSize').value = 'bento-item';
    }
    openModal('projectModal');
}
async function saveProject() {
    const title = $('projectTitle').value.trim();
    if (!title) { showToast('Title wajib diisi.', 'error'); return; }
    const data = {
        id: state.editingProjectId || generateId(),
        title,
        description: $('projectDesc').value.trim(),
        image: $('projectImage').value.trim(),
        url: $('projectUrl').value.trim(),
        tags: $('projectTags').value.split(',').map(t => t.trim()).filter(t => t),
        size: $('projectSize').value
    };
    if (state.editingProjectId) {
        const i = state.data.projects.findIndex(x => x.id === state.editingProjectId);
        state.data.projects[i] = data;
    } else {
        state.data.projects.push(data);
    }
    await saveToGitHub();
    closeModal('projectModal');
    renderData();
}
async function deleteProject(id) {
    if (!confirm('Delete this project?')) return;
    state.data.projects = state.data.projects.filter(x => x.id !== id);
    await saveToGitHub();
    renderData();
}

// CRUD Media — mendukung youtube-short, instagram, tiktok, video, video-short
function openMediaModal(id = null) {
    state.editingMediaId = id;
    if (id) {
        const m = state.data.gallery.find(x => x.id === id);
        if (!m) return;
        $('mediaModalTitle').textContent = 'Edit Media';
        $('mediaType').value = m.type || 'image';
        $('mediaUrl').value = m.url || '';
        $('mediaThumbnail').value = m.thumbnail || '';
        $('mediaTags').value = (m.tags || []).join(', ');
        $('mediaCaption').value = m.caption || '';
    } else {
        $('mediaModalTitle').textContent = 'Add Media';
        $('mediaType').value = 'image';
        $('mediaUrl').value = ''; $('mediaThumbnail').value = ''; $('mediaTags').value = ''; $('mediaCaption').value = '';
    }
    updateMediaTypeHint($('mediaType').value);
    openModal('mediaModal');
}
async function saveMedia() {
    const type = $('mediaType').value;
    const url = $('mediaUrl').value.trim();

    if (!url) { showToast('Media URL wajib diisi.', 'error'); return; }
    if ((type === 'youtube' || type === 'youtube-short') && !extractYouTubeId(url)) {
        showToast('URL YouTube tidak valid.', 'error'); return;
    }
    if (type === 'instagram' && !extractInstagramId(url)) {
        showToast('URL Instagram Reels tidak valid. Contoh: https://www.instagram.com/reel/XXXX/', 'error'); return;
    }
    if (type === 'tiktok' && !extractTikTokId(url)) {
        showToast('URL TikTok tidak valid. Gunakan link lengkap /@user/video/ID.', 'error'); return;
    }

    const data = {
        id: state.editingMediaId || generateId(),
        type,
        url,
        thumbnail: $('mediaThumbnail').value.trim(),
        tags: $('mediaTags').value.split(',').map(t => t.trim()).filter(Boolean),
        caption: $('mediaCaption').value.trim()
    };
    if (state.editingMediaId) {
        const i = state.data.gallery.findIndex(x => x.id === state.editingMediaId);
        state.data.gallery[i] = data;
    } else {
        state.data.gallery.push(data);
    }
    await saveToGitHub();
    closeModal('mediaModal');
    renderData();
}
async function deleteMedia(id) {
    if (!confirm('Delete this media?')) return;
    state.data.gallery = state.data.gallery.filter(x => x.id !== id);
    await saveToGitHub();
    renderData();
}

// CRUD Link
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
    } else {
        state.data.links.push(data);
    }
    await saveToGitHub();
    closeModal('linkModal');
    renderData();
}
async function deleteLink(id) {
    if (!confirm('Delete this link?')) return;
    state.data.links = state.data.links.filter(x => x.id !== id);
    await saveToGitHub();
    renderData();
}

// API Save to GitHub
async function saveToGitHub() {
    const token = localStorage.getItem('portfolio_github_token');
    if (!token) return showToast('Not logged in.', 'error');
    const saveBtns = document.querySelectorAll('.modal-content .btn-primary');
    saveBtns.forEach(b => b.disabled = true);
    const url = `https://api.github.com/repos/${CONFIG.GITHUB_USERNAME}/${CONFIG.REPO_NAME}/contents/${CONFIG.DB_FILE}`;
    let sha = null;
    try {
        const res = await fetch(url);
        if (res.ok) sha = (await res.json()).sha;
    } catch (e) { /* ignore, akan dicoba tanpa sha */ }

    const content = btoa(unescape(encodeURIComponent(JSON.stringify(state.data, null, 2))));
    const payload = { message: `Update ${new Date().toISOString()}`, content, branch: CONFIG.BRANCH };
    if (sha) payload.sha = sha;

    try {
        const res = await fetch(url, {
            method: 'PUT',
            headers: { 'Authorization': `Bearer ${token}`, 'Accept': 'application/vnd.github+json', 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        if (res.ok) showToast('Saved successfully!', 'success');
        else {
            const err = await res.json();
            throw new Error(err.message);
        }
    } catch (e) {
        showToast('Error saving: ' + e.message, 'error');
    } finally {
        saveBtns.forEach(b => b.disabled = false);
    }
}

// Utils
function generateId() { return Date.now().toString(36) + Math.random().toString(36).substr(2); }
function openModal(id) { $(id).classList.add('active'); }
function closeModal(id) { $(id).classList.remove('active'); }
function showToast(msg, type = 'info') {
    const t = document.createElement('div');
    t.className = `toast ${type}`;
    t.innerHTML = `<i class="fas ${type === 'success' ? 'fa-check-circle' : 'fa-exclamation-circle'}"></i><span>${escapeHtml(msg)}</span>`;
    document.body.appendChild(t);
    setTimeout(() => t.classList.add('show'), 100);
    setTimeout(() => { t.classList.remove('show'); setTimeout(() => t.remove(), 400); }, 3000);
}

window.openProjectModal = openProjectModal;
window.deleteProject = deleteProject;
window.openMediaModal = openMediaModal;
window.deleteMedia = deleteMedia;
window.openLinkModal = openLinkModal;
window.deleteLink = deleteLink;
window.openLightbox = openLightbox;
