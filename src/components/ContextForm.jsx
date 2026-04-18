export default function ContextForm({ context, onChange }) {
  return (
    <section className="context-panel">
      <h2>Patient Context</h2>
      <div className="grid">
        <label>
          Patient Name
          <input
            value={context.patientName}
            onChange={(e) => onChange('patientName', e.target.value)}
            placeholder="John Smith"
          />
        </label>
        <label>
          Disease
          <input
            value={context.disease}
            onChange={(e) => onChange('disease', e.target.value)}
            placeholder="Parkinson's disease"
          />
        </label>
        <label>
          Additional Query
          <input
            value={context.additionalQuery}
            onChange={(e) => onChange('additionalQuery', e.target.value)}
            placeholder="Deep Brain Stimulation"
          />
        </label>
        <label>
          Location (optional)
          <input
            value={context.location}
            onChange={(e) => onChange('location', e.target.value)}
            placeholder="Toronto, Canada"
          />
        </label>
      </div>
    </section>
  );
}
