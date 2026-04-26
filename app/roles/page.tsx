'use client';

import { useState, useEffect } from 'react';
import ProtectedRoute from '@/components/ProtectedRoute';
import Layout from '@/components/Layout';
import PageHeader from '@/components/PageHeader';
import GlassCard from '@/components/GlassCard';
import Button from '@/components/Button';
import Input from '@/components/Input';
import Select from '@/components/Select';
import LoadingSpinner from '@/components/LoadingSpinner';
import { Plus, UserCog, Shield, Users as UsersIcon } from 'lucide-react';
import { apiUrl } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';

const roleOptions = [
  { value: 'owner', label: 'Owner' },
  { value: 'admin', label: 'Admin' },
  { value: 'field_officer', label: 'Field Officer' },
];

const roleIcons: { [key: string]: typeof UserCog } = {
  owner: Shield,
  admin: UserCog,
  field_officer: UsersIcon,
};

type UserRow = {
  id: string;
  name: string;
  role: string;
  phone?: string;
  email?: string;
  createdAt?: string;
  created_at?: string;
};

export default function RolesPage() {
  const { token } = useAuth();
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newUser, setNewUser] = useState({
    name: '',
    role: 'admin',
    phone: '',
    email: '',
    password: '',
  });

  useEffect(() => {
    // eslint-disable-next-line react-hooks/immutability
    void fetchUsers();
  }, []);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const response = await fetch(apiUrl('/users'), {
        headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      });
      const data = await response.json();
      setUsers(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Failed to fetch users:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await fetch(apiUrl('/users'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify(newUser),
      });

      if (response.ok) {
        setShowAddModal(false);
        setNewUser({
          name: '',
          role: 'admin',
          phone: '',
          email: '',
          password: '',
        });
        void fetchUsers();
      }
    } catch (error) {
      console.error('Failed to create user:', error);
    }
  };

  if (loading) {
    return (
      <ProtectedRoute allowedRoles={['owner']}>
        <Layout>
          <LoadingSpinner />
        </Layout>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute allowedRoles={['owner']}>
      <Layout>
      <PageHeader
        title="Roles"
        subtitle="User accounts: Owner, Admin, Field Officer."
        badges={[
          { label: `${users.length} users`, variant: 'slate' },
          { label: 'Access', variant: 'green' },
        ]}
        actions={
          <Button type="button" onClick={() => setShowAddModal(true)}>
            <Plus className="h-4 w-4" />
            Add user
          </Button>
        }
      />

      <GlassCard className="overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/80">
                <th className="px-4 py-3 font-medium text-slate-600">User</th>
                <th className="px-4 py-3 font-medium text-slate-600">Role</th>
                <th className="px-4 py-3 font-medium text-slate-600">Contact</th>
                <th className="px-4 py-3 font-medium text-slate-600">Added</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => {
                const RoleIcon = roleIcons[user.role] || UserCog;
                const added = user.created_at || user.createdAt;
                return (
                  <tr key={user.id} className="border-b border-slate-100 hover:bg-slate-50/60">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-slate-600">
                          <RoleIcon className="h-4 w-4" />
                        </div>
                        <span className="font-medium text-slate-900">{user.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 capitalize text-slate-700">
                      {user.role.replace('_', ' ')}
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      <div className="text-xs">{user.email || '—'}</div>
                      <div className="text-xs text-slate-500">{user.phone || ''}</div>
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {added ? new Date(added).toLocaleDateString() : '—'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {users.length === 0 && (
          <p className="p-8 text-center text-sm text-slate-500">No users yet.</p>
        )}
      </GlassCard>

      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/25 p-4 backdrop-blur-[2px]">
          <GlassCard className="w-full max-w-md p-6 shadow-lg">
            <h2 className="text-lg font-semibold text-slate-900">New user</h2>
            <form onSubmit={handleCreateUser} className="mt-4 space-y-4">
              <Input
                label="Full name"
                value={newUser.name}
                onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
                required
              />
              <Select
                label="Role"
                options={roleOptions}
                value={newUser.role}
                onChange={(e) => setNewUser({ ...newUser, role: e.target.value })}
                required
              />
              <Input
                label="Email"
                type="email"
                value={newUser.email}
                onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                required
              />
              <Input
                label="Phone"
                value={newUser.phone}
                onChange={(e) => setNewUser({ ...newUser, phone: e.target.value })}
              />
              <Input
                label="Password"
                type="password"
                value={newUser.password}
                onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                required
              />
              <div className="flex gap-2 pt-2">
                <Button type="submit" className="flex-1">
                  Create
                </Button>
                <Button type="button" variant="secondary" onClick={() => setShowAddModal(false)}>
                  Cancel
                </Button>
              </div>
            </form>
          </GlassCard>
        </div>
      )}
    </Layout>
    </ProtectedRoute>
  );
}
