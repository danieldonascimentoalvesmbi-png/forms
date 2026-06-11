export interface Colors {
  primary: string;
  bg: string;
  text: string;
  card: string;
}

export interface Settings {
  logo: string;
  siteName: string;
  slogan: string;
  email: string;
  whatsapp: string;
  phone: string;
  facebook: string;
  instagram: string;
  colors: Colors;
}

export interface FormField {
  id: string;
  formId: string;
  type: 'text' | 'textarea' | 'checkbox' | 'radio' | 'select' | 'number' | 'email' | 'tel';
  label: string;
  placeholder: string;
  required: boolean;
  options?: string[];
  step: number;
  order: number;
  hidden: boolean;
}

export interface FormResponse {
  id: string;
  formId: string;
  companyName: string;
  city: string;
  email: string;
  whatsapp: string;
  createdAt: string;
  status: 'unread' | 'read' | 'replied';
  internalNotes: string;
}

export interface DetailedAnswer {
  fieldId: string;
  label: string;
  step: number;
  type: string;
  value: any;
}

export interface DetailedResponse {
  response: FormResponse;
  answers: DetailedAnswer[];
}

export interface DashboardStats {
  total: number;
  totalToday: number;
  totalThisWeek: number;
  totalThisMonth: number;
  recent: FormResponse[];
}

export interface AuthSession {
  token: string | null;
  username: string | null;
}
