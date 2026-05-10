/**
 * PocketBase Initialization
 */
// Local DB initialized via db.js

/**
 * DOM Elements
 */
const tabTitle = document.getElementById('tab-title');
const tabContent = document.getElementById('tab-content');
const navAuth = document.getElementById('nav-auth');
const navMain = document.getElementById('nav-main');
const logoutBtn = document.getElementById('logout-btn');
const headerUserInfo = document.getElementById('header-user-info');
const headerUserName = document.getElementById('header-user-name');
const headerUserDept = document.getElementById('header-user-dept');
const headerUserAvatar = document.getElementById('header-user-avatar');

/**
 * Global State
 */
const state = {
    currentTab: 'tasks',
    currentUser: null,
    manuals: [],
    filteredManuals: [],
    currentManual: null,
    manualComments: [],
    manualLikes: [],         // Likes for current manual
    pastedFiles: [],         // Store files pasted via clipboard
    questions: [],           // Questions for Q&A feed
    projects: [],            // Project data for Kanban board
    currentProject: null,    // Currently viewing project
    isEditMode: false,       // Track if we are editing an existing manual
    commentFiles: []         // 댓글 이미지 파일 관리용 추가
};

/**
 * Sidebar Submenu Toggle
 */
function toggleSubmenu(id) {
    const submenu = document.getElementById(id);
    const arrow = document.getElementById('arrow-tasks'); // Task specific for now
    
    if (submenu) {
        const isHidden = submenu.classList.contains('hidden');
        if (isHidden) {
            submenu.classList.remove('hidden');
            if (arrow) arrow.style.transform = 'rotate(180deg)';
        } else {
            submenu.classList.add('hidden');
            if (arrow) arrow.style.transform = 'rotate(0deg)';
        }
    }
}

/**
 * Tab Navigation
 */
function switchTab(tabId) {
    state.currentTab = tabId;
    
    // 상세 페이지나 작성 페이지는 기본 'manual' 탭으로 저장하여 새로고침 시 오류 방지
    const tabToSave = (tabId === 'manual-detail' || tabId === 'manual-write') ? 'manual' : tabId;
    localStorage.setItem('ax_current_tab', tabToSave);

    if (tabId !== 'timeline' && typeof qaUnsubscribe !== 'undefined' && qaUnsubscribe) {
        qaUnsubscribe();
        qaUnsubscribe = null;
    }

    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('nav-item-active');
    });

    let activeId = tabId;
    if (tabId === 'manual-detail' || tabId === 'manual-write') activeId = 'manual';
    if (tabId === 'join' || tabId === 'login') activeId = tabId;
    
    // Auto-open submenu if needed
    if (tabId === 'tasks-list' || tabId === 'tasks') {
        const submenu = document.getElementById('submenu-tasks');
        const arrow = document.getElementById('arrow-tasks');
        if (submenu && submenu.classList.contains('hidden')) {
            submenu.classList.remove('hidden');
            if (arrow) arrow.style.transform = 'rotate(180deg)';
        }
    }

    const activeBtn = document.getElementById(`btn-${activeId}`);
    if (activeBtn) {
        activeBtn.classList.add('nav-item-active');
    }

    const titles = {
        'tasks': 'AX Crew 과제 관리',
        'manual': 'AX 매뉴얼',
        'manual-write': '매뉴얼 작성',
        'manual-detail': '매뉴얼 상세',
        'timeline': 'Q&A',
        'login': '로그인',
        'join': '회원가입'
    };
    tabTitle.textContent = titles[tabId] || 'AX Crew';
    tabContent.classList.add('opacity-0');

    setTimeout(() => {
        try {
            renderTabContent(tabId);
            if (tabId === 'manual') fetchManuals();
            if (tabId === 'tasks') fetchProjects();
            if (tabId === 'manual-write') {
                initQuill();
                if (state.isEditMode && state.currentManual) {
                    const titleInput = document.getElementById('manual-title');
                    if (titleInput) titleInput.value = state.currentManual.title || '';
                    if (quill) quill.root.innerHTML = state.currentManual.content || '';
                }
            }
            if (tabId === 'timeline') {
                fetchQuestions();
                subscribeQuestions();
            }
        } catch (err) {
            console.error('Tab rendering error:', err);
        } finally {
            tabContent.classList.remove('opacity-0');
            if (typeof lucide !== 'undefined') lucide.createIcons();
        }
    }, 200);
}

/**
 * Auth Logic
 */
async function handleLogin(e) {
    if (e) e.preventDefault();
    const formData = new FormData(e.target);
    const data = Object.fromEntries(formData);
    try {
        await DB.login(data.email, data.password);
        showModal('환영합니다!', '로그인에 성공했습니다.', 'success');
        switchTab('tasks');
        updateUserInfoDisplay();
    } catch (err) {
        console.error('Login Error:', err);
        showModal('로그인 실패', '이메일 또는 비밀번호를 확인하세요.', 'error');
    }
}

async function handleJoin(e) {
    if (e) e.preventDefault();
    const formData = new FormData(e.target);
    const data = Object.fromEntries(formData);
    data.passwordConfirm = data.password;
    try {
        await DB.create('users', data);
        await DB.login(data.email, data.password);
        showModal('가입 성공!', 'AX Crew의 일원이 되신 것을 환영합니다.', 'success');
        switchTab('tasks');
        updateUserInfoDisplay();
    } catch (err) {
        console.error('Join Error:', err);
        showModal('가입 실패', '이미 존재하는 계정이거나 입력 정보를 확인하세요.', 'error');
    }
}

function handleLogout() {
    DB.logout();
    updateUserInfoDisplay();
    switchTab('login');
    showModal('로그아웃', '정상적으로 로그아웃되었습니다.', 'success');
}

/**
 * Manual Logic
 */
async function fetchManuals() {
    const tbody = document.getElementById('manual-list-body');
    if (!tbody) {
        setTimeout(() => {
            const retryTbody = document.getElementById('manual-list-body');
            if (retryTbody) fetchManuals();
        }, 100);
        return;
    }
    try {
        const records = await DB.getAll('manuals', { sort: '-created', expand: 'author' });
        state.manuals = records;
        state.filteredManuals = records;
        renderManualsList();
    } catch (error) {
        console.error('Fetch Manuals Error:', error);
        tbody.innerHTML = `<tr><td colspan="4" class="px-6 py-8 text-center text-rose-500">데이터를 불러오는 중 오류가 발생했습니다.</td></tr>`;
    }
}

