import { useEffect, useState } from 'react'
import { io } from 'socket.io-client'
import { Canvas } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import { motion } from 'framer-motion'
import { Droplets, Gauge, Flame } from 'lucide-react'
import { LineChart, Line, ResponsiveContainer, YAxis } from 'recharts'
import { Splat } from '@react-three/drei'

const socket = io('http://10.88.51.8:5000', { transports: ['polling'] });

// --- SUB-COMPONENT: A Polished Metric Card ---
const MetricCard = ({ label, value, unit, icon, history, color }) => (
  <motion.div 
    initial={{ opacity: 0, x: -20 }}
    animate={{ opacity: 1, x: 0 }}
    style={{
      background: 'rgba(20, 20, 20, 0.7)',
      backdropFilter: 'blur(12px)',
      padding: '20px',
      borderRadius: '20px',
      border: `1px solid ${value > 400 && label === 'Gas' ? '#f43f5e' : 'rgba(255,255,255,0.1)'}`,
      width: '280px',
      boxShadow: '0 8px 32px rgba(0,0,0,0.3)'
    }}
  >
    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
      <span style={{ opacity: 0.6, fontSize: '0.9rem', fontWeight: 600 }}>{label.toUpperCase()}</span>
      {icon}
    </div>
    <div style={{ fontSize: '2rem', fontWeight: 800, marginBottom: '10px' }}>
      {value}<span style={{ fontSize: '1rem', opacity: 0.5, marginLeft: '4px' }}>{unit}</span>
    </div>
    
    {/* Mini Sparkline Graph */}
    <div style={{ height: '50px', width: '100%' }}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={history}>
          <Line type="monotone" dataKey="val" stroke={color} strokeWidth={2} dot={false} isAnimationActive={false} />
          <YAxis hide domain={['auto', 'auto']} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  </motion.div>
)

