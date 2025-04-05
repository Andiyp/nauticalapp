import React from 'react';
import { collection, query, orderBy, onSnapshot, Timestamp } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import { db } from '@/lib/firebase';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, Bell, ArrowLeft, Phone, Ship } from 'lucide-react';
import type { Alert, SOSRequest } from '@/types';

export default function Bacheca() {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [sosRequests, setSOSRequests] = useState<SOSRequest[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    // Subscribe to alerts collection
    const alertsQuery = query(collection(db, 'alerts'), orderBy('createdAt', 'desc'));
    const unsubAlerts = onSnapshot(alertsQuery, (snapshot) => {
      const alertsData: Alert[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        // Convert Firestore timestamp to Date
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

    // Subscribe to SOS requests
    const sosQuery = query(collection(db, 'sos_requests'), orderBy('createdAt', 'desc'));
    const unsubSOS = onSnapshot(sosQuery, (snapshot) => {
      const sosData: SOSRequest[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        // Convert Firestore timestamp to Date
        const createdAt = data.createdAt instanceof Timestamp ? 
          data.createdAt.toDate() : 
          new Date(data.createdAt);

        sosData.push({ 
          id: doc.id, 
          ...data,
          createdAt 
        } as SOSRequest);
      });
      setSOSRequests(sosData);
    });

    return () => {
      unsubAlerts();
      unsubSOS();
    };
  }, []);

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

  const getSOSTypeLabel = (type: SOSRequest['type']) => {
    const labels = {
      engine_failure: 'Avaria Motore',
      medical_emergency: 'Emergenza Medica',
      adrift: 'Alla Deriva',
      man_overboard: 'Uomo in Mare',
      sinking: 'Affondamento',
      dismasted: 'Disalberato',
      aground: 'Incagliato'
    };
    return labels[type] || type;
  };

  const getSOSTypeColor = (type: SOSRequest['type']) => {
    const colors = {
      engine_failure: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      medical_emergency: 'bg-red-100 text-red-800 border-red-200',
      adrift: 'bg-orange-100 text-orange-800 border-orange-200',
      man_overboard: 'bg-red-100 text-red-800 border-red-200',
      sinking: 'bg-red-100 text-red-800 border-red-200',
      dismasted: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      aground: 'bg-orange-100 text-orange-800 border-orange-200'
    };
    return colors[type] || 'bg-gray-100 text-gray-800 border-gray-200';
  };

  // Combine and sort all items by date
  const allItems = [
    ...alerts.map(alert => ({
      type: 'alert' as const,
      data: alert,
      date: alert.createdAt
    })),
    ...sosRequests.map(sos => ({
      type: 'sos' as const,
      data: sos,
      date: sos.createdAt
    }))
  ].sort((a, b) => b.date.getTime() - a.date.getTime());

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
              <Ship className="w-8 h-8" />
              <h1 className="text-2xl font-bold">Bacheca Avvisi</h1>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="space-y-6">
          {allItems.map((item) => (
            <div
              key={item.type === 'alert' ? item.data.id : item.data.id}
              className={`border rounded-lg p-6 ${
                item.type === 'sos' 
                  ? getSOSTypeColor(item.data.type)
                  : 'bg-white border-gray-200'
              }`}
            >
              {item.type === 'sos' ? (
                // SOS Request
                <div>
                  <div className="flex items-center gap-2 mb-4">
                    <AlertTriangle className="w-6 h-6 text-red-600" />
                    <h2 className="text-xl font-bold">EMERGENZA SOS</h2>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between items-start">
                      <span className="font-medium">{getSOSTypeLabel(item.data.type)}</span>
                      <span className="text-sm opacity-75">{formatDate(item.date)}</span>
                    </div>
                    <p className="text-lg font-semibold">Imbarcazione: {item.data.boatName}</p>
                    <p>Posizione: Lat: {item.data.location.lat.toFixed(6)}, Long: {item.data.location.lng.toFixed(6)}</p>
                    {item.data.skipperName && (
                      <p>Skipper: {item.data.skipperName}</p>
                    )}
                    <div className="flex items-center gap-2 mt-2">
                      <Phone className="w-4 h-4" />
                      <a href={`tel:${item.data.phone}`} className="hover:underline">
                        {item.data.phone}
                      </a>
                    </div>
                    {item.data.details && (
                      <p className="mt-2 p-3 bg-white/50 rounded-md">
                        {item.data.details}
                      </p>
                    )}
                    <div className="mt-2">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        item.data.status === 'active' 
                          ? 'bg-red-100 text-red-800' 
                          : 'bg-green-100 text-green-800'
                      }`}>
                        {item.data.status === 'active' ? 'In corso' : 'Risolto'}
                      </span>
                    </div>
                  </div>
                </div>
              ) : (
                // Admin Alert
                <div>
                  <div className="flex items-center gap-2 mb-4">
                    <Bell className="w-6 h-6 text-blue-600" />
                    <h2 className="text-xl font-bold">{item.data.title}</h2>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between items-start">
                      <span className="text-sm text-gray-500">Da: Admin</span>
                      <span className="text-sm text-gray-500">{formatDate(item.date)}</span>
                    </div>
                    <p className="mt-2 text-gray-700 whitespace-pre-wrap">{item.data.content}</p>
                  </div>
                </div>
              )}
            </div>
          ))}

          {allItems.length === 0 && (
            <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
              <p className="text-gray-500">Nessun avviso disponibile</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}