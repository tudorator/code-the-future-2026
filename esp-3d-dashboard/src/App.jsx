import { useEffect, useState, useRef } from 'react'
import { io } from 'socket.io-client'
import { Canvas, useFrame } from '@react-three/fiber'
import { FlyControls, Splat } from '@react-three/drei'
import { motion, AnimatePresence } from 'framer-motion'
import { Droplets, Gauge, Flame, Activity, Wifi, EyeOff, Eye, UserPlus, Thermometer } from 'lucide-react'
import { AreaChart, Area, ResponsiveContainer, YAxis } from 'recharts'
import * as THREE from 'three'

// --- 1. SOCKET CONNECTION ---
const socket = io('http://172.26.172.8:5000', { transports: ['polling'] });

// --- 2. GAME ENGINE CONFIGURATION ---
const FLOOR_LEVEL = -1;
const ENTRANCE_POS = [9.61, FLOOR_LEVEL, -0.29];

const WALK_PATH = [
  [9.61, -0.29],
  [2.56, -0.29],
  [-6.61, -0.05]
];

// --- 3. THE PROCEDURAL HUMANOID ---
const ProceduralHumanoid = ({ id, startPos, gasLevel, humidity, temp, onDespawn }) => {
  const groupRef = useRef()
  const materialRef = useRef()

  const leftLegRef = useRef()
  const rightLegRef = useRef()
  const leftArmRef = useRef()
  const rightArmRef = useRef()

  const [spawnTime] = useState(Date.now())
  const waypointIdx = useRef(0)

  let targetColor = '#10b981'
  if (temp < 20) targetColor = '#3b82f6'
  else if (temp > 28) targetColor = '#f43f5e'

  useFrame(({ clock }, delta) => {
    if (!groupRef.current || !materialRef.current) return;

    const currentX = groupRef.current.position.x;
    const currentZ = groupRef.current.position.z;
    const targetX = WALK_PATH[waypointIdx.current][0];
    const targetZ = WALK_PATH[waypointIdx.current][1];

    const dx = targetX - currentX;
    const dz = targetZ - currentZ;
    const distance = Math.sqrt(dx * dx + dz * dz);

    let speed = 0;

    if (distance < 0.2) {
      if (waypointIdx.current < WALK_PATH.length - 1) {
        waypointIdx.current++;
      } else {
        if (typeof onDespawn === 'function') {
          onDespawn(id);
        }
      }
    } else {
      speed = 0.8;
      groupRef.current.position.x += (dx / distance) * speed * delta;
      groupRef.current.position.z += (dz / distance) * speed * delta;
      groupRef.current.rotation.y = Math.atan2(dx, dz);
    }

    const walkCycle = speed > 0 ? Math.sin(clock.getElapsedTime() * 8) : 0;
    if (leftLegRef.current) leftLegRef.current.rotation.x = walkCycle * 0.5;
    if (rightLegRef.current) rightLegRef.current.rotation.x = -walkCycle * 0.5;
    if (leftArmRef.current) leftArmRef.current.rotation.x = -walkCycle * 0.5;
    if (rightArmRef.current) rightArmRef.current.rotation.x = walkCycle * 0.5;
  });

  const BodyMaterial = <meshStandardMaterial ref={materialRef} color={targetColor} transparent={true} roughness={0.7} />

  return (
    <group ref={groupRef} position={[startPos[0], FLOOR_LEVEL, startPos[2]]}>
      <mesh position={[0, 1.6, 0]} castShadow><sphereGeometry args={[0.2, 16, 16]} />{BodyMaterial}</mesh>
      <mesh position={[0, 1.1, 0]} castShadow><boxGeometry args={[0.5, 0.6, 0.25]} />{BodyMaterial}</mesh>
      <group position={[-0.35, 1.3, 0]} ref={leftArmRef}><mesh position={[0, -0.3, 0]} castShadow><boxGeometry args={[0.15, 0.6, 0.15]} />{BodyMaterial}</mesh></group>
      <group position={[0.35, 1.3, 0]} ref={rightArmRef}><mesh position={[0, -0.3, 0]} castShadow><boxGeometry args={[0.15, 0.6, 0.15]} />{BodyMaterial}</mesh></group>
      <group position={[-0.15, 0.8, 0]} ref={leftLegRef}><mesh position={[0, -0.4, 0]} castShadow><boxGeometry args={[0.18, 0.8, 0.18]} />{BodyMaterial}</mesh></group>
      <group position={[0.15, 0.8, 0]} ref={rightLegRef}><mesh position={[0, -0.4, 0]} castShadow><boxGeometry args={[0.18, 0.8, 0.18]} />{BodyMaterial}</mesh></group>
    </group>
  )
}

// --- 4. UI SUB-COMPONENTS ---
const Sparkline = ({ data, color, dataKey }) => (
  // SCALED DOWN: Height from 60px to 45px
  <div style={{ height: '45px', width: '100%', marginTop: '8px' }}>
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={data}>
        <defs>
          <linearGradient id={`color${dataKey}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={color} stopOpacity={0.4} />
            <stop offset="95%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
        <Area type="monotone" dataKey="val" stroke={color} strokeWidth={2} fillOpacity={1} fill={`url(#color${dataKey})`} isAnimationActive={false} />
        <YAxis hide domain={['auto', 'auto']} />
      </AreaChart>
    </ResponsiveContainer>
  </div>
)

const MetricCard = ({ label, value, unit, icon, history, color, dataKey }) => (
  <motion.div
    initial={{ opacity: 0, x: -30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30, filter: 'blur(10px)' }}
    transition={{ type: 'spring', stiffness: 200, damping: 20 }}
    style={{
      background: 'rgba(15, 15, 15, 0.4)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
      // SCALED DOWN: padding, border-radius, and width
      padding: '16px 20px', borderRadius: '20px',
      border: `1px solid ${value > 400 && label === 'Gas Concentration' ? 'rgba(244, 63, 94, 0.5)' : 'rgba(255, 255, 255, 0.08)'}`,
      width: '260px', boxShadow: '0 10px 30px rgba(0,0,0,0.4)'
    }}
  >
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
      <span style={{ opacity: 0.5, fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '1px' }}>{label}</span>
      <div style={{ padding: '6px', background: `rgba(${color === '#f43f5e' ? '244, 63, 94' : color === '#10b981' ? '16, 185, 129' : '59, 130, 246'}, 0.1)`, borderRadius: '10px' }}>
        {icon}
      </div>
    </div>
    {/* SCALED DOWN: Font size from 2.5rem to 2rem, added whiteSpace: nowrap */}
    <div style={{ fontSize: '2rem', fontWeight: 800, textShadow: '0 2px 10px rgba(0,0,0,0.5)', whiteSpace: 'nowrap' }}>
      {value}<span style={{ fontSize: '1rem', opacity: 0.4, marginLeft: '6px', fontWeight: 500 }}>{unit}</span>
    </div>
    <Sparkline data={history} color={color} dataKey={dataKey} />
  </motion.div>
)

// --- 5. MAIN APP LOGIC ---
export default function App() {
  const [dataHistory, setDataHistory] = useState([])
  const [logs, setLogs] = useState([])
  const [isConnected, setIsConnected] = useState(false)
  const [showUI, setShowUI] = useState(true)

  const [visitors, setVisitors] = useState([])
  const isTripped = useRef(false)

  useEffect(() => {
    if (socket.connected) setIsConnected(true);

    function onConnect() { setIsConnected(true); }
    function onDisconnect() { setIsConnected(false); }

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);

    socket.on('sensor_update', (newData) => {
      const dist = newData.distance_cm;
      const gas = newData.gas_ppm;
      const hum = newData.humidity || 0;
      const temp = newData.temperature || 0;

      if (dist > 0 && dist < 80) {
        if (!isTripped.current) {
          isTripped.current = true;
          setVisitors(prev => [...prev, {
            id: Math.random(),
            pos: ENTRANCE_POS,
            gas: gas,
            hum: hum,
            temp: temp
          }]);
        }
      } else if (dist >= 80 || dist < 0) {
        isTripped.current = false;
      }

      setDataHistory(prev => {
        const updated = [...prev, { gas: gas, hum: hum, dist: dist, temp: temp, time: Date.now() }];
        return updated.slice(-20);
      });
      setLogs(prev => [`[${new Date().toLocaleTimeString()}] SYS_RECV: ${JSON.stringify(newData)}`, ...prev].slice(0, 4));
    });

    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off('sensor_update');
    }
  }, []);

  const handleDespawn = (idToRemove) => {
    setVisitors(prev => prev.filter(v => v.id !== idToRemove));
  }

  const latestData = dataHistory.length > 0
    ? { gas: dataHistory[dataHistory.length - 1].gas, hum: dataHistory[dataHistory.length - 1].hum, dist: dataHistory[dataHistory.length - 1].dist, temp: dataHistory[dataHistory.length - 1].temp }
    : { gas: 0, hum: 0, dist: 0, temp: 0 };

  const handleManualSpawn = () => {
    setVisitors(prev => [...prev, {
      id: Math.random(),
      pos: ENTRANCE_POS,
      gas: latestData.gas,
      hum: latestData.hum,
      temp: latestData.temp
    }]);
  };

  return (
    // FIX 1: Changed to position: fixed, inset: 0 to lock the viewport and kill the scrollbar!
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: '#000', overflow: 'hidden', color: '#fff', fontFamily: 'Inter, system-ui, sans-serif' }}>

      {/* 3D CANVAS & SPLAT SCENE */}
      <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', zIndex: 0 }}>
        <Canvas camera={{ position: [9.61, 2, 5], fov: 65 }}>
          <ambientLight intensity={0.6} />
          <directionalLight position={[10, 10, 5]} intensity={1.5} />

          <Splat src="/garden.splat" position={[0, -1, 0]} />

          {visitors.map(visitor => (
            <ProceduralHumanoid
              key={visitor.id}
              id={visitor.id}
              startPos={visitor.pos}
              gasLevel={visitor.gas}
              humidity={visitor.hum}
              temp={visitor.temp}
              onDespawn={handleDespawn}
            />
          ))}

          <FlyControls dragToLook={true} movementSpeed={3} rollSpeed={0.5} />
        </Canvas>
      </div>

      {/* FLOATING UI LAYER */}
      <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', zIndex: 10, pointerEvents: 'none' }}>
        <AnimatePresence>
          {showUI && (
            <motion.header
              initial={{ y: -50, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: -50, opacity: 0 }}
              style={{ padding: '20px 40px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'linear-gradient(to bottom, rgba(0,0,0,0.8) 0%, rgba(0,0,0,0) 100%)' }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                <Activity size={24} color="#fff" />
                <h1 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 700, letterSpacing: '2px' }}>ENVIRONMENTAL_MONITOR</h1>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', background: 'rgba(255,255,255,0.1)', padding: '8px 16px', borderRadius: '30px', backdropFilter: 'blur(10px)' }}>
                <Wifi size={16} color={isConnected ? "#10b981" : "#f43f5e"} />
                <span style={{ fontSize: '0.8rem', fontWeight: 600, color: isConnected ? "#10b981" : "#f43f5e" }}>
                  {isConnected ? 'NODE_CONNECTED' : 'DISCONNECTED'}
                </span>
              </div>
            </motion.header>
          )}
        </AnimatePresence>

        <div style={{ position: 'absolute', left: '40px', top: '50%', transform: 'translateY(-50%)', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <AnimatePresence>
            {showUI && (
              <>
                <MetricCard label="Temperature" value={latestData.temp} unit="°C" icon={<Thermometer size={20} color="#f59e0b" />} color="#f59e0b" dataKey="temp" history={dataHistory.map(d => ({ val: d.temp }))} />
                <MetricCard label="Humidity" value={latestData.hum} unit="%" icon={<Droplets size={20} color="#3b82f6" />} color="#3b82f6" dataKey="hum" history={dataHistory.map(d => ({ val: d.hum }))} />
                <MetricCard label="Proximity" value={latestData.dist} unit="cm" icon={<Gauge size={20} color="#10b981" />} color="#10b981" dataKey="dist" history={dataHistory.map(d => ({ val: d.dist }))} />
                <MetricCard label="Gas Concentration" value={latestData.gas} unit="ppm" icon={<Flame size={20} color="#f43f5e" />} color="#f43f5e" dataKey="gas" history={dataHistory.map(d => ({ val: d.gas }))} />
              </>
            )}
          </AnimatePresence>
        </div>

        <AnimatePresence>
          {showUI && (
            <motion.div
              initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }}
              style={{ position: 'absolute', bottom: '40px', left: '40px', fontFamily: 'monospace', fontSize: '0.75rem', color: '#10b981', opacity: 0.8 }}
            >
              {logs.map((log, i) => <div key={i} style={{ marginBottom: '4px', textShadow: '0 0 5px rgba(16,185,129,0.5)' }}>{log}</div>)}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ACTION BUTTONS */}
      <div style={{ position: 'absolute', bottom: '40px', right: '40px', zIndex: 20, display: 'flex', gap: '15px' }}>
        <button
          onClick={handleManualSpawn}
          style={{
            cursor: 'pointer', background: 'rgba(16, 185, 129, 0.2)', border: '1px solid rgba(16, 185, 129, 0.5)', padding: '12px', borderRadius: '50%',
            backdropFilter: 'blur(10px)', color: '#10b981', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s',
            boxShadow: '0 4px 15px rgba(16, 185, 129, 0.3)'
          }}
          title="Simulate Tripwire"
        >
          <UserPlus size={24} />
        </button>

        <button
          onClick={() => setShowUI(!showUI)}
          style={{
            cursor: 'pointer', background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', padding: '12px', borderRadius: '50%',
            backdropFilter: 'blur(10px)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s'
          }}
          title="Toggle HUD"
        >
          {showUI ? <EyeOff size={24} /> : <Eye size={24} />}
        </button>
      </div>
    </div>
  );
}