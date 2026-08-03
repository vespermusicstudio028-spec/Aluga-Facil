export type UserRole = 'owner' | 'admin';
export type UserPlan = 'trial' | 'basic' | 'professional' | 'premium';
export type UserStatus = 'active' | 'blocked';

export interface User {
  uid: string;
  email: string;
  name: string;
  phone?: string;
  photoURL?: string;
  coverURL?: string;
  role: UserRole;
  plan: UserPlan;
  status: UserStatus;
  createdAt: string;
}

export type PropertyStatus = 'available' | 'rented' | 'maintenance';

export interface Property {
  id: string;
  ownerId: string;
  name: string;
  address: string;
  type: string;
  rentValue: number;
  status: PropertyStatus;
  groupName?: string;
  photos: string[];
  bedrooms?: number;
  bathrooms?: number;
  parkingSpaces?: number;
  area?: number;
  iptuValue?: number;
  condoValue?: number;
  zipCode?: string;
  lat?: number;
  lng?: number;
  floorPlanUrl?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface Resident {
  photo?: string;
  name: string;
  cpf: string;
  rg: string;
  birthDate: string;
  phone: string;
  email: string;
  profession: string;
  maritalStatus: string;
  isTitular: boolean;
  password?: string;
  documents: {
    rgFront?: string;
    rgBack?: string;
    cpf?: string;
    residenceProof?: string;
    incomeProof?: string;
  };
}

export interface Tenant {
  id: string;
  ownerId: string;
  propertyId: string;
  residents: Resident[];
  paymentMethod?: 'pix' | 'credit' | 'debit' | 'cash';
  pixKey?: string;
  dueDay?: string;
  leaseTerm?: string;
  startDate?: string;
  endDate?: string;
  signature?: string;
  ownerSignature?: string;
  contractAccepted?: boolean;
  contractPdf?: string;
  status?: 'active' | 'inactive' | 'ex_tenant';
  leaveDate?: string;
  entryDate?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface RentalHistory {
  id: string;
  ownerId: string;
  propertyId?: string;
  tenantId?: string;
  contractId?: string;
  startDate: string;
  leaveDate: string;
  reason: string;
  notes?: string;
  createdAt: string;
}

export type ContractStatus = 'pending' | 'signed_tenant' | 'signed_all' | 'active' | 'closed';

export interface Contract {
  id: string;
  ownerId: string;
  propertyId: string;
  tenantId: string;
  contractNumber: string;
  startDate: string;
  endDate: string;
  monthlyValue: number;
  dueDay: number;
  guaranteeValue: number;
  paymentMethod: 'PIX' | 'Transferência' | 'Boleto';
  pixKey?: string;
  status: ContractStatus;

  // Signature data
  tenantSignature?: string;
  landlordSignature?: string;
  signatureDate?: string;
  signatureTime?: string;
  signatureIP?: string;
  validationHash?: string;

  witnesses?: { name: string; cpf: string }[];

  clauses?: string;
  inspectionUrl?: string;
  inspectionAgreed?: boolean;

  createdAt: string;
  updatedAt?: string;
}

export type PaymentStatus = 'paid' | 'pending' | 'late';

export interface Payment {
  id: string;
  ownerId: string;
  contractId?: string;
  propertyId: string;
  tenantId: string;
  amount: number;
  dueDate: string;
  paidAt?: string;
  status: PaymentStatus;
  receiptUrl?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface Notification {
  id: string;
  userId: string;
  title: string;
  message: string;
  read: boolean;
  createdAt: string;
}

export type EventType = 'visit' | 'inspection' | 'maintenance' | 'renewal';
export type EventStatus = 'scheduled' | 'completed' | 'cancelled';

export interface CalendarEvent {
  id: string;
  ownerId: string;
  title: string;
  type: EventType;
  date: string;
  endDate?: string;
  propertyId?: string;
  tenantId?: string;
  notes?: string;
  status: EventStatus;
  createdAt: string;
}

export type TicketPriority = 'low' | 'medium' | 'high' | 'urgent';
export type TicketStatus = 'open' | 'in_progress' | 'waiting_approval' | 'resolved' | 'cancelled';

export interface MaintenanceTicket {
  id: string;
  ownerId: string;
  propertyId: string;
  tenantId?: string;
  title: string;
  description: string;
  priority: TicketPriority;
  status: TicketStatus;
  estimatedCost?: number;
  photos: string[];
  createdAt: string;
  updatedAt: string;
}

export type DocumentCategory =
  | 'escritura'
  | 'iptu'
  | 'contrato'
  | 'vistoria'
  | 'rg'
  | 'cpf'
  | 'comprovante_renda'
  | 'comprovante_residencia'
  | 'outro';

export interface VaultDocument {
  id: string;
  ownerId: string;
  propertyId?: string;
  tenantId?: string;
  category: DocumentCategory;
  title: string;
  fileUrl: string;
  fileType: string;
  createdAt: string;
}

export interface TenantRating {
  id: string;
  ownerId: string;
  tenantId: string;
  punctuality: number;   // 1-5
  conservation: number;  // 1-5
  communication: number; // 1-5
  notes?: string;
  createdAt: string;
}
