import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/useAuth';
import { listGroups, type Group, ApiError } from '../lib/api';
import { CreateGroupModal } from '../components/CreateGroupModal';

export function DashboardPage() {
  const { user, logout } = useAuth();
  const [groups, setGroups] = useState<Group[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

const handleGroupCreated = (newGroup: Group) => {
  setGroups((prev) => [newGroup, ...prev]); // Add to top of list
};

  useEffect(() => {
    let cancelled = false;

    const fetchGroups = async () => {
      try {
        const data = await listGroups();
        if (!cancelled) {
          setGroups(data.groups);
          setError(null);
        }
      } catch (err) {
        if (cancelled) return;
        if (err instanceof ApiError) {
          setError(err.message);
        } else {
          setError('Failed to load groups');
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    fetchGroups();

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Header */}
      <header className="bg-gray-800 border-b border-gray-700">
        <div className="max-w-5xl mx-auto px-6 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-blue-500">SplitMate</h1>
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-400">{user?.name}</span>
            <button
              onClick={logout}
              className="px-3 py-1.5 text-sm bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-5xl mx-auto px-6 py-8">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-3xl font-bold">Your Groups</h2>
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg font-medium transition-colors"
            >
            + Create Group
          </button>
        </div>

        {/* Loading state */}
        {isLoading && (
          <div className="text-center py-12">
            <p className="text-gray-400">Loading groups...</p>
          </div>
        )}

        {/* Error state */}
        {!isLoading && error && (
          <div className="bg-red-900/50 border border-red-500 text-red-200 px-4 py-3 rounded-lg">
            ❌ {error}
          </div>
        )}

        {/* Empty state */}
        {!isLoading && !error && groups.length === 0 && (
          <div className="bg-gray-800 rounded-lg p-12 text-center">
            <p className="text-gray-400 text-lg mb-2">No groups yet</p>
            <p className="text-gray-500 text-sm">
              Create your first group to start splitting expenses with friends.
            </p>
          </div>
        )}

        {/* Groups grid */}
        {!isLoading && !error && groups.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {groups.map((group) => (
              <Link
                key={group.id}
                to={`/groups/${group.id}`}
                className="bg-gray-800 hover:bg-gray-750 border border-gray-700 hover:border-blue-500 rounded-lg p-6 transition-all"
              >
                <h3 className="text-xl font-semibold text-white mb-2">
                  {group.name}
                </h3>
                <p className="text-sm text-gray-400">
                  {group.memberIds.length}{' '}
                  {group.memberIds.length === 1 ? 'member' : 'members'}
                </p>
                <p className="text-xs text-gray-500 mt-3">
                  Created {new Date(group.createdAt).toLocaleDateString()}
                </p>
              </Link>
            ))}
          </div>
        )}
      </main>

      <CreateGroupModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onGroupCreated={handleGroupCreated}
      />
    </div>
  );
}