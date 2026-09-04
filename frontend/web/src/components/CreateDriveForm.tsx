import { supabase } from '../supabase';
import { BlockchainService } from '../utils/BlockchainService';

interface Milestone { title: string; amount: string; description: string; targetDate: string; gps: boolean; photo: boolean; video: boolean; bill: boolean; }

interface Props { onSuccess: () => void; }

export const CreateDriveForm: React.FC<Props> = ({ onSuccess }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError]   = useState<string | null>(null);
  const [step, setStep]     = useState<1 | 2>(1);

  // Step 1
  const [title, setTitle]             = useState('');
  const [description, setDescription] = useState('');
  const [problem, setProblem]         = useState('');
  const [category, setCategory]       = useState('Disaster Relief');
  const [location, setLocation]       = useState('');
  const [target, setTarget]           = useState('');
  const [startDate, setStartDate]     = useState('');
  const [endDate, setEndDate]         = useState('');
  const [beneficiaries, setBeneficiaries] = useState('');
  const [urgency, setUrgency]         = useState('High');

  // Step 2
  const [milestones, setMilestones] = useState<Milestone[]>([
    { title: '', amount: '', description: '', targetDate: '', gps: false, photo: true, video: false, bill: true },
  ]);

  const addMilestone = () =>
    setMilestones(prev => [...prev, { title: '', amount: '', description: '', targetDate: '', gps: false, photo: true, video: false, bill: true }]);

  const updateM = (i: number, field: keyof Milestone, val: any) =>
    setMilestones(prev => prev.map((m, idx) => idx === i ? { ...m, [field]: val } : m));

  const removeM = (i: number) =>
    setMilestones(prev => prev.filter((_, idx) => idx !== i));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const totalTarget = milestones.reduce((s, m) => s + (parseFloat(m.amount) || 0), 0);
    try {
      // NGO Limit check (using a default for demo mode)
      const limit = 1000000;
      if (totalTarget > limit) {
        throw new Error(`Your fundraising limit is ₹${limit.toLocaleString('en-IN')}. Please contact Admin to increase it.`);
      }

      const { data: drive, error: dErr } = await supabase.from('drives').insert({
        title, description, problem_statement: problem, category,
        location, target_amount: totalTarget || parseFloat(target),
        start_date: startDate, end_date: endDate,
        beneficiaries_count: parseInt(beneficiaries) || 0,
        urgency_level: urgency, raised_amount: 0,
      }).select().single();
      if (dErr) throw dErr;

      // Blockchain integration
      let blockchainId = null;
      try {
        console.log("Creating on-chain campaign...");
        blockchainId = await BlockchainService.createCampaign(title, totalTarget || parseFloat(target), milestones.length);
        console.log("On-chain campaign created with ID:", blockchainId);
        
        // Update the drive with the blockchain ID
        await supabase.from('drives').update({ blockchain_id: Number(blockchainId) }).eq('id', drive.id);
      } catch (bcErr) {
        console.error("Blockchain campaign creation failed:", bcErr);
        // We continue anyway for demo purposes, but in production this should be handled
      }

      if (milestones.length) {
        const mp = milestones.map(m => ({
          drive_id: drive.id, title: m.title, description: m.description,
          target_amount: parseFloat(m.amount) || 0, target_date: m.targetDate,
          gps_required: m.gps, photo_required: m.photo,
          video_required: m.video, invoice_required: m.bill,
          status: 'pending',
        }));
        const { error: mErr } = await supabase.from('milestones').insert(mp);
        if (mErr) throw mErr;
      }
      onSuccess();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      {/* Step indicator */}
      <div className="row mb-24" style={{ gap: 0 }}>
        {[1, 2].map(s => (
          <div key={s} style={{ display: 'flex', alignItems: 'center' }}>
            <div style={{
              width: 28, height: 28, borderRadius: '50%', display: 'flex', alignItems: 'center',
              justifyContent: 'center', fontSize: 12, fontWeight: 700,
              background: step >= s ? 'var(--primary)' : 'var(--border)',
              color: step >= s ? '#fff' : 'var(--text-3)',
            }}>{s}</div>
            <span style={{ marginLeft: 8, fontSize: 13, fontWeight: step === s ? 600 : 400, color: step === s ? 'var(--text)' : 'var(--text-3)' }}>
              {s === 1 ? 'Drive Details' : 'Milestones'}
            </span>
            {s < 2 && <div style={{ width: 40, height: 2, background: step > s ? 'var(--primary)' : 'var(--border)', margin: '0 12px' }} />}
          </div>
        ))}
      </div>

      {error && <div className="card mb-16" style={{ background: 'var(--red-lt)', border: '1px solid #fecaca', color: 'var(--red)' }}>{error}</div>}

      {step === 1 && (
        <div className="slide-up">
          <div className="form-grid mb-16">
            <div className="form-group" style={{ gridColumn: '1/-1' }}>
              <label>Drive Title *</label>
              <input value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Food Relief for Flood Victims" required />
            </div>
            <div className="form-group">
              <label>Category</label>
              <select value={category} onChange={e => setCategory(e.target.value)}>
                <option>Disaster Relief</option><option>Education</option><option>Healthcare</option><option>Environment</option><option>Women Empowerment</option>
              </select>
            </div>
            <div className="form-group">
              <label>Urgency Level</label>
              <select value={urgency} onChange={e => setUrgency(e.target.value)}>
                <option>Critical</option><option>High</option><option>Medium</option><option>Low</option>
              </select>
            </div>
            <div className="form-group" style={{ gridColumn: '1/-1' }}>
              <label>Short Description</label>
              <textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="What is this drive about?" rows={2} />
            </div>
            <div className="form-group" style={{ gridColumn: '1/-1' }}>
              <label>Problem Statement</label>
              <textarea value={problem} onChange={e => setProblem(e.target.value)} placeholder="Describe the crisis in detail..." rows={3} />
            </div>
            <div className="form-group">
              <label>Location</label>
              <input value={location} onChange={e => setLocation(e.target.value)} placeholder="Nagpur, Maharashtra" />
            </div>
            <div className="form-group">
              <label>Estimated Beneficiaries</label>
              <input type="number" value={beneficiaries} onChange={e => setBeneficiaries(e.target.value)} placeholder="500" />
            </div>
            <div className="form-group">
              <label>Start Date</label>
              <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} />
            </div>
            <div className="form-group">
              <label>End Date</label>
              <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} />
            </div>
          </div>
          <button className="btn btn-primary btn-lg" onClick={() => setStep(2)} disabled={!title}>
            Continue: Add Milestones →
          </button>
        </div>
      )}

      {step === 2 && (
        <form onSubmit={handleSubmit} className="slide-up">
          <div className="section-head">
            <h3>Milestones</h3>
            <button type="button" className="btn btn-outline btn-sm" onClick={addMilestone}>+ Add Milestone</button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginBottom: 24 }}>
            {milestones.map((m, i) => (
              <div key={i} className="card card-sm" style={{ background: 'var(--bg)' }}>
                <div className="row-sb mb-8">
                  <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-3)' }}>MILESTONE {i + 1}</span>
                  {milestones.length > 1 && <button type="button" className="btn-ghost btn-sm" style={{ fontSize: 18, lineHeight: 1 }} onClick={() => removeM(i)}>×</button>}
                </div>
                <div className="form-grid" style={{ gap: 10, marginBottom: 10 }}>
                  <div className="form-group">
                    <label>Title *</label>
                    <input value={m.title} onChange={e => updateM(i, 'title', e.target.value)} placeholder="Buy food packets" required />
                  </div>
                  <div className="form-group">
                    <label>Date *</label>
                    <input type="date" value={m.targetDate} onChange={e => updateM(i, 'targetDate', e.target.value)} required />
                  </div>
                  <div className="form-group">
                    <label>Amount Required (₹) *</label>
                    <input type="number" value={m.amount} onChange={e => updateM(i, 'amount', e.target.value)} placeholder="20000" required />
                  </div>
                  <div className="form-group">
                    <label>Description</label>
                    <input value={m.description} onChange={e => updateM(i, 'description', e.target.value)} placeholder="Brief summary..." />
                  </div>
                </div>
                <div className="row" style={{ flexWrap: 'wrap', gap: 16 }}>
                  <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-3)' }}>PROOF REQUIRED:</span>
                  {(['gps', 'photo', 'video', 'bill'] as const).map(f => (
                    <label key={f} className="check-row">
                      <input type="checkbox" checked={m[f]} onChange={e => updateM(i, f, e.target.checked)} />
                      {f.toUpperCase()}
                    </label>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div className="row">
            <button type="button" className="btn btn-outline" onClick={() => setStep(1)}>← Back</button>
            <button type="submit" className="btn btn-green btn-lg" disabled={loading}>
              {loading ? 'Creating drive...' : 'Launch Drive 🚀'}
            </button>
          </div>
        </form>
      )}
    </div>
  );
};
