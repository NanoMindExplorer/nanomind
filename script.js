// ==========================================
// KONFIGURASI UTAMA
// ==========================================
const CONFIG = {
    GITHUB_USERNAME: 'nanomindexplorer',
    REPO_NAME: 'nanomindexplorer.github.io',
    BRANCH: 'main',
    DB_FILE: 'db.json'
};
// ==========================================

let state = { data: null, isAdmin: false, editingProjectId: null, editingLinkId: null };
const $ = (id) => document.getElementById(id);

document.addEventListener('DOMContentLoaded', () => {
    $('footerYear').textContent = new Date().getFullYear();
    setupEventListeners();
    setupCustomCursor();
    setupScrollProgress();
    checkAdminSession();
    loadData();
});

// Custom Cursor Logic
function setupCustomCursor() {
    const dot = $('cursorDot');
    const outline = $('cursorOutline');
    if (!dot || !outline) return;
    
    window.addEventListener('mousemove', (e) => {
        dot.style.top = e.clientY + 'px';
        dot.style.left = e.clientX + 'px';
        outline.style.top = e.clientY + 'px';
        outline.style.left = e.clientX + 'px';
    });
    
    document.querySelectorAll('a, button, .link-card, .glow-card, input, textarea, select').forEach(el => {
        el.addEventListener('mouseenter', () => outline.classList.add('hover'));
        el.addEventListener('mouseleave', () => outline.classList.remove('hover'));
    });
}

// Scroll Progress Logic
function setupScrollProgress() {
    window.addEventListener('scroll', () => {
        const scrollProgress = (window.scrollY / (document.documentElement.scrollHeight - window.innerHeight)) * 100;
        $('scrollProgress').style.width = scrollProgress + '%';
    });
}

