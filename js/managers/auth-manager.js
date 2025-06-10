import { 
    signInWithEmailAndPassword,
    signOut,
    onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

export class AuthManager {
    constructor(firebaseAuth) {
        this.auth = firebaseAuth;
    }

    async signIn(email, password) {
        try {
            const userCredential = await signInWithEmailAndPassword(this.auth, email, password);
            return userCredential.user;
        } catch (error) {
            throw error;
        }
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