function renderManualsList() {
    const tbody = document.getElementById('manual-list-body');
    if (!tbody) return;
    if (!state.filteredManuals || state.filteredManuals.length === 0) {
        tbody.innerHTML = `<tr><td colspan="4" class="px-6 py-12 text-center text-slate-400"><i data-lucide="search-x" class="w-12 h-12 mx-auto mb-2 opacity-20"></i><p>등록된 매뉴얼이 없습니다.</p></td></tr>`;
    } else {
        tbody.innerHTML = state.filteredManuals.map(m => {
            const date = m.created ? new Date(m.created).toLocaleDateString() : '-';
            const authorName = m.expand?.author?.name || '익명';
            const authorDept = m.expand?.author?.department || '-';
            return `
                <tr onclick="viewManualDetail('${m.id}')" class="hover:bg-slate-50 transition-colors cursor-pointer group border-b border-slate-100 last:border-0">
                    <td class="px-8 py-4 text-left"><div class="font-bold text-slate-800 group-hover:text-indigo-600 transition-colors">${m.title || '제목 없음'}</div></td>
                    <td class="px-8 py-4 text-sm text-slate-600 text-center">${authorName}</td>
                    <td class="px-8 py-4 text-sm text-slate-500 text-center">${authorDept}</td>
                    <td class="px-8 py-4 text-sm text-slate-400 font-mono text-center">${date}</td>
                </tr>`;
        }).join('');
    }
    if (typeof lucide !== 'undefined') lucide.createIcons();
}

async function viewManualDetail(manualId) {
    try {
        const manual = await DB.getById('manuals', manualId, { expand: 'author' });
        state.currentManual = manual;
        const [comments, likes] = await Promise.all([
            DB.getAll('manual_comments', { filter: `manual = "${manualId}"`, sort: 'created', expand: 'author' }),
            DB.getAll('manual_likes', { filter: `manual = "${manualId}"` })
        ]);
        state.manualComments = comments;
        state.manualLikes = likes;
        switchTab('manual-detail');
    } catch (error) {
        console.error('Detail View Error:', error);
        showModal('오류', '매뉴얼을 불러오는 중 문제가 발생했습니다.', 'error');
    }
}

/**
 * Quill Editor
 */
let quill;
function initQuill() {
    try {
        const editorEl = document.getElementById('manual-editor');
        if (!editorEl) return;
        
        // 중복 초기화 방지
        if (editorEl.classList.contains('ql-container')) return;

        // Quill 글씨 크기 화이트리스트 설정 (pt 단위)
        const Size = Quill.import('attributors/style/size');
        Size.whitelist = ['8pt', '9pt', '10pt', '12pt', '14pt', '16pt', '18pt', '20pt', '24pt', '30pt', '36pt', '48pt', '60pt', '72pt'];
        Quill.register(Size, true);

        const toolbarOptions = [
            [{ 'header': [1, 2, 3, false] }, { 'size': Size.whitelist }],
            ['bold', 'italic', 'underline', 'strike'],
            [{ 'color': [] }, { 'background': [] }],
            [{ 'list': 'ordered' }, { 'list': 'bullet' }],
            [{ 'indent': '-1' }, { 'indent': '+1' }],
            [{ 'align': [] }],
            ['image', 'link', 'clean']
        ];

        // Quill 전역 설정
        try {
            const Parchment = Quill.import('parchment');
            class Break extends Parchment.Embed { static create() { return document.createElement('br'); } }
            Break.blotName = 'break'; Break.tagName = 'BR';
            Quill.register(Break, true);
        } catch (e) { }

        quill = new Quill('#manual-editor', {
            modules: {
                toolbar: toolbarOptions,
                clipboard: { matchers: [[Node.ELEMENT_NODE, (node, delta) => { delta.forEach(op => { if (op.attributes) { if (op.attributes.font) delete op.attributes.font; } }); return delta; }]] },
                keyboard: { bindings: { shift_enter: { key: 13, shiftKey: true, handler: function (range) { this.quill.insertEmbed(range.index, 'break', true, 'user'); this.quill.setSelection(range.index + 1, 0); return false; } } } }
            },
            theme: 'snow', placeholder: '내용을 입력하세요...'
        });
        
        if (quill && quill.root) {
            quill.root.style.setProperty('caret-color', '#000000', 'important');
            quill.root.style.setProperty('color', '#1e293b', 'important');
            quill.root.style.minHeight = '700px'; // 세로 폭 대폭 확장
        }
        
        const editor = editorEl.querySelector('.ql-editor');
        if (editor) editor.addEventListener('paste', handleManualPaste);
    } catch (err) {
        console.error('Quill Initialization Error:', err);
    }
}

function updateUserInfoDisplay() {
    state.currentUser = DB.getCurrentUser();
    const navAuth = document.getElementById('nav-auth');
    const navMain = document.getElementById('nav-main');
    const logoutBtn = document.getElementById('logout-btn');
    const headerUserInfo = document.getElementById('header-user-info');

    if (state.currentUser) {
        if (navAuth) navAuth.classList.add('hidden');
        if (navMain) navMain.classList.remove('hidden');
        if (logoutBtn) logoutBtn.classList.remove('hidden');
        if (headerUserInfo) {
            headerUserInfo.classList.remove('hidden');
            headerUserInfo.classList.add('flex');
            document.getElementById('header-user-name').textContent = state.currentUser.name || '사용자';
            document.getElementById('header-user-dept').textContent = state.currentUser.department || '부서 미지정';
            const avatarContainer = document.getElementById('header-user-avatar');
            if (state.currentUser.avatar) {
                avatarContainer.innerHTML = `<img src="${DB.getFileUrl(state.currentUser, state.currentUser.avatar)}" class="w-full h-full object-cover">`;
            } else {
                avatarContainer.innerHTML = `<i data-lucide="user" class="w-5 h-5"></i>`;
            }
        }
    } else {
        if (navAuth) navAuth.classList.remove('hidden');
        if (navMain) navMain.classList.add('hidden');
        if (logoutBtn) logoutBtn.classList.add('hidden');
        if (headerUserInfo) headerUserInfo.classList.add('hidden');
    }
    if (typeof lucide !== 'undefined') lucide.createIcons();

    // Update header date
    const headerDate = document.getElementById('current-header-date');
    if (headerDate) {
        headerDate.textContent = new Date().toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'short' });
    }
}

