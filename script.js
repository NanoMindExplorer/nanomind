// ==========================================
// KONFIGURASI UTAMA - SILAHKAN EDIT BAGIAN INI
// ==========================================
const CONFIG = {
    GITHUB_USERNAME: 'nanomindexplorer', // Ganti dengan username GitHub Anda
    REPO_NAME: 'nanomindexplorer.github.io', // Ganti dengan nama repository Anda
    BRANCH: 'main',
    DB_FILE: 'db.json'
    // Token tidak lagi ditaruh di sini demi keamanan
};
// ==========================================

// State Management
let state = {
    data: null,
    isAdmin: false,
    editingProjectId: null,
    editingLinkId: null
};

// DOM Elements
const $ = (id) => document.getElementById(id);

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    $('footerYear').textContent = new Date().getFullYear();
    setupEventListeners();
    checkAdminSession();
    loadData();
});

// Event Listeners Setup
function setupEventListeners() {
    // Navigation
    document.querySelectorAll('.nav-link').forEach(link => {
        link.addEventListener('click', (e) => {
            document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
            e.target.classList.add('active');
        });
    });
    
    // Admin FAB
    $('adminFab').addEventListener('click', toggleAdminMode);
    
    // Login
    $('loginBtn').addEventListener('click', handleLogin);
    $('cancelLoginBtn').addEventListener('click', () => closeModal('loginModal'));
    $('tokenInput').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') handleLogin();
    });
    
    // Project Form
    $('addProjectBtn').addEventListener('click', () => openProjectModal());
    $('saveProjectBtn').addEventListener('click', saveProject);
    $('cancelProjectBtn').addEventListener('click', () => closeModal('projectModal'));
    
    // Link Form (Typo 'website' diperbaiki menjadi 'click')
    $('addLinkBtn').addEventListener('click', () => openLinkModal());
    $('saveLinkBtn').addEventListener('click', saveLink);
    $('cancelLinkBtn').addEventListener('click', () => closeModal('linkModal'));
    
    // Contact button (Typo 'tombol:' diperbaiki menjadi 'else {')
    $('contactBtn').addEventListener('click', () => {
        const contactLink = state.data?.links?.find(l => l.icon.includes('envelope') || l.icon.includes('phone'));
        if (contactLink) {
            window.open(contactLink.url, '_blank');
        } else {
            showToast('No contact link found. Please add one in admin mode.', 'error');
        }
    });
}

// Load Data from GitHub
async function loadData() {
    const rawUrl = `https://raw.githubusercontent.com/${CONFIG.GITHUB_USERNAME}/${CONFIG.REPO_NAME}/${CONFIG.BRANCH}/${CONFIG.DB_FILE}`;
    
    try {
        const response = await fetch(rawUrl);
        if (!response.ok) throw new Error('Failed to load data');
        
        state.data = await response.json();
        renderData();
    } catch (error) {
        console.error('Error loading data:', error);
        showToast('Gagal memuat data. Pastikan konfigurasi GitHub benar.', 'error');
        
        // Fallback: Tampilkan data default kosong jika gagal load
        state.data = {
            profile: { name: 'Your Name', bio: 'Your Bio', avatar: 'https://via.placeholder.com/120', logoText: 'N' },
            projects: [],
            links: []
        };
        renderData();
    }
}

