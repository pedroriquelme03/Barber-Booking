import React, { useState, useMemo } from 'react';
import { Routes, Route } from 'react-router-dom';
import { Service, Booking, Client } from './types';
import { MOCK_SERVICES } from './constants';
import Header from './components/Header';
import StepIndicator from './components/StepIndicator';
import ServiceSelector from './components/ServiceSelector';
import DateTimePicker from './components/DateTimePicker';
import UserDetailsForm from './components/UserDetailsForm';
import ConfirmationPage from './components/ConfirmationPage';
import Admin from './components/admin/Admin';

type Step = 'services' | 'datetime' | 'details' | 'confirmation';

const App: React.FC = () => {
  const [step, setStep] = useState<Step>('services');
  const [booking, setBooking] = useState<Partial<Booking>>({
    services: [],
  });

  const totalDuration = useMemo(() => 
    booking.services?.reduce((total, s) => total + s.duration, 0) || 0,
    [booking.services]
  );

  const totalPrice = useMemo(() => 
    booking.services?.reduce((total, s) => total + s.price, 0) || 0,
    [booking.services]
  );

  const handleSelectServices = (selectedServices: Service[]) => {
    setBooking(prev => ({ ...prev, services: selectedServices }));
  };

  const handleDateTimeSelect = (date: Date, time: string) => {
    setBooking(prev => ({ ...prev, date, time }));
    setStep('details');
  };

  const handleUserDetailsSubmit = (client: Client) => {
    setBooking(prev => ({ ...prev, client }));
    setStep('confirmation');
  };

  const startNewBooking = () => {
    setBooking({ services: [] });
    setStep('services');
  };

  const renderStep = () => {
    switch (step) {
      case 'services':
        return (
          <ServiceSelector
            services={MOCK_SERVICES}
            selectedServices={booking.services || []}
            onSelectServices={handleSelectServices}
            onNext={() => setStep('datetime')}
            totalDuration={totalDuration}
            totalPrice={totalPrice}
          />
        );
      case 'datetime':
        return (
          <DateTimePicker
            onBack={() => setStep('services')}
            onDateTimeSelect={handleDateTimeSelect}
            serviceDuration={totalDuration}
          />
        );
      case 'details':
        return (
          <UserDetailsForm
            onBack={() => setStep('datetime')}
            onSubmit={handleUserDetailsSubmit}
          />
        );
      case 'confirmation':
        return (
          <ConfirmationPage
            booking={booking as Booking}
            onNewBooking={startNewBooking}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100 font-sans">
      <Header />
      <main className="container mx-auto p-4 md:p-8">
        <Routes>
          <Route path="/admin" element={<Admin />} />
          <Route
            path="/"
            element={
              <>
                {step !== 'confirmation' && <StepIndicator currentStep={step} />}
                <div className="mt-8">
                  {renderStep()}
                </div>
              </>
            }
          />
        </Routes>
      </main>
    </div>
  );
};

export default App;
