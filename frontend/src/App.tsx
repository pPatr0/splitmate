import { useEffect, useState } from 'react';
import { fetchHealth, type HealthResponse } from './lib/api';
import './App.css';

function App() {
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchHealth()
      .then((data) => {
        setHealth(data);
        setError(null);
      })
      .catch((err: Error) => {
        setError(err.message);
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  return (
    <div style={{ padding: '2rem', fontFamily: 'system-ui, sans-serif' }}>
      <h1>SplitMate</h1>
      <p>Expense splitter for friend groups</p>

      <h2>Backend Connection Status</h2>

      {loading && <p>⏳ Connecting to backend...</p>}

      {error && (
        <div style={{ color: 'red', padding: '1rem', border: '1px solid red' }}>
          ❌ Error: {error}
        </div>
      )}

      {health && (
        <div style={{ color: 'green', padding: '1rem', border: '1px solid green' }}>
          ✅ Backend connected
          <pre>{JSON.stringify(health, null, 2)}</pre>
        </div>
      )}
    </div>
  );
}

export default App;
