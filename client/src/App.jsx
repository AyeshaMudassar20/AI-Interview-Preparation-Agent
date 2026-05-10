import { useEffect, useMemo, useState } from 'react';
import http from './api/http';
import { categoryCopy, interviewCategories } from './constants';

function AuthCard({ mode, onToggle, onSuccess }) {
    const [form, setForm] = useState({ name: '', email: '', password: '' });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    function handleChange(event) {
        setForm((current) => ({ ...current, [event.target.name]: event.target.value }));
    }

    async function handleSubmit(event) {
        event.preventDefault();
        setLoading(true);
        setError('');

        try {
            const endpoint = mode === 'signup' ? '/auth/signup' : '/auth/login';
            const payload = mode === 'signup' ? form : { email: form.email, password: form.password };
            const response = await http.post(endpoint, payload);

            localStorage.setItem('token', response.data.token);
            localStorage.setItem('user', JSON.stringify(response.data.user));
            onSuccess(response.data.user);
        } catch (submissionError) {
            setError(submissionError.response?.data?.message || 'Something went wrong.');
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="w-full max-w-md rounded-3xl border border-white/10 bg-white/10 p-8 shadow-glow backdrop-blur-xl">
            <div className="mb-6">
                <p className="text-sm uppercase tracking-[0.3em] text-cyan-200/80">AI Interview Prep</p>
                <h1 className="mt-2 text-3xl font-bold text-white">Practice interviews with an AI coach</h1>
                <p className="mt-2 text-sm text-slate-300">Sign in or create a new account to begin a mock interview.</p>
            </div>

            <div className="mb-6 flex rounded-2xl bg-slate-950/40 p-1 text-sm">
                <button
                    className={`flex-1 rounded-2xl px-4 py-2 transition ${mode === 'login' ? 'bg-cyan-400 text-slate-950' : 'text-slate-300'}`}
                    onClick={() => onToggle('login')}
                    type="button"
                >
                    Login
                </button>
                <button
                    className={`flex-1 rounded-2xl px-4 py-2 transition ${mode === 'signup' ? 'bg-cyan-400 text-slate-950' : 'text-slate-300'}`}
                    onClick={() => onToggle('signup')}
                    type="button"
                >
                    Signup
                </button>
            </div>

            <form className="space-y-4" onSubmit={handleSubmit}>
                {mode === 'signup' && (
                    <input
                        className="w-full rounded-2xl border border-white/10 bg-slate-950/50 px-4 py-3 text-white outline-none placeholder:text-slate-500 focus:border-cyan-300"
                        name="name"
                        placeholder="Your name"
                        value={form.name}
                        onChange={handleChange}
                    />
                )}
                <input
                    className="w-full rounded-2xl border border-white/10 bg-slate-950/50 px-4 py-3 text-white outline-none placeholder:text-slate-500 focus:border-cyan-300"
                    name="email"
                    placeholder="Email address"
                    type="email"
                    value={form.email}
                    onChange={handleChange}
                />
                <input
                    className="w-full rounded-2xl border border-white/10 bg-slate-950/50 px-4 py-3 text-white outline-none placeholder:text-slate-500 focus:border-cyan-300"
                    name="password"
                    placeholder="Password"
                    type="password"
                    value={form.password}
                    onChange={handleChange}
                />

                {error && <p className="rounded-2xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">{error}</p>}

                <button
                    className="w-full rounded-2xl bg-cyan-400 px-4 py-3 font-semibold text-slate-950 transition hover:bg-cyan-300 disabled:cursor-not-allowed disabled:opacity-60"
                    disabled={loading}
                    type="submit"
                >
                    {loading ? 'Please wait...' : mode === 'signup' ? 'Create account' : 'Login'}
                </button>
            </form>

            <p className="mt-5 text-xs leading-5 text-slate-400">
                Beginner tip: use the signup form first, then practice one category at a time with short answers.
            </p>
        </div>
    );
}

function InterviewShell({ user, onLogout }) {
    const [profile, setProfile] = useState(user);
    const [sessions, setSessions] = useState([]);
    const [currentSession, setCurrentSession] = useState(null);
    const [category, setCategory] = useState('Frontend');
    const [message, setMessage] = useState('');
    const [loading, setLoading] = useState(false);
    const [status, setStatus] = useState('');
    const [evaluation, setEvaluation] = useState(null);

    async function loadSessions() {
        try {
            const response = await http.get('/chat/sessions');
            setSessions(response.data.sessions);
            if (!currentSession && response.data.sessions[0]) {
                setCurrentSession(response.data.sessions[0]);
                setCategory(response.data.sessions[0].category);
            }
        } catch (requestError) {
            setStatus(requestError.response?.data?.message || 'Could not load previous chats.');
        }
    }

    async function loadProfile() {
        try {
            const response = await http.get('/profile/me');
            setProfile(response.data.user);
        } catch (requestError) {
            setStatus(requestError.response?.data?.message || 'Could not load profile.');
        }
    }

    useEffect(() => {
        loadSessions();
        loadProfile();
        // The session list only needs to load on mount and after new messages.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const activeMessages = useMemo(() => currentSession?.messages || [], [currentSession]);

    async function startSession() {
        setLoading(true);
        setStatus('');
        setEvaluation(null);

        try {
            const response = await http.post('/chat/sessions', { category });
            setCurrentSession(response.data.session);
            setSessions((currentSessions) => [response.data.session, ...currentSessions]);
            setEvaluation(null);
        } catch (requestError) {
            setStatus(requestError.response?.data?.message || 'Could not start session.');
        } finally {
            setLoading(false);
        }
    }

    async function sendMessage(event) {
        event.preventDefault();
        if (!message.trim() || !currentSession) return;
        if (loading) return; // guard against double submissions

        const userMessage = message;
        setLoading(true);
        setMessage('');
        setStatus('');

        try {
            const response = await http.post(`/chat/sessions/${currentSession._id}/message`, { message: userMessage });
            setCurrentSession(response.data.session);
            setSessions((currentSessions) =>
                currentSessions.map((session) => (session._id === response.data.session._id ? response.data.session : session))
            );
            // show evaluation feedback if available (demo mode)
            if (response.data.assistantEvaluation) {
                setEvaluation(response.data.assistantEvaluation);
            } else {
                setEvaluation(null);
            }
        } catch (requestError) {
            setStatus(requestError.response?.data?.message || 'Could not send message.');
        } finally {
            setLoading(false);
        }
    }

    function selectSession(session) {
        setCurrentSession(session);
        setCategory(session.category);
    }

    function logout() {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        onLogout();
    }

    return (
        <div className="min-h-screen bg-[linear-gradient(135deg,#020617_0%,#0f172a_45%,#111827_100%)] text-white">
            <div className="mx-auto flex min-h-screen w-full max-w-7xl flex-col gap-6 p-4 md:p-6 lg:h-screen lg:flex-row lg:items-stretch lg:overflow-hidden">
                <aside className="flex min-h-0 flex-col gap-6 rounded-3xl border border-white/10 bg-white/5 p-5 shadow-glow backdrop-blur-xl lg:h-full lg:w-80 lg:overflow-y-auto">
                    <div>
                        <p className="text-xs uppercase tracking-[0.3em] text-cyan-200/70">Dashboard</p>
                        <h2 className="mt-2 text-2xl font-bold">Welcome, {profile?.name || user?.name || 'Learner'}</h2>
                        <p className="mt-2 text-sm text-slate-300">Pick a category and let the AI interviewer ask the next question.</p>
                    </div>

                    <div className="rounded-2xl border border-white/10 bg-slate-950/40 p-4">
                        <label className="text-sm text-slate-300">Interview category</label>
                        <select
                            className="mt-2 w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-white outline-none focus:border-cyan-300"
                            value={category}
                            onChange={(event) => setCategory(event.target.value)}
                        >
                            {interviewCategories.map((option) => (
                                <option key={option} value={option}>
                                    {option}
                                </option>
                            ))}
                        </select>
                        <p className="mt-3 text-xs leading-5 text-slate-400">{categoryCopy[category]}</p>
                        <button
                            className="mt-4 w-full rounded-2xl bg-cyan-400 px-4 py-3 font-semibold text-slate-950 transition hover:bg-cyan-300 disabled:cursor-not-allowed disabled:opacity-60"
                            onClick={startSession}
                            disabled={loading}
                            type="button"
                        >
                            Start new interview
                        </button>
                    </div>

                    <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-white/10 bg-slate-950/30">
                        <div className="border-b border-white/10 px-4 py-3 text-sm font-medium text-slate-200">Your sessions</div>
                        <div className="min-h-0 space-y-2 overflow-y-auto p-3 lg:flex-1">
                            {sessions.length === 0 && <p className="px-2 py-3 text-sm text-slate-400">No sessions yet. Start one above.</p>}
                            {sessions.map((session) => (
                                <button
                                    key={session._id}
                                    className={`w-full rounded-2xl border px-4 py-3 text-left transition ${currentSession?._id === session._id ? 'border-cyan-300/60 bg-cyan-400/10' : 'border-white/10 bg-white/5 hover:bg-white/10'}`}
                                    onClick={() => selectSession(session)}
                                    type="button"
                                >
                                    <p className="text-sm font-semibold text-white">{session.category} Interview</p>
                                    <p className="mt-1 text-xs text-slate-400">{session.summary || 'Practice session'}</p>
                                </button>
                            ))}
                        </div>
                    </div>

                    <button className="mt-auto rounded-2xl border border-white/10 px-4 py-3 text-sm text-slate-200 transition hover:bg-white/10" onClick={logout} type="button">
                        Logout
                    </button>
                </aside>

                <main className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-3xl border border-white/10 bg-white/5 shadow-glow backdrop-blur-xl">
                    <div className="border-b border-white/10 px-5 py-4 md:px-6">
                        <p className="text-xs uppercase tracking-[0.3em] text-cyan-200/70">Interview room</p>
                        <div className="flex items-center justify-between">
                            <h1 className="mt-2 text-2xl font-bold md:text-3xl">ChatGPT-style mock interview</h1>
                            {currentSession && (
                                <button
                                    className="ml-4 rounded-2xl border border-white/10 bg-rose-600/80 px-3 py-2 text-sm font-semibold text-white hover:bg-rose-500"
                                    onClick={async () => {
                                        if (!currentSession) return;
                                        setLoading(true);
                                        try {
                                            const response = await http.post(`/chat/sessions/${currentSession._id}/end`);
                                            setCurrentSession(response.data.session);
                                            setSessions((currentSessions) =>
                                                currentSessions.map((session) => (session._id === response.data.session._id ? response.data.session : session))
                                            );
                                            if (response.data.evaluation) setEvaluation(response.data.evaluation);
                                        } catch (err) {
                                            setStatus(err.response?.data?.message || 'Could not end session.');
                                        } finally {
                                            setLoading(false);
                                        }
                                    }}
                                    type="button"
                                >
                                    End interview
                                </button>
                            )}
                        </div>
                        <p className="mt-1 text-sm text-slate-300">Answer naturally and the AI will ask a follow-up question like a real interviewer.</p>
                    </div>

                    <div className="min-h-0 flex-1 overflow-y-auto px-4 py-5 md:px-6">
                        {activeMessages.length === 0 ? (
                            <div className="flex h-full items-center justify-center text-center text-slate-400">
                                <div className="max-w-md rounded-3xl border border-dashed border-white/15 bg-slate-950/30 p-8">
                                    <p className="text-lg font-semibold text-white">Start a practice round</p>
                                    <p className="mt-2 text-sm">Create a session, then send your first answer. The AI will continue the interview from there.</p>
                                </div>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {activeMessages.map((chatMessage, index) => (
                                    <div
                                        key={chatMessage._id || `${chatMessage.role}-${index}`}
                                        className={`flex ${chatMessage.role === 'user' ? 'justify-end' : 'justify-start'}`}
                                    >
                                        <div
                                            className={`max-w-3xl rounded-3xl px-4 py-3 text-sm leading-6 shadow-lg md:text-base ${chatMessage.role === 'user' ? 'bg-cyan-400 text-slate-950' : 'border border-white/10 bg-slate-950/70 text-slate-100'}`}
                                        >
                                            <p className="mb-1 text-[11px] uppercase tracking-[0.25em] opacity-70">{chatMessage.role === 'user' ? 'You' : 'Interviewer'}</p>
                                            <p>{chatMessage.content}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    <div className="border-t border-white/10 p-4 md:p-6">
                        {status && <p className="mb-3 rounded-2xl border border-amber-400/20 bg-amber-400/10 px-4 py-3 text-sm text-amber-100">{status}</p>}
                        {evaluation && (
                            <div className="mb-3 rounded-2xl border border-sky-400/20 bg-sky-400/5 px-4 py-3 text-sm text-sky-100">
                                <p className="font-semibold">Feedback: {evaluation.score}</p>
                                <p className="mt-1">{evaluation.feedback}</p>
                            </div>
                        )}
                        <form className="flex flex-col gap-3 md:flex-row" onSubmit={sendMessage}>
                            <input
                                className="flex-1 rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-white outline-none placeholder:text-slate-500 focus:border-cyan-300"
                                disabled={!currentSession || loading || currentSession?.status === 'completed'}
                                placeholder={currentSession ? (currentSession?.status === 'completed' ? 'This interview has ended.' : 'Type your answer here...') : 'Start a session to begin chatting.'}
                                value={message}
                                onChange={(event) => setMessage(event.target.value)}
                            />
                            <button
                                className="rounded-2xl bg-cyan-400 px-6 py-3 font-semibold text-slate-950 transition hover:bg-cyan-300 disabled:cursor-not-allowed disabled:opacity-60"
                                disabled={!currentSession || loading || currentSession?.status === 'completed'}
                                type="submit"
                            >
                                Send
                            </button>
                        </form>
                    </div>
                </main>
            </div>
        </div>
    );
}

export default function App() {
    const [authMode, setAuthMode] = useState('signup');
    const [user, setUser] = useState(() => {
        const storedUser = localStorage.getItem('user');
        return storedUser ? JSON.parse(storedUser) : null;
    });

    useEffect(() => {
        if (!localStorage.getItem('token')) {
            localStorage.removeItem('user');
            setUser(null);
        }
    }, []);

    if (!user) {
        return (
            <div className="min-h-screen bg-mesh-gradient px-4 py-10 text-white">
                <div className="mx-auto grid min-h-[calc(100vh-5rem)] max-w-7xl items-center gap-10 lg:grid-cols-[1.2fr_0.8fr]">
                    <section className="space-y-6">
                        <div className="inline-flex rounded-full border border-cyan-300/20 bg-cyan-400/10 px-4 py-2 text-sm text-cyan-100">
                            Backend, frontend, MongoDB, and OpenAI in one learning project
                        </div>
                        <h2 className="max-w-3xl text-4xl font-black leading-tight md:text-6xl">
                            Build interview confidence with a simple AI practice room.
                        </h2>
                        <p className="max-w-2xl text-lg leading-8 text-slate-300">
                            Practice Frontend, Backend, AI, or HR interviews. The app stores your history, asks follow-up questions, and keeps the code structure easy to learn.
                        </p>
                        <div className="grid gap-4 sm:grid-cols-3">
                            {['Authentication', 'Chat history in MongoDB', 'OpenAI-powered follow-ups'].map((item) => (
                                <div key={item} className="rounded-3xl border border-white/10 bg-white/5 p-4 text-sm text-slate-200 backdrop-blur">
                                    {item}
                                </div>
                            ))}
                        </div>
                    </section>
                    <AuthCard mode={authMode} onSuccess={setUser} onToggle={setAuthMode} />
                </div>
            </div>
        );
    }

    return <InterviewShell onLogout={() => setUser(null)} user={user} />;
}