function handleManualPaste(e) {
    const items = (e.clipboardData || e.originalEvent.clipboardData).items;
    for (let item of items) {
        if (item.kind === 'file' && item.type.startsWith('image/')) {
            const blob = item.getAsFile();
            if (!blob) continue;
            const fileName = `pasted_img_${Date.now()}.png`;
            const renamedFile = new File([blob], fileName, { type: 'image/png' });
            const reader = new FileReader();
            reader.onload = (event) => {
                const range = quill.getSelection();
                const index = range ? range.index : quill.getLength();
                quill.insertEmbed(index, 'image', event.target.result);
                setTimeout(() => {
                    const images = quill.root.querySelectorAll('img[src^="data:image/"]');
                    const lastImg = images[images.length - 1];
                    if (lastImg) lastImg.setAttribute('alt', fileName);
                }, 0);
                quill.setSelection(index + 1);
            };
            reader.readAsDataURL(renamedFile);
            state.pastedFiles.push(renamedFile);
            updateManualFilePreview();
            e.preventDefault();
        }
    }
}

function updateManualFilePreview() {
    const container = document.getElementById('attached-files-container');
    const list = document.getElementById('manual-file-list');
    const fileInput = document.getElementById('manual-files');
    if (!container || !list) return;
    const allFiles = [...Array.from(fileInput ? fileInput.files : []), ...state.pastedFiles];
    if (allFiles.length > 0) {
        container.classList.remove('hidden');
        list.innerHTML = allFiles.map(f => `<div class="px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-600 flex items-center gap-2 shadow-sm animate-fade-in"><i data-lucide="${f.type.startsWith('image/') ? 'image' : 'file'}" class="w-3 h-3 text-slate-400"></i>${f.name}</div>`).join('');
        if (typeof lucide !== 'undefined') lucide.createIcons();
    } else { container.classList.add('hidden'); }
}

async function handleManualPublish() {
    const titleInput = document.getElementById('manual-title');
    const editorContent = quill ? quill.root.innerHTML : '';
    if (!titleInput || !titleInput.value.trim() || !editorContent || editorContent === '<p><br></p>') {
        showModal('입력 부족', '제목과 내용을 모두 입력해 주세요.', 'error'); return;
    }
    try {
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = editorContent;
        tempDiv.querySelectorAll('img').forEach(img => {
            const alt = img.getAttribute('alt');
            if (alt && alt.startsWith('pasted_img_') && img.getAttribute('src').startsWith('data:image/')) {
                img.parentNode.replaceChild(document.createTextNode(`![${alt}]`), img);
            }
        });
        const formData = new FormData();
        formData.append('title', titleInput.value);
        formData.append('content', tempDiv.innerHTML);
        formData.append('author', DB.getCurrentUser().id);
        const fileInput = document.getElementById('manual-files');
        if (fileInput && fileInput.files.length > 0) { for (let file of fileInput.files) formData.append('file', file); }
        state.pastedFiles.forEach(f => formData.append('file', f));
        if (state.isEditMode && state.currentManual?.id) {
            await DB.update('manuals', state.currentManual.id, formData);
            state.isEditMode = false; state.pastedFiles = [];
            showModal('수정 완료', '매뉴얼이 성공적으로 수정되었습니다.', 'success');
            setTimeout(() => { viewManualDetail(state.currentManual.id); }, 100);
        } else {
            await DB.create('manuals', formData);
            state.isEditMode = false; state.pastedFiles = [];
            showModal('발행 완료', '새로운 매뉴얼이 등록되었습니다.', 'success');
            setTimeout(() => { switchTab('manual'); }, 100);
        }
    } catch (error) { showModal('저장 실패', '오류가 발생했습니다.', 'error'); }
}

async function handleManualComment(event, manualId, parentId = null) {
    if (event) event.preventDefault();
    const textInput = event.target.querySelector('textarea');
    const content = textInput ? textInput.value.trim() : '';
    if (!content && state.commentFiles.length === 0) { showModal('입력 부족', '내용이나 이미지를 추가해 주세요.', 'error'); return; }
    try {
        const formData = new FormData();
        formData.append('manual', manualId); formData.append('author', DB.getCurrentUser().id);
        formData.append('content', content); if (parentId) formData.append('parent', parentId);
        state.commentFiles.forEach(file => formData.append('file', file));
        await DB.create('manual_comments', formData);
        state.commentFiles = [];
        const preview = document.getElementById('comment-image-preview');
        if (preview) { preview.innerHTML = ''; preview.classList.add('hidden'); }
        if (textInput) textInput.value = '';
        await viewManualDetail(manualId);
    } catch (err) { showModal('오류', '댓글 등록 실패', 'error'); }
}

function handleCommentFileChange(event) {
    const files = Array.from(event.target.files);
    if (files.length === 0) return;
    files.forEach(file => state.commentFiles.push(file));
    updateManualCommentPreview();
}

function handleManualCommentPaste(e) {
    const items = (e.clipboardData || e.originalEvent.clipboardData).items;
    let found = false;
    for (let item of items) {
        if (item.type.indexOf('image') !== -1) {
            const blob = item.getAsFile();
            if (!blob) continue;
            const file = new File([blob], `comment_pasted_${Date.now()}.png`, { type: blob.type });
            state.commentFiles.push(file);
            found = true;
        }
    }
    if (found) updateManualCommentPreview();
}

function updateManualCommentPreview() {
    const preview = document.getElementById('comment-image-preview');
    if (!preview) return;
    
    if (state.commentFiles.length === 0) {
        preview.classList.add('hidden');
        preview.innerHTML = '';
        return;
    }
    
    preview.classList.remove('hidden');
    preview.innerHTML = '';
    state.commentFiles.forEach((file, index) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            const div = document.createElement('div');
            div.className = 'relative group w-20 h-20';
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'absolute -top-2 -right-2 bg-rose-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100';
            btn.innerHTML = '<i data-lucide="x" class="w-3 h-3"></i>';
            btn.onclick = () => {
                state.commentFiles.splice(index, 1);
                updateManualCommentPreview();
            };
            div.innerHTML = `<img src="${e.target.result}" class="w-full h-full object-cover rounded-xl border border-slate-200">`;
            div.appendChild(btn);
            preview.appendChild(div);
            if (typeof lucide !== 'undefined') lucide.createIcons();
        };
        reader.readAsDataURL(file);
    });
}

function handleManualEditStart(id) { state.isEditMode = true; switchTab('manual-write'); }
async function handleManualLike(manualId) {
    if (!DB.getCurrentUser()) { showModal('로그인 필요', '로그인 후 이용 가능합니다.', 'error'); return; }
    try {
        const existing = state.manualLikes.find(l => l.user === DB.getCurrentUser().id);
        if (existing) { await DB.delete('manual_likes', existing.id); }
        else { await DB.create('manual_likes', { manual: manualId, user: DB.getCurrentUser().id }); }
        await viewManualDetail(manualId);
    } catch (err) { console.error(err); }
}

