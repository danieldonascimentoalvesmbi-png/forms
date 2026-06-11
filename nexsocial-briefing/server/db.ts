import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { createClient } from '@supabase/supabase-js';

const DATA_FILE = path.join(process.cwd(), 'database.json');
const JWT_SECRET = process.env.JWT_SECRET || 'dqb-system-secret-key-2026';

// Initialize Supabase if credentials are provided in the environment variables
const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || '';

export const supabase = supabaseUrl && supabaseAnonKey
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

let cachedDb: DatabaseSchema | null = null;

// Database Schemas Types
export interface User {
  id: string;
  username: string;
  passwordHash: string;
  createdAt: string;
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
  colors: {
    primary: string; // e.g. #D90429
    bg: string;      // e.g. #0A0A0A
    text: string;    // e.g. #FFFFFF
    card: string;    // e.g. #111111
  };
}

export interface Form {
  id: string;
  name: string;
  description: string;
  createdAt: string;
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

export interface ResponseAnswer {
  id: string;
  responseId: string;
  fieldId: string;
  value: any; // Checked options as array or normal string
}

export interface DatabaseSchema {
  users: User[];
  forms: Form[];
  form_fields: FormField[];
  form_responses: FormResponse[];
  response_answers: ResponseAnswer[];
  settings: Settings;
}

// PBKDF2 Password Hashing
export function hashPassword(password: string): string {
  const salt = 'dqb-salt';
  return crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
}

export function verifyPassword(password: string, hash: string): boolean {
  return hashPassword(password) === hash;
}

// Token Signature Implementation (Pure JS Alternative to JsonWebToken)
export function signToken(payload: any): string {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const exp = Math.floor(Date.now() / 1000) + (24 * 60 * 60); // 24 hours
  const body = Buffer.from(JSON.stringify({ ...payload, exp })).toString('base64url');
  const signature = crypto.createHmac('sha256', JWT_SECRET).update(`${header}.${body}`).digest('base64url');
  return `${header}.${body}.${signature}`;
}

export function verifyToken(token: string): any {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const [header, body, signature] = parts;
    const expectedSignature = crypto.createHmac('sha256', JWT_SECRET).update(`${header}.${body}`).digest('base64url');
    if (signature !== expectedSignature) return null;
    
    const payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf8'));
    if (payload.exp && Math.floor(Date.now() / 1000) > payload.exp) {
      return null; // Expired
    }
    return payload;
  } catch (e) {
    return null;
  }
}

