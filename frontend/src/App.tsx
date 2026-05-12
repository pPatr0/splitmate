import { useEffect, useState } from 'react';
import { fetchHealth, type HealthResponse } from './lib/api';
import { useAuth } from './context/useAuth';

function App() {
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const { user, isLoading } = useAuth();

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
    <h1 className="text-4xl font-bold text-blue-600">SplitMate</h1>
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
      {/* Auth Context Debug - dočasné, později odstraníme */}
        <div className="mt-8 p-4 border border-purple-500 rounded">
          <h2 className="text-xl font-bold text-purple-400">Auth Context Debug</h2>
          {isLoading && <p className="text-yellow-400">⏳ Loading session...</p>}
          {!isLoading && !user && <p className="text-gray-400">Not authenticated</p>}
          {!isLoading && user && (
            <pre className="text-green-400">
              Authenticated as: {JSON.stringify(user, null, 2)}
            </pre>
          )}
        </div>
    </div>
  );
}


export default App;
