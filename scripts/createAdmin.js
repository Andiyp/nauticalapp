import { initializeApp, deleteApp } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword } from 'firebase/auth';
import { getFirestore, doc, setDoc, terminate } from 'firebase/firestore';
import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Load environment variables
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '..', '.env') });

const firebaseConfig = {
  apiKey: process.env.VITE_FIREBASE_API_KEY,
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.VITE_FIREBASE_APP_ID,
};

// Verify environment variables are loaded
if (!process.env.VITE_FIREBASE_API_KEY) {
  console.error('Firebase configuration is missing. Make sure .env file exists with proper values.');
  process.exit(1);
}

async function createAdminUser() {
  const app = initializeApp(firebaseConfig);
  const auth = getAuth(app);
  const db = getFirestore(app);

  try {
    let user;
    
    // Try to sign in first to check if user exists
    try {
      const result = await signInWithEmailAndPassword(auth, "admin@nauticalapp.com", "adminadmin");
      user = result.user;
      console.log('Admin user exists, updating Firestore data...');
    } catch (error) {
      // If user doesn't exist, create new one
      if (error.code === 'auth/user-not-found') {
        const result = await createUserWithEmailAndPassword(auth, "admin@nauticalapp.com", "adminadmin");
        user = result.user;
        console.log('Created new admin user...');
      } else {
        throw error;
      }
    }

    // Create or update user document in Firestore
    const userData = {
      uid: user.uid,
      email: "admin@nauticalapp.com",
      role: 'admin',
      isBlocked: false,
      isSkipper: true,
      skipperFirstName: "Admin",
      skipperLastName: "Admin",
      boatName: "Admin",
      boatType: "sail",
      phone: "+39 3357866804",
      location: {
        lat: 44.48625,
        lng: 12.28087
      }
    };

    // Use set with merge option to ensure the document is created or updated
    await setDoc(doc(db, 'users', user.uid), userData, { merge: true });
    console.log('Admin user data updated successfully in Firestore');
    
    // Properly cleanup Firebase connections
    await terminate(db);
    await deleteApp(app);
    
    process.exit(0);
  } catch (error) {
    console.error('Error creating/updating admin user:', error);
    // Ensure cleanup even on error
    try {
      await terminate(db);
      await deleteApp(app);
    } catch (cleanupError) {
      console.error('Error during cleanup:', cleanupError);
    }
    process.exit(1);
  }
}

createAdminUser();