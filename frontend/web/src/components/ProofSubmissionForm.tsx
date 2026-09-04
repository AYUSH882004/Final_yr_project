import { supabase } from '../supabase';
import { BlockchainService } from '../utils/BlockchainService';

interface Props { milestones: any[]; onSuccess: () => void; }

export const ProofSubmissionForm: React.FC<Props> = ({ milestones, onSuccess }) => {
  const [milestoneId, setMilestoneId] = useState('');
  const [summary, setSummary]         = useState('');
  const [benefCount, setBenefCount]   = useState('');
  const [gpsLocation, setGpsLocation] = useState('');
  const [photoFile, setPhotoFile]     = useState<File | null>(null);
  const [billFile, setBillFile]       = useState<File | null>(null);
  const [loading, setLoading]         = useState(false);
  const [error, setError]             = useState<string | null>(null);

  const uploadFile = async (file: File, folder: string): Promise<string> => {
    const ext  = file.name.split('.').pop();
    const path = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
    const { error: upErr } = await supabase.storage.from('proofs').upload(path, file);
    if (upErr) throw upErr;
    const { data } = supabase.storage.from('proofs').getPublicUrl(path);
    return data.publicUrl;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!milestoneId) { setError('Please select a milestone.'); return; }
    if (!photoFile && !billFile) { setError('Upload at least one photo or bill.'); return; }
    setLoading(true);
    setError(null);
    try {
      const inserts: any[] = [];
      if (photoFile) {
        const url = await uploadFile(photoFile, 'photos');
        inserts.push({ milestone_id: milestoneId, proof_type: 'image', proof_url: url, status: 'pending', gps_location: gpsLocation });
      }
      if (billFile) {
        const url = await uploadFile(billFile, 'bills');
        inserts.push({ milestone_id: milestoneId, proof_type: 'pdf', proof_url: url, status: 'pending', gps_location: gpsLocation });
      }
      if (!photoFile && !billFile && gpsLocation) {
        inserts.push({ milestone_id: milestoneId, proof_type: 'gps', proof_url: gpsLocation, status: 'pending', gps_location: gpsLocation });
      }
      const { error: pErr } = await supabase.from('proofs').insert(inserts);
      if (pErr) throw pErr;

      // Blockchain integration
      try {
        const ms = milestones.find(m => m.id === milestoneId);
        // We need to fetch the drive to get the blockchain_id
        const { data: drive } = await supabase.from('drives').select('blockchain_id').eq('id', ms.drive_id).single();
        
        if (drive && drive.blockchain_id) {
          console.log("Submitting milestone on-chain...");
          // We use the first proof URL as the IPFS hash for demo purposes
          const proofUrl = inserts[0]?.proof_url || 'N/A';
          await BlockchainService.submitMilestone(drive.blockchain_id, ms.title, proofUrl);
          console.log("On-chain milestone submitted!");
        }
      } catch (bcErr) {
        console.error("Blockchain milestone submission failed:", bcErr);
      }

      onSuccess();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="col gap-16 slide-up">
      {error && <div className="card" style={{ background: 'var(--red-lt)', color: 'var(--red)', border: '1px solid #fecaca' }}>{error}</div>}

      <div className="form-group">
        <label>Select Milestone *</label>
        <select value={milestoneId} onChange={e => setMilestoneId(e.target.value)} required>
          <option value="">-- Choose Milestone --</option>
          {milestones.map(m => <option key={m.id} value={m.id}>{m.driveTitle} → {m.title}</option>)}
        </select>
      </div>

      <div className="form-group">
        <label>📍 GPS Geotag / Work Coordinates</label>
        <input value={gpsLocation} onChange={e => setGpsLocation(e.target.value)} placeholder="e.g. 18.2323 N, 72.3434 E" />
      </div>

      <div className="form-group">
        <label>Work Summary</label>
        <textarea value={summary} onChange={e => setSummary(e.target.value)} placeholder="Brief summary of work done..." rows={3} />
      </div>

      <div className="form-group">
        <label>Beneficiaries Helped</label>
        <input type="number" value={benefCount} onChange={e => setBenefCount(e.target.value)} placeholder="e.g. 250" />
      </div>

      <div className="grid-2">
        <div className="form-group">
          <label>📷 Upload Photo Proof</label>
          <input type="file" accept="image/*" onChange={e => setPhotoFile(e.target.files?.[0] || null)} />
          {photoFile && <span className="text-sm text-muted">{photoFile.name}</span>}
        </div>
        <div className="form-group">
          <label>📄 Upload Bill / Invoice</label>
          <input type="file" accept="image/*,application/pdf" onChange={e => setBillFile(e.target.files?.[0] || null)} />
          {billFile && <span className="text-sm text-muted">{billFile.name}</span>}
        </div>
      </div>

      <button type="submit" className="btn btn-primary btn-lg" disabled={loading}>
        {loading ? 'Uploading...' : 'Submit Proof for Admin Review →'}
      </button>
    </form>
  );
};
