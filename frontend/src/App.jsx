import React, { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import Topbar from './components/Topbar';
import ShiftModal from './components/ShiftModal';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import PosPage from './pages/PosPage';
import KdsPage from './pages/KdsPage';
import RecipePage from './pages/RecipePage';
import InventoryPage from './pages/InventoryPage';
import FinancePage from './pages/FinancePage';
import CustomerFeedbackPage from './pages/CustomerFeedbackPage';
import PublicFeedbackPage from './pages/PublicFeedbackPage';
import AuditLogPage from './pages/AuditLogPage';
import PurchaseOrderPage from './pages/PurchaseOrderPage';
import { fetchApi, socket } from './utils/api';

export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [currentUser, setCurrentUser] = useState(null);
  const [authToken, setAuthToken] = useState(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [users, setUsers] = useState([]);
  const [shifts, setShifts] = useState([]);
  const [activeShift, setActiveShift] = useState(null);
  const [showShiftModal, setShowShiftModal] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);

  // Restore session (if any) from localStorage on first load
  useEffect(() => {
    try {
      const savedToken = localStorage.getItem('bangarif_token');
      const savedUser = localStorage.getItem('bangarif_user');
      if (savedToken && savedUser) {
        setAuthToken(savedToken);
        setCurrentUser(JSON.parse(savedUser));
      }
    } catch (err) {
      console.error('Failed to restore session:', err);
    } finally {
      setAuthChecked(true);
    }
  }, []);

  const handleLoginSuccess = (data) => {
    localStorage.setItem('bangarif_token', data.token);
    localStorage.setItem('bangarif_user', JSON.stringify(data.user));
    setAuthToken(data.token);
    setCurrentUser(data.user);
    if (data.activeShift) setActiveShift(data.activeShift);
    setActiveTab(data.user.role === 'KASIR' ? 'pos' : 'dashboard');
  };

  const handleLogout = () => {
    localStorage.removeItem('bangarif_token');
    localStorage.removeItem('bangarif_user');
    setAuthToken(null);
    setCurrentUser(null);
    setActiveTab('dashboard');
  };

  // Check URL query parameters for direct public feedback QR link (e.g., ?page=public-feedback)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('page') === 'public-feedback') {
      setActiveTab('public-feedback');
    }
  }, []);

  const loadInitialData = async () => {
    try {
      const [uList, sList, notifs] = await Promise.all([
        fetchApi('/auth/users'),
        fetchApi('/auth/shifts'),
        fetchApi('/notifications')
      ]);

      setUsers(uList);
      setShifts(sList);
      setNotifications(notifs.notifications || []);
      setUnreadCount(notifs.unreadCount || 0);

      // Check active shift
      const shiftsRes = await fetchApi('/finance/shift-reconciliation');
      const openShift = shiftsRes.find(s => s.status === 'OPEN');
      if (openShift) {
        setActiveShift(openShift);
      } else {
        setActiveShift(null);
      }
    } catch (err) {
      console.error('Failed to load initial data:', err);
    }
  };

  useEffect(() => {
    if (!currentUser) return;

    loadInitialData();

    // Socket listeners for real-time notifications
    socket.on('notification:new', (notif) => {
      setNotifications(prev => [notif, ...prev]);
      setUnreadCount(c => c + 1);
      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification(notif.title || 'Notifikasi Bang Arif', { body: notif.message || '' });
      }
    });
    if ('Notification' in window && Notification.permission === 'default') Notification.requestPermission().catch(()=>{});

    socket.on('inventory:low_stock', () => {
      loadInitialData();
    });

    return () => {
      socket.off('notification:new');
      socket.off('inventory:low_stock');
    };
  }, [currentUser]);

  const handleRefreshNotifications = async () => {
    try {
      const notifs = await fetchApi('/notifications');
      setNotifications(notifs.notifications || []);
      setUnreadCount(notifs.unreadCount || 0);
    } catch (err) {
      console.error(err);
    }
  };

  if (!authChecked) {
    return <div className="min-h-screen bg-page" />;
  }

  if (!currentUser) {
    return <LoginPage onLoginSuccess={handleLoginSuccess} />;
  }

  return (
    <div className="min-h-screen flex font-['Plus_Jakarta_Sans',sans-serif]">
      {/* Left Sidebar Navigation */}
      {activeTab !== 'public-feedback' && (
        <Sidebar
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          currentUser={currentUser}
          onLogout={handleLogout}
        />
      )}

      {/* Right Column: Topbar + Page Body */}
      <div className="flex-1 flex flex-col min-w-0">
        {activeTab !== 'public-feedback' && (
          <Topbar
            activeTab={activeTab}
            setActiveTab={setActiveTab}
            currentUser={currentUser}
            setCurrentUser={setCurrentUser}
            users={users}
            activeShift={activeShift}
            onOpenShiftModal={() => setShowShiftModal(true)}
            notifications={notifications}
            unreadCount={unreadCount}
            onRefreshNotifications={handleRefreshNotifications}
          />
        )}

        <main className="flex-1 overflow-y-auto">
        {activeTab === 'dashboard' && (
          <DashboardPage onNavigateTab={setActiveTab} />
        )}

        {activeTab === 'pos' && (
          <PosPage
            currentUser={currentUser}
            activeShift={activeShift}
            onOpenShiftModal={() => setShowShiftModal(true)}
          />
        )}

        {activeTab === 'kds' && (
          <KdsPage onNavigateTab={setActiveTab} />
        )}

        {activeTab === 'recipe' && (
          <RecipePage currentUser={currentUser} />
        )}

        {activeTab === 'inventory' && (
          <InventoryPage
            currentUser={currentUser}
            onNavigateTab={setActiveTab}
          />
        )}

        {activeTab === 'finance' && (
          <FinancePage currentUser={currentUser} />
        )}

        {activeTab === 'crm' && (
          <CustomerFeedbackPage
            currentUser={currentUser}
            onNavigateTab={setActiveTab}
          />
        )}

        {activeTab === 'purchase-order' && (
          <PurchaseOrderPage currentUser={currentUser} onNavigateTab={setActiveTab} />
        )}

        {activeTab === 'audit' && (
          <AuditLogPage />
        )}

        {activeTab === 'public-feedback' && (
          <div>
            <div className="p-3 bg-ink-900 text-white flex items-center justify-between px-6 text-xs">
              <span className="font-bold">📱 Mode Pratinjau Pelanggan (Scan QR Meja / Struk)</span>
              <button
                onClick={() => setActiveTab('dashboard')}
                className="px-3 py-1 rounded-lg bg-brand-500 hover:bg-brand-600 text-white font-extrabold"
              >
                ← Kembali Ke Dashboard Manajemen
              </button>
            </div>
            <PublicFeedbackPage onBackToDashboard={() => setActiveTab('dashboard')} />
          </div>
        )}
        </main>
      </div>

      {/* Shift Modal */}
      {showShiftModal && (
        <ShiftModal
          activeShift={activeShift}
          shifts={shifts}
          currentUser={currentUser}
          onClose={() => setShowShiftModal(false)}
          onShiftUpdated={loadInitialData}
        />
      )}
    </div>
  );
}
