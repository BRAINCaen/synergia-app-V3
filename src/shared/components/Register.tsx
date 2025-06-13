
import { useState } from 'react';
import { register } from '../../modules/auth/AuthService';
import { useNavigate } from 'react-router-dom';

const Register = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const navigate = useNavigate();

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await register(email, password);
      navigate('/');
    } catch (error) {
      alert("Erreur lors de l'inscription");
    }
  };

  return (
    <form onSubmit={handleRegister} className="bg-white text-black max-w-md w-full p-8 rounded-lg shadow-md">
      <h2 className="text-2xl font-bold text-center mb-6">Inscription GameHub Pro</h2>
      <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="Email" className="w-full mb-3 p-2 border rounded" />
      <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Mot de passe" className="w-full mb-3 p-2 border rounded" />
      <button type="submit" className="w-full bg-green-600 text-white p-2 rounded font-semibold">S'inscrire</button>
    </form>
  );
};

export default Register;
