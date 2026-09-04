import { useState, useEffect } from 'react';
import { NgoDashboard } from './components/NgoDashboard';
import { DonorDashboard } from './components/DonorDashboard';
import { AdminDashboard } from './components/AdminDashboard';
import { t, LANGUAGES } from './i18n';
import type { LangCode } from './i18n';
import { BlockchainService } from './utils/BlockchainService';

type Role = 'landing' | 'ngo' | 'donor' | 'admin';
interface User { name: string; email: string; id: string; role: Role; }

const GALLERY_IMAGES = [
  'https://images.unsplash.com/photo-1488521787991-ed7bbaae773c?q=80&w=600',
  'https://images.unsplash.com/photo-1542810634-71277d95dcbb?q=80&w=600',
  'https://images.unsplash.com/photo-1593113598332-cd288d649433?q=80&w=600',
  'https://images.unsplash.com/photo-1532629345422-7515f3d16bb6?q=80&w=600',
  'https://images.unsplash.com/photo-1509059852496-f3822ae057bf?q=80&w=600'
];

export default function App() {
  const [role, setRole] = useState<Role>('landing');
  const [user, setUser] = useState<User | null>(null);
  const [dark, setDark] = useState(false);
  const [lang, setLang] = useState<LangCode>('en');

  // Dummy Auth Overlay State
  const [showLogin, setShowLogin] = useState<Role | null>(null);
  const [dummyName, setDummyName] = useState('');
  const [dummyEmail, setDummyEmail] = useState('');

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light');
    // Load dummy session
    const saved = localStorage.getItem('trustchain_session');
    if (saved) setUser(JSON.parse(saved));

    // Initialize blockchain
    BlockchainService.init().then(connected => {
      if (connected) console.log("Blockchain wallet connected");
      else console.log("Blockchain wallet not found");
    });
  }, [dark]);

  const handleDummyLogin = () => {
    if (!dummyName || !showLogin) return;
    const newUser: User = { 
      name: dummyName, 
      email: dummyEmail || `${dummyName.toLowerCase().replace(' ', '')}@example.com`,
      id: showLogin === 'ngo' ? 'dummy-ngo-id' : 'dummy-donor-id',
      role: showLogin
    };
    setUser(newUser);
    localStorage.setItem('trustchain_session', JSON.stringify(newUser));
    setRole(showLogin);
    setShowLogin(null);
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('trustchain_session');
    setRole('landing');
  };

  if (role === 'ngo')   return <NgoDashboard   user={user} onBack={handleLogout} lang={lang} dark={dark} setDark={setDark} setLang={setLang} />;
  if (role === 'donor') return <DonorDashboard  user={user} onBack={handleLogout} lang={lang} dark={dark} setDark={setDark} setLang={setLang} />;
  if (role === 'admin') return <AdminDashboard  onBack={() => setRole('landing')} lang={lang} dark={dark} setDark={setDark} setLang={setLang} />;

  return (
    <div className="landing"> 
      <nav className="topnav fade-in" style={{ position: 'fixed', top: 0, left: 0, right: 0, border: 'none', background: 'transparent' }}>
        <div className="topnav-logo">Trust<span>chain</span></div>
        <div className="row gap-24">
          <span className="text-bold pointer">About</span>
          <span className="text-bold pointer" onClick={() => setShowLogin('donor')}>Donate</span>
          <span className="text-bold pointer" onClick={() => setShowLogin('ngo')}>Fundraise</span>
          <select
            className="lang-select"
            style={{ background: 'white' }}
            value={lang}
            onChange={e => setLang(e.target.value as LangCode)}
          >
            {LANGUAGES.map(l => (
              <option key={l.code} value={l.code}>{l.native}</option>
            ))}
          </select>
          <button className="landing-hero-btn" style={{ padding: '8px 20px', fontSize: '14px' }} onClick={() => setShowLogin('donor')}>
            Donate Now
          </button>
        </div>
      </nav>

      <div className="landing-header slide-up">
        <h1 className="landing-headline">
          Where successful<br />fundraisers start
        </h1>
        <button className="landing-hero-btn" onClick={() => setShowLogin('donor')}>
          Start a TrustChain
        </button>
      </div>

      <div className="curved-gallery slide-up" style={{ animationDelay: '0.1s' }}>
        {GALLERY_IMAGES.map((img, i) => (
          <img key={i} src={img} className="gallery-img" alt="impact" />
        ))}
      </div>

      <div className="role-cards slide-up" style={{ animationDelay: '0.2s' }}>
        <div className="role-card" onClick={() => setShowLogin('ngo')}>
          <div className="role-card-icon">🌿</div>
          <h3>{t(lang, 'ngoDashboard')}</h3>
          <p>{t(lang, 'ngoDesc')}</p>
          <button className="btn btn-outline btn-full">Become a Partner</button>
        </div>

        <div className="role-card" onClick={() => setShowLogin('donor')}>
          <div className="role-card-icon">💝</div>
          <h3>{t(lang, 'donorPortal')}</h3>
          <p>{t(lang, 'donorDesc')}</p>
          <button className="btn btn-primary btn-full">Explore Projects</button>
        </div>

        <div className="role-card" onClick={() => setRole('admin')}>
          <div className="role-card-icon">🛡️</div>
          <h3>{t(lang, 'adminConsole')}</h3>
          <p>{t(lang, 'adminDesc')}</p>
          <button className="btn btn-outline btn-full">Administration</button>
        </div>
      </div>

      {showLogin && (
        <div className="modal-overlay" onClick={() => setShowLogin(null)}>
          <div className="modal-content slide-up" onClick={e => e.stopPropagation()} style={{ maxWidth: 400 }}>
            <h2 style={{ marginBottom: 16 }}>Welcome to TrustChain</h2>
            <p className="text-muted mb-24">Enter your details to access the {showLogin.toUpperCase()} {showLogin === 'ngo' ? 'Partner' : 'Donor'} portal.</p>
            <div className="form-group mb-16">
              <label>{showLogin === 'ngo' ? 'Organization Name' : 'Full Name'}</label>
              <input value={dummyName} onChange={e => setDummyName(e.target.value)} placeholder="e.g. Save the Children" />
            </div>
            <div className="form-group mb-24">
              <label>Email Address</label>
              <input value={dummyEmail} onChange={e => setDummyEmail(e.target.value)} placeholder="name@example.com" />
            </div>
            <button className="btn btn-primary btn-full btn-lg" onClick={handleDummyLogin}>Continue →</button>
          </div>
        </div>
      )}

      <div className="footer-landing" style={{ padding: '40px', color: 'var(--text-4)', fontSize: '12px' }}>
        <span className="live-dot" /> {t(lang, 'syncFooter')}
      </div>

      <a
        href={`https://wa.me/918262001975?text=${encodeURIComponent('Hello! I am interested in supporting TrustChain causas.')}`}
        target="_blank"
        rel="noopener noreferrer"
        className="whatsapp-btn"
        title="Contact on WhatsApp"
      >
        <img src="/whatsapp.png" alt="WhatsApp" />
      </a>
    </div>
  );
}
