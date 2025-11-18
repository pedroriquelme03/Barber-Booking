import React, { useState } from 'react';
import { Service } from '../../types';
import { MOCK_SERVICES } from '../../constants';
import { ClockIcon, DollarSignIcon, PencilIcon, PlusCircleIcon, TrashIcon } from '../icons';
import ServiceModal from './ServiceModal';

const ServicesView: React.FC = () => {
  const [services, setServices] = useState<Service[]>(MOCK_SERVICES);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingService, setEditingService] = useState<Service | null>(null);

  const handleOpenModal = (service: Service | null = null) => {
    setEditingService(service);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingService(null);
  };

  const handleSaveService = (service: Service) => {
    if (editingService) {
      setServices(services.map(s => s.id === service.id ? service : s));
    } else {
      const newService = { ...service, id: Math.max(...services.map(s => s.id)) + 1 };
      setServices([...services, newService]);
    }
    handleCloseModal();
  };
  
  const handleDeleteService = (serviceId: number) => {
      if(window.confirm("Tem certeza que deseja excluir este serviço?")) {
          setServices(services.filter(s => s.id !== serviceId));
      }
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-white">Gerenciar Serviços</h2>
        <button
          onClick={() => handleOpenModal()}
          className="flex items-center space-x-2 bg-amber-500 hover:bg-amber-400 text-gray-900 font-bold py-2 px-4 rounded-lg transition-colors"
        >
          <PlusCircleIcon className="w-5 h-5" />
          <span>Novo Serviço</span>
        </button>
      </div>

      <div className="bg-gray-800 border border-gray-700 rounded-lg overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-gray-700/50">
            <tr>
              <th className="p-4 font-semibold">Serviço</th>
              <th className="p-4 font-semibold text-center">Duração</th>
              <th className="p-4 font-semibold text-center">Preço</th>
              <th className="p-4 font-semibold text-right">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-700">
            {services.map(service => (
              <tr key={service.id} className="hover:bg-gray-700/40">
                <td className="p-4">
                    <p className="font-bold">{service.name}</p>
                    <p className="text-sm text-gray-400 max-w-md">{service.description}</p>
                </td>
                <td className="p-4 text-center">
                    <span className="flex items-center justify-center"><ClockIcon className="w-4 h-4 mr-1.5 text-amber-400"/> {service.duration} min</span>
                </td>
                <td className="p-4 text-center">
                    <span className="flex items-center justify-center"><DollarSignIcon className="w-4 h-4 mr-1.5 text-amber-400"/> R${service.price.toFixed(2)}</span>
                </td>
                <td className="p-4 text-right">
                    <div className="inline-flex space-x-3">
                        <button onClick={() => handleOpenModal(service)} className="text-gray-300 hover:text-blue-400"><PencilIcon className="w-5 h-5"/></button>
                        <button onClick={() => handleDeleteService(service.id)} className="text-gray-300 hover:text-red-400"><TrashIcon className="w-5 h-5"/></button>
                    </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {isModalOpen && (
        <ServiceModal
          service={editingService}
          onClose={handleCloseModal}
          onSave={handleSaveService}
        />
      )}
    </div>
  );
};

export default ServicesView;
