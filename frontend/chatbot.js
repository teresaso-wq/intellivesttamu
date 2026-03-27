// Intellivest AI Chatbot - Financial Literacy Assistant for College Students
(function initChatbot() {
  const messagesContainer = document.getElementById('chatbotMessages');
  const chatbotForm = document.getElementById('chatbotForm');
  const chatbotInput = document.getElementById('chatbotInput');

  // Enhanced financial knowledge base for college students
  const financialKnowledge = {
    greeting: {
      keywords: ['hello', 'hi', 'hey', 'greetings', 'what\'s up', 'sup'],
      responses: [
        "Hi! I'm Intellivest — here to help you make smart money moves. What can I help you with today?",
        "Hello! I'm Intellivest, your AI financial literacy assistant. I'm here to help with budgeting, saving, investing basics, and more. What would you like to know?",
        "Hey there! I'm Intellivest, ready to help you navigate your finances as a college student. What questions do you have?"
      ]
    },
    budgeting: {
      keywords: ['budget', 'budgeting', 'save money', 'saving', 'expenses', 'income', 'spending', 'money management'],
      responses: [
        "Great question! Here's a simple college budgeting method:\n\n1. List your monthly income (job, financial aid, family support)\n2. Track expenses like food, rent, books, etc.\n3. Use the 50/30/20 rule:\n   • 50% needs (rent, food, utilities)\n   • 30% wants (entertainment, dining out)\n   • 20% savings/debt repayment\n\nWant a template or app recommendations?",
        "Budgeting in college is all about tracking what comes in and what goes out. Start by writing down all your income sources (part-time job, financial aid refund, family help) and all your expenses. Apps like Mint or YNAB can help automate this. The key is being honest about your spending!",
        "A simple way to start: track every dollar you spend for one month. Use a spreadsheet or app. Then categorize: needs vs. wants. Try the envelope method — allocate cash for different categories. This helps you see where your money actually goes."
      ]
    },
    credit: {
      keywords: ['credit', 'credit score', 'credit card', 'debt', 'credit report', 'credit history'],
      responses: [
        "Building credit in college is smart! Here's how:\n\n• Get a student credit card (low limit, pay in full each month)\n• Pay all bills on time — this is 35% of your score\n• Keep credit utilization below 30%\n• Don't open too many accounts at once\n\nYour credit score affects loans, apartments, and even job applications. Start building it now!",
        "Credit cards can be helpful if used responsibly. Always pay your balance in full each month to avoid interest. Set up autopay for the minimum at least. Check your credit report free at annualcreditreport.com once a year. Remember: credit is a tool, not free money!",
        "Credit scores range from 300-850. Factors: payment history (35%), amounts owed (30%), length of history (15%), new credit (10%), credit mix (10%). As a student, focus on paying on time and keeping balances low. It takes time to build good credit — start now!"
      ]
    },
    saving: {
      keywords: ['save', 'saving', 'emergency fund', 'savings account', 'how to save'],
      responses: [
        "Saving in college can feel tough, but every bit counts!\n\n• Start an emergency fund — aim for $500-1000 first\n• Use the 'pay yourself first' rule — save before spending\n• Automate transfers to savings\n• Save windfalls (tax refunds, birthday money)\n• Use a high-yield savings account (better interest rates)\n\nEven $20/month adds up over time!",
        "Emergency funds are crucial — they prevent you from going into debt when unexpected expenses hit. Start small: $500 is a good first goal. Keep it in a separate savings account so you're not tempted to spend it. Once you have that, work toward 3-6 months of expenses.",
        "Saving strategies for students:\n• Round up purchases and save the difference\n• Use the 52-week challenge (save $1 week 1, $2 week 2, etc.)\n• Save 50% of any extra income\n• Cook at home more often\n• Use student discounts everywhere\n\nSmall changes make a big difference!"
      ]
    },
    investing: {
      keywords: ['invest', 'investing', 'stocks', 'portfolio', 'robo-advisor', 'index fund', 'retirement'],
      responses: [
        "Investing as a student? Smart move! Here's the basics:\n\n• Start with a Roth IRA (you pay taxes now, withdraw tax-free later)\n• Use low-cost index funds or ETFs for diversification\n• Consider robo-advisors like Betterment or Wealthfront\n• Invest consistently (dollar-cost averaging)\n• Think long-term — time is your biggest advantage\n\nRemember: only invest money you won't need for 5+ years!",
        "Investing basics: stocks are ownership in companies, bonds are loans to companies/governments. Diversification (spreading investments) reduces risk. Index funds track the whole market — great for beginners. Start with $25-50/month if that's all you can afford. The key is starting early!",
        "For college students, investing can seem overwhelming. Start simple:\n• Open a Roth IRA (if you have earned income)\n• Invest in a target-date fund or S&P 500 index fund\n• Set up automatic contributions\n• Don't try to time the market\n• Focus on learning, not quick gains\n\nTime in the market beats timing the market!"
      ]
    },
    loans: {
      keywords: ['loan', 'student loan', 'fafsa', 'financial aid', 'debt', 'repayment'],
      responses: [
        "Student loans are a big decision. Here's what to know:\n\n• Federal loans usually have better terms than private\n• Fill out FAFSA every year for aid eligibility\n• Only borrow what you need\n• Understand interest rates and repayment terms\n• Consider income-driven repayment plans after graduation\n\nAfter graduation, prioritize high-interest debt first. Always make minimum payments on all loans!",
        "Managing student loans:\n• Know your loan servicer and keep contact info updated\n• Understand the difference between subsidized (gov pays interest while in school) and unsubsidized loans\n• Consider part-time work or work-study to reduce borrowing\n• Look into loan forgiveness programs for certain careers\n• Start making interest payments while in school if possible",
        "Student loan tips:\n• Track all your loans in one place (StudentAid.gov)\n• Consider paying interest while in school\n• Look for scholarships and grants first (free money!)\n• Understand your grace period (usually 6 months after graduation)\n• Create a repayment plan before you graduate\n\nRemember: loans are an investment in your future, but borrow wisely!"
      ]
    },
    scholarships: {
      keywords: ['scholarship', 'grant', 'financial aid', 'free money', 'tuition'],
      responses: [
        "Scholarships are free money — definitely worth the effort!\n\n• Apply to many (quality over quantity, but volume helps)\n• Check your school's financial aid office first\n• Use scholarship search engines (Fastweb, Scholarships.com)\n• Look for local scholarships (less competition)\n• Apply even if you don't think you'll win\n• Write strong essays — tell your unique story\n\nEvery dollar in scholarships is a dollar you don't have to borrow!",
        "Finding scholarships:\n• Check with your major's department\n• Look for community organizations and local businesses\n• Apply for merit-based (grades) and need-based\n• Don't ignore small scholarships — they add up!\n• Keep track of deadlines in a spreadsheet\n• Reuse and adapt essays for similar applications",
        "Scholarship strategy: Start early, apply often. Many students don't apply because they think they won't win — but someone has to! Set aside time each week to search and apply. Even $500 scholarships are worth it. Remember: you can't win if you don't apply!"
      ]
    },
    taxes: {
      keywords: ['tax', 'taxes', 'tax return', 'w-2', 'filing', 'irs', 'refund'],
      responses: [
        "Taxes as a student can be simpler than you think!\n\n• If you work, you'll likely get a W-2 form\n• You may be claimed as a dependent (affects your filing)\n• Use free tax software (TurboTax Free, FreeTaxUSA)\n• File even if you made little money (you might get a refund!)\n• Keep receipts for education expenses (tuition, books)\n• Consider the American Opportunity Tax Credit if eligible\n\nMost students can file for free — don't pay unless you have to!",
        "Student tax basics:\n• File by April 15th (or request extension)\n• If you're a dependent, your parents may claim you\n• Part-time job income is usually taxed, but you may get it back\n• Scholarships used for tuition/books are usually tax-free\n• Keep all tax documents organized\n• Consider using tax software — it walks you through everything",
        "Tax tips for students:\n• File even if income is low (you might get refunds)\n• Don't forget about state taxes if applicable\n• Education credits can save money\n• Keep track of education expenses\n• Use free filing options (IRS Free File if income under $79k)\n• Don't wait until the last minute!"
      ]
    },
    general: {
      keywords: [],
      responses: [
        "I'm here to help with financial questions! Whether it's budgeting, saving, investing basics, credit, loans, scholarships, or taxes — ask away. What would you like to know more about?",
        "Financial literacy is a journey! I can help with budgeting, saving strategies, credit building, investing basics, student loans, scholarships, taxes, and more. What's on your mind?",
        "Feel free to ask me anything about personal finance! I can help with money management, saving, investing basics, credit, loans, and other financial topics relevant to college students. What can I help with?"
      ]
    }
  };

  // Generate AI response based on user input
  function generateResponse(userMessage) {
    const lowerMessage = userMessage.toLowerCase().trim();
    
    // Handle greetings first
    if (financialKnowledge.greeting.keywords.some(keyword => lowerMessage.includes(keyword))) {
      const responses = financialKnowledge.greeting.responses;
      return responses[Math.floor(Math.random() * responses.length)];
    }
    
    // Find the best matching category
    let matchedCategory = null;
    let maxMatches = 0;

    for (const [category, data] of Object.entries(financialKnowledge)) {
      if (category === 'general' || category === 'greeting') continue;
      
      const matches = data.keywords.filter(keyword => lowerMessage.includes(keyword)).length;
      if (matches > maxMatches) {
        maxMatches = matches;
        matchedCategory = category;
      }
    }

    // Get response from matched category or use general
    const category = matchedCategory || 'general';
    const responses = financialKnowledge[category].responses;
    const response = responses[Math.floor(Math.random() * responses.length)];

    // Add helpful follow-up for specific topics
    if (category !== 'general' && category !== 'greeting') {
      return response + "\n\nIs there anything specific about this topic you'd like me to explain further?";
    }

    return response;
  }

  // Add message to chat
  function addMessage(text, isUser = false) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${isUser ? 'user-message' : 'bot-message'}`;
    
    // Format text with line breaks and lists
    const formattedText = formatMessage(text);
    
    if (isUser) {
      messageDiv.innerHTML = `
        <div class="message-content">
          <div class="message-text">${escapeHtml(text)}</div>
        </div>
      `;
    } else {
      messageDiv.innerHTML = `
        <div class="message-avatar">IV</div>
        <div class="message-content">
          <div class="message-text">${formattedText}</div>
        </div>
      `;
    }
    
    messagesContainer.appendChild(messageDiv);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
  }

  // Format message with line breaks and lists
  function formatMessage(text) {
    // Split by double newlines for paragraphs
    let formatted = escapeHtml(text);
    
    // Convert numbered lists (1. item) to HTML lists
    formatted = formatted.replace(/(\d+\.\s+[^\n]+(?:\n(?:\d+\.\s+[^\n]+))*)/g, (match) => {
      const items = match.split(/\d+\.\s+/).filter(item => item.trim());
      if (items.length > 1) {
        return '<ol>' + items.map(item => `<li>${item.trim()}</li>`).join('') + '</ol>';
      }
      return match;
    });
    
    // Convert bullet points (• item) to HTML lists
    formatted = formatted.replace(/(•\s+[^\n]+(?:\n(?:•\s+[^\n]+))*)/g, (match) => {
      const items = match.split(/•\s+/).filter(item => item.trim());
      if (items.length > 1) {
        return '<ul>' + items.map(item => `<li>${item.trim()}</li>`).join('') + '</ul>';
      }
      return match;
    });
    
    // Convert single newlines to <br> for line breaks
    formatted = formatted.replace(/\n/g, '<br>');
    
    return formatted;
  }

  // Escape HTML to prevent XSS
  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  // Show typing indicator
  function showTypingIndicator() {
    const typingDiv = document.createElement('div');
    typingDiv.className = 'message bot-message typing-indicator';
    typingDiv.id = 'typingIndicator';
    typingDiv.innerHTML = `
      <div class="message-avatar">IV</div>
      <div class="message-content">
        <div class="typing-dots">
          <span></span>
          <span></span>
          <span></span>
        </div>
      </div>
    `;
    messagesContainer.appendChild(typingDiv);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
  }

  // Remove typing indicator
  function removeTypingIndicator() {
    const indicator = document.getElementById('typingIndicator');
    if (indicator) {
      indicator.remove();
    }
  }

  // Handle form submission
  chatbotForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const userMessage = chatbotInput.value.trim();
    if (!userMessage) return;

    // Add user message
    addMessage(userMessage, true);
    chatbotInput.value = '';

    // Show typing indicator
    showTypingIndicator();

    // Simulate AI thinking time (more realistic)
    await new Promise(resolve => setTimeout(resolve, 800 + Math.random() * 700));

    // Remove typing indicator
    removeTypingIndicator();

    // Generate and add bot response
    const botResponse = generateResponse(userMessage);
    addMessage(botResponse, false);
  });

  // Focus input on load
  chatbotInput.focus();
})();
