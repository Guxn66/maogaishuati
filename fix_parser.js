// 临时脚本：在浏览器console中运行，修复选项分割问题
async function fixQuestions() {
    const response = await fetch('毛概题库 conv.txt');
    const text = await response.text();
    
    // 按题目分割
    const questionBlocks = text.split(/第\s*\d+\s*题\s*\[/);
    const questions = [];
    
    for (let block of questionBlocks) {
        // 提取题型
        const typeMatch = block.match(/^(单选题|多选题|判断题|填空题)\]/);
        if (!typeMatch) continue;
        
        const qType = {'单选题': 'single', '多选题': 'multiple', '判断题': 'judge', '填空题': 'fill'}[typeMatch[1]];
        
        // 提取题目
        const questionMatch = block.match(/题目[:：]\s*(.+?)选项[:：]/s);
        if (!questionMatch) continue;
        const question = questionMatch[1].trim().replace(/\s+/g, ' ');
        
        if (qType !== 'fill') {
            // 提取选项部分
            const optionsMatch = block.match(/选项[:：]\s*(.+?)正确答案/s);
            if (!optionsMatch) continue;
            
            let optionsText = optionsMatch[1];
            
            // 关键：用正则分割所有 - A. - B. - C. - D. 等
            const options = [];
            const optionPattern = /-\s*([A-F])[.\s：:]+([^-]+?)(?=-\s*[A-F][.\s：:]|$)/g;
            let match;
            
            while ((match = optionPattern.exec(optionsText)) !== null) {
                const optText = match[2].trim().replace(/\s+/g, ' ');
                if (optText.length > 0 && optText.length < 500) {
                    options.push(optText);
                }
            }
            
            // 提取答案
            const answerMatch = block.match(/正确答案[:：]\s*([A-F\s]+)/);
            if (!answerMatch || options.length < 2) continue;
            
            const answerLetters = answerMatch[1].match(/[A-F]/g);
            let answer;
            
            if (qType === 'multiple') {
                answer = answerLetters.map(l => l.charCodeAt(0) - 65);
            } else if (qType === 'judge') {
                answer = answerLetters[0] === 'A' ? 0 : 1;
            } else {
                answer = answerLetters[0].charCodeAt(0) - 65;
            }
            
            questions.push({
                id: questions.length + 1,
                type: qType,
                question,
                options: qType === 'judge' ? ['正确', '错误'] : options,
                answer
            });
        }
    }
    
    console.log(`解析了 ${questions.length} 道题`);
    console.log('第2题:', questions[1]);
    
    // 保存为JSON
    const json = JSON.stringify(questions, null, 2);
    const blob = new Blob([json], {type: 'application/json'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'questions_fixed.json';
    a.click();
}

// 运行
fixQuestions();
