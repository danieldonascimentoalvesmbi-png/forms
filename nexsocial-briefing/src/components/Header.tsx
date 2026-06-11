import React from 'react';
import { FileText, Phone, Lock, LayoutDashboard } from 'lucide-react';
import { Settings } from '../types';

interface HeaderProps {
  settings: Settings;
  currentView: 'home' | 'form' | 'admin';
  setView: (view: 'home' | 'form' | 'admin') => void;
  isAuthenticated: boolean;
  onLogout: () => void;
}

export default function Header({ settings, currentView, setView, isAuthenticated, onLogout }: HeaderProps) {
  const formatWhatsappUrl = (num: string) => {
    const cleaned = num.replace(/\D/g, '');
    return `https://wa.me/${cleaned || '5562999407906'}`;
  };

  return (
    <header className="sticky top-0 z-50 border-b border-zinc-800 bg-zinc-950/80 backdrop-blur-md">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
        
        {/* LOGO */}
        <div 
          onClick={() => setView('form')} 
          className="flex cursor-pointer items-center gap-3 transition-opacity hover:opacity-90"
          id="header-logo-container"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-red-600 shadow-lg shadow-red-900/30">
            <FileText className="h-6 w-6 text-white animate-pulse" />
          </div>
          <div>
            <h1 className="font-heading text-lg font-bold tracking-tight text-white uppercase sm:text-xl">
              {settings.logo || 'NexSocial'}
            </h1>
            <p className="text-[10px] tracking-widest text-zinc-400 uppercase sm:text-xs font-semibold">
              {settings.slogan || 'Briefing de Alta Conversão'}
            </p>
          </div>
        </div>

        {/* NAVIGATION & ACTIONS */}
        <div className="flex items-center gap-2 sm:gap-4">
          
          <button
            onClick={() => setView('form')}
            className={`cursor-pointer rounded-lg px-3 py-1.5 text-xs font-medium transition-all sm:text-sm ${
              currentView === 'form'
                ? 'bg-red-600 text-white shadow-md shadow-red-900/20'
                : 'bg-zinc-900/60 text-zinc-300 border border-zinc-800 hover:bg-zinc-800 hover:text-white'
            }`}
            id="nav-form-btn"
          >
            Formulário
          </button>

          {isAuthenticated ? (
            <div className="flex items-center gap-2">
              <button
                onClick={() => setView('admin')}
                className={`cursor-pointer flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-all sm:text-sm ${
                  currentView === 'admin'
                    ? 'bg-red-600 text-white'
                    : 'bg-zinc-900 text-red-500 border border-red-950/50 hover:bg-zinc-850'
                }`}
                id="nav-dashboard-btn"
              >
                <LayoutDashboard className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Painel Admin</span>
              </button>
              <button
                onClick={onLogout}
                className="cursor-pointer rounded-lg bg-zinc-900 px-2.5 py-1.5 text-xs text-zinc-400 hover:bg-zinc-805 hover:text-white border border-zinc-800"
                id="nav-logout-btn"
              >
                Sair
              </button>
            </div>
          ) : (
            <button
              onClick={() => setView('admin')}
              className={`cursor-pointer flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-all sm:px-3 text-zinc-400 hover:text-white hover:bg-zinc-900 ${
                currentView === 'admin' ? 'text-white bg-zinc-900' : ''
              }`}
              title="Acesso Administrativo"
              id="nav-admin-login-btn"
            >
              <Lock className="h-3.5 w-3.5" />
              <span className="hidden md:inline">Painel Admin</span>
            </button>
          )}

          {/* QUICK TELEPHONE LINK */}
          <a
            href={formatWhatsappUrl(settings.whatsapp)}
            target="_blank"
            referrerPolicy="no-referrer"
            className="hidden items-center gap-2 rounded-lg bg-green-600/10 border border-green-500/20 px-3 py-1.5 text-xs font-medium text-green-400 transition-all hover:bg-green-600/25 sm:flex"
            id="nav-whatsapp-call-btn"
          >
            <Phone className="h-3.5 w-3.5 fill-current" />
            <span className="font-semibold text-xs">{settings.whatsapp || '62999407906'}</span>
          </a>
        </div>

      </div>
    </header>
  );
}
