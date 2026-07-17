export type UserRole = 'owner' | 'admin';
export type UserPlan = 'basic' | 'professional' | 'premium';
export type UserStatus = 'active' | 'blocked';

export interface User {
  uid: string;
  email: string;
  name: string;
  phone?: string;
  photoURL?: string;
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
  createdAt: string;
  updatedAt?: string;
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
