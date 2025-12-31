/**
 * 题目文本处理 - 关键词高亮
 */

const QuestionFormatter = {
    // 关键词列表（毛概重点词汇）
    keywords: [
        // 程度词
        '根本', '核心', '关键', '首要', '主要', '重要', '本质', '基本',
        '必须', '必然', '一定', '唯一',
        
        // 数字表述
        '两个确立', '两个维护', '五位一体', '四个全面', '四个自信',
        '十个明确', '十四个坚持', '十三个方面', '六个必须',
        '两步走', '三大攻坚战', '两不愁三保障',
        
        // 核心概念
        '中国特色社会主义', '新时代', '现代化', '中华民族伟大复兴',
        '初心使命', '人民至上', '共同富裕', '以人民为中心',
        '全过程人民民主', '中国式现代化',
        
        // 方针政策
        '改革开放', '科技创新', '绿色发展', '高质量发展',
        '自我革命', '全面从严治党'
    ],
    
    /**
     * 高亮题目中的关键词
     */
    highlight(text) {
        if (!text) return text;
        
        let result = text;
        
        // 按长度降序排序，避免短关键词覆盖长关键词
        const sortedKeywords = [...this.keywords].sort((a, b) => b.length - a.length);
        
        sortedKeywords.forEach(keyword => {
            const regex = new RegExp(`(${keyword})`, 'g');
            result = result.replace(regex, '<mark class="keyword">$1</mark>');
        });
        
        return result;
    },
    
    /**
     * 应用高亮到元素
     */
    applyTo(element, text) {
        element.innerHTML = this.highlight(text);
    }
};

// 导出
if (typeof module !== 'undefined') {
    module.exports = QuestionFormatter;
}
