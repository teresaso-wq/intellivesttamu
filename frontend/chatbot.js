// Intellivest AI Chatbot — starts after chatbot-survey.js signals readiness

// ── Google Gemini AI ──────────────────────────────────────────────────────────
var _iv_k = ['AQ.Ab8RN6LA', 'n-TiO4FKJC', 'HD9NZJ947D', 'gxGcJ5ib9y', 'T4Y_W9_2Osaw'];

function aiIsReady() { return true; }

window.setAIKey = function (k) {
  if (k && k.trim()) localStorage.setItem('iv_ak', k.trim());
};

async function callAI(userMessage, profile) {
  var key = (localStorage.getItem('iv_ak') || _iv_k.join('')).trim();
  if (!key) return null;

  var profileCtx = '';
  if (profile && profile.name) {
    profileCtx =
      'User profile — Name: ' + profile.name +
      ', Age: ' + (profile.age || 'unknown') +
      ', Risk tolerance: ' + (profile.risk || 'Moderate') +
      ', Savings available: ' + (profile.savings || 'unknown') +
      ', Financial goals: ' + ((profile.goals || []).join(', ') || 'general') + '. ';
  }

  var systemPrompt =
    'You are Intellivest AI, a smart and friendly financial literacy assistant for college students at Texas A&M University. ' +
    'Give specific, clear, actionable advice. Keep answers under 200 words. ' +
    'Use bullet points for lists. Analyze specific stocks when asked. ' +
    'Always add a short disclaimer for investment advice. Never guarantee returns. ' +
    profileCtx;

  try {
    // Try method 1: x-goog-api-key header (works for AQ. prefix keys)
    var res = await fetch(
      'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': key
        },
        body: JSON.stringify({
          contents: [{ parts: [{ text: systemPrompt + '\n\nUser: ' + userMessage }] }],
          generationConfig: { temperature: 0.7, maxOutputTokens: 400 }
        })
      }
    );

    // If that fails try method 2: ?key= query param (works for AIzaSy prefix keys)
    if (!res.ok) {
      var errBody = await res.json().catch(function () { return {}; });
      console.warn('[IV] Gemini header method failed (' + res.status + '):', JSON.stringify(errBody));

      res = await fetch(
        'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=' + key,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: systemPrompt + '\n\nUser: ' + userMessage }] }],
            generationConfig: { temperature: 0.7, maxOutputTokens: 400 }
          })
        }
      );
    }

    if (!res.ok) {
      var err2 = await res.json().catch(function () { return {}; });
      console.warn('[IV] Gemini both methods failed (' + res.status + '):', JSON.stringify(err2));
      return '__ERROR__' + res.status + ': ' + (err2?.error?.message || 'Unknown error');
    }

    var data = await res.json();
    return data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || null;
  } catch (e) {
    console.warn('[IV] Gemini fetch failed:', e);
    return null;
  }
}
// ─────────────────────────────────────────────────────────────────────────────

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

    function getResponse(message) {
      const msg = message.toLowerCase();

      const name = localStorage.getItem('intellivest_user_name') || 'there';
      const risk = localStorage.getItem('intellivest_user_risk') || 'Moderate';
      const savings = localStorage.getItem('intellivest_user_savings') || 'Unknown';

      const houseResponse = () => {
        let savingsAdvice = '';
        if (savings.includes('Under $500')) {
          savingsAdvice = `Since you have under $500 saved right now,
start by saving $300-500/month in a High-Yield Savings Account.
You could have a $10,000 foundation in under 2 years.`;
        } else if (savings.includes('500') || savings.includes('2,000')) {
          savingsAdvice = `You have a good start! Open an Ally or Marcus
HYSA earning 4-5% APY and keep adding to it consistently.`;
        } else if (savings.includes('10,000') || savings.includes('50,000')) {
          savingsAdvice = `You may be ready to start the mortgage
pre-approval process. Talk to a mortgage broker soon.`;
        }

        return `Here is your home buying plan, ${name}! 🏠

STEP-BY-STEP PLAN:
1. Get your credit score to 720+ for the best mortgage rates
2. Save a 20% down payment to avoid PMI insurance fees
3. Keep your debt-to-income ratio below 43%
4. Build a 3-6 month emergency fund BEFORE buying
5. Get pre-approved before you start house hunting
6. Budget an extra 2-5% of home price for closing costs

YOUR SAVINGS SITUATION:
${savingsAdvice}

BEST ACCOUNTS TO SAVE FOR A HOUSE:
• Ally Bank HYSA — 4.5% APY, no minimums
• Marcus by Goldman Sachs — 4.4% APY
• SoFi — 4.6% APY
• Series I Bonds — good for inflation protection

AVOID putting your down payment money in stocks.
The market could drop right when you need the cash.`;
      };

      const stockResponse = () => {
        if (risk === 'Aggressive' || risk === 'Very Aggressive') {
          return `Based on your aggressive risk profile, here are
my top stock picks for you ${name}! 📈

TOP GROWTH STOCKS RIGHT NOW:
• NVDA — Nvidia, the leader in AI chips, highest growth
• MSFT — Microsoft, dominant in AI and cloud computing
• AMZN — Amazon, e-commerce plus AWS cloud revenue
• GOOGL — Google, AI search and YouTube dominance
• META — Facebook/Instagram, ad revenue recovering strong

HOW TO BUILD YOUR PORTFOLIO:
• 40% → Pick 2-3 of the stocks above
• 40% → QQQ ETF (top 100 tech, safer than individual stocks)
• 20% → VOO (S&P 500, your stable foundation)

HOW TO ACTUALLY BUY:
1. Download Robinhood, Fidelity, or Webull (all free)
2. Search the ticker like NVDA or QQQ
3. You can buy fractional shares — even $10 worth
4. Invest the same amount every month
   (this is called Dollar Cost Averaging)

⚠️ Never invest money you need within 1-2 years.`;
        }
        if (risk === 'Moderate') {
          return `Based on your moderate risk profile, ${name},
here are balanced picks for you! 📊

SOLID MODERATE PICKS:
• VOO — S&P 500 index, tracks top 500 US companies
• VTI — Total US market, even more diversified
• AAPL — Apple, steady growth with strong cash flow
• MSFT — Microsoft, consistent and reliable
• SCHD — Dividend ETF, pays you cash quarterly

SUGGESTED SPLIT:
• 50% → VOO or VTI (your foundation)
• 30% → 1-2 individual stocks (AAPL or MSFT)
• 20% → SCHD for dividend income

Open a free account on Fidelity or Robinhood
and you can start with as little as $1.`;
        }
        return `Based on your conservative profile, ${name},
here are safe and steady picks! 🛡️

CONSERVATIVE PICKS:
• VOO — S&P 500 index fund (most reliable long term)
• VTI — Total US stock market
• BND — Bond fund, very low risk
• SCHD — Dividend stocks, lower volatility

SUGGESTED SPLIT:
• 50% → VOO (stable market growth)
• 30% → BND (bonds for safety)
• 20% → SCHD (dividend income)

These give you market growth without wild swings.
Fidelity is the best platform for conservative investors.`;
      };

      const etfResponse = () => `Great question ${name}! Here are the best ETFs
based on your ${risk} risk level 📊

WHAT IS AN ETF:
An ETF is a basket of many stocks in one purchase.
Instead of buying one company, you buy a tiny piece
of hundreds of companies at once. Much safer than
picking individual stocks.

YOUR BEST ETFs (${risk} Risk):
${risk === 'Aggressive' || risk === 'Very Aggressive' ?
`• QQQ — Top 100 tech companies (Apple, Nvidia, Microsoft)
• VGT — Vanguard tech sector, pure technology focus
• ARKK — Cathie Wood's innovation fund (high risk/reward)
• VOO — S&P 500, keep this as your stable base (30%)` :
risk === 'Moderate' ?
`• VOO — S&P 500, most recommended for beginners
• VTI — Total US market, even more diversified than VOO
• VXUS — International stocks for global exposure
• SCHD — Dividend focused, pays you quarterly` :
`• VOO — S&P 500 index, safest equity option
• BND — Total bond market, very low risk
• SCHD — Dividend ETF, steady income
• VTI — Broad US market exposure`}

HOW TO BUY AN ETF:
1. Open Fidelity, Schwab, or Robinhood (all free)
2. Search the ticker symbol (VOO, QQQ, etc.)
3. Buy fractional shares — you don't need $400
   for one share, you can buy $50 worth
4. Set up automatic monthly investing

LOWEST FEE ETFs (fees eat your returns):
• VOO — 0.03% per year (cheapest)
• VTI — 0.03% per year
• QQQ — 0.20% per year
• SCHD — 0.06% per year`;

      const budgetResponse = () => `Here is a simple budget plan for you ${name}! 💰

THE 50/30/20 RULE:
• 50% → Needs: rent, food, utilities, transportation
• 30% → Wants: dining out, subscriptions, entertainment
• 20% → Savings + investing + paying off debt

QUICK WINS THIS WEEK:
1. List every subscription you pay right now
   Cancel any you forgot about or don't use
2. Set up automatic savings transfer on payday
   Pay yourself first before spending anything
3. Use cash for groceries — people spend less with cash
4. Meal prep 2-3 days a week to cut food costs by 30%

FREE BUDGETING APPS:
• Mint — automatically categorizes your spending
• YNAB — best for people serious about budgeting
• EveryDollar — simple and easy to start with
• Google Sheets — free and fully customizable

YOUR FIRST GOAL:
Build a $1,000 starter emergency fund first.
Even saving $50 per week gets you there in 5 months.`;

      const creditResponse = () => `Here is your credit score game plan ${name}! 💳

HOW YOUR SCORE IS CALCULATED:
• 35% — Payment history (never miss a payment)
• 30% — Credit utilization (keep under 30%)
• 15% — Length of history (keep old cards open)
• 10% — Credit mix (card + loan = better score)
• 10% — New credit (do not apply for many at once)

ACTION PLAN BY SCORE RANGE:

Under 580 (Poor):
→ Get Discover it Secured or Capital One Secured card
→ Use it for one small purchase per month
→ Pay the FULL balance every month, set autopay
→ Check your free report at annualcreditreport.com

580-669 (Fair):
→ Apply for Capital One Quicksilver
→ Keep balance under 30% of your limit always
→ Request a credit limit increase after 6 months

670-739 (Good):
→ Apply for Chase Freedom Unlimited or Discover it
→ You qualify for most car loans and apartments

740+ (Excellent):
→ Chase Sapphire Preferred or Amex Gold
→ You get the best rates on mortgages and car loans

CHECK YOUR SCORE FREE:
• Credit Karma — free, updates weekly, no card needed
• annualcreditreport.com — official government site`;

      const savingResponse = () => `Here is how to start saving effectively ${name}! 🏦

YOUR SAVINGS GOAL LADDER:
Step 1 → $1,000 starter emergency fund
Step 2 → 1 full month of expenses covered
Step 3 → 3-6 months of expenses (full emergency fund)
Step 4 → Start investing everything above that

BEST HIGH-YIELD SAVINGS ACCOUNTS RIGHT NOW:
• SoFi — 4.6% APY, no fees, free checking included
• Ally Bank — 4.5% APY, excellent mobile app
• Marcus by Goldman Sachs — 4.4% APY, very reliable

Regular bank savings pays 0.01% APY.
These pay 400 times more interest.

THE TRICK THAT ACTUALLY WORKS:
Set up an automatic transfer of even $25-50
on the same day you get paid every month.
You will not miss what you never see in your account.

${savings.includes('Under $500') ?
`Since you are starting with under $500:
Your goal this month is to open a SoFi or Ally HYSA
and set up even a $25 weekly automatic transfer.
Small and consistent beats large and irregular.` : ''}`;

      const mutualResponse = () => `Great topic ${name}! Here is the mutual fund breakdown 📊

ETF vs MUTUAL FUND — THE DIFFERENCE:
• ETF: Trades like a stock all day, lower fees,
  can buy fractional shares — best for beginners
• Mutual Fund: Only trades once per day at market close,
  often needs $1,000 minimum to start
• Index Fund: Can be either one, just tracks an index
  like the S&P 500 — the lowest fees of all

TOP MUTUAL FUNDS (lowest fees):
• FXAIX — Fidelity S&P 500 — 0.015% fee (cheapest!)
• VFIAX — Vanguard S&P 500 — 0.04% fee
• SWTSX — Schwab Total Stock Market — 0.03% fee

WHY FEES MATTER SO MUCH:
On $10,000 invested over 30 years:
1.0% fee → you lose about $70,000 in gains
0.03% fee → you keep almost all of your gains

Always pick the lowest fee option available.
FXAIX at Fidelity is the gold standard for beginners.`;

      const retirementResponse = () => `Here is your retirement roadmap ${name}! 🏖️

OPEN THESE ACCOUNTS IN THIS ORDER:
1. 401k up to your employer match — this is FREE money
   If they match 3%, contribute at least 3%. Always.
2. Roth IRA — max it out at $7,000 per year if under 50
   You pay taxes now but NEVER pay taxes on the growth
3. Back to 401k — contribute more after maxing Roth IRA
4. HSA — only if you have a high-deductible health plan
   Triple tax advantage — the best account that exists

THE POWER OF STARTING EARLY:
$200 per month starting at age 22 → about $1,000,000 at 65
$200 per month starting at age 32 → about $500,000 at 65
$200 per month starting at age 42 → about $220,000 at 65

Starting 10 years earlier nearly DOUBLES your money.

RETIREMENT SAVINGS TARGETS:
By age 30 → Have 1x your annual salary saved
By age 40 → Have 3x your annual salary saved
By age 50 → Have 6x your annual salary saved
By age 60 → Have 8x your annual salary saved`;

      const defaultResponse = () => `I want to make sure I give you the best answer ${name}!
Could you ask me about one of these topics?

💰 Budgeting and saving money
📈 What stocks or ETFs to buy
🏠 How to buy a house
💳 Building your credit score
🏦 Mutual funds and index funds
🏖️ Retirement planning and 401k
📚 Student loans and scholarships
🧾 Taxes basics

What would you like help with?`;

      const isHouse = msg.includes('house') ||
        msg.includes('home') ||
        msg.includes('mortgage') ||
        msg.includes('property') ||
        msg.includes('real estate') ||
        msg.includes('down payment') ||
        msg.includes('buy a home') ||
        msg.includes('buying a home');

      const isStock = msg.includes('stock') ||
        msg.includes('share') ||
        msg.includes('equity') ||
        msg.includes('ticker') ||
        msg.includes('nvda') ||
        msg.includes('aapl') ||
        msg.includes('invest in') ||
        msg.includes('what should i buy') ||
        msg.includes('what to buy') ||
        msg.includes('what do i buy') ||
        msg.includes('recommend') ||
        msg.includes('should i buy') ||
        msg.includes('stocks to buy') ||
        msg.includes('stock to buy') ||
        msg.includes('stocks should i buy') ||
        msg.includes('what stocks') ||
        msg.includes('which stocks') ||
        msg.includes('good stocks') ||
        msg.includes('best stocks') ||
        msg.includes('top stocks') ||
        msg.includes('stocks for beginners') ||
        msg.includes('where to invest') ||
        msg.includes('what to invest in') ||
        msg.includes('how to invest') ||
        msg.includes('start investing') ||
        msg.includes('begin investing') ||
        msg.includes('stocks recommendation') ||
        (msg.includes('buy') && !msg.includes('house') &&
         !msg.includes('home') && !msg.includes('car'));

      const isETF = msg.includes('etf') ||
        msg.includes('index fund') ||
        msg.includes('voo') ||
        msg.includes('vti') ||
        msg.includes('qqq') ||
        msg.includes('fund');

      const isBudget = msg.includes('budget') ||
        msg.includes('spending') ||
        msg.includes('expenses') ||
        msg.includes('manage money') ||
        msg.includes('track') ||
        msg.includes('where does my money') ||
        msg.includes('50/30') ||
        msg.includes('50 30');

      const isCredit = msg.includes('credit') ||
        msg.includes('fico') ||
        msg.includes('score') ||
        msg.includes('credit card') ||
        msg.includes('debt') ||
        msg.includes('loan');

      const isSaving = msg.includes('save') ||
        msg.includes('saving') ||
        msg.includes('savings') ||
        msg.includes('emergency') ||
        msg.includes('hysa') ||
        msg.includes('interest') ||
        msg.includes('bank account') ||
        msg.includes('put money') ||
        msg.includes('store money');

      const isMutual = msg.includes('mutual') ||
        msg.includes('fidelity') ||
        msg.includes('vanguard') ||
        msg.includes('fxaix') ||
        msg.includes('managed fund');

      const isRetirement = msg.includes('retire') ||
        msg.includes('401') ||
        msg.includes('roth') ||
        msg.includes('ira') ||
        msg.includes('pension') ||
        msg.includes('old age') ||
        msg.includes('when i am older');

      if (isHouse) { return houseResponse(); }
      if (isETF) { return etfResponse(); }
      if (isStock) { return stockResponse(); }
      if (isBudget) { return budgetResponse(); }
      if (isCredit) { return creditResponse(); }
      if (isSaving) { return savingResponse(); }
      if (isMutual) { return mutualResponse(); }
      if (isRetirement) { return retirementResponse(); }

      return defaultResponse();
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
          // Try AI first, fall back to built-in responses if not activated
          const profile = getSurveyProfile();
          const aiReply = await callAI(userMessage, profile);
          removeTypingIndicator();
          if (aiReply && aiReply.startsWith('__ERROR__')) {
            // Show the actual API error so we can diagnose it
            addMessage('⚠️ AI error: ' + aiReply.replace('__ERROR__', ''), false);
          } else if (aiReply) {
            addMessage(aiReply, false);
          } else {
            await new Promise(resolve =>
              setTimeout(resolve, Math.min(300, Math.floor(100 + Math.random() * 200)))
            );
            addMessage(getResponse(userMessage), false);
          }
        });
      }
    }

    // ── Activate AI button ───────────────────────────────────────────────────
    const activateBtn = document.getElementById('chatbotActivateAI');

    function updateActivateBtn() {
      if (!activateBtn) return;
      if (aiIsReady()) {
        activateBtn.textContent = '✅ AI Active';
        activateBtn.style.opacity = '0.6';
        activateBtn.style.cursor = 'default';
      } else {
        activateBtn.textContent = '⚡ Activate AI';
        activateBtn.style.display = 'inline-flex';
        activateBtn.style.opacity = '1';
        activateBtn.style.cursor = 'pointer';
      }
    }

    // Always show the button
    if (activateBtn) activateBtn.style.display = 'inline-flex';
    updateActivateBtn();

    if (activateBtn) {
      activateBtn.addEventListener('click', function () {
        if (aiIsReady()) return; // already active
        var key = prompt(
          '🤖 Activate Intellivest AI\n\n' +
          'Step 1: Go to https://openrouter.ai\n' +
          'Step 2: Sign up FREE (no credit card)\n' +
          'Step 3: Click Keys → Create Key → Copy it\n' +
          'Step 4: Paste it below and click OK\n\n' +
          'Your key:'
        );
        if (key && key.trim()) {
          window.setAIKey(key);
          updateActivateBtn();
          addMessage(
            '✅ AI activated! I\'m now powered by Google Gemma AI.\n\nAsk me anything — specific stocks, market questions, budgeting tips, anything!',
            false
          );
        }
      });
    }
    // ─────────────────────────────────────────────────────────────────────────

    refreshWelcome();
    window.__chatbotRefreshWelcome = refreshWelcome;

    if (chatbotInput) chatbotInput.focus();
  }

  document.addEventListener('chatbot-survey-ready', runChatbot);
})();
