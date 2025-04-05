import React, { useState, useEffect } from 'react';
import { collection, addDoc, serverTimestamp, query, orderBy, onSnapshot, deleteDoc, doc, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Bell, ArrowLeft, Trash2 } from 'lucide-react';
import type { Alert } from '@/types';

export default function AlertManagement() {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const { currentUser } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const alertsQuery = query(collection(db, 'alerts'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(alertsQuery, (snapshot) => {
      const alertsData: Alert[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        const createdAt = data.createdAt instanceof Timestamp ? 
          data.createdAt.toDate() : 
          new Date(data.createdAt);
        
        alertsData.push({ 
          id: doc.id, 
          ...data,
          createdAt 
        } as Alert);
      });
      setAlerts(alertsData);
    });

    return () => unsubscribe();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      await addDoc(collection(db, 'alerts'), {
        title: title.trim(),
        content: content.trim(),
        createdAt: serverTimestamp(),
        createdBy: currentUser.uid
      });

      setSuccess('Avviso pubblicato con successo!');
      setTitle('');
      setContent('');
    } catch (err) {
      setError('Errore durante la pubblicazione dell\'avviso');
      console.error('Error publishing alert:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (alertId: string) => {
    if (!confirm('Sei sicuro di voler eliminare questo avviso?')) return;

    try {
      await deleteDoc(doc(db, 'alerts', alertId));
      setSuccess('Avviso eliminato con successo!');
    } catch (err) {
      setError('Errore durante l\'eliminazione dell\'avviso');
      console.error('Error deleting alert:', err);
    }
  };

  const formatDate = (date: Date) => {
    if (!(date instanceof Date) || isNaN(date.getTime())) {
      return 'Data non disponibile';
    }
    return date.toLocaleString('it-IT', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-blue-600 text-white">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/admin')}
              className="p-2 hover:bg-blue-700 rounded-full transition-colors"
              aria-label="Torna al pannello admin"
            >
              <ArrowLeft className="w-6 h-6" />
            </button>
            <div className="flex items-center gap-2">
              <Bell className="w-8 h-8" />
              <h1 className="text-2xl font-bold">Gestione Avvisi</h1>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* New Alert Form */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
          <h2 className="text-xl font-semibold mb-6">Nuovo Avviso</h2>
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="p-4 bg-red-50 border-l-4 border-red-400 text-red-700">
                {error}
              </div>
            )}
            {success && (
              <div className="p-4 bg-green-50 border-l-4 border-green-400 text-green-700">
                {success}
              </div>
            )}

            <div>
              <label htmlFor="title" className="block text-sm font-medium text-gray-700">
                Titolo dell'avviso
              </label>
              <input
                type="text"
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                placeholder="Inserisci il titolo dell'avviso"
              />
            </div>

            <div>
              <label htmlFor="content" className="block text-sm font-medium text-gray-700">
                Contenuto dell'avviso
              </label>
              <textarea
                id="content"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                required
                rows={6}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                placeholder="Inserisci il contenuto dell'avviso"
              />
            </div>

            <div className="flex justify-end">
              <button
                type="submit"
                disabled={loading}
                className={`px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                  loading ? 'opacity-50 cursor-not-allowed' : ''
                }`}
              >
                {loading ? 'Pubblicazione...' : 'Pubblica Avviso'}
              </button>
            </div>
          </form>
        </div>

        {/* Existing Alerts List */}
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-xl font-semibold mb-6">Avvisi Pubblicati</h2>
          <div className="space-y-4">
            {alerts.map((alert) => (
              <div key={alert.id} className="border rounded-lg p-4">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-medium text-lg">{alert.title}</h3>
                    <p className="text-sm text-gray-500 mt-1">
                      Pubblicato il {formatDate(alert.createdAt)}
                    </p>
                  </div>
                  <button
                    onClick={() => handleDelete(alert.id)}
                    className="p-2 text-red-600 hover:bg-red-50 rounded-full transition-colors"
                    title="Elimina avviso"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
                <p className="mt-2 text-gray-700 whitespace-pre-wrap">{alert.content}</p>
              </div>
            ))}
            {alerts.length === 0 && (
              <p className="text-center text-gray-500 py-4">
                Nessun avviso pubblicato
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}