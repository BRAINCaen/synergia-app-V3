import { 
    signInWithEmailAndPassword,
    signOut,
    onAuthStateChanged,
    GoogleAuthProvider,
    signInWithPopup
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

export class AuthManager {
    constructor(firebaseAuth) {
        this.auth = firebaseAuth;
        this.googleProvider = new GoogleAuthProvider();
    }

    async signIn(email, password) {
        return await signInWithEmailAndPassword(this.auth, email, password);
    }

    async signInWithGoogle() {
        return await signInWithPopup(this.auth, this.googleProvider);
    }

    async signOut() {
        try {
            await signOut(this.auth);
        } catch (error) {
            console.error("Erreur de déconnexion :", error.message);
        }
    }

    onAuthChange(callback) {
        onAuthStateChanged(this.auth, callback);
    }
}
