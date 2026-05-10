const OpenAI = require('openai');

const client = process.env.OPENAI_API_KEY
    ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
    : null;

const categoryHints = {
    Frontend: 'Focus on React, JavaScript, CSS, browser behavior, and UI thinking.',
    Backend: 'Focus on APIs, databases, Node.js, authentication, and server design.',
    AI: 'Focus on ML basics, prompt engineering, model tradeoffs, and practical AI use.',
    HR: 'Focus on communication, teamwork, conflict handling, and motivation.',
};

const fallbackQuestions = {
    Frontend: [
        'Can you explain the difference between props and state?',
        'How would you improve the performance of a React component?',
        'What happens when a user clicks a button in React?',
    ],
    Backend: [
        'Can you describe how you would design a simple REST API?',
        'What is the difference between authentication and authorization?',
        'How would you handle database errors in an Express app?',
    ],
    AI: [
        'Can you explain what a prompt is in simple words?',
        'What is one benefit and one limitation of using AI tools?',
        'How would you make an AI answer feel more accurate?',
    ],
    HR: [
        'Can you tell me about a time you worked in a team?',
        'How do you handle disagreement with a coworker?',
        'Why do you want this job?',
    ],
};

function pickFallbackQuestion(category, messages) {
    const questions = fallbackQuestions[category] || fallbackQuestions.Frontend;
    const userMessages = messages.filter((message) => message.role === 'user');
    const lastUserMessage = userMessages[userMessages.length - 1]?.content?.toLowerCase() || '';

    if (lastUserMessage.includes('react')) {
        return 'Can you explain the difference between props and state?';
    }

    if (lastUserMessage.includes('api') || lastUserMessage.includes('backend')) {
        return 'Can you describe how you would design a simple REST API?';
    }

    if (lastUserMessage.includes('team') || lastUserMessage.includes('work')) {
        return 'Can you tell me about a time you worked in a team?';
    }

    const hash = userMessages.reduce((total, message) => total + message.content.length, 0);
    return questions[hash % questions.length];
}

async function generateInterviewReply({ category, messages }) {
    const systemPrompt = [
        'You are a professional but friendly interview coach.',
        'Ask one question at a time like a real interviewer.',
        'Keep replies short, clear, and beginner-friendly.',
        'If the user asks for an answer or explanation, include a concise model answer after the question.',
        categoryHints[category] || '',
    ]
        .filter(Boolean)
        .join(' ');

    if (!client) {
        // demo fallback: produce a question and a lightweight evaluation of the last user answer
        const question = pickFallbackQuestion(category, messages);
        const userMessages = messages.filter((m) => m.role === 'user');
        const lastAnswer = (userMessages[userMessages.length - 1] || {}).content || '';

        // simple heuristics for feedback depending on category
        function evaluateAnswer(cat, answer) {
            const a = answer.toLowerCase();
            if (!a || a.trim().length < 3) {
                return { score: 'missing', feedback: 'You did not provide an answer. Try to write a short response (1-2 sentences).' };
            }

            if (cat === 'Frontend') {
                if (a.includes('react') || a.includes('component') || a.includes('state') || a.includes('props')) {
                    return { score: 'good', feedback: 'Good — you mentioned relevant frontend terms. Try to expand with a brief example.' };
                }
                return { score: 'ok', feedback: 'Partial — try mentioning React concepts (state, props, lifecycle) or an example.' };
            }

            if (cat === 'Backend') {
                if (a.includes('api') || a.includes('database') || a.includes('server') || a.includes('auth')) {
                    return { score: 'good', feedback: 'Nice — you covered backend topics. Add a specific example for extra clarity.' };
                }
                return { score: 'ok', feedback: 'Partial — mention APIs, databases, or authentication to strengthen your answer.' };
            }

            if (cat === 'AI') {
                if (a.includes('model') || a.includes('training') || a.includes('prompt') || a.includes('data')) {
                    return { score: 'good', feedback: 'Solid — you included AI concepts. Try briefly explaining tradeoffs.' };
                }
                return { score: 'ok', feedback: 'Partial — include terms like model, training, or prompt to improve your answer.' };
            }

            // HR
            if (a.includes('team') || a.includes('communication') || a.includes('conflict') || a.includes('lead')) {
                return { score: 'good', feedback: 'Good — you addressed interpersonal aspects. Add specifics if possible.' };
            }
            return { score: 'ok', feedback: 'Partial — describe a concrete scenario or your approach.' };
        }

        const evalResult = evaluateAnswer(category, lastAnswer);

        return {
            reply: `Demo mode: ${question}`,
            followUp: true,
            evaluation: evalResult,
        };
    }

    const completion = await client.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
            { role: 'system', content: systemPrompt },
            ...messages.map((message) => ({ role: message.role, content: message.content })),
        ],
        temperature: 0.7,
    });

    return {
        reply: completion.choices[0]?.message?.content || 'I could not generate a reply right now.',
        followUp: true,
    };
}

module.exports = {
    generateInterviewReply,
};

async function generateSessionSummary({ category, messages }) {
    // Demo fallback summary
    if (!client) {
        const userMessages = messages.filter((m) => m.role === 'user').map((m) => m.content);
        const totalAnswers = userMessages.length;
        const hint = categoryHints[category] || '';

        // simple heuristic evaluation: count messages that include positive keywords
        const positive = userMessages.filter((a) => /react|state|props|api|database|model|prompt|team|communication|auth/i.test(a)).length;
        const score = positive / Math.max(1, totalAnswers);

        const summary = `You answered ${totalAnswers} question(s). ${hint}`;
        const finalAssessment = score > 0.5 ? 'Good overall — you covered important points.' : 'Room to improve — try adding more concrete examples.';

        return {
            summary,
            finalMessage: `Thanks for completing the ${category} mock interview. ${finalAssessment}`,
            evaluation: { score: score > 0.66 ? 'good' : score > 0.33 ? 'ok' : 'needs-work', feedback: finalAssessment },
        };
    }

    // Real OpenAI summary
    const prompt = [
        `You are an interviewer. Summarize the user's performance in a short paragraph (2-4 sentences) and give a short evaluation score and one improvement tip.`,
        `Category: ${category}`,
        `Conversation:`,
        ...messages.map((m) => `${m.role.toUpperCase()}: ${m.content}`),
    ].join('\n');

    const completion = await client.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [{ role: 'system', content: 'You summarize mock interview sessions concisely.' }, { role: 'user', content: prompt }],
        temperature: 0.3,
    });

    const text = completion.choices[0]?.message?.content || '';

    // naive split: assume first line is summary, second is evaluation
    return {
        summary: text.split('\n')[0] || 'Session summary.',
        finalMessage: `Thanks for finishing the mock interview. ${text}`,
        evaluation: { score: 'n/a', feedback: text },
    };
}

module.exports = {
    generateInterviewReply,
    generateSessionSummary,
};
