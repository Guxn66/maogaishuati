/**
 * 刷题网站主应用逻辑 - 多题库版本
 */

// ========================================
// 状态管理
// ========================================
const AppState = {
    currentMode: 'sequential',
    currentType: 'all',
    currentQuestions: [],
    currentIndex: 0,
    selectedAnswers: {},
    isAnswerSubmitted: false,
    
    stats: {
        completed: 0,
        correct: 0,
        wrong: 0,
        wrongQuestions: [],
        starredQuestions: [],
        streakDays: 0,
        lastPracticeDate: null
    },
    
    session: {
        correct: 0,
        wrong: 0,
        answers: {}
    },
    
    loadStats() {
        const saved = localStorage.getItem('quizStats');
        if (saved) {
            try {
                this.stats = { ...this.stats, ...JSON.parse(saved) };
            } catch (e) {
                console.error('加载统计数据失败:', e);
            }
        }
        this.updateStreak();
    },
    
    saveStats() {
        this.stats.lastPracticeDate = new Date().toDateString();
        localStorage.setItem('quizStats', JSON.stringify(this.stats));
    },
    
    updateStreak() {
        const today = new Date().toDateString();
        const yesterday = new Date(Date.now() - 86400000).toDateString();
        
        if (this.stats.lastPracticeDate === today) {
            // 今天已经练习过
        } else if (this.stats.lastPracticeDate === yesterday) {
            this.stats.streakDays++;
        } else if (this.stats.lastPracticeDate !== today) {
            this.stats.streakDays = 1;
        }
    },
    
    resetSession() {
        this.session = { correct: 0, wrong: 0, answers: {} };
        this.currentIndex = 0;
        this.selectedAnswers = {};
        this.isAnswerSubmitted = false;
    }
};

// ========================================
// DOM 元素引用
// ========================================
const DOM = {
    // 侧边栏
    sidebar: document.getElementById('sidebar'),
    sidebarOverlay: document.getElementById('sidebar-overlay'),
    sidebarToggle: document.getElementById('sidebar-toggle'),
    sidebarClose: document.getElementById('sidebar-close'),
    sidebarCategories: document.getElementById('sidebar-categories'),
    sidebarBanks: document.getElementById('sidebar-banks'),
    addBankBtn: document.getElementById('add-bank-btn'),
    
    // 导航栏
    themeToggle: document.getElementById('theme-toggle'),
    currentBankIndicator: document.getElementById('current-bank-indicator'),
    currentBankName: document.getElementById('current-bank-name'),
    currentBankCount: document.getElementById('current-bank-count'),
    
    // 统计卡片
    totalQuestions: document.getElementById('total-questions'),
    completedCount: document.getElementById('completed-count'),
    accuracyRate: document.getElementById('accuracy-rate'),
    streakDays: document.getElementById('streak-days'),
    
    // 模式按钮
    modeSequential: document.getElementById('mode-sequential'),
    modeRandom: document.getElementById('mode-random'),
    modeWrong: document.getElementById('mode-wrong'),
    modeStarred: document.getElementById('mode-starred'),
    
    // 筛选
    typeFilters: document.getElementById('type-filters'),
    
    // 开始按钮
    startPractice: document.getElementById('start-practice'),
    
    // 导入功能
    importBtn: document.getElementById('import-btn'),
    importFile: document.getElementById('import-file'),
    downloadTemplate: document.getElementById('download-template'),
    
    // 添加题库模态框
    addBankModal: document.getElementById('add-bank-modal'),
    closeAddBank: document.getElementById('close-add-bank'),
    bankNameInput: document.getElementById('bank-name-input'),
    bankCategoryInput: document.getElementById('bank-category-input'),
    categoryList: document.getElementById('category-list'),
    fileDropZone: document.getElementById('file-drop-zone'),
    bankFileInput: document.getElementById('bank-file-input'),
    cancelAddBank: document.getElementById('cancel-add-bank'),
    confirmAddBank: document.getElementById('confirm-add-bank'),
    
    // 练习模态框
    practiceModal: document.getElementById('practice-modal'),
    currentIndexSpan: document.getElementById('current-index'),
    totalCountSpan: document.getElementById('total-count'),
    progressFill: document.getElementById('progress-fill'),
    questionType: document.getElementById('question-type'),
    questionText: document.getElementById('question-text'),
    optionsArea: document.getElementById('options-area'),
    answerFeedback: document.getElementById('answer-feedback'),
    correctAnswer: document.getElementById('correct-answer'),
    explanation: document.getElementById('explanation'),
    starBtn: document.getElementById('star-btn'),
    closeModal: document.getElementById('close-modal'),
    prevBtn: document.getElementById('prev-btn'),
    submitBtn: document.getElementById('submit-btn'),
    nextBtn: document.getElementById('next-btn'),
    
    // 结果模态框
    resultModal: document.getElementById('result-modal'),
    resultCorrect: document.getElementById('result-correct'),
    resultWrong: document.getElementById('result-wrong'),
    resultAccuracy: document.getElementById('result-accuracy'),
    reviewWrong: document.getElementById('review-wrong'),
    restartPractice: document.getElementById('restart-practice'),
    
    // Toast
    toast: document.getElementById('toast')
};

