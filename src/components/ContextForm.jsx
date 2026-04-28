import React from 'react';
import { User, Activity, Search, MapPin } from 'lucide-react';

function ContextForm({ context, onChange }) {
  return (
    <section className="context-panel">
      <h2>Context Details</h2>
      <div className="grid">
        <label className="input-group">
          <span><User size={16} /> Patient Name</span>
          <input
            value={context.patientName}
            onChange={(e) => onChange('patientName', e.target.value)}
            placeholder="John Smith"
            className="modern-input"
          />
        </label>
        <label className="input-group">
          <span><Activity size={16} /> Disease</span>
          <input
            value={context.disease}
            onChange={(e) => onChange('disease', e.target.value)}
            placeholder="Parkinson's disease"
            className="modern-input"
          />
        </label>
        <label className="input-group">
          <span><Search size={16} /> Additional Query</span>
          <input
            value={context.additionalQuery}
            onChange={(e) => onChange('additionalQuery', e.target.value)}
            placeholder="Deep Brain Stimulation"
            className="modern-input"
          />
        </label>
        <label className="input-group">
          <span><MapPin size={16} /> Location (optional)</span>
          <input
            value={context.location}
            onChange={(e) => onChange('location', e.target.value)}
            placeholder="Toronto, Canada"
            className="modern-input"
          />
        </label>
      </div>
    </section>
  );
}

export default React.memo(ContextForm);