// Render Data to UI
function renderData() {
    if (!state.data) return;
    
    const { profile, projects, links } = state.data;
    
    // Profile
    $('navName').textContent = profile.name || 'My Portfolio';
    $('navLogo').textContent = profile.logoText || profile.name?.[0] || 'N';
    $('heroName').textContent = profile.name || 'Your Name';
    $('heroBio').textContent = profile.bio || 'Your Bio';
    $('heroAvatar').src = profile.avatar || 'https://via.placeholder.com/120';
    $('footerName').textContent = profile.name || 'Your Name';
    
    // Projects
    const projectsGrid = $('projectsGrid');
    projectsGrid.innerHTML = '';
    
    if (projects.length === 0) {
        projectsGrid.innerHTML = '<p class="text-gray-500 col-span-full text-center py-8">No projects yet. Login as admin to add.</p>';
    } else {
        projects.forEach(project => {
            const tags = (project.tags || []).map(tag => 
                `<span class="text-xs px-2 py-1 rounded-md bg-white/5 text-gray-300">${tag}</span>`
            ).join('');
            
            const card = document.createElement('div');
            card.className = 'project-card glass reveal';
            card.innerHTML = `
                <div class="card-bg"></div>
                <div class="relative p-6">
                    <div class="edit-btn" onclick="openProjectModal('${project.id}')"><i class="fas fa-pen"></i></div>
                    <div class="delete-btn" onclick="deleteProject('${project.id}')"><i class="fas fa-trash"></i></div>
                    <div class="aspect-video rounded-lg overflow-hidden mb-4 bg-white/5">
                        <img src="${project.image || 'https://via.placeholder.com/400x225'}" alt="${project.title}" class="w-full h-full object-cover">
                    </div>
                    <h3 class="font-display font-bold text-xl mb-2">${project.title}</h3>
                    <p class="text-gray-400 text-sm mb-4">${project.description}</p>
                    <div class="flex flex-wrap gap-2 mb-4">${tags}</div>
                    ${project.url ? `<a href="${project.url}" target="_blank" class="text-indigo-400 text-sm font-medium flex items-center gap-1 hover:gap-2 transition-all">View Project <i class="fas fa-arrow-right text-xs"></i></a>` : ''}
                </div>
            `;
            projectsGrid.appendChild(card);
        });
    }
    
    // Links
    const linksList = $('linksList');
    linksList.innerHTML = '';
    
    // Typo 'tombol:' diperbaiki menjadi 'else {'
    if (links.length === 0) {
        linksList.innerHTML = '<p class="text-gray-500 col-span-full text-center py-8">No links yet. Login as admin to add.</p>';
    } else {
        links.forEach(link => {
            const card = document.createElement('div');
            card.className = 'link-card reveal';
            card.innerHTML = `
                <div class="edit-btn" onclick="openLinkModal('${link.id}')"><i class="fas fa-pen"></i></div>
                <div class="delete-btn" onclick="deleteLink('${link.id}')"><i class="fas fa-trash"></i></div>
                <div class="icon-box"><i class="${link.icon}"></i></div>
                <div class="flex-1 min-w-0">
                    <h4 class="font-semibold truncate">${link.title}</h4>
                    <p class="text-gray-500 text-xs truncate">${link.url}</p>
                </div>
                <i class="fas fa-arrow-right text-gray-500"></i>
            `;
            card.addEventListener('click', (e) => {
                if (e.target.closest('.edit-btn') || e.target.closest('.delete-btn')) return;
                window.open(link.url, '_blank');
            });
            linksList.appendChild(card);
        });
    }
    
    // Trigger reveal animations
    setTimeout(() => {
        document.querySelectorAll('.reveal').forEach(el => {
            if (isElementInViewport(el)) {
                el.classList.add('visible');
            }
        });
    }, 100);
    
    // Scroll observer for reveal animations
    setupScrollObserver();
}

// Admin Functions (Sistem Keamanan Baru)
function checkAdminSession() {
    const adminToken = localStorage.getItem('portfolio_github_token');
    if (adminToken) {
        state.isAdmin = true;
        document.body.classList.add('admin-mode');
        document.querySelectorAll('.admin-only').forEach(btn => btn.classList.remove('hidden'));
        $('adminFab').innerHTML = '<i class="fas fa-sign-out-alt"></i>';
    }
}

function toggleAdminMode() {
    if (state.isAdmin) {
        // Logout
        localStorage.removeItem('portfolio_github_token');
        state.isAdmin = false;
        document.body.classList.remove('admin-mode');
        document.querySelectorAll('.admin-only').forEach(btn => btn.classList.add('hidden'));
        $('adminFab').innerHTML = '<i class="fas fa-cog"></i>';
        showToast('Logged out from admin mode', 'success');
    } else {
        // Show login modal
        openModal('loginModal');
    }
}

function handleLogin() {
    const token = $('tokenInput').value.trim();
    if (token) {
        state.isAdmin = true;
        // Simpan token di localStorage browser
        localStorage.setItem('portfolio_github_token', token);
        document.body.classList.add('admin-mode');
        document.querySelectorAll('.admin-only').forEach(btn => btn.classList.remove('hidden'));
        $('adminFab').innerHTML = '<i class="fas fa-sign-out-alt"></i>';
        closeModal('loginModal');
        showToast('Login berhasil! Mode admin aktif.', 'success');
    } else {
        showToast('Token tidak boleh kosong.', 'error');
    }
}

// Project CRUD
function openProjectModal(projectId = null) {
    state.editingProjectId = projectId;
    
    if (projectId) {
        const project = state.data.projects.find(p => p.id === projectId);
        if (!project) return;
        
        $('projectModalTitle').textContent = 'Edit Project';
        $('projectTitle').value = project.title || '';
        $('projectDesc').value = project.description || '';
        $('projectImage').value = project.image || ''; // Typo fixed
        $('projectUrl').value = project.url || '';
        $('projectTags').value = (project.tags || []).join(', ');
    } else {
        $('projectModalTitle').textContent = 'Add Project';
        $('projectTitle').value = '';
        $('projectDesc').value = '';
        $('projectImage').value = '';
        $('projectUrl').value = '';
        $('projectTags').value = '';
    }
    
    openModal('projectModal');
}

async function saveProject() {
    if (!state.isAdmin) return showToast('You need to be admin to do this.', 'error');
    
    const title = $('projectTitle').value.trim();
    if (!title) return showToast('Title is required', 'error');
    
    const projectData = {
        id: state.editingProjectId || generateId(),
        title: title,
        description: $('projectDesc').value.trim(),
        image: $('projectImage').value.trim(),
        url: $('projectUrl').value.trim(),
        tags: $('projectTags').value.split(',').map(t => t.trim()).filter(t => t)
    };
    
    if (state.editingProjectId) {
        const index = state.data.projects.findIndex(p => p.id === state.editingProjectId);
        if (index !== -1) state.data.projects[index] = projectData;
    } else {
        state.data.projects.push(projectData);
    }
    
    await saveToGitHub();
    closeModal('projectModal');
    renderData();
}

