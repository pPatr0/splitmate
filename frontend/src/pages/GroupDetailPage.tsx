import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../context/useAuth';
import {
  getGroup,
  deleteGroup,
  ApiError,
  type Group,
  type GroupMember,
} from '../lib/api';
import { AddMemberModal } from '../components/AddMemberModal';

export function GroupDetailPage() {
  const { id: groupId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const [group, setGroup] = useState<Group | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAddMemberOpen, setIsAddMemberOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    if (!groupId) return;

    let cancelled = false;

    const fetchGroup = async () => {
      try {
        const data = await getGroup(groupId);
        if (!cancelled) {
          setGroup(data.group);
          setError(null);
        }
      } catch (err) {
        if (cancelled) return;
        if (err instanceof ApiError) {
          setError(err.message);
        } else {
          setError('Failed to load group');
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    fetchGroup();
    return () => {
      cancelled = true;
    };
  }, [groupId]);

  const handleDelete = async () => {
    if (!group) return;
    if (!confirm(`Delete group "${group.name}"? This action cannot be undone.`)) {
      return;
    }

    setIsDeleting(true);
    try {
      await deleteGroup(group.id);
      navigate('/');
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Failed to delete group';
      alert(message);
      setIsDeleting(false);
    }
  };

  const isOwner = group?.ownerId === user?.id;

  // memberIds is GroupMember[] from populated detail endpoint
  const members = (group?.memberIds ?? []) as GroupMember[];
  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Header */}
      <header className="bg-gray-800 border-b border-gray-700">
        <div className="max-w-5xl mx-auto px-6 py-4 flex justify-between items-center">
          <Link to="/" className="text-2xl font-bold text-blue-500 hover:text-blue-400">
            SplitMate
          </Link>
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

      <main className="max-w-5xl mx-auto px-6 py-8">
        {/* Back link */}
        <Link
          to="/"
          className="inline-flex items-center text-blue-400 hover:text-blue-300 text-sm mb-6"
        >
          ← Back to groups
        </Link>

        {/* Loading */}
        {isLoading && (
          <div className="text-center py-12">
            <p className="text-gray-400">Loading group...</p>
          </div>
        )}

        {/* Error */}
        {!isLoading && error && (
          <div className="bg-red-900/50 border border-red-500 text-red-200 px-4 py-3 rounded-lg">
            ❌ {error}
          </div>
        )}

        {/* Group content */}
        {!isLoading && !error && group && (
          <>
            {/* Title section */}
            <div className="flex justify-between items-start mb-8">
              <div>
                <h1 className="text-3xl font-bold mb-2">{group.name}</h1>
                <p className="text-sm text-gray-500">
                  Created {new Date(group.createdAt).toLocaleDateString()}
                </p>
              </div>
              {isOwner && (
                <button
                  onClick={handleDelete}
                  disabled={isDeleting}
                  className="px-3 py-1.5 text-sm text-red-400 hover:text-red-300 hover:bg-red-900/30 rounded-lg transition-colors disabled:opacity-50"
                >
                  {isDeleting ? 'Deleting...' : 'Delete group'}
                </button>
              )}
            </div>

            {/* Members section */}
            <section className="bg-gray-800 rounded-lg p-6 mb-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold">
                  Members ({members.length})
                </h2>
                <button
                  onClick={() => setIsAddMemberOpen(true)}
                  className="px-3 py-1.5 text-sm bg-blue-600 hover:bg-blue-700 rounded-lg font-medium transition-colors"
                >
                  + Add member
                </button>
              </div>

              <ul className="divide-y divide-gray-700">
                {members.map((member) => (
                  <li key={member.id} className="py-3 flex justify-between items-center">
                    <div>
                      <p className="font-medium text-white">
                        {member.name}
                        {member.id === group.ownerId && (
                          <span className="ml-2 text-xs bg-blue-900 text-blue-300 px-2 py-0.5 rounded">
                            Owner
                          </span>
                        )}
                        {member.id === user?.id && (
                          <span className="ml-2 text-xs bg-gray-700 text-gray-300 px-2 py-0.5 rounded">
                            You
                          </span>
                        )}
                      </p>
                      <p className="text-sm text-gray-400">{member.email}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </section>

            {/* Expenses placeholder */}
            <section className="bg-gray-800 rounded-lg p-6">
              <h2 className="text-xl font-bold mb-4">Expenses</h2>
              <div className="text-center py-8">
                <p className="text-gray-400 mb-2">No expenses yet</p>
                <p className="text-sm text-gray-500">
                  Expense tracking is coming soon. Stay tuned!
                </p>
              </div>
            </section>

            {/* Add member modal */}
            <AddMemberModal
              isOpen={isAddMemberOpen}
              onClose={() => setIsAddMemberOpen(false)}
              groupId={group.id}
              onMemberAdded={(updatedGroup) => setGroup(updatedGroup)}
            />
          </>
        )}
      </main>
    </div>
  );
}