export default function App() {
  const [dataHistory, setDataHistory] = useState([]) // Stores last 20 readings
  const [logs, setLogs] = useState([]) // For the "Terminal" view
  const [authMode, setAuthMode] = useState('login')
  const [credentials, setCredentials] = useState({ username: '', email: '', password: '', confirmPassword: '' })
  const [authError, setAuthError] = useState('')
  const [loggedInUser, setLoggedInUser] = useState(null)

  useEffect(() => {
    if (!loggedInUser) return

    socket.on('sensor_update', (newData) => {
      // 1. Update History (keep last 20 points)
      setDataHistory(prev => {
        const updated = [...prev, { val: newData.gas_ppm, time: Date.now() }];
        return updated.slice(-20);
      });

      // 2. Update Logs
      setLogs(prev => [`[${new Date().toLocaleTimeString()}] RECV: ${JSON.stringify(newData)}`, ...prev].slice(0, 5));
    });
    return () => socket.off('sensor_update');
  }, [loggedInUser]);

  const handleInput = (event) => {
    const { name, value } = event.target
    setCredentials(prev => ({ ...prev, [name]: value }))
  }

  const handleAuthSubmit = (event) => {
    event.preventDefault()
    setAuthError('')

    if (!credentials.username.trim() || !credentials.password.trim()) {
      setAuthError('Username and password are required.')
      return
    }

    if (authMode === 'register') {
      if (!credentials.email.trim()) {
        setAuthError('Email is required for registration.')
        return
      }
      if (credentials.password !== credentials.confirmPassword) {
        setAuthError('Passwords do not match.')
        return
      }
    }

    setLoggedInUser({ username: credentials.username })
    setCredentials({ username: '', email: '', password: '', confirmPassword: '' })
    setAuthError('')
  }

  const handleLogout = () => {
    setLoggedInUser(null)
    setDataHistory([])
    setLogs([])
  }

  // We'll use static dummies for Hum/Dist for now since our history array only tracks one key in this simple example
  const latestData = logs.length > 0 ? JSON.parse(logs[0].split('RECV: ')[1]) : { humidity: 0, distance_cm: 0, gas_ppm: 0 };

  if (!loggedInUser) {
    return (
      <div style={{ width: '100vw', height: '100vh', display: 'grid', placeItems: 'center', backgroundColor: '#050509', color: '#eee', padding: '24px' }}>
        <div style={{ width: '420px', maxWidth: '100%', padding: '36px', borderRadius: '24px', background: 'rgba(10, 10, 20, 0.96)', border: '1px solid rgba(255,255,255,0.08)', boxShadow: '0 20px 80px rgba(0,0,0,0.35)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
            <div>
              <h1 style={{ margin: 0, fontSize: '1.8rem' }}>{authMode === 'login' ? 'Welcome Back' : 'Create Account'}</h1>
              <p style={{ margin: '8px 0 0', opacity: 0.7 }}>Secure access to the dashboard.</p>
            </div>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button type="button" onClick={() => { setAuthMode('login'); setAuthError('') }} style={{ padding: '10px 16px', borderRadius: '999px', border: '1px solid rgba(255,255,255,0.12)', background: authMode === 'login' ? '#111827' : 'transparent', color: '#fff', cursor: 'pointer' }}>Login</button>
              <button type="button" onClick={() => { setAuthMode('register'); setAuthError('') }} style={{ padding: '10px 16px', borderRadius: '999px', border: '1px solid rgba(255,255,255,0.12)', background: authMode === 'register' ? '#111827' : 'transparent', color: '#fff', cursor: 'pointer' }}>Register</button>
            </div>
          </div>

          <form onSubmit={handleAuthSubmit} style={{ display: 'grid', gap: '16px' }}>
            <label style={{ display: 'grid', gap: '8px', fontSize: '0.9rem', opacity: 0.8 }}>
              Username
              <input name="username" value={credentials.username} onChange={handleInput} placeholder="enter username" style={{ width: '100%', padding: '14px 16px', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.12)', background: '#0f172a', color: '#fff' }} />
            </label>

            {authMode === 'register' && (
              <label style={{ display: 'grid', gap: '8px', fontSize: '0.9rem', opacity: 0.8 }}>
                Email
                <input name="email" type="email" value={credentials.email} onChange={handleInput} placeholder="email@example.com" style={{ width: '100%', padding: '14px 16px', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.12)', background: '#0f172a', color: '#fff' }} />
              </label>
            )}

            <label style={{ display: 'grid', gap: '8px', fontSize: '0.9rem', opacity: 0.8 }}>
              Password
              <input name="password" type="password" value={credentials.password} onChange={handleInput} placeholder="password" style={{ width: '100%', padding: '14px 16px', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.12)', background: '#0f172a', color: '#fff' }} />
            </label>

            {authMode === 'register' && (
              <label style={{ display: 'grid', gap: '8px', fontSize: '0.9rem', opacity: 0.8 }}>
                Confirm Password
                <input name="confirmPassword" type="password" value={credentials.confirmPassword} onChange={handleInput} placeholder="repeat password" style={{ width: '100%', padding: '14px 16px', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.12)', background: '#0f172a', color: '#fff' }} />
              </label>
            )}

            {authError && <div style={{ color: '#f87171', fontSize: '0.9rem' }}>{authError}</div>}

            <button type="submit" style={{ width: '100%', padding: '14px 16px', borderRadius: '16px', border: 'none', background: '#2563eb', color: '#fff', fontWeight: 700, cursor: 'pointer' }}>
              {authMode === 'login' ? 'Sign In' : 'Register'}
            </button>
          </form>

          <div style={{ marginTop: '18px', opacity: 0.7, fontSize: '0.9rem', textAlign: 'center' }}>
            {authMode === 'login' ? 'New here?' : 'Already have an account?'}
            <button type="button" onClick={() => setAuthMode(authMode === 'login' ? 'register' : 'login')} style={{ marginLeft: '8px', background: 'none', border: 'none', color: '#60a5fa', cursor: 'pointer', textDecoration: 'underline' }}>
              {authMode === 'login' ? 'Create one' : 'Sign in'}
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div style={{ width: '100vw', height: '100vh', backgroundColor: '#0a0a0a', overflow: 'hidden', color: '#eee' }}>
      
      {/* 1. TOP HEADER */}
      <header style={{ position: 'absolute', top: 0, width: '100%', padding: '20px 40px', display: 'flex', justifyContent: 'space-between', zIndex: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ width: '12px', height: '12px', borderRadius: '50%', backgroundColor: '#10b981', boxShadow: '0 0 10px #10b981' }} />
          <div>
            <h2 style={{ margin: 0, fontSize: '1.2rem', letterSpacing: '2px' }}>SYSTEM OPERATIONAL</h2>
            <p style={{ margin: 0, opacity: 0.6, fontSize: '0.85rem' }}>Signed in as {loggedInUser?.username}</p>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '18px', opacity: 0.9 }}>
          <span style={{ opacity: 0.7 }}>LOCATION: CLOUD_LAB_01</span>
          <button onClick={handleLogout} style={{ padding: '10px 18px', borderRadius: '999px', border: '1px solid rgba(255,255,255,0.12)', background: 'rgba(255,255,255,0.03)', color: '#fff', cursor: 'pointer' }}>Logout</button>
        </div>
      </header>

      {/* 2. SIDEBAR HUD */}
      <div style={{ position: 'absolute', left: '30px', top: '100px', display: 'flex', flexDirection: 'column', gap: '20px', zIndex: 10 }}>
        <MetricCard label="Humidity" value={latestData.humidity} unit="%" icon={<Droplets color="#3b82f6"/>} color="#3b82f6" history={dataHistory.map(() => ({val: latestData.humidity}))} />
        <MetricCard label="Distance" value={latestData.distance_cm} unit="cm" icon={<Gauge color="#10b981"/>} color="#10b981" history={dataHistory.map(() => ({val: latestData.distance_cm}))} />
        <MetricCard label="Gas" value={latestData.gas_ppm} unit="ppm" icon={<Flame color="#f43f5e"/>} color="#f43f5e" history={dataHistory} />
      </div>

      {/* 3. CONSOLE LOGS (Bottom Left) */}
      <div style={{ position: 'absolute', bottom: '30px', left: '30px', zIndex: 10, fontFamily: 'monospace', fontSize: '0.75rem', color: '#10b981', opacity: 0.7 }}>
        {logs.map((log, i) => <div key={i}>{log}</div>)}
      </div>

      {/* 4. BACKGROUND 3D CANVAS */}
      <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', zIndex: 0 }}>
        <Canvas camera={{ position: [0, 1, 5] }}>
          
          {/* LOAD THE GAUSSIAN SPLAT HERE */}
          <Splat src="/garden.splat" />
          
          {/* Controls to fly around the scan */}
          <OrbitControls makeDefault />
        </Canvas>
      </div>
    </div>
  );
}