async function handleDeleteComment(commentId, manualId) {
    if (!confirm('댓글을 삭제하시겠습니까?')) return;
    try { await DB.delete('manual_comments', commentId); viewManualDetail(manualId); }
    catch (err) { console.error(err); }
}

function showModal(title, message, type = 'info') {
    const modal = document.createElement('div');
    modal.className = 'fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-md animate-fade-in';
    modal.innerHTML = `
        <div class="bg-white/90 backdrop-blur-2xl rounded-[2.5rem] shadow-premium max-w-md w-full overflow-hidden border border-white/50">
            <div class="p-10 text-center">
                <div class="w-20 h-20 ${type === 'success' ? 'bg-emerald-50 text-emerald-500' : 'bg-rose-50 text-rose-500'} rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-sm">
                    <i data-lucide="${type === 'success' ? 'check-circle' : 'alert-circle'}" class="w-10 h-10"></i>
                </div>
                <h3 class="text-2xl font-black text-slate-900 mb-3 tracking-tighter">${title}</h3>
                <p class="text-slate-500 font-medium leading-relaxed">${message}</p>
            </div>
            <div class="p-6 bg-slate-50/50 border-t border-slate-100 flex justify-center">
                <button onclick="this.closest('.fixed').remove()" class="px-10 py-3 bg-black text-white rounded-2xl font-black hover:scale-105 transition-all shadow-xl shadow-black/10">확인</button>
            </div>
        </div>`;
    document.body.appendChild(modal);
    if (typeof lucide !== 'undefined') lucide.createIcons();
    if (type === 'success') { setTimeout(() => { if (modal.parentNode) modal.remove(); }, 3000); }
}

/**
 * Projects Logic
 */
async function fetchProjects() {
    try {
        const records = await DB.getAll('projects', { sort: '-created', expand: 'owner' });
        state.projects = records;
        renderTabContent('tasks');
    } catch (err) { console.error(err); }
}