// Default initial state
const INITIAL_DATABASE: DatabaseSchema = {
  users: [
    {
      id: 'admin-user',
      username: 'admin',
      passwordHash: hashPassword('Nex#forms'),
      createdAt: new Date().toISOString()
    }
  ],
  forms: [
    {
      id: 'briefing-form',
      name: 'Formulário de Cadastro e Desenvolvimento',
      description: 'Preencha as informações abaixo para que possamos desenvolver seu projeto de forma personalizada.',
      createdAt: new Date().toISOString()
    }
  ],
  settings: {
    logo: 'NexSocial',
    siteName: 'NexSocial',
    slogan: 'Formulário de Briefing de Alta Conversão',
    email: 'contato@nexsocial.com.br',
    whatsapp: '62999407906',
    phone: '62999407906',
    facebook: 'https://facebook.com/nexsocialbr',
    instagram: 'https://instagram.com/nexsocialbr',
    colors: {
      primary: '#D90429',
      bg: '#0A0A0A',
      text: '#FFFFFF',
      card: '#121212'
    }
  },
  form_fields: [
    // ETAPA 1: DADOS DO RESPONSÁVEL
    {
      id: 'clientName',
      formId: 'briefing-form',
      type: 'text',
      label: 'Nome Completo',
      placeholder: 'Digite seu nome completo',
      required: true,
      step: 1,
      order: 1,
      hidden: false
    },
    {
      id: 'whatsapp',
      formId: 'briefing-form',
      type: 'tel',
      label: 'WhatsApp',
      placeholder: 'Ex: (62) 99940-7906',
      required: true,
      step: 1,
      order: 2,
      hidden: false
    },
    {
      id: 'email',
      formId: 'briefing-form',
      type: 'email',
      label: 'E-mail',
      placeholder: 'Ex: exemplo@email.com',
      required: true,
      step: 1,
      order: 3,
      hidden: false
    },

    // ETAPA 2: SOBRE A EMPRESA
    {
      id: 'aboutCompany',
      formId: 'briefing-form',
      type: 'textarea',
      label: 'Conte um pouco sobre a empresa',
      placeholder: 'Fale um pouco sobre a história e o que a empresa faz...',
      required: true,
      step: 2,
      order: 1,
      hidden: false
    },
    {
      id: 'actingTime',
      formId: 'briefing-form',
      type: 'text',
      label: 'Há quanto tempo atua no mercado?',
      placeholder: 'Ex: 5 anos, 10 anos...',
      required: true,
      step: 2,
      order: 2,
      hidden: false
    },
    {
      id: 'companyMission',
      formId: 'briefing-form',
      type: 'text',
      label: 'Qual a missão da empresa?',
      placeholder: 'Qual o principal propósito ou missão da marca...',
      required: true,
      step: 2,
      order: 3,
      hidden: false
    },
    {
      id: 'companyDifferentials',
      formId: 'briefing-form',
      type: 'textarea',
      label: 'Quais são os principais diferenciais da empresa?',
      placeholder: 'O que diferencia vocês da concorrência...',
      required: true,
      step: 2,
      order: 4,
      hidden: false
    },
    {
      id: 'whyChooseUs',
      formId: 'briefing-form',
      type: 'textarea',
      label: 'Por que uma família deve escolher vocês?',
      placeholder: 'O que torna seu atendimento único e de extrema confiança?',
      required: true,
      step: 2,
      order: 5,
      hidden: false
    },

    // ETAPA 3: SERVIÇOS
    {
      id: 'servicesOffered',
      formId: 'briefing-form',
      type: 'checkbox',
      label: 'Quais serviços vocês oferecem?',
      placeholder: 'Marque todos os serviços aplicáveis',
      required: true,
      options: [
        'Internação Voluntária',
        'Internação Involuntária',
        'Remoção 24 Horas',
        'Acompanhamento Familiar',
        'Acompanhamento Pós-Internação',
        'Dependência Química',
        'Alcoolismo',
        'Saúde Mental'
      ],
      step: 3,
      order: 1,
      hidden: false
    },

    // ETAPA 4: CONVÊNIOS
    {
      id: 'whichInsurances',
      formId: 'briefing-form',
      type: 'text',
      label: 'Quais convênios são aceitos?',
      placeholder: 'Ex: Bradesco, Amil, SulAmérica (ou digite "Nenhum" caso se aplique)',
      required: true,
      step: 4,
      order: 1,
      hidden: false
    },
    {
      id: 'privateOption',
      formId: 'briefing-form',
      type: 'radio',
      label: 'Atendimento particular',
      placeholder: 'Selecione uma opção',
      required: true,
      options: [
        'Sim, possui atendimento particular',
        'Não possui atendimento particular'
      ],
      step: 4,
      order: 2,
      hidden: false
    },
    {
      id: 'installmentOption',
      formId: 'briefing-form',
      type: 'radio',
      label: 'Parcelamento',
      placeholder: 'Selecione uma opção',
      required: true,
      options: [
        'Sim, possui parcelamento',
        'Não possui parcelamento'
      ],
      step: 4,
      order: 3,
      hidden: false
    },

    // ETAPA 5: ATENDIMENTO
    {
      id: 'citiesServed',
      formId: 'briefing-form',
      type: 'text',
      label: 'Quais cidades de São Paulo atendem?',
      placeholder: 'Ex: São Paulo, Campinas, São Bernardo, etc.',
      required: true,
      step: 5,
      order: 1,
      hidden: false
    },
    {
      id: 'grandeSpOption',
      formId: 'briefing-form',
      type: 'radio',
      label: 'Atende toda Grande São Paulo?',
      placeholder: 'Selecione uma opção',
      required: true,
      options: [
        'Sim, atende toda Grande São Paulo',
        'Não'
      ],
      step: 5,
      order: 2,
      hidden: false
    },

    // ETAPA 6: CONTATOS
    {
      id: 'mainWhatsapp',
      formId: 'briefing-form',
      type: 'tel',
      label: 'WhatsApp Principal',
      placeholder: 'Ex: (11) 99999-9999',
      required: true,
      step: 6,
      order: 1,
      hidden: false
    },
    {
      id: 'mainPhone',
      formId: 'briefing-form',
      type: 'tel',
      label: 'Telefone',
      placeholder: 'Ex: (11) 4003-8888',
      required: true,
      step: 6,
      order: 2,
      hidden: false
    },
    {
      id: 'businessEmail',
      formId: 'briefing-form',
      type: 'email',
      label: 'E-mail Comercial',
      placeholder: 'Ex: comercial@empresa.com.br',
      required: true,
      step: 6,
      order: 3,
      hidden: false
    }
  ],
  form_responses: [],
  response_answers: []
};

