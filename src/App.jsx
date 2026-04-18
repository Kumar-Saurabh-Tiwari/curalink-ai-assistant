import { useEffect, useMemo, useState } from 'react';
import ContextForm from './components/ContextForm.jsx';
import InsightsPanel from './components/InsightsPanel.jsx';
import { getConversation, sendMessage } from './api/chatApi.js';

function createSessionId() {
  return `session-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

const demoPrompts = [
  {
    label: 'Latest treatment for lung cancer',
    question: 'Latest treatment for lung cancer',
    context: {
      disease: 'lung cancer',
      additionalQuery: 'latest treatment'
    }
  },
  {
    label: 'Clinical trials for diabetes',
    question: 'Clinical trials for diabetes',
    context: {
      disease: 'diabetes',
      additionalQuery: 'clinical trials'
    }
  },
  {
    label: 'Top researchers in Alzheimer\'s disease',
    question: 'Top researchers in Alzheimer\'s disease',
    context: {
      disease: 'Alzheimer\'s disease',
      additionalQuery: 'top researchers'
    }
  },
  {
    label: 'Recent studies on heart disease',
    question: 'Recent studies on heart disease',
    context: {
      disease: 'heart disease',
      additionalQuery: 'recent studies'
    }
  }
];

const SESSIONS_STORAGE_KEY = 'curalink-chat-sessions';
const ACTIVE_SESSION_STORAGE_KEY = 'curalink-active-session';
const MAX_STORED_SESSIONS = 14;

function loadStoredSessions() {
  if (typeof window === 'undefined') return [];

  try {
    const raw = window.localStorage.getItem(SESSIONS_STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(parsed)) return [];

    return parsed
      .filter((item) => item?.sessionId)
      .map((item) => ({
        sessionId: item.sessionId,
        title: item.title || 'New chat',
        updatedAt: item.updatedAt || new Date().toISOString()
      }))
      .slice(0, MAX_STORED_SESSIONS);
  } catch {
    return [];
  }
}

function buildSessionTitle(question = '') {
  const trimmed = question.trim();
  if (!trimmed) return 'New chat';
  if (trimmed.length <= 44) return trimmed;
  return `${trimmed.slice(0, 44)}...`;
}

function upsertSessionMetadata(sessionList, sessionId, title, updatedAt = new Date().toISOString()) {
  const next = sessionList.filter((item) => item.sessionId !== sessionId);
  next.unshift({ sessionId, title: title || 'New chat', updatedAt });
  return next.slice(0, MAX_STORED_SESSIONS);
}

function getInitialSessionId() {
  const stored = loadStoredSessions();
  const active = typeof window !== 'undefined' ? window.localStorage.getItem(ACTIVE_SESSION_STORAGE_KEY) : '';
  if (active) return active;
  if (stored.length) return stored[0].sessionId;
  return createSessionId();
}

export default function App() {
  const [sessionStore, setSessionStore] = useState(loadStoredSessions);
  const [sessionId, setSessionId] = useState(getInitialSessionId);
  const [context, setContext] = useState({
    patientName: '',
    disease: '',
    additionalQuery: '',
    location: ''
  });
  const [question, setQuestion] = useState('');
  const [history, setHistory] = useState([]);
  const [latestResult, setLatestResult] = useState(null);
  const [retrievalDepth, setRetrievalDepth] = useState(160);
  const [loading, setLoading] = useState(false);
  const [isHydratingSession, setIsHydratingSession] = useState(false);
  const [error, setError] = useState('');

  const canSubmit = useMemo(() => question.trim().length > 3, [question]);
  const sessionShortId = useMemo(() => sessionId.slice(-8), [sessionId]);

  const summaryStats = useMemo(() => {
    const fetched = latestResult?.retrieval?.fetched || {};
    const warnings = latestResult?.retrieval?.warnings || [];
    return {
      publications: fetched.publications || 0,
      trials: fetched.clinicalTrials || 0,
      warnings: warnings.length
    };
  }, [latestResult]);

  function updateContext(field, value) {
    setContext((prev) => ({ ...prev, [field]: value }));
  }

  function applyDemoPrompt(promptConfig) {
    setQuestion(promptConfig.question);
    setContext((prev) => ({
      ...prev,
      disease: promptConfig.context.disease,
      additionalQuery: promptConfig.context.additionalQuery
    }));
  }

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(SESSIONS_STORAGE_KEY, JSON.stringify(sessionStore));
  }, [sessionStore]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(ACTIVE_SESSION_STORAGE_KEY, sessionId);
    setSessionStore((prev) => upsertSessionMetadata(prev, sessionId, 'New chat'));
  }, [sessionId]);

  useEffect(() => {
    let cancelled = false;

    async function hydrateSession() {
      setIsHydratingSession(true);
      setError('');

      try {
        const convo = await getConversation(sessionId);
        if (cancelled) return;

        const messages = convo?.messages || [];
        const firstUserQuestion = messages.find((msg) => msg.role === 'user')?.content || 'New chat';

        setSessionStore((prev) =>
          upsertSessionMetadata(prev, sessionId, buildSessionTitle(firstUserQuestion), convo?.lastUpdatedAt)
        );

        setContext((prev) => ({
          ...prev,
          patientName: convo?.patientName || '',
          disease: convo?.disease || '',
          location: convo?.location || ''
        }));

        setHistory(messages.map((msg) => ({ role: msg.role, text: msg.content || '' })));

        const latestAssistant = [...messages].reverse().find((msg) => msg.role === 'assistant');
        if (latestAssistant?.structuredResponse) {
          setLatestResult({
            response: latestAssistant.structuredResponse,
            sources: latestAssistant.sources || [],
            topTrials: [],
            topPublications: [],
            retrieval: {
              expandedQueries: latestAssistant?.retrievalContext?.expandedQueries || [],
              fetched: { publications: 0, clinicalTrials: 0 },
              warnings: []
            }
          });
        } else {
          setLatestResult(null);
        }
      } catch (err) {
        if (cancelled) return;
        setHistory([]);
        setLatestResult(null);
      } finally {
        if (!cancelled) {
          setIsHydratingSession(false);
        }
      }
    }

    hydrateSession();

    return () => {
      cancelled = true;
    };
  }, [sessionId]);

  async function onSubmit(e) {
    e.preventDefault();
    if (!canSubmit) return;

    setLoading(true);
    setError('');

    const userQuestion = question.trim();
    setSessionStore((prev) => upsertSessionMetadata(prev, sessionId, buildSessionTitle(userQuestion)));
    setHistory((prev) => [...prev, { role: 'user', text: userQuestion }]);
    setQuestion('');

    try {
      const result = await sendMessage({
        sessionId,
        message: userQuestion,
        retrievalDepth,
        ...context
      });

      setLatestResult(result);
      setSessionStore((prev) => upsertSessionMetadata(prev, sessionId, buildSessionTitle(userQuestion)));
      setHistory((prev) => [
        ...prev,
        {
          role: 'assistant',
          text: result?.response?.conditionOverview || 'Structured response generated.'
        }
      ]);
    } catch (err) {
      setError(err.message || 'Failed to fetch response');
    } finally {
      setLoading(false);
    }
  }

  function handleComposerKeyDown(event) {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      if (canSubmit && !loading) {
        onSubmit(event);
      }
    }
  }

  function clearConversation() {
    const nextSessionId = createSessionId();
    setSessionStore((prev) => upsertSessionMetadata(prev, nextSessionId, 'New chat'));
    setSessionId(nextSessionId);
    setQuestion('');
    setHistory([]);
    setLatestResult(null);
    setError('');
  }

  return (
    <div className="app-shell">
      <header className="hero">
        <p className="eyebrow">Curalink Hackathon Prototype</p>
        <h1>AI Medical Research Assistant</h1>
        <p>
          Context-aware retrieval from OpenAlex, PubMed, and ClinicalTrials.gov with evidence-grounded reasoning
          powered by a custom open-source LLM.
        </p>
        <div className="status-grid">
          <article>
            <span>Publications Fetched</span>
            <strong>{summaryStats.publications}</strong>
          </article>
          <article>
            <span>Clinical Trials Fetched</span>
            <strong>{summaryStats.trials}</strong>
          </article>
          <article>
            <span>Pipeline Warnings</span>
            <strong>{summaryStats.warnings}</strong>
          </article>
        </div>
      </header>

      <main className="layout">
        <section className="chat-panel">
          <div className="chat-headline">
            <h2>Conversation</h2>
            <button type="button" className="ghost-btn" onClick={clearConversation}>
              New Chat
            </button>
          </div>

          <section className="session-strip" aria-label="Recent sessions">
            <div className="session-scroll">
              {sessionStore.map((session) => (
                <button
                  key={session.sessionId}
                  type="button"
                  className={`session-chip ${session.sessionId === sessionId ? 'is-active' : ''}`}
                  onClick={() => {
                    if (session.sessionId !== sessionId) {
                      setSessionId(session.sessionId);
                      setQuestion('');
                      setError('');
                    }
                  }}
                  title={session.title}
                >
                  {session.title}
                </button>
              ))}
            </div>
          </section>

          <ContextForm context={context} onChange={updateContext} />

          <section className="depth-control">
            <label htmlFor="retrieval-depth">
              Retrieval Depth
              <span>{retrievalDepth}</span>
            </label>
            <input
              id="retrieval-depth"
              type="range"
              min="80"
              max="280"
              step="20"
              value={retrievalDepth}
              onChange={(e) => setRetrievalDepth(Number(e.target.value))}
            />
          </section>

          <div className="prompt-chip-row">
            {demoPrompts.map((prompt) => (
              <button
                key={prompt.label}
                type="button"
                className={`chip ${question === prompt.question ? 'is-active' : ''}`}
                onClick={() => applyDemoPrompt(prompt)}
              >
                {prompt.label}
              </button>
            ))}
          </div>

          <div className="chat-history">
            {isHydratingSession ? <p className="placeholder">Loading previous session history...</p> : null}
            {history.map((entry, index) => (
              <div key={index} className={`bubble ${entry.role}`}>
                {entry.text}
              </div>
            ))}
            {loading ? (
              <div className="bubble assistant loading-bubble">
                <span className="dot" />
                <span className="dot" />
                <span className="dot" />
              </div>
            ) : null}
            {!history.length ? <p className="placeholder">Start with a structured or natural question.</p> : null}
          </div>

          <form className="composer" onSubmit={onSubmit}>
            <textarea
              rows={3}
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              onKeyDown={handleComposerKeyDown}
              placeholder="Ask a medical research question..."
            />
            <div className="composer-meta">
              <small>Session {sessionShortId} · Enter to send · Shift+Enter newline</small>
              <small>{question.length} chars</small>
            </div>
            <button disabled={!canSubmit || loading} type="submit">
              {loading ? 'Analyzing research...' : 'Analyze & Respond'}
            </button>
          </form>

          {error ? <p className="error-text">{error}</p> : null}
        </section>

        <InsightsPanel result={latestResult} />
      </main>
    </div>
  );
}