async function openProjectDetail(projectId, isEdit = false) {
    const modal = document.getElementById('project-modal');
    const content = document.getElementById('project-modal-content');
    const sidebarList = document.getElementById('project-sidebar-list');
    if (!modal || !content || !projectId) return;

    modal.classList.remove('hidden');
    state.currentProject = state.projects.find(p => p.id === projectId);
    if (!state.currentProject) return;

    localStorage.setItem('ax_current_project_id', projectId);

    // Render Sidebar List: Exact Matching Image
    if (sidebarList) {
        sidebarList.innerHTML = `
            <div class="flex items-center justify-between px-2 mb-4">
                <span class="text-[11px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                    <i data-lucide="layers" class="w-3.5 h-3.5"></i> Project List
                </span>
                <button onclick="openProjectCreate()" class="p-1 hover:bg-white/50 rounded-lg text-indigo-600 transition-all">
                    <i data-lucide="plus" class="w-4 h-4"></i>
                </button>
            </div>
            <div class="space-y-2">
                ${state.projects.map(p => {
            const isActive = p.id === projectId;
            const statusColor = p.status === 'done' ? 'bg-emerald-50 text-emerald-500' : p.status === 'progress' ? 'bg-indigo-50 text-indigo-500' : 'bg-amber-50 text-amber-600';
            return `
                        <button onclick="openProjectDetail('${p.id}')" class="w-full flex items-center justify-between px-4 py-3.5 rounded-2xl transition-all ${isActive ? 'bg-white shadow-xl shadow-indigo-100/50 border border-white' : 'hover:bg-white/30 text-slate-500'} group">
                            <div class="flex items-center gap-3 min-w-0">
                                <i data-lucide="${isActive ? 'check-circle' : 'circle'}" class="w-4 h-4 flex-shrink-0 ${isActive ? 'text-indigo-600' : 'text-slate-300'}"></i>
                                <span class="truncate text-[13px] font-black ${isActive ? 'text-slate-900' : 'group-hover:text-slate-700'}">${p.title || 'Untitled'}</span>
                            </div>
                            <span class="px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-tighter ${statusColor}">${p.status === 'progress' ? 'Ing' : p.status}</span>
                        </button>
                    `;
        }).join('')}
            </div>
        `;
    }

    const p = state.currentProject;
    const owner = p.expand?.owner || DB.getCurrentUser();
    const isOwner = DB.getCurrentUser()?.id === p.owner;
    const statusColor = p.status === 'done' ? 'bg-emerald-50 text-emerald-500' : p.status === 'progress' ? 'bg-indigo-50 text-indigo-500' : 'bg-amber-50 text-amber-600';

    content.innerHTML = `
        <div class="flex flex-col h-full bg-white/40">
            <div class="flex-1 overflow-y-auto custom-scrollbar py-6 px-6">
                <div class="max-w-5xl mx-auto w-full">
                    <!-- Breadcrumb -->
                    <div class="flex items-center gap-3 mb-2 text-[11px] font-black uppercase tracking-[0.2em] text-indigo-600/60">
                        <div class="flex items-center gap-2"><i data-lucide="layout" class="w-3 h-3"></i><span>Workspace</span></div>
                        <span class="text-slate-300">/</span>
                        <div class="flex items-center gap-2"><i data-lucide="check-square" class="w-3 h-3"></i><span>Project Board</span></div>
                    </div>

                    <!-- Title Area -->
                    <div class="flex justify-between items-start mb-4">
                        <div class="space-y-4">
                            ${isEdit ? `
                                <input id="project-title" type="text" value="${p.title}" 
                                    class="w-full text-5xl font-black text-slate-900 bg-transparent border-none focus:ring-0 p-0 tracking-tighter placeholder-slate-200">
                            ` : `
                                <h2 class="text-5xl font-black text-slate-900 tracking-tighter leading-tight">${p.title || 'Untitled'}</h2>
                            `}
                        </div>
                        <div class="flex items-center gap-3">
                            ${isOwner ? (isEdit ? `
                                <button onclick="handleDeleteProject()" class="px-6 py-2.5 bg-white/50 text-rose-500 rounded-xl font-black text-xs hover:bg-rose-50 transition-all">과제 삭제</button>
                                <button onclick="openProjectDetail('${p.id}', false)" class="px-6 py-2.5 bg-white/50 text-slate-500 rounded-xl font-black text-xs hover:bg-white transition-all">취소</button>
                                <button onclick="handleSaveProject()" class="px-8 py-2.5 bg-indigo-600 text-white rounded-xl font-black text-xs shadow-xl shadow-indigo-100 hover:scale-105 active:scale-95 transition-all flex items-center gap-2"><i data-lucide="save" class="w-4 h-4"></i> 저장하기</button>
                            ` : `
                                <button onclick="openProjectDetail('${p.id}', true)" class="px-8 py-2.5 bg-indigo-600 text-white rounded-xl font-black text-xs shadow-xl shadow-indigo-100 hover:scale-105 active:scale-95 transition-all flex items-center gap-2"><i data-lucide="edit-3" class="w-4 h-4"></i> 수정하기</button>
                            `) : ''}
                        </div>
                    </div>

                    <!-- Metadata Horizontal Card: Transparent Navy Glass -->
                    <div class="bg-indigo-900/[0.03] rounded-[2.5rem] p-8 mb-2 grid grid-cols-12 gap-10 border border-indigo-900/5 shadow-sm">
                        <div class="col-span-4 space-y-6">
                            <div class="flex items-center justify-between">
                                <div class="flex items-center gap-3 text-slate-400 font-bold uppercase tracking-widest text-[10px]">
                                    <i data-lucide="activity" class="w-4 h-4"></i>
                                    <span>Status</span>
                                </div>
                                ${isEdit ? `
                                    <select id="project-status" class="appearance-none px-4 py-1 rounded-full text-[10px] font-black outline-none cursor-pointer border border-transparent ${statusColor}">
                                        <option value="todo" ${p.status === 'todo' ? 'selected' : ''}>To-Do</option>
                                        <option value="progress" ${p.status === 'progress' ? 'selected' : ''}>In Progress</option>
                                        <option value="done" ${p.status === 'done' ? 'selected' : ''}>Done</option>
                                    </select>
                                ` : `<span class="px-5 py-1.5 rounded-full text-[10px] font-black tracking-widest ${statusColor} border border-current opacity-80 uppercase">${p.status}</span>`}
                            </div>
                            <div class="flex items-center justify-between">
                                <div class="flex items-center gap-3 text-slate-400 font-bold uppercase tracking-widest text-[10px]">
                                    <i data-lucide="users" class="w-4 h-4"></i>
                                    <span>Assignee</span>
                                </div>
                                <div class="flex items-center gap-3">
                                    <img src="${owner.avatar ? DB.getFileUrl(owner, owner.avatar) : 'https://api.dicebear.com/7.x/avataaars/svg?seed=' + owner.name}" class="w-8 h-8 rounded-full border border-white shadow-sm">
                                    <span class="font-black text-slate-800 text-sm tracking-tight">${owner.name || 'Anonymous'} <span class="text-slate-400 font-bold ml-1 text-[10px]">/ ${owner.department || ''}</span></span>
                                </div>
                            </div>
                        </div>
                        <div class="col-span-3 space-y-4">
                            <div class="flex items-center gap-3 text-slate-400 font-bold uppercase tracking-widest text-[10px]">
                                <i data-lucide="calendar" class="w-4 h-4"></i>
                                <span>Due Date</span>
                            </div>
                            ${isEdit ? `
                                <input id="project-due-date" type="date" value="${p.due_date ? p.due_date.split(' ')[0] : ''}" 
                                    class="bg-white/50 border border-slate-200 rounded-xl px-4 py-2 font-black text-slate-800 outline-none text-sm focus:ring-2 focus:ring-indigo-500/20">
                            ` : `<p class="font-black text-slate-800 text-lg tracking-tighter">${p.due_date ? p.due_date.split(' ')[0] : '2026-05-15'}</p>`}
                        </div>
                        <div class="col-span-5 space-y-4">
                            <div class="flex items-center gap-3 text-slate-400 font-bold uppercase tracking-widest text-[10px]">
                                <i data-lucide="trending-up" class="w-4 h-4"></i>
                                <span>Progress</span>
                            </div>
                            <div class="flex items-center gap-6">
                                ${isEdit ? `
                                    <input id="project-progress" type="range" min="0" max="100" value="${p.progress || 0}" class="flex-1 accent-indigo-600 cursor-pointer" oninput="this.nextElementSibling.innerText = this.value + '%' ">
                                    <span class="font-black text-indigo-600 text-sm w-10">${p.progress || 0}%</span>
                                ` : `
                                    <div class="flex-1 h-3 bg-slate-200/50 rounded-full overflow-hidden shadow-inner relative">
                                        <div class="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full transition-all duration-1000 shadow-lg shadow-indigo-200" style="width: ${p.progress || 0}%"></div>
                                    </div>
                                    <span class="font-black text-slate-900 text-sm">${p.progress || 0}%</span>
                                `}
                            </div>
                        </div>
                    </div>

                    <div id="project-editor-workspace" class="prose prose-slate max-w-none mt-0 ql-snow px-4">
                        ${isEdit ? `
                            <div id="project-editor" class="min-h-[200px] text-lg text-slate-700 leading-relaxed outline-none border border-white/40 rounded-[2.5rem] p-10 bg-white/40 shadow-premium">
                                ${p.content || ''}
                            </div>
                        ` : `
                            <div id="project-view-content" class="ql-editor text-xl text-slate-800 leading-relaxed p-0">
                                ${p.content || '<p class="text-slate-400/50 italic font-bold">작성된 내용이 없습니다.</p>'}
                            </div>
                        `}
                    </div>

                    <div class="mt-4 pt-2 border-t border-white/20">
                        <div class="flex items-center gap-4 mb-4">
                            <div class="w-12 h-12 bg-slate-900 text-white rounded-2xl flex items-center justify-center shadow-2xl">
                                <i data-lucide="message-square" class="w-6 h-6"></i>
                            </div>
                            <div>
                                <h3 class="text-2xl font-black text-slate-900 tracking-tighter">이슈 및 질의응답</h3>
                                <p class="text-slate-500 text-xs font-bold mt-1">과제 진행 중 발생하는 문제나 질문을 자유롭게 공유하세요.</p>
                            </div>
                        </div>
                        <div class="glass-card rounded-[2rem] p-4 pl-8 pr-6 mb-2 flex items-center gap-4 group border border-slate-200 focus-within:border-indigo-400 focus-within:ring-4 focus-within:ring-indigo-500/5 transition-all">
                            <textarea id="comment-input" placeholder="과제 진행 중 발생하는 문제나 질문을 자유롭게 공유하세요. (Ctrl+V 이미지 붙여넣기 가능)" 
                                onpaste="handleProjectCommentPaste(event, 'main')"
                                class="flex-1 bg-transparent border-none focus:ring-0 text-sm font-bold text-slate-700 placeholder-slate-400 resize-none h-6 mt-1.5"></textarea>
                            <button onclick="saveProjectComment('${p.id}')" 
                                class="w-10 h-10 flex items-center justify-center text-slate-400 hover:text-indigo-600 transition-colors">
                                <i data-lucide="send" class="w-5 h-5"></i>
                            </button>
                        </div>
                        <div id="project-comment-preview-main" class="flex flex-wrap gap-2 mb-6 px-4 hidden"></div>
                        <div id="project-comments-list" class="space-y-8">
                            <div class="flex justify-center py-20">
                                <div class="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600"></div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>`;
    if (typeof lucide !== 'undefined') lucide.createIcons();
    initProjectQuill(isEdit);
    fetchProjectComments(projectId);
}

