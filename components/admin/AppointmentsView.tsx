import React from 'react';
import { Booking } from '../../types';
import { MOCK_BOOKINGS } from '../../admin-constants';
import { CalendarIcon, ClockIcon, DollarSignIcon, UserIcon } from '../icons';

const AppointmentCard: React.FC<{ booking: Booking }> = ({ booking }) => {
    const totalPrice = booking.services.reduce((acc, s) => acc + s.price, 0);

    return (
        <div className="bg-gray-800 p-5 rounded-lg border border-gray-700 hover:border-amber-500 transition-colors duration-300">
            <div className="flex justify-between items-start">
                <div>
                    <h3 className="text-lg font-bold text-white">{booking.client.name}</h3>
                    <p className="text-sm text-gray-400">{booking.client.phone}</p>
                </div>
                <div className="text-right">
                    <p className="font-bold text-amber-400 text-lg">R${totalPrice.toFixed(2)}</p>
                    <p className="text-sm text-gray-300">{booking.time}</p>
                </div>
            </div>
            <div className="border-t border-gray-600 my-3"></div>
            <div>
                <h4 className="font-semibold mb-2 text-gray-200">Serviços:</h4>
                <ul className="list-disc list-inside text-gray-300 space-y-1">
                    {booking.services.map(s => <li key={s.id}>{s.name}</li>)}
                </ul>
            </div>
            {booking.client.notes && (
                <div className="mt-3 pt-3 border-t border-gray-600">
                    <p className="text-sm text-gray-400"><span className="font-semibold text-gray-200">Obs:</span> {booking.client.notes}</p>
                </div>
            )}
        </div>
    )
}

const AppointmentsView: React.FC = () => {
    const upcomingBookings = MOCK_BOOKINGS.sort((a,b) => a.date.getTime() - b.date.getTime());
    
    // Group bookings by date
    const groupedBookings = upcomingBookings.reduce((acc, booking) => {
        const dateString = booking.date.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' });
        if(!acc[dateString]) {
            acc[dateString] = [];
        }
        acc[dateString].push(booking);
        return acc;
    }, {} as Record<string, Booking[]>);


  return (
    <div>
      <h2 className="text-2xl font-bold text-white mb-6">Próximos Agendamentos</h2>
      <div className="space-y-6">
        {Object.entries(groupedBookings).map(([date, bookings]) => (
            <div key={date}>
                <h3 className="text-amber-400 font-bold text-lg mb-3 pb-2 border-b-2 border-gray-700">{date}</h3>
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {bookings.sort((a,b) => a.time.localeCompare(b.time)).map((booking, index) => (
                        <AppointmentCard key={index} booking={booking} />
                    ))}
                </div>
            </div>
        ))}
      </div>
    </div>
  );
};

export default AppointmentsView;
