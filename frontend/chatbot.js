// Intellivest AI Chatbot — starts after chatbot-survey.js signals readiness
(function () {
  function runChatbot() {
    const messagesContainer = document.getElementById('chatbotMessages');
    const chatbotForm = document.getElementById('chatbotForm');
    const chatbotInput = document.getElementById('chatbotInput');

    function surveyDone() {
      return localStorage.getItem('intellivest_survey_complete') === 'true';
    }

    function surveySkipped() {
      return localStorage.getItem('intellivest_survey_complete') === 'skipped';
    }

    function getSurveyProfile() {
      if (!surveyDone()) return null;
      let goals = [];
      try {
        goals = JSON.parse(localStorage.getItem('intellivest_user_goals') || '[]');
      } catch (e) {
        goals = [];
      }
      return {
        name: localStorage.getItem('intellivest_user_name') || '',
        age: localStorage.getItem('intellivest_user_age') || '',
        savings: localStorage.getItem('intellivest_user_savings') || '',
        risk: localStorage.getItem('intellivest_user_risk') || '',
        goals
      };
    }

    function normalizeGoals(goals) {
      return (goals || []).map(g => String(g || '').toLowerCase());
    }

    function getPersonalizedPlan(profile) {
      if (!profile) return { summary: ['Complete your profile survey to unlock a personalized plan.'] };
      const goals = normalizeGoals(profile.goals);
      const risk = (profile.risk || '').toLowerCase();
      const savings = profile.savings || '';
      const sections = [];

      function addSection(title, lines) {
        sections.push({ title, lines });
      }

      if (goals.some(g => g.includes('house'))) {
        const timelineLine =
          savings === 'Under $500' || savings === '$500–$2,000'
            ? 'You need to build savings first. Save at least $600/month to reach a starter down payment in about 4-6 years.'
            : savings === '$2,000–$10,000'
              ? 'You have a good start. At this pace, you could target an entry-level home range in 3-5 years with disciplined monthly savings.'
              : 'You may be ready to start the pre-approval process while continuing to build your down payment and emergency fund.';
        addSection('Buying a House Plan', [
          '1) Save a 20% down payment target to avoid PMI when possible.',
          '2) Build a 3-6 month emergency fund before home shopping.',
          '3) Keep debt-to-income below 43% and protect your cash flow.',
          '4) Build your credit score above 720 for better mortgage rates.',
          '5) Get pre-approved before house hunting.',
          '6) Budget 2-5% of loan amount for closing costs.',
          'Suggested places for down payment savings: HYSA (Marcus/Ally/SoFi), Series I Bonds, and short-term CD laddering.',
          'Conservative ETF ideas for 3+ year timelines: BND, SCHD, and modest VTI exposure.',
          timelineLine
        ]);
      }

      if (goals.some(g => g.includes('investing in stocks') || g.includes('stocks'))) {
        if (risk.includes('aggressive')) {
          addSection('Stocks Plan (Aggressive)', [
            'Use a core-satellite approach: core ETFs + selective individual stocks.',
            'Core ETFs: VTI, VXUS, and QQQ for higher growth tilt.',
            'Sector stock watchlist: Tech (AAPL, MSFT, NVDA, GOOGL, META), Healthcare (JNJ, UNH, ABBV), Finance (JPM, BAC, V, MA), Energy (XOM, CVX, NEE), Consumer (AMZN, COST, WMT), Minerals (BHP, FCX, NEM, VALE).',
            'Dollar-cost average monthly and keep at least 3-6 months cash reserves.',
            'Reference portfolio ideas: Buffett core holdings, Dalio all-weather mix, and high-risk innovation sleeves (ARK-style) in small allocation only.'
          ]);
        } else {
          addSection('Stocks Plan (Beginner / Balanced)', [
            'Start with index funds before individual stocks.',
            'Starter allocation idea: VTI (US), VXUS (international), BND (stability).',
            'Rule: do not invest money needed within 5 years.',
            'Automate a fixed monthly contribution (dollar-cost averaging).',
            'Review allocation quarterly and rebalance back to target weights.'
          ]);
        }
      }

      if (goals.some(g => g.includes('save money'))) {
        addSection('Saving Money Plan', [
          '1) Track all spending for 30 days (Mint/YNAB/spreadsheet).',
          '2) Use 50/30/20 budgeting: needs/wants/savings+debt.',
          '3) Automate savings on payday (pay yourself first).',
          '4) Cancel unused subscriptions and renegotiate recurring bills.',
          '5) Build $1,000 starter emergency fund, then 3-6 months expenses.',
          'Recommended accounts: HYSA (Marcus/Ally/SoFi), money market funds, and 6-24 month CDs.'
        ]);
      }

      if (goals.some(g => g.includes('credit'))) {
        addSection('Credit Score Plan', [
          'Score drivers: 35% payment history, 30% utilization, 15% history length, 10% new credit, 10% credit mix.',
          'Always pay on time and keep utilization under 30% (ideally under 10%).',
          'If score is building: start with secured card and monitor annualcreditreport.com.',
          'If score is improving: request limit increases after 6+ months and dispute report errors quickly.',
          'If score is strong: maintain low balances and apply selectively for rewards products.'
        ]);
      }

      if (goals.some(g => g.includes('mutual funds') || g.includes('etf'))) {
        const etfMix = risk.includes('aggressive')
          ? 'Aggressive sample mix: 60% VTI, 25% QQQ, 15% VXUS.'
          : risk.includes('moderate')
            ? 'Moderate sample mix: 50% VTI, 30% VXUS, 20% BND.'
            : 'Conservative sample mix: 60% BND, 30% VTI, 10% GLD.';
        addSection('Mutual Funds and ETFs Plan', [
          'ETF = intraday trading + lower fees; Mutual Fund = pooled fund, often minimum investment; Index Fund = tracks benchmark with low cost.',
          etfMix,
          'Beginner mutual funds to compare: FXAIX, VFIAX, SWTSX (low expense ratios).'
        ]);
      }

      if (goals.some(g => g.includes('retirement'))) {
        addSection('Retirement Plan', [
          'Priority order: 401(k) match first, then Roth IRA, then Traditional IRA/HSA as relevant.',
          'Roth IRA is often strong for young earners due to tax-free growth potential.',
          'Milestones: by 30 save ~1x salary, by 40 ~3x, by 50 ~6x, by 60 ~8x.',
          'Compound-interest reminder: starting 10 years earlier can roughly double outcomes at retirement.'
        ]);
      }

      if (sections.length === 0) {
        addSection('Starter Plan', [
          'Build a 3-month emergency fund, pay high-interest debt, and automate monthly investing in broad low-cost funds.'
        ]);
      }

      return { sections };
    }

    function formatPlanForMessage(plan) {
      const parts = [];
      (plan.sections || []).forEach(section => {
        parts.push(section.title + ':');
        (section.lines || []).forEach(line => parts.push('• ' + line));
        parts.push('');
      });
      return parts.join('\n').trim();
    }

    function buildWelcomeAfterSurvey() {
      const p = getSurveyProfile();
      const first = (p && p.name) ? p.name.split(/\s+/)[0] : 'there';
      const goals = (p && p.goals) || [];
      const goalsText = goals.length ? goals.join(', ') : 'General financial planning';
      const planText = formatPlanForMessage(getPersonalizedPlan(p));
      return (
        'Welcome back, ' +
        first +
        '! 👋\n\n' +
        'Based on your profile:\n' +
        '📊 Risk Level: ' + (p?.risk || 'Not set') + '\n' +
        '💰 Available to invest: ' + (p?.savings || 'Not set') + '\n' +
        '🎯 Your goals: ' + goalsText + '\n\n' +
        "Here's your personalized plan:\n" +
        planText +
        '\n\n' +
        'What would you like help with today?'
      );
    }

    function defaultWelcome() {
      return (
        "Hello! I'm Intellivest AI, your financial literacy assistant. I can help with budgeting, saving, investing basics, credit, loans, and more. What would you like to know?"
      );
    }

    function tailorResponse(baseResponse, userMessage, categoryKey) {
      if (!surveyDone()) return baseResponse;
      const p = getSurveyProfile();
      if (!p) return baseResponse;
      const lower = userMessage.toLowerCase();
      const goals = p.goals || [];
      const risk = (p.risk || '').toLowerCase();
      const age = p.age || '';
      const g = goals.join(' ').toLowerCase();
      const extras = [];

      if (
        goals.some(x => x.includes('stocks')) &&
        (risk.includes('aggressive') || risk.includes('very aggressive'))
      ) {
        extras.push(
          'For your profile (stocks + higher risk tolerance), consider diversified growth exposure such as broad stock index funds or ETFs like QQQ — still keep costs low and only invest money you can leave invested long term.'
        );
      }
      if (goals.some(x => x.includes('credit'))) {
        extras.push(
          'On credit: secured cards, paying on time every month, and keeping utilization low are solid starting points.'
        );
      }
      if (goals.some(x => x.includes('house'))) {
        extras.push(
          'For a home goal: separate an emergency fund first, then save toward a down payment in a high-yield savings account; when you are close, compare mortgage rates and closing costs.'
        );
      }
      if (
        goals.some(x => x.includes('save money')) &&
        (risk.includes('conservative') || risk.includes('very conservative'))
      ) {
        extras.push(
          'With saving goals and a conservative stance, high-yield savings, CDs, and I bonds can be worth comparing for cash you need in the next few years.'
        );
      }
      if (age === 'Under 18' || age === '18–24' || age === '25–34') {
        extras.push(
          'Starting early gives compound interest more time to work — even small regular amounts can add up.'
        );
      }
      // IMPORTANT: never show internal profile context text in the chat UI.
      if (extras.length === 0) return baseResponse;
      var pick = extras[Math.floor(Math.random() * extras.length)];
      if (
        (categoryKey === 'credit' && g.includes('credit')) ||
        (categoryKey === 'investing' && (g.includes('stock') || g.includes('etf'))) ||
        (categoryKey === 'saving' && g.includes('save'))
      ) {
        return baseResponse + '\n\n' + pick;
      }
      if (/invest|stock|save|credit|budget|retire|fund|etf/i.test(lower)) {
        return baseResponse + '\n\n' + pick;
      }
      return baseResponse + '\n\n' + pick;
    }

    const financialKnowledge = {
      greeting: {
        keywords: ['hello', 'hi', 'hey', 'greetings', "what's up", 'sup'],
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

    function isStockTicker(message) {
      const tickerPattern = /\b\$?[A-Z]{1,5}\b/g;
      const commonWords = [
        'I', 'A', 'MY', 'IN', 'IT', 'BE', 'DO', 'GO', 'ME', 'NO', 'OR', 'SO', 'TO',
        'UP', 'US', 'WE', 'AM', 'AN', 'AS', 'AT', 'BY', 'HE', 'IF', 'IS', 'OF', 'ON', 'TV', 'OK', 'AI',
        'HOW', 'CAN', 'YOU', 'THE', 'AND', 'FOR', 'ARE', 'NOT', 'GET', 'HAS', 'HAD', 'HIM', 'HIS', 'WAS',
        'WHO', 'DID', 'ITS', 'LET', 'MAY', 'NEW', 'NOW', 'OLD', 'OWN', 'SAY', 'SHE', 'TOO', 'USE', 'WAY',
        'WHAT', 'WHEN', 'WILL', 'WITH', 'HAVE', 'FROM', 'THEY', 'THAT', 'THIS', 'BEEN', 'WERE', 'SAID',
        'EACH', 'MAKE', 'LIKE', 'INTO', 'THAN', 'THEN', 'TIME', 'LOOK', 'ALSO', 'BACK', 'JUST', 'COME',
        'GOOD', 'KNOW', 'ONLY', 'OVER', 'SUCH', 'WELL', 'WANT', 'GIVE', 'MOST', 'TELL', 'VERY', 'EVEN',
        'SAVE', 'MONEY'
      ];
      const matches = String(message || '').toUpperCase().match(tickerPattern);
      if (!matches) return null;
      const tickers = matches.filter(m => !commonWords.includes(m.replace('$', '')));
      return tickers.length > 0 ? tickers[0].replace('$', '') : null;
    }

    async function fetchLiveTickerData(symbol) {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000);
      const url =
        'https://corsproxy.io/?https://query1.finance.yahoo.com/v8/finance/chart/' +
        encodeURIComponent(symbol) +
        '?interval=1d&range=1d';
      let res;
      try {
        res = await fetch(url, {
          headers: { Accept: 'application/json' },
          signal: controller.signal
        });
      } catch (e) {
        clearTimeout(timeoutId);
        throw e;
      }
      clearTimeout(timeoutId);
      if (!res.ok) throw new Error('live quote unavailable');
      const data = await res.json();
      const result = data?.chart?.result?.[0];
      const meta = result?.meta;
      if (!meta) throw new Error('quote payload missing');
      const price = Number(meta.regularMarketPrice);
      const prev = Number(meta.chartPreviousClose ?? meta.previousClose);
      if (Number.isNaN(price) || Number.isNaN(prev) || prev === 0) {
        throw new Error('quote fields missing');
      }
      const pct = ((price - prev) / prev) * 100;
      return {
        price,
        pct,
        high52: meta.fiftyTwoWeekHigh != null ? Number(meta.fiftyTwoWeekHigh) : null,
        low52: meta.fiftyTwoWeekLow != null ? Number(meta.fiftyTwoWeekLow) : null
      };
    }

    function buildRiskAdviceForTicker(symbol, pct, profile) {
      const risk = (profile?.risk || '').toLowerCase();
      const volatility = Math.abs(pct) >= 2 ? 'volatile' : 'stable';
      if (risk.includes('conservative')) {
        return (
          'This stock is currently ' +
          volatility +
          '. Given your conservative profile, consider broader ETFs like VTI or BND for a steadier risk profile.'
        );
      }
      if (risk.includes('aggressive')) {
        return (
          'This setup has upside potential but can swing quickly. It aligns better with an aggressive profile when used as part of a diversified portfolio.'
        );
      }
      return 'A balanced approach is to limit single-stock exposure and pair it with diversified ETFs like VTI and VXUS.';
    }

    function generateKnowledgeBaseResponse(userMessage) {
      // Read profile values first (and only from localStorage).
      const userName = localStorage.getItem('intellivest_user_name') || 'there';
      const risk = localStorage.getItem('intellivest_user_risk') || 'Moderate';
      const savings = localStorage.getItem('intellivest_user_savings') || 'Unknown';
      const goals = JSON.parse(localStorage.getItem('intellivest_user_goals') || '[]');
      const age = localStorage.getItem('intellivest_user_age') || 'Unknown';

      const name = (userName || 'there').split(/\s+/)[0] || 'there';
      const lowerMessage = String(userMessage || '').toLowerCase().trim();

      // Greeting path stays fast and personal; never leaks "Profile context:".
      if (financialKnowledge.greeting.keywords.some(kw => lowerMessage.includes(kw))) {
        if (surveyDone()) return buildWelcomeAfterSurvey();
        if (surveySkipped()) return defaultWelcome();
        const responses = financialKnowledge.greeting.responses;
        return responses[Math.floor(Math.random() * responses.length)];
      }

      function isHouseTopic() {
        return (
          lowerMessage.includes('house') ||
          lowerMessage.includes('home') ||
          lowerMessage.includes('mortgage') ||
          lowerMessage.includes('buy a home') ||
          lowerMessage.includes('down payment') ||
          lowerMessage.includes('real estate') ||
          lowerMessage.includes('property')
        );
      }

      function isSmallStocksTopic() {
        return (
          /\$\s*(100|50|200)\b/.test(lowerMessage) ||
          lowerMessage.includes('small amount') ||
          lowerMessage.includes('little money') ||
          lowerMessage.includes('not much money') ||
          lowerMessage.includes('what stocks') ||
          lowerMessage.includes('which stocks') ||
          lowerMessage.includes('stocks should i buy') ||
          /\binvest\s*\$\s*\d{1,6}\b/.test(lowerMessage)
        );
      }

      function isBudgetTopic() {
        return (
          lowerMessage.includes('budget') ||
          lowerMessage.includes('spending') ||
          lowerMessage.includes('expenses') ||
          lowerMessage.includes('where does my money go') ||
          lowerMessage.includes('manage money') ||
          lowerMessage.includes('track spending')
        );
      }

      function isCreditTopic() {
        return (
          lowerMessage.includes('credit') ||
          lowerMessage.includes('credit score') ||
          lowerMessage.includes('credit card') ||
          lowerMessage.includes('build credit') ||
          lowerMessage.includes('improve credit') ||
          lowerMessage.includes('fico')
        );
      }

      function isSavingTopic() {
        return (
          lowerMessage.includes('save') ||
          lowerMessage.includes('saving') ||
          lowerMessage.includes('savings account') ||
          lowerMessage.includes('emergency fund') ||
          lowerMessage.includes('hysa') ||
          lowerMessage.includes('put money away')
        );
      }

      function isEtfOrMutualFundsTopic() {
        return (
          lowerMessage.includes('etf') ||
          lowerMessage.includes('index fund') ||
          lowerMessage.includes('mutual fund') ||
          lowerMessage.includes('vanguard') ||
          lowerMessage.includes('fidelity') ||
          lowerMessage.includes('fund') ||
          lowerMessage.includes('voo') ||
          lowerMessage.includes('vti')
        );
      }

      function isRetirementTopic() {
        return (
          lowerMessage.includes('retire') ||
          lowerMessage.includes('retirement') ||
          lowerMessage.includes('401k') ||
          lowerMessage.includes('ira') ||
          lowerMessage.includes('roth') ||
          lowerMessage.includes('pension') ||
          lowerMessage.includes('retire early')
        );
      }

      function isLoansOrScholarshipsTopic() {
        // Use the existing knowledge base keywords, but route via explicit topic detection.
        const loanKeywords = (financialKnowledge.loans && financialKnowledge.loans.keywords) || [];
        const scholarshipKeywords =
          (financialKnowledge.scholarships && financialKnowledge.scholarships.keywords) || [];
        const loanHit = loanKeywords.some(kw => lowerMessage.includes(String(kw).toLowerCase()));
        const scholarshipHit = scholarshipKeywords.some(kw => lowerMessage.includes(String(kw).toLowerCase()));
        return loanHit || scholarshipHit;
      }

      function isTaxesTopic() {
        const taxKeywords = (financialKnowledge.taxes && financialKnowledge.taxes.keywords) || [];
        return taxKeywords.some(kw => lowerMessage.includes(String(kw).toLowerCase()));
      }

      function savingsBucketForHouse(s) {
        if (s === 'Under $500') return 'Under $500';
        if (s === '$500–$2,000') return '$500–$2,000';
        if (s === '$2,000–$10,000') return '$2,000–$10,000';
        if (s === '$10,000–$50,000' || s === '$50,000+') return '$10,000+';
        return 'Unknown';
      }

      function riskGroupForSmallStocks(r) {
        if (r === 'Very Conservative' || r === 'Conservative') return 'conservative';
        if (r === 'Moderate') return 'moderate';
        if (r === 'Aggressive' || r === 'Very Aggressive') return 'aggressive';
        return 'moderate';
      }

      const house = isHouseTopic();
      if (house) {
        const bucket = savingsBucketForHouse(savings);
        // #region agent log
        fetch('http://127.0.0.1:7358/ingest/6cde8b47-2e94-4e16-8946-d652773068d7', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'X-Debug-Session-Id': '69af8c' },
          body: JSON.stringify({
            sessionId: '69af8c',
            runId: 'run-topic-routing',
            hypothesisId: 'H2',
            location: 'chatbot.js:generateKnowledgeBaseResponse',
            message: 'topic_template',
            data: { topic: 'house', savingsBucket: bucket },
            timestamp: Date.now()
          })
        }).catch(() => {});
        // #endregion
        return (
          'Great question, ' +
          name +
          "! Here's your personalized home buying plan:\n\n" +
          '🏠 STEP-BY-STEP PLAN:\n' +
          '1. Build your credit score to 720+ \n' +
          '   (best mortgage interest rates start here)\n' +
          '2. Save a 20% down payment to avoid PMI insurance\n' +
          '3. Keep your debt-to-income ratio below 43%\n' +
          '4. Build a separate emergency fund of 3-6 months \n' +
          '   of expenses BEFORE buying\n' +
          '5. Get mortgage pre-approval before house hunting\n' +
          '6. Budget an extra 2-5% of the home price for \n' +
          '   closing costs\n\n' +
          '💰 SINCE YOU HAVE ' +
          savings +
          ' SAVED:\n' +
          (bucket === 'Under $500'
            ? "You're in the early stages. \n  Start by saving $300-500/month in a High-Yield Savings Account (HYSA). At that rate you could have a $10,000 down payment foundation in 2 years."
            : bucket === '$500–$2,000'
              ? 'Good start! Open an Ally or \n  Marcus HYSA earning 4-5% APY and keep building.'
              : bucket === '$2,000–$10,000'
                ? 'You have momentum. \n  A $200,000 home needs ~$40,000 down. \n  Stay consistent with monthly savings.'
                : bucket === '$10,000+'
                  ? 'You may be ready to explore \n  pre-approval. Talk to a mortgage broker.'
                  : 'Keep building your down payment and emergency fund steadily so you can move forward with confidence.') +
          '\n\n' +
          '🏦 BEST ACCOUNTS TO SAVE FOR A HOUSE:\n' +
          '• High-Yield Savings Account: Ally, Marcus, SoFi \n' +
          '  (4-5% APY)\n' +
          '• Series I Bonds (inflation protection)\n' +
          '• Short-term CDs (6-12 month laddering)\n\n' +
          '⚠️ AVOID investing your down payment money \n' +
          'in stocks — the market can drop right when \n' +
          'you need the cash.'
        );
      }

      const smallStocks = isSmallStocksTopic();
      if (smallStocks) {
        const rg = riskGroupForSmallStocks(risk);
        const riskLabel = risk;
        // #region agent log
        fetch('http://127.0.0.1:7358/ingest/6cde8b47-2e94-4e16-8946-d652773068d7', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'X-Debug-Session-Id': '69af8c' },
          body: JSON.stringify({
            sessionId: '69af8c',
            runId: 'run-topic-routing',
            hypothesisId: 'H2',
            location: 'chatbot.js:generateKnowledgeBaseResponse',
            message: 'topic_template',
            data: { topic: 'stocks_small', riskGroup: rg },
            timestamp: Date.now()
          })
        }).catch(() => {});
        // #endregion
        return (
          "Here's exactly what I'd do with $100, " +
          name +
          '! 🚀\n\n' +
          'Since your risk level is ' +
          riskLabel +
          ', here\'s your plan:\n\n' +
          (rg === 'conservative'
            ? '📊 SAFE PICKS FOR $100:\n' +
              '• $40 → VOO (S&P 500 index — tracks top 500 US companies)\n' +
              '• $30 → VTI (Total US market — even more diversified)\n' +
              '• $20 → SCHD (Dividend stocks — pay you cash regularly)\n' +
              '• $10 → Keep as cash reserve\n' +
              'Why: These are the lowest risk way to start. \n' +
              'You own a tiny piece of hundreds of companies.'
            : rg === 'moderate'
              ? '📊 BALANCED PICKS FOR $100:\n' +
                '• $35 → VOO (S&P 500 foundation)\n' +
                '• $25 → QQQ (Top 100 tech companies)\n' +
                '• $25 → SCHD (Dividend income)\n' +
                '• $15 → Pick 1 company you believe in \n' +
                '        (AAPL, MSFT, or AMZN are solid)\n'
              : '📊 GROWTH PICKS FOR $100:\n' +
                '• $30 → QQQ (Heavy tech: Apple, Nvidia, Microsoft)\n' +
                '• $20 → NVDA (AI chip leader, high growth)\n' +
                '• $20 → MSFT (AI + cloud dominance)\n' +
                '• $15 → AMZN (E-commerce + AWS cloud)\n' +
                '• $15 → VOO (Always keep a stable base)\n\n') +
          '\n💡 HOW TO ACTUALLY BUY THESE:\n' +
          '1. Open a free brokerage account:\n' +
          '   • Robinhood — easiest for beginners\n' +
          '   • Fidelity — most trusted, no fees\n' +
          '   • Webull — good charts and tools\n\n' +
          '2. All of these let you buy FRACTIONAL shares\n' +
          '   meaning you can buy $10 of NVDA even if \n' +
          'one share costs $800\n\n' +
          '3. Search the ticker symbol (like QQQ or NVDA)\n' +
          '4. Click Buy → enter dollar amount → confirm\n\n' +
          '⚡ GOLDEN RULE: Invest the same amount every \n' +
          'month regardless of price. This is called \n' +
          'Dollar Cost Averaging and it beats trying \n' +
          'to time the market every time.'
        );
      }

      if (isBudgetTopic()) {
        // #region agent log
        fetch('http://127.0.0.1:7358/ingest/6cde8b47-2e94-4e16-8946-d652773068d7', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'X-Debug-Session-Id': '69af8c' },
          body: JSON.stringify({
            sessionId: '69af8c',
            runId: 'run-topic-routing',
            hypothesisId: 'H2',
            location: 'chatbot.js:generateKnowledgeBaseResponse',
            message: 'topic_template',
            data: { topic: 'budget', savings },
            timestamp: Date.now()
          })
        }).catch(() => {});
        // #endregion
        return (
          "Here's a simple budget plan for you, " +
          name +
          '! 💰\n\n' +
          '📊 THE 50/30/20 RULE:\n' +
          '• 50% → Needs: rent, food, utilities, transport\n' +
          '• 30% → Wants: dining out, subscriptions, fun\n' +
          '• 20% → Savings + investing + debt payoff\n\n' +
          '🛠️ FREE TOOLS TO TRACK IT:\n' +
          '• Mint (automatic spending categories)\n' +
          '• YNAB — You Need A Budget (best for discipline)\n' +
          '• EveryDollar (simple and clean)\n' +
          '• Just a Google Sheet works great too\n\n' +
          '⚡ QUICK WINS THIS WEEK:\n' +
          '1. List every subscription you pay — cancel unused ones\n' +
          '2. Set up automatic transfer to savings on payday\n' +
          '3. Use cash for groceries to spend less naturally\n' +
          '4. Meal prep 2-3 days a week to cut food costs' +
          (savings === 'Under $500'
            ? '\n\n🎯 YOUR FIRST GOAL: Get to $1,000 emergency fund.\nEven saving $50/week gets you there in 5 months.'
            : '')
        );
      }

      if (isCreditTopic()) {
        // #region agent log
        fetch('http://127.0.0.1:7358/ingest/6cde8b47-2e94-4e16-8946-d652773068d7', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'X-Debug-Session-Id': '69af8c' },
          body: JSON.stringify({
            sessionId: '69af8c',
            runId: 'run-topic-routing',
            hypothesisId: 'H2',
            location: 'chatbot.js:generateKnowledgeBaseResponse',
            message: 'topic_template',
            data: { topic: 'credit', risk },
            timestamp: Date.now()
          })
        }).catch(() => {});
        // #endregion
        return (
          "Here's your credit score game plan, " +
          name +
          '! 💳\n\n' +
          '📊 HOW YOUR SCORE IS CALCULATED:\n' +
          '• 35% → Payment history (MOST important — never miss)\n' +
          '• 30% → Credit utilization (keep under 30%, \n         ideally under 10%)\n' +
          '• 15% → Length of credit history (keep old cards open)\n' +
          '• 10% → Credit mix (card + loan = better)\n' +
          '• 10% → New credit (don\'t apply for many at once)\n\n' +
          '🎯 ACTION PLAN:\n' +
          'Under 580 (Poor):\n' +
          '→ Get a secured credit card: \n' +
          '  Discover it Secured or Capital One Secured\n' +
          '→ Use it for ONE small purchase per month\n' +
          '→ Pay it off IN FULL every month\n' +
          '→ Never miss a payment — set autopay\n\n' +
          '580-669 (Fair):\n' +
          '→ Apply for Capital One Quicksilver or Credit One\n' +
          '→ Keep utilization under 30% always\n' +
          '→ Ask for credit limit increase after 6 months\n\n' +
          '670-739 (Good):\n' +
          '→ Apply for a rewards card (Chase Freedom, \n' +
          '  Discover it Cash Back)\n' +
          '→ Goal: get to 740 for best loan rates\n\n' +
          '740+ (Excellent):\n' +
          '→ Premium cards: Chase Sapphire, Amex Gold\n' +
          '→ You qualify for best mortgage and car loan rates\n\n' +
          '🆓 CHECK YOUR SCORE FREE:\n' +
          '• Credit Karma (free, no card needed)\n' +
          '• annualcreditreport.com (official, once per year)'
        );
      }

      if (isSavingTopic()) {
        // #region agent log
        fetch('http://127.0.0.1:7358/ingest/6cde8b47-2e94-4e16-8946-d652773068d7', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'X-Debug-Session-Id': '69af8c' },
          body: JSON.stringify({
            sessionId: '69af8c',
            runId: 'run-topic-routing',
            hypothesisId: 'H2',
            location: 'chatbot.js:generateKnowledgeBaseResponse',
            message: 'topic_template',
            data: { topic: 'saving', savingsBucket: savings },
            timestamp: Date.now()
          })
        }).catch(() => {});
        // #endregion
        if (savings === 'Under $500') {
          return (
            "Here's exactly how to start saving, " +
            name +
            '! 🏦\n\n' +
            '🎯 STEP 1: Hit $1,000 first (starter emergency fund)\n' +
            '• Save $84/month = $1,000 in 12 months\n' +
            '• Save $125/month = $1,000 in 8 months  \n' +
            '• Save $200/month = $1,000 in 5 months\n' +
            'Pick whichever fits your budget.\n\n' +
            '🏦 WHERE TO PUT YOUR SAVINGS:\n' +
            '• Ally Bank HYSA — 4.5% APY, no minimums\n' +
            '• Marcus by Goldman Sachs — 4.4% APY\n' +
            '• SoFi — 4.6% APY + free checking\n' +
            'All are FDIC insured (your money is protected)\n\n' +
            'vs a regular bank savings account that pays \n' +
            'only 0.01% APY — these pay 400x more interest!\n\n' +
            '⚡ TRICK THAT WORKS: \n' +
            'Set up an automatic transfer of even $25 \n' +
            'the same day you get paid. \n' +
            'You won\'t miss what you never see.\n\n' +
            '🎯 SAVINGS MILESTONES:\n' +
            '$1,000 → Starter emergency fund ✓\n' +
            '$3,000 → 1 month expenses covered ✓  \n' +
            '$9,000 → 3 months expenses (full emergency fund) ✓\n' +
            'After that → Start investing the rest'
          );
        }

        // For other savings tiers, keep it specific without mentioning live data.
        return (
          "Here's exactly how to keep building your savings, " +
          name +
          '! 🏦\n\n' +
          '🎯 NEXT MILESTONE: \n' +
          (savings === '$500–$2,000'
            ? '$3,000 to cover about 1 month of expenses\n'
            : savings === '$2,000–$10,000'
              ? '$9,000 to fully fund about 3 months of expenses\n'
              : '$9,000+ (your full emergency fund), then start investing the rest\n') +
          '⚡ Use automatic transfers on payday and keep the emergency fund in a HYSA (Ally, Marcus, or SoFi).'
        );
      }

      if (isEtfOrMutualFundsTopic()) {
        const rg = (risk || '').toLowerCase();
        const rec =
          rg.includes('conservative')
            ? 'Conservative: \n  BND (bonds), SCHD (dividends), VTI (total market)\n\nModerate:\n  VOO (S&P 500), VTI (Total US), VXUS (international)\n\nAggressive:\n  QQQ (top 100 tech), VGT (tech sector), \n  ARKK (disruptive innovation — high risk)'
            : rg.includes('aggressive')
              ? 'Conservative: \n  BND (bonds), SCHD (dividends), VTI (total market)\n\nModerate:\n  VOO (S&P 500), VTI (Total US), VXUS (international)\n\nAggressive:\n  QQQ (top 100 tech), VGT (tech sector), \n  ARKK (disruptive innovation — high risk)'
              : 'Conservative: \n  BND (bonds), SCHD (dividends), VTI (total market)\n\nModerate:\n  VOO (S&P 500), VTI (Total US), VXUS (international)\n\nAggressive:\n  QQQ (top 100 tech), VGT (tech sector), \n  ARKK (disruptive innovation — high risk)';

        // Use the exact template style, and show appropriate recommendations based on risk.
        const topEtfs =
          rg.includes('conservative')
            ? 'TOP ETFs FOR BEGINNERS:\nConservative: \n  BND (bonds), SCHD (dividends), VTI (total market)'
            : rg.includes('aggressive')
              ? 'TOP ETFs FOR BEGINNERS:\nAggressive:\n  QQQ (top 100 tech), VGT (tech sector), \n  ARKK (disruptive innovation — high risk)'
              : 'TOP ETFs FOR BEGINNERS:\nModerate:\n  VOO (S&P 500), VTI (total US), VXUS (international)';

        const topMutual =
          'TOP MUTUAL FUNDS (low cost):\n• FXAIX — Fidelity S&P 500 (0.015% fee — cheapest)\n• VFIAX — Vanguard S&P 500 (0.04% fee)\n• SWTSX — Schwab Total Market (0.03% fee)';

        return (
          'Great topic, ' +
          name +
          '! Here\'s the breakdown 📊\n\n' +
          'ETF vs MUTUAL FUND — WHATS THE DIFFERENCE:\n' +
          '• ETF: Trades like a stock during market hours,\n' +
          '  lower fees, can buy fractional shares, \n' +
          '  great for beginners\n' +
          '• Mutual Fund: Only trades once per day at close,\n' +
          '  often requires $1,000 minimum to start,\n' +
          '  some are actively managed (higher fees)\n' +
          '• Index Fund: Can be either ETF or mutual fund,\n' +
          '  just tracks a market index like S&P 500,\n' +
          '  lowest fees of all\n\n' +
          '[Based on risk level - show appropriate recommendations]\n\n' +
          topEtfs +
          '\n\n' +
          topMutual +
          '\n\n' +
          '💡 FEE MATTERS MORE THAN YOU THINK:\n' +
          '1% fee vs 0.03% fee on $10,000 over 30 years:\n' +
          '= $70,000 difference in your final balance'
        );
      }

      if (isRetirementTopic()) {
        return (
          "Here's your retirement roadmap, " +
          name +
          '! 🏖️\n\n' +
          'ACCOUNTS TO OPEN IN THIS ORDER:\n' +
          '1. 401(k) up to employer match — its FREE money\n' +
          '   If employer matches 3%, contribute at least 3%\n' +
          '   Never leave this on the table\n' +
          '2. Roth IRA — max it out ($7,000/year for under 50)\n' +
          '   Best for young people: pay taxes now, \n' +
          '   NEVER pay taxes on growth or withdrawals\n' +
          '3. Back to 401(k) — contribute more if you can\n' +
          '4. HSA — if you have high-deductible health plan\n' +
          '   Triple tax advantage (best account that exists)\n' +
          '5. Regular brokerage — no limits, no restrictions\n\n' +
          '🧮 COMPOUND INTEREST IS MAGIC:\n' +
          '$200/month starting at 22 → ~$1,000,000 at 65\n' +
          '$200/month starting at 32 → ~$500,000 at 65\n' +
          '$200/month starting at 42 → ~$220,000 at 65\n' +
          '(assumes 8% average annual return)\n\n' +
          'Starting 10 years earlier = 2x the money! 🤯\n\n' +
          'RETIREMENT SAVINGS TARGETS BY AGE:\n' +
          'By 30: Have 1x your annual salary saved\n' +
          'By 40: Have 3x your annual salary saved\n' +
          'By 50: Have 6x your annual salary saved\n' +
          'By 60: Have 8x your annual salary saved'
        );
      }

      // Loans / scholarships / taxes: keep deterministic, use existing knowledge base content.
      if (isLoansOrScholarshipsTopic()) {
        const key = isTaxesTopic() ? 'taxes' : 'loans';
        const category = lowerMessage.includes('scholar') ? 'scholarships' : key;
        const responses = (financialKnowledge[category] && financialKnowledge[category].responses) || [];
        const response = responses[0] || defaultWelcome();
        return response;
      }
      if (isTaxesTopic()) {
        const responses = (financialKnowledge.taxes && financialKnowledge.taxes.responses) || [];
        return responses[0] || defaultWelcome();
      }

      // FALLBACK for everything else (verbatim).
      // #region agent log
      fetch('http://127.0.0.1:7358/ingest/6cde8b47-2e94-4e16-8946-d652773068d7', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Debug-Session-Id': '69af8c' },
        body: JSON.stringify({
          sessionId: '69af8c',
          runId: 'run-topic-routing',
          hypothesisId: 'H2',
          location: 'chatbot.js:generateKnowledgeBaseResponse',
          message: 'topic_template',
          data: { topic: 'fallback' },
          timestamp: Date.now()
        })
      }).catch(() => {});
      // #endregion
      return (
        'I want to make sure I give you the best answer, ' +
        name +
        '! Could you ask about one of these topics?\n\n' +
        '💰 Budgeting & Saving\n' +
        '📈 Stocks & Investing  \n' +
        '🏠 Buying a House\n' +
        '💳 Credit Score\n' +
        '🏦 ETFs & Mutual Funds\n' +
        '🏖️ Retirement Planning\n' +
        '📚 Student Loans & Scholarships\n' +
        '🧾 Taxes\n\n' +
        'What would you like help with?'
      );
    }

    async function generateResponse(userMessage) {
      const userName = localStorage.getItem('intellivest_user_name') || 'there';
      const risk = localStorage.getItem('intellivest_user_risk') || 'Moderate';
      const savings = localStorage.getItem('intellivest_user_savings') || 'Unknown';
      const goals = JSON.parse(localStorage.getItem('intellivest_user_goals') || '[]');
      const age = localStorage.getItem('intellivest_user_age') || 'Unknown';
      const profile = { risk, savings, goals, age };
      const ticker = isStockTicker(userMessage);
      // #region agent log
      fetch('http://127.0.0.1:7358/ingest/6cde8b47-2e94-4e16-8946-d652773068d7', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Debug-Session-Id': '69af8c' },
        body: JSON.stringify({
          sessionId: '69af8c',
          runId: 'run-chatbot',
          hypothesisId: 'H4',
          location: 'chatbot.js:generateResponse',
          message: 'ticker_detected',
          data: { hasTicker: Boolean(ticker) },
          timestamp: Date.now()
        })
      }).catch(() => {});
      // #endregion
      if (ticker) {
        try {
          const live = await fetchLiveTickerData(ticker);
          const up = live.pct >= 0;
          const moveLine = (up ? '🟢 ▲ +' : '🔴 ▼ ') + live.pct.toFixed(2) + '%';
          return (
            ticker +
            ' live snapshot:\n' +
            '• Current price: $' +
            live.price.toFixed(2) +
            '\n' +
            '• Daily change: ' +
            moveLine +
            '\n' +
            '• 52-week high: ' +
            (live.high52 != null && !Number.isNaN(live.high52) ? '$' + live.high52.toFixed(2) : 'N/A') +
            '\n' +
            '• 52-week low: ' +
            (live.low52 != null && !Number.isNaN(live.low52) ? '$' + live.low52.toFixed(2) : 'N/A') +
            '\n\n' +
            buildRiskAdviceForTicker(ticker, live.pct, profile)
          );
        } catch (e) {
          // Ticker requests fail fast; still respond cleanly without "live data" messaging.
          return (
            ticker +
            ' quick guidance:\n\n' +
            buildRiskAdviceForTicker(ticker, 0, profile)
          );
        }
      }
      return generateKnowledgeBaseResponse(userMessage);
    }

    function addMessage(text, isUser = false) {
      const messageDiv = document.createElement('div');
      messageDiv.className = `message ${isUser ? 'user-message' : 'bot-message'}`;
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

    function formatMessage(text) {
      let formatted = escapeHtml(text);
      formatted = formatted.replace(/(\d+\.\s+[^\n]+(?:\n(?:\d+\.\s+[^\n]+))*)/g, match => {
        const items = match.split(/\d+\.\s+/).filter(item => item.trim());
        if (items.length > 1) {
          return '<ol>' + items.map(item => `<li>${item.trim()}</li>`).join('') + '</ol>';
        }
        return match;
      });
      formatted = formatted.replace(/(•\s+[^\n]+(?:\n(?:•\s+[^\n]+))*)/g, match => {
        const items = match.split(/•\s+/).filter(item => item.trim());
        if (items.length > 1) {
          return '<ul>' + items.map(item => `<li>${item.trim()}</li>`).join('') + '</ul>';
        }
        return match;
      });
      formatted = formatted.replace(/\n/g, '<br>');
      return formatted;
    }

    function escapeHtml(text) {
      const div = document.createElement('div');
      div.textContent = text;
      return div.innerHTML;
    }

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

    function removeTypingIndicator() {
      const indicator = document.getElementById('typingIndicator');
      if (indicator) indicator.remove();
    }

    function refreshWelcome() {
      if (!messagesContainer) return;
      messagesContainer.innerHTML = '';
      if (surveyDone()) {
        addMessage(buildWelcomeAfterSurvey(), false);
      } else {
        addMessage(defaultWelcome(), false);
      }
    }

    if (!window.__chatbotUiStarted) {
      window.__chatbotUiStarted = true;

      if (chatbotForm) {
        chatbotForm.addEventListener('submit', async e => {
          e.preventDefault();
          const userMessage = chatbotInput.value.trim();
          if (!userMessage) return;
          addMessage(userMessage, true);
          chatbotInput.value = '';
          showTypingIndicator();
          await new Promise(resolve =>
            setTimeout(resolve, Math.min(500, Math.floor(200 + Math.random() * 301)))
          );
          removeTypingIndicator();
          addMessage(await generateResponse(userMessage), false);
        });
      }
    }

    refreshWelcome();
    window.__chatbotRefreshWelcome = refreshWelcome;

    if (chatbotInput) chatbotInput.focus();
  }

  document.addEventListener('chatbot-survey-ready', runChatbot);
})();