// 이슈 및 질의응답 데이터 처리 로직
async function fetchProjectComments(projectId) {
    const listElem = document.getElementById('project-comments-list');
    try {
        // 댓글 및 답글 목록 가져오기 (작성자 정보 포함)
        const comments = await DB.getAll('project_comments', {
            filter: `project = "${projectId}"`,
            sort: 'created',
            expand: 'author'
        });

        if (comments.length === 0) {
            listElem.innerHTML = `
                <div class="text-center py-12 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200">
                    <p class="text-slate-400">등록된 질문이나 이슈가 없습니다. 첫 질문을 남겨보세요!</p>
                </div>`;
            return;
        }

        // 부모 댓글과 답글 분류
        const parentComments = comments.filter(c => !c.parent);
        const replies = comments.filter(c => c.parent);

        listElem.innerHTML = parentComments.map(comment => {
            const author = comment.expand?.author;
            const authorName = author?.name || '익명 크루';
            const avatarUrl = author?.avatar ? DB.getFileUrl(author, author.avatar) : null;
            const date = new Date(comment.created).toLocaleString();
            const commentReplies = replies.filter(r => r.parent === comment.id);

            return `
                <div class="group">
                    <div class="bg-white border border-slate-100 rounded-2xl p-6 shadow-sm hover:shadow-md transition-all">
                        <div class="flex items-start justify-between mb-4">
                            <div class="flex items-center gap-3">
                                ${avatarUrl ? `
                                    <img src="${avatarUrl}" class="w-10 h-10 rounded-full border border-slate-100 object-cover">
                                ` : `
                                    <div class="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold">
                                        ${authorName[0]}
                                    </div>
                                `}
                                <div>
                                    <h4 class="font-bold text-slate-800">${authorName}</h4>
                                    <span class="text-xs text-slate-400">${date}</span>
                                </div>
                            </div>
                        </div>
                        <p class="text-slate-700 leading-relaxed mb-4">${comment.content}</p>
                        
                        <!-- Comment Images -->
                        ${comment.file && comment.file.length > 0 ? `
                            <div class="flex flex-wrap gap-2 mb-4">
                                ${comment.file.map(f => `
                                    <img src="${DB.getFileUrl(comment, f)}" 
                                        class="max-w-[200px] max-h-[150px] rounded-xl border border-slate-100 shadow-sm cursor-zoom-in object-cover" 
                                        onclick="openImageViewer(this.src)">
                                `).join('')}
                            </div>
                        ` : ''}

                        <button onclick="toggleReplyInput('${comment.id}')" class="text-sm font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-1">
                            <i data-lucide="reply" class="w-4 h-4"></i> 답글 달기
                        </button>
                        
                        <!-- 답글 입력창 (숨김 상태) -->
                        <div id="reply-input-${comment.id}" class="hidden mt-6 pl-6 border-l-2 border-indigo-100">
                            <div class="relative">
                                <textarea id="reply-text-${comment.id}" placeholder="답글을 입력하세요... (Ctrl+V 이미지 붙여넣기 가능)" 
                                    onpaste="handleProjectCommentPaste(event, '${comment.id}')"
                                    class="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none resize-none min-h-[80px]"></textarea>
                                <div id="project-comment-preview-${comment.id}" class="flex flex-wrap gap-2 mt-2 hidden"></div>
                            </div>
                            <div class="flex justify-end gap-2 mt-2">
                                <button onclick="toggleReplyInput('${comment.id}')" class="px-4 py-1.5 text-sm font-semibold text-slate-500">취소</button>
                                <button onclick="saveProjectComment('${projectId}', '${comment.id}')" class="px-4 py-1.5 bg-indigo-600 text-white text-sm rounded-lg font-semibold">답글 등록</button>
                            </div>
                        </div>
                    </div>
                    
                    <!-- 답글 목록 -->
                    ${commentReplies.length > 0 ? `
                        <div class="mt-4 pl-12 space-y-4">
                            ${commentReplies.map(reply => {
                const rAuthor = reply.expand?.author;
                const rAuthorName = rAuthor?.name || '익명 크루';
                const rAvatarUrl = rAuthor?.avatar ? DB.getFileUrl(rAuthor, rAuthor.avatar) : null;
                return `
                                    <div class="bg-slate-50 border border-slate-100 rounded-2xl p-5 shadow-sm">
                                        <div class="flex items-center gap-3 mb-3">
                                            ${rAvatarUrl ? `
                                                <img src="${rAvatarUrl}" class="w-8 h-8 rounded-full border border-slate-200 object-cover">
                                            ` : `
                                                <div class="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center text-slate-600 text-xs font-bold">
                                                    ${rAuthorName[0]}
                                                </div>
                                            `}
                                            <div>
                                                <h5 class="text-sm font-bold text-slate-800">${rAuthorName}</h5>
                                                <span class="text-[10px] text-slate-400">${new Date(reply.created).toLocaleString()}</span>
                                            </div>
                                        </div>
                                        <p class="text-slate-600 text-sm leading-relaxed">${reply.content}</p>
                                        
                                        <!-- Reply Images -->
                                        ${reply.file && reply.file.length > 0 ? `
                                            <div class="flex flex-wrap gap-2 mt-3">
                                                ${reply.file.map(f => `
                                                    <img src="${DB.getFileUrl(reply, f)}" 
                                                        class="max-w-[150px] max-h-[120px] rounded-xl border border-slate-100 shadow-sm cursor-zoom-in object-cover" 
                                                        onclick="openImageViewer(this.src)">
                                                `).join('')}
                                            </div>
                                        ` : ''}
                                    </div>
                                `;
            }).join('')}
                        </div>
                    ` : ''}
                </div>
            `;
        }).join('');

        if (typeof lucide !== 'undefined') lucide.createIcons();
    } catch (err) {
        console.error('Comments fetch error:', err);
        listElem.innerHTML = `<p class="text-center text-red-500 py-10">댓글을 불러오는 중 오류가 발생했습니다.</p>`;
    }
}