// Helper to read the local database JSON as fallback
function getDatabaseLocal(): DatabaseSchema {
  try {
    if (!fs.existsSync(DATA_FILE)) {
      fs.writeFileSync(DATA_FILE, JSON.stringify(INITIAL_DATABASE, null, 2), 'utf-8');
      return INITIAL_DATABASE;
    }
    const content = fs.readFileSync(DATA_FILE, 'utf-8');
    const db = JSON.parse(content);
    
    // Always force update core settings, forms, form_fields, and users to guarantee consistency and password reset
    db.settings = INITIAL_DATABASE.settings;
    db.forms = INITIAL_DATABASE.forms;
    db.form_fields = INITIAL_DATABASE.form_fields;
    db.users = INITIAL_DATABASE.users;
    if (!db.form_responses) { db.form_responses = INITIAL_DATABASE.form_responses; }
    if (!db.response_answers) { db.response_answers = INITIAL_DATABASE.response_answers; }
    
    fs.writeFileSync(DATA_FILE, JSON.stringify(db, null, 2), 'utf-8');
    return db;
  } catch (error) {
    console.error("Failed to read local database, falling back to initial", error);
    return INITIAL_DATABASE;
  }
}

// Database Reader and Writer with Thread-Safe Access
export function getDatabase(): DatabaseSchema {
  if (cachedDb) {
    return cachedDb;
  }
  cachedDb = getDatabaseLocal();
  return cachedDb;
}

export function saveDatabase(db: DatabaseSchema) {
  cachedDb = db;
  
  // 1. Keep a local file save as fallback
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(db, null, 2), 'utf-8');
  } catch (error) {
    console.error("Failed to save database locally", error);
  }
  
  // 2. Sync to Supabase asynchronously if credentials are set
  if (supabase) {
    (async () => {
      try {
        const { error } = await supabase
          .from('briefing_app_data')
          .upsert({ id: 'main_database', content: db });
        
        if (error) {
          console.error("Failed to sync database to Supabase:", error.message);
        } else {
          console.log("Successfully synchronized database state with Supabase cloud!");
        }
      } catch (err) {
        console.error("Unexpected error saving database to Supabase:", err);
      }
    })();
  }
}

// Initialize and sync Supabase data on server startup
export async function initDatabase() {
  if (!supabase) {
    console.log("Supabase URL and Key are not set. Running purely in local file system mode.");
    return;
  }

  try {
    console.log("Supabase variables active. Downloading latest cloud state...");
    
    const { data, error } = await supabase
      .from('briefing_app_data')
      .select('content')
      .eq('id', 'main_database')
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        // Record doesn't exist, create it with our current local database state
        console.log("No existing briefing record in Supabase. Creating initial schema in Supabase...");
        const localDb = getDatabaseLocal();
        const { error: insertError } = await supabase
          .from('briefing_app_data')
          .insert([{ id: 'main_database', content: localDb }]);
        
        if (insertError) {
          console.error("Failed to insert initial database in Supabase:", insertError.message);
          console.error("Make sure your Supabase table 'briefing_app_data' exists and has columns [id: text, content: jsonb].");
        } else {
          cachedDb = localDb;
          console.log("Successfully uploaded initial database to Supabase!");
        }
      } else {
        console.error("Supabase error fetching database:", error.message);
        console.error("Make sure your Supabase table 'briefing_app_data' has been created via SQL.");
        console.log("Continuing with local fallback JSON.");
      }
    } else if (data && data.content) {
      cachedDb = data.content;
      console.log("Successfully synchronized with Supabase database! Answers and responses are now persistent.");
    }
  } catch (err: any) {
    console.error("Failed to connect to Supabase database:", err.message);
  }
}
