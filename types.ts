
export interface Service {
  id: number;
  name: string;
  price: number;
  duration: number; // in minutes
  description: string;
}

export interface Client {
  name: string;
  phone: string;
  email: string;
  notes?: string;
}

export interface Booking {
  services: Service[];
  date: Date;
  time: string;
  client: Client;
}
