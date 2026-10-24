import React, { useState } from 'react';
import { Shield, Zap, Cpu, ArrowRight, Lock, UserCheck, ShieldCheck } from 'lucide-react';
import { User } from '../types';
import { PlioouLogo } from './PlioouLogo';

interface LoginModalProps {
  isOpen: boolean;
  onLogin: (email: string, pass: string) => Promise<boolean>;
  users: User[];
}

export const LoginModal: React.FC<LoginModalProps> = ({
  isOpen,
  onLogin,
  users,
}) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    const success = await onLogin(email, password);
    setLoading(false);
    if (!success) {
      setError('Usuário ou senha incorretos. Tente admin / admin123 ou tecnico / tecnico123.');
    }
  };

  const autofillAndLogin = async (username: string, pass: string) => {
    setEmail(username);
    setPassword(pass);
    setError('');
    setLoading(true);
    const success = await onLogin(username, pass);
    setLoading(false);
    if (!success) {
      setError('Falha ao autenticar.');
    }
  };

  return (
    <div className="fixed inset-0 bg-[#060b19] z-50 flex items-center justify-center p-4 sm:p-8 overflow-y-auto min-h-screen text-slate-100 font-sans selection:bg-blue-500 selection:text-white">
      {/* Background Dark Tech Grid & Glow FX */}
      <div className="absolute inset-0 bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:24px_24px] opacity-40 pointer-events-none" />
      <div className="absolute top-1/4 left-1/6 w-[450px] h-[450px] bg-blue-600/15 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/6 w-[450px] h-[450px] bg-purple-600/15 rounded-full blur-[120px] pointer-events-none" />

      <div className="max-w-6xl w-full grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center my-auto relative z-10 py-6">
        {/* Left Column: Branding & Hero Content */}
        <div className="lg:col-span-7 space-y-8 pr-0 lg:pr-4">
          {/* Company Logo Header */}
          <div className="space-y-1">
            <PlioouLogo className="h-12 sm:h-14" isDarkBg={true} />
            <p className="text-xs text-blue-400 font-bold tracking-wider uppercase ml-1">
              Sistema de Gestão de T.I.
            </p>
          </div>

          {/* Headline & Description */}
          <div className="space-y-4">
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-white leading-[1.1]">
              Controle total <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-blue-600">
                das suas O.S.
              </span>
            </h1>
            <p className="text-slate-400 text-sm sm:text-base leading-relaxed max-w-lg">
              Gestão profissional de ordens de serviço para empresas de T.I. — do atendimento à aprovação do cliente.
            </p>
          </div>

          {/* Feature Badges */}
          <div className="space-y-3 pt-2 max-w-md">
            <div className="flex items-center gap-3 p-3.5 rounded-2xl bg-[#0e1735]/80 border border-slate-800/80 text-xs sm:text-sm font-medium text-slate-200 backdrop-blur-md shadow-sm">
              <div className="p-2 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20 shrink-0">
                <Shield className="w-4 h-4" />
              </div>
              <span>Controle por perfil: Admin e Técnico</span>
            </div>

            <div className="flex items-center gap-3 p-3.5 rounded-2xl bg-[#0e1735]/80 border border-slate-800/80 text-xs sm:text-sm font-medium text-slate-200 backdrop-blur-md shadow-sm">
              <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 shrink-0">
                <Zap className="w-4 h-4" />
              </div>
              <span>Fluxo automático entre etapas</span>
            </div>

            <div className="flex items-center gap-3 p-3.5 rounded-2xl bg-[#0e1735]/80 border border-slate-800/80 text-xs sm:text-sm font-medium text-slate-200 backdrop-blur-md shadow-sm">
              <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 shrink-0">
                <Cpu className="w-4 h-4" />
              </div>
              <span>Histórico completo de cada O.S.</span>
            </div>
          </div>

          {/* Footer */}
          <p className="text-xs text-slate-600 font-medium pt-4">
            © 2026 Plioou — Todos os direitos reservados
          </p>
        </div>

        {/* Right Column: Dark Login Card */}
        <div className="lg:col-span-5">
          <div className="bg-[#0b132b]/90 border border-slate-800/90 rounded-3xl p-6 sm:p-8 backdrop-blur-xl shadow-2xl shadow-blue-950/60 space-y-6">
            {/* Form Header */}
            <div>
              <h2 className="text-2xl font-bold text-white tracking-tight">Acessar sistema</h2>
              <p className="text-xs text-slate-400 mt-1 font-medium">
                Entre com suas credenciais
              </p>
            </div>

            {/* Error message */}
            {error && (
              <div className="p-3 bg-rose-950/80 border border-rose-800/80 rounded-xl text-rose-300 text-xs font-medium">
                {error}
              </div>
            )}

            {/* Login Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Usuário
                </label>
                <input
                  type="text"
                  required
                  placeholder="seu.usuario"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-3 bg-[#131d3d] border border-slate-700/60 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Senha
                </label>
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-3 bg-[#131d3d] border border-slate-700/60 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl text-sm shadow-lg shadow-blue-600/35 transition cursor-pointer flex items-center justify-center gap-2 mt-2"
              >
                <span>{loading ? 'Autenticando...' : 'Entrar'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>

            <div className="pt-2 border-t border-slate-800/80">
              <span className="block text-[10px] font-extrabold uppercase tracking-widest text-slate-500 text-center mb-3">
                CREDENCIAS DE TESTE
              </span>

              <div className="grid grid-cols-2 gap-2.5">
                <button
                  type="button"
                  onClick={() => autofillAndLogin('admin', 'admin123')}
                  className="p-3 bg-[#131d3d]/80 hover:bg-[#1a2752] border border-amber-500/30 hover:border-amber-400/60 rounded-xl text-left transition group cursor-pointer"
                >
                  <div className="flex items-center gap-1.5 text-amber-400 font-bold text-xs">
                    <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
                    <span>Admin</span>
                  </div>
                  <span className="text-[10px] text-slate-400 block mt-1 font-mono">
                    admin / admin123
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => autofillAndLogin('tecnico', 'tecnico123')}
                  className="p-3 bg-[#131d3d]/80 hover:bg-[#1a2752] border border-blue-500/30 hover:border-blue-400/60 rounded-xl text-left transition group cursor-pointer"
                >
                  <div className="flex items-center gap-1.5 text-blue-400 font-bold text-xs">
                    <UserCheck className="w-3.5 h-3.5 shrink-0" />
                    <span>Técnico</span>
                  </div>
                  <span className="text-[10px] text-slate-400 block mt-1 font-mono">
                    tecnico / tecnico123
                  </span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
