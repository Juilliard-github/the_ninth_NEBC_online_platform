// Import the functions you need from the SDKs you need
import { initializeApp, getApps, getApp } from "firebase/app"
import { getAuth } from 'firebase/auth'
import { getFirestore } from 'firebase/firestore'
import { getStorage } from 'firebase/storage'
import { getDatabase } from "firebase/database"

// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyCRuuyachKuZe5_9JHNo8Eok5J4ts53R1o",
  authDomain: "nebc-online-platform.firebaseapp.com",
  databaseURL: "https://nebc-online-platform-default-rtdb.firebaseio.com",
  projectId: "nebc-online-platform",
  storageBucket: "nebc-online-platform.firebasestorage.app",
  messagingSenderId: "811077159390",
  appId: "1:811077159390:web:b80a43a0ad14a89f2ff54f"
};

// Initialize Firebase
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp()

const auth = getAuth(app)
const db = getFirestore(app)
const storage=getStorage(app)
const rtdb = getDatabase(app)

export { auth, db, storage, rtdb }

