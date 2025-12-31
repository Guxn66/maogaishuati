/**
 * TXT 文件解析器
 * 支持多种常见题库格式
 */

const TxtParser = {
    /**
     * 解析 TXT 文件内容
     * 支持的格式：
     * 
     * 格式1 - 标准格式：
     * 1. 题目内容？
     * A. 选项A
     * B. 选项B
     * C. 选项C
     * D. 选项D
     * 答案：B
     * 
     * 格式2 - 简化格式：
     * 题目内容？
     * A 选项A
     * B 选项B
     * 答案：B
     * 
     * 格式3 - 判断题：
     * 1. 判断题内容。（）
     * 答案：√ 或 ×
     */
    
    parse(text) {
        const questions = [];
        
        // 预处理：统一换行符
        text = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
        
        // 尝试不同的分隔模式
        let blocks = this.splitQuestions(text);
        
        for (const block of blocks) {
            const question = this.parseQuestion(block.trim());
            if (question) {
                question.id = questions.length + 1;
                questions.push(question);
            }
        }
        
        return questions;
    },
    
    // 分割题目块
    splitQuestions(text) {
        // 尝试按题号分割：1. 2. 3. 或 1、2、3、或 一、二、三、
        const patterns = [
            /(?=\n\s*\d+[\.\、\．]\s*)/g,           // 1. 或 1、
            /(?=\n\s*[一二三四五六七八九十]+[\.\、\．]\s*)/g,  // 一、
            /(?=\n\s*第[一二三四五六七八九十\d]+题)/g,        // 第一题
            /(?=\n\s*\(\d+\))/g,                    // (1)
            /(?=\n\s*【\d+】)/g                     // 【1】
        ];
        
        for (const pattern of patterns) {
            const blocks = text.split(pattern).filter(b => b.trim());
            if (blocks.length > 1) {
                return blocks;
            }
        }
        
        // 尝试按连续空行分割
        const blocks = text.split(/\n\s*\n\s*\n/).filter(b => b.trim());
        if (blocks.length > 1) {
            return blocks;
        }
        
        // 尝试按双空行分割
        return text.split(/\n\s*\n/).filter(b => b.trim());
    },
    
    // 解析单个题目
    parseQuestion(block) {
        if (!block || block.length < 5) return null;
        
        const lines = block.split('\n').map(l => l.trim()).filter(l => l);
        if (lines.length < 2) return null;
        
        // 提取题目文本（去掉题号）
        let questionText = lines[0]
            .replace(/^\s*\d+[\.\、\．]\s*/, '')
            .replace(/^\s*[一二三四五六七八九十]+[\.\、\．]\s*/, '')
            .replace(/^\s*第[一二三四五六七八九十\d]+题[\.\、\．\:：]?\s*/, '')
            .replace(/^\s*\(\d+\)\s*/, '')
            .replace(/^\s*【\d+】\s*/, '')
            .trim();
        
        // 判断题型
        const type = this.detectType(block, lines);
        
        if (type === 'judge') {
            return this.parseJudgeQuestion(questionText, lines);
        } else if (type === 'fill') {
            return this.parseFillQuestion(questionText, lines);
        } else {
            return this.parseChoiceQuestion(questionText, lines, type);
        }
    },
    
    // 检测题型
    detectType(block, lines) {
        const text = block.toLowerCase();
        
        // 判断题特征
        if (text.includes('（）') || text.includes('( )') ||
            text.match(/答案[\s\:：]*[√×✓✗对错]/) ||
            text.match(/[√×✓✗]/)) {
            return 'judge';
        }
        
        // 填空题特征
        if (text.includes('___') || text.includes('____') ||
            text.includes('（  ）') || text.includes('(  )')) {
            return 'fill';
        }
        
        // 多选题特征
        if (text.includes('多选') || text.includes('多项选择') ||
            text.match(/答案[\s\:：]*[A-Fa-f]{2,}/)) {
            return 'multiple';
        }
        
        // 检查选项
        const hasOptions = lines.some(l => 
            /^[A-Fa-f][\.\、\．\s\:：]/.test(l) ||
            /^[A-Fa-f]\s+\S/.test(l)
        );
        
        if (hasOptions) {
            return 'single';
        }
        
        return 'fill'; // 默认填空题
    },
    
    // 解析选择题
    parseChoiceQuestion(questionText, lines, type) {
        const options = [];
        let answer = null;
        let explanation = '';
        
        // 检查题目行是否包含选项
        let questionOnly = questionText;
        const optionInQuestion = questionText.match(/([A-D][\.\、]?\s*.+?)(?=[A-D][\.\、]|$)/g);
        if (optionInQuestion && optionInQuestion.length >= 2) {
            // 题目和选项在同一行
            const firstOption = questionText.search(/\s+A[\.\、\s]/);
            if (firstOption > 0) {
                questionOnly = questionText.substring(0, firstOption).trim();
                const optionsPart = questionText.substring(firstOption);
                const matches = optionsPart.match(/[A-D][\.\、]?\s*[^A-D]+/g);
                if (matches) {
                    matches.forEach(m => {
                        options.push(m.replace(/^[A-D][\.\、]?\s*/, '').trim());
                    });
                }
            }
        }
        
        // 从行中提取选项
        for (let i = 1; i < lines.length; i++) {
            const line = lines[i];
            
            // 匹配选项行
            const optionMatch = line.match(/^([A-Fa-f])[\.\、\．\s\:：]?\s*(.+)/);
            if (optionMatch && options.length < 6) {
                options.push(optionMatch[2].trim());
                continue;
            }
            
            // 匹配答案行
            const answerMatch = line.match(/(?:答案|正确答案|参考答案)[\s\:：]*([A-Fa-f]+)/i);
            if (answerMatch) {
                const answerStr = answerMatch[1].toUpperCase();
                if (type === 'multiple' || answerStr.length > 1) {
                    answer = answerStr.split('').map(c => c.charCodeAt(0) - 65);
                    type = 'multiple';
                } else {
                    answer = answerStr.charCodeAt(0) - 65;
                }
                continue;
            }
            
            // 解析/解释
            const explainMatch = line.match(/(?:解析|解释|说明)[\s\:：]*(.*)/);
            if (explainMatch) {
                explanation = explainMatch[1];
            }
        }
        
        // 如果没有找到选项，可能格式不对
        if (options.length < 2) {
            return null;
        }
        
        // 如果没有找到答案，默认第一个
        if (answer === null) {
            answer = type === 'multiple' ? [0] : 0;
        }
        
        return {
            type,
            question: questionOnly || questionText,
            options,
            answer,
            explanation
        };
    },
    
    // 解析判断题
    parseJudgeQuestion(questionText, lines) {
        let answer = 0; // 默认正确
        let explanation = '';
        
        // 清理题目文本
        questionText = questionText
            .replace(/[（\(]\s*[）\)]/g, '')
            .replace(/\s*[√×✓✗]\s*$/, '')
            .trim();
        
        // 查找答案
        for (const line of lines) {
            const answerMatch = line.match(/(?:答案|正确答案)[\s\:：]*([√×✓✗对错正误TFtf])/);
            if (answerMatch) {
                const a = answerMatch[1];
                answer = ['√', '✓', '对', '正', 'T', 't'].includes(a) ? 0 : 1;
            }
            
            // 也检查题目末尾
            if (line.includes('√') || line.includes('✓')) answer = 0;
            if (line.includes('×') || line.includes('✗')) answer = 1;
            
            const explainMatch = line.match(/(?:解析|解释)[\s\:：]*(.*)/);
            if (explainMatch) {
                explanation = explainMatch[1];
            }
        }
        
        return {
            type: 'judge',
            question: questionText,
            options: ['正确', '错误'],
            answer,
            explanation
        };
    },
    
    // 解析填空题
    parseFillQuestion(questionText, lines) {
        let answer = '';
        let explanation = '';
        
        for (const line of lines) {
            const answerMatch = line.match(/(?:答案|正确答案)[\s\:：]*(.*)/);
            if (answerMatch) {
                answer = answerMatch[1].trim();
            }
            
            const explainMatch = line.match(/(?:解析|解释)[\s\:：]*(.*)/);
            if (explainMatch) {
                explanation = explainMatch[1];
            }
        }
        
        return {
            type: 'fill',
            question: questionText,
            answer: answer || '未提供答案',
            explanation
        };
    }
};

// 导出
if (typeof module !== 'undefined' && module.exports) {
    module.exports = TxtParser;
}
