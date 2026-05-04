/**
 * Tab Rendering Logic
 */

function renderTabContent(tabId) {
    console.log('Rendering Tab:', tabId);
    const container = document.getElementById('tab-content');
    if (!container) {
        console.error('Tab content container NOT FOUND!');
        return;
    }

    // Clear previous content
    container.innerHTML = '';

    // Safety checks
    const currentUserId = (typeof pb !== 'undefined' && pb.authStore.model) ? pb.authStore.model.id : null;
    const safeState = (typeof state !== 'undefined') ? state : { manuals: [], manualComments: [], manualLikes: [], currentManual: null };

    try {
        switch (tabId) {
            case 'mypage':
                const user = pb.authStore.model || {};
                const userAvatar = user.avatar ? pb.files.getUrl(user, user.avatar) : '';

                container.innerHTML = `
                    <div class="max-w-[1440px] mx-auto px-10 py-12 animate-fade-in pb-20">
                        <div class="mb-12">
                            <h2 class="text-3xl font-black text-slate-900 tracking-tight mb-2">내 정보 설정</h2>
                            <p class="text-slate-400 font-bold text-sm">크루 프로필과 계정 설정을 관리하세요.</p>
                        </div>

                        <div class="grid grid-cols-1 lg:grid-cols-3 gap-10">
                            <!-- Left: Profile Preview -->
                            <div class="lg:col-span-1">
                                <div class="bg-white rounded-[2.5rem] shadow-premium border border-slate-100 p-10 text-center">
                                    <div class="relative w-32 h-32 mx-auto mb-6">
                                        <div id="profile-preview-container" class="w-full h-full rounded-full bg-slate-50 border-4 border-slate-100 overflow-hidden flex items-center justify-center text-slate-300">
                                            ${userAvatar ? `<img src="${userAvatar}" class="w-full h-full object-cover">` : `<i data-lucide="user" class="w-12 h-12"></i>`}
                                        </div>
                                        <label class="absolute bottom-0 right-0 w-10 h-10 bg-indigo-600 rounded-full flex items-center justify-center text-white cursor-pointer shadow-lg hover:scale-110 transition-transform border-4 border-white">
                                            <i data-lucide="camera" class="w-4 h-4"></i>
                                            <input type="file" id="profile-avatar-input" class="hidden" accept="image/*" onchange="handleAvatarPreview(event)">
                                        </label>
                                    </div>
                                    <h3 class="text-xl font-black text-slate-900 mb-1">${user.name || '사용자'}</h3>
                                    <p class="text-sm font-bold text-slate-400 mb-6">${user.department || '부서 미지정'}</p>
                                    <div class="py-3 px-6 bg-slate-50 rounded-2xl inline-block">
                                        <p class="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Email</p>
                                        <p class="text-sm font-bold text-slate-700">${user.email}</p>
                                    </div>
                                </div>
                            </div>

                            <!-- Right: Edit Form -->
                            <div class="lg:col-span-2">
                                <div class="bg-white rounded-[2.5rem] shadow-premium border border-slate-100 p-10">
                                    <form id="profile-update-form" onsubmit="handleUpdateProfile(event)" class="space-y-8">
                                        <div class="grid grid-cols-1 md:grid-cols-2 gap-8">
                                            <div class="space-y-2">
                                                <label class="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">이름</label>
                                                <input type="text" name="name" value="${user.name || ''}" class="w-full px-6 py-4 rounded-2xl border border-slate-200 focus:border-indigo-600 focus:ring-4 focus:ring-indigo-600/5 outline-none transition-all font-bold text-slate-700">
                                            </div>
                                            <div class="space-y-2">
                                                <label class="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">부서</label>
                                                <input type="text" name="department" value="${user.department || ''}" class="w-full px-6 py-4 rounded-2xl border border-slate-200 focus:border-indigo-600 focus:ring-4 focus:ring-indigo-600/5 outline-none transition-all font-bold text-slate-700">
                                            </div>
                                        </div>
                                        
                                        <div class="p-4 bg-indigo-50/50 rounded-2xl border border-indigo-100/50 flex items-center justify-between group hover:bg-indigo-50 transition-all">
                                            <div class="flex items-center gap-3">
                                                <div class="w-10 h-10 rounded-xl bg-white flex items-center justify-center text-indigo-600 shadow-sm">
                                                    <i data-lucide="shield-check" class="w-5 h-5"></i>
                                                </div>
                                                <div>
                                                    <p class="text-sm font-black text-slate-900 leading-none">AX Crew 멤버 인증</p>
                                                </div>
                                            </div>
                                            <input type="checkbox" name="is_crew" ${user.is_crew ? 'checked' : ''} 
                                                class="w-6 h-6 rounded-lg border-slate-200 text-indigo-600 focus:ring-indigo-500 transition-all cursor-pointer">
                                        </div>
                                        
                                        <div class="space-y-2">
                                            <label class="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">새 비밀번호 (변경 시에만 입력)</label>
                                            <input type="password" name="password" placeholder="••••••••" class="w-full px-6 py-4 rounded-2xl border border-slate-200 focus:border-indigo-600 focus:ring-4 focus:ring-indigo-600/5 outline-none transition-all font-bold text-slate-700">
                                        </div>

                                        <div class="pt-6 border-t border-slate-50 flex justify-end">
                                            <button type="submit" class="px-10 py-4 btn-primary rounded-2xl font-black text-sm shadow-xl shadow-indigo-100">
                                                변경사항 저장하기
                                            </button>
                                        </div>
                                    </form>
                                </div>
                            </div>
                        </div>
                    </div>
                `;
                if (typeof lucide !== 'undefined') lucide.createIcons();
                break;
            case 'login':
                container.innerHTML = `
                    <div class="max-w-[1440px] mx-auto px-10 py-20 animate-fade-in-up flex items-center justify-center min-h-[60vh]">
                        <div class="glass p-12 rounded-[2.5rem] shadow-premium border border-white/60 max-w-lg w-full">
                            <div class="text-center mb-10">
                                <div class="w-20 h-20 bg-black text-white rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-xl">
                                    <i data-lucide="log-in" class="w-10 h-10"></i>
                                </div>
                                <h3 class="text-3xl font-black text-slate-900 tracking-tighter">다시 오셨군요!</h3>
                                <p class="text-slate-400 mt-2 font-medium">AX Crew 워크스페이스에 로그인하세요.</p>
                            </div>
                            <form id="login-form" class="space-y-5">
                                <div class="space-y-2">
                                    <label class="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">이메일 주소</label>
                                    <input type="email" name="email" required placeholder="name@company.com" class="w-full px-5 py-4 rounded-2xl border border-slate-200 focus:border-black focus:ring-4 focus:ring-black/5 outline-none transition-all bg-white/50 text-lg">
                                </div>
                                <div class="space-y-2">
                                    <label class="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">비밀번호</label>
                                    <input type="password" name="password" required placeholder="••••••••" class="w-full px-5 py-4 rounded-2xl border border-slate-200 focus:border-black focus:ring-4 focus:ring-black/5 outline-none transition-all bg-white/50 text-lg">
                                </div>
                                <button type="submit" class="w-full py-5 bg-black text-white rounded-2xl font-black text-lg hover:scale-[1.02] active:scale-[0.98] transition-all shadow-xl shadow-black/10 mt-4">로그인</button>
                            </form>
                        </div>
                    </div>
                `;
                const lForm = document.getElementById('login-form');
                if (lForm) lForm.addEventListener('submit', handleLogin);
                break;

            case 'join':
                container.innerHTML = `
                    <div class="max-w-[1440px] mx-auto px-10 py-20 animate-fade-in-up">
                        <div class="bg-white p-8 rounded-3xl shadow-sm border border-slate-200 max-w-lg mx-auto">
                            <div class="text-center mb-8">
                                <div class="w-16 h-16 bg-indigo-100 text-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
                                    <i data-lucide="user-plus" class="w-8 h-8"></i>
                                </div>
                                <h3 class="text-2xl font-bold text-slate-800">크루 가입</h3>
                            </div>
                            <form id="join-form" class="space-y-5">
                                <input type="text" name="name" required placeholder="이름" class="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-indigo-500 outline-none">
                                <input type="text" name="department" required placeholder="부서" class="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-indigo-500 outline-none">
                                <input type="email" name="email" required placeholder="이메일" class="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-indigo-500 outline-none">
                                <input type="password" name="password" required placeholder="비밀번호" class="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-indigo-500 outline-none">
                                <button type="submit" class="w-full py-4 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 shadow-lg shadow-indigo-100">가입 완료</button>
                            </form>
                        </div>
                    </div>
                `;
                const jForm = document.getElementById('join-form');
                if (jForm) jForm.addEventListener('submit', handleJoin);
                break;


            case 'manual':
                container.innerHTML = `
                    <div class="max-w-[1440px] mx-auto px-10 py-12 animate-fade-in">
                        <div class="flex justify-between items-end mb-10">
                            <div>
                                <h3 class="text-3xl font-black text-slate-900 tracking-tight mb-2">AX 매뉴얼</h3>
                                <p class="text-slate-400 font-bold text-sm">업무에 필요한 모든 가이드를 확인하세요.</p>
                            </div>
                            <button onclick="switchTab('manual-write')" class="px-8 py-3.5 btn-primary rounded-2xl font-black text-sm">등록하기</button>
                        </div>
                        <div class="border border-slate-100 rounded-[2.5rem] overflow-hidden bg-white shadow-premium">
                            <table class="w-full text-left">
                                <thead class="bg-slate-50/50 border-b border-slate-100">
                                    <tr>
                                        <th class="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-left">제목</th>
                                        <th class="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">작성자</th>
                                        <th class="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">부서</th>
                                        <th class="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">날짜</th>
                                    </tr>
                                </thead>
                                <tbody id="manual-list-body" class="divide-y divide-slate-50"></tbody>
                            </table>
                        </div>
                    </div>
                `;
                break;

            case 'manual-detail':
                const m = safeState.currentManual;
                if (!m) {
                    container.innerHTML = `<div class="p-12 text-center text-slate-400">글을 찾을 수 없습니다.</div>`;
                    break;
                }
                const mAuthor = m.expand?.author || {};
                const mAvatar = mAuthor.avatar ? pb.files.getUrl(mAuthor, mAuthor.avatar) : '';
                const mDate = new Date(m.created).toLocaleDateString();
                const mFiles = Array.isArray(m.file) ? m.file : (m.file ? [m.file] : []);
                const likes = safeState.manualLikes || [];
                const hasLiked = currentUserId ? likes.some(l => l.user === currentUserId) : false;

                // Improved Image Rendering: Match based on filename presence in content
                let contentHtml = m.content || '';
                if (mFiles.length > 0) {
                    contentHtml = contentHtml.replace(/\!\[(.*?)\]/g, (match, placeholderName) => {
                        // Find the actual file that matches the placeholder name
                        const actualFile = mFiles.find(fn => fn === placeholderName || fn.startsWith(placeholderName.split('.')[0]));
                        if (actualFile && actualFile.match(/\.(jpeg|jpg|gif|png|webp)$/i)) {
                            const fileUrl = pb.files.getUrl(m, actualFile);
                            return `<img src="${fileUrl}" class="max-w-full h-auto rounded-2xl my-6 shadow-md border border-slate-100 block cursor-zoom-in" onclick="openImageViewer(this.src)">`;
                        }
                        return match; // Keep as text if no matching file found
                    });
                }

                const allComments = safeState.manualComments || [];
                const parentComments = allComments.filter(c => !c.parent);
                const childComments = allComments.filter(c => c.parent);

                container.innerHTML = `
                    <div class="max-w-[1440px] mx-auto px-10 py-12 animate-fade-in-up pb-20">
                        <button onclick="switchTab('manual')" class="flex items-center gap-2 text-slate-400 hover:text-indigo-600 transition-colors font-medium group mb-4">
                            <i data-lucide="arrow-left" class="w-4 h-4 transition-transform group-hover:-translate-x-1"></i>
                            목록으로 돌아가기
                        </button>

                        <article class="bg-white rounded-[2.5rem] shadow-sm border border-slate-100 overflow-hidden">
                            <div class="p-10 md:p-16">
                                <h1 class="text-3xl md:text-4xl font-bold text-slate-900 mb-8 leading-tight">${m.title || '제목 없음'}</h1>
                                
                                <div class="flex items-center justify-between mb-12 pb-6 border-b border-slate-50">
                                    <div class="flex items-center gap-3">
                                        <div class="w-10 h-10 rounded-full bg-slate-100 overflow-hidden border border-slate-200">
                                            ${mAvatar ? `<img src="${mAvatar}" class="w-full h-full object-cover">` : `<i data-lucide="user" class="w-5 h-5 text-slate-400 m-2.5"></i>`}
                                        </div>
                                        <div>
                                            <div class="flex items-center gap-2 text-sm">
                                                <span class="font-bold text-slate-800">${mAuthor.name || '익명'}</span>
                                                <span class="text-slate-300">|</span>
                                                <span class="text-slate-400">${mDate}</span>
                                                ${currentUserId && m.author === currentUserId ? `
                                                    <span class="text-slate-300">|</span>
                                                    <button onclick="handleManualEditStart('${m.id}')" class="text-indigo-500 hover:underline">수정</button>
                                                    <button onclick="handleManualDelete('${m.id}')" class="text-rose-400 hover:underline">삭제</button>
                                                ` : ''}
                                            </div>
                                            <div class="text-[11px] text-slate-400">${mAuthor.department || ''}</div>
                                        </div>
                                    </div>

                                    <button onclick="handleManualLike('${m.id}')" class="flex items-center gap-2 px-5 py-2.5 rounded-full border transition-all ${hasLiked ? 'bg-rose-50 border-rose-100 text-rose-500' : 'bg-white border-slate-200 text-slate-400 hover:border-rose-200 hover:text-rose-400'}">
                                        <i data-lucide="heart" class="w-4 h-4 ${hasLiked ? 'fill-current' : ''}"></i>
                                        <span class="text-sm font-bold">${likes.length}</span>
                                    </button>
                                </div>

                                <div class="ql-editor prose prose-slate max-w-none text-slate-700 leading-relaxed text-base">${contentHtml}</div>
                                ${mFiles.length > 0 ? `
                                    <div class="mt-16 pt-10 border-t border-slate-100">
                                        <h5 class="text-xs font-bold text-slate-400 uppercase mb-4 flex items-center gap-2"><i data-lucide="paperclip" class="w-4 h-4"></i>첨부파일 (${mFiles.length})</h5>
                                        <div class="flex flex-wrap gap-2">
                                            ${mFiles.map(fn => `<a href="${pb.files.getUrl(m, fn)}" target="_blank" class="flex items-center gap-2 px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-600 hover:text-indigo-600 transition-all shadow-sm"><i data-lucide="download" class="w-4 h-4"></i>${fn}</a>`).join('')}
                                        </div>
                                    </div>
                                ` : ''}
                            </div>
                        </article>
                        
                        <div class="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
                            <div class="p-8 border-b border-slate-100"><h4 class="text-xl font-bold text-slate-800">댓글 <span class="text-indigo-600">${allComments.length}</span></h4></div>
                            <div class="p-8 bg-slate-50/50">
                                <form onsubmit="handleManualComment(event, '${m.id}')" class="space-y-4">
                                    <div class="flex gap-4">
                                        <div class="w-10 h-10 rounded-full bg-indigo-50 flex items-center justify-center flex-shrink-0 border border-indigo-100 overflow-hidden">
                                            ${pb.authStore.model.avatar ? `<img src="${pb.files.getUrl(pb.authStore.model, pb.authStore.model.avatar)}" class="w-full h-full object-cover">` : `<i data-lucide="user" class="w-5 h-5 text-indigo-300"></i>`}
                                        </div>
                                        <div class="flex-1 bg-white rounded-2xl border border-slate-200 p-2 focus-within:border-indigo-300 transition-all shadow-sm">
                                            <textarea id="comment-text" placeholder="의견을 남겨보세요..." class="w-full px-4 py-2 border-none outline-none resize-none placeholder:text-slate-300 text-slate-700 min-h-[80px] bg-transparent"></textarea>
                                            
                                            <!-- Comment Image Preview Container -->
                                            <div id="comment-image-preview" class="flex flex-wrap gap-2 p-2 hidden"></div>

                                            <div class="flex justify-between items-center p-2 border-t border-slate-50">
                                                <div class="flex items-center gap-1">
                                                    <label class="p-2 hover:bg-slate-50 rounded-lg cursor-pointer transition-all text-slate-400 hover:text-indigo-600">
                                                        <i data-lucide="image" class="w-5 h-5"></i>
                                                        <input type="file" id="comment-files" multiple accept="image/*" class="hidden" onchange="handleCommentFileChange(event)">
                                                    </label>
                                                </div>
                                                <button type="submit" class="px-6 py-2 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-all shadow-md shadow-indigo-100">등록하기</button>
                                            </div>
                                        </div>
                                    </div>
                                </form>
                            </div>
                            
                            <div class="p-8 space-y-8">
                                ${parentComments.length === 0 ? `
                                    <div class="py-12 text-center">
                                        <i data-lucide="message-square" class="w-12 h-12 text-slate-100 mx-auto mb-4"></i>
                                        <p class="text-slate-400">첫 번째 댓글을 남겨보세요!</p>
                                    </div>
                                ` : parentComments.map(c => {
                    const cAuthor = c.expand?.author || {};
                    const cAvatar = cAuthor.avatar ? pb.files.getUrl(cAuthor, cAuthor.avatar) : '';
                    const cDate = new Date(c.created).toLocaleString();
                    const cFiles = c.file || [];
                    const isMe = currentUserId && c.author === currentUserId;

                    return `
                                        <div class="flex gap-4 group">
                                            <div class="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center flex-shrink-0 overflow-hidden border border-slate-200">
                                                ${cAvatar ? `<img src="${cAvatar}" class="w-full h-full object-cover">` : `<i data-lucide="user" class="w-5 h-5 text-slate-300"></i>`}
                                            </div>
                                            <div class="flex-1">
                                                <div class="flex items-center justify-between mb-1">
                                                    <div class="flex items-center gap-2">
                                                        <span class="font-bold text-slate-800 text-sm">${cAuthor.name || '익명'}</span>
                                                        <span class="text-slate-400 text-[10px]">${cDate}</span>
                                                    </div>
                                                    ${isMe ? `
                                                        <button onclick="handleDeleteComment('${c.id}', '${m.id}')" class="text-slate-300 hover:text-rose-500 transition-all opacity-0 group-hover:opacity-100">
                                                            <i data-lucide="trash-2" class="w-3.5 h-3.5"></i>
                                                        </button>
                                                    ` : ''}
                                                </div>
                                                <div class="text-slate-600 text-sm leading-relaxed">${c.content}</div>
                                                
                                                <!-- Comment Images -->
                                                ${cFiles.length > 0 ? `
                                                    <div class="flex flex-wrap gap-2 mt-3">
                                                        ${cFiles.map(fn => `
                                                            <img src="${pb.files.getUrl(c, fn)}" class="max-w-[200px] max-h-[300px] rounded-xl border border-slate-100 shadow-sm cursor-zoom-in" onclick="openImageViewer(this.src)">
                                                        `).join('')}
                                                    </div>
                                                ` : ''}
                                                
                                                <div class="flex items-center gap-4 mt-3">
                                                    <button class="text-xs text-slate-400 hover:text-indigo-600 font-bold flex items-center gap-1"><i data-lucide="heart" class="w-3 h-3"></i>좋아요</button>
                                                    <button class="text-xs text-slate-400 hover:text-indigo-600 font-bold flex items-center gap-1"><i data-lucide="message-circle" class="w-3 h-3"></i>답글</button>
                                                </div>
                                            </div>
                                        </div>
                                    `;
                }).join('')}
                            </div>
                        </div>
                    </div>
                `;
                break;

            case 'manual-write':
                console.log('Rendering Manual Write Mode, isEdit:', safeState.isEditMode);
                container.innerHTML = `
                    <div class="h-full w-full max-w-[1600px] mx-auto px-4 py-6 animate-fade-in">
                        <div class="h-full min-h-[700px] flex flex-col bg-white rounded-3xl shadow-premium border border-slate-100 overflow-hidden">
                            <div class="flex justify-between items-center px-8 py-5 border-b border-slate-50 bg-slate-50/30">
                                <div class="flex items-center gap-4">
                                    <button onclick="switchTab('manual')" class="p-2 hover:bg-white rounded-full transition-all hover:scale-110 active:scale-95 text-slate-400 hover:text-indigo-600">
                                        <i data-lucide="arrow-left" class="w-6 h-6"></i>
                                    </button>
                                    <span class="font-black text-slate-800 tracking-tight">${safeState.isEditMode ? '매뉴얼 수정' : '새 매뉴얼 작성'}</span>
                                </div>
                                <div class="flex items-center gap-3">
                                    <label class="p-2.5 hover:bg-white rounded-xl cursor-pointer flex items-center gap-2 text-xs font-black uppercase tracking-widest text-slate-400 hover:text-indigo-600 transition-all">
                                        <i data-lucide="paperclip" class="w-5 h-5"></i>
                                        <span>Files</span>
                                        <input type="file" id="manual-files" multiple class="hidden" onchange="handleManualFileChange(event)">
                                    </label>
                                    <button onclick="handleManualPublish()" class="px-8 py-2.5 bg-indigo-600 text-white rounded-xl font-black text-xs shadow-xl shadow-indigo-100 hover:scale-105 active:scale-95 transition-all">
                                        ${safeState.isEditMode ? '수정 완료' : '발행하기'}
                                    </button>
                                </div>
                            </div>
                            <div class="flex-1 overflow-y-auto flex flex-col custom-scrollbar bg-slate-50/20">
                                <div class="max-w-6xl mx-auto w-full px-6">
                                    <div class="p-12 pb-4 space-y-10">
                                        <input type="text" id="manual-title" placeholder="제목을 입력하세요" 
                                            class="w-full text-5xl font-black border-none outline-none placeholder:text-slate-200 text-slate-900 bg-transparent tracking-tighter">
                                        <div class="w-full h-px bg-slate-100"></div>
                                    </div>
                                    <!-- Quill Editor Container -->
                                    <div id="editor-wrapper" class="flex-1 px-12 pb-12">
                                        <div id="manual-editor" class="text-xl border-none ql-premium" style="font-size: 1.125rem; border: none; min-h-[800px]"></div>
                                    </div>
                                </div>
                            </div>
                            <div id="attached-files-container" class="px-8 py-4 bg-slate-50/50 border-t border-slate-50 hidden">
                                <div id="manual-file-list" class="flex flex-wrap gap-2"></div>
                            </div>
                        </div>
                    </div>
                `;
                break;

            case 'timeline':
                const qUser = pb.authStore.model || {};
                const qAvatar = qUser.avatar ? pb.files.getUrl(qUser, qUser.avatar) : '';

                container.innerHTML = `
                    <div class="max-w-[1440px] mx-auto px-10 py-12 space-y-8 animate-fade-in pb-20">
                        <div class="mb-4">
                            <h2 class="text-3xl font-black text-slate-900 tracking-tight mb-2">Q&A 피드</h2>
                            <p class="text-slate-400 font-bold text-sm">궁금한 점을 자유롭게 묻고 답해 보세요.</p>
                        </div>
                        <!-- Q&A Composer -->
                        <div class="bg-white rounded-[2.5rem] shadow-premium border border-slate-100 overflow-hidden">
                            <div class="p-8">
                                <div class="flex gap-6">
                                    <div class="w-12 h-12 rounded-full bg-indigo-50 flex items-center justify-center overflow-hidden flex-shrink-0 border border-indigo-100">
                                        ${qAvatar ? `<img src="${qAvatar}" class="w-full h-full object-cover">` : `<i data-lucide="user" class="w-6 h-6 text-indigo-300"></i>`}
                                    </div>
                                    <div class="flex-1 space-y-4">
                                        <textarea id="qa-text" placeholder="무엇이 궁금하신가요?" class="w-full text-xl border-none outline-none resize-none placeholder:text-slate-200 text-slate-700 leading-relaxed py-2 min-h-[100px] bg-transparent"></textarea>
                                        
                                        <!-- Image Preview Container -->
                                        <div id="qa-image-preview" class="flex flex-wrap gap-2 hidden"></div>
                                        
                                        <div class="flex justify-between items-center pt-4 border-t border-slate-50">
                                            <div class="flex items-center gap-2">
                                                <label class="p-2.5 hover:bg-slate-50 rounded-xl cursor-pointer transition-all text-slate-400 hover:text-indigo-600">
                                                    <i data-lucide="image" class="w-6 h-6"></i>
                                                    <input type="file" id="qa-files" multiple accept="image/*" class="hidden" onchange="handleQAFileChange(event)">
                                                </label>
                                            </div>
                                            <button onclick="handleQAPublish()" class="px-8 py-3.5 btn-primary rounded-2xl font-black text-sm">질문하기</button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <!-- Q&A Feed -->
                        <div id="qa-feed" class="space-y-6">
                            <div class="p-20 text-center bg-white rounded-[2.5rem] border border-slate-100 shadow-premium">
                                <div class="animate-spin w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full mx-auto mb-4"></div>
                                <p class="text-slate-400 font-bold">피드를 불러오는 중...</p>
                            </div>
                        </div>
                    </div>
                `;
                break;

            case 'tasks':
                try {
                    const projects = safeState.projects || [];
                    const todo = projects.filter(p => (p.status || 'todo') === 'todo');
                    const progress = projects.filter(p => p.status === 'progress');
                    const done = projects.filter(p => p.status === 'done');

                    container.innerHTML = `
                        <div class="max-w-[1440px] mx-auto px-10 py-12 kanban-container animate-fade-in h-full overflow-y-auto custom-scrollbar">
                            <div class="flex justify-between items-end mb-12">
                                <div>
                                    <h2 class="text-3xl font-black text-slate-900 tracking-tight mb-2">프로젝트 보드</h2>
                                    <p class="text-slate-400 font-bold text-sm">AX Crew의 실시간 과제 현황입니다.</p>
                                </div>
                                <button onclick="openProjectCreate()" class="px-8 py-3.5 btn-primary rounded-2xl font-black text-sm flex items-center gap-2">
                                    <i data-lucide="plus" class="w-5 h-5"></i>
                                    새 과제 추가
                                </button>
                            </div>
                            
                            <div class="grid grid-cols-1 md:grid-cols-3 gap-8 items-start pb-20">
                                <!-- TO-DO Column -->
                                <div class="kanban-col flex flex-col gap-6">
                                    <div class="flex items-center gap-2 px-4 mb-2">
                                        <span class="w-2.5 h-2.5 rounded-full bg-amber-400 shadow-lg shadow-amber-200 animate-pulse"></span>
                                        <h3 class="text-[10px] font-black text-amber-600 uppercase tracking-widest">TO-DO</h3>
                                        <span class="text-[10px] font-black text-amber-200 ml-1">${todo.length}</span>
                                    </div>
                                    <div class="space-y-4" id="col-todo">
                                        ${todo.length > 0 ? todo.map(p => renderProjectCard(p)).join('') : `
                                            <div class="py-20 border-2 border-dashed border-white/50 rounded-[3rem] flex flex-col items-center justify-center text-center px-6">
                                                <div class="w-16 h-16 bg-white/50 rounded-2xl flex items-center justify-center mb-4 shadow-sm text-slate-300">
                                                    <i data-lucide="inbox" class="w-8 h-8"></i>
                                                </div>
                                                <p class="text-slate-400 font-bold text-xs leading-relaxed">진행 전 과제가<br>없습니다.</p>
                                            </div>
                                        `}
                                    </div>
                                </div>

                                <!-- IN PROGRESS Column -->
                                <div class="kanban-col flex flex-col gap-6">
                                    <div class="flex items-center gap-2 px-4 mb-2">
                                        <span class="w-2.5 h-2.5 rounded-full bg-indigo-500 shadow-lg shadow-indigo-200"></span>
                                        <h3 class="text-[10px] font-black text-slate-400 uppercase tracking-widest">IN PROGRESS</h3>
                                        <span class="text-[10px] font-black text-slate-300 ml-1">${progress.length}</span>
                                    </div>
                                    <div class="space-y-4" id="col-progress">
                                        ${progress.length > 0 ? progress.map(p => renderProjectCard(p)).join('') : `
                                            <div class="py-24 flex flex-col items-center justify-center text-center opacity-30">
                                                <i data-lucide="rocket" class="w-24 h-24 text-slate-400 mb-8"></i>
                                                <p class="text-slate-500 font-bold text-sm">진행 중인 과제가<br>없습니다.</p>
                                            </div>
                                        `}
                                    </div>
                                </div>

                                <!-- DONE Column -->
                                <div class="kanban-col flex flex-col gap-6">
                                    <div class="flex items-center gap-2 px-4 mb-2">
                                        <span class="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-lg shadow-emerald-200"></span>
                                        <h3 class="text-[10px] font-black text-slate-400 uppercase tracking-widest">DONE</h3>
                                        <span class="text-[10px] font-black text-slate-300 ml-1">${done.length}</span>
                                    </div>
                                    <div class="space-y-4" id="col-done">
                                        ${done.length > 0 ? done.map(p => renderProjectCard(p)).join('') : `
                                            <div class="py-24 flex flex-col items-center justify-center text-center opacity-30">
                                                <i data-lucide="award" class="w-24 h-24 text-slate-400 mb-8"></i>
                                                <p class="text-slate-500 font-bold text-sm">완료된 과제가<br>없습니다.</p>
                                            </div>
                                        `}
                                    </div>
                                </div>
                            </div>
                        </div>
                    `;
                } catch (err) {
                    console.error('Task Render Error:', err);
                    container.innerHTML = `<div class="p-12 text-center text-slate-400">보드 로딩 중 오류가 발생했습니다.</div>`;
                }
                break;
        }
    } catch (err) {
        console.error('Render Error:', err);
        container.innerHTML = `<div class="p-12 text-center bg-white rounded-3xl border border-slate-200 text-rose-500">
            <h3 class="font-bold text-xl mb-2">화면 로딩 오류</h3>
            <p class="text-sm opacity-70">${err.message}</p>
            <button onclick="location.reload()" class="mt-4 px-6 py-2 bg-rose-500 text-white rounded-xl">페이지 새로고침</button>
        </div>`;
    }

    if (typeof lucide !== 'undefined') lucide.createIcons();
}

