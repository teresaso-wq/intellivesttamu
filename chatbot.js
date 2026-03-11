//  Get a free API key at: https://console.groq.com

const GROQ_API_KEY = 'YOUR_GROQ_API_KEY_HERE'; // Replace with your key
const GROQ_MODEL   = 'llama3-8b-8192';          // Fast, free Groq model
const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';

// System prompt — defines the chatbot's persona and scope
const SYSTEM_PROMPT = `You are Intellivest AI, a friendly and knowledgeable financial literacy 
assistant built by students at Texas A&M University. Your purpose is to help people — especially 
college students and young adults — learn about personal finance and investing.

You can help with:
- Budgeting and saving strategies
- Investing basics (stocks, ETFs, index funds, bonds)
- Credit scores and debt management
- Retirement planning (401k, IRA, Roth IRA)
- Stock market concepts and terminology
- Financial goal setting
- Understanding market data and financial news

Guidelines:
- Always be encouraging and non-judgmental — many users are beginners
- Use clear, simple language and avoid unnecessary jargon
- When using financial terms, briefly explain them
- Always remind users that your responses are for educational purposes only, 
  not professional financial advice
- Keep responses concise but thorough — aim for 3-5 sentences unless more detail is needed
- If asked about something outside finance/investing, politely redirect to financial topics`;

// Conversation history — sent with every request so the AI remembers context
const conversationHistory = [];

// ============================================================
//  DOM references
// ============================================================
const messagesEl  = document.getElementById('chatbotMessages');
const form        = document.getElementById('chatbotForm');
const input       = document.getElementById('chatbotInput');
const sendBtn     = document.getElementById('chatbotSendBtn');
const clearBtn    = document.getElementById('clearChatBtn');

// ============================================================
//  UI Helpers
// ============================================================

/** Scroll the message window to the latest message */
function scrollToBottom() {
  messagesEl.scrollTop = messagesEl.scrollHeight;
}

/** Add a message bubble to the chat window
 *  @param {string} text    - Message content (plain text)
 *  @param {'user'|'bot'|'error'} role
 *  @returns {HTMLElement}  - The created message element
 */
function appendMessage(text, role) {
  const wrapper = document.createElement('div');
  wrapper.classList.add('message');

  if (role === 'user') {
    wrapper.classList.add('user-message');
    wrapper.innerHTML = `
      <div class="message-avatar">You</div>
      <div class="message-content">
        <div class="message-text">${escapeHTML(text)}</div>
      </div>`;
  } else {
    wrapper.classList.add('bot-message');
    if (role === 'error') wrapper.classList.add('message-error');
    wrapper.innerHTML = `
      <div class="message-avatar">IV</div>
      <div class="message-content">
        <div class="message-text">${formatBotText(text)}</div>
      </div>`;
  }

  messagesEl.appendChild(wrapper);
  scrollToBottom();
  return wrapper;
}

/** Show the animated typing indicator while waiting for a response */
function showTypingIndicator() {
  const wrapper = document.createElement('div');
  wrapper.classList.add('message', 'bot-message', 'typing-indicator');
  wrapper.id = 'typingIndicator';
  wrapper.innerHTML = `
    <div class="message-avatar">IV</div>
    <div class="message-content">
      <div class="typing-dots">
        <span></span><span></span><span></span>
      </div>
    </div>`;
  messagesEl.appendChild(wrapper);
  scrollToBottom();
}

/** Remove the typing indicator */
function removeTypingIndicator() {
  const indicator = document.getElementById('typingIndicator');
  if (indicator) indicator.remove();
}

/** Lock/unlock the input while a response is loading */
function setLoading(isLoading) {
  sendBtn.disabled = isLoading;
  input.disabled   = isLoading;
  if (!isLoading) input.focus();
}

/** Prevent XSS — escape user-supplied text before inserting into the DOM */
function escapeHTML(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/** Basic markdown-like formatting for bot responses
 *  Converts **bold**, newlines, and bullet points to HTML */
function formatBotText(text) {
  return escapeHTML(text)
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')  // **bold**
    .replace(/\n\n/g, '</p><p>')                        // paragraph breaks
    .replace(/\n/g, '<br>');                            // line breaks
}

// ============================================================
//  Groq API call
// ============================================================

async function sendToGroq(userMessage) {
  // Add the user's message to history
  conversationHistory.push({ role: 'user', content: userMessage });

  const response = await fetch(GROQ_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${GROQ_API_KEY}`,
    },
    body: JSON.stringify({
      model: GROQ_MODEL,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        ...conversationHistory,
      ],
      temperature: 0.7,   // Slightly creative but grounded
      max_tokens: 1024,
    }),
  });

  if (!response.ok) {
    // Pull the error message from Groq if available
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData?.error?.message || `API error: ${response.status}`);
  }

  const data = await response.json();
  const reply = data.choices?.[0]?.message?.content?.trim();

  if (!reply) throw new Error('No response received. Please try again.');

  // Save the assistant's reply to history so context is preserved
  conversationHistory.push({ role: 'assistant', content: reply });

  return reply;
}

// ============================================================
//  Form submission
// ============================================================

form.addEventListener('submit', async (e) => {
  e.preventDefault();

  const userText = input.value.trim();
  if (!userText) return;

  // Clear input and lock UI
  input.value = '';
  setLoading(true);

  // Show the user's message
  appendMessage(userText, 'user');

  // Show typing indicator while waiting
  showTypingIndicator();

  try {
    const reply = await sendToGroq(userText);
    removeTypingIndicator();
    appendMessage(reply, 'bot');
  } catch (err) {
    removeTypingIndicator();
    console.error('Chatbot error:', err);
    appendMessage(
      `Sorry, something went wrong: ${err.message}. Please check your API key or try again.`,
      'error'
    );
  } finally {
    setLoading(false);
  }
});

// ============================================================
//  Clear conversation button
// ============================================================

if (clearBtn) {
  clearBtn.addEventListener('click', () => {
    // Remove all messages except the first welcome message
    const messages = messagesEl.querySelectorAll('.message');
    messages.forEach((msg, index) => {
      if (index !== 0) msg.remove(); // Keep the initial greeting
    });

    // Reset conversation history so the AI starts fresh
    conversationHistory.length = 0;

    input.focus();
  });
}
