import { Timestamp } from 'firebase/firestore';

export type UserRole = 'user' | 'admin';
export type BoatType = 'sail' | 'motor';

export interface User {
  uid: string;
  email: string;
  isSkipper: boolean;
  skipperFirstName?: string;
  skipperLastName?: string;
  boatName: string;
  boatType: BoatType;
  phone: string;
  role: UserRole;
  isBlocked: boolean;
  location?: {
    lat: number;
    lng: number;
  };
}

export interface Alert {
  id: string;
  title: string;
  content: string;
  createdAt: Date;
  createdBy: string;
}

export interface SOSRequest {
  id: string;
  userId: string;
  boatName: string;
  type: 'engine_failure' | 'medical_emergency' | 'adrift' | 'man_overboard' | 'sinking' | 'dismasted' | 'aground';
  location: {
    lat: number;
    lng: number;
  };
  status: 'active' | 'accepted' | 'resolved';
  createdAt: Date;
  phone: string;
  details?: string | null;
  skipperName?: string | null;
  boatType: BoatType;
  acceptedBy?: {
    uid: string;
    boatName: string;
    acceptedAt: Date;
  } | null;
}