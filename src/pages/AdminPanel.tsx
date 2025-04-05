import React, { useEffect, useState } from 'react';
import { collection, getDocs, doc, updateDoc, query, where } from 'firebase/firestore';
import { getAuth, sendPasswordResetEmail } from 'firebase/auth';
import { db } from '@/lib/firebase';
import { useAuth } from '@/contexts/AuthContext';
import { Shield, UserCog, Lock, AlertTriangle, ArrowLeft, Bell } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import type { User } from '@/types';

export default function AdminPanel() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const { currentUser } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const usersRef = collection(db, 'users');
        const q = query(usersRef, where('uid', '!=', currentUser?.uid)); // Exclude current admin
        const querySnapshot = await getDocs(q);
        const usersData = querySnapshot.docs.map(doc => ({ ...doc.data() } as User));
        setUsers(usersData);
      } catch (err) {
        setError('Error fetching users');
        console.error('Error fetching users:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchUsers();
  }, [currentUser]);

  const handleRoleToggle = async (user: User) => {
    try {
      setError('');
      setSuccess('');
      const userRef = doc(db, 'users', user.uid);
      const newRole = user.role === 'admin' ? 'user' : 'admin';
      await updateDoc(userRef, { role: newRole });
      
      setUsers(users.map(u => 
        u.uid === user.uid ? { ...u, role: newRole } : u
      ));
      setSuccess(`User ${user.boatName} role updated successfully`);
    } catch (err) {
      setError('Failed to update user role');
      console.error('Error updating role:', err);
    }
  };

  const handleBlockToggle = async (user: User) => {
    try {
      setError('');
      setSuccess('');
      const userRef = doc(db, 'users', user.uid);
      await updateDoc(userRef, { isBlocked: !user.isBlocked });
      
      setUsers(users.map(u => 
        u.uid === user.uid ? { ...u, isBlocked: !u.isBlocked } : u
      ));
      setSuccess(`User ${user.boatName} ${user.isBlocked ? 'unblocked' : 'blocked'} successfully`);
    } catch (err) {
      setError('Failed to update user status');
      console.error('Error updating block status:', err);
    }
  };

  const handleResetPassword = async (user: User) => {
    try {
      setError('');
      setSuccess('');
      const auth = getAuth();
      await sendPasswordResetEmail(auth, user.email);
      setSuccess(`Password reset email sent to ${user.email}`);
    } catch (err) {
      setError('Failed to send password reset email');
      console.error('Error resetting password:', err);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-blue-600 text-white">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/')}
              className="p-2 hover:bg-blue-700 rounded-full transition-colors"
              aria-label="Torna alla dashboard"
            >
              <ArrowLeft className="w-6 h-6" />
            </button>
            <div className="flex items-center gap-2">
              <Shield className="w-8 h-8" />
              <h1 className="text-2xl font-bold">Pannello Amministratore</h1>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Admin Actions */}
        <div className="mb-8 grid grid-cols-1 md:grid-cols-2 gap-4">
          <button
            onClick={() => navigate('/admin/alerts')}
            className="flex items-center justify-center gap-2 p-4 bg-white rounded-lg shadow-md hover:bg-gray-50 transition-colors"
          >
            <Bell className="w-6 h-6 text-blue-600" />
            <span className="text-lg font-medium">Gestione Avvisi</span>
          </button>
        </div>

        {/* Status Messages */}
        {error && (
          <div className="mb-4 p-4 bg-red-50 border-l-4 border-red-400 text-red-700">
            <div className="flex">
              <AlertTriangle className="h-5 w-5 mr-2" />
              <span>{error}</span>
            </div>
          </div>
        )}
        {success && (
          <div className="mb-4 p-4 bg-green-50 border-l-4 border-green-400 text-green-700">
            <span>{success}</span>
          </div>
        )}

        {/* Users Table */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="px-4 py-5 sm:px-6">
            <h2 className="text-lg font-medium text-gray-900">Gestione Utenti</h2>
            <p className="mt-1 text-sm text-gray-500">
              Gestisci i ruoli e lo stato degli utenti registrati
            </p>
          </div>
          <div className="border-t border-gray-200">
            {loading ? (
              <div className="p-4 text-center text-gray-500">Caricamento utenti...</div>
            ) : users.length === 0 ? (
              <div className="p-4 text-center text-gray-500">Nessun utente trovato</div>
            ) : (
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Utente
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Ruolo
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Stato
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Azioni
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {users.map((user) => (
                    <tr key={user.uid}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div>
                            <div className="text-sm font-medium text-gray-900">
                              {user.boatName}
                            </div>
                            <div className="text-sm text-gray-500">
                              {user.isSkipper ? `Skipper: ${user.skipperFirstName} ${user.skipperLastName}` : 'No Skipper'}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          user.role === 'admin' 
                            ? 'bg-purple-100 text-purple-800' 
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          {user.role === 'admin' ? 'Admin' : 'User'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          user.isBlocked
                            ? 'bg-red-100 text-red-800'
                            : 'bg-green-100 text-green-800'
                        }`}>
                          {user.isBlocked ? 'Bloccato' : 'Attivo'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex space-x-2">
                          <button
                            onClick={() => handleRoleToggle(user)}
                            className="flex items-center px-3 py-1 bg-purple-100 text-purple-700 rounded-md hover:bg-purple-200"
                          >
                            <UserCog className="w-4 h-4 mr-1" />
                            {user.role === 'admin' ? 'Rimuovi Admin' : 'Promuovi Admin'}
                          </button>
                          <button
                            onClick={() => handleBlockToggle(user)}
                            className={`flex items-center px-3 py-1 rounded-md ${
                              user.isBlocked
                                ? 'bg-green-100 text-green-700 hover:bg-green-200'
                                : 'bg-red-100 text-red-700 hover:bg-red-200'
                            }`}
                          >
                            <Shield className="w-4 h-4 mr-1" />
                            {user.isBlocked ? 'Sblocca' : 'Blocca'}
                          </button>
                          <button
                            onClick={() => handleResetPassword(user)}
                            className="flex items-center px-3 py-1 bg-blue-100 text-blue-700 rounded-md hover:bg-blue-200"
                          >
                            <Lock className="w-4 h-4 mr-1" />
                            Reset Password
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}