// ========================================
// Toast 通知
// ========================================
const Toast = {
    show(message, type = 'success') {
        const toast = DOM.toast;
        const messageEl = toast.querySelector('.toast-message');
        
        messageEl.textContent = message;
        toast.className = 'toast show ' + type;
        
        setTimeout(() => {
            toast.classList.remove('show');
        }, 3000);
    },
    
    success(message) {
        this.show(message, 'success');
    },
    
    error(message) {
        this.show(message, 'error');
    }
};

// ========================================
// 主题管理
// ========================================
const ThemeManager = {
    init() {
        const savedTheme = localStorage.getItem('theme') || 'light';
        this.setTheme(savedTheme);
        
        DOM.themeToggle?.addEventListener('click', () => {
            const current = document.documentElement.getAttribute('data-theme');
            this.setTheme(current === 'dark' ? 'light' : 'dark');
        });
    },
    
    setTheme(theme) {
        document.documentElement.setAttribute('data-theme', theme);
        localStorage.setItem('theme', theme);
    }
};

// ========================================
// 侧边栏管理
// ========================================
const Sidebar = {
    currentCategory: 'all',
    selectedFile: null,
    
    init() {
        this.renderCategories();
        this.renderBanks();
        this.bindEvents();
    },
    
    bindEvents() {
        // 打开/关闭侧边栏
        DOM.sidebarToggle?.addEventListener('click', () => this.open());
        DOM.sidebarClose?.addEventListener('click', () => this.close());
        DOM.sidebarOverlay?.addEventListener('click', () => this.close());
        DOM.currentBankIndicator?.addEventListener('click', () => this.open());
        
        // 分类筛选
        DOM.sidebarCategories?.addEventListener('click', (e) => {
            if (e.target.classList.contains('category-btn')) {
                this.currentCategory = e.target.dataset.category;
                this.renderBanks();
                
                document.querySelectorAll('.category-btn').forEach(btn => {
                    btn.classList.toggle('active', btn.dataset.category === this.currentCategory);
                });
            }
        });
        
        // 添加题库
        DOM.addBankBtn?.addEventListener('click', () => {
            this.close();
            this.openAddBankModal();
        });
    },
    
    open() {
        DOM.sidebar?.classList.add('open');
        DOM.sidebarOverlay?.classList.add('active');
    },
    
    close() {
        DOM.sidebar?.classList.remove('open');
        DOM.sidebarOverlay?.classList.remove('active');
    },
    
    renderCategories() {
        if (!DOM.sidebarCategories) return;
        
        const categories = ['all', ...Array.from(BankManager.categories)];
        DOM.sidebarCategories.innerHTML = categories.map(cat => `
            <button class="category-btn ${cat === this.currentCategory ? 'active' : ''}" 
                    data-category="${cat}">
                ${cat === 'all' ? '全部' : cat}
            </button>
        `).join('');
    },
    
    renderBanks() {
        if (!DOM.sidebarBanks) return;
        
        const banks = BankManager.getBanksByCategory(this.currentCategory);
        
        if (banks.length === 0) {
            DOM.sidebarBanks.innerHTML = '<p style="text-align:center;color:var(--text-muted);padding:2rem;">暂无题库</p>';
            return;
        }
        
        DOM.sidebarBanks.innerHTML = banks.map(bank => `
            <div class="bank-item ${bank.id === BankManager.currentBankId ? 'active' : ''}" 
                 data-bank-id="${bank.id}">
                <div class="bank-item-header">
                    <span class="bank-item-name">${bank.name}</span>
                    <span class="bank-item-count">${bank.questionCount}题</span>
                </div>
                <div class="bank-item-category">${bank.category}</div>
                <div class="bank-item-actions">
                    <button onclick="Sidebar.selectBank('${bank.id}')">选择</button>
                    <button onclick="Sidebar.deleteBank('${bank.id}')" class="delete">删除</button>
                </div>
            </div>
        `).join('');
    },
    
    selectBank(bankId) {
        BankManager.selectBank(bankId);
        this.renderBanks();
        this.close();
        UI.updateCurrentBank();
        UI.updateStats();
        Toast.success('已切换题库');
    },
    
    deleteBank(bankId) {
        const bank = BankManager.banks[bankId];
        if (!bank) return;
        
        if (confirm(`确定要删除题库"${bank.name}"吗？此操作不可恢复！`)) {
            BankManager.deleteBank(bankId);
            this.renderCategories();
            this.renderBanks();
            UI.updateCurrentBank();
            UI.updateStats();
            Toast.success('题库已删除');
        }
    },
    
    openAddBankModal() {
        DOM.addBankModal?.classList.add('active');
        DOM.bankNameInput.value = '';
        DOM.bankCategoryInput.value = '';
        this.selectedFile = null;
        DOM.fileDropZone?.classList.remove('has-file');
        
        // 更新分类选项
        const categories = Array.from(BankManager.categories);
        DOM.categoryList.innerHTML = categories.map(cat => 
            `<option value="${cat}">`
        ).join('');
    },
    
    closeAddBankModal() {
        DOM.addBankModal?.classList.remove('active');
    }
};

// ========================================
// UI 更新函数
// ========================================
const UI = {
    updateCurrentBank() {
        const bank = BankManager.getCurrentBank();
        if (!bank) {
            DOM.currentBankName.textContent = '选择题库';
            DOM.currentBankCount.textContent = '0题';
            return;
        }
        
        DOM.currentBankName.textContent = bank.name;
        DOM.currentBankCount.textContent = `${bank.questions?.length || 0}题`;
    },
    
    updateStats() {
        const questions = BankManager.getQuestions();
        DOM.totalQuestions.textContent = questions.length;
        DOM.completedCount.textContent = AppState.stats.completed;
        
        const total = AppState.stats.correct + AppState.stats.wrong;
        const rate = total > 0 ? Math.round((AppState.stats.correct / total) * 100) : 0;
        DOM.accuracyRate.textContent = rate + '%';
        
        DOM.streakDays.textContent = AppState.stats.streakDays;
    },
    
    updateModeSelection(mode) {
        document.querySelectorAll('.mode-card').forEach(card => {
            card.classList.remove('active');
        });
        
        const modeMap = {
            'sequential': DOM.modeSequential,
            'random': DOM.modeRandom,
            'wrong': DOM.modeWrong,
            'starred': DOM.modeStarred
        };
        
        modeMap[mode]?.classList.add('active');
    },
    
    updateTypeFilter(type) {
        document.querySelectorAll('.filter-tag').forEach(tag => {
            tag.classList.toggle('active', tag.dataset.type === type);
        });
    },
    
    renderQuestion() {
        const question = AppState.currentQuestions[AppState.currentIndex];
        if (!question) return;
        
        DOM.currentIndexSpan.textContent = AppState.currentIndex + 1;
        DOM.totalCountSpan.textContent = AppState.currentQuestions.length;
        const progress = ((AppState.currentIndex + 1) / AppState.currentQuestions.length) * 100;
        DOM.progressFill.style.width = progress + '%';
        
        const typeMap = {
            'single': '单选题',
            'multiple': '多选题',
            'judge': '判断题',
            'fill': '填空题'
        };
        DOM.questionType.textContent = typeMap[question.type] || question.type;
        DOM.questionText.textContent = question.question;
        
        DOM.optionsArea.innerHTML = '';
        
        if (question.type === 'fill') {
            const input = document.createElement('input');
            input.type = 'text';
            input.className = 'fill-input';
            input.placeholder = '请输入答案...';
            input.value = AppState.selectedAnswers[question.id] || '';
            input.addEventListener('input', (e) => {
                AppState.selectedAnswers[question.id] = e.target.value;
            });
            DOM.optionsArea.appendChild(input);
            
            input.style.cssText = `
                width: 100%;
                padding: 1rem 1.25rem;
                font-size: 1rem;
                border: 2px solid var(--border-color);
                border-radius: 0.75rem;
                background: var(--bg-tertiary);
                color: var(--text-primary);
                outline: none;
                transition: all 0.2s ease;
            `;
            input.addEventListener('focus', () => {
                input.style.borderColor = 'var(--accent-primary)';
            });
            input.addEventListener('blur', () => {
                input.style.borderColor = 'var(--border-color)';
            });
        } else {
            const labels = ['A', 'B', 'C', 'D', 'E', 'F'];
            question.options.forEach((option, index) => {
                const item = document.createElement('div');
                item.className = 'option-item';
                item.dataset.index = index;
                
                const selected = AppState.selectedAnswers[question.id];
                if (question.type === 'multiple') {
                    if (Array.isArray(selected) && selected.includes(index)) {
                        item.classList.add('selected');
                    }
                } else {
                    if (selected === index) {
                        item.classList.add('selected');
                    }
                }
                
                item.innerHTML = `
                    <span class="option-label">${labels[index]}</span>
                    <span class="option-text">${option}</span>
                `;
                
                item.addEventListener('click', () => this.handleOptionClick(question, index, item));
                DOM.optionsArea.appendChild(item);
            });
        }
        
        const isStarred = AppState.stats.starredQuestions.includes(question.id);
        DOM.starBtn.textContent = isStarred ? '⭐' : '☆';
        
        DOM.answerFeedback.classList.remove('show', 'correct', 'wrong');
        
        AppState.isAnswerSubmitted = false;
        DOM.submitBtn.classList.remove('hidden');
        DOM.nextBtn.classList.add('hidden');
        DOM.prevBtn.disabled = AppState.currentIndex === 0;
        
        if (AppState.session.answers[question.id] !== undefined) {
            this.showAnswerFeedback(question, AppState.session.answers[question.id]);
        }
    },
    
    handleOptionClick(question, index, item) {
        if (AppState.isAnswerSubmitted) return;
        
        if (question.type === 'multiple') {
            let selected = AppState.selectedAnswers[question.id] || [];
            if (!Array.isArray(selected)) selected = [];
            
            if (selected.includes(index)) {
                selected = selected.filter(i => i !== index);
                item.classList.remove('selected');
            } else {
                selected.push(index);
                item.classList.add('selected');
            }
            AppState.selectedAnswers[question.id] = selected;
        } else {
            document.querySelectorAll('.option-item').forEach(opt => {
                opt.classList.remove('selected');
            });
            item.classList.add('selected');
            AppState.selectedAnswers[question.id] = index;
        }
    },
    
    submitAnswer() {
        const question = AppState.currentQuestions[AppState.currentIndex];
        if (!question) return;
        
        const userAnswer = AppState.selectedAnswers[question.id];
        
        if (userAnswer === undefined || 
            (question.type === 'multiple' && (!Array.isArray(userAnswer) || userAnswer.length === 0)) ||
            (question.type === 'fill' && !userAnswer.trim())) {
            Toast.error('请先作答再提交！');
            return;
        }
        
        let isCorrect = false;
        if (question.type === 'fill') {
            isCorrect = userAnswer.trim().toLowerCase() === question.answer.trim().toLowerCase();
        } else if (question.type === 'multiple') {
            const sorted1 = [...userAnswer].sort();
            const sorted2 = [...question.answer].sort();
            isCorrect = sorted1.length === sorted2.length && 
                       sorted1.every((v, i) => v === sorted2[i]);
        } else {
            isCorrect = userAnswer === question.answer;
        }
        
        AppState.session.answers[question.id] = isCorrect;
        
        if (isCorrect) {
            AppState.session.correct++;
            if (!AppState.stats.wrongQuestions.includes(question.id)) {
                AppState.stats.correct++;
            }
            AppState.stats.completed++;
            AppState.saveStats();
            
            // 答对了显示快速反馈，然后跳下一题
            AppState.isAnswerSubmitted = true;
            
            // 标记正确选项为绿色
            const options = document.querySelectorAll('.option-item');
            options.forEach((opt, index) => {
                if (question.type === 'multiple') {
                    if (question.answer.includes(index)) {
                        opt.classList.add('correct');
                    }
                } else if (question.type !== 'fill') {
                    if (index === question.answer) {
                        opt.classList.add('correct');
                    }
                }
            });
            
            // 显示"✓ 正确！"提示
            const feedback = DOM.answerFeedback;
            const feedbackIcon = feedback.querySelector('.feedback-icon');
            const feedbackText = feedback.querySelector('.feedback-text');
            
            feedbackIcon.textContent = '✅';
            feedbackText.textContent = '回答正确！';
            feedback.classList.add('show', 'correct');
            DOM.correctAnswer.textContent = '';
            DOM.explanation.textContent = '';
            
            // 0.8秒后自动跳转
            setTimeout(() => {
                if (AppState.currentIndex < AppState.currentQuestions.length - 1) {
                    AppState.currentIndex++;
                    this.renderQuestion();
                } else {
                    this.showResult();
                }
            }, 800);
            
        } else {
            AppState.session.wrong++;
            AppState.stats.wrong++;
            if (!AppState.stats.wrongQuestions.includes(question.id)) {
                AppState.stats.wrongQuestions.push(question.id);
            }
            AppState.stats.completed++;
            AppState.saveStats();
            
            // 答错了显示反馈
            this.showAnswerFeedback(question, isCorrect);
        }
    },
    
    showAnswerFeedback(question, isCorrect) {
        AppState.isAnswerSubmitted = true;
        
        const options = document.querySelectorAll('.option-item');
        options.forEach((opt, index) => {
            if (question.type === 'multiple') {
                if (question.answer.includes(index)) {
                    opt.classList.add('correct');
                }
                if (AppState.selectedAnswers[question.id]?.includes(index) && 
                    !question.answer.includes(index)) {
                    opt.classList.add('wrong');
                }
            } else if (question.type !== 'fill') {
                if (index === question.answer) {
                    opt.classList.add('correct');
                }
                if (index === AppState.selectedAnswers[question.id] && 
                    index !== question.answer) {
                    opt.classList.add('wrong');
                }
            }
        });
        
        const feedbackIcon = DOM.answerFeedback.querySelector('.feedback-icon');
        const feedbackText = DOM.answerFeedback.querySelector('.feedback-text');
        
        if (isCorrect) {
            feedbackIcon.textContent = '✅';
            feedbackText.textContent = '回答正确！';
            DOM.answerFeedback.classList.add('correct');
            AppState.stats.wrongQuestions = AppState.stats.wrongQuestions.filter(
                id => id !== question.id
            );
        } else {
            feedbackIcon.textContent = '❌';
            feedbackText.textContent = '回答错误';
            DOM.answerFeedback.classList.add('wrong');
            
            if (question.type === 'fill') {
                DOM.correctAnswer.textContent = `正确答案：${question.answer}`;
            } else if (question.type === 'multiple') {
                const labels = ['A', 'B', 'C', 'D', 'E', 'F'];
                const correct = question.answer.map(i => labels[i]).join('、');
                DOM.correctAnswer.textContent = `正确答案：${correct}`;
            } else {
                const labels = ['A', 'B', 'C', 'D', 'E', 'F'];
                DOM.correctAnswer.textContent = `正确答案：${labels[question.answer]}`;
            }
        }
        
        DOM.explanation.textContent = question.explanation || '';
        DOM.answerFeedback.classList.add('show');
        
        DOM.submitBtn.classList.add('hidden');
        DOM.nextBtn.classList.remove('hidden');
        
        if (AppState.currentIndex === AppState.currentQuestions.length - 1) {
            DOM.nextBtn.textContent = '查看结果';
        } else {
            DOM.nextBtn.textContent = '下一题';
        }
    },
    
    nextQuestion() {
        if (AppState.currentIndex < AppState.currentQuestions.length - 1) {
            AppState.currentIndex++;
            this.renderQuestion();
        } else {
            this.showResult();
        }
    },
    
    prevQuestion() {
        if (AppState.currentIndex > 0) {
            AppState.currentIndex--;
            this.renderQuestion();
        }
    },
    
    showResult() {
        DOM.practiceModal.classList.remove('active');
        DOM.resultModal.classList.add('active');
        
        DOM.resultCorrect.textContent = AppState.session.correct;
        DOM.resultWrong.textContent = AppState.session.wrong;
        
        const total = AppState.session.correct + AppState.session.wrong;
        const rate = total > 0 ? Math.round((AppState.session.correct / total) * 100) : 0;
        DOM.resultAccuracy.textContent = rate + '%';
        
        this.updateStats();
    },
    
    toggleStar() {
        const question = AppState.currentQuestions[AppState.currentIndex];
        if (!question) return;
        
        const index = AppState.stats.starredQuestions.indexOf(question.id);
        if (index > -1) {
            AppState.stats.starredQuestions.splice(index, 1);
            DOM.starBtn.textContent = '☆';
        } else {
            AppState.stats.starredQuestions.push(question.id);
            DOM.starBtn.textContent = '⭐';
        }
        AppState.saveStats();
    }
};

