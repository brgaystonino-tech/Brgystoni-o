/* Firebase client configuration for Barangay Sto. Niño.
 * This app uses Firebase Hosting and Realtime Database for portal data.
 * Never put private credentials or service-account keys in this public file.
 */
(() => {
  const firebaseConfig = {
    apiKey: "AIzaSyAGgbIxk61o5LI7cPLcp9FHn74W-CL2-XI",
    authDomain: "stoninobrgy.firebaseapp.com",
    databaseURL: "https://stoninobrgy-default-rtdb.firebaseio.com",
    projectId: "stoninobrgy",
    storageBucket: "stoninobrgy.firebasestorage.app",
    messagingSenderId: "139865587712",
    appId: "1:139865587712:web:838293352e4bda9be1d8e5",
    measurementId: "G-2QGM3P764P"
  };

  window.BIS_FIREBASE_CONFIG = Object.freeze(firebaseConfig);

  try {
    if (!window.firebase) throw new Error('Firebase SDK is not loaded.');
    window.BIS_FIREBASE_APP = window.firebase.apps?.length
      ? window.firebase.app()
      : window.firebase.initializeApp(firebaseConfig);
    window.BIS_FIREBASE_DB = window.firebase.database();
    window.BIS_FIREBASE_ENABLED = true;
    window.BIS_FIREBASE_ERROR = null;
  } catch (error) {
    window.BIS_FIREBASE_APP = null;
    window.BIS_FIREBASE_DB = null;
    window.BIS_FIREBASE_ENABLED = false;
    window.BIS_FIREBASE_ERROR = error;
    console.warn('[BIS] Firebase initialization failed. Local data fallback remains active.', error);
  }
})();
