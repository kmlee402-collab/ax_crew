/**
 * Q&A Logic (Twitter-style Feed)
 */
let qaUnsubscribe;
let qaLikeRecords = [];

async function fetchQuestions() {
    const feed = document.getElementById('qa-feed');
    if (!feed) return;

    try {
        console.log('Fetching questions...');
        // 1. Fetch top-level questions
        const records = await pb.collection('questions').getFullList({
            sort: '-created',
            expand: 'user',
            filter: 'parent = null'
        });
        state.questions = records;
        console.log('Questions fetched:', records.length);

        // 2. Fetch ALL likes for questions (Separate try-catch to not block)
        try {
            console.log('Fetching likes...');
            qaLikeRecords = await pb.collection('question_likes').getFullList();
            console.log('Likes fetched:', qaLikeRecords.length);
        } catch (likeErr) {
            console.warn('Question Likes collection might be missing:', likeErr.message);
            qaLikeRecords = [];
        }

        renderQAFeed();
    } catch (err) {
        console.error('CRITICAL: Fetch Questions Error:', err);
        feed.innerHTML = `<div class="p-8 text-center text-rose-500 bg-rose-50 rounded-2xl border border-rose-100">
            <i data-lucide="alert-circle" class="w-8 h-8 mx-auto mb-2"></i>
            <p class="font-bold">데이터 로드 실패</p>
            <p class="text-xs mt-1 opacity-70">${err.message}</p>
            <p class="text-[10px] mt-4 text-slate-400 font-mono italic">Collection: questions</p>
        </div>`;
        lucide.createIcons();
    }
}

