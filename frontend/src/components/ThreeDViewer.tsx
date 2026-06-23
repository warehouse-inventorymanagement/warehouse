import { Suspense, Component, ReactNode } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Environment, useGLTF, Center } from '@react-three/drei';
import { CubeIcon } from '@heroicons/react/24/outline';

function Model({ url }: { url: string }) {
  const { scene } = useGLTF(url);
  return (
    <Center>
      <primitive object={scene} />
    </Center>
  );
}

class ErrorBoundary extends Component<{ children: ReactNode }, { error: string | null }> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { error: null };
  }
  static getDerivedStateFromError(error: Error) {
    return { error: error.message };
  }
  render() {
    if (this.state.error) {
      return (
        <div className="flex flex-col items-center justify-center h-full gap-3" style={{ color: 'var(--text-secondary)' }}>
          <CubeIcon className="w-10 h-10 opacity-30" />
          <p className="text-sm">3D model could not be loaded</p>
          <p className="text-xs opacity-60 max-w-xs text-center">{this.state.error}</p>
        </div>
      );
    }
    return this.props.children;
  }
}

interface ThreeDViewerProps {
  modelUrl: string;
}

export default function ThreeDViewer({ modelUrl }: ThreeDViewerProps) {
  return (
    <div
      className="rounded-xl overflow-hidden relative"
      style={{ height: '400px', backgroundColor: 'var(--bg-secondary)' }}
    >
      <ErrorBoundary>
        <Canvas
          camera={{ position: [0, 0, 5], fov: 45 }}
          style={{ background: 'var(--bg-secondary)' }}
        >
          <Suspense fallback={null}>
            <ambientLight intensity={0.5} />
            <directionalLight position={[5, 5, 5]} intensity={1} />
            <Model url={modelUrl} />
            <OrbitControls
              enablePan={true}
              enableZoom={true}
              enableRotate={true}
              autoRotate
              autoRotateSpeed={2}
            />
            <Environment preset="studio" />
          </Suspense>
        </Canvas>
      </ErrorBoundary>
    </div>
  );
}
