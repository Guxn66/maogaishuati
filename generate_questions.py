import json

# Read parsed questions
with open(r'd:\刷题助手\maogai_clean.json', 'r', encoding='utf-8') as f:
    questions = json.load(f)

# Generate questions.js
js_code = f'''/**
 * 毛概题库 - {len(questions)}道题目（完整版）
 */

const maogaiQuestions = {json.dumps(questions, ensure_ascii=False, indent=2)};

// 题库管理器
const BankManager = {{
    currentBankId: 'maogai_builtin',
    categories: new Set(['政治']),
    
    banks: {{
        'maogai_builtin': {{
            id: 'maogai_builtin',
            name: '毛概题库',
            category: '政治',
            description: '毛泽东思想概论（{len(questions)}题）',
            createTime: Date.now(),
            questions: maogaiQuestions,
            questionCount: maogaiQuestions.length
       }}
    }},
    
    getCurrentBank() {{ 
        return this.banks[this.currentBankId]; 
    }},
    
    getAllBanks() {{ 
        return Object.values(this.banks).map(bank => ({{
            id: bank.id,
            name: bank.name,
            category: bank.category || '未分类',
            description: bank.description || '',
            questionCount: bank.questions?.length || 0,
            createTime: bank.createTime
        }})); 
    }},
    
    getBanksByCategory(category) {{ 
        if (!category || category === 'all') {{
            return this.getAllBanks();
        }}
        return this.getAllBanks().filter(b => b.category === category); 
    }},
    
    selectBank(bankId) {{ 
        if (this.banks[bankId]) {{
            this.currentBankId = bankId;
            localStorage.setItem('currentBankId', bankId);
            return true;
        }}
        return false; 
    }},
    
    getQuestions(type = 'all') {{ 
        const bank = this.getCurrentBank();
        if (!bank || !bank.questions) return [];
        if (type === 'all') return bank.questions;
        return bank.questions.filter(q => q.type === type); 
    }},
    
    getRandomQuestions(count = 10, type = 'all') {{ 
        const questions = this.getQuestions(type);
        const shuffled = [...questions].sort(() => Math.random() - 0.5);
        return shuffled.slice(0, Math.min(count, shuffled.length)); 
    }},
    
    deleteBank(bankId) {{ 
        if (bankId === 'maogai_builtin') {{
            return false;
        }}
        delete this.banks[bankId];
        if (this.currentBankId === bankId) {{
            this.currentBankId = 'maogai_builtin';
        }}
        return true; 
    }},
    
    updateCategories() {{ 
        this.categories.clear();
        Object.values(this.banks).forEach(bank => {{
            if (bank.category) {{
                this.categories.add(bank.category);
            }}
        }}); 
    }}
}};

const QuestionBank = {{
    getAll() {{ return BankManager.getQuestions(); }},
    getByType(type) {{ return BankManager.getQuestions(type); }},
    getRandom(count, type) {{ return BankManager.getRandomQuestions(count, type); }},
    getById(id) {{ return BankManager.getQuestions().find(q => q.id === id); }}
}};
'''

with open(r'd:\刷题助手\js\questions.js', 'w', encoding='utf-8') as f:
    f.write(js_code)

print(f'✓ 成功生成 questions.js - {len(questions)} 道题目')
