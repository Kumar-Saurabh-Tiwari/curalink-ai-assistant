function SourceList({ sources }) {
  if (!sources?.length) return <p>No sources returned.</p>;

  return (
    <div className="sources-list">
      {sources.slice(0, 8).map((source, idx) => (
        <article key={`${source.title}-${idx}`} className="source-card">
          <small>{source.sourcePlatform}</small>
          <h4>{source.title}</h4>
          <p className="source-meta">
            {(source.authors || []).slice(0, 3).join(', ') || 'Unknown authors'}
            {source.year ? ` · ${source.year}` : ''}
          </p>
          <p>{source.snippet || 'No snippet available.'}</p>
          {source.url ? (
            <a href={source.url} target="_blank" rel="noreferrer">
              Open source
            </a>
          ) : (
            <span className="muted">Source URL unavailable</span>
          )}
        </article>
      ))}
    </div>
  );
}

function WarningStrip({ warnings }) {
  if (!warnings?.length) return null;

  return (
    <aside className="warning-strip">
      <strong>Pipeline warnings detected</strong>
      <ul>
        {warnings.map((warning, idx) => (
          <li key={`${warning.provider}-${idx}`}>
            {warning.provider}: {warning.message} {warning.status ? `(status ${warning.status})` : ''}
          </li>
        ))}
      </ul>
    </aside>
  );
}

function PublicationsSummary({ publications }) {
  if (!publications?.length) {
    return <p className="muted">No ranked publications available for this query.</p>;
  }

  return (
    <div className="trial-cards">
      {publications.slice(0, 6).map((publication) => (
        <article className="trial-card" key={publication.id}>
          <h4>{publication.title}</h4>
          <p className="trial-meta">
            {publication.sourcePlatform}
            {publication.year ? ` · ${publication.year}` : ''}
          </p>
          <p>{(publication.abstract || 'No abstract available.').slice(0, 220)}</p>
          {publication.url ? (
            <a href={publication.url} target="_blank" rel="noreferrer">
              Open publication
            </a>
          ) : null}
        </article>
      ))}
    </div>
  );
}

function TrialsSummary({ response, topTrials }) {
  const structuredTrials = response?.clinicalTrialInsights || [];

  if (!structuredTrials.length && !topTrials?.length) {
    return <p className="muted">No clinical trials matched with high confidence.</p>;
  }

  if (structuredTrials.length) {
    return (
      <div className="trial-cards">
        {structuredTrials.map((trial, idx) => (
          <article className="trial-card" key={`${trial.title}-${idx}`}>
            <h4>{trial.title || 'Untitled trial'}</h4>
            <p className="trial-meta">{trial.status || 'UNKNOWN'}</p>
            <p>{trial.relevanceReason || 'Relevance explanation not available.'}</p>
            <p className="muted">{trial.location || 'Location not specified'}</p>
          </article>
        ))}
      </div>
    );
  }

  return (
    <div className="trial-cards">
      {topTrials.map((trial) => (
        <article className="trial-card" key={trial.id}>
          <h4>{trial.title}</h4>
          <p className="trial-meta">{trial.trial?.status || 'UNKNOWN'}</p>
          <p>{(trial.trial?.eligibilityCriteria || 'No eligibility details available.').slice(0, 200)}</p>
          <p className="muted">{(trial.trial?.locations || []).slice(0, 2).join('; ') || 'No location provided'}</p>
        </article>
      ))}
    </div>
  );
}

export default function InsightsPanel({ result }) {
  if (!result) {
    return (
      <section className="insights-panel">
        <h2>Structured Research Output</h2>
        <p>Ask a question to generate condition overview, ranked insights, and source-backed trials.</p>
      </section>
    );
  }

  const { response, topTrials, topPublications, sources, retrieval } = result;

  return (
    <section className="insights-panel">
      <h2>Structured Research Output</h2>
      <WarningStrip warnings={retrieval?.warnings || []} />
      <div className="meta-strip">
        <span>Expanded Queries: {retrieval?.expandedQueries?.join(' | ')}</span>
        <span>
          Depth: {retrieval?.fetched?.publications || 0} publications + {retrieval?.fetched?.clinicalTrials || 0} trials
        </span>
      </div>

      <article>
        <h3>Condition Overview</h3>
        <p>{response?.conditionOverview}</p>
      </article>

      <article>
        <h3>Research Insights</h3>
        <ul>
          {(response?.researchInsights || []).map((item, idx) => (
            <li key={idx}>{item}</li>
          ))}
        </ul>
      </article>

      <article>
        <h3>Clinical Trials</h3>
        <TrialsSummary response={response} topTrials={topTrials} />
      </article>

      <article>
        <h3>Top Publications</h3>
        <PublicationsSummary publications={topPublications} />
      </article>

      <article>
        <h3>Personalized Guidance</h3>
        <ul>
          {(response?.personalizedGuidance || []).map((item, idx) => (
            <li key={idx}>{item}</li>
          ))}
        </ul>
      </article>

      <article>
        <h3>Safety Notes</h3>
        <ul>
          {(response?.safetyNotes || []).map((note, idx) => (
            <li key={idx}>{note}</li>
          ))}
        </ul>
      </article>

      <article>
        <h3>Source Attribution</h3>
        <SourceList sources={sources} />
      </article>
    </section>
  );
}
