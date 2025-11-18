import React, { useEffect, useState } from 'react';
import { PlusCircleIcon, TrashIcon } from '../icons';

type Professional = {
  id: string;
  name: string;
  email: string;
  phone: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

const ProfessionalsView: React.FC = () => {
  const [items, setItems] = useState<Professional[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/professionals');
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Erro ao carregar profissionais');
      setItems(data.professionals || []);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim() || !phone.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/professionals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, phone, is_active: true })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Erro ao cadastrar profissional');
      setName(''); setEmail(''); setPhone('');
      await load();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h2 className="text-2xl font-bold text-white mb-6">Profissionais</h2>

      <form onSubmit={onSubmit} className="bg-gray-800 p-4 rounded-lg border border-gray-700 mb-6 grid md:grid-cols-4 gap-3">
        <input
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder="Nome"
          className="bg-gray-700 text-white rounded px-3 py-2 outline-none border border-gray-600 focus:border-amber-500"
        />
        <input
          value={email}
          onChange={e => setEmail(e.target.value)}
          type="email"
          placeholder="E-mail"
          className="bg-gray-700 text-white rounded px-3 py-2 outline-none border border-gray-600 focus:border-amber-500"
        />
        <input
          value={phone}
          onChange={e => setPhone(e.target.value)}
          placeholder="Telefone"
          className="bg-gray-700 text-white rounded px-3 py-2 outline-none border border-gray-600 focus:border-amber-500"
        />
        <button
          type="submit"
          disabled={loading}
          className="flex items-center justify-center gap-2 bg-amber-500 hover:bg-amber-400 text-gray-900 font-bold py-2 px-4 rounded-lg transition-colors duration-300 disabled:opacity-70"
        >
          <PlusCircleIcon className="w-5 h-5" />
          Adicionar
        </button>
      </form>

      {error && <div className="text-red-400 mb-4">{error}</div>}

      <div className="bg-gray-800 rounded-lg border border-gray-700">
        <table className="w-full text-left">
          <thead>
            <tr className="text-gray-300 border-b border-gray-700">
              <th className="p-3">Nome</th>
              <th className="p-3">E-mail</th>
              <th className="p-3">Telefone</th>
              <th className="p-3">Status</th>
            </tr>
          </thead>
          <tbody>
            {items.map(p => (
              <tr key={p.id} className="border-b border-gray-700/60">
                <td className="p-3 text-white">{p.name}</td>
                <td className="p-3 text-gray-300">{p.email}</td>
                <td className="p-3 text-gray-300">{p.phone}</td>
                <td className="p-3">
                  <span className={p.is_active ? 'text-emerald-400' : 'text-gray-400'}>
                    {p.is_active ? 'Ativo' : 'Inativo'}
                  </span>
                </td>
              </tr>
            ))}
            {items.length === 0 && !loading && (
              <tr><td className="p-4 text-gray-400" colSpan={4}>Nenhum profissional cadastrado.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default ProfessionalsView;