/**
 * Render individual project card for Kanban board
 */
function renderProjectCard(p) {
    const owner = p.expand?.owner || {};
    const avatarUrl = owner.avatar ? pb.files.getUrl(owner, owner.avatar) : '';
    const progress = p.progress || 0;
    const dueDate = p.due_date ? new Date(p.due_date).toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' }) : '미정';

    return `
        <div onclick="openProjectDetail('${p.id}')" class="project-card cursor-pointer group animate-fade-in-up">
            <div class="flex justify-between items-start mb-6">
                <span class="tag-label uppercase tracking-tighter">AX-${p.id.slice(0, 4).toUpperCase()}</span>
                <div class="w-8 h-8 rounded-full bg-slate-50 border border-slate-200 flex items-center justify-center overflow-hidden shadow-sm">
                    ${avatarUrl ? `<img src="${avatarUrl}" class="w-full h-full object-cover">` : `<i data-lucide="user" class="w-4 h-4 text-slate-300"></i>`}
                </div>
            </div>
            
            <h4 class="font-black text-slate-900 text-lg mb-6 line-clamp-2 group-hover:text-indigo-600 transition-colors tracking-tight leading-snug">${p.title || '제목 없음'}</h4>
            
            <div class="space-y-4">
                <div>
                    <div class="flex justify-between text-[9px] mb-2 font-black uppercase tracking-widest">
                        <span class="text-slate-400">Progress</span>
                        <span class="text-slate-900">${progress}%</span>
                    </div>
                    <div class="progress-bar-bg overflow-hidden">
                        <div class="progress-bar-fill" style="width: ${progress}%"></div>
                    </div>
                </div>
                
                <div class="flex items-center justify-between pt-3 border-t border-slate-50 mt-4">
                    <div class="flex items-center gap-1.5 text-slate-400">
                        <i data-lucide="calendar" class="w-3.5 h-3.5"></i>
                        <span class="text-[10px] font-bold tracking-tight">${dueDate}</span>
                    </div>
                    <div class="flex items-center gap-1.5 text-slate-300 group-hover:text-indigo-400 transition-colors">
                        <i data-lucide="message-square" class="w-4 h-4"></i>
                        <span class="text-[10px] font-black">0</span>
                    </div>
                </div>
            </div>
        </div>
    `;
}
