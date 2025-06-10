export class AuthManager {
    constructor(firebaseAuth) {
        this.auth = firebaseAuth;
    }

    async signIn(email, password) {
        try {
            const userCredential = await this.auth.signInWithEmailAndPassword(email, password);
            return userCredential.user;
        } catch (error) {
            throw error;
        }
    }

    async signOut() {
        try {
            await this.auth.signOut();
        } catch (error) {
            console.error("Erreur de déconnexion :", error.message);
        }
    }

    onAuthChange(callback) {
        this.auth.onAuthStateChanged(callback);
    }
}
