import React, { useState, useEffect } from 'react';
import { 
  Activity, 
  Phone, 
  Shield, 
  Lock, 
  LayoutDashboard, 
  CheckCircle, 
  Circle, 
  ChevronLeft, 
  ChevronRight, 
  Search, 
  FileText, 
  Settings as SettingsIcon, 
  HelpCircle, 
  Info, 
  Users, 
  Plus, 
  Trash2, 
  Edit, 
  Save, 
  Download, 
  Award, 
  Mail, 
  MapPin, 
  Sparkles, 
  Globe, 
  Printer,
  Check, 
  ExternalLink,
  RefreshCw,
  Eye,
  EyeOff,
  Sliders
} from 'lucide-react';
import Header from './components/Header';
import { 
  Settings, 
  FormField, 
  FormResponse, 
  DetailedAnswer, 
  DetailedResponse, 
  DashboardStats,
  Colors
} from './types';

export default function App() {
  // Navigation State
  const [currentView, setView] = useState<'home' | 'form' | 'admin'>('form');
  const [adminSubTab, setAdminSubTab] = useState<'dashboard' | 'responses' | 'fields' | 'settings'>('dashboard');

  // App Configuration
  const [settings, setSettings] = useState<Settings>({
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
  });

  // Flow State
  const [loading, setLoading] = useState<boolean>(true);
  const [fields, setFields] = useState<FormField[]>([]);
  const [wizardAnswers, setWizardAnswers] = useState<Record<string, any>>({});
  const [wizardStep, setWizardStep] = useState<number>(1);
  const [totalSteps, setTotalSteps] = useState<number>(12);
  const [formSubmitted, setFormSubmitted] = useState<boolean>(false);
  const [formSubmitError, setFormSubmitError] = useState<string | null>(null);

  // Auth administrative state
  const [authSession, setAuthSession] = useState<{ token: string | null; username: string | null }>({
    token: localStorage.getItem('dqb_token'),
    username: localStorage.getItem('dqb_username')
  });
  const [loginForm, setLoginForm] = useState({ username: '', password: '' });
  const [loginError, setLoginError] = useState<string | null>(null);

  // Administrative Data State
  const [dashboardStats, setDashboardStats] = useState<DashboardStats>({
    total: 0,
    totalToday: 0,
    totalThisWeek: 0,
    totalThisMonth: 0,
    recent: []
  });
  const [adminResponses, setAdminResponses] = useState<FormResponse[]>([]);
  const [adminSearchQuery, setAdminSearchQuery] = useState<string>('');
  const [selectedResponseId, setSelectedResponseId] = useState<string | null>(null);
  const [selectedResponseDetail, setSelectedResponseDetail] = useState<DetailedResponse | null>(null);
  const [detailLoading, setDetailLoading] = useState<boolean>(false);
  const [editingDetail, setEditingDetail] = useState<boolean>(false);
  const [editableAnswers, setEditableAnswers] = useState<Record<string, any>>({});
  const [detailNotes, setDetailNotes] = useState<string>('');

  // Fields and Questions Manager state
  const [isAddingField, setIsAddingField] = useState<boolean>(false);
  const [newFieldData, setNewFieldData] = useState<Partial<FormField>>({
    id: '',
    type: 'text',
    label: '',
    placeholder: '',
    required: false,
    options: [],
    step: 1,
    order: 10,
    hidden: false
  });
  const [newFieldOptionInput, setNewFieldOptionInput] = useState<string>('');
  const [editingFieldId, setEditingFieldId] = useState<string | null>(null);
  const [editingFieldData, setEditingFieldData] = useState<Partial<FormField>>({});

  // SEO configuration preview state
  const [seoMeta, setSeoMeta] = useState<any>(null);

  // Toast Notifications system state
  const [toasts, setToasts] = useState<{ id: string; msg: string; type: 'success' | 'error' | 'info' }[]>([]);

  const addToast = (msg: string, type: 'success' | 'error' | 'info' = 'success') => {
    const id = Math.random().toString(36).substr(2, 9);
    setToasts(prev => [...prev, { id, msg, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 5000);
  };

  // Fetch Public Information & Setup Data
  useEffect(() => {
    fetchPublicData();
    fetchSeoMeta();
  }, []);

  const fetchPublicData = async () => {
    setLoading(true);
    try {
      const setRes = await fetch('/api/public-settings');
      if (setRes.ok) {
        const setJson = await setRes.json();
        setSettings(setJson);
      }
      
      const fRes = await fetch('/api/form-fields');
      if (fRes.ok) {
        const fJson = await fRes.json();
        setFields(fJson);
        // Find the maximum step number
        const maxStep = fJson.reduce((max: number, current: FormField) => current.step > max ? current.step : max, 1);
        setTotalSteps(maxStep);
      }
    } catch (e) {
      console.error("Error fetching configs", e);
      addToast("Erro ao conectar com o servidor.", "error");
    } finally {
      setLoading(false);
    }
  };

  const fetchSeoMeta = async () => {
    try {
      const res = await fetch('/api/seo-meta');
      if (res.ok) {
        const json = await res.json();
        setSeoMeta(json);
      }
    } catch (e) {
      console.log(e);
    }
  };

  // Fetch Admin Related Data when authenticated
  useEffect(() => {
    if (authSession.token) {
      fetchAdminStats();
      fetchAdminResponses();
    }
  }, [authSession.token, adminSearchQuery]);

  const fetchAdminStats = async () => {
    try {
      const res = await fetch('/api/admin/dashboard', {
        headers: { 'Authorization': `Bearer ${authSession.token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setDashboardStats(data);
      } else {
        handleAuthError(res.status);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchAdminResponses = async () => {
    try {
      const url = adminSearchQuery 
        ? `/api/admin/responses?query=${encodeURIComponent(adminSearchQuery)}` 
        : '/api/admin/responses';
      const res = await fetch(url, {
        headers: { 'Authorization': `Bearer ${authSession.token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setAdminResponses(data);
      } else {
        handleAuthError(res.status);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const loadResponseDetail = async (id: string) => {
    setDetailLoading(true);
    setEditingDetail(false);
    try {
      const res = await fetch(`/api/admin/responses/${id}`, {
        headers: { 'Authorization': `Bearer ${authSession.token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setSelectedResponseDetail(data);
        setSelectedResponseId(id);
        setDetailNotes(data.response.internalNotes || '');
        // Load initial answers for inline editing
        const ansRecord: Record<string, any> = {};
        data.answers.forEach((ans: DetailedAnswer) => {
          ansRecord[ans.fieldId] = ans.value;
        });
        setEditableAnswers(ansRecord);
      } else {
        addToast("Não foi possível carregar os detalhes do briefing.", "error");
      }
    } catch (e) {
      addToast("Erro na requisição dos detalhes.", "error");
    } finally {
      setDetailLoading(false);
    }
  };

  const updateResponseStatus = async (id: string, nextStatus: 'read' | 'unread' | 'replied') => {
    try {
      const res = await fetch(`/api/admin/responses/${id}/status`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authSession.token}` 
        },
        body: JSON.stringify({ status: nextStatus })
      });
      if (res.ok) {
        addToast(`Status atualizado para: ${nextStatus === 'read' ? 'Lido' : nextStatus === 'replied' ? 'Respondido' : 'Não lido'}`);
        // Refresh local listing
        fetchAdminResponses();
        fetchAdminStats();
        // Refresh detail if shown
        if (selectedResponseId === id && selectedResponseDetail) {
          setSelectedResponseDetail({
            ...selectedResponseDetail,
            response: { ...selectedResponseDetail.response, status: nextStatus }
          });
        }
      } else {
        addToast("Falha ao salvar status.", "error");
      }
    } catch (e) {
      addToast("Erro ao conectar ao servidor.", "error");
    }
  };

  const saveInternalNotes = async () => {
    if (!selectedResponseId) return;
    try {
      const res = await fetch(`/api/admin/responses/${selectedResponseId}/notes`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authSession.token}`
        },
        body: JSON.stringify({ notes: detailNotes })
      });
      if (res.ok) {
        addToast("Anotações internas salvas com sucesso!");
        if (selectedResponseDetail) {
          setSelectedResponseDetail({
            ...selectedResponseDetail,
            response: { ...selectedResponseDetail.response, internalNotes: detailNotes }
          });
        }
        fetchAdminResponses();
      } else {
        addToast("Falha ao salvar anotações.", "error");
      }
    } catch (e) {
      addToast("Erro ao salvar observação.", "error");
    }
  };

  const saveResponseEdits = async () => {
    if (!selectedResponseId || !selectedResponseDetail) return;
    try {
      const payload = {
        companyName: editableAnswers['companyName'] || selectedResponseDetail.response.companyName,
        city: editableAnswers['mainCity'] || selectedResponseDetail.response.city,
        email: editableAnswers['email'] || selectedResponseDetail.response.email,
        whatsapp: editableAnswers['whatsapp'] || selectedResponseDetail.response.whatsapp,
        answers: editableAnswers
      };

      const res = await fetch(`/api/admin/responses/${selectedResponseId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authSession.token}`
        },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        addToast("Dados do briefing editados com sucesso no painel!");
        setEditingDetail(false);
        // Refresh details
        loadResponseDetail(selectedResponseId);
        fetchAdminResponses();
      } else {
        const err = await res.json();
        addToast(err.error || "Erro ao editar registro.", "error");
      }
    } catch (e) {
      addToast("Erro de rede ao salvar edições.", "error");
    }
  };

  const deleteResponse = async (id: string) => {
    if (!window.confirm("Você tem certeza absoluta que deseja excluir permanentemente esta resposta do briefing?")) {
      return;
    }
    try {
      const res = await fetch(`/api/admin/responses/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${authSession.token}` }
      });
      if (res.ok) {
        addToast("Resposta excluída permanentemente.");
        setSelectedResponseId(null);
        setSelectedResponseDetail(null);
        fetchAdminResponses();
        fetchAdminStats();
      } else {
        addToast("Não foi possível excluir o briefing.", "error");
      }
    } catch (e) {
      addToast("Erro ao processar exclusão.", "error");
    }
  };

  const handleAuthError = (status: number) => {
    if (status === 401) {
      addToast("Sessão expirada. Faça login novamente.", "error");
      handleLogout();
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('dqb_token');
    localStorage.removeItem('dqb_username');
    setAuthSession({ token: null, username: null });
    addToast("Logout efetuado com sucesso.");
    setView('home');
  };

  // Login Execution
  const executeLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(null);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(loginForm)
      });
      const data = await res.json();
      if (res.ok) {
        localStorage.setItem('dqb_token', data.token);
        localStorage.setItem('dqb_username', data.username);
        setAuthSession({ token: data.token, username: data.username });
        addToast("Bem-vindo ao Painel Administrativo!");
        setAdminSubTab('dashboard');
        // Clear login form fields
        setLoginForm({ username: '', password: '' });
      } else {
        setLoginError(data.error || "Credenciais administrativas inválidas.");
      }
    } catch (e) {
      setLoginError("Erro ao comunicar com o servidor de autenticação de segurança.");
    }
  };

  // Wizard Navigation & Management
  const handleWizardNext = () => {
    // Validate current step fields
    const currentStepFields = fields.filter(f => f.step === wizardStep);
    const missingFields: string[] = [];
    
    currentStepFields.forEach(f => {
      if (f.required) {
        const val = wizardAnswers[f.id];
        if (val === undefined || val === null || val === '' || (Array.isArray(val) && val.length === 0)) {
          missingFields.push(f.label);
        }
      }
    });

    if (missingFields.length > 0) {
      addToast(`Por favor, preencha o campo obrigatório: ${missingFields[0]}`, "error");
      return;
    }

    if (wizardStep < totalSteps) {
      setWizardStep(prev => prev + 1);
      // Smooth scroll to top of form section
      const target = document.getElementById('wizard-form-card');
      if (target) {
        target.scrollIntoView({ behavior: 'smooth' });
      }
    } else {
      submitWizardResponse();
    }
  };

  const handleWizardBack = () => {
    if (wizardStep > 1) {
      setWizardStep(prev => prev - 1);
      const target = document.getElementById('wizard-form-card');
      if (target) {
        target.scrollIntoView({ behavior: 'smooth' });
      }
    }
  };

  const handleFieldChange = (fieldId: string, value: any, isCheckbox: boolean = false) => {
    if (isCheckbox) {
      const currentVal = wizardAnswers[fieldId] || [];
      let nextVal = [];
      if (currentVal.includes(value)) {
        nextVal = currentVal.filter((v: any) => v !== value);
      } else {
        nextVal = [...currentVal, value];
      }
      setWizardAnswers(prev => ({ ...prev, [fieldId]: nextVal }));
    } else {
      setWizardAnswers(prev => ({ ...prev, [fieldId]: value }));
    }
  };

  const submitWizardResponse = async () => {
    setFormSubmitError(null);
    setLoading(true);
    try {
      const res = await fetch('/api/form-responses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ answers: wizardAnswers })
      });
      const data = await res.json();
      if (res.ok) {
        setFormSubmitted(true);
        addToast("Seu briefing foi catalogado com sucesso!");
        // Clear variables
        setWizardAnswers({});
        setWizardStep(1);
      } else {
        setFormSubmitError(data.error || "Erro ao salvar seu formulário.");
        addToast(data.error || "Erro ao registrar briefing.", "error");
      }
    } catch (e) {
      setFormSubmitError("Erro de comunicação com os servidores da instituição.");
      addToast("Falha de conexão com os serviços.", "error");
    } finally {
      setLoading(false);
    }
  };

  // Dynamic Questions / Fields Manager
  const createNewField = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFieldData.id?.trim() || !newFieldData.label?.trim()) {
      addToast("ID e Rótulo da pergunta são obrigatórios.", "error");
      return;
    }
    try {
      const res = await fetch('/api/admin/form-fields', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authSession.token}`
        },
        body: JSON.stringify(newFieldData)
      });
      const data = await res.json();
      if (res.ok) {
        addToast("Nova pergunta cadastrada!");
        setIsAddingField(false);
        // Clear entry
        setNewFieldData({
          id: '',
          type: 'text',
          label: '',
          placeholder: '',
          required: false,
          options: [],
          step: 1,
          order: 10,
          hidden: false
        });
        fetchPublicData(); // Refresh fields in layout
      } else {
        addToast(data.error || "Erro ao registrar nova pergunta.", "error");
      }
    } catch (e) {
      addToast("Erro na requisição para criação.", "error");
    }
  };

  const updateFieldProperties = async (fieldId: string, updatedParams: Partial<FormField>) => {
    try {
      const res = await fetch(`/api/admin/form-fields/${fieldId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authSession.token}`
        },
        body: JSON.stringify(updatedParams)
      });
      if (res.ok) {
        addToast("Configuração da pergunta atualizada!");
        setEditingFieldId(null);
        fetchPublicData();
      } else {
        const data = await res.json();
        addToast(data.error || "Falha ao editar pergunta.", "error");
      }
    } catch (e) {
      addToast("Erro ao conectar com o gerenciador de formulários.", "error");
    }
  };

  const deleteFormField = async (fieldId: string) => {
    if (!window.confirm("Aviso: Excluir esta pergunta impedirá que novos formulários respondam a ela. Deseja continuar?")) {
      return;
    }
    try {
      const res = await fetch(`/api/admin/form-fields/${fieldId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${authSession.token}` }
      });
      if (res.ok) {
        addToast("Pergunta removida com sucesso de todos as etapas.");
        fetchPublicData();
      } else {
        addToast("Erro ao remover pergunta do gerenciador.", "error");
      }
    } catch (e) {
      addToast("Erro de comunicação.", "error");
    }
  };

  // Settings Updater
  const applySettingsChanges = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/admin/settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authSession.token}`
        },
        body: JSON.stringify(settings)
      });
      if (res.ok) {
        addToast("Configurações do sistema e identidade atualizadas com sucesso!");
        fetchPublicData();
        fetchSeoMeta();
      } else {
        addToast("Não foi possível salvar as configurações.", "error");
      }
    } catch (e) {
      addToast("Erro ao salvar alterações no sistema.", "error");
    }
  };

  // Helper for Exporting Functions
  const exportToCSV = (responsesList: FormResponse[]) => {
    if (responsesList.length === 0) {
      addToast("Nenhuma resposta disponível para exportar.", "info");
      return;
    }
    
    const headers = ["ID", "Nome da Empresa", "Cidade Principal", "WhatsApp", "E-mail", "Data de Postagem", "Status"];
    const rows = responsesList.map(r => [
      r.id,
      `"${r.companyName.replace(/"/g, '""')}"`,
      `"${r.city.replace(/"/g, '""')}"`,
      `"${r.whatsapp}"`,
      `"${r.email}"`,
      r.createdAt,
      r.status
    ]);

    const csvContent = "data:text/csv;charset=utf-8,\uFEFF" 
      + [headers.join(","), ...rows.map(e => e.join(","))].join("\n");
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `briefings_dqb_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    addToast("Download do arquivo CSV iniciado!");
  };

  const exportSingleResponseCSV = (detail: DetailedResponse) => {
    const headers = ["Pergunta", "Resposta"];
    const rows = [
      ["ID do Briefing", detail.response.id],
      ["Data de Entrada", detail.response.createdAt],
      ["Status", detail.response.status],
      ["Nome da Empresa", detail.response.companyName],
      ["Cidade Principal", detail.response.city],
      ["WhatsApp", detail.response.whatsapp],
      ["E-mail", detail.response.email],
      ["Notas Internas", detail.response.internalNotes || ""],
      ...detail.answers.map(ans => [
        `"${ans.label.replace(/"/g, '""')}"`,
        `"${String(Array.isArray(ans.value) ? ans.value.join(', ') : ans.value).replace(/"/g, '""')}"`
      ])
    ];

    const csvContent = "data:text/csv;charset=utf-8,\uFEFF" 
      + [headers.join(","), ...rows.map(e => e.join(","))].join("\n");
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `briefing_completo_${detail.response.id}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    addToast("Exportação do briefing individual iniciada.");
  };

  const triggerPDFPrint = () => {
    window.print();
  };

  return (
    <>
      <div className="min-h-screen bg-zinc-950 text-zinc-100 selection:bg-red-600 selection:text-white" id="root-viewport">
      
      {/* Dynamic Toast Notifications container */}
      <div className="fixed top-20 right-4 z-[999] flex flex-col gap-2 w-full max-w-sm pointer-events-none" id="toast-wrapper">
        {toasts.map(t => (
          <div 
            key={t.id} 
            className={`pointer-events-auto flex items-center justify-between gap-3 rounded-lg border px-4 py-3 shadow-xl transition-all duration-300 animate-slide-in ${
              t.type === 'success' 
                ? 'bg-zinc-900 border-green-500/30 text-green-400' 
                : t.type === 'error'
                ? 'bg-zinc-900 border-red-500/30 text-red-500'
                : 'bg-zinc-900 border-zinc-700 text-zinc-300'
            }`}
            id={`toast-${t.id}`}
          >
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 shrink-0" />
              <p className="text-xs font-medium sm:text-sm">{t.msg}</p>
            </div>
          </div>
        ))}
      </div>

      {/* COMPONENT: HEADER NAVIGATION */}
      <Header 
        settings={settings} 
        currentView={currentView} 
        setView={(v) => {
          setView(v);
          if (v !== 'admin') {
            setSelectedResponseId(null);
            setSelectedResponseDetail(null);
          }
        }} 
        isAuthenticated={!!authSession.token}
        onLogout={handleLogout}
      />

      {/* VIEW: LANDING PAGE */}
      {currentView === 'home' && (
        <main className="relative overflow-hidden pb-20">
          
          {/* Accent light highlights to look high-end */}
          <div className="absolute top-0 left-1/4 -z-10 h-96 w-96 -translate-x-1/2 rounded-full bg-red-800/10 blur-3xl animate-pulse-glow" />
          <div className="absolute right-10 top-1/3 -z-10 h-80 w-80 rounded-full bg-zinc-900/40 blur-2xl" />

          {/* MAIN HERO SECTION */}
          <section className="relative px-4 pt-16 sm:px-6 lg:px-8" id="hero-section">
            <div className="mx-auto max-w-5xl text-center">
              
              {/* Institutional badge */}
              <div className="mx-auto mb-6 inline-flex items-center gap-2 rounded-full border border-red-500/20 bg-red-950/20 px-4 py-1.5 backdrop-blur-md">
                <Shield className="h-4 w-4 text-red-500" />
                <span className="font-heading text-xs font-semibold tracking-wider text-red-400 uppercase">
                  Grupo Oficial de Apoio e Triagem de Projetos
                </span>
              </div>

              <h1 className="font-heading text-4xl font-extrabold tracking-tight text-white sm:text-6xl md:text-7xl">
                Formulário de Cadastro e <span className="text-red-600 block sm:inline">Desenvolvimento</span>
              </h1>
              
              <p className="mx-auto mt-6 max-w-3xl text-sm leading-relaxed text-zinc-400 sm:text-lg">
                Preencha as informações detalhadas sobre sua empresa, serviços, convênios de atendimento de saúde e localização geográfica. Assim, podemos arquitetar o encaminhamento profissional mais apurado do setor no Brasil.
              </p>

              <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
                <button
                  onClick={() => setView('form')}
                  className="cursor-pointer group flex w-full items-center justify-center gap-2 rounded-lg bg-red-600 px-6 py-4 text-sm font-bold text-white shadow-lg shadow-red-900/30 transition-all hover:bg-red-500 hover:shadow-red-500/20 sm:w-auto"
                  id="hero-cta-btn"
                >
                  <Sparkles className="h-4 w-4 transition-transform group-hover:rotate-12" />
                  Preencher Formulário de Cadastro
                  <ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                </button>
                
                <a
                  href={`https://wa.me/${settings.whatsapp.replace(/\D/g, '')}`}
                  target="_blank"
                  referrerPolicy="no-referrer"
                  className="flex w-full items-center justify-center gap-2 rounded-lg border border-zinc-800 bg-zinc-900/60 px-6 py-4 text-sm font-semibold text-zinc-300 transition-all hover:bg-zinc-800 hover:text-white sm:w-auto"
                  id="hero-secondary-btn"
                >
                  <Phone className="h-4 w-4 text-green-500" />
                  Triagem Direta WhatsApp
                </a>
              </div>

              {/* Status and Info Quick Panel */}
              <div className="mx-auto mt-16 max-w-4xl rounded-2xl border border-zinc-800 bg-zinc-900/30 p-6 backdrop-blur-sm sm:p-8">
                <div className="grid grid-cols-2 gap-6 md:grid-cols-4 md:gap-4 divide-y md:divide-y-0 md:divide-x divide-zinc-800/80">
                  <div className="pt-4 md:pt-0">
                    <p className="text-2xl font-bold font-heading text-red-500 sm:text-3xl">100%</p>
                    <p className="text-xs text-zinc-400 mt-1 uppercase tracking-tight">Adequado à LGPD</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold font-heading text-white sm:text-3xl">90 Min</p>
                    <p className="text-xs text-zinc-400 mt-1 uppercase tracking-tight">Retorno Estimado</p>
                  </div>
                  <div className="pt-4 md:pt-0">
                    <p className="text-2xl font-bold font-heading text-white sm:text-3xl">Brasil</p>
                    <p className="text-xs text-zinc-400 mt-1 uppercase tracking-tight">Atuação Territorial</p>
                  </div>
                  <div className="pt-4 md:pt-0">
                    <p className="text-2xl font-bold font-heading text-green-500 sm:text-3xl">Online</p>
                    <p className="text-xs text-zinc-400 mt-1 uppercase tracking-tight">Servidores Integrados</p>
                  </div>
                </div>
              </div>

            </div>
          </section>

          {/* SECTION: SOBRE O PROCESSO */}
          <section className="mx-auto mt-32 max-w-7xl px-4 sm:px-6 lg:px-8" id="about-section">
            <div className="grid gap-12 lg:grid-cols-12 lg:items-center">
              <div className="lg:col-span-6">
                <div className="inline-flex h-9 items-center gap-2 rounded-lg bg-zinc-900 px-3 text-xs text-zinc-450 uppercase tracking-widest font-semibold border border-zinc-800">
                  <Info className="h-4 w-4 text-red-500" />
                  Sobre Nós
                </div>
                <h2 className="font-heading text-3xl font-extrabold text-white mt-4 sm:text-4xl">
                  Parceria no combate inteligente à Dependência Química
                </h2>
                <p className="mt-6 text-zinc-400 leading-relaxed">
                  Consolidada como referencial de acompanhamento de famílias e clínicas, a <strong>Dependências Químicas Brasil</strong> realiza o processo de triagem direcionada. Nosso objetivo não é meramente catalogar registros, mas decifrar a viabilidade operacional e técnicas de reabilitação.
                </p>
                <p className="mt-4 text-zinc-400 leading-relaxed">
                  Ao realizar este briefing de captação de dados, nossa banca de assessores técnicos qualifica o escopo. Assim, estruturamos uma apresentação rica, otimizada para os sistemas de SEO do Google.
                </p>
                <div className="mt-8 flex items-center gap-4 border-t border-zinc-800 pt-6">
                  <div className="h-12 w-12 rounded-full bg-red-650/10 flex items-center justify-center text-red-500 border border-red-550/20">
                    <Award className="h-6 w-6" />
                  </div>
                  <div>
                    <h4 className="font-bold text-white text-sm">Altos Padrões Éticos</h4>
                    <p className="text-xs text-zinc-400 mt-0.5">Seguindo os preceitos éticos exigidos pela CONAD e OMS.</p>
                  </div>
                </div>
              </div>
              
              {/* Visual info representation */}
              <div className="lg:col-span-6 bg-zinc-900/45 p-8 rounded-2xl border border-zinc-800">
                <h3 className="font-heading text-lg font-bold text-white mb-6 flex items-center gap-2">
                  <Sliders className="h-5 w-5 text-red-500" />
                  Estrutura Integrada do Formulário
                </h3>
                <div className="space-y-4">
                  {[
                    { s: "Etapas 1-3", title: "Empresa, Público & Serviços", desc: "Coleta sobre as atividades principais desenvolvidas pela instituição parceira." },
                    { s: "Etapas 4-5", title: "Estrutura e Convênios", desc: "Informações sobre aceitação de coberturas de saúde e fotos documentais." },
                    { s: "Etapas 6-7", title: "Contatos e Localização", desc: "Mapeamento para correta localização via Google Maps e canais diretos." },
                    { s: "Etapas 8-12", title: "SEO, Diferenciais e Objetivos", desc: "Catalogação de palavras-chave para posicionamento orgânico e mídias de apoio." }
                  ].map((item, idx) => (
                    <div key={idx} className="flex gap-4 p-4 rounded-xl hover:bg-zinc-900/90 transition-all border border-zinc-900">
                      <span className="text-[11px] font-mono text-red-400 bg-red-950/40 border border-red-900/30 px-2 py-1 rounded h-fit shrink-0">
                        {item.s}
                      </span>
                      <div>
                        <h5 className="font-bold text-zinc-100 text-sm">{item.title}</h5>
                        <p className="text-xs text-zinc-405 mt-1 leading-relaxed">{item.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>

          {/* SECTION: COMO FUNCIONA */}
          <section className="mx-auto mt-32 max-w-7xl px-4 sm:px-6 lg:px-8" id="process-section">
            <div className="text-center">
              <h2 className="font-heading text-2xl font-extrabold uppercase tracking-wider text-red-500">Como Funciona</h2>
              <p className="mx-auto mt-4 max-w-xl text-lg text-zinc-300">Triagem em 4 etapas práticas de alto rendimento</p>
            </div>

            <div className="mt-16 grid gap-8 md:grid-cols-4">
              {[
                { step: "01", title: "Formulário de Briefing", desc: "Você preenche os dados em nossa plataforma totalmente responsiva e criptografada." },
                { step: "02", title: "Banca Arquivadora", desc: "Nossa equipe analisa as respostas, avaliando o potencial de busca local das cidades pretendidas." },
                { step: "03", title: "Apresentação e SEO", desc: "Os dados são empacotados em nossa solução web gerando um posicionamento excelente nas buscas do Google." },
                { step: "04", title: "Suporte e Expansão", desc: "Você expande seus canais de atendimento, recebendo leads pelo WhatsApp e e-mail integrados." }
              ].map((x, idx) => (
                <div key={idx} className="relative rounded-xl border border-zinc-800 bg-zinc-900/30 p-6 text-left hover:border-zinc-700 transition-all">
                  <span className="font-heading text-4xl font-extrabold text-red-650/20 absolute right-4 top-4">
                    {x.step}
                  </span>
                  <h4 className="font-heading text-sm font-bold text-white uppercase tracking-wider mb-2">
                    {x.title}
                  </h4>
                  <p className="text-xs text-zinc-400 leading-relaxed">
                    {x.desc}
                  </p>
                </div>
              ))}
            </div>
          </section>

          {/* SECTION: SEGURANÇA DOS DADOS */}
          <section className="mx-auto mt-32 max-w-7xl px-4 sm:px-6 lg:px-8" id="security-section">
            <div className="rounded-3xl border border-zinc-800 bg-linear-to-r from-zinc-950 via-zinc-900/40 to-zinc-950 p-8 sm:p-12">
              <div className="mx-auto max-w-3xl text-center">
                <Shield className="mx-auto h-12 w-12 text-red-500 animate-pulse" />
                <h2 className="font-heading text-2xl font-bold text-white mt-6 sm:text-3xl">
                  Segurança, Proteção de Dados e Sigilo Absoluto
                </h2>
                <p className="mt-4 text-sm text-zinc-400 leading-relaxed sm:text-base">
                  Preocupamo-nos rigorosamente com a conformidade de dados. Processamos e armazenamos os dados estruturais de forma segura, prevenindo vazamentos de leads ou interações. Não realizamos a comercialização de respostas de briefings de nossos parceiros a terceiros.
                </p>
                <div className="mt-8 flex flex-wrap justify-center gap-4 text-xs font-semibold text-zinc-500">
                  <span className="flex items-center gap-1.5 rounded-full bg-zinc-900 px-3 py-1.5 border border-zinc-800">
                    <div className="h-2 w-2 rounded-full bg-green-500" /> Criptografia de Ponta
                  </span>
                  <span className="flex items-center gap-1.5 rounded-full bg-zinc-900 px-3 py-1.5 border border-zinc-800">
                    <div className="h-2 w-2 rounded-full bg-green-500" /> Conformidade com a LGPD
                  </span>
                  <span className="flex items-center gap-1.5 rounded-full bg-zinc-900 px-3 py-1.5 border border-zinc-800">
                    <div className="h-2 w-2 rounded-full bg-green-500" /> Sessões Administrativas Seguras
                  </span>
                </div>
              </div>
            </div>
          </section>

          {/* SECTION: BENEFÍCIOS */}
          <section className="mx-auto mt-32 max-w-7xl px-4 sm:px-6 lg:px-8" id="benefits-section">
            <div className="text-center">
              <span className="font-heading text-xs font-bold uppercase tracking-widest text-red-500">
                O que você ganha com nossa ferramenta
              </span>
              <h2 className="font-heading text-3xl font-extrabold text-white mt-1">
                Benefícios Estratégicos
              </h2>
            </div>

            <div className="mt-16 grid gap-8 md:grid-cols-3">
              {[
                { 
                  title: "Triagem Inteligente de Pacientes", 
                  desc: "Facilite que seu cliente e familiares especifiquem o grau de desintoxicação ou acompanhamento médico que pretendem." 
                },
                { 
                  title: "Otimização Avançada de SEO", 
                  desc: "Aponte as palavras-chave principais do Google para a triagem para indexar sua unidade em dezenas de cidades simultaneamente." 
                },
                { 
                  title: "Acesso Total ao Painel de Controle", 
                  desc: "Crie novas perguntas, exporte listagens de forma rápida para envio direto a diretores de clínicas." 
                }
              ].map((b, idx) => (
                <div key={idx} className="rounded-2xl border border-zinc-800 bg-zinc-900/20 p-8 hover:bg-zinc-900/40 transition-all text-left">
                  <div className="h-10 w-10 rounded-lg bg-red-650/10 border border-red-550/20 text-red-500 flex items-center justify-center mb-6">
                    <CheckCircle className="h-5 w-5" />
                  </div>
                  <h4 className="font-heading text-lg font-bold text-white mb-2">{b.title}</h4>
                  <p className="text-xs text-zinc-400 leading-relaxed">{b.desc}</p>
                </div>
              ))}
            </div>
          </section>

          {/* SECTION: FAQ ACCORDION */}
          <section className="mx-auto mt-32 max-w-4xl px-4 sm:px-6" id="faq-section">
            <div className="text-center mb-16">
              <HelpCircle className="mx-auto h-10 w-10 text-red-500" />
              <h2 className="font-heading text-2xl font-bold text-white mt-3 sm:text-3xl">Dúvidas Frequentes</h2>
              <p className="text-xs text-zinc-500 mt-2">Dúvidas sobre o preenchimento de cadastro do formulário de triagem</p>
            </div>

            <div className="space-y-4">
              {[
                {
                  q: "Quais informações são obrigatórias para dar início?",
                  a: "Os dados essenciais englobam o Nome da Empresa (ou Clínica), meios de contacto diretos (E-mail e WhatsApp), e uma cidade principal de atuação para direcionamento inicial."
                },
                {
                  q: "Quem tem acesso às respostas preenchidas?",
                  a: "Somente a equipe de administradores devidamente cadastrada da Dependências Químicas Brasil. Todas as comunicações contam com proteção interna garantida por sessão segura protegida por JWT."
                },
                {
                  q: "Posso alterar as perguntas do briefing no futuro?",
                  a: "Sim. O sistema possui um construtor de formulários nativo que possibilita criar novas perguntas, reordenar as perguntas, torná-las obrigatórias ou desativá-las sem alterar arquivos de código de desenvolvimento."
                },
                {
                  q: "Como exportar meus registros se possuir centenas deles?",
                  a: "O painel administrativo dispõe de rotinas de download instantâneo para formato CSV/Excel, além de formatação para impressão em folha de papel física ou gravação de arquivos tipo PDF diretamente no navegador."
                }
              ].map((faq, idx) => (
                <details key={idx} className="group rounded-xl border border-zinc-800 bg-zinc-900/20 p-5 [&_summary::-webkit-details-marker]:hidden transition-all hover:bg-zinc-900/40">
                  <summary className="flex cursor-pointer items-center justify-between text-zinc-200">
                    <h5 className="font-heading font-semibold text-sm sm:text-base">{faq.q}</h5>
                    <span className="ml-1.5 shrink-0 rounded-full bg-zinc-800 p-1.5 text-zinc-400 group-open:rotate-180 transition-transform">
                      <ChevronRight className="h-4 w-4" />
                    </span>
                  </summary>
                  <p className="mt-4 text-xs text-zinc-450 leading-relaxed border-t border-zinc-800/60 pt-4 sm:text-sm">
                    {faq.a}
                  </p>
                </details>
              ))}
            </div>
          </section>

          {/* FOOTER SECTION */}
          <footer className="mx-auto mt-40 max-w-7xl px-4 border-t border-zinc-900 pt-10 text-center sm:px-6 lg:px-8">
            <p className="text-xs text-zinc-550">
              © 2026 {settings.siteName}. Todos os direitos reservados.
            </p>
            <p className="text-[10px] text-zinc-600 mt-2">
              Desenvolvido com tecnologia de alta credibilidade para atendimento às políticas brasileiras de reabilitação.
            </p>
          </footer>

        </main>
      )}

      {/* VIEW: MULTI-STEP WIZARD FORM */}
      {currentView === 'form' && (
        <main className="mx-auto max-w-3xl px-4 py-12 sm:px-6" id="wizard-view">
          
          <div className="mb-8 text-center animate-fade-in">
            <h2 className="font-heading text-2xl font-extrabold text-white sm:text-3xl uppercase tracking-tight">
              FORMULÁRIO PARA DESENVOLVIMENTO DO SITE
            </h2>
            <p className="text-red-500 text-sm font-semibold mt-2 uppercase tracking-wide">
              RESPONDA ÀS PERGUNTAS ABAIXO
            </p>
            <p className="text-zinc-500 text-xs mt-1 uppercase tracking-wider font-mono">
              Briefing NexSocial • Etapa {wizardStep} de {totalSteps}
            </p>
          </div>

          {/* Progress indicators wrapper */}
          <div className="mb-8">
            <div className="flex items-center justify-between text-xs text-zinc-400 mb-2">
              <span className="font-medium font-mono text-red-400">Progresso Geral</span>
              <span className="font-semibold font-mono">{Math.round((wizardStep / totalSteps) * 100)}% concluído</span>
            </div>
            
            <div className="h-2 w-full overflow-hidden rounded-full bg-zinc-900">
              <div 
                className="h-full bg-red-650 transition-all duration-300"
                style={{ width: `${(wizardStep / totalSteps) * 100}%` }}
              />
            </div>

            {/* Quick visual step capsules */}
            <div className="mt-4 hidden justify-between gap-1 overflow-x-auto sm:flex pb-1">
              {Array.from({ length: totalSteps }).map((_, idx) => {
                const stepNum = idx + 1;
                const isCurrent = stepNum === wizardStep;
                const isCompleted = stepNum < wizardStep;
                return (
                  <button
                    key={idx}
                    onClick={() => {
                      // Allow jumping backward to already visited steps easily
                      if (stepNum < wizardStep) {
                        setWizardStep(stepNum);
                      }
                    }}
                    disabled={stepNum >= wizardStep}
                    className={`h-2.5 rounded-sm transition-all flex items-center justify-center flex-1 ${
                      isCurrent 
                        ? 'bg-red-600' 
                        : isCompleted 
                        ? 'bg-zinc-100 hover:bg-zinc-200 cursor-pointer' 
                        : 'bg-zinc-900'
                    }`}
                    title={`Ir para Etapa ${stepNum}`}
                  />
                );
              })}
            </div>
          </div>

          {/* WIZARD CARD */}
          <div 
            className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-6 shadow-2xl backdrop-blur-md sm:p-10"
            id="wizard-form-card"
          >
            {formSubmitted ? (
              // Success Screen Case
              <div className="text-center py-10" id="form-success-wrapper">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-500/10 border border-green-500/20 text-green-400 mb-6">
                  <Check className="h-8 w-8" />
                </div>
                <h3 className="font-heading text-2xl font-bold text-white">Prontinho! Cadastro Efetuado</h3>
                <p className="mt-4 text-xs text-zinc-400 max-w-md mx-auto leading-relaxed sm:text-sm">
                  Seu briefing foi arquivado no painel administrativo e a nossa assessoria de suporte já foi notificada. Brevemente entraremos em contato.
                </p>
                <div className="mt-10 flex flex-col md:flex-row gap-4 justify-center">
                  <button
                    onClick={() => {
                      setFormSubmitted(false);
                      setWizardStep(1);
                      setWizardAnswers({});
                    }}
                    className="cursor-pointer rounded-lg bg-zinc-800 border border-zinc-700 hover:bg-zinc-700 transition px-6 py-3 text-xs sm:text-sm font-semibold text-zinc-250"
                  >
                    Fazer Outro Cadastro
                  </button>
                  <button
                    onClick={() => setView('home')}
                    className="cursor-pointer rounded-lg bg-red-600 hover:bg-red-500 transition px-6 py-3 text-xs sm:text-sm font-bold text-white"
                  >
                    Voltar para o Início
                  </button>
                </div>
              </div>
            ) : (
              // Standard Form Input Steps Render
              <div>
                
                {/* Dynamically grouped current Step Title / Description */}
                <div className="mb-8 border-b border-zinc-805 pb-4">
                  <h3 className="font-heading text-lg font-bold text-white uppercase sm:text-xl">
                    {getStepHeader(wizardStep).title}
                  </h3>
                  <p className="text-xs text-zinc-400 mt-1">
                    {getStepHeader(wizardStep).subtitle}
                  </p>
                </div>

                {/* Form fields rendering container */}
                <div className="space-y-6">
                  {fields.filter(f => f.step === wizardStep).length === 0 ? (
                    <p className="text-xs text-zinc-500 py-6 text-center">Nenhuma pergunta nesta etapa. Clique em Prosseguir.</p>
                  ) : (
                    fields.filter(f => f.step === wizardStep).map((field) => {
                      const userVal = wizardAnswers[field.id];
                      return (
                        <div key={field.id} className="space-y-2">
                          <label className="block text-xs font-bold text-zinc-300 uppercase tracking-widest sm:text-sm">
                            {field.label} {field.required && <span className="text-red-500">*</span>}
                          </label>

                          {/* TEXT, NUMBER, EMAIL, TEL FIELDS */}
                          {(field.type === 'text' || field.type === 'number' || field.type === 'email' || field.type === 'tel') && (
                            <input
                              type={field.type}
                              id={`input-val-${field.id}`}
                              placeholder={field.placeholder}
                              required={field.required}
                              value={userVal !== undefined ? userVal : ''}
                              onChange={(e) => handleFieldChange(field.id, e.target.value)}
                              className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-4 py-3 text-xs text-white placeholder-zinc-650 transition-all focus:border-red-650 focus:ring-1 focus:ring-red-650 sm:text-sm"
                            />
                          )}

                          {/* TEXTAREA FIELD */}
                          {field.type === 'textarea' && (
                            <textarea
                              id={`textarea-val-${field.id}`}
                              placeholder={field.placeholder}
                              required={field.required}
                              value={userVal !== undefined ? userVal : ''}
                              onChange={(e) => handleFieldChange(field.id, e.target.value)}
                              rows={4}
                              className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-4 py-3 text-xs text-white placeholder-zinc-650 transition-all focus:border-red-650 focus:ring-1 focus:ring-red-650 sm:text-sm"
                            />
                          )}

                          {/* SELECT FIELD */}
                          {field.type === 'select' && (
                            <select
                              id={`select-val-${field.id}`}
                              value={userVal !== undefined ? userVal : ''}
                              onChange={(e) => handleFieldChange(field.id, e.target.value)}
                              className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-4 py-3 text-xs text-white transition-all focus:border-red-650 focus:ring-1 focus:ring-red-650 sm:text-sm"
                            >
                              <option value="">Selecione uma opção...</option>
                              {field.options?.map((opt, i) => (
                                <option key={i} value={opt}>{opt}</option>
                              ))}
                            </select>
                          )}

                          {/* CHECKBOX OPTIONS */}
                          {field.type === 'checkbox' && (
                            <div className="grid gap-3 sm:grid-cols-2 pt-2" id={`checkbox-val-${field.id}`}>
                              {field.options?.map((opt, idx) => {
                                const isChecked = Array.isArray(userVal) && userVal.includes(opt);
                                return (
                                  <label 
                                    key={idx} 
                                    className={`flex items-center gap-3 rounded-lg border p-3 hover:bg-zinc-900 transition-all cursor-pointer ${
                                      isChecked ? 'border-red-600 bg-red-950/15 text-white' : 'border-zinc-800 bg-zinc-955/65 text-zinc-400'
                                    }`}
                                  >
                                    <input
                                      type="checkbox"
                                      checked={isChecked}
                                      onChange={() => handleFieldChange(field.id, opt, true)}
                                      className="sr-only"
                                    />
                                    <div className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border ${
                                      isChecked ? 'bg-red-600 border-red-600 text-white' : 'border-zinc-700 bg-zinc-900'
                                    }`}>
                                      {isChecked && <Check className="h-3 w-3" />}
                                    </div>
                                    <span className="text-xs font-semibold sm:text-sm">{opt}</span>
                                  </label>
                                );
                              })}
                            </div>
                          )}

                          {/* RADIO OPTIONS */}
                          {field.type === 'radio' && (
                            <div className="grid gap-3 sm:grid-cols-2 pt-2" id={`radio-val-${field.id}`}>
                              {field.options?.map((opt, idx) => {
                                const isSelected = userVal === opt;
                                return (
                                  <label 
                                    key={idx} 
                                    className={`flex items-center gap-3 rounded-lg border p-3 hover:bg-zinc-900 transition-all cursor-pointer ${
                                      isSelected ? 'border-red-600 bg-red-950/15 text-white' : 'border-zinc-800 bg-zinc-955/65 text-zinc-400'
                                    }`}
                                  >
                                    <input
                                      type="radio"
                                      name={field.id}
                                      checked={isSelected}
                                      onChange={() => handleFieldChange(field.id, opt)}
                                      className="sr-only"
                                    />
                                    <div className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full border ${
                                      isSelected ? 'bg-red-600 border-red-600 text-white' : 'border-zinc-750 bg-zinc-900'
                                    }`}>
                                      {isSelected && <div className="h-1.5 w-1.5 rounded-full bg-white" />}
                                    </div>
                                    <span className="text-xs font-semibold sm:text-sm">{opt}</span>
                                  </label>
                                );
                              })}
                            </div>
                          )}

                        </div>
                      );
                    })
                  )}
                </div>

                {/* Form Navigation Controls */}
                {formSubmitError && (
                  <p className="mt-6 text-sm text-red-500 font-semibold">{formSubmitError}</p>
                )}

                <div className="mt-10 flex items-center justify-between border-t border-zinc-805 pt-6">
                  <button
                    type="button"
                    onClick={handleWizardBack}
                    disabled={wizardStep === 1}
                    className={`cursor-pointer flex items-center gap-2 rounded-lg px-4 py-2.5 text-xs sm:text-sm font-semibold transition ${
                      wizardStep === 1 
                        ? 'opacity-30 cursor-not-allowed text-zinc-650' 
                        : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-200'
                    }`}
                  >
                    <ChevronLeft className="h-4 w-4" />
                    Voltar
                  </button>

                  <button
                    type="button"
                    onClick={handleWizardNext}
                    className="cursor-pointer flex items-center gap-2 rounded-lg bg-red-600 hover:bg-red-500 transition px-5 py-2.5 text-xs sm:text-sm font-bold text-white shadow-lg shadow-red-900/20"
                  >
                    {wizardStep === totalSteps ? 'Finalizar e Enviar' : 'Avançar'}
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>

              </div>
            )}
          </div>

        </main>
      )}

      {/* VIEW: ADMINISTRATIVE LOGIN & PANEL */}
      {currentView === 'admin' && (
        <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          
          {/* SECURE BLOCK: AUTH FOR ADMIN */}
          {!authSession.token ? (
            <div className="mx-auto max-w-md pt-12" id="login-container">
              <div className="rounded-2xl border border-zinc-800 bg-zinc-905/80 p-8 shadow-2xl backdrop-blur-md">
                
                <div className="text-center mb-8">
                  <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-red-650/10 border border-red-550/20 text-red-500 mb-4">
                    <Lock className="h-6 w-6" />
                  </div>
                  <h3 className="font-heading text-xl font-bold text-white uppercase">Acesso Restrito</h3>
                  <p className="text-xs text-zinc-550 mt-1">Insira credenciais administrativas para gerenciar</p>
                </div>

                <form onSubmit={executeLogin} className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-zinc-400 uppercase tracking-widest mb-1.5">Usuário</label>
                    <input
                      type="text"
                      required
                      placeholder="Digite seu usuário"
                      value={loginForm.username}
                      onChange={(e) => setLoginForm({ ...loginForm, username: e.target.value })}
                      className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-4 py-2.5 text-xs text-zinc-200 transition-all focus:border-red-650 focus:ring-1 focus:ring-red-610"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-zinc-400 uppercase tracking-widest mb-1.5">Senha</label>
                    <input
                      type="password"
                      required
                      placeholder="••••••••"
                      value={loginForm.password}
                      onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })}
                      className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-4 py-2.5 text-xs text-zinc-200 transition-all focus:border-red-650 focus:ring-1 focus:ring-red-610"
                    />
                  </div>

                  {loginError && (
                    <p className="text-xs text-red-500 font-semibold">{loginError}</p>
                  )}

                  <button
                    type="submit"
                    className="cursor-pointer w-full rounded-lg bg-red-600 hover:bg-red-500 transition py-3 text-xs md:text-sm font-bold text-white shadow-lg shadow-red-900/30"
                  >
                    Entrar com Segurança
                  </button>
                </form>

              </div>
            </div>
          ) : (
            
            // FULL PANEL COMPONENT (AUTHENTICATED)
            <div id="admin-panel-container">
              
              {/* ADMIN BANNER / SUB LOGO */}
              <div className="mb-8 flex flex-col justify-between gap-4 border-b border-zinc-800 pb-6 md:flex-row md:items-center">
                <div>
                  <h2 className="font-heading text-2xl font-extrabold text-white sm:text-3xl">
                    Painel Administrativo
                  </h2>
                  <p className="text-xs text-zinc-450 mt-1">
                    Logado como: <strong className="text-zinc-200">{authSession.username}</strong> • Auditoria ativa
                  </p>
                </div>

                {/* Sub Menu Tabs selector */}
                <div className="flex flex-wrap gap-2">
                  {[
                    { id: 'dashboard', label: 'Estatísticas', icon: LayoutDashboard },
                    { id: 'responses', label: 'Resp. de Briefings', icon: FileText },
                    { id: 'fields', label: 'Gerenciar Pergunta/Form', icon: Sliders },
                    { id: 'settings', label: 'Identidade e Cores', icon: SettingsIcon },
                  ].map((tab) => {
                    const IconComp = tab.icon;
                    return (
                      <button
                        key={tab.id}
                        onClick={() => {
                          setAdminSubTab(tab.id as any);
                          setSelectedResponseId(null);
                          setSelectedResponseDetail(null);
                        }}
                        className={`cursor-pointer flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-xs font-semibold transition-all ${
                          adminSubTab === tab.id
                            ? 'bg-red-600 text-white shadow-lg shadow-red-905/10'
                            : 'bg-zinc-900 text-zinc-400 hover:bg-zinc-855 hover:text-white'
                        }`}
                        id={`admin-tab-${tab.id}`}
                      >
                        <IconComp className="h-3.5 w-3.5" />
                        {tab.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* TAB 1: DASHBOARD OVERVIEW */}
              {adminSubTab === 'dashboard' && (
                <div className="space-y-8" id="admin-dashboard-v">
                  
                  {/* STATISTICS STATS BLOCKS ROW */}
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    
                    <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-6">
                      <p className="text-xs font-bold text-zinc-400 uppercase tracking-widest">Total Geral</p>
                      <h4 className="font-heading text-3xl font-extrabold text-white mt-2">
                        {dashboardStats.total}
                      </h4>
                      <p className="text-[10px] text-zinc-550 mt-1">Briefings catalogados no sistema</p>
                    </div>

                    <div className="rounded-xl border border-zinc-900 bg-zinc-900/40 p-6">
                      <p className="text-xs font-bold text-zinc-400 uppercase tracking-widest text-red-500">Postados Hoje</p>
                      <h4 className="font-heading text-3xl font-extrabold text-red-550 mt-2">
                        {dashboardStats.totalToday}
                      </h4>
                      <p className="text-[10px] text-zinc-550 mt-1">Respostas cadastradas ao longo do dia</p>
                    </div>

                    <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-6">
                      <p className="text-xs font-bold text-zinc-400 uppercase tracking-widest">Esta Semana</p>
                      <h4 className="font-heading text-3xl font-extrabold text-white mt-2">
                        {dashboardStats.totalThisWeek}
                      </h4>
                      <p className="text-[10px] text-zinc-550 mt-1">Período dos últimos 7 dias</p>
                    </div>

                    <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-6">
                      <p className="text-xs font-bold text-zinc-400 uppercase tracking-widest">Este Mês</p>
                      <h4 className="font-heading text-3xl font-extrabold text-white mt-2">
                        {dashboardStats.totalThisMonth}
                      </h4>
                      <p className="text-[10px] text-zinc-550 mt-1">Acompanhamento dos últimos 30 dias</p>
                    </div>

                  </div>

                  {/* RECENT BRIEFINGS GRID / EXPLOITS */}
                  <div className="grid gap-6 lg:grid-cols-12">
                    
                    <div className="rounded-xl border border-zinc-800 bg-zinc-900/30 p-6 lg:col-span-8">
                      <div className="flex items-center justify-between mb-6">
                        <h3 className="font-heading font-bold text-zinc-100 flex items-center gap-2">
                          <Activity className="h-4.5 w-4.5 text-red-500 animate-pulse" />
                          Últimos Cadastros Recebidos
                        </h3>
                        <button
                          onClick={() => setAdminSubTab('responses')}
                          className="text-xs text-red-400 hover:underline font-semibold"
                        >
                          Ver todas respostas →
                        </button>
                      </div>

                      {dashboardStats.recent.length === 0 ? (
                        <p className="text-xs text-zinc-555 text-center py-12">Nenhum briefing recebido no momento.</p>
                      ) : (
                        <div className="overflow-x-auto">
                          <table className="w-full text-left text-xs border-collapse">
                            <thead>
                              <tr className="border-b border-zinc-850 text-zinc-450">
                                <th className="pb-3 uppercase tracking-wider font-bold">Empresa / Clínica</th>
                                <th className="pb-3 uppercase tracking-wider font-bold">Cidade</th>
                                <th className="pb-3 uppercase tracking-wider font-bold">Status</th>
                                <th className="pb-3 uppercase tracking-wider font-bold">Enviado em</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-zinc-850/40">
                              {dashboardStats.recent.map((r) => (
                                <tr 
                                  key={r.id} 
                                  onClick={() => {
                                    setAdminSubTab('responses');
                                    loadResponseDetail(r.id);
                                  }}
                                  className="hover:bg-zinc-900/50 cursor-pointer transition"
                                >
                                  <td className="py-3.5 font-bold text-white">{r.companyName}</td>
                                  <td className="py-3.5 text-zinc-400">{r.city}</td>
                                  <td className="py-3.5 text-zinc-400">
                                    <span className={`inline-flex px-2 py-0.5 rounded text-[10px] font-bold ${
                                      r.status === 'unread' 
                                        ? 'bg-red-950/40 text-red-500 border border-red-900/30' 
                                        : r.status === 'read'
                                        ? 'bg-zinc-800 text-zinc-300'
                                        : 'bg-green-950/40 text-green-500 border border-green-900/30'
                                    }`}>
                                      {r.status === 'unread' ? 'Não lido' : r.status === 'read' ? 'Lido' : 'Respondido'}
                                    </span>
                                  </td>
                                  <td className="py-3.5 text-zinc-500 text-[11px]">
                                    {new Date(r.createdAt).toLocaleString('pt-BR')}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>

                    {/* SEO AUDIT CARD & PREVIEW (DADOS DINÁMICOS DO SEO METATAGS) */}
                    <div className="rounded-xl border border-zinc-800 bg-zinc-900/30 p-6 lg:col-span-4 space-y-4">
                      
                      <div className="border-b border-zinc-850 pb-4">
                        <h4 className="font-heading font-bold text-zinc-105 flex items-center gap-2">
                          <Globe className="h-4 w-4 text-emerald-500" />
                          Auditoria SEO Relatórios
                        </h4>
                        <p className="text-[10px] text-zinc-500 mt-1">Conformidade e palavras-chave orgânicas</p>
                      </div>

                      <div className="space-y-4 text-xs">
                        
                        <div>
                          <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider">Cidades com mais intenção</p>
                          <div className="flex flex-wrap gap-1 mt-2">
                            {seoMeta?.aggregateSeoTargets?.cities?.slice(0, 5).map((city: string, idx: number) => (
                              <span key={idx} className="bg-zinc-800 text-zinc-250 px-2 py-0.5 rounded text-[10px] border border-zinc-750">
                                {city}
                              </span>
                            ))}
                          </div>
                        </div>

                        <div>
                          <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider">Palavras-chave Críticas</p>
                          <div className="flex flex-wrap gap-1 mt-2">
                            {seoMeta?.aggregateSeoTargets?.keywords?.slice(0, 4).map((k: string, idx: number) => (
                              <span key={idx} className="bg-zinc-800 text-red-400 px-2 py-0.5 rounded text-[10px] border border-red-950/30">
                                {k}
                              </span>
                            ))}
                          </div>
                        </div>

                        <div className="bg-emerald-950/15 border border-emerald-900/30 p-3 rounded-lg text-emerald-400">
                          <p className="font-bold flex items-center gap-1 text-[11px]">
                            <CheckCircle className="h-3.5 w-3.5 text-emerald-500" />
                            Sitemap automático: Ativo
                          </p>
                          <p className="text-[10px] text-zinc-450 mt-1">
                            Disponibilizado em: <span className="text-zinc-300">/sitemap.xml</span> de forma automática.
                          </p>
                        </div>

                        <div className="bg-zinc-950/60 p-3 rounded-lg text-slate-350 border border-zinc-850">
                          <p className="font-bold text-[10px] text-zinc-400 uppercase">Robots.txt preventivo</p>
                          <p className="text-[10px] text-zinc-500 mt-1">Instruído para indexar raízes e ocultar rotas /admin.</p>
                        </div>

                      </div>

                    </div>

                  </div>

                </div>
              )}

              {/* TAB 2: DETAILED RESPONSE EXPLORER & FILTERS */}
              {adminSubTab === 'responses' && (
                <div className="grid gap-6 lg:grid-cols-12" id="admin-responses-view">
                  
                  {/* LISTING COLUMN */}
                  <div className="rounded-xl border border-zinc-800 bg-zinc-900/30 p-4 lg:col-span-5 space-y-4">
                    
                    {/* SEARCH INPUT BAR */}
                    <div className="relative">
                      <Search className="absolute left-3 top-3 h-4 w-4 text-zinc-500" />
                      <input
                        type="text"
                        placeholder="Buscar por Empresa, Telefone, E-mail ou Cidade..."
                        value={adminSearchQuery}
                        onChange={(e) => setAdminSearchQuery(e.target.value)}
                        className="w-full rounded-lg border border-zinc-800 bg-zinc-950 py-2.5 pl-10 pr-4 text-xs text-zinc-200 transition-all placeholder:text-zinc-600 focus:border-red-650"
                      />
                    </div>

                    <div className="flex items-center justify-between pb-2 border-b border-zinc-850">
                      <span className="text-xs text-zinc-450">
                        Total encontrado: <strong>{adminResponses.length}</strong> briefings
                      </span>
                      <button
                        onClick={() => exportToCSV(adminResponses)}
                        className="cursor-pointer text-xs flex items-center gap-1 text-zinc-300 hover:text-white bg-zinc-800 px-2 py-1 rounded hover:bg-zinc-700"
                        title="Download de todos os dados pesquisados em CSV"
                        id="export-bulk-csv-btn"
                      >
                        <Download className="h-3 w-3" />
                        Exportar CSV
                      </button>
                    </div>

                    <div className="space-y-2 overflow-y-auto max-h-[500px]" id="briefing-candidates-list">
                      {adminResponses.length === 0 ? (
                        <p className="text-xs text-zinc-550 text-center py-10">Nenhum cadastro atende ao filtro de pesquisa.</p>
                      ) : (
                        adminResponses.map((r) => {
                          const isSelected = r.id === selectedResponseId;
                          return (
                            <div
                              key={r.id}
                              onClick={() => loadResponseDetail(r.id)}
                              className={`cursor-pointer rounded-lg border p-4 transition text-left ${
                                isSelected 
                                  ? 'border-red-600 bg-red-950/10' 
                                  : 'border-zinc-850/70 bg-zinc-950/40 hover:border-zinc-800'
                              }`}
                              id={`resp-card-${r.id}`}
                            >
                              <div className="flex items-start justify-between gap-2">
                                <h4 className="font-heading font-semibold text-sm text-white line-clamp-1">
                                  {r.companyName}
                                </h4>
                                <span className={`inline-flex shrink-0 px-2 py-0.5 rounded text-[9px] font-extrabold uppercase ${
                                  r.status === 'unread' 
                                    ? 'bg-red-950/40 text-red-500 border border-red-900/30' 
                                    : r.status === 'read'
                                    ? 'bg-zinc-800 text-zinc-400'
                                    : 'bg-green-950/40 text-green-450 border border-green-900/20'
                                }`}>
                                  {r.status === 'unread' ? 'Novo' : r.status === 'read' ? 'Lido' : 'OK'}
                                </span>
                              </div>

                              <div className="space-y-1 mt-2 text-[11px] text-zinc-400">
                                <p className="flex items-center gap-1.5 line-clamp-1">
                                  <MapPin className="h-3 w-3 text-zinc-500 shrink-0" />
                                  {r.city}
                                </p>
                                <p className="line-clamp-1 text-zinc-500">
                                  {r.email}
                                </p>
                              </div>

                              <div className="mt-3 flex items-center justify-between border-t border-zinc-900 pt-2.5 text-[10px] text-zinc-500">
                                <span>ID: {r.id}</span>
                                <span>{new Date(r.createdAt).toLocaleDateString('pt-BR')}</span>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>

                  </div>

                  {/* DETAILS AND ACTION COLUMN */}
                  <div className="lg:col-span-7">
                    {!selectedResponseId || !selectedResponseDetail ? (
                      
                      <div className="h-full rounded-xl border border-zinc-800 bg-zinc-90 w-full flex flex-col items-center justify-center p-8 text-center" id="empty-selection-placeholder">
                        <FileText className="h-12 w-12 text-zinc-700 animate-bounce" />
                        <h4 className="font-heading font-medium text-zinc-400 mt-4">Nenhum Briefing Selecionado</h4>
                        <p className="text-xs text-zinc-550 mt-1 max-w-sm">
                          Escolha um briefing na coluna da esquerda para visualizar as respostas completas detalhadas por etapa, realizar notas internas, atualizar status ou efetuar downloads.
                        </p>
                      </div>

                    ) : (

                      <div className="rounded-xl border border-zinc-800 bg-zinc-900/30 p-6 space-y-6" id="response-details-panel">
                        
                        {/* Detail Header Info */}
                        <div className="flex flex-col gap-4 justify-between border-b border-zinc-805 pb-6 sm:flex-row sm:items-center">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] text-zinc-500 font-mono">ID: {selectedResponseDetail.response.id}</span>
                              <span className="text-zinc-600">•</span>
                              <span className="text-[10px] text-zinc-500">{new Date(selectedResponseDetail.response.createdAt).toLocaleString('pt-BR')}</span>
                            </div>
                            <h3 className="font-heading text-xl font-bold text-white mt-1">
                              {selectedResponseDetail.response.companyName}
                            </h3>
                          </div>

                          {/* Quick single formats dispatch */}
                          <div className="flex flex-wrap gap-2">
                            <button
                              onClick={() => exportSingleResponseCSV(selectedResponseDetail)}
                              className="cursor-pointer text-xs flex items-center gap-1.5 bg-zinc-800 hover:bg-zinc-700 hover:text-white px-3 py-2 rounded text-zinc-300 font-semibold border border-zinc-750"
                              title="Download do briefing em arquivo CSV formatado"
                              id="export-single-csv-btn"
                            >
                              <Download className="h-3.5 w-3.5" />
                              Exportar CSV
                            </button>
                            <button
                              onClick={triggerPDFPrint}
                              className="cursor-pointer text-xs flex items-center gap-1.5 bg-red-650 hover:bg-red-600 hover:text-white px-3 py-2 rounded text-white font-bold border border-red-700 shadow-md transition-all"
                              title="Configurar visualização para salvar como PDF ou imprimir"
                            >
                              <Printer className="h-3.5 w-3.5" />
                              Gerar PDF
                            </button>
                            <button
                              onClick={() => deleteResponse(selectedResponseDetail.response.id)}
                              className="cursor-pointer rounded-lg bg-red-950/20 text-red-500 border border-red-900/20 hover:bg-red-950/50 p-2"
                              title="Excluir briefing permanentemente"
                              id="delete-briefing-btn"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </div>

                        {/* Status updating panel */}
                        <div className="flex flex-wrap items-center gap-2 bg-zinc-950/60 p-4 rounded-lg border border-zinc-850">
                          <span className="text-xs text-zinc-400 font-semibold mr-2">Situalção:</span>
                          {[
                            { id: 'unread', label: 'Não Lido', color: 'text-red-500' },
                            { id: 'read', label: 'Lido', color: 'text-zinc-200' },
                            { id: 'replied', label: 'Respondido', color: 'text-green-500' }
                          ].map((st) => (
                            <button
                              key={st.id}
                              onClick={() => updateResponseStatus(selectedResponseDetail.response.id, st.id as any)}
                              className={`cursor-pointer text-[11px] font-bold px-3 py-1.5 rounded transition ${
                                selectedResponseDetail.response.status === st.id
                                  ? 'bg-red-650 text-white'
                                  : 'bg-zinc-900 text-zinc-400 hover:bg-zinc-800'
                              }`}
                            >
                              {st.label}
                            </button>
                          ))}
                        </div>

                        {/* BRIEFING BODY: TABULATED ANSWERS DISPLAY */}
                        <div className="space-y-4">
                          <div className="flex items-center justify-between">
                            <h4 className="font-heading font-bold text-sm text-zinc-300">Respostas Cadastradas</h4>
                            
                            <button
                              onClick={() => {
                                if (editingDetail) {
                                  saveResponseEdits();
                                } else {
                                  setEditingDetail(true);
                                }
                              }}
                              className="cursor-pointer text-xs flex items-center gap-1.5 text-zinc-300 bg-zinc-800 hover:bg-zinc-700 px-3 py-1.5 rounded"
                              id="toggle-edit-mode-btn"
                            >
                              {editingDetail ? (
                                <>
                                  <Save className="h-3.5 w-3.5 text-green-400" />
                                  Salvar Alterações
                                </>
                              ) : (
                                <>
                                  <Edit className="h-3.5 w-3.5 text-red-500" />
                                  Editar Respostas Inline
                                </>
                              )}
                            </button>
                          </div>

                          {editingDetail ? (
                            // INLINE EDIT INPUT FORM
                            <div className="space-y-4 bg-zinc-950/20 p-4 rounded-xl border border-zinc-800">
                              <p className="text-[10px] text-zinc-500 mb-4 uppercase font-bold">Modo de Edição Direta</p>
                              
                              <div className="grid gap-4 sm:grid-cols-2">
                                <div>
                                  <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-1 mt-2">Nome da Empresa</label>
                                  <input 
                                    type="text" 
                                    value={editableAnswers['companyName'] || ''}
                                    onChange={(e) => setEditableAnswers({ ...editableAnswers, companyName: e.target.value })}
                                    className="w-full bg-zinc-950 border border-zinc-800 rounded px-2.5 py-1.5 text-xs text-white"
                                  />
                                </div>
                                <div>
                                  <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-1 mt-2">WhatsApp Principal</label>
                                  <input 
                                    type="text" 
                                    value={editableAnswers['whatsapp'] || ''}
                                    onChange={(e) => setEditableAnswers({ ...editableAnswers, whatsapp: e.target.value })}
                                    className="w-full bg-zinc-950 border border-zinc-800 rounded px-2.5 py-1.5 text-xs text-white"
                                  />
                                </div>
                                <div>
                                  <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-1 mt-2">Cidade Principal</label>
                                  <input 
                                    type="text" 
                                    value={editableAnswers['mainCity'] || ''}
                                    onChange={(e) => setEditableAnswers({ ...editableAnswers, mainCity: e.target.value })}
                                    className="w-full bg-zinc-950 border border-zinc-800 rounded px-2.5 py-1.5 text-xs text-white"
                                  />
                                </div>
                                <div>
                                  <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-1 mt-2">E-mail</label>
                                  <input 
                                    type="email" 
                                    value={editableAnswers['email'] || ''}
                                    onChange={(e) => setEditableAnswers({ ...editableAnswers, email: e.target.value })}
                                    className="w-full bg-zinc-950 border border-zinc-800 rounded px-2.5 py-1.5 text-xs text-white"
                                  />
                                </div>
                              </div>

                              <div className="border-t border-zinc-850/60 mt-4 pt-4 space-y-3">
                                <p className="text-[10px] text-zinc-400 font-bold uppercase">Demais Perguntas do Briefing</p>
                                {selectedResponseDetail.answers.map((item) => (
                                  <div key={item.fieldId} className="space-y-1">
                                    <label className="block text-xs text-zinc-400">{item.label}</label>
                                    <input 
                                      type="text"
                                      value={editableAnswers[item.fieldId] !== undefined ? (Array.isArray(editableAnswers[item.fieldId]) ? editableAnswers[item.fieldId].join(', ') : editableAnswers[item.fieldId]) : ''}
                                      onChange={(e) => setEditableAnswers({ ...editableAnswers, [item.fieldId]: e.target.value })}
                                      className="w-full bg-zinc-950 border border-zinc-800 rounded px-2.5 py-1.5 text-xs text-white"
                                    />
                                  </div>
                                ))}
                              </div>

                              <div className="flex gap-2 justify-end pt-2">
                                <button
                                  onClick={() => setEditingDetail(false)}
                                  className="cursor-pointer text-xs bg-zinc-900 border border-zinc-800 px-3 py-1.5 rounded text-zinc-400 hover:text-white"
                                >
                                  Cancelar
                                </button>
                                <button
                                  onClick={saveResponseEdits}
                                  className="cursor-pointer text-xs bg-green-700 hover:bg-green-600 px-4 py-1.5 rounded text-white font-semibold"
                                >
                                  Salvar
                                </button>
                              </div>

                            </div>
                          ) : (
                            // READ ONLY TABULATED ANSWERS
                            <div className="space-y-3" id="briefing-answers-table">
                              {selectedResponseDetail.answers.map((item) => (
                                <div 
                                  key={item.fieldId} 
                                  className="flex flex-col gap-1 border-b border-zinc-850/40 pb-3"
                                >
                                  <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">
                                    {item.label}
                                  </span>
                                  <span className="text-xs text-zinc-100 sm:text-sm">
                                    {Array.isArray(item.value) ? (
                                      <span className="flex flex-wrap gap-1.5 mt-1">
                                        {item.value.map((v, i) => (
                                          <span key={i} className="bg-zinc-800 text-zinc-300 px-2.5 py-1 rounded-md text-xs font-semibold">
                                            {v}
                                          </span>
                                        ))}
                                      </span>
                                    ) : (
                                      String(item.value || 'Não preenchido')
                                    )}
                                  </span>
                                </div>
                              ))}
                            </div>
                          )}

                        </div>

                        {/* INTERNAL NOTES DIALOG */}
                        <div className="bg-zinc-950/60 p-4 rounded-xl border border-zinc-800 mt-6 space-y-3">
                          <h4 className="font-heading font-bold text-xs text-zinc-350 uppercase tracking-wider">Anotações Internas de Acompanhamento</h4>
                          <p className="text-[10px] text-zinc-550 leading-relaxed">Estas anotações são confidenciais e exibidas apenas para administradores autorizados do sistema.</p>
                          <textarea
                            value={detailNotes}
                            onChange={(e) => setDetailNotes(e.target.value)}
                            placeholder="Adicione observações internas, clínicas de encaminhamento correspondentes, ligações efetuadas para a família do dependente..."
                            rows={3}
                            className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-xs text-zinc-200 transition-all focus:border-red-650 text-sm"
                          />
                          <div className="flex justify-end">
                            <button
                              onClick={saveInternalNotes}
                              className="cursor-pointer text-xs bg-red-600 hover:bg-red-500 text-white font-bold px-4 py-2 rounded transition"
                              id="save-internal-notes-btn"
                            >
                              Salvar Notas
                            </button>
                          </div>
                        </div>

                      </div>

                    )}
                  </div>

                </div>
              )}

              {/* TAB 3: GERENCIADOR DE FORMULÁRIOS / PERGUNTAS */}
              {adminSubTab === 'fields' && (
                <div className="space-y-6" id="admin-fields-manager-v">
                  
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <h3 className="font-heading font-bold text-zinc-100 flex items-center gap-2">
                        <Sliders className="h-5 w-5 text-red-500 animate-pulse" />
                        Gerenciar Perguntas do Briefing (Wizard Coleta)
                      </h3>
                      <p className="text-xs text-zinc-500 mt-0.5">Crie, oculte, ordene e configure todas as perguntas sem alterar códigos de programação do servidor.</p>
                    </div>

                    <button
                      onClick={() => setIsAddingField(!isAddingField)}
                      className="cursor-pointer text-xs flex items-center justify-center gap-1 bg-red-600 hover:bg-red-500 px-4 py-2.5 rounded font-bold text-white transition-all shadow-lg shadow-red-905/10"
                      id="add-new-field-btn"
                    >
                      <Plus className="h-4 w-4" />
                      Criar Nova Pergunta
                    </button>
                  </div>

                  {/* ADD FIELD FORM ENCLOSER */}
                  {isAddingField && (
                    <div className="bg-zinc-900/60 p-6 rounded-xl border border-zinc-800 space-y-4" id="add-field-form">
                      <h4 className="font-heading font-semibold text-sm text-white">Criar Nova Pergunta Integrada</h4>
                      <form onSubmit={createNewField} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                        
                        <div>
                          <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-1.5">Identificador Único (ID / Inglês)</label>
                          <input
                            type="text"
                            placeholder="Ex: clinicaVagas, customEspecialidades"
                            required
                            value={newFieldData.id}
                            onChange={(e) => setNewFieldData({ ...newFieldData, id: e.target.value.replace(/\s+/g, '') })}
                            className="w-full bg-zinc-950 border border-zinc-800 rounded px-3 py-2 text-xs text-zinc-200"
                          />
                        </div>

                        <div>
                          <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-1.5">Rótulo / Pergunta (Visual)</label>
                          <input
                            type="text"
                            placeholder="Ex: Quais especialidades possui?"
                            required
                            value={newFieldData.label}
                            onChange={(e) => setNewFieldData({ ...newFieldData, label: e.target.value })}
                            className="w-full bg-zinc-950 border border-zinc-800 rounded px-3 py-2 text-xs text-zinc-200"
                          />
                        </div>

                        <div>
                          <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-1.5">Marcador (Placeholder)</label>
                          <input
                            type="text"
                            placeholder="Ex: Digite caso possua..."
                            value={newFieldData.placeholder}
                            onChange={(e) => setNewFieldData({ ...newFieldData, placeholder: e.target.value })}
                            className="w-full bg-zinc-950 border border-zinc-800 rounded px-3 py-2 text-xs text-zinc-200"
                          />
                        </div>

                        <div>
                          <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-1.5">Tipo de Campo</label>
                          <select
                            value={newFieldData.type}
                            onChange={(e) => setNewFieldData({ ...newFieldData, type: e.target.value as any })}
                            className="w-full bg-zinc-950 border border-zinc-800 rounded px-3 py-2 text-xs text-zinc-200 mt-1"
                          >
                            <option value="text">Texto curto (text)</option>
                            <option value="textarea">Área de texto longo (textarea)</option>
                            <option value="checkbox">Caixas de seleção (checkbox)</option>
                            <option value="radio">Botão de rádio único (radio)</option>
                            <option value="select">Menu Seletor de opções (select)</option>
                            <option value="number">Numérico (number)</option>
                            <option value="email">E-mail (email)</option>
                            <option value="tel">Telefone/WhatsApp (tel)</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-1.5">Etapa do Formulário (1 a {totalSteps})</label>
                          <input
                            type="number"
                            min="1"
                            max={totalSteps}
                            required
                            value={newFieldData.step}
                            onChange={(e) => setNewFieldData({ ...newFieldData, step: Number(e.target.value) })}
                            className="w-full bg-zinc-950 border border-zinc-800 rounded px-3 py-2 text-xs text-zinc-200"
                          />
                        </div>

                        <div>
                          <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-1.5">Ordem de Exibição</label>
                          <input
                            type="number"
                            value={newFieldData.order}
                            onChange={(e) => setNewFieldData({ ...newFieldData, order: Number(e.target.value) })}
                            className="w-full bg-zinc-950 border border-zinc-800 rounded px-3 py-2 text-xs text-zinc-200"
                          />
                        </div>

                        {/* CONFIGURAR OPÇÕES PARA CHECKBOX/RADIO/SELECT */}
                        {['checkbox', 'radio', 'select'].includes(newFieldData.type || '') && (
                          <div className="sm:col-span-2 bg-zinc-950/60 p-4 rounded-lg border border-zinc-850">
                            <label className="block text-[10px] font-bold text-red-400 uppercase tracking-widest mb-2">Opções para Seleção do Cliente</label>
                            <div className="flex gap-2">
                              <input
                                type="text"
                                placeholder="Digite uma opção e aperte Adicionar"
                                value={newFieldOptionInput}
                                onChange={(e) => setNewFieldOptionInput(e.target.value)}
                                className="flex-1 bg-zinc-900 border border-zinc-805 rounded px-3 py-1.5 text-xs text-white"
                              />
                              <button
                                type="button"
                                onClick={() => {
                                  if (newFieldOptionInput.trim()) {
                                    setNewFieldData({
                                      ...newFieldData,
                                      options: [...(newFieldData.options || []), newFieldOptionInput.trim()]
                                    });
                                    setNewFieldOptionInput('');
                                  }
                                }}
                                className="cursor-pointer bg-zinc-800 hover:bg-zinc-700 px-3 py-1 rounded text-xs text-zinc-200 font-semibold"
                              >
                                Adicionar
                              </button>
                            </div>
                            
                            {/* Option list tags */}
                            <div className="flex flex-wrap gap-1.5 mt-3">
                              {newFieldData.options?.map((opt, i) => (
                                <span key={i} className="bg-red-950/30 border border-red-900/30 text-red-400 px-2.5 py-1 rounded text-[10px] flex items-center gap-1">
                                  {opt}
                                  <button
                                    type="button"
                                    onClick={() => setNewFieldData({
                                      ...newFieldData,
                                      options: newFieldData.options?.filter((_, index) => index !== i)
                                    })}
                                    className="hover:text-white font-extrabold"
                                  >
                                    ×
                                  </button>
                                </span>
                              ))}
                            </div>
                          </div>
                        )}

                        <div className="sm:col-span-2 lg:col-span-3 flex items-center gap-6 pt-3">
                          <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-zinc-300">
                            <input
                              type="checkbox"
                              checked={newFieldData.required}
                              onChange={(e) => setNewFieldData({ ...newFieldData, required: e.target.checked })}
                              className="accent-red-650 h-4 w-4 text-zinc-200 shrink-0"
                            />
                            Tornar este campo obrigatório para o usuário
                          </label>

                          <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-zinc-300">
                            <input
                              type="checkbox"
                              checked={newFieldData.hidden}
                              onChange={(e) => setNewFieldData({ ...newFieldData, hidden: e.target.checked })}
                              className="accent-red-650 h-4 w-4 text-zinc-200 shrink-0"
                            />
                            Ocultar pergunta temporariamente do Wizard
                          </label>
                        </div>

                        <div className="sm:col-span-2 lg:col-span-3 flex gap-2 justify-end border-t border-zinc-805 pt-4">
                          <button
                            type="button"
                            onClick={() => setIsAddingField(false)}
                            className="cursor-pointer text-xs bg-zinc-900 border border-zinc-800 text-zinc-400 px-4 py-2 rounded hover:text-white"
                          >
                            Cancelar
                          </button>
                          <button
                            type="submit"
                            className="cursor-pointer text-xs bg-green-700 hover:bg-green-650 px-5 py-2 rounded text-white font-bold"
                          >
                            Salvar Nova Pergunta
                          </button>
                        </div>

                      </form>
                    </div>
                  )}

                  {/* ACTIVE QUESTIONS EXPANSION TABLE LIST */}
                  <div className="rounded-xl border border-zinc-800 bg-zinc-900/30 overflow-hidden">
                    <div className="flex bg-zinc-950 px-4 py-3.5 border-b border-zinc-805 text-xs text-zinc-450 uppercase font-bold tracking-wider">
                      <div className="w-1/12">Etapa</div>
                      <div className="w-4/12">Rótulo / Pergunta</div>
                      <div className="w-2/12">Tipo</div>
                      <div className="w-2/12">Obrigatório</div>
                      <div className="w-1/12">Status</div>
                      <div className="w-2/12 text-right">Ações</div>
                    </div>

                    <div className="divide-y divide-zinc-850/50">
                      {fields.map((field) => {
                        const isEditing = editingFieldId === field.id;
                        return (
                          <div key={field.id} className="flex px-4 py-4 items-center text-xs text-zinc-300 hover:bg-zinc-900/10">
                            
                            {/* STEP CELL */}
                            <div className="w-1/12 font-heading font-extrabold text-white">Etapa {field.step}</div>
                            
                            {/* LABEL CELL */}
                            <div className="w-4/12 pr-4">
                              {isEditing ? (
                                <input
                                  type="text"
                                  value={editingFieldData.label || ''}
                                  onChange={(e) => setEditingFieldData({ ...editingFieldData, label: e.target.value })}
                                  className="w-full bg-zinc-950 border border-zinc-800 text-white rounded p-1"
                                />
                              ) : (
                                <span className="font-bold text-white block">{field.label}</span>
                              )}
                              <span className="text-[10px] text-zinc-550 block mt-1">ID: {field.id}</span>
                            </div>

                            {/* TYPE CELL */}
                            <div className="w-2/12 uppercase tracking-wide text-zinc-400">{field.type}</div>

                            {/* REQUIRED STATUS */}
                            <div className="w-2/12">
                              {isEditing ? (
                                <input
                                  type="checkbox"
                                  checked={editingFieldData.required || false}
                                  onChange={(e) => setEditingFieldData({ ...editingFieldData, required: e.target.checked })}
                                  className="accent-red-600"
                                />
                              ) : (
                                <span className={`inline-flex px-2 py-0.5 rounded text-[10px] font-bold ${
                                  field.required 
                                    ? 'bg-red-950/20 text-red-500 border border-red-950/20' 
                                    : 'bg-zinc-800 text-zinc-450'
                                }`}>
                                  {field.required ? 'Sim' : 'Não'}
                                </span>
                              )}
                            </div>

                            {/* VISIBILITY CELL */}
                            <div className="w-1/12">
                              {isEditing ? (
                                <select
                                  value={editingFieldData.hidden ? 'oculto' : 'visivel'}
                                  onChange={(e) => setEditingFieldData({ ...editingFieldData, hidden: e.target.value === 'oculto' })}
                                  className="bg-zinc-950 border border-zinc-800 text-white rounded p-1"
                                >
                                  <option value="visivel">Visível</option>
                                  <option value="oculto">Oculto</option>
                                </select>
                              ) : (
                                <span className={`inline-flex items-center gap-1 ${field.hidden ? 'text-zinc-600' : 'text-green-500'}`}>
                                  {field.hidden ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                                  {field.hidden ? 'Oculto' : 'Ativo'}
                                </span>
                              )}
                            </div>

                            {/* ACTION BUTTON CELL */}
                            <div className="w-2/12 flex items-center justify-end gap-2">
                              {isEditing ? (
                                <div className="flex gap-1">
                                  <button
                                    onClick={() => updateFieldProperties(field.id, editingFieldData)}
                                    className="cursor-pointer bg-green-700 hover:bg-green-600 px-2 py-1 rounded text-white font-bold text-[10px]"
                                  >
                                    Salvar
                                  </button>
                                  <button
                                    onClick={() => setEditingFieldId(null)}
                                    className="cursor-pointer bg-zinc-800 text-zinc-400 hover:text-white px-2 py-1 rounded text-[10px]"
                                  >
                                    Cancelar
                                  </button>
                                </div>
                              ) : (
                                <>
                                  <button
                                    onClick={() => {
                                      setEditingFieldId(field.id);
                                      setEditingFieldData({ ...field });
                                    }}
                                    className="cursor-pointer bg-zinc-800 hover:bg-zinc-700 text-zinc-300 p-1.5 rounded"
                                    title="Editar pergunta inline"
                                  >
                                    <Edit className="h-3.5 w-3.5" />
                                  </button>
                                  <button
                                    onClick={() => deleteFormField(field.id)}
                                    className="cursor-pointer bg-zinc-800 text-red-500 hover:bg-zinc-700 p-1.5 rounded"
                                    title="Excluir pergunta"
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </button>
                                </>
                              )}
                            </div>

                          </div>
                        );
                      })}
                    </div>
                  </div>

                </div>
              )}

              {/* TAB 4: SYSTEM CONFIGURATIONS / LOGO AND THEMES */}
              {adminSubTab === 'settings' && (
                <div className="rounded-xl border border-zinc-800 bg-zinc-900/30 p-6" id="admin-settings-v">
                  
                  <div className="border-b border-zinc-850 pb-4 mb-6">
                    <h3 className="font-heading font-extrabold text-lg text-white">Identidade, Cores e Canais</h3>
                    <p className="text-xs text-zinc-500 mt-0.5">Defina as cores preferenciais, nome do site, logo e canais de contato gerais para triagem.</p>
                  </div>

                  <form onSubmit={applySettingsChanges} className="space-y-6">
                    
                    <div className="grid gap-6 sm:grid-cols-2">
                      
                      <div>
                        <label className="block text-[10px] font-bold text-zinc-405 uppercase tracking-widest mb-1.5">Identidade / Logo Principal</label>
                        <input
                          type="text"
                          required
                          value={settings.logo}
                          onChange={(e) => setSettings({ ...settings, logo: e.target.value })}
                          className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-2.5 text-xs text-zinc-200"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold text-zinc-405 uppercase tracking-widest mb-1.5">Nome da Instituição (siteName)</label>
                        <input
                          type="text"
                          required
                          value={settings.siteName}
                          onChange={(e) => setSettings({ ...settings, siteName: e.target.value })}
                          className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-2.5 text-xs text-zinc-200"
                        />
                      </div>

                      <div className="sm:col-span-2">
                        <label className="block text-[10px] font-bold text-zinc-405 uppercase tracking-widest mb-1.5">Slogan de Campanhas</label>
                        <input
                          type="text"
                          required
                          value={settings.slogan}
                          onChange={(e) => setSettings({ ...settings, slogan: e.target.value })}
                          className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-2.5 text-xs text-zinc-200"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold text-zinc-405 uppercase tracking-widest mb-1.5">WhatsApp Principal de Contatos</label>
                        <input
                          type="text"
                          required
                          value={settings.whatsapp}
                          onChange={(e) => setSettings({ ...settings, whatsapp: e.target.value })}
                          className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-2.5 text-xs text-zinc-200"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold text-zinc-405 uppercase tracking-widest mb-1.5">Telefone de Atendimento Nacional</label>
                        <input
                          type="text"
                          value={settings.phone}
                          onChange={(e) => setSettings({ ...settings, phone: e.target.value })}
                          className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-2.5 text-xs text-zinc-200"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold text-zinc-405 uppercase tracking-widest mb-1.5">E-mail para Recebimento de Alertas</label>
                        <input
                          type="email"
                          required
                          value={settings.email}
                          onChange={(e) => setSettings({ ...settings, email: e.target.value })}
                          className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-2.5 text-xs text-zinc-200"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold text-zinc-405 uppercase tracking-widest mb-1.5">Link do Instagram</label>
                        <input
                          type="text"
                          value={settings.instagram}
                          onChange={(e) => setSettings({ ...settings, instagram: e.target.value })}
                          className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-2.5 text-xs text-zinc-200"
                        />
                      </div>

                    </div>

                    {/* PALETA DE CORES BRASIL SELECTOR */}
                    <div className="bg-zinc-950/65 p-6 rounded-lg border border-zinc-850 space-y-4">
                      <h4 className="font-heading font-bold text-xs text-zinc-300 uppercase tracking-widest flex items-center gap-2">
                        <Sliders className="h-4 w-4 text-red-500" />
                        Identidade do Sistema de Cores
                      </h4>
                      <p className="text-[10px] text-zinc-550 leading-relaxed">As cores base especificadas para a Dependências Químicas Brasil são Preto #0A0A0A (Fundo), Vermelho #D90429 (Primário) e Branco #FFFFFF (Texto). Insira novos hexadecimais apenas se requisitado para branding alternativo.</p>
                      
                      <div className="grid gap-4 sm:grid-cols-4">
                        <div>
                          <label className="block text-[10px] text-zinc-400 uppercase tracking-wider mb-1">Cor Primária</label>
                          <div className="flex gap-2">
                            <input
                              type="color"
                              value={settings.colors?.primary || '#D90429'}
                              onChange={(e) => setSettings({
                                ...settings,
                                colors: { ...settings.colors, primary: e.target.value }
                              })}
                              className="h-8 w-8 rounded border border-zinc-800 cursor-pointer"
                            />
                            <input
                              type="text"
                              value={settings.colors?.primary || '#D90429'}
                              onChange={(e) => setSettings({
                                ...settings,
                                colors: { ...settings.colors, primary: e.target.value }
                              })}
                              className="w-24 bg-zinc-950 border border-zinc-800 rounded text-xs text-white px-2 py-1"
                            />
                          </div>
                        </div>

                        <div>
                          <label className="block text-[10px] text-zinc-400 uppercase tracking-wider mb-1">Fundo Base</label>
                          <div className="flex gap-2">
                            <input
                              type="color"
                              value={settings.colors?.bg || '#0A0A0A'}
                              onChange={(e) => setSettings({
                                ...settings,
                                colors: { ...settings.colors, bg: e.target.value }
                              })}
                              className="h-8 w-8 rounded border border-zinc-800 cursor-pointer"
                            />
                            <input
                              type="text"
                              value={settings.colors?.bg || '#0A0A0A'}
                              onChange={(e) => setSettings({
                                ...settings,
                                colors: { ...settings.colors, bg: e.target.value }
                              })}
                              className="w-24 bg-zinc-950 border border-zinc-800 rounded text-xs text-white px-2 py-1"
                            />
                          </div>
                        </div>

                        <div>
                          <label className="block text-[10px] text-zinc-400 uppercase tracking-wider mb-1">Texto Geral</label>
                          <div className="flex gap-2">
                            <input
                              type="color"
                              value={settings.colors?.text || '#FFFFFF'}
                              onChange={(e) => setSettings({
                                ...settings,
                                colors: { ...settings.colors, text: e.target.value }
                              })}
                              className="h-8 w-8 rounded border border-zinc-800 cursor-pointer"
                            />
                            <input
                              type="text"
                              value={settings.colors?.text || '#FFFFFF'}
                              onChange={(e) => setSettings({
                                ...settings,
                                colors: { ...settings.colors, text: e.target.value }
                              })}
                              className="w-24 bg-zinc-950 border border-zinc-800 rounded text-xs text-white px-2 py-1"
                            />
                          </div>
                        </div>

                        <div>
                          <label className="block text-[10px] text-zinc-400 uppercase tracking-wider mb-1">Cartões e Backs</label>
                          <div className="flex gap-2">
                            <input
                              type="color"
                              value={settings.colors?.card || '#121212'}
                              onChange={(e) => setSettings({
                                ...settings,
                                colors: { ...settings.colors, card: e.target.value }
                              })}
                              className="h-8 w-8 rounded border border-zinc-800 cursor-pointer"
                            />
                            <input
                              type="text"
                              value={settings.colors?.card || '#121212'}
                              onChange={(e) => setSettings({
                                ...settings,
                                colors: { ...settings.colors, card: e.target.value }
                              })}
                              className="w-24 bg-zinc-950 border border-zinc-800 rounded text-xs text-white px-2 py-1"
                            />
                          </div>
                        </div>

                      </div>
                    </div>

                    <div className="flex justify-end pt-4 border-t border-zinc-805">
                      <button
                        type="submit"
                        className="cursor-pointer rounded-lg bg-red-600 hover:bg-red-500 text-white font-bold px-6 py-3 text-xs sm:text-sm shadow-md transition"
                        id="save-settings-btn"
                      >
                        Salvar Todas Configurações
                      </button>
                    </div>

                  </form>

                </div>
              )}

            </div>
          )}

        </main>
      )}

    </div>

    {/* Printable Area - Rendered only when printing */}
    {selectedResponseDetail && (
      <div id="print-section" className="hidden print:block bg-white text-zinc-950 p-10 font-sans min-h-screen">
        <div className="border-b-4 border-red-600 pb-5 mb-8 flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight text-zinc-900 font-heading">
              NEXSOCIAL
            </h1>
            <p className="text-xs text-zinc-500 font-mono uppercase tracking-widest mt-1">
              Relatório de Briefing de Alta Conversão
            </p>
          </div>
          <div className="text-right font-sans">
            <span className="text-xs px-3 py-1.5 bg-red-50 text-red-700 font-bold uppercase rounded border border-red-200">
              {selectedResponseDetail.response.status === 'unread' ? 'Novo' : selectedResponseDetail.response.status === 'read' ? 'Lido' : 'Respondido'}
            </span>
            <p className="text-[10px] text-zinc-500 mt-3 font-mono">
              Reg: {selectedResponseDetail.response.id}
            </p>
            <p className="text-[10px] text-zinc-400 mt-1">
              Enviado em: {new Date(selectedResponseDetail.response.createdAt).toLocaleString('pt-BR')}
            </p>
          </div>
        </div>

        <div className="mb-8 p-5 bg-zinc-50 rounded-xl border border-zinc-200">
          <h2 className="text-xs font-bold uppercase tracking-wider text-red-600 mb-4 border-b border-zinc-250 pb-1.5 font-heading">
            1. Identificação Geral do Cadastro
          </h2>
          <div className="grid grid-cols-2 gap-y-3 gap-x-6 text-xs text-zinc-800">
            <div>
              <span className="font-semibold text-zinc-450 uppercase text-[9px] block mb-0.5">Empresa / Referência</span>
              <span className="text-zinc-900 font-bold text-sm">{selectedResponseDetail.response.companyName || 'Não especificada'}</span>
            </div>
            <div>
              <span className="font-semibold text-zinc-450 uppercase text-[9px] block mb-0.5">WhatsApp Principal</span>
              <span className="text-zinc-900 font-semibold font-mono text-sm">{selectedResponseDetail.response.whatsapp || 'Não fornecido'}</span>
            </div>
            <div className="mt-2">
              <span className="font-semibold text-zinc-450 uppercase text-[9px] block mb-0.5">E-mail para Contato</span>
              <span className="text-zinc-900 font-semibold font-mono">{selectedResponseDetail.response.email || 'Não fornecido'}</span>
            </div>
            <div className="mt-2">
              <span className="font-semibold text-zinc-450 uppercase text-[9px] block mb-0.5">Cidade de Atendimento</span>
              <span className="text-zinc-900 font-medium">{selectedResponseDetail.response.city || 'Não informada'}</span>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <h2 className="text-xs font-bold uppercase tracking-wider text-red-600 border-b border-zinc-250 pb-1.5 font-heading">
            2. Respostas Completas do Formulário
          </h2>
          
          {selectedResponseDetail.answers.map((item, idx) => (
            <div key={item.fieldId || idx} className="pb-4 border-b border-zinc-100 last:border-0 break-inside-avoid">
              <h3 className="font-bold text-zinc-800 text-xs">
                {idx + 1}. {item.label}
              </h3>
              <div className="text-zinc-900 text-xs mt-1.5 leading-relaxed font-normal">
                {Array.isArray(item.value) ? (
                  <div className="flex flex-wrap gap-1.5 mt-1.5">
                    {item.value.map((v, i) => (
                      <span key={i} className="bg-zinc-100 text-zinc-800 px-2.5 py-0.5 rounded border border-zinc-200 text-[11px] font-semibold">
                        {v}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="whitespace-pre-wrap bg-zinc-50/50 p-2.5 rounded border border-zinc-100 text-zinc-800 font-mono text-[11px]">
                    {String(item.value || 'Não preenchido')}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>

        {selectedResponseDetail.response.internalNotes && (
          <div className="mt-8 p-5 bg-yellow-50/50 rounded-xl border border-yellow-200/60 break-inside-avoid">
            <h3 className="text-xs font-bold text-yellow-800 uppercase tracking-widest mb-2 font-heading">
              Anotações Internas de Acompanhamento (Administrativo)
            </h3>
            <p className="text-xs text-yellow-950 whitespace-pre-wrap leading-relaxed">
              {selectedResponseDetail.response.internalNotes}
            </p>
          </div>
        )}

        <div className="mt-16 pt-6 border-t border-zinc-200 text-center text-[10px] text-zinc-400 font-mono tracking-wider">
          Este relatório executivo foi gerado pelo Briefing de Captura NexSocial para @nexsocialbr.
        </div>
      </div>
    )}
  </>
);
}

// Wizard Step descriptive header mapper
function getStepHeader(step: number) {
  const stepsMap: Record<number, { title: string; subtitle: string }> = {
    1: { 
      title: "Dados do Responsável", 
      subtitle: "Insira as suas informações de contato básicas." 
    },
    2: { 
      title: "Sobre a Empresa", 
      subtitle: "Conte-nos sobre a história, tempo de atuação e missão da empresa." 
    },
    3: { 
      title: "Serviços Oferecidos", 
      subtitle: "Marque os serviços de reabilitação e bem-estar oferecidos." 
    },
    4: { 
      title: "Convênios e Opções", 
      subtitle: "Informe os convênios aceitos, opções de atendimento particular e parcelamento." 
    },
    5: { 
      title: "Atendimento Territorial", 
      subtitle: "Diga-nos quais cidades e regiões são contempladas pelo seu grupo." 
    },
    6: { 
      title: "Canais de Contato", 
      subtitle: "Forneça os canais oficiais para exibição pública e contato comercial." 
    }
  };

  return stepsMap[step] || { 
    title: "Etapa Adicional", 
    subtitle: "Por favor, preencha as informações complementares solicitadas." 
  };
}
