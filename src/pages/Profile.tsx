import React, { useState } from 'react';
import { doc, updateDoc } from 'firebase/firestore';
import { updatePassword } from 'firebase/auth';
import { useAuth } from '@/contexts/AuthContext';
import { db } from '@/lib/firebase';
import { User, Ship, KeyRound, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import type { BoatType } from '@/types';

export default function Profile() {
  const { currentUser, userData } = useAuth();
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const [profileData, setProfileData] = useState({
    boatName: userData?.boatName || '',
    boatType: userData?.boatType || 'sail' as BoatType,
    isSkipper: userData?.isSkipper || false,
    skipperFirstName: userData?.skipperFirstName || '',
    skipperLastName: userData?.skipperLastName || '',
    phone: userData?.phone || '',
  });

  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  const handleProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;

    setError('');
    setSuccess('');
    setLoading(true);

    try {
      const userRef = doc(db, 'users', currentUser.uid);
      await updateDoc(userRef, profileData);
      setSuccess('Profilo aggiornato con successo!');
      setIsEditingProfile(false);
    } catch (err) {
      setError('Errore durante l\'aggiornamento del profilo');
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;

    setError('');
    setSuccess('');
    setLoading(true);

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setError('Le password non corrispondono');
      setLoading(false);
      return;
    }

    try {
      await updatePassword(currentUser, passwordData.newPassword);
      setSuccess('Password aggiornata con successo!');
      setIsChangingPassword(false);
      setPasswordData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      });
    } catch (err) {
      setError('Errore durante l\'aggiornamento della password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-lg shadow-lg overflow-hidden">
          <div className="p-6">
            <div className="flex items-center space-x-3 mb-6">
              <button
                onClick={() => navigate('/')}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                aria-label="Torna alla dashboard"
              >
                <ArrowLeft className="w-6 h-6" />
              </button>
              <User className="w-8 h-8 text-blue-600" />
              <h1 className="text-2xl font-bold text-gray-900">Profilo di {userData?.boatName}</h1>
            </div>

            {(error || success) && (
              <div className={`p-4 rounded-md mb-6 ${error ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'}`}>
                {error || success}
              </div>
            )}

            {/* Profile Information */}
            <div className="space-y-6">
              {!isEditingProfile ? (
                <div className="border rounded-lg p-6">
                  <h2 className="text-xl font-semibold mb-4 flex items-center">
                    <Ship className="w-5 h-5 mr-2" />
                    Informazioni Imbarcazione
                  </h2>
                  <dl className="grid grid-cols-1 gap-4">
                    <div className="sm:grid sm:grid-cols-3 sm:gap-4">
                      <dt className="text-sm font-medium text-gray-500">Nome Barca:</dt>
                      <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">{userData?.boatName}</dd>
                    </div>
                    <div className="sm:grid sm:grid-cols-3 sm:gap-4">
                      <dt className="text-sm font-medium text-gray-500">Tipo Barca:</dt>
                      <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                        {userData?.boatType === 'sail' ? 'Vela' : 'Motore'}
                      </dd>
                    </div>
                    <div className="sm:grid sm:grid-cols-3 sm:gap-4">
                      <dt className="text-sm font-medium text-gray-500">Skipper:</dt>
                      <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                        {userData?.isSkipper ? `${userData.skipperFirstName} ${userData.skipperLastName}` : 'No'}
                      </dd>
                    </div>
                    <div className="sm:grid sm:grid-cols-3 sm:gap-4">
                      <dt className="text-sm font-medium text-gray-500">Telefono:</dt>
                      <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">{userData?.phone}</dd>
                    </div>
                  </dl>
                  <button
                    onClick={() => setIsEditingProfile(true)}
                    className="mt-6 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                  >
                    Modifica Profilo
                  </button>
                </div>
              ) : (
                <form onSubmit={handleProfileUpdate} className="border rounded-lg p-6">
                  <h2 className="text-xl font-semibold mb-4">Modifica Profilo</h2>
                  <div className="space-y-4">
                    <div>
                      <label htmlFor="boatName" className="block text-sm font-medium text-gray-700">
                        Nome Barca
                      </label>
                      <input
                        type="text"
                        id="boatName"
                        value={profileData.boatName}
                        onChange={(e) => setProfileData({ ...profileData, boatName: e.target.value })}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label htmlFor="boatType" className="block text-sm font-medium text-gray-700">
                        Tipo Barca
                      </label>
                      <select
                        id="boatType"
                        value={profileData.boatType}
                        onChange={(e) => setProfileData({ ...profileData, boatType: e.target.value as BoatType })}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                      >
                        <option value="sail">Vela</option>
                        <option value="motor">Motore</option>
                      </select>
                    </div>
                    <div className="space-y-4">
                      <div className="flex items-center">
                        <input
                          type="checkbox"
                          id="isSkipper"
                          checked={profileData.isSkipper}
                          onChange={(e) => setProfileData({ ...profileData, isSkipper: e.target.checked })}
                          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                        />
                        <label htmlFor="isSkipper" className="ml-2 block text-sm text-gray-900">
                          Sono uno skipper
                        </label>
                      </div>
                      {profileData.isSkipper && (
                        <div className="ml-6 space-y-4">
                          <div>
                            <label htmlFor="skipperFirstName" className="block text-sm font-medium text-gray-700">
                              Nome Skipper
                            </label>
                            <input
                              type="text"
                              id="skipperFirstName"
                              value={profileData.skipperFirstName}
                              onChange={(e) => setProfileData({ ...profileData, skipperFirstName: e.target.value })}
                              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                            />
                          </div>
                          <div>
                            <label htmlFor="skipperLastName" className="block text-sm font-medium text-gray-700">
                              Cognome Skipper
                            </label>
                            <input
                              type="text"
                              id="skipperLastName"
                              value={profileData.skipperLastName}
                              onChange={(e) => setProfileData({ ...profileData, skipperLastName: e.target.value })}
                              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                            />
                          </div>
                        </div>
                      )}
                    </div>
                    <div>
                      <label htmlFor="phone" className="block text-sm font-medium text-gray-700">
                        Telefono
                      </label>
                      <input
                        type="tel"
                        id="phone"
                        value={profileData.phone}
                        onChange={(e) => setProfileData({ ...profileData, phone: e.target.value })}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                  <div className="mt-6 flex space-x-3">
                    <button
                      type="submit"
                      disabled={loading}
                      className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                    >
                      {loading ? 'Salvataggio...' : 'Salva Modifiche'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsEditingProfile(false)}
                      className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
                    >
                      Annulla
                    </button>
                  </div>
                </form>
              )}

              {/* Password Change Section */}
              {!isChangingPassword ? (
                <div className="border rounded-lg p-6">
                  <h2 className="text-xl font-semibold mb-4 flex items-center">
                    <KeyRound className="w-5 h-5 mr-2" />
                    Sicurezza
                  </h2>
                  <p className="text-sm text-gray-600 mb-4">
                    Modifica la tua password per mantenere sicuro il tuo account
                  </p>
                  <button
                    onClick={() => setIsChangingPassword(true)}
                    className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
                  >
                    Cambia Password
                  </button>
                </div>
              ) : (
                <form onSubmit={handlePasswordChange} className="border rounded-lg p-6">
                  <h2 className="text-xl font-semibold mb-4">Cambia Password</h2>
                  <div className="space-y-4">
                    <div>
                      <label htmlFor="currentPassword" className="block text-sm font-medium text-gray-700">
                        Password Attuale
                      </label>
                      <input
                        type="password"
                        id="currentPassword"
                        value={passwordData.currentPassword}
                        onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label htmlFor="newPassword" className="block text-sm font-medium text-gray-700">
                        Nuova Password
                      </label>
                      <input
                        type="password"
                        id="newPassword"
                        value={passwordData.newPassword}
                        onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700">
                        Conferma Nuova Password
                      </label>
                      <input
                        type="password"
                        id="confirmPassword"
                        value={passwordData.confirmPassword}
                        onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                  <div className="mt-6 flex space-x-3">
                    <button
                      type="submit"
                      disabled={loading}
                      className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                    >
                      {loading ? 'Aggiornamento...' : 'Aggiorna Password'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsChangingPassword(false)}
                      className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
                    >
                      Annulla
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}