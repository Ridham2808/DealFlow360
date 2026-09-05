'use client';

import React, { useState, useEffect } from 'react';
import { api } from '../../../../lib/api';
import { useAuth } from '../../../../context/AuthContext';
import { 
  Users, 
  UserPlus, 
  Building2, 
  Mail, 
  RotateCw, 
  Download, 
  MoreHorizontal, 
  CheckCircle2, 
  AlertCircle, 
  X, 
  ShieldAlert, 
  Send, 
  KeyRound, 
  Clock, 
  ShieldCheck, 
  Search,
  Check,
  Building,
  UserCheck
} from 'lucide-react';

export default function AdminUsersPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'ADMIN';

  const [activeTab, setActiveTab] = useState('internal'); // 'internal' | 'customers'
  const [users, setUsers] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  // Modals state
  const [isCreateUserModalOpen, setIsCreateUserModalOpen] = useState(false);
  const [isCreateCustomerModalOpen, setIsCreateCustomerModalOpen] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState(null); // { type: 'deactivate'|'role', user, ... }
  const [activeActionMenu, setActiveActionMenu] = useState(null);

  // Status banners
  const [statusMsg, setStatusMsg] = useState(null); // { type: 'success' | 'error', text: '' }

  // User form state
  const [userForm, setUserForm] = useState({
    name: '',
    email: '',
    role: 'SALES_REP',
    team: 'Sales Operations',
    phone: '',
    sendInvite: true,
  });

  // Customer form state
  const [customerForm, setCustomerForm] = useState({
    companyName: '',
    contactName: '',
    contactEmail: '',
    tier: 'BRONZE',
    assignedRepId: '',
    currency: 'USD',
    taxId: '',
    portalAccess: 'NOW', // 'NOW' | 'LATER'
  });

  const [submitting, setSubmitting] = useState(false);

  // Fetch users & customers
  const fetchData = async () => {
    try {
      setLoading(true);
      const [usersRes, customersRes] = await Promise.all([
        api.get('/admin/users'),
        api.get('/admin/customers'),
      ]);

      if (usersRes.data?.users) {
        setUsers(usersRes.data.users);
      }
      if (customersRes.data?.customers) {
        setCustomers(customersRes.data.customers);
      }
    } catch (err) {
      console.error('Failed to load data:', err);
      setStatusMsg({ type: 'error', text: err.response?.data?.error?.message || 'Failed to load team data' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Close active action menus on document click
  useEffect(() => {
    const handleOutsideClick = () => setActiveActionMenu(null);
    window.addEventListener('click', handleOutsideClick);
    return () => window.removeEventListener('click', handleOutsideClick);
  }, []);

  // Auto clear notifications
  useEffect(() => {
    if (statusMsg) {
      const timer = setTimeout(() => setStatusMsg(null), 6000);
      return () => clearTimeout(timer);
    }
  }, [statusMsg]);

  // Handlers for User Creation
  const handleCreateUser = async (e, sendInviteDirectly) => {
    if (e) e.preventDefault();
    if (!userForm.name || !userForm.email) {
      setStatusMsg({ type: 'error', text: 'Name and email are required' });
      return;
    }

    try {
      setSubmitting(true);
      const res = await api.post('/admin/users', {
        name: userForm.name,
        email: userForm.email,
        role: userForm.role,
        team: userForm.team,
        sendInvite: sendInviteDirectly !== undefined ? sendInviteDirectly : userForm.sendInvite,
      });

      const emailSent = res.data?.emailSent;
      setStatusMsg({
        type: 'success',
        text: emailSent 
          ? `User created successfully. Invitation email sent to ${userForm.email}.`
          : `User created. Status: INVITATION_PENDING (Token generated).`
      });

      setIsCreateUserModalOpen(false);
      setUserForm({
        name: '',
        email: '',
        role: 'SALES_REP',
        team: 'Sales Operations',
        phone: '',
        sendInvite: true,
      });
      fetchData();
    } catch (err) {
      setStatusMsg({ type: 'error', text: err.response?.data?.error?.message || 'Failed to create user' });
    } finally {
      setSubmitting(false);
    }
  };

  // Handlers for Customer Creation
  const handleCreateCustomer = async (e, sendInviteNow) => {
    if (e) e.preventDefault();
    if (!customerForm.companyName || !customerForm.contactEmail) {
      setStatusMsg({ type: 'error', text: 'Company name and contact email are required' });
      return;
    }

    try {
      setSubmitting(true);
      const shouldInvite = sendInviteNow !== undefined ? sendInviteNow : customerForm.portalAccess === 'NOW';

      const res = await api.post('/admin/customers', {
        name: customerForm.companyName,
        email: customerForm.contactEmail,
        tier: customerForm.tier,
        currency: customerForm.currency,
        contactName: customerForm.contactName || customerForm.companyName,
        contactEmail: customerForm.contactEmail,
        sendPortalInvite: shouldInvite,
      });

      setStatusMsg({
        type: 'success',
        text: shouldInvite
          ? `Customer account created. Portal invitation dispatched to ${customerForm.contactEmail}.`
          : `Customer company created successfully.`
      });

      setIsCreateCustomerModalOpen(false);
      setCustomerForm({
        companyName: '',
        contactName: '',
        contactEmail: '',
        tier: 'BRONZE',
        assignedRepId: '',
        currency: 'USD',
        taxId: '',
        portalAccess: 'NOW',
      });
      fetchData();
    } catch (err) {
      setStatusMsg({ type: 'error', text: err.response?.data?.error?.message || 'Failed to create customer' });
    } finally {
      setSubmitting(false);
    }
  };

  // Resend Invite
  const handleResendInvite = async (userId, targetEmail) => {
    try {
      setLoading(true);
      const res = await api.post(`/admin/users/${userId}/resend-invite`);
      const emailSent = res.data?.emailSent;
      setStatusMsg({
        type: 'success',
        text: emailSent
          ? `New invitation email sent to ${targetEmail}.`
          : `Fresh invitation token generated for ${targetEmail}.`
      });
      fetchData();
    } catch (err) {
      setStatusMsg({ type: 'error', text: err.response?.data?.error?.message || 'Failed to resend invitation' });
    } finally {
      setLoading(false);
    }
  };

  // Customer Send Portal Invite
  const handleSendCustomerInvite = async (customerId, contactEmail, contactName) => {
    try {
      setLoading(true);
      const res = await api.post(`/admin/customers/${customerId}/send-portal-invite`, {
        contactEmail,
        contactName,
      });
      const emailSent = res.data?.emailSent;
      setStatusMsg({
        type: 'success',
        text: emailSent
          ? `Customer portal invitation delivered to ${contactEmail}.`
          : `Customer portal token generated.`
      });
      fetchData();
    } catch (err) {
      setStatusMsg({ type: 'error', text: err.response?.data?.error?.message || 'Failed to send customer invite' });
    } finally {
      setLoading(false);
    }
  };

  // Execute Deactivation
  const executeDeactivate = async () => {
    if (!confirmDialog?.user) return;
    try {
      setSubmitting(true);
      await api.post(`/admin/users/${confirmDialog.user.id}/deactivate`);
      setStatusMsg({ type: 'success', text: `User ${confirmDialog.user.name} has been deactivated.` });
      setConfirmDialog(null);
      fetchData();
    } catch (err) {
      setStatusMsg({ type: 'error', text: err.response?.data?.error?.message || 'Cannot deactivate user' });
      setConfirmDialog(null);
    } finally {
      setSubmitting(false);
    }
  };

  // Execute Role Change
  const executeRoleChange = async () => {
    if (!confirmDialog?.user || !confirmDialog?.newRole) return;
    try {
      setSubmitting(true);
      await api.post(`/admin/users/${confirmDialog.user.id}/change-role`, {
        role: confirmDialog.newRole,
      });
      setStatusMsg({ type: 'success', text: `Role for ${confirmDialog.user.name} updated to ${confirmDialog.newRole}.` });
      setConfirmDialog(null);
      fetchData();
    } catch (err) {
      setStatusMsg({ type: 'error', text: err.response?.data?.error?.message || 'Failed to update role' });
      setConfirmDialog(null);
    } finally {
      setSubmitting(false);
    }
  };

  // Export Users CSV
  const handleExportUsers = () => {
    const dataToExport = activeTab === 'internal' ? users : customers;
    const jsonStr = JSON.stringify(dataToExport, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `dealflow360_${activeTab}_export.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Filtering
  const filteredUsers = users.filter((u) => 
    u.name?.toLowerCase().includes(search.toLowerCase()) ||
    u.email?.toLowerCase().includes(search.toLowerCase()) ||
    u.role?.toLowerCase().includes(search.toLowerCase())
  );

  const filteredCustomers = customers.filter((c) =>
    c.name?.toLowerCase().includes(search.toLowerCase()) ||
    c.email?.toLowerCase().includes(search.toLowerCase()) ||
    c.tier?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="w-full text-[#c8c8c2] pb-16 select-none">
      {/* Main Container */}
      <div className="w-full">
        {/* Status Toast */}
        {statusMsg && (
          <div className={`mb-6 p-4 rounded-xl border flex items-center justify-between text-xs font-medium transition-all ${
            statusMsg.type === 'success'
              ? 'bg-[#0f1712] border-[#1d3c26] text-[#4ade80]'
              : 'bg-[#180f12] border-[#3e1820] text-[#f87171]'
          }`}>
            <div className="flex items-center gap-2.5">
              {statusMsg.type === 'success' ? <CheckCircle2 className="w-4 h-4 text-[#4ade80]" /> : <AlertCircle className="w-4 h-4 text-[#f87171]" />}
              <span>{statusMsg.text}</span>
            </div>
            <button onClick={() => setStatusMsg(null)} className="p-1 text-[#666] hover:text-white">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Page Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-[#18181f]">
          <div>
            <h1 className="text-xl lg:text-2xl font-semibold text-white tracking-tight flex items-center gap-2.5">
              <Users className="w-6 h-6 text-[#9e9ea7]" />
              <span>Users & Customers</span>
            </h1>
            <p className="text-xs text-[#71717a] mt-1">
              Create internal team members, assign roles, invite customers, and manage portal access.
            </p>
          </div>

          {/* Top-Right Action Buttons */}
          <div className="flex items-center flex-wrap gap-2.5">
            <button
              onClick={() => fetchData()}
              title="Refresh Records"
              className="h-8 px-3 rounded-lg bg-[#111217] hover:bg-[#181920] border border-[#22232a] text-xs font-medium text-[#c4c4cc] hover:text-white flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <RotateCw className={`w-3.5 h-3.5 text-[#71717a] ${loading ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Refresh</span>
            </button>

            <button
              onClick={handleExportUsers}
              title="Export Records"
              className="h-8 px-3 rounded-lg bg-[#111217] hover:bg-[#181920] border border-[#22232a] text-xs font-medium text-[#c4c4cc] hover:text-white flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <Download className="w-3.5 h-3.5 text-[#71717a]" />
              <span className="hidden sm:inline">Export</span>
            </button>

            {isAdmin && (
              <>
                <button
                  onClick={() => setIsCreateUserModalOpen(true)}
                  className="h-8 px-3.5 rounded-lg bg-[#181920] hover:bg-[#20212b] border border-[#2b2c37] text-xs font-semibold text-white flex items-center gap-1.5 transition-all shadow-[0_1px_3px_rgba(0,0,0,0.5)] cursor-pointer"
                >
                  <UserPlus className="w-3.5 h-3.5 text-[#60a5fa]" />
                  <span>+ Create Internal User</span>
                </button>

                <button
                  onClick={() => setIsCreateCustomerModalOpen(true)}
                  className="h-8 px-3.5 rounded-lg bg-[#ededed] hover:bg-white text-[#09090b] text-xs font-semibold flex items-center gap-1.5 transition-all shadow-[0_1px_3px_rgba(0,0,0,0.4)] cursor-pointer"
                >
                  <Building2 className="w-3.5 h-3.5 text-[#18181b]" />
                  <span>+ Create Customer</span>
                </button>
              </>
            )}
          </div>
        </div>

        {/* Tab Switcher & Search Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mt-6 mb-5">
          <div className="flex items-center gap-1.5 p-1 bg-[#101116] border border-[#1d1e26] rounded-xl w-fit">
            <button
              onClick={() => setActiveTab('internal')}
              className={`h-7 px-4 rounded-lg text-xs font-medium transition-all flex items-center gap-2 cursor-pointer ${
                activeTab === 'internal'
                  ? 'bg-[#1c1d25] text-white border border-[#2b2c37] shadow-sm font-semibold'
                  : 'text-[#888891] hover:text-white'
              }`}
            >
              <UserCheck className="w-3.5 h-3.5" />
              <span>Internal Users</span>
              <span className="px-1.5 py-0.2 rounded-full bg-[#121318] text-[#999] text-[10px] font-mono border border-[#24252f]">
                {users.length}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('customers')}
              className={`h-7 px-4 rounded-lg text-xs font-medium transition-all flex items-center gap-2 cursor-pointer ${
                activeTab === 'customers'
                  ? 'bg-[#1c1d25] text-white border border-[#2b2c37] shadow-sm font-semibold'
                  : 'text-[#888891] hover:text-white'
              }`}
            >
              <Building className="w-3.5 h-3.5" />
              <span>Customers</span>
              <span className="px-1.5 py-0.2 rounded-full bg-[#121318] text-[#999] text-[10px] font-mono border border-[#24252f]">
                {customers.length}
              </span>
            </button>
          </div>

          {/* Search input */}
          <div className="relative w-full sm:w-64">
            <Search className="w-3.5 h-3.5 text-[#555] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder={`Search ${activeTab === 'internal' ? 'team members' : 'customers'}...`}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full h-8 pl-8 pr-3 rounded-lg bg-[#0e0f14] border border-[#1e1f27] text-xs text-white placeholder-[#555] focus:outline-none focus:border-[#383945] transition-colors"
            />
          </div>
        </div>

        {/* Tab 1: Internal Users Table */}
        {activeTab === 'internal' && (
          <div className="w-full bg-[#0c0d12] border border-[#1a1b22] rounded-2xl overflow-hidden shadow-[0_12px_32px_rgba(0,0,0,0.6)]">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-[#181820] bg-[#0f1015] text-[#71717a] font-mono text-[11px] uppercase tracking-wider">
                    <th className="py-3 px-4 font-semibold">Name</th>
                    <th className="py-3 px-4 font-semibold">Email</th>
                    <th className="py-3 px-4 font-semibold">Role</th>
                    <th className="py-3 px-4 font-semibold">Team</th>
                    <th className="py-3 px-4 font-semibold">Status</th>
                    <th className="py-3 px-4 font-semibold">Invitation Status</th>
                    <th className="py-3 px-4 font-semibold">Last Login</th>
                    <th className="py-3 px-4 font-semibold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#16171e]">
                  {loading ? (
                    <tr>
                      <td colSpan="8" className="py-12 text-center text-[#555] font-mono">
                        Loading internal workspace users...
                      </td>
                    </tr>
                  ) : filteredUsers.length === 0 ? (
                    <tr>
                      <td colSpan="8" className="py-12 text-center text-[#555]">
                        No internal users found. Click <strong className="text-white">+ Create Internal User</strong> to invite team members.
                      </td>
                    </tr>
                  ) : (
                    filteredUsers.map((u) => {
                      const isPending = u.status === 'INVITATION_PENDING';
                      const isDeactivated = u.status === 'DEACTIVATED' || !u.isActive;

                      return (
                        <tr key={u.id} className="hover:bg-[#121319] transition-colors group">
                          {/* Name */}
                          <td className="py-3.5 px-4 font-medium text-white">
                            <div className="flex items-center gap-2.5">
                              <div className="w-6 h-6 rounded-full bg-[#1a1b24] border border-[#2b2c38] text-[#c4c4cc] flex items-center justify-center text-[10px] font-bold">
                                {u.name ? u.name.charAt(0).toUpperCase() : 'U'}
                              </div>
                              <span className="truncate max-w-[150px]">{u.name}</span>
                            </div>
                          </td>

                          {/* Email */}
                          <td className="py-3.5 px-4 text-[#a1a1aa] font-mono text-[11px]">
                            {u.email}
                          </td>

                          {/* Role */}
                          <td className="py-3.5 px-4">
                            <span className={`px-2 py-0.5 rounded-md text-[10px] font-mono font-semibold uppercase tracking-wider border ${
                              u.role === 'ADMIN'
                                ? 'bg-[#27151a] border-[#4a1c26] text-[#fb7185]'
                                : u.role === 'SALES_MANAGER'
                                ? 'bg-[#1e1b2e] border-[#382d5c] text-[#a78bfa]'
                                : u.role === 'FINANCE'
                                ? 'bg-[#291b12] border-[#532e18] text-[#fb923c]'
                                : 'bg-[#121a29] border-[#1d2d48] text-[#60a5fa]'
                            }`}>
                              {u.role}
                            </span>
                          </td>

                          {/* Team */}
                          <td className="py-3.5 px-4 text-[#71717a]">
                            Sales Operations
                          </td>

                          {/* Status */}
                          <td className="py-3.5 px-4">
                            <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[10px] font-mono border ${
                              isDeactivated
                                ? 'bg-[#1f1315] border-[#3d1a20] text-[#f87171]'
                                : isPending
                                ? 'bg-[#241e12] border-[#49391b] text-[#fbbf24]'
                                : 'bg-[#0f1712] border-[#1b3b24] text-[#4ade80]'
                            }`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${
                                isDeactivated ? 'bg-[#f87171]' : isPending ? 'bg-[#fbbf24]' : 'bg-[#4ade80]'
                              }`} />
                              <span>{u.status}</span>
                            </span>
                          </td>

                          {/* Invitation Status */}
                          <td className="py-3.5 px-4 text-[#71717a] font-mono text-[11px]">
                            {isPending ? (
                              <span className="text-[#fbbf24] flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                <span>Invite Pending</span>
                              </span>
                            ) : (
                              <span className="text-[#4ade80] flex items-center gap-1">
                                <Check className="w-3 h-3" />
                                <span>Accepted</span>
                              </span>
                            )}
                          </td>

                          {/* Last Login */}
                          <td className="py-3.5 px-4 text-[#555] font-mono text-[11px]">
                            {new Date(u.createdAt).toLocaleDateString()}
                          </td>

                          {/* Actions */}
                          <td className="py-3.5 px-4 text-right relative">
                            <div className="inline-block text-left" onClick={(e) => e.stopPropagation()}>
                              <button
                                onClick={() => setActiveActionMenu(activeActionMenu === u.id ? null : u.id)}
                                className="p-1 rounded-lg hover:bg-[#1a1b24] text-[#71717a] hover:text-white transition-colors cursor-pointer"
                              >
                                <MoreHorizontal className="w-4 h-4" />
                              </button>

                              {/* Dropdown Menu */}
                              {activeActionMenu === u.id && (
                                <div className="absolute right-4 mt-1 w-48 bg-[#101117] border border-[#262733] rounded-xl shadow-[0_12px_32px_rgba(0,0,0,0.8)] p-1.5 z-40 text-left">
                                  <div className="px-2 py-1 text-[10px] font-mono uppercase text-[#555] border-b border-[#1b1c26] mb-1">
                                    User Actions
                                  </div>

                                  {isPending && (
                                    <button
                                      onClick={() => {
                                        setActiveActionMenu(null);
                                        handleResendInvite(u.id, u.email);
                                      }}
                                      className="w-full px-2 py-1.5 rounded-lg text-xs text-[#c4c4cc] hover:text-white hover:bg-[#181924] flex items-center gap-2 transition-colors cursor-pointer"
                                    >
                                      <Send className="w-3.5 h-3.5 text-[#38bdf8]" />
                                      <span>Resend Invitation</span>
                                    </button>
                                  )}

                                  {isAdmin && (
                                    <>
                                      <button
                                        onClick={() => {
                                          setActiveActionMenu(null);
                                          setConfirmDialog({
                                            type: 'role',
                                            user: u,
                                            newRole: u.role === 'ADMIN' ? 'SALES_MANAGER' : 'ADMIN',
                                          });
                                        }}
                                        className="w-full px-2 py-1.5 rounded-lg text-xs text-[#c4c4cc] hover:text-white hover:bg-[#181924] flex items-center gap-2 transition-colors cursor-pointer"
                                      >
                                        <ShieldCheck className="w-3.5 h-3.5 text-[#a78bfa]" />
                                        <span>Change Role</span>
                                      </button>

                                      {!isDeactivated && (
                                        <button
                                          onClick={() => {
                                            setActiveActionMenu(null);
                                            setConfirmDialog({
                                              type: 'deactivate',
                                              user: u,
                                            });
                                          }}
                                          className="w-full px-2 py-1.5 rounded-lg text-xs text-[#f87171] hover:bg-[#251216] flex items-center gap-2 transition-colors cursor-pointer"
                                        >
                                          <ShieldAlert className="w-3.5 h-3.5" />
                                          <span>Deactivate User</span>
                                        </button>
                                      )}
                                    </>
                                  )}
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Tab 2: Customers Table */}
        {activeTab === 'customers' && (
          <div className="w-full bg-[#0c0d12] border border-[#1a1b22] rounded-2xl overflow-hidden shadow-[0_12px_32px_rgba(0,0,0,0.6)]">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-[#181820] bg-[#0f1015] text-[#71717a] font-mono text-[11px] uppercase tracking-wider">
                    <th className="py-3 px-4 font-semibold">Company</th>
                    <th className="py-3 px-4 font-semibold">Contact Person</th>
                    <th className="py-3 px-4 font-semibold">Email</th>
                    <th className="py-3 px-4 font-semibold">Tier</th>
                    <th className="py-3 px-4 font-semibold">Assigned Rep</th>
                    <th className="py-3 px-4 font-semibold">Portal Status</th>
                    <th className="py-3 px-4 font-semibold">Status</th>
                    <th className="py-3 px-4 font-semibold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#16171e]">
                  {loading ? (
                    <tr>
                      <td colSpan="8" className="py-12 text-center text-[#555] font-mono">
                        Loading customers catalog...
                      </td>
                    </tr>
                  ) : filteredCustomers.length === 0 ? (
                    <tr>
                      <td colSpan="8" className="py-12 text-center text-[#555]">
                        No customers found. Click <strong className="text-white">+ Create Customer</strong> to add enterprise clients.
                      </td>
                    </tr>
                  ) : (
                    filteredCustomers.map((c) => {
                      const portalUser = c.users?.[0];
                      const portalPending = portalUser && portalUser.status === 'INVITATION_PENDING';
                      const portalActive = portalUser && portalUser.status === 'ACTIVE';

                      return (
                        <tr key={c.id} className="hover:bg-[#121319] transition-colors group">
                          {/* Company */}
                          <td className="py-3.5 px-4 font-medium text-white">
                            <div className="flex items-center gap-2.5">
                              <div className="w-6 h-6 rounded-md bg-[#161720] border border-[#272835] text-[#c4c4cc] flex items-center justify-center text-[10px] font-bold">
                                <Building2 className="w-3 h-3 text-[#9e9ea7]" />
                              </div>
                              <span className="truncate max-w-[160px]">{c.name}</span>
                            </div>
                          </td>

                          {/* Contact Person */}
                          <td className="py-3.5 px-4 text-[#c4c4cc]">
                            {portalUser?.name || 'Primary Contact'}
                          </td>

                          {/* Email */}
                          <td className="py-3.5 px-4 text-[#a1a1aa] font-mono text-[11px]">
                            {c.email}
                          </td>

                          {/* Tier */}
                          <td className="py-3.5 px-4">
                            <span className={`px-2 py-0.5 rounded-md text-[10px] font-mono font-semibold uppercase tracking-wider border ${
                              c.tier === 'GOLD'
                                ? 'bg-[#291f0e] border-[#553e16] text-[#fbbf24]'
                                : c.tier === 'SILVER'
                                ? 'bg-[#181920] border-[#30313f] text-[#e4e4e7]'
                                : 'bg-[#231510] border-[#46281d] text-[#f97316]'
                            }`}>
                              {c.tier}
                            </span>
                          </td>

                          {/* Assigned Rep */}
                          <td className="py-3.5 px-4 text-[#71717a]">
                            Aman Sharma
                          </td>

                          {/* Portal Status */}
                          <td className="py-3.5 px-4">
                            {portalActive ? (
                              <span className="inline-flex items-center gap-1 text-[#4ade80] text-[11px] font-mono">
                                <Check className="w-3 h-3" />
                                <span>Active</span>
                              </span>
                            ) : portalPending ? (
                              <span className="inline-flex items-center gap-1 text-[#fbbf24] text-[11px] font-mono">
                                <Clock className="w-3 h-3" />
                                <span>Invite Sent</span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-[#555] text-[11px] font-mono">
                                Not Invited
                              </span>
                            )}
                          </td>

                          {/* Status */}
                          <td className="py-3.5 px-4">
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-mono border ${
                              c.isActive
                                ? 'bg-[#0f1712] border-[#1b3b24] text-[#4ade80]'
                                : 'bg-[#1f1315] border-[#3d1a20] text-[#f87171]'
                            }`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${c.isActive ? 'bg-[#4ade80]' : 'bg-[#f87171]'}`} />
                              <span>{c.isActive ? 'Active' : 'Disabled'}</span>
                            </span>
                          </td>

                          {/* Actions */}
                          <td className="py-3.5 px-4 text-right">
                            <button
                              onClick={() => handleSendCustomerInvite(c.id, c.email, c.name)}
                              className="h-7 px-2.5 rounded-lg bg-[#14151c] hover:bg-[#1a1b24] border border-[#262733] text-[11px] font-medium text-[#c4c4cc] hover:text-white inline-flex items-center gap-1.5 transition-colors cursor-pointer"
                              title="Send or resend quotation portal invitation"
                            >
                              <Send className="w-3 h-3 text-[#38bdf8]" />
                              <span>{portalActive ? 'Resend' : 'Send Invite'}</span>
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* ═══════════════ MODAL: CREATE INTERNAL USER ═══════════════ */}
      {isCreateUserModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-[#0e0f14] border border-[#22232d] rounded-2xl p-6 shadow-[0_20px_50px_rgba(0,0,0,0.9)] animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-4 border-b border-[#1a1b24]">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-[#181922] border border-[#282937] text-[#60a5fa]">
                  <UserPlus className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-white">Create Internal User</h3>
                  <p className="text-[11px] text-[#71717a]">Provision team account and invite with secure token</p>
                </div>
              </div>
              <button
                onClick={() => setIsCreateUserModalOpen(false)}
                className="p-1 rounded-lg text-[#666] hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={(e) => handleCreateUser(e, userForm.sendInvite)} className="mt-4 space-y-3.5">
              <div>
                <label className="block text-[11px] font-semibold text-[#888] uppercase tracking-wider mb-1">
                  Full Name <span className="text-[#f87171]">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Aman Sharma"
                  value={userForm.name}
                  onChange={(e) => setUserForm({ ...userForm, name: e.target.value })}
                  className="w-full h-8 px-3 rounded-lg bg-[#14151b] border border-[#24252f] text-xs text-white placeholder-[#555] focus:outline-none focus:border-[#404152]"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-[#888] uppercase tracking-wider mb-1">
                  Email Address <span className="text-[#f87171]">*</span>
                </label>
                <input
                  type="email"
                  required
                  placeholder="e.g. aman@company.com"
                  value={userForm.email}
                  onChange={(e) => setUserForm({ ...userForm, email: e.target.value })}
                  className="w-full h-8 px-3 rounded-lg bg-[#14151b] border border-[#24252f] text-xs text-white placeholder-[#555] focus:outline-none focus:border-[#404152]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-[#888] uppercase tracking-wider mb-1">
                    Role <span className="text-[#f87171]">*</span>
                  </label>
                  <select
                    value={userForm.role}
                    onChange={(e) => setUserForm({ ...userForm, role: e.target.value })}
                    className="w-full h-8 px-2 rounded-lg bg-[#14151b] border border-[#24252f] text-xs text-white focus:outline-none focus:border-[#404152]"
                  >
                    <option value="SALES_REP">Sales Representative</option>
                    <option value="SALES_MANAGER">Sales Manager</option>
                    <option value="FINANCE">Finance & Desk</option>
                    {isAdmin && <option value="ADMIN">Administrator</option>}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-[#888] uppercase tracking-wider mb-1">
                    Team / Department
                  </label>
                  <input
                    type="text"
                    placeholder="Sales"
                    value={userForm.team}
                    onChange={(e) => setUserForm({ ...userForm, team: e.target.value })}
                    className="w-full h-8 px-3 rounded-lg bg-[#14151b] border border-[#24252f] text-xs text-white placeholder-[#555] focus:outline-none focus:border-[#404152]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-[#888] uppercase tracking-wider mb-1">
                  Phone Number <span className="text-[#555] font-normal">(optional)</span>
                </label>
                <input
                  type="text"
                  placeholder="+91 98765 43210"
                  value={userForm.phone}
                  onChange={(e) => setUserForm({ ...userForm, phone: e.target.value })}
                  className="w-full h-8 px-3 rounded-lg bg-[#14151b] border border-[#24252f] text-xs text-white placeholder-[#555] focus:outline-none focus:border-[#404152]"
                />
              </div>

              <div className="pt-2">
                <label className="flex items-center gap-2 cursor-pointer text-xs text-[#c4c4cc]">
                  <input
                    type="checkbox"
                    checked={userForm.sendInvite}
                    onChange={(e) => setUserForm({ ...userForm, sendInvite: e.target.checked })}
                    className="rounded bg-[#14151b] border-[#24252f] text-blue-600 focus:ring-0"
                  />
                  <span>Send invitation email with secure activation link</span>
                </label>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-[#1a1b24] mt-5">
                <button
                  type="button"
                  onClick={() => setIsCreateUserModalOpen(false)}
                  className="h-8 px-3.5 rounded-lg border border-[#24252f] text-xs font-medium text-[#888] hover:text-white transition-colors"
                >
                  Cancel
                </button>

                <button
                  type="button"
                  disabled={submitting}
                  onClick={(e) => handleCreateUser(e, false)}
                  className="h-8 px-3 rounded-lg bg-[#181922] hover:bg-[#222330] border border-[#2e2f3e] text-xs font-medium text-white transition-all"
                >
                  Create User
                </button>

                <button
                  type="submit"
                  disabled={submitting}
                  className="h-8 px-3.5 rounded-lg bg-[#ededed] hover:bg-white text-xs font-semibold text-[#09090b] transition-all flex items-center gap-1.5"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{submitting ? 'Sending...' : 'Create & Send Invite'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ═══════════════ MODAL: CREATE CUSTOMER ═══════════════ */}
      {isCreateCustomerModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-[#0e0f14] border border-[#22232d] rounded-2xl p-6 shadow-[0_20px_50px_rgba(0,0,0,0.9)] animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-4 border-b border-[#1a1b24]">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-[#181922] border border-[#282937] text-[#fbbf24]">
                  <Building2 className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-white">Create Enterprise Customer</h3>
                  <p className="text-[11px] text-[#71717a]">Customer business account, discount tier & quotation portal</p>
                </div>
              </div>
              <button
                onClick={() => setIsCreateCustomerModalOpen(false)}
                className="p-1 rounded-lg text-[#666] hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={(e) => handleCreateCustomer(e, customerForm.portalAccess === 'NOW')} className="mt-4 space-y-3.5">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-[#888] uppercase tracking-wider mb-1">
                    Company Name <span className="text-[#f87171]">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Acme Corp"
                    value={customerForm.companyName}
                    onChange={(e) => setCustomerForm({ ...customerForm, companyName: e.target.value })}
                    className="w-full h-8 px-3 rounded-lg bg-[#14151b] border border-[#24252f] text-xs text-white placeholder-[#555] focus:outline-none focus:border-[#404152]"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-[#888] uppercase tracking-wider mb-1">
                    Customer Tier <span className="text-[#f87171]">*</span>
                  </label>
                  <select
                    value={customerForm.tier}
                    onChange={(e) => setCustomerForm({ ...customerForm, tier: e.target.value })}
                    className="w-full h-8 px-2 rounded-lg bg-[#14151b] border border-[#24252f] text-xs text-white focus:outline-none focus:border-[#404152]"
                  >
                    <option value="BRONZE">Bronze (Normal Ceiling)</option>
                    <option value="SILVER">Silver (Higher Ceiling)</option>
                    <option value="GOLD">Gold (Premium Tier)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-[#888] uppercase tracking-wider mb-1">
                    Contact Person Name
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Neha Sharma"
                    value={customerForm.contactName}
                    onChange={(e) => setCustomerForm({ ...customerForm, contactName: e.target.value })}
                    className="w-full h-8 px-3 rounded-lg bg-[#14151b] border border-[#24252f] text-xs text-white placeholder-[#555] focus:outline-none focus:border-[#404152]"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-[#888] uppercase tracking-wider mb-1">
                    Contact Email <span className="text-[#f87171]">*</span>
                  </label>
                  <input
                    type="email"
                    required
                    placeholder="neha@acme.com"
                    value={customerForm.contactEmail}
                    onChange={(e) => setCustomerForm({ ...customerForm, contactEmail: e.target.value })}
                    className="w-full h-8 px-3 rounded-lg bg-[#14151b] border border-[#24252f] text-xs text-white placeholder-[#555] focus:outline-none focus:border-[#404152]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-[#888] uppercase tracking-wider mb-1">
                    Currency
                  </label>
                  <select
                    value={customerForm.currency}
                    onChange={(e) => setCustomerForm({ ...customerForm, currency: e.target.value })}
                    className="w-full h-8 px-2 rounded-lg bg-[#14151b] border border-[#24252f] text-xs text-white focus:outline-none focus:border-[#404152]"
                  >
                    <option value="USD">USD ($)</option>
                    <option value="INR">INR (₹)</option>
                    <option value="EUR">EUR (€)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-[#888] uppercase tracking-wider mb-1">
                    Tax ID / GST <span className="text-[#555] font-normal">(optional)</span>
                  </label>
                  <input
                    type="text"
                    placeholder="GSTIN29ABCDE1234F"
                    value={customerForm.taxId}
                    onChange={(e) => setCustomerForm({ ...customerForm, taxId: e.target.value })}
                    className="w-full h-8 px-3 rounded-lg bg-[#14151b] border border-[#24252f] text-xs text-white placeholder-[#555] focus:outline-none focus:border-[#404152]"
                  />
                </div>
              </div>

              <div className="pt-2">
                <label className="block text-[11px] font-semibold text-[#888] uppercase tracking-wider mb-2">
                  Portal Access
                </label>
                <div className="grid grid-cols-2 gap-2.5">
                  <label className={`p-2.5 rounded-xl border flex items-center gap-2 cursor-pointer transition-all ${
                    customerForm.portalAccess === 'NOW'
                      ? 'bg-[#141b24] border-[#2b4163] text-white'
                      : 'bg-[#121319] border-[#20212b] text-[#71717a]'
                  }`}>
                    <input
                      type="radio"
                      name="portalAccess"
                      value="NOW"
                      checked={customerForm.portalAccess === 'NOW'}
                      onChange={() => setCustomerForm({ ...customerForm, portalAccess: 'NOW' })}
                      className="hidden"
                    />
                    <Send className="w-3.5 h-3.5 text-[#38bdf8]" />
                    <div>
                      <div className="text-xs font-semibold">Invite Now</div>
                      <div className="text-[10px] text-[#71717a]">Send portal activation email</div>
                    </div>
                  </label>

                  <label className={`p-2.5 rounded-xl border flex items-center gap-2 cursor-pointer transition-all ${
                    customerForm.portalAccess === 'LATER'
                      ? 'bg-[#141b24] border-[#2b4163] text-white'
                      : 'bg-[#121319] border-[#20212b] text-[#71717a]'
                  }`}>
                    <input
                      type="radio"
                      name="portalAccess"
                      value="LATER"
                      checked={customerForm.portalAccess === 'LATER'}
                      onChange={() => setCustomerForm({ ...customerForm, portalAccess: 'LATER' })}
                      className="hidden"
                    />
                    <Clock className="w-3.5 h-3.5 text-[#a1a1aa]" />
                    <div>
                      <div className="text-xs font-semibold">Invite Later</div>
                      <div className="text-[10px] text-[#71717a]">Create record without invite</div>
                    </div>
                  </label>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-[#1a1b24] mt-5">
                <button
                  type="button"
                  onClick={() => setIsCreateCustomerModalOpen(false)}
                  className="h-8 px-3.5 rounded-lg border border-[#24252f] text-xs font-medium text-[#888] hover:text-white transition-colors"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={submitting}
                  className="h-8 px-4 rounded-lg bg-[#ededed] hover:bg-white text-xs font-semibold text-[#09090b] transition-all flex items-center gap-1.5"
                >
                  <Building2 className="w-3.5 h-3.5" />
                  <span>
                    {submitting 
                      ? 'Creating...' 
                      : customerForm.portalAccess === 'NOW'
                      ? 'Create Customer & Send Portal Invite'
                      : 'Create Customer'}
                  </span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ═══════════════ CONFIRMATION DIALOGS ═══════════════ */}
      {confirmDialog && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-[#0e0f14] border border-[#22232d] rounded-2xl p-5 shadow-[0_20px_50px_rgba(0,0,0,0.9)] animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center gap-2.5 text-[#fb7185] mb-3">
              <ShieldAlert className="w-5 h-5" />
              <h4 className="text-sm font-semibold text-white">
                {confirmDialog.type === 'deactivate' ? 'Deactivate User Account' : 'Confirm Role Elevation/Change'}
              </h4>
            </div>

            <p className="text-xs text-[#a1a1aa] leading-relaxed mb-4">
              {confirmDialog.type === 'deactivate' ? (
                <>
                  Are you sure you want to deactivate <strong className="text-white">{confirmDialog.user?.name}</strong> ({confirmDialog.user?.email})?
                  This will immediately revoke their workspace access. Note that the last active Administrator cannot be deactivated.
                </>
              ) : (
                <>
                  Change role for <strong className="text-white">{confirmDialog.user?.name}</strong> from <code className="text-[#fb7185]">{confirmDialog.user?.role}</code> to <code className="text-[#4ade80]">{confirmDialog.newRole}</code>?
                </>
              )}
            </p>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#1a1b24]">
              <button
                onClick={() => setConfirmDialog(null)}
                className="h-8 px-3 rounded-lg border border-[#24252f] text-xs font-medium text-[#888] hover:text-white transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={confirmDialog.type === 'deactivate' ? executeDeactivate : executeRoleChange}
                disabled={submitting}
                className={`h-8 px-3.5 rounded-lg text-xs font-semibold text-white transition-all ${
                  confirmDialog.type === 'deactivate'
                    ? 'bg-[#e11d48] hover:bg-[#be123c]'
                    : 'bg-[#2563eb] hover:bg-[#1d4ed8]'
                }`}
              >
                {submitting ? 'Processing...' : 'Confirm Action'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
