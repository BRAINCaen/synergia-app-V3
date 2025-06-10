export class AuthManager {
    constructor(firebaseAuth) {
        this.auth = firebaseAuth;
    }

    async signIn(email, password) {
        try {
            const userCredential = await this.auth.signInWithEmailAndPassword(email, password);
            console.log("Utilisateur connecté :", userCredential.user);
            return userCredential.user;
        } catch (error) {
            console.error("Erreur de connexion :", error.message);
            throw error;
        }
    }

    async signOut() {
        try {
            await this.auth.signOut();
            console.log("Utilisateur déconnecté");
        } catch (error) {
            console.error("Erreur de déconnexion :", error.message);
        }
    }

    onAuthChange(callback) {
        this.auth.onAuthStateChanged(callback);
    }
}
