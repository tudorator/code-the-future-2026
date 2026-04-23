import { useEffect, useState } from 'react'
import { io } from 'socket.io-client'
import { Canvas } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'

const socket = io('http://10.88.51.8:5000'); // Use your actual IP

export default function App() {
  const [data, setData] = useState({ humidity: 0, gas_ppm: 0, distance_cm: 0 });

  useEffect(() => {
    socket.on('sensor_update', (newValues) => {
      setData(newValues);
    });
  }, []);

  return (
    <div style={{ width: '100vw', height: '100vh', background: '#111', color: 'white' }}>
      {/* HUD */}
      <div style={{ position: 'absolute', zIndex: 10, padding: '20px' }}>
        <h1>Sensor Dashboard</h1>
        <p>Humidity: {data.humidity}%</p>
        <p>Gas: {data.gas_ppm} ppm</p>
        <p>Distance: {data.distance_cm} cm</p>
      </div>

      {/* 3D Visual */}
      <Canvas>
        <ambientLight />
        <mesh scale={data.gas_ppm > 400 ? 2 : 1}>
          <boxGeometry />
          <meshStandardMaterial color={data.gas_ppm > 400 ? "red" : "cyan"} />
        </mesh>
        <OrbitControls />
      </Canvas>
    </div>
  )
}