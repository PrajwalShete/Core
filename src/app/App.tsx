import { useState } from 'react';
import { Route, Routes } from 'react-router-dom';
import { Gate } from '@/features/auth/Gate';
import { Boot } from '@/features/boot/Boot';
import { Dashboard } from '@/features/tasks/components/Dashboard';
import { useSoundBus } from '@/shared/hooks/useSoundBus';
import { emit } from '@/shared/lib/events';

export function App() {
  // Mount the global sound bus once.
  useSoundBus();

  // Boot only runs once per session — after first unlock, subsequent
  // re-renders of <App> (HMR, etc.) skip the sequence.
  const [booted, setBooted] = useState(false);

  return (
    <Gate>
      {!booted && (
        <Boot
          onDone={() => {
            setBooted(true);
            emit('play-sound', { kind: 'boot' });
          }}
        />
      )}
      <Routes>
        <Route path="/" element={<Dashboard />} />
      </Routes>
    </Gate>
  );
}
