
import { useState } from 'react';
import { login, loginWithGoogle } from '../../modules/auth/AuthService';
import { useNavigate } from 'react-router-dom';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await login(email, password);
      navigate('/register');
    } catch (error) {
      alert("Erreur de connexion");
    }
  };

  const handleGoogleLogin = async () => {
    try {
      await loginWithGoogle();
      navigate('/register');
    } catch (error) {
      alert("Erreur avec la connexion Google");
    }
  };

  return (
    <form onSubmit={handleLogin} className="bg-white text-black max-w-md w-full p-8 rounded-lg shadow-md">
      <h2 className="text-2xl font-bold text-center mb-6">Connexion GameHub Pro</h2>
      <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="Email" className="w-full mb-3 p-2 border rounded" />
      <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Mot de passe" className="w-full mb-3 p-2 border rounded" />
      <button type="submit" className="w-full bg-blue-700 text-white p-2 rounded font-semibold">Se connecter</button>
      <button type="button" onClick={handleGoogleLogin} className="w-full bg-red-600 text-white p-2 rounded font-semibold mt-3">
        Se connecter avec Google
      </button>
    </form>
  );
};

export default Login;