async function saveProjectComment(projectId, parentId = null) {
    const inputId = parentId ? `reply-text-${parentId}` : 'comment-input';
    const content = document.getElementById(inputId).value.trim();

    if (!content) return;
    if (!(DB.getCurrentUser() !== null)) {
        showModal('알림', '로그인이 필요한 기능입니다.', 'error');
        return;
    }

    try {
        const formData = new FormData();
        formData.append('content', content);
        formData.append('project', projectId);
        formData.append('author', DB.getCurrentUser().id);
        if (parentId) formData.append('parent', parentId);

        // 이미지 파일 추가
        const key = parentId || 'main';
        if (projectCommentFiles[key] && projectCommentFiles[key].length > 0) {
            projectCommentFiles[key].forEach(file => {
                formData.append('file', file);
            });
        }

        await DB.create('project_comments', formData);
        
        // 입력창 및 파일 초기화
        document.getElementById(inputId).value = '';
        delete projectCommentFiles[key];
        const preview = document.getElementById(`project-comment-preview-${key}`);
        if (preview) {
            preview.innerHTML = '';
            preview.classList.add('hidden');
        }

        if (parentId) toggleReplyInput(parentId);

        // 목록 새로고침
        fetchProjectComments(projectId);
    } catch (err) {
        console.error('Comment save error:', err);
        showModal('오류', '댓글 등록에 실패했습니다.', 'error');
    }
}

function toggleReplyInput(commentId) {
    const replyInput = document.getElementById(`reply-input-${commentId}`);
    if (replyInput) {
        replyInput.classList.toggle('hidden');
    }
}

// 프로젝트 댓글 이미지 붙여넣기 로직
let projectCommentFiles = {};

function handleProjectCommentPaste(e, id) {
    const items = (e.clipboardData || e.originalEvent.clipboardData).items;
    let found = false;
    for (let item of items) {
        if (item.type.indexOf('image') !== -1) {
            const blob = item.getAsFile();
            if (!blob) continue;
            const file = new File([blob], `pasted_img_${Date.now()}.png`, { type: blob.type });
            
            if (!projectCommentFiles[id]) projectCommentFiles[id] = [];
            projectCommentFiles[id].push(file);
            found = true;
        }
    }
    if (found) {
        updateProjectCommentPreview(id);
    }
}

function updateProjectCommentPreview(id) {
    const preview = document.getElementById(`project-comment-preview-${id}`);
    if (!preview) return;

    if (!projectCommentFiles[id] || projectCommentFiles[id].length === 0) {
        preview.innerHTML = '';
        preview.classList.add('hidden');
        return;
    }

    preview.classList.remove('hidden');
    preview.innerHTML = projectCommentFiles[id].map((file, index) => `
        <div class="relative w-16 h-16 rounded-xl overflow-hidden border border-slate-200 shadow-sm group">
            <img src="${URL.createObjectURL(file)}" class="w-full h-full object-cover">
            <button onclick="removeProjectCommentFile('${id}', ${index})" 
                class="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all text-white">
                <i data-lucide="x" class="w-4 h-4"></i>
            </button>
        </div>
    `).join('');
    if (typeof lucide !== 'undefined') lucide.createIcons();
}

function removeProjectCommentFile(id, index) {
    if (projectCommentFiles[id]) {
        projectCommentFiles[id].splice(index, 1);
        updateProjectCommentPreview(id);
    }
}

function initProjectQuill(isEdit = false) {
    if (typeof Quill === 'undefined') return;
    if (!isEdit) { projectQuill = null; return; }

    setTimeout(() => {
        const editorElem = document.getElementById('project-editor');
        if (editorElem) {
            try {
                // 글꼴 크기 PT 단위 커스텀 설정
                const Size = Quill.import('attributors/style/size');
                Size.whitelist = ['10pt', '12pt', '14pt', '16pt', '18pt', '20pt', '24pt', '30pt', '36pt'];
                Quill.register(Size, true);

                // Custom Video Blot for Local Files
                const BlockEmbed = Quill.import('blots/block/embed');
                class VideoBlot extends BlockEmbed {
                    static create(value) {
                        const node = super.create();
                        node.setAttribute('src', value);
                        node.setAttribute('controls', 'true');
                        node.setAttribute('class', 'max-w-full rounded-2xl my-4 shadow-xl bg-black');
                        node.style.display = 'block';
                        return node;
                    }
                    static value(node) {
                        return node.getAttribute('src');
                    }
                }
                VideoBlot.blotName = 'video';
                VideoBlot.tagName = 'video';
                Quill.register(VideoBlot);

                // 표 아이콘 SVG 강제 등록
                const tableIcon = `<svg viewbox="0 0 18 18"><rect class="ql-stroke" height="12" width="12" x="3" y="3"></rect><line class="ql-stroke" x1="3" x2="15" y1="9" y2="9"></line><line class="ql-stroke" x1="9" x2="9" y1="3" y2="15"></line></svg>`;
                const icons = Quill.import('ui/icons');
                icons['table'] = tableIcon;

                projectQuill = new Quill(editorElem, {
                    theme: 'snow',
                    modules: {
                        table: true,
                        toolbar: [
                            [{ 'size': Size.whitelist }],
                            [{ 'header': [1, 2, 3, false] }],
                            ['bold', 'italic', 'underline'],
                            [{ 'color': [] }, { 'background': [] }],
                            ['link', 'image', 'video'],
                            [{ 'list': 'ordered' }, { 'list': 'bullet' }, { 'list': 'check' }],
                            ['table'],
                            ['clean']
                        ]
                    },
                    placeholder: '내용을 입력하세요...'
                });
                const toolbar = projectQuill.getModule('toolbar');
                toolbar.addHandler('table', () => {
                    const table = projectQuill.getModule('table');
                    table.insertTable(2, 3);
                });
                toolbar.addHandler('video', () => {
                    const input = document.createElement('input');
                    input.setAttribute('type', 'file');
                    input.setAttribute('accept', 'video/*');
                    input.click();
                    input.onchange = async () => {
                        const file = input.files[0];
                        if (file) {
                            if (file.size > 25 * 1024 * 1024) {
                                alert('동영상 용량이 너무 큽니다 (최대 25MB).');
                                return;
                            }
                            const base64 = await DB._fileToBase64(file);
                            const range = projectQuill.getSelection();
                            projectQuill.insertEmbed(range ? range.index : 0, 'video', base64);
                        }
                    };
                });
            } catch (err) { console.error('Quill Init Error:', err); }
        }
    }, 50);
}

