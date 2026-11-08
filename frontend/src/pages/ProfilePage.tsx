import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

interface UserData {
  id: number;
  fullName: string;
  email: string;
  phone?: string;
  notifyInApp: boolean;
  notifyEmail: boolean;
  reminderMinutes: number;
}


export const ProfilePage: React.FC = () => {
  const navigate = useNavigate();

  // Se pot prelua inițial din localStorage sau dintr-un apel GET /api/users/me
  const savedUser = JSON.parse(localStorage.getItem('user') || '{}');

  const [fullName, setFullName] = useState<string>(savedUser.fullName || '');
  const [phone, setPhone] = useState<string>(savedUser.phone || '');
  const [notifyInApp, setNotifyInApp] = useState<boolean>(savedUser.notifyInApp ?? true);
  const [notifyEmail, setNotifyEmail] = useState<boolean>(savedUser.notifyEmail ?? true);
  const [reminderMinutes, setReminderMinutes] = useState<number>(savedUser.reminderMinutes || 60);

  // Stări pentru schimbare parolă
  const [currentPassword, setCurrentPassword] = useState<string>('');
  const [newPassword, setNewPassword] = useState<string>('');
  const [confirmNewPassword, setConfirmNewPassword] = useState<string>('');

  // Stări pentru notificări de eroare / succes
  const [infoMessage, setInfoMessage] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);

  // Modal confirmare ștergere cont
  const [showDeleteModal, setShowDeleteModal] = useState<boolean>(false);

  // Salvare profil & preferințe
  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setInfoMessage('');
    setLoading(true);

    try {
      const response = await fetch(`http://localhost:8080/api/users/${savedUser.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName,
          phone,
          notifyInApp,
          notifyEmail,
          reminderMinutes,
        }),
      });

      if (!response.ok) throw new Error('Nu s-au putut actualiza datele.');

      const updatedUser = await response.json();
      localStorage.setItem('user', JSON.stringify(updatedUser));
      setInfoMessage('Profilul a fost actualizat cu succes!');
    } catch (err: any) {
      setErrorMessage(err.message || 'Eroare la salvare.');
    } finally {
      setLoading(false);
    }
  };

  // Schimbare parolă
  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setInfoMessage('');

    if (newPassword !== confirmNewPassword) {
      setErrorMessage('Parolele noi nu se potrivesc.');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(`http://localhost:8080/api/users/${savedUser.id}/change-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentPassword,
          newPassword,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || 'Parola curentă este incorectă.');
      }

      setInfoMessage('Parola a fost modificată cu succes!');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmNewPassword('');
    } catch (err: any) {
      setErrorMessage(err.message || 'Nu s-a putut schimba parola.');
    } finally {
      setLoading(false);
    }
  };

  // Ștergere cont
  const handleDeleteAccount = async () => {
    setLoading(true);
    try {
      const response = await fetch(`http://localhost:8080/api/users/${savedUser.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) throw new Error('Nu s-a putut șterge contul.');

      localStorage.removeItem('user');
      navigate('/signup');
    } catch (err: any) {
      setErrorMessage(err.message || 'Eroare la ștergerea contului.');
      setShowDeleteModal(false);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white p-4 md:p-8">
      <div className="max-w-3xl mx-auto space-y-6">
        
        {/* Header */}
        <div className="flex justify-between items-center border-b border-slate-800 pb-4">
          <div>
            <h1 className="text-2xl font-bold text-white">Setări Profil</h1>
            <p className="text-xs text-slate-400">Gestionează datele personale, securitatea și preferințele contului.</p>
          </div>
          <button
            onClick={() => navigate('/facilitati')}
            className="text-xs text-slate-400 hover:text-white bg-slate-900 border border-slate-800 px-3 py-1.5 rounded-md transition-colors"
          >
            ← Înapoi
          </button>
        </div>

        {/* Mesaje Feedback */}
        {infoMessage && (
          <div className="bg-sky-500/10 border border-sky-500/20 text-sky-400 rounded-md p-3 text-xs text-center">
            {infoMessage}
          </div>
        )}

        {errorMessage && (
          <div className="bg-red-500/10 border border-red-500/20 text-red-400 rounded-md p-3 text-xs text-center">
            {errorMessage}
          </div>
        )}

        {/* 1. Date Personale & Preferințe */}
        <div className="bg-slate-900 rounded-xl p-6 border border-slate-800 shadow-xl">
          <h2 className="text-lg font-bold text-sky-400 mb-4">Informații Personale</h2>
          
          <form onSubmit={handleUpdateProfile} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">Email (neconfigurabil)</label>
              <input
                type="email"
                value={savedUser.email || ''}
                disabled
                className="w-full bg-slate-950/50 border border-slate-800 rounded-md px-3 py-2 text-slate-500 cursor-not-allowed text-sm"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Nume Complet</label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-md px-3 py-2 text-white focus:outline-none focus:border-sky-500 text-sm"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Număr de Telefon</label>
                <input
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="07xxxxxxxx"
                  className="w-full bg-slate-950 border border-slate-800 rounded-md px-3 py-2 text-white focus:outline-none focus:border-sky-500 text-sm"
                />
              </div>
            </div>

            {/* Preferințe Notificări */}
            <div className="pt-4 border-t border-slate-800 space-y-3">
              <span className="block text-sm font-medium text-slate-300">Notificări & Memento-uri</span>
              
              <div className="flex items-center space-x-6 text-sm">
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={notifyInApp}
                    onChange={(e) => setNotifyInApp(e.target.checked)}
                    className="accent-sky-500 rounded"
                  />
                  <span className="text-slate-300">În aplicație</span>
                </label>

                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={notifyEmail}
                    onChange={(e) => setNotifyEmail(e.target.checked)}
                    className="accent-sky-500 rounded"
                  />
                  <span className="text-slate-300">Pe Email</span>
                </label>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Memento înainte de rezervare (minute)</label>
                <select
                  value={reminderMinutes}
                  onChange={(e) => setReminderMinutes(Number(e.target.value))}
                  className="bg-slate-950 border border-slate-800 rounded-md px-3 py-1.5 text-white text-sm focus:outline-none focus:border-sky-500"
                >
                  <option value={15}>15 minute</option>
                  <option value={30}>30 minute</option>
                  <option value={60}>1 oră</option>
                  <option value={120}>2 ore</option>
                </select>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="bg-sky-500 hover:bg-sky-600 text-white font-medium px-4 py-2 rounded-md text-sm transition-colors disabled:opacity-50"
            >
              Salvează modificările
            </button>
          </form>
        </div>

        {/* 2. Schimbare Parolă */}
        <div className="bg-slate-900 rounded-xl p-6 border border-slate-800 shadow-xl">
          <h2 className="text-lg font-bold text-sky-400 mb-4">Securitate Parolă</h2>
          
          <form onSubmit={handleChangePassword} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">Parola curentă</label>
              <input
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="w-full bg-slate-950 border border-slate-800 rounded-md px-3 py-2 text-white focus:outline-none focus:border-sky-500 text-sm"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Parola nouă</label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  minLength={6}
                  className="w-full bg-slate-950 border border-slate-800 rounded-md px-3 py-2 text-white focus:outline-none focus:border-sky-500 text-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Confirmă parola nouă</label>
                <input
                  type="password"
                  value={confirmNewPassword}
                  onChange={(e) => setConfirmNewPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="w-full bg-slate-950 border border-slate-800 rounded-md px-3 py-2 text-white focus:outline-none focus:border-sky-500 text-sm"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="bg-sky-500 hover:bg-sky-600 text-white font-medium px-4 py-2 rounded-md text-sm transition-colors disabled:opacity-50"
            >
              Actualizează parola
            </button>
          </form>
        </div>

        {/* 3. Zona Periculoasă (Ștergere Cont) */}
        <div className="bg-red-950/20 rounded-xl p-6 border border-red-500/20 shadow-xl">
          <h2 className="text-lg font-bold text-red-400 mb-1">Zonă Periculoasă</h2>
          <p className="text-xs text-slate-400 mb-4">
            Ștergerea contului este o acțiune permanentă. Toate rezervările și datele asociate vor fi eliminate definitiv.
          </p>

          <button
            type="button"
            onClick={() => setShowDeleteModal(true)}
            className="bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-400 font-medium px-4 py-2 rounded-md text-sm transition-colors"
          >
            Șterge contul
          </button>
        </div>

      </div>

      {/* Modal Confirmare Ștergere */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 max-w-md w-full shadow-2xl">
            <h3 className="text-lg font-bold text-white mb-2">Ești absolut sigur?</h3>
            <p className="text-xs text-slate-400 mb-6 leading-relaxed">
              Această acțiune nu poate fi anulată. Contul tău USV și toate rezervările active vor fi șterse definitiv din baza de date.
            </p>

            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setShowDeleteModal(false)}
                className="px-4 py-2 text-sm text-slate-300 hover:text-white transition-colors"
              >
                Anulează
              </button>
              <button
                onClick={handleDeleteAccount}
                disabled={loading}
                className="px-4 py-2 text-sm bg-red-600 hover:bg-red-700 text-white rounded-md transition-colors disabled:opacity-50"
              >
                {loading ? 'Se șterge...' : 'Da, șterge contul'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};