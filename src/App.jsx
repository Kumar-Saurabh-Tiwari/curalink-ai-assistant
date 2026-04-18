import { useMemo, useState } from 'react';
import ContextForm from './components/ContextForm.jsx';
import InsightsPanel from './components/InsightsPanel.jsx';
import { sendMessage } from './api/chatApi.js';

function createSessionId() {
  return `session-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

const demoPrompts = [
  'Latest treatment for lung cancer',
  'Clinical trials for diabetes',
  'Top researchers in Alzheimer\'s disease',
  'Recent studies on heart disease'
];

export default function App() {
  const [sessionId] = useState(createSessionId);
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

  async function onSubmit(e) {
    e.preventDefault();
    if (!canSubmit) return;

    setLoading(true);
    setError('');

    const userQuestion = question.trim();
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
              Clear
            </button>
          </div>

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
                key={prompt}
                type="button"
                className={`chip ${question === prompt ? 'is-active' : ''}`}
                onClick={() => setQuestion(prompt)}
              >
                {prompt}
              </button>
            ))}
          </div>

          <div className="chat-history">
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
