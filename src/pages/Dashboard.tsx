import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import { Icon } from 'leaflet';
import { collection, onSnapshot, query, orderBy, doc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import { LogOut, AlertTriangle, Bell, Phone, Ship, User, MessageSquare, Shield, Menu, Anchor } from 'lucide-react';
import SOSButton from '@/components/SOSButton';
import type { User as UserType, Alert, SOSRequest } from '@/types';
import 'leaflet/dist/leaflet.css';

// Custom icons for different boat types
const sailboatIcon = new Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

const motorboatIcon = new Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

const nauticalBaseIcon = new Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  iconSize: [35, 57], // Larger size to make it more prominent
  iconAnchor: [17, 57],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

// Nautical base coordinates
const NAUTICAL_BASE = {
  lat: 44.488327,
  lng: 12.291278
};

export default function Dashboard() {
  const { currentUser, userData, logout } = useAuth();
  const navigate = useNavigate();
  const [users, setUsers] = useState<UserType[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [sosRequests, setSOSRequests] = useState<SOSRequest[]>([]);
  const [mapCenter, setMapCenter] = useState<[number, number]>([NAUTICAL_BASE.lat, NAUTICAL_BASE.lng]); // Default center on nautical base
  const [mapZoom] = useState(13); // Increased zoom level to better show the area
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [isGeolocationEnabled, setIsGeolocationEnabled] = useState(false);
  const [geolocationError, setGeolocationError] = useState<string | null>(null);

  useEffect(() => {
    if (!currentUser) return;

    // Request geolocation permission and start tracking
    const requestGeolocation = async () => {
      try {
        // First check if geolocation is supported
        if (!navigator.geolocation) {
          setGeolocationError('Il tuo browser non supporta la geolocalizzazione.');
          setIsGeolocationEnabled(false);
          return;
        }

        const permission = await navigator.permissions.query({ name: 'geolocation' });
        
        if (permission.state === 'denied') {
          setGeolocationError('L\'accesso alla posizione è stato negato. Per favore, abilita la geolocalizzazione nelle impostazioni del browser.');
          setIsGeolocationEnabled(false);
          return;
        }

        if (permission.state === 'granted' || permission.state === 'prompt') {
          try {
            const watchId = navigator.geolocation.watchPosition(
              async (position) => {
                setIsGeolocationEnabled(true);
                setGeolocationError(null);
                const newLocation = {
                  lat: position.coords.latitude,
                  lng: position.coords.longitude
                };
                
                // Update user's location in Firestore
                if (currentUser) {
                  const userRef = doc(db, 'users', currentUser.uid);
                  await updateDoc(userRef, { location: newLocation });
                  setMapCenter([newLocation.lat, newLocation.lng]);
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
                console.error('Geolocation error:', error);
                setGeolocationError(errorMessage);
                setIsGeolocationEnabled(false);
              },
              {
                enableHighAccuracy: false,
                maximumAge: 30000,
                timeout: 60000
              }
            );

            // Listen for permission changes
            permission.addEventListener('change', () => {
              if (permission.state === 'denied') {
                setGeolocationError('L\'accesso alla posizione è stato negato. Per favore, abilita la geolocalizzazione nelle impostazioni del browser.');
                setIsGeolocationEnabled(false);
                navigator.geolocation.clearWatch(watchId);
              }
            });

            return () => {
              navigator.geolocation.clearWatch(watchId);
              permission.removeEventListener('change', () => {});
            };
          } catch (watchError) {
            console.error('Error watching position:', watchError);
            setGeolocationError('Si è verificato un errore durante il monitoraggio della posizione. Verifica la tua connessione e il segnale GPS.');
            setIsGeolocationEnabled(false);
          }
        }
      } catch (error) {
        console.error('Error requesting geolocation:', error);
        setGeolocationError('Si è verificato un errore durante la richiesta della posizione. Verifica le impostazioni del browser e riprova.');
        setIsGeolocationEnabled(false);
      }
    };

    requestGeolocation();

    // Subscribe to users collection
    const unsubUsers = onSnapshot(collection(db, 'users'), (snapshot) => {
      const usersData: UserType[] = [];
      snapshot.forEach((doc) => {
        const userData = doc.data() as UserType;
        if (userData.location) {
          usersData.push(userData);
        }
      });
      setUsers(usersData);
    });

    // Subscribe to alerts collection
    const alertsQuery = query(collection(db, 'alerts'), orderBy('createdAt', 'desc'));
    const unsubAlerts = onSnapshot(alertsQuery, (snapshot) => {
      const alertsData: Alert[] = [];
      snapshot.forEach((doc) => {
        alertsData.push({ id: doc.id, ...doc.data() } as Alert);
      });
      setAlerts(alertsData);
    });

    // Subscribe to SOS requests
    const sosQuery = query(collection(db, 'sos_requests'), orderBy('createdAt', 'desc'));
    const unsubSOS = onSnapshot(sosQuery, (snapshot) => {
      const sosData: SOSRequest[] = [];
      snapshot.forEach((doc) => {
        sosData.push({ id: doc.id, ...doc.data() } as SOSRequest);
      });
      setSOSRequests(sosData);
    });

    return () => {
      unsubUsers();
      unsubAlerts();
      unsubSOS();
    };
  }, [currentUser]);

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch (error) {
      console.error('Failed to log out:', error);
    }
  };

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleString();
  };

  const getSOSTypeColor = (type: SOSRequest['type']) => {
    const colors = {
      engine_failure: 'bg-yellow-100 text-yellow-800',
      medical_emergency: 'bg-red-100 text-red-800',
      adrift: 'bg-orange-100 text-orange-800',
      man_overboard: 'bg-red-100 text-red-800',
      sinking: 'bg-red-100 text-red-800',
      dismasted: 'bg-yellow-100 text-yellow-800',
      aground: 'bg-orange-100 text-orange-800'
    };
    return colors[type] || 'bg-gray-100 text-gray-800';
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

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation Bar */}
      <nav className="bg-blue-600 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <div className="flex-shrink-0 flex items-center">
                <Ship className="h-8 w-8" />
                <span className="ml-2 text-xl font-bold">Nautical App</span>
              </div>
            </div>

            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center space-x-4">
              <Link to="/" className="px-3 py-2 rounded-md text-sm font-medium bg-blue-700">Dashboard</Link>
              <Link to="/bacheca" className="px-3 py-2 rounded-md text-sm font-medium hover:bg-blue-700">Bacheca</Link>
              {userData?.role === 'admin' && (
                <Link 
                  to="/admin" 
                  className="flex items-center px-3 py-2 rounded-md text-sm font-medium hover:bg-blue-700"
                >
                  <Shield className="w-4 h-4 mr-1" />
                  Admin Panel
                </Link>
              )}
              <SOSButton />
              <div className="relative">
                <button
                  onClick={() => setShowProfileMenu(!showProfileMenu)}
                  className="flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium hover:bg-blue-700"
                >
                  <User className="w-5 h-5" />
                  <span>{userData?.boatName || 'Profile'}</span>
                </button>
                {showProfileMenu && (
                  <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 z-50">
                    <Link
                      to="/profile"
                      className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    >
                      Gestione Profilo
                    </Link>
                    {userData?.role === 'admin' && (
                      <Link
                        to="/admin"
                        className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                      >
                        Pannello Admin
                      </Link>
                    )}
                    <button
                      onClick={handleLogout}
                      className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    >
                      Logout
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Mobile menu button */}
            <div className="md:hidden">
              <button
                onClick={() => setShowMobileMenu(!showMobileMenu)}
                className="inline-flex items-center justify-center p-2 rounded-md text-white hover:bg-blue-700 focus:outline-none"
              >
                <Menu className="h-6 w-6" />
              </button>
            </div>
          </div>
        </div>

        {/* Mobile menu */}
        {showMobileMenu && (
          <div className="md:hidden">
            <div className="px-2 pt-2 pb-3 space-y-1">
              <Link
                to="/"
                className="block px-3 py-2 rounded-md text-base font-medium text-white bg-blue-700"
              >
                Dashboard
              </Link>
              <Link
                to="/bacheca"
                className="block px-3 py-2 rounded-md text-base font-medium text-white hover:bg-blue-700"
              >
                Bacheca
              </Link>
              {userData?.role === 'admin' && (
                <Link
                  to="/admin"
                  className="block px-3 py-2 rounded-md text-base font-medium text-white hover:bg-blue-700"
                >
                  Admin Panel
                </Link>
              )}
              <Link
                to="/profile"
                className="block px-3 py-2 rounded-md text-base font-medium text-white hover:bg-blue-700"
              >
                Profilo
              </Link>
              <div className="px-3 py-2">
                <SOSButton />
              </div>
              <button
                onClick={handleLogout}
                className="block w-full text-left px-3 py-2 rounded-md text-base font-medium text-white hover:bg-blue-700"
              >
                Logout
              </button>
            </div>
          </div>
        )}
      </nav>

      {/* Geolocation Error Banner */}
      {geolocationError && (
        <div className="bg-yellow-50 border-b border-yellow-100 p-4">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <AlertTriangle className="h-5 w-5 text-yellow-400" />
                <p className="ml-3 text-sm text-yellow-700">
                  {geolocationError}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content - Map and Alerts */}
          <div className="lg:col-span-2 space-y-8">
            {/* Map Section */}
            <div className="bg-white rounded-lg shadow-lg overflow-hidden">
              <div className="p-6">
                <h2 className="text-xl font-bold text-gray-900 mb-4">Mappa delle Imbarcazioni</h2>
                <div className="h-[600px] rounded-lg overflow-hidden border border-gray-200">
                  <MapContainer
                    center={mapCenter}
                    zoom={mapZoom}
                    style={{ height: '100%', width: '100%' }}
                  >
                    <TileLayer
                      attribution='&copy; <a href="https://www.google.com/maps">Google Maps</a>'
                      url="http://{s}.google.com/vt/lyrs=s&x={x}&y={y}&z={z}"
                      maxZoom={20}
                      subdomains={['mt0', 'mt1', 'mt2', 'mt3']}
                    />
                    {/* Nautical Base Marker */}
                    <Marker
                      position={[NAUTICAL_BASE.lat, NAUTICAL_BASE.lng]}
                      icon={nauticalBaseIcon}
                    >
                      <Popup>
                        <div className="p-2">
                          <div className="flex items-center gap-2 mb-2">
                            <Anchor className="w-5 h-5 text-red-600" />
                            <h3 className="font-semibold text-lg">Base Nautica</h3>
                          </div>
                          <p className="text-sm text-gray-600">
                            Coordinate: {NAUTICAL_BASE.lat.toFixed(6)}°N, {NAUTICAL_BASE.lng.toFixed(6)}°E
                          </p>
                        </div>
                      </Popup>
                    </Marker>
                    {/* User Markers */}
                    {users.map((user) => (
                      user.location && (
                        <Marker
                          key={user.uid}
                          position={[user.location.lat, user.location.lng]}
                          icon={user.boatType === 'sail' ? sailboatIcon : motorboatIcon}
                        >
                          <Popup>
                            <div className="p-2">
                              <h3 className="font-semibold">{user.boatName}</h3>
                              <p className="text-sm text-gray-600">
                                Type: {user.boatType === 'sail' ? 'Sailboat' : 'Motorboat'}
                              </p>
                              {user.isSkipper && (
                                <p className="text-sm text-gray-600">Skipper on board</p>
                              )}
                            </div>
                          </Popup>
                        </Marker>
                      )
                    ))}
                  </MapContainer>
                </div>
              </div>
            </div>

            {/* Alerts Section */}
            <div className="space-y-6">
              {/* SOS Alerts */}
              <div className="bg-white rounded-lg shadow-lg overflow-hidden">
                <div className="p-6">
                  <div className="flex items-center gap-2 mb-4">
                    <AlertTriangle className="w-6 h-6 text-red-600" />
                    <h2 className="text-xl font-bold text-gray-900">Active SOS Requests</h2>
                  </div>
                  <div className="space-y-4">
                    {sosRequests.filter(sos => sos.status === 'active').map((sos) => (
                      <div key={sos.id} className="border rounded-lg p-4 bg-red-50">
                        <div className="flex justify-between items-start">
                          <div>
                            <h3 className="font-semibold text-red-900">{sos.boatName}</h3>
                            <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium mt-1 ${getSOSTypeColor(sos.type)}`}>
                              {getSOSTypeLabel(sos.type)}
                            </span>
                          </div>
                          <span className="text-sm text-gray-500">{formatDate(sos.createdAt)}</span>
                        </div>
                        <div className="mt-2 text-sm text-red-800">
                          <div>Location: {sos.location.lat.toFixed(4)}, {sos.location.lng.toFixed(4)}</div>
                          <div className="flex items-center gap-1 mt-1">
                            <Phone className="w-4 h-4" />
                            <a href={`tel:${sos.phone}`} className="hover:underline">{sos.phone}</a>
                          </div>
                        </div>
                      </div>
                    ))}
                    {sosRequests.filter(sos => sos.status === 'active').length === 0 && (
                      <p className="text-center text-gray-500 py-4">
                        Nessuna richiesta SOS attiva
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Admin Alerts */}
              <div className="bg-white rounded-lg shadow-lg overflow-hidden">
                <div className="p-6">
                  <div className="flex items-center gap-2 mb-4">
                    <Bell className="w-6 h-6 text-blue-600" />
                    <h2 className="text-xl font-bold text-gray-900">Admin Alerts</h2>
                  </div>
                  <div className="space-y-4">
                    {alerts.map((alert) => (
                      <div key={alert.id} className="border rounded-lg p-4">
                        <div className="flex justify-between items-start">
                          <h3 className="font-semibold text-gray-900">{alert.title}</h3>
                          <span className="text-sm text-gray-500">{formatDate(alert.createdAt)}</span>
                        </div>
                        <p className="mt-2 text-sm text-gray-600">{alert.content}</p>
                      </div>
                    ))}
                    {alerts.length === 0 && (
                      <p className="text-center text-gray-500 py-4">
                        Nessun avviso disponibile
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Sidebar - Online Users */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-lg overflow-hidden">
              <div className="p-6">
                <h2 className="text-xl font-bold text-gray-900 mb-4">Utenti Online</h2>
                <div className="space-y-4">
                  {users.map((user) => (
                    <div key={user.uid} className="flex items-center space-x-3 p-2 hover:bg-gray-50 rounded-lg">
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                      <div>
                        <p className="font-medium text-gray-900">{user.boatName}</p>
                        <p className="text-sm text-gray-500">{user.boatType === 'sail' ? 'Sailboat' : 'Motorboat'}</p>
                      </div>
                    </div>
                  ))}
                  {users.length === 0 && (
                    <p className="text-center text-gray-500 py-4">
                      Nessun utente online
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}