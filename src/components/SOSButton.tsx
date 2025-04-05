import React from 'react';
import { AlertOctagon } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function SOSButton() {
  const navigate = useNavigate();

  return (
    <button
      onClick={() => navigate('/sos')}
      className="flex items-center gap-2 px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-bold text-lg shadow-lg"
    >
      <AlertOctagon className="w-6 h-6" />
      <span>SOS</span>
    </button>
  );
}