async function deleteProject(id) {
    if (!state.isAdmin) return;
    
    if (!confirm('Are you sure you want to delete this project?')) return;
    
    state.data.projects = state.data.projects.filter(p => p.id !== id);
    await saveToGitHub();
    renderData();
}

// Link CRUD
function openLinkModal(linkId = null) {
    state.editingLinkId = linkId;
    
    if (linkId) {
        const link = state.data.links.find(l => l.id === linkId);
        if (!link) return;
        
        $('linkModalTitle').textContent = 'Edit Link';
        $('linkTitle').value = link.title || '';
        $('linkUrl').value = link.url || '';
        $('linkIcon').value = link.icon || '';
    } else {
        $('linkModalTitle').textContent = 'Add Link';
        $('linkTitle').value = '';
        $('linkUrl').value = ''; // Typo 'linkTab' fixed
        $('linkIcon').value = '';
    }
    
    openModal('linkModal');
}

async function saveLink() {
    if (!state.isAdmin) return showToast('You need to be admin to do this.', 'error');
    
    const title = $('linkTitle').value.trim();
    const url = $('linkUrl').value.trim();
    if (!title || !url) return showToast('Title and URL are required', 'error');
    
    const linkData = {
        id: state.editingLinkId || generateId(),
        title: title,
        url: url,
        icon: $('linkIcon').value.trim() || 'fas fa-link'
    };
    
    if (state.editingLinkId) {
        const index = state.data.links.findIndex(l => l.id === state.editingLinkId);
        if (index !== -1) state.data.links[index] = linkData; // Typo 'langkaData' fixed
    } else {
        state.data.links.push(linkData);
    }
    
    await saveToGitHub();
    closeModal('linkModal');
    renderData();
}

async function deleteLink(id) {
    if (!state.isAdmin) return;
    
    if (!confirm('Are you sure you want to delete this link?')) return;
    
    state.data.links = state.data.links.filter(l => l.id !== id);
    await saveToGitHub(); // Added missing 'await'
    renderData();
}

// Save to GitHub via API (Menggunakan token dari localStorage)
async function saveToGitHub() {
    const token = localStorage.getItem('portfolio_github_token');
    if (!token) return showToast('Anda belum login sebagai admin.', 'error');

    const url = `https://api.github.com/repos/${CONFIG.GITHUB_USERNAME}/${CONFIG.REPO_NAME}/contents/${CONFIG.DB_FILE}`;
    
    // Get current file SHA (needed for update)
    let sha = null;
    try {
        const response = await fetch(url);
        if (response.ok) {
            const data = await response.json();
            sha = data.sha;
        }
    } catch (e) {
        console.warn('Could not get file SHA, creating new file');
    }
    
    // Prepare payload
    const content = btoa(unescape(encodeURIComponent(JSON.stringify(state.data, null, 2))));
    const payload = {
        message: `Update portfolio data - ${new Date().toISOString()}`,
        content: content,
        branch: CONFIG.BRANCH
    };
    if (sha) payload.sha = sha;
    
    // Send update
    try {
        const response = await fetch(url, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${token}`, // Mengambil token dari localStorage
                'Accept': 'application/vnd.github+json',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });
        
        if (response.ok) {
            showToast('Data saved successfully!', 'success');
        } else {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Failed to save');
        }
    } catch (error) {
        console.error('Error saving to GitHub:', error);
        showToast('Gagal menyimpan ke GitHub. Cek token atau koneksi internet.', 'error');
    }
}

// Utility Functions
function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

function openModal(modalId) {
    $(modalId).classList.add('active');
}

function closeModal(modalId) {
    $(modalId).classList.remove('active');
}

function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `
        <i class="fas ${type === 'success' ? 'fa-check-circle' : type === 'error' ? 'fa-exclamation-circle' : 'fa-info-circle'}"></i>
        <span>${message}</span>
    `;
    document.body.appendChild(toast);
    
    setTimeout(() => toast.classList.add('show'), 100);
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 400);
    }, 3000);
}

function isElementInViewport(el) {
    const rect = el.getBoundingClientRect(); // Typo 'el el' fixed
    return (
        rect.top >= 0 &&
        rect.left >= 0 &&
        rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
        rect.right <= (window.innerWidth || document.documentElement.clientWidth)
    );
}

function setupScrollObserver() {
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
            }
        });
    }, { threshold: 0.1 });
    
    document.querySelectorAll('.reveal').forEach(el => observer.observe(el));
}

// Make functions global for inline onclick
window.openProjectModal = openProjectModal;
window.deleteProject = deleteProject;
window.openLinkModal = openLinkModal;
window.deleteLink = deleteLink;
