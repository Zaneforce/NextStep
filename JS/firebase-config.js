const firebaseConfig = {
    apiKey: "AIzaSyBcGAlRNxn1oJ5SpQb179EdzXXW4tYpHrs",
    authDomain: "nextstep-123.firebaseapp.com",
    projectId: "nextstep-123",
    storageBucket: "nextstep-123.firebasestorage.app",
    messagingSenderId: "427076545876",
    appId: "1:427076545876:web:e588a15084e83343482cc1",
    measurementId: "G-6S22DPGVP3"
  };
  
  // Initialize Firebase
  const app = firebase.initializeApp(firebaseConfig);
  const auth = firebase.auth();
  const db = firebase.firestore();
  
  // Google Provider
  const googleProvider = new firebase.auth.GoogleAuthProvider();