// ========================================
// 事件绑定
// ========================================
function bindEvents() {
    // 模式选择
    DOM.modeSequential?.addEventListener('click', () => {
        AppState.currentMode = 'sequential';
        UI.updateModeSelection('sequential');
    });
    
    DOM.modeRandom?.addEventListener('click', () => {
        AppState.currentMode = 'random';
        UI.updateModeSelection('random');
    });
    
    DOM.modeWrong?.addEventListener('click', () => {
        AppState.currentMode = 'wrong';
        UI.updateModeSelection('wrong');
    });
    
    DOM.modeStarred?.addEventListener('click', () => {
        AppState.currentMode = 'starred';
        UI.updateModeSelection('starred');
    });
    
    // 类型筛选
    DOM.typeFilters?.addEventListener('click', (e) => {
        if (e.target.classList.contains('filter-tag')) {
            AppState.currentType = e.target.dataset.type;
            UI.updateTypeFilter(e.target.dataset.type);
        }
    });
    
    // 开始练习
    DOM.startPractice?.addEventListener('click', () => {
        const bank = BankManager.getCurrentBank();
        if (!bank || !bank.questions || bank.questions.length === 0) {
            Toast.error('请先选择或导入题库！');
            return;
        }
        
        let questions = [];
        
        switch (AppState.currentMode) {
            case 'sequential':
                questions = BankManager.getQuestions(AppState.currentType);
                break;
            case 'random':
                questions = BankManager.getRandomQuestions(10, AppState.currentType);
                break;
            case 'wrong':
                const wrongIds = AppState.stats.wrongQuestions;
                questions = BankManager.getQuestions().filter(q => wrongIds.includes(q.id));
                if (AppState.currentType !== 'all') {
                    questions = questions.filter(q => q.type === AppState.currentType);
                }
                break;
            case 'starred':
                const starredIds = AppState.stats.starredQuestions;
                questions = BankManager.getQuestions().filter(q => starredIds.includes(q.id));
                if (AppState.currentType !== 'all') {
                    questions = questions.filter(q => q.type === AppState.currentType);
                }
                break;
        }
        
        if (questions.length === 0) {
            Toast.error('没有符合条件的题目！');
            return;
        }
        
        AppState.currentQuestions = questions;
        AppState.resetSession();
        
        DOM.practiceModal.classList.add('active');
        UI.renderQuestion();
    });
    
    // 练习模态框
    DOM.closeModal?.addEventListener('click', () => {
        if (confirm('确定要退出练习吗？')) {
            DOM.practiceModal.classList.remove('active');
            UI.updateStats();
        }
    });
    
    DOM.submitBtn?.addEventListener('click', () => UI.submitAnswer());
    DOM.nextBtn?.addEventListener('click', () => UI.nextQuestion());
    DOM.prevBtn?.addEventListener('click', () => UI.prevQuestion());
    DOM.starBtn?.addEventListener('click', () => UI.toggleStar());
    
    // 结果模态框
    DOM.reviewWrong?.addEventListener('click', () => {
        DOM.resultModal.classList.remove('active');
        AppState.currentMode = 'wrong';
        UI.updateModeSelection('wrong');
    });
    
    DOM.restartPractice?.addEventListener('click', () => {
        DOM.resultModal.classList.remove('active');
    });
    
    // 快速导入
    DOM.importBtn?.addEventListener('click', () => {
        DOM.importFile.click();
    });
    
    DOM.importFile?.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;
        
        handleFileImport(file);
        e.target.value = '';
    });
    
    // 下载模板
    DOM.downloadTemplate?.addEventListener('click', (e) => {
        e.preventDefault();
        const template = BankManager.getTxtTemplate();
        const blob = new Blob([template], { type: 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'question_template.txt';
        a.click();
        URL.revokeObjectURL(url);
    });
    
    // 添加题库模态框
    DOM.closeAddBank?.addEventListener('click', () => Sidebar.closeAddBankModal());
    DOM.cancelAddBank?.addEventListener('click', () => Sidebar.closeAddBankModal());
    
    DOM.fileDropZone?.addEventListener('click', () => {
        DOM.bankFileInput.click();
    });
    
    DOM.bankFileInput?.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            Sidebar.selectedFile = file;
            DOM.fileDropZone.classList.add('has-file');
            DOM.fileDropZone.querySelector('p').textContent = file.name;
        }
    });
    
    // 拖拽文件
    DOM.fileDropZone?.addEventListener('dragover', (e) => {
        e.preventDefault();
        DOM.fileDropZone.classList.add('drag-over');
    });
    
    DOM.fileDropZone?.addEventListener('dragleave', () => {
        DOM.fileDropZone.classList.remove('drag-over');
    });
    
    DOM.fileDropZone?.addEventListener('drop', (e) => {
        e.preventDefault();
        DOM.fileDropZone.classList.remove('drag-over');
        
        const file = e.dataTransfer.files[0];
        if (file) {
            Sidebar.selectedFile = file;
            DOM.fileDropZone.classList.add('has-file');
            DOM.fileDropZone.querySelector('p').textContent = file.name;
        }
    });
    
    DOM.confirmAddBank?.addEventListener('click', () => {
        const name = DOM.bankNameInput.value.trim();
        const category = DOM.bankCategoryInput.value.trim() || '未分类';
        
        if (!name) {
            Toast.error('请输入题库名称');
            return;
        }
        
        if (!Sidebar.selectedFile) {
            Toast.error('请选择题目文件');
            return;
        }
        
        handleFileImport(Sidebar.selectedFile, name, category);
        Sidebar.closeAddBankModal();
    });
    
    // 键盘快捷键
    document.addEventListener('keydown', (e) => {
        if (!DOM.practiceModal.classList.contains('active')) return;
        
        switch (e.key) {
            case 'Enter':
                if (!AppState.isAnswerSubmitted) {
                    UI.submitAnswer();
                } else {
                    UI.nextQuestion();
                }
                break;
            case 'ArrowLeft':
                UI.prevQuestion();
                break;
            case 'ArrowRight':
                if (AppState.isAnswerSubmitted) {
                    UI.nextQuestion();
                }
                break;
            case '1':
            case '2':
            case '3':
            case '4':
            case '5':
            case '6':
                if (!AppState.isAnswerSubmitted) {
                    const index = parseInt(e.key) - 1;
                    const options = document.querySelectorAll('.option-item');
                    if (options[index]) {
                        options[index].click();
                    }
                }
                break;
        }
    });
}

// ========================================
// 文件导入处理
// ========================================
function handleFileImport(file, bankName = null, category = null) {
    const reader = new FileReader();
    const isTxt = file.name.endsWith('.txt');
    
    reader.onload = (e) => {
        try {
            const content = e.target.result;
            let result;
            
            if (isTxt) {
                const name = bankName || file.name.replace('.txt', '');
                const cat = category || '未分类';
                result = BankManager.importFromTxt(content, name, cat);
            } else {
                const data = JSON.parse(content);
                const name = bankName || file.name.replace('.json', '');
                const cat = category || '未分类';
                result = BankManager.importFromJson(data, name, cat);
            }
            
            if (result.success) {
                Toast.success(result.message || `成功导入 ${result.count} 道题目`);
                BankManager.selectBank(result.bankId);
                Sidebar.renderCategories();
                Sidebar.renderBanks();
                UI.updateCurrentBank();
                UI.updateStats();
            } else {
                Toast.error(result.error || '导入失败');
            }
        } catch (err) {
            Toast.error('文件格式错误：' + err.message);
        }
    };
    
    reader.readAsText(file, 'UTF-8');
}

// ========================================
// 初始化
// ========================================
function init() {
    ThemeManager.init();
    AppState.loadStats();
    Sidebar.init();
    UI.updateCurrentBank();
    UI.updateStats();
    UI.updateModeSelection('sequential');
    UI.updateTypeFilter('all');
    bindEvents();
    
    console.log('🎉 刷题网站已启动！');
    console.log('📚 当前题库:', BankManager.getCurrentBank()?.name || '未选择');
}

document.addEventListener('DOMContentLoaded', init);