async function renderQAFeed() {
    const feed = document.getElementById('qa-feed');
    if (!feed) return;

    if (!state.questions || state.questions.length === 0) {
        feed.innerHTML = `<div class="p-12 text-center bg-white rounded-3xl border border-slate-200 text-slate-400">아직 질문이 없습니다. 첫 번째 질문을 던져보세요!</div>`;
        return;
    }

    const currentUserId = pb.authStore.model?.id;

    // Fetch replies
    let allReplies = [];
    try {
        allReplies = await pb.collection('questions').getFullList({
            filter: 'parent != null',
            expand: 'user',
            sort: 'created'
        });
    } catch (e) { console.error('Reply fetch error:', e); }

    const renderImages = (files, record) => {
        const fArray = Array.isArray(files) ? files : (files ? [files] : []);
        if (fArray.length === 0) return '';
        const imagesHtml = fArray.map(f => {
            const url = pb.files.getUrl(record, f);
            return `<img src="${url}" class="rounded-xl border border-slate-100 shadow-sm max-h-60 object-cover cursor-zoom-in" onclick="openImageViewer('${url}')">`;
        }).join('');
        return `<div class="grid grid-cols-${Math.min(fArray.length, 2)} gap-2 mt-3">${imagesHtml}</div>`;
    };

    feed.innerHTML = state.questions.map(q => {
        const qAuth = q.expand?.user || {};
        const qAvatar = qAuth.avatar ? pb.files.getUrl(qAuth, qAuth.avatar) : '';
        const qDate = new Date(q.created).toLocaleString();
        const isMe = currentUserId && q.user === currentUserId;

        // Likes
        const qLikes = qaLikeRecords.filter(l => l.question === q.id);
        const hasLiked = currentUserId && qLikes.some(l => l.user === currentUserId);

        // Replies
        const qReplies = allReplies.filter(r => r.parent === q.id);
        const repliesHtml = qReplies.map(r => {
            const rAuth = r.expand?.user || {};
            const rAvatar = rAuth.avatar ? pb.files.getUrl(rAuth, rAuth.avatar) : '';
            return `
                <div class="flex gap-3 pt-4 first:pt-0 border-t border-slate-50 mt-4 first:mt-0 animate-fade-in">
                    <div class="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center overflow-hidden flex-shrink-0 border border-slate-200">
                        ${rAvatar ? `<img src="${rAvatar}" class="w-full h-full object-cover">` : `<i data-lucide="user" class="w-4 h-4 text-slate-300"></i>`}
                    </div>
                    <div class="flex-1">
                        <div class="flex items-center gap-2 mb-1">
                            <span class="font-bold text-slate-800 text-xs">${rAuth.name || '익명'}</span>
                            <span class="text-[10px] text-slate-400 font-medium">${rAuth.department || ''}</span>
                        </div>
                        <p class="text-slate-600 text-sm leading-relaxed">${r.Text || ''}</p>
                        ${renderImages(r.file, r)}
                    </div>
                </div>
            `;
        }).join('');

        return `
            <div class="bg-white rounded-3xl shadow-sm border border-slate-200 p-6 space-y-4 animate-fade-in-up">
                <div class="flex gap-4">
                    <div class="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center overflow-hidden flex-shrink-0 border border-slate-200">
                        ${qAvatar ? `<img src="${qAvatar}" class="w-full h-full object-cover">` : `<i data-lucide="user" class="w-6 h-6 text-indigo-300"></i>`}
                    </div>
                    <div class="flex-1">
                        <div class="flex items-center justify-between mb-2">
                            <div>
                                <span class="font-bold text-slate-900">${qAuth.name || '익명'}</span>
                                <span class="text-xs text-slate-400 ml-2 font-medium">${qAuth.department || ''} · ${qDate}</span>
                            </div>
                            ${isMe ? `<button onclick="handleDeleteQuestion('${q.id}')" class="p-2 hover:bg-rose-50 text-slate-300 hover:text-rose-500 rounded-xl transition-all"><i data-lucide="trash-2" class="w-5 h-5"></i></button>` : ''}
                        </div>
                        <p class="text-slate-700 text-lg leading-relaxed whitespace-pre-wrap">${q.Text || ''}</p>
                        ${renderImages(q.file, q)}
                        
                        <div class="flex items-center gap-6 mt-6 pt-4 border-t border-slate-50">
                            <button onclick="toggleQACommentForm('${q.id}')" class="flex items-center gap-2 text-slate-400 hover:text-indigo-600 transition-all text-sm font-bold group">
                                <div class="p-2 bg-slate-50 rounded-xl group-hover:bg-indigo-50 transition-all"><i data-lucide="message-circle" class="w-5 h-5"></i></div>
                                <span>${qReplies.length}</span>
                            </button>
                            <button onclick="handleQALike('${q.id}')" class="flex items-center gap-2 ${hasLiked ? 'text-rose-500' : 'text-slate-400'} hover:text-rose-500 transition-all text-sm font-bold group">
                                <div class="p-2 ${hasLiked ? 'bg-rose-50' : 'bg-slate-50'} rounded-xl group-hover:bg-rose-50 transition-all"><i data-lucide="heart" class="w-5 h-5 ${hasLiked ? 'fill-rose-500' : ''}"></i></div>
                                <span>${qLikes.length > 0 ? qLikes.length : '공감'}</span>
                            </button>
                        </div>

                        <!-- Replies Container -->
                        <div id="qa-replies-${q.id}" class="mt-6 space-y-4 ${qReplies.length > 0 ? '' : 'hidden'}">
                            ${repliesHtml}
                            <div class="pt-6 border-t border-slate-50">
                                <form onsubmit="handleQAReply(event, '${q.id}')" class="space-y-3">
                                    <div class="relative">
                                        <textarea placeholder="답글을 남겨주세요... (Ctrl+V 이미지 붙여넣기 가능)" class="w-full px-4 py-3 bg-slate-50 rounded-2xl text-sm border-none outline-none focus:ring-2 ring-indigo-100 transition-all min-h-[80px] resize-none" onpaste="handleQAReplyPaste(event, '${q.id}')"></textarea>
                                        <div id="qa-reply-preview-${q.id}" class="absolute right-3 top-3 flex gap-1"></div>
                                    </div>
                                    <div class="flex justify-between items-center">
                                        <label class="p-2 hover:bg-slate-100 rounded-xl cursor-pointer text-slate-400 hover:text-indigo-600 transition-all">
                                            <i data-lucide="image" class="w-4 h-4"></i>
                                            <input type="file" multiple accept="image/*" class="hidden" onchange="handleQAReplyFileChange(event, '${q.id}')">
                                        </label>
                                        <button type="submit" class="px-5 py-2 bg-indigo-600 text-white rounded-xl text-xs font-bold hover:bg-indigo-700 shadow-md">답글 등록</button>
                                    </div>
                                </form>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }).join('');
    lucide.createIcons();
}

async function subscribeQuestions() {
    if (qaUnsubscribe) qaUnsubscribe();
    try {
        qaUnsubscribe = await pb.collection('questions').subscribe('*', () => fetchQuestions());
        await pb.collection('question_likes').subscribe('*', () => fetchQuestions());
    } catch (e) { console.warn('Subscription error:', e); }
}

async function handleQALike(questionId) {
    if (!pb.authStore.model) return;
    const currentUserId = pb.authStore.model.id;

    try {
        const existing = qaLikeRecords.find(l => l.question === questionId && l.user === currentUserId);
        if (existing) {
            await pb.collection('question_likes').delete(existing.id);
        } else {
            await pb.collection('question_likes').create({
                question: questionId,
                user: currentUserId
            });
        }
    } catch (err) { console.error('Like Error:', err); }
}

async function handleQAPublish() {
    const textInput = document.getElementById('qa-text');
    const fileInput = document.getElementById('qa-files');
    if (!textInput || !textInput.value.trim()) return;

    try {
        const formData = new FormData();
        formData.append('Text', textInput.value);
        formData.append('user', pb.authStore.model.id);
        if (fileInput.files.length > 0) {
            for (let file of fileInput.files) formData.append('file', file);
        }
        await pb.collection('questions').create(formData);
        textInput.value = '';
        fileInput.value = '';
        document.getElementById('qa-image-preview').innerHTML = '';
        document.getElementById('qa-image-preview').classList.add('hidden');
    } catch (err) { console.error('Publish Error:', err); }
}

const qaReplyFiles = {};
function handleQAReplyPaste(e, parentId) {
    const items = (e.clipboardData || e.originalEvent.clipboardData).items;
    for (let item of items) {
        if (item.type.indexOf('image') !== -1) {
            const blob = item.getAsFile();
            const file = new File([blob], `reply_pasted_${Date.now()}.png`, { type: blob.type });
            if (!qaReplyFiles[parentId]) qaReplyFiles[parentId] = [];
            qaReplyFiles[parentId].push(file);
            updateQAReplyPreview(parentId);
        }
    }
}
function handleQAReplyFileChange(e, parentId) {
    if (e.target.files.length > 0) {
        if (!qaReplyFiles[parentId]) qaReplyFiles[parentId] = [];
        Array.from(e.target.files).forEach(f => qaReplyFiles[parentId].push(f));
        updateQAReplyPreview(parentId);
    }
}
function updateQAReplyPreview(parentId) {
    const preview = document.getElementById(`qa-reply-preview-${parentId}`);
    if (!preview) return;
    preview.innerHTML = (qaReplyFiles[parentId] || []).map((f, i) => `
        <div class="relative w-10 h-10 rounded-lg overflow-hidden border border-white shadow-sm">
            <img src="${URL.createObjectURL(f)}" class="w-full h-full object-cover">
            <button onclick="removeQAReplyFile('${parentId}', ${i})" class="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 hover:opacity-100 transition-all text-white"><i data-lucide="x" class="w-4 h-4"></i></button>
        </div>
    `).join('');
    lucide.createIcons();
}
function removeQAReplyFile(parentId, index) {
    if (qaReplyFiles[parentId]) {
        qaReplyFiles[parentId].splice(index, 1);
        updateQAReplyPreview(parentId);
    }
}
async function handleQAReply(e, parentId) {
    e.preventDefault();
    const textarea = e.target.querySelector('textarea');
    if (!textarea || (!textarea.value.trim() && (!qaReplyFiles[parentId] || qaReplyFiles[parentId].length === 0))) return;

    try {
        const formData = new FormData();
        formData.append('Text', textarea.value);
        formData.append('user', pb.authStore.model.id);
        formData.append('parent', parentId);
        if (qaReplyFiles[parentId]) qaReplyFiles[parentId].forEach(f => formData.append('file', f));
        await pb.collection('questions').create(formData);
        textarea.value = '';
        delete qaReplyFiles[parentId];
        const preview = document.getElementById(`qa-reply-preview-${parentId}`);
        if (preview) preview.innerHTML = '';
    } catch (err) { console.error('Reply Error:', err); }
}
function handleQAFileChange(e) {
    const preview = document.getElementById('qa-image-preview');
    if (!preview) return;
    preview.innerHTML = '';
    if (e.target.files.length > 0) {
        preview.classList.remove('hidden');
        Array.from(e.target.files).forEach(file => {
            const reader = new FileReader();
            reader.onload = (ev) => {
                const img = document.createElement('img');
                img.src = ev.target.result;
                img.className = 'w-20 h-20 object-cover rounded-xl border border-slate-100 shadow-sm';
                preview.appendChild(img);
            };
            reader.readAsDataURL(file);
        });
    } else { preview.classList.add('hidden'); }
}
function toggleQACommentForm(id) {
    const container = document.getElementById(`qa-replies-${id}`);
    if (container) container.classList.toggle('hidden');
}
async function handleDeleteQuestion(id) {
    if (!confirm('정말 삭제하시겠습니까?')) return;
    try { await pb.collection('questions').delete(id); } catch (err) { console.error('Delete Error:', err); }
}
