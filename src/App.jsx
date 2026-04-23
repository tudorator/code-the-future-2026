import { useEffect, useState, useRef } from 'react'
import { io } from 'socket.io-client'
import { Canvas } from '@react-three/fiber'
import { OrbitControls, Environment } from '@react-three/drei'
import { motion, AnimatePresence } from 'framer-motion'
import { Droplets, Gauge, Flame, Activity } from 'lucide-react'
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

  useEffect(() => {
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
  }, []);

  // Get current values from the last history item or default to 0
  const current = dataHistory[dataHistory.length - 1] || { val: 0 };
  
  // We'll use static dummies for Hum/Dist for now since our history array only tracks one key in this simple example
  const latestData = logs.length > 0 ? JSON.parse(logs[0].split('RECV: ')[1]) : { humidity: 0, distance_cm: 0, gas_ppm: 0 };

  return (
    <div style={{ width: '100vw', height: '100vh', backgroundColor: '#0a0a0a', overflow: 'hidden', color: '#eee' }}>
      
      {/* 1. TOP HEADER */}
      <header style={{ position: 'absolute', top: 0, width: '100%', padding: '20px 40px', display: 'flex', justifyContent: 'space-between', z_index: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ width: '12px', height: '12px', borderRadius: '50%', backgroundColor: '#10b981', boxShadow: '0 0 10px #10b981' }} />
          <h2 style={{ margin: 0, fontSize: '1.2rem', letterSpacing: '2px' }}>SYSTEM OPERATIONAL</h2>
        </div>
        <div style={{ opacity: 0.4 }}>LOCATION: CLOUD_LAB_01</div>
      </header>

      {/* 2. SIDEBAR HUD */}
      <div style={{ position: 'absolute', left: '30px', top: '100px', display: 'flex', flexDirection: 'column', gap: '20px', zIndex: 10 }}>
        <MetricCard label="Humidity" value={latestData.humidity} unit="%" icon={<Droplets color="#3b82f6"/>} color="#3b82f6" history={dataHistory.map(d => ({val: latestData.humidity}))} />
        <MetricCard label="Distance" value={latestData.distance_cm} unit="cm" icon={<Gauge color="#10b981"/>} color="#10b981" history={dataHistory.map(d => ({val: latestData.distance_cm}))} />
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