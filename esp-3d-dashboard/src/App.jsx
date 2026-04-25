import { useEffect, useState, useRef } from 'react'
import { io } from 'socket.io-client'
import { Canvas, useFrame } from '@react-three/fiber'
import { FlyControls, Splat } from '@react-three/drei'
import { motion, AnimatePresence } from 'framer-motion'
import { Droplets, Flame, Activity, Wifi, EyeOff, Eye, UserPlus, Thermometer, Settings2 } from 'lucide-react'
import { AreaChart, Area, ResponsiveContainer, YAxis } from 'recharts'
import * as THREE from 'three'

// 🚨 UPDATE THIS TO YOUR LAPTOP'S IP ADDRESS 🚨
const PYTHON_SERVER_URL = 'http://192.168.X.X:5000'; 

const FLOOR_LEVEL = -1; 
const ENTRANCE_POS = [9.61, FLOOR_LEVEL, -0.29]; 

const WALK_PATH = [
  [9.61, -0.29],   
  [2.56, -0.29],   
  [-6.61, -0.05]   
];

const ProceduralHumanoid = ({ id, startPos, activeTemp, gasLevel, onDespawn }) => {
  const groupRef = useRef()
  const materialRef = useRef()
  const leftLegRef = useRef(); const rightLegRef = useRef()
  const leftArmRef = useRef(); const rightArmRef = useRef()
  const waypointIdx = useRef(0) 
  
  let targetColor = '#10b981' 
  if (activeTemp <= 10) targetColor = '#e0f2fe' 
  else if (activeTemp <= 18) targetColor = '#3b82f6' 
  else if (activeTemp >= 32) targetColor = '#9f1239' 
  else if (activeTemp >= 28) targetColor = '#ef4444' 

  const isPanic = gasLevel > 1500; 

  useFrame(({ clock }, delta) => {
    if (!groupRef.current || !materialRef.current) return;
    materialRef.current.color.lerp(new THREE.Color(targetColor), 0.05);

    const currentX = groupRef.current.position.x;
    const currentZ = groupRef.current.position.z;
    const targetX = WALK_PATH[waypointIdx.current][0];
    const targetZ = WALK_PATH[waypointIdx.current][1];
    const dx = targetX - currentX;
    const dz = targetZ - currentZ;
    const distance = Math.sqrt(dx * dx + dz * dz);

    let speed = 0;
    if (distance < 0.2) {
      if (waypointIdx.current < WALK_PATH.length - 1) waypointIdx.current++; 
      else if (typeof onDespawn === 'function') onDespawn(id); 
    } else {
      speed = isPanic ? 2.5 : 0.8; 
      groupRef.current.position.x += (dx / distance) * speed * delta;
      groupRef.current.position.z += (dz / distance) * speed * delta;
      groupRef.current.rotation.y = Math.atan2(dx, dz);
    }

    const walkCycle = speed > 0 ? Math.sin(clock.getElapsedTime() * (isPanic ? 15 : 8)) : 0; 
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

const Sparkline = ({ data, color, dataKey }) => (
  <div style={{ height: '45px', width: '100%', marginTop: '8px' }}>
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={data}>
        <defs>
          <linearGradient id={`color${dataKey}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={color} stopOpacity={0.4}/>
            <stop offset="95%" stopColor={color} stopOpacity={0}/>
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
      padding: '16px 20px', borderRadius: '20px', 
      border: `1px solid ${value > 1500 && label === 'Gas Concentration' ? 'rgba(244, 63, 94, 0.5)' : 'rgba(255, 255, 255, 0.08)'}`,
      width: '260px', boxShadow: '0 10px 30px rgba(0,0,0,0.4)'
    }}
  >
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
      <span style={{ opacity: 0.5, fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '1px' }}>{label}</span>
      <div style={{ padding: '6px', background: `rgba(${color === '#f43f5e' ? '244, 63, 94' : color === '#10b981' ? '16, 185, 129' : '59, 130, 246'}, 0.1)`, borderRadius: '10px' }}>
        {icon}
      </div>
    </div>
    <div style={{ fontSize: '2rem', fontWeight: 800, textShadow: '0 2px 10px rgba(0,0,0,0.5)', whiteSpace: 'nowrap' }}>
      {value}<span style={{ fontSize: '1rem', opacity: 0.4, marginLeft: '6px', fontWeight: 500 }}>{unit}</span>
    </div>
    <Sparkline data={history} color={color} dataKey={dataKey} />
  </motion.div>
)

export default function App() {
  const [dataHistory, setDataHistory] = useState([])
  const [isConnected, setIsConnected] = useState(false)
  const [showUI, setShowUI] = useState(true)
  
  const [visitors, setVisitors] = useState([])
  const isTripped = useRef(false)
  const lastSpawnTime = useRef(0) 
  const SPAWN_COOLDOWN = 2000 // Preserved the 2000ms fix!
  
  const [tempOverride, setTempOverride] = useState(null); 
  const overrideRef = useRef(null); 

  useEffect(() => { overrideRef.current = tempOverride; }, [tempOverride]);

  useEffect(() => {
    const socket = io(PYTHON_SERVER_URL, { transports: ['polling', 'websocket'] });

    socket.on('connect', () => setIsConnected(true));
    socket.on('disconnect', () => setIsConnected(false));
    
    socket.on('sensor_update', (newData) => {
      const dist = newData.distance_cm;
      const gas = newData.gas_ppm;
      const hum = newData.humidity || 0;
      const temp = overrideRef.current !== null ? overrideRef.current : (newData.temperature || 0); 

      // Tripwire Logic with Cooldown and 5cm Blindspot
      if (dist > 5 && dist < 80) {
        const now = Date.now();
        if (!isTripped.current && (now - lastSpawnTime.current > SPAWN_COOLDOWN)) {
          isTripped.current = true; 
          lastSpawnTime.current = now; 
          setVisitors(prev => [...prev, { id: Math.random(), pos: ENTRANCE_POS }]);
        }
      } else if (dist >= 80 || dist < 0) {
        isTripped.current = false; 
      }

      setDataHistory(prev => {
        const updated = [...prev, { gas: gas, hum: hum, temp: temp, time: Date.now() }];
        return updated.slice(-20); 
      });
    });

    return () => socket.disconnect();
  }, []);

  const handleDespawn = (idToRemove) => setVisitors(prev => prev.filter(v => v.id !== idToRemove));
  const handleManualSpawn = () => setVisitors(prev => [...prev, { id: Math.random(), pos: ENTRANCE_POS }]);

  const latestData = dataHistory.length > 0 
    ? { gas: dataHistory[dataHistory.length - 1].gas, hum: dataHistory[dataHistory.length - 1].hum, temp: dataHistory[dataHistory.length - 1].temp }
    : { gas: 0, hum: 0, temp: 0 };

  const tempButtons = [
    { label: 'Auto', val: null, bg: 'rgba(255,255,255,0.1)', color: '#fff' },
    { label: 'Ex. Cold', val: 2, bg: 'rgba(224, 242, 254, 0.2)', color: '#e0f2fe' },
    { label: 'Cold', val: 14, bg: 'rgba(59, 130, 246, 0.2)', color: '#3b82f6' },
    { label: 'Optimal', val: 23, bg: 'rgba(16, 185, 129, 0.2)', color: '#10b981' },
    { label: 'Hot', val: 28, bg: 'rgba(239, 68, 68, 0.2)', color: '#ef4444' },
    { label: 'Ex. Hot', val: 32, bg: 'rgba(159, 18, 57, 0.2)', color: '#9f1239' }
  ];

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: '#000', overflow: 'hidden', color: '#fff', fontFamily: 'Inter, system-ui, sans-serif' }}>
      
      {/* 3D CANVAS */}
      <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', zIndex: 0 }}>
        {/* Preserved your custom camera angle! */}
        <Canvas camera={{ position: [-4, 1.5, -0.05], rotation: [0, 300, 0], fov: 65 }}>
          <ambientLight intensity={0.6} />
          <directionalLight position={[10, 10, 5]} intensity={1.5} />
          <Splat src="/garden.splat" position={[0, -1, 0]} />
          
          {visitors.map(visitor => (
            <ProceduralHumanoid key={visitor.id} id={visitor.id} startPos={visitor.pos} activeTemp={latestData.temp} gasLevel={latestData.gas} onDespawn={handleDespawn} />
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
                <h1 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 700, letterSpacing: '2px' }}>SPLATSCAPE_MONITOR</h1>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', background: 'rgba(255,255,255,0.1)', padding: '8px 16px', borderRadius: '30px', backdropFilter: 'blur(10px)' }}>
                <Wifi size={16} color={isConnected ? "#10b981" : "#f43f5e"} />
                <span style={{ fontSize: '0.8rem', fontWeight: 600, color: isConnected ? "#10b981" : "#f43f5e" }}>
                  {isConnected ? 'SERVER_CONNECTED' : 'DISCONNECTED'}
                </span>
              </div>
            </motion.header>
          )}
        </AnimatePresence>

        <div style={{ position: 'absolute', left: '40px', top: '50%', transform: 'translateY(-50%)', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <AnimatePresence>
            {showUI && (
              <>
                <MetricCard label="Temperature" value={latestData.temp} unit="°C" icon={<Thermometer size={20} color={tempOverride === null ? "#f59e0b" : "#fff"}/>} color={tempOverride === null ? "#f59e0b" : "#fff"} dataKey="temp" history={dataHistory.map(d => ({val: d.temp}))} />
                <MetricCard label="Humidity" value={latestData.hum} unit="%" icon={<Droplets size={20} color="#3b82f6"/>} color="#3b82f6" dataKey="hum" history={dataHistory.map(d => ({val: d.hum}))} />
                <MetricCard label="Gas Concentration" value={latestData.gas} unit="ppm" icon={<Flame size={20} color={latestData.gas > 1500 ? "#ef4444" : "#f43f5e"}/>} color={latestData.gas > 1500 ? "#ef4444" : "#f43f5e"} dataKey="gas" history={dataHistory.map(d => ({val: d.gas}))} />
              </>
            )}
          </AnimatePresence>
        </div>

        <AnimatePresence>
          {showUI && (
            <motion.div 
              initial={{ opacity: 0, y: 50 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 50 }}
              style={{ position: 'absolute', bottom: '40px', left: '50%', transform: 'translateX(-50%)', display: 'flex', gap: '10px', background: 'rgba(15,15,15,0.6)', padding: '12px 20px', borderRadius: '100px', backdropFilter: 'blur(20px)', border: '1px solid rgba(255,255,255,0.1)', pointerEvents: 'auto' }}
            >
              <div style={{ display: 'flex', alignItems: 'center', marginRight: '10px', opacity: 0.6 }}>
                <Settings2 size={18} style={{ marginRight: '8px' }}/> <span style={{ fontSize: '0.8rem', fontWeight: 600, textTransform: 'uppercase' }}>Simulate</span>
              </div>
              {tempButtons.map((btn, i) => (
                <button
                  key={i}
                  onClick={() => setTempOverride(btn.val)}
                  style={{ cursor: 'pointer', background: tempOverride === btn.val ? btn.bg : 'transparent', color: tempOverride === btn.val ? btn.color : '#888', border: `1px solid ${tempOverride === btn.val ? btn.color : 'rgba(255,255,255,0.1)'}`, padding: '6px 16px', borderRadius: '20px', fontSize: '0.8rem', fontWeight: 600, transition: 'all 0.2s ease', outline: 'none' }}
                >
                  {btn.label}
                </button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div style={{ position: 'absolute', bottom: '40px', right: '40px', zIndex: 20, display: 'flex', gap: '15px' }}>
        <button onClick={handleManualSpawn} style={{ cursor: 'pointer', background: 'rgba(16, 185, 129, 0.2)', border: '1px solid rgba(16, 185, 129, 0.5)', padding: '12px', borderRadius: '50%', backdropFilter: 'blur(10px)', color: '#10b981', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s', boxShadow: '0 4px 15px rgba(16, 185, 129, 0.3)', pointerEvents: 'auto' }}><UserPlus size={24} /></button>
        <button onClick={() => setShowUI(!showUI)} style={{ cursor: 'pointer', background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', padding: '12px', borderRadius: '50%', backdropFilter: 'blur(10px)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s', pointerEvents: 'auto' }}>{showUI ? <EyeOff size={24} /> : <Eye size={24} />}</button>
      </div>
    </div>
  );
}