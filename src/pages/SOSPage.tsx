import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, addDoc, serverTimestamp, doc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/contexts/AuthContext';
import { AlertTriangle, ArrowLeft, Wrench, Heart, Anchor, User, Waves, Sailboat, Mountain } from 'lucide-react';
import type { SOSRequest } from '@/types';

const SOS_TYPES = [
  { id: 'engine_failure', label: 'Avaria motore', icon: Wrench },
  { id: 'medical_emergency', label: 'Emergenza medica', icon: Heart },
  { id: 'adrift', label: 'Alla deriva', icon: Anchor },
  { id: 'man_overboard', label: 'Uomo in mare', icon: User },
  { id: 'sinking', label: 'Affondamento', icon: Waves },
  { id: 'dismasted', label: 'Disalberato', icon: Sailboat },
  { id: 'aground', label: 'Incagliato', icon: Mountain }
] as const;

export default function SOSPage() {
  const [loading, setLoading] = useState(false);
  const [details, setDetails] = useState('');
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);
  const { currentUser, userData } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    // Request location immediately when the page loads
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const newLocation = {
            lat: position.coords.latitude,
            lng: position.coords.longitude
          };
          setLocation(newLocation);
          setLocationError(null);

          // Also update the user's location in Firestore
          if (currentUser) {
            const userRef = doc(db, 'users', currentUser.uid);
            updateDoc(userRef, { location: newLocation }).catch(console.error);
          }
        },
        (error) => {
          let errorMessage = 'Errore durante l\'accesso alla posizione.';
          switch (error.code) {
            case error.PERMISSION_DENIED:
              errorMessage = 'L\'accesso alla posizione è stato negato. Per favore, abilita la geolocalizzazione nelle impostazioni del browser.';
              break;
            case error.POSITION_UNAVAILABLE:
              errorMessage = 'Informazioni sulla posizione non disponibili. Verifica la connessione GPS o di rete e assicurati di essere in un\'area con buona copertura del segnale.';
              break;
            case error.TIMEOUT:
              errorMessage = 'Timeout durante la richiesta della posizione. Prova a spostarti in un\'area con migliore copertura GPS o connessione di rete.';
              break;
          }
          setLocationError(errorMessage);
          console.error('Geolocation error:', error);
        },
        {
          enableHighAccuracy: true,
          timeout: 60000,
          maximumAge: 0
        }
      );
    } else {
      setLocationError('Il tuo browser non supporta la geolocalizzazione.');
    }
  }, [currentUser]);

  const handleSOS = async (type: SOSRequest['type']) => {
    if (!currentUser || !userData) {
      alert('Devi essere autenticato per inviare un SOS');
      return;
    }

    if (!location) {
      alert('Impossibile inviare SOS: Posizione non disponibile. Assicurati che la geolocalizzazione sia attiva.');
      return;
    }

    setLoading(true);
    try {
      const sosData = {
        userId: currentUser.uid,
        boatName: userData.boatName,
        type,
        location: location,
        status: 'active',
        createdAt: serverTimestamp(),
        phone: userData.phone,
        details: details.trim() || null,
        skipperName: userData.isSkipper ? `${userData.skipperFirstName} ${userData.skipperLastName}` : null,
        boatType: userData.boatType
      };

      await addDoc(collection(db, 'sos_requests'), sosData);
      navigate('/');
    } catch (error) {
      console.error('Error sending SOS:', error);
      alert('Errore nell\'invio della richiesta SOS');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-red-600 text-white">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/')}
              className="p-2 hover:bg-red-700 rounded-full transition-colors"
              aria-label="Torna alla dashboard"
            >
              <ArrowLeft className="w-6 h-6" />
            </button>
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-8 h-8" />
              <h1 className="text-2xl font-bold">Richiesta di Soccorso</h1>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-6">
        {/* Location Status */}
        {locationError ? (
          <div className="bg-red-50 border-l-4 border-red-400 p-4 mb-6">
            <div className="flex">
              <div className="flex-shrink-0">
                <AlertTriangle className="h-5 w-5 text-red-400" />
              </div>
              <div className="ml-3">
                <p className="text-sm text-red-700">
                  {locationError}
                </p>
              </div>
            </div>
          </div>
        ) : !location ? (
          <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-6">
            <div className="flex">
              <div className="flex-shrink-0">
                <AlertTriangle className="h-5 w-5 text-yellow-400" />
              </div>
              <div className="ml-3">
                <p className="text-sm text-yellow-700">
                  Acquisizione della posizione in corso...
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-green-50 border-l-4 border-green-400 p-4 mb-6">
            <div className="flex">
              <div className="flex-shrink-0">
                <AlertTriangle className="h-5 w-5 text-green-400" />
              </div>
              <div className="ml-3">
                <p className="text-sm text-green-700">
                  Posizione acquisita: Lat: {location.lat.toFixed(6)}, Long: {location.lng.toFixed(6)}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Warning Message */}
        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-6">
          <div className="flex">
            <div className="flex-shrink-0">
              <AlertTriangle className="h-5 w-5 text-yellow-400" />
            </div>
            <div className="ml-3">
              <p className="text-sm text-yellow-700">
                <span className="font-bold">Attenzione!</span> Usa questi pulsanti solo in caso di reale emergenza.
              </p>
            </div>
          </div>
        </div>

        {/* Emergency Type Selection */}
        <div className="space-y-4">
          <h2 className="text-lg font-medium text-gray-900">Seleziona il tipo di emergenza:</h2>
          <div className="grid gap-4">
            {SOS_TYPES.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => handleSOS(id)}
                disabled={loading || !location}
                className={`flex items-center gap-3 w-full p-4 text-left rounded-lg transition-colors ${
                  !location
                    ? 'bg-gray-400 cursor-not-allowed'
                    : 'text-white bg-red-600 hover:bg-red-700'
                } disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                <Icon className="w-6 h-6" />
                <span className="font-medium">{label}</span>
              </button>
            ))}
          </div>

          {/* Additional Details */}
          <div className="mt-6">
            <label htmlFor="details" className="block text-sm font-medium text-gray-700">
              Dettagli aggiuntivi (opzionale):
            </label>
            <textarea
              id="details"
              rows={4}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-red-500 focus:ring-red-500"
              placeholder="Inserisci eventuali dettagli aggiuntivi sulla situazione di emergenza"
              value={details}
              onChange={(e) => setDetails(e.target.value)}
            />
          </div>
        </div>
      </div>
    </div>
  );
}