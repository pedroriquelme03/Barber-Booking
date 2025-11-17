
import React from 'react';
import { ScissorsIcon } from './icons';
import { BARBERSHOP_NAME } from '../constants';

interface HeaderProps {
  onBookNowClick: () => void;
}

const Header: React.FC<HeaderProps> = ({ onBookNowClick }) => {
  return (
    <header className="bg-gray-800/50 backdrop-blur-sm sticky top-0 z-50 border-b border-gray-700">
      <div className="container mx-auto flex justify-between items-center p-4">
        <div className="flex items-center space-x-3">
          <ScissorsIcon className="h-8 w-8 text-amber-400" />
          <h1 className="text-xl md:text-2xl font-bold tracking-wider text-white">
            {BARBERSHOP_NAME}
          </h1>
        </div>
        <button
          onClick={onBookNowClick}
          className="bg-amber-500 hover:bg-amber-400 text-gray-900 font-bold py-2 px-4 rounded-lg transition-colors duration-300"
        >
          Agendar agora
        </button>
      </div>
    </header>
  );
};

export default Header;