// Event Listeners
function setupEventListeners() {
    document.querySelectorAll('.nav-link').forEach(link => {
        link.addEventListener('click', (e) => {
            document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
            e.target.classList.add('active');
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
    
    $('addLinkBtn').addEventListener('click', () => openLinkModal());
    $('saveLinkBtn').addEventListener('click', saveLink);
    $('cancelLinkBtn').addEventListener('click', () => closeModal('linkModal'));
    
    $('contactBtn').addEventListener('click', () => {
        const contactLink = state.data?.links?.find(l => l.icon.includes('envelope') || l.icon.includes('phone'));
        if (contactLink) window.open(contactLink.url, '_blank');
        else showToast('No contact link found.', 'error');
    });
}

// Load Data
async function loadData() {
    const rawUrl = `https://raw.githubusercontent.com/${CONFIG.GITHUB_USERNAME}/${CONFIG.REPO_NAME}/${CONFIG.BRANCH}/${CONFIG.DB_FILE}`;
    try {
        const response = await fetch(rawUrl);
        if (!response.ok) throw new Error('Failed');
        state.data = await response.json();
        renderData();
    } catch (error) {
        state.data = { profile: { name: 'Your Name', bio: 'Your Bio', avatar: 'https://via.placeholder.com/120', logoText: 'N' }, projects: [], links: [] };
        renderData();
    }
}

// Render Data
function renderData() {
    if (!state.data) return;
    const { profile, projects, links } = state.data;
    
    $('navName').textContent = profile.name || 'Portfolio';
    $('navLogo').textContent = profile.logoText || profile.name?.[0] || 'N';
    $('heroName').textContent = profile.name || 'Your Name';
    $('heroAvatar').src = profile.avatar || 'https://via.placeholder.com/120';
    $('footerName').textContent = profile.name || 'Your Name';
    
    // Typewriter Effect
    const bioText = profile.bio || 'Welcome to my digital space.';
    typeWriter($('heroBioTypewriter'), bioText);
    
    // Projects
    const projectsGrid = $('projectsGrid');
    projectsGrid.innerHTML = '';
    if (projects.length === 0) {
        projectsGrid.innerHTML = '<p class="text-gray-500 col-span-full text-center py-8">No projects yet.</p>';
    } else {
        projects.forEach(project => {
            const tags = (project.tags || []).map(tag => `<span class="text-[10px] px-2 py-1 rounded-full bg-white/5 border border-white/10 text-gray-400">${tag}</span>`).join('');
            const sizeClass = project.size || 'bento-item';
            const card = document.createElement('div');
            card.className = `${sizeClass} glow-card glass rounded-2xl reveal`;
            card.innerHTML = `
                <div class="edit-btn" onclick="openProjectModal('${project.id}')"><i class="fas fa-pen text-xs"></i></div>
                <div class="delete-btn" onclick="deleteProject('${project.id}')"><i class="fas fa-trash text-xs"></i></div>
                <div class="relative h-full p-6 flex flex-col justify-between min-h-[200px]">
                    ${project.image ? `<div class="absolute inset-0 rounded-2xl overflow-hidden opacity-30"><img src="${project.image}" alt="${project.title}" class="w-full h-full object-cover"></div>` : ''}
                    <div class="relative z-10">
                        <h3 class="font-display font-bold text-xl mb-2">${project.title}</h3>
                        <p class="text-gray-400 text-sm mb-4">${project.description}</p>
                    </div>
                    <div class="relative z-10 flex items-center justify-between">
                        <div class="flex flex-wrap gap-2">${tags}</div>
                        ${project.url ? `<a href="${project.url}" target="_blank" class="text-cyan-400 text-sm hover:gap-3 transition-all flex items-center gap-2">Visit <i class="fas fa-arrow-right text-xs"></i></a>` : ''}
                    </div>
                </div>
            `;
            projectsGrid.appendChild(card);
        });
    }
    
    // Links
    const linksList = $('linksList');
    linksList.innerHTML = '';
    if (links.length === 0) {
        linksList.innerHTML = '<p class="text-gray-500 col-span-full text-center py-8">No links yet.</p>';
    } else {
        links.forEach(link => {
            const card = document.createElement('div');
            card.className = 'link-card glow-card reveal';
            card.innerHTML = `
                <div class="edit-btn" onclick="openLinkModal('${link.id}')"><i class="fas fa-pen text-xs"></i></div>
                <div class="delete-btn" onclick="deleteLink('${link.id}')"><i class="fas fa-trash text-xs"></i></div>
                <div class="icon-box"><i class="${link.icon}"></i></div>
                <div class="flex-1 min-w-0">
                    <h4 class="font-semibold truncate">${link.title}</h4>
                    <p class="text-gray-500 text-xs truncate font-mono">${link.url}</p>
                </div>
                <i class="fas fa-arrow-right text-gray-600"></i>
            `;
            card.addEventListener('click', (e) => {
                if (e.target.closest('.edit-btn') || e.target.closest('.delete-btn')) return;
                window.open(link.url, '_blank');
            });
            linksList.appendChild(card);
        });
    }
    
    setTimeout(() => {
        document.querySelectorAll('.reveal').forEach(el => {
            if (isElementInViewport(el)) el.classList.add('visible');
        });
        setupMouseGlow();
    }, 100);
    setupScrollObserver();
}

// Typewriter
function typeWriter(el, text, i = 0) {
    if (i < text.length) {
        el.innerHTML = text.substring(0, i + 1) + '<span class="text-cyan-400 animate-pulse">|</span>';
        setTimeout(() => typeWriter(el, text, i + 1), 40);
    } else {
        el.innerHTML = text;
    }
}

// Mouse Glow Tracker
function setupMouseGlow() {
    document.querySelectorAll('.glow-card').forEach(card => {
        card.addEventListener('mousemove', (e) => {
            const rect = card.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            card.style.setProperty('--mouse-x', `${x}px`);
            card.style.setProperty('--mouse-y', `${y}px`);
        });
    });
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
    $('profileName').value = state.data.profile.name || '';
    $('profileBio').value = state.data.profile.bio || '';
    $('profileAvatar').value = state.data.profile.avatar || '';
    $('profileLogoText').value = state.data.profile.logoText || '';
    openModal('profileModal');
}
async function saveProfile() {
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
        $('projectModalTitle').textContent = 'Edit Project';
        $('projectTitle').value = p.title; $('projectDesc').value = p.description;
        $('projectImage').value = p.image || ''; $('projectUrl').value = p.url || '';
        $('projectTags').value = (p.tags || []).join(', '); $('projectSize').value = p.size || 'bento-item';
    } else {
        $('projectModalTitle').textContent = 'Add Project';
        ['projectTitle','projectDesc','projectImage','projectUrl','projectTags'].forEach(x => $(x).value = '');
        $('projectSize').value = 'bento-item';
    }
    openModal('projectModal');
}
async function saveProject() {
    const data = {
        id: state.editingProjectId || generateId(),
        title: $('projectTitle').value.trim(),
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

// CRUD Link
function openLinkModal(id = null) {
    state.editingLinkId = id;
    if (id) {
        const l = state.data.links.find(x => x.id === id);
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

// API Logic
async function saveToGitHub() {
    const token = localStorage.getItem('portfolio_github_token');
    if (!token) return showToast('Not logged in.', 'error');
    const url = `https://api.github.com/repos/${CONFIG.GITHUB_USERNAME}/${CONFIG.REPO_NAME}/contents/${CONFIG.DB_FILE}`;
    let sha = null;
    try {
        const res = await fetch(url);
        if (res.ok) sha = (await res.json()).sha;
    } catch (e) {}
    
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
        else throw new Error('Failed');
    } catch (e) {
        showToast('Error saving to GitHub.', 'error');
    }
}

// Utils
function generateId() { return Date.now().toString(36) + Math.random().toString(36).substr(2); }
function openModal(id) { $(id).classList.add('active'); }
function closeModal(id) { $(id).classList.remove('active'); }
function showToast(msg, type = 'info') {
    const t = document.createElement('div');
    t.className = `toast ${type}`;
    t.innerHTML = `<i class="fas ${type === 'success' ? 'fa-check-circle' : 'fa-exclamation-circle'}"></i><span>${msg}</span>`;
    document.body.appendChild(t);
    setTimeout(() => t.classList.add('show'), 100);
    setTimeout(() => { t.classList.remove('show'); setTimeout(() => t.remove(), 400); }, 3000);
}
function isElementInViewport(el) {
    const r = el.getBoundingClientRect();
    return r.top >= 0 && r.left >= 0 && r.bottom <= (window.innerHeight || document.documentElement.clientHeight);
}
function setupScrollObserver() {
    const obs = new IntersectionObserver((entries) => {
        entries.forEach(e => { if (e.isIntersecting) e.target.classList.add('visible'); });
    }, { threshold: 0.1 });
    document.querySelectorAll('.reveal').forEach(el => obs.observe(el));
}

window.openProjectModal = openProjectModal;
window.deleteProject = deleteProject;
window.openLinkModal = openLinkModal;
window.deleteLink = deleteLink;
