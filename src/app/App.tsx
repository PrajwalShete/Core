import { Route, Routes } from 'react-router-dom';
import { Gate } from '@/features/auth/Gate';
import { Dashboard } from '@/features/tasks/components/Dashboard';

export function App() {
  return (
    <Gate>
      <Routes>
        <Route path="/" element={<Dashboard />} />
      </Routes>
    </Gate>
  );
}
