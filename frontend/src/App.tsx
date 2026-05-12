import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/useAuth';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';

function HomePage() {
  const { user, logout } = useAuth();

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <div className="max-w-4xl mx-auto">
        <header className="flex justify-between items-center mb-8">
          <h1 className="text-4xl font-bold text-blue-500">SplitMate</h1>
          <button
            onClick={logout}
            className="px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg text-gray-300 transition-colors"
          >
            Logout
          </button>
        </header>

        <div className="bg-gray-800 rounded-lg p-6">
          <h2 className="text-2xl font-bold mb-4">Welcome back, {user?.name}!</h2>
          <p className="text-gray-400">
            Your dashboard is coming soon. Groups and expenses will be here.
          </p>

          <div className="mt-6 p-4 bg-gray-900 rounded">
            <p className="text-sm text-gray-500">Logged in as:</p>
            <p className="text-gray-300">{user?.email}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function AppRoutes() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900">
        <p className="text-gray-400">Loading...</p>
      </div>
    );
  }

  return (
    <Routes>
      <Route
        path="/login"
        element={user ? <Navigate to="/" replace /> : <LoginPage />}
      />
      <Route
        path="/register"
        element={user ? <Navigate to="/" replace /> : <RegisterPage />}
      />
      <Route
        path="/"
        element={user ? <HomePage /> : <Navigate to="/login" replace />}
      />
    </Routes>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AppRoutes />
    </BrowserRouter>
  );
}

export default App;