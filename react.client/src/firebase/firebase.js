import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
    apiKey: "AIzaSyAhnC2h0sOJMh09loQ_UTpDxP*******", // Settings > General > Web App
    authDomain: "alex-odesa.firebaseapp.com",
    projectId: "alex-odesa",
    storageBucket: "alex-odesa.firebasestorage.app",
    messagingSenderId: "908566146128",
    appId: "1:908566146128:web:537b7f10191051d9613555"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
