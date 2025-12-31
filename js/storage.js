/**
 * storage.js - 统一数据管理模块
 * 管理进度保存、答题统计、错题记录
 */

const Storage = {
    KEYS: {
        PROGRESS: 'quiz_progress',
        QUESTION_STATS: 'quiz_question_stats',
        GLOBAL_STATS: 'quiz_global_stats',
        STARRED: 'quiz_starred'
    },

    // ==================== 进度管理 ====================
    
    /**
     * 保存刷题进度
     */
    saveProgress(mode, index) {
        const progress = this.loadProgress();
        progress[mode] = index;
        progress.lastMode = mode;
        progress.lastTime = Date.now();
        localStorage.setItem(this.KEYS.PROGRESS, JSON.stringify(progress));
    },

    /**
     * 加载进度
     */
    loadProgress() {
        try {
            return JSON.parse(localStorage.getItem(this.KEYS.PROGRESS)) || {
                sequential: 0,
                lastMode: null,
                lastTime: null
            };
        } catch {
            return { sequential: 0, lastMode: null, lastTime: null };
        }
    },

    /**
     * 检查是否有未完成的进度
     */
    hasUnfinishedProgress() {
        const progress = this.loadProgress();
        return progress.sequential > 0;
    },

    // ==================== 题目统计 ====================
    
    /**
     * 记录答题结果
     */
    recordAnswer(questionId, isCorrect) {
        const stats = this.getAllQuestionStats();
        
        if (!stats[questionId]) {
            stats[questionId] = { correct: 0, wrong: 0, lastAnswer: null };
        }
        
        if (isCorrect) {
            stats[questionId].correct++;
        } else {
            stats[questionId].wrong++;
        }
        stats[questionId].lastAnswer = isCorrect;
        stats[questionId].lastTime = Date.now();
        
        localStorage.setItem(this.KEYS.QUESTION_STATS, JSON.stringify(stats));
        
        // 更新全局统计
        this.updateGlobalStats(isCorrect);
    },

    /**
     * 获取单题统计
     */
    getQuestionStats(questionId) {
        const stats = this.getAllQuestionStats();
        return stats[questionId] || { correct: 0, wrong: 0, lastAnswer: null };
    },

    /**
     * 获取所有题目统计
     */
    getAllQuestionStats() {
        try {
            return JSON.parse(localStorage.getItem(this.KEYS.QUESTION_STATS)) || {};
        } catch {
            return {};
        }
    },

    /**
     * 获取错误次数最多的题目（薄弱题）
     */
    getWeakQuestions(limit = 20) {
        const stats = this.getAllQuestionStats();
        return Object.entries(stats)
            .filter(([_, s]) => s.wrong > 0)
            .sort((a, b) => b[1].wrong - a[1].wrong)
            .slice(0, limit)
            .map(([id, s]) => ({
                id: parseInt(id),
                ...s
            }));
    },

    /**
     * 获取错题ID列表
     */
    getWrongQuestionIds() {
        const stats = this.getAllQuestionStats();
        return Object.entries(stats)
            .filter(([_, s]) => s.lastAnswer === false || s.wrong > s.correct)
            .map(([id, _]) => parseInt(id));
    },

    /**
     * 手动移出错题（清除错误记录）
     */
    removeFromWrongQuestions(questionId) {
        const stats = this.getAllQuestionStats();
        if (stats[questionId]) {
            stats[questionId].wrong = 0;
            stats[questionId].lastAnswer = true; // 标记为已掌握
            localStorage.setItem(this.KEYS.QUESTION_STATS, JSON.stringify(stats));
            return true;
        }
        return false;
    },

    // ==================== 全局统计 ====================
    
    /**
     * 更新全局统计
     */
    updateGlobalStats(isCorrect) {
        const stats = this.getGlobalStats();
        stats.totalAttempts++;
        if (isCorrect) {
            stats.totalCorrect++;
        } else {
            stats.totalWrong++;
        }
        stats.lastPractice = Date.now();
        localStorage.setItem(this.KEYS.GLOBAL_STATS, JSON.stringify(stats));
    },

    /**
     * 获取全局统计
     */
    getGlobalStats() {
        try {
            return JSON.parse(localStorage.getItem(this.KEYS.GLOBAL_STATS)) || {
                totalAttempts: 0,
                totalCorrect: 0,
                totalWrong: 0,
                lastPractice: null
            };
        } catch {
            return { totalAttempts: 0, totalCorrect: 0, totalWrong: 0, lastPractice: null };
        }
    },

    /**
     * 计算正确率
     */
    getAccuracyRate() {
        const stats = this.getGlobalStats();
        if (stats.totalAttempts === 0) return 0;
        return Math.round((stats.totalCorrect / stats.totalAttempts) * 100);
    },

    // ==================== 收藏管理 ====================
    
    /**
     * 切换收藏状态
     */
    toggleStar(questionId) {
        const starred = this.getStarredIds();
        const index = starred.indexOf(questionId);
        if (index > -1) {
            starred.splice(index, 1);
        } else {
            starred.push(questionId);
        }
        localStorage.setItem(this.KEYS.STARRED, JSON.stringify(starred));
        return index === -1; // 返回新状态
    },

    /**
     * 检查是否已收藏
     */
    isStarred(questionId) {
        return this.getStarredIds().includes(questionId);
    },

    /**
     * 获取所有收藏ID
     */
    getStarredIds() {
        try {
            return JSON.parse(localStorage.getItem(this.KEYS.STARRED)) || [];
        } catch {
            return [];
        }
    },

    // ==================== 数据清理 ====================
    
    /**
     * 清除所有统计数据
     */
    clearAllStats() {
        localStorage.removeItem(this.KEYS.QUESTION_STATS);
        localStorage.removeItem(this.KEYS.GLOBAL_STATS);
        localStorage.removeItem(this.KEYS.PROGRESS);
    },

    /**
     * 重置进度
     */
    resetProgress() {
        localStorage.removeItem(this.KEYS.PROGRESS);
    }
};

// 导出供其他模块使用
if (typeof module !== 'undefined') {
    module.exports = Storage;
}
