import React, { useEffect, useMemo, useState } from 'react';
import { CalendarIcon } from '../icons';

type Professional = {
  id: string;
  name: string;
}

type BookingRow = {
  booking_id: string;
  date: string; // yyyy-mm-dd
  time: string; // HH:MM:SS
  professional_id: string | null;
  client_id: string;
  client_name: string;
  client_phone: string;
  client_email: string;
  total_price: string;
  total_duration_minutes: number;
  services: Array<{
    id: number;
    name: string;
    price: number;
    duration_minutes: number;
    quantity: number;
  }>;
}

const ScheduleView: React.FC = () => {
  const [professionals, setProfessionals] = useState<Professional[]>([]);
  const [selected, setSelected] = useState<string>('');
  const [bookings, setBookings] = useState<BookingRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/professionals');
        const data = await res.json();
        if (res.ok) {
          setProfessionals((data.professionals || []).map((p: any) => ({ id: p.id, name: p.name })));
        }
      } catch {}
    })();
  }, []);

  const load = async () => {
    if (!selected) { setBookings([]); return; }
    setLoading(true);
    setError(null);
    try {
      const qs = new URLSearchParams();
      qs.set('professional_id', selected);
      const res = await fetch(`/api/bookings?${qs.toString()}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Erro ao carregar agenda');
      setBookings(data.bookings || []);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected]);

  const grouped = useMemo(() => {
    const groups = new Map<string, BookingRow[]>();
    bookings.forEach(b => {
      const key = b.date;
      const arr = groups.get(key) || [];
      arr.push(b);
      groups.set(key, arr);
    });
    return Array.from(groups.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, [bookings]);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-white">Agenda por Profissional</h2>
        <div className="flex items-center gap-3">
          <CalendarIcon className="w-6 h-6 text-amber-400" />
          <select
            value={selected}
            onChange={e => setSelected(e.target.value)}
            className="bg-gray-800 text-white border border-gray-700 rounded px-3 py-2"
          >
            <option value="">Selecione o profissional</option>
            {professionals.map(p => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </div>
      </div>

      {error && <div className="text-red-400 mb-4">{error}</div>}

      {!selected && <div className="text-gray-400">Escolha um profissional para visualizar a agenda.</div>}
      {selected && loading && <div className="text-gray-300">Carregando agenda...</div>}

      {selected && !loading && grouped.length === 0 && (
        <div className="text-gray-400">Nenhum agendamento para este profissional.</div>
      )}

      {grouped.map(([date, rows]) => (
        <div key={date} className="mb-6">
          <h3 className="text-amber-400 font-bold text-lg mb-3 pb-2 border-b-2 border-gray-700">
            {new Date(date).toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' })}
          </h3>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {rows.sort((a,b) => a.time.localeCompare(b.time)).map(b => (
              <div key={b.booking_id} className="bg-gray-800 p-5 rounded-lg border border-gray-700">
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="text-lg font-bold text-white">{b.client_name}</h4>
                    <p className="text-sm text-gray-400">{b.client_phone}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-amber-400 text-lg">R${Number(b.total_price).toFixed(2)}</p>
                    <p className="text-sm text-gray-300">{b.time.slice(0,5)}</p>
                  </div>
                </div>
                <div className="border-t border-gray-600 my-3"></div>
                <div>
                  <h5 className="font-semibold mb-2 text-gray-200">Serviços:</h5>
                  <ul className="list-disc list-inside text-gray-300 space-y-1">
                    {(b.services || []).map(s => (
                      <li key={s.id}>{s.name}</li>
                    ))}
                  </ul>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

export default ScheduleView;