function closeProjectModal() {
    const modal = document.getElementById('project-modal');
    if (modal) modal.classList.add('hidden');
    state.currentProject = null;
    localStorage.removeItem('ax_current_project_id');
    projectQuill = null;
}

async function handleSaveProject() {
    const title = document.getElementById('project-title').value.trim();
    if (!title || !state.currentProject) return;
    try {
        const data = {
            title,
            status: document.getElementById('project-status').value,
            progress: parseInt(document.getElementById('project-progress').value),
            due_date: document.getElementById('project-due-date').value,
            content: projectQuill ? projectQuill.root.innerHTML : '',
            owner: DB.getCurrentUser().id
        };

        // Handle Video Files
        const videoInput = document.getElementById('project-video-input');
        if (videoInput && videoInput.files.length > 0) {
            const formData = new FormData();
            for (let file of videoInput.files) {
                formData.append('file', file);
            }
            const parsed = await DB._parseFormData(formData);
            data.file = parsed.file; // DB.update will stringify it
        } else {
            data.file = state.currentProject.file || null;
        }

        await DB.update('projects', state.currentProject.id, data);
        showModal('저장 완료', '변경사항이 저장되었습니다.', 'success');
        await fetchProjects();
        openProjectDetail(state.currentProject.id, false);
    } catch (err) { showModal('오류', '저장 실패', 'error'); }
}

async function handleDeleteProject() {
    if (!state.currentProject || !confirm('정말 삭제하시겠습니까?')) return;
    try {
        await DB.delete('projects', state.currentProject.id);
        showModal('삭제 완료', '삭제되었습니다.', 'success');
        closeProjectModal();
        fetchProjects();
    } catch (err) { console.error(err); }
}

function openProjectCreate() {
    document.getElementById('project-create-modal').classList.remove('hidden');
    document.getElementById('create-project-title').value = '';
    document.getElementById('create-project-due').value = '';
}

function closeProjectCreate() {
    document.getElementById('project-create-modal').classList.add('hidden');
}

async function handleCreateProject() {
    const title = document.getElementById('create-project-title').value.trim();
    if (!title) return;
    try {
        await DB.create('projects', {
            title,
            status: document.getElementById('create-project-status').value,
            progress: parseInt(document.getElementById('create-project-progress').value),
            due_date: document.getElementById('create-project-due').value,
            owner: DB.getCurrentUser().id,
            content: ''
        });
        showModal('등록 완료', '새 과제가 생성되었습니다.', 'success');
        closeProjectCreate();
        fetchProjects();
    } catch (err) { showModal('오류', '등록 실패', 'error'); }
}

window.addEventListener('DOMContentLoaded', async () => {
    if (typeof DB !== 'undefined' && DB.isConnected()) {
        startApp();
    } else {
        window.addEventListener('db_connected', () => startApp(), { once: true });
    }
});

function startApp() {
    console.log("Starting App Initialization...");
    // 탭 복구
    let savedTab = localStorage.getItem('ax_current_tab');
    
    // 유효성 체크: 상세 페이지인데 데이터가 없으면 기본 탭으로
    if (savedTab === 'manual-detail' && !state.currentManual) {
        savedTab = 'manual';
    }
    
    if (savedTab) {
        state.currentTab = savedTab;
    }
    
    switchTab(state.currentTab);
    updateUserInfoDisplay();

    // 과제 상세 페이지 복구
    const savedProjectId = localStorage.getItem('ax_current_project_id');
    if (savedProjectId) {
        // 프로젝트 목록이 로드된 후 열어야 하므로 잠시 대기
        setTimeout(async () => {
            if (state.projects.length === 0) {
                await fetchProjects();
            }
            openProjectDetail(savedProjectId);
        }, 500);
    }

    document.addEventListener('focusin', (e) => {
        if (e.target.classList && (e.target.classList.contains('ql-editor') || e.target.id === 'project-editor')) {
            e.target.style.setProperty('caret-color', '#000000', 'important');
        }
    }, true);
}

/**
 * My Page Logic
 */
function handleAvatarPreview(e) {
    const file = e.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = (event) => {
            const container = document.getElementById('profile-preview-container');
            if (container) {
                container.innerHTML = `<img src="${event.target.result}" class="w-full h-full object-cover">`;
            }
        };
        reader.readAsDataURL(file);
    }
}

async function handleUpdateProfile(e) {
    e.preventDefault();
    const formData = new FormData(e.target);
    const avatarInput = document.getElementById('profile-avatar-input');

    const data = {
        name: formData.get('name'),
        department: formData.get('department'),
        is_crew: formData.get('is_crew') === 'on'
    };

    const password = formData.get('password');
    if (password) {
        data.password = password;
        data.passwordConfirm = password;
    }

    if (avatarInput.files[0]) {
        data.avatar = avatarInput.files[0];
    }

    try {
        await DB.update('users', DB.getCurrentUser().id, data);
        showModal('성공', '프로필이 업데이트되었습니다.', 'success');
        updateUserInfoDisplay(); // Update top right info
        switchTab('mypage'); // Refresh view
    } catch (err) {
        console.error('Profile update error:', err);
        showModal('오류', '업데이트 실패: ' + err.message, 'error');
    }
}

// 이미지 뷰어 제어 함수
function openImageViewer(src) {
    const modal = document.getElementById('image-viewer-modal');
    const img = document.getElementById('viewer-img');
    if (modal && img) {
        img.src = src;
        modal.classList.remove('hidden');
        document.body.style.overflow = 'hidden'; // 스크롤 방지
        if (typeof lucide !== 'undefined') lucide.createIcons();
    }
}

function closeImageViewer() {
    const modal = document.getElementById('image-viewer-modal');
    if (modal) {
        modal.classList.add('hidden');
        document.body.style.overflow = ''; // 스크롤 복구
    }
}

/**
 * Project Video Preview Logic
 */
function handleProjectVideoPreview(event) {
    const preview = document.getElementById('project-video-preview');
    if (!preview) return;
    
    const files = event.target.files;
    if (files.length > 0) {
        preview.innerHTML = '';
        Array.from(files).forEach(file => {
            const url = URL.createObjectURL(file);
            const item = document.createElement('div');
            item.className = 'relative w-32 h-20 bg-slate-900 rounded-xl overflow-hidden group';
            item.innerHTML = `
                <video class="w-full h-full object-cover opacity-60">
                    <source src="${url}" type="${file.type}">
                </video>
                <div class="absolute inset-0 flex items-center justify-center bg-indigo-600/40 text-white font-black text-[10px]">
                    READY
                </div>
            `;
            preview.appendChild(item);
        });
    }
}


