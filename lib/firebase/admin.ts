import {
  initializeApp,
  getApps,
  cert,
  type ServiceAccount,
} from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";

function initAdmin() {
  if (getApps().length) return getAuth();

  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n");

  if (!projectId || !clientEmail || !privateKey) {
    console.warn("Firebase Admin credentials not configured. Auth will not work.");
    return null;
  }

  const serviceAccount: ServiceAccount = { projectId, clientEmail, privateKey };
  initializeApp({ credential: cert(serviceAccount) });
  return getAuth();
}

export const adminAuth = initAdmin();
