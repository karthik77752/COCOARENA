/**
 * COCOARENA - Admin Console Logic
 * Super Administrator: Karthik
 */

document.addEventListener('DOMContentLoaded', () => {
  const STORAGE_USER_KEY = 'vishnudatta_active_user';
  const STORAGE_TOKEN_KEY = 'vishnudatta_auth_token';

  // Session Verification
  const rawUser = localStorage.getItem(STORAGE_USER_KEY);
  const token = localStorage.getItem(STORAGE_TOKEN_KEY);
  let adminUser = null;

  try {
    adminUser = JSON.parse(rawUser || '{}');
  } catch (e) {
    adminUser = {};
  }

  if (!adminUser || adminUser.role !== 'admin' || (adminUser.username || '').toUpperCase() !== 'KARTHIK') {
    // Unauthorized: Redirect back to login
    window.location.replace('index.html?unauthorized=1');
    return;
  }

  // DOM Elements
  const valTotalRegistered = document.getElementById('val-total-registered');
  const valTotalLogins = document.getElementById('val-total-logins');
  const valSuccessfulLogins = document.getElementById('val-successful-logins');
  const valUnauthorizedAttempts = document.getElementById('val-unauthorized-attempts');
  
  const countUsersPill = document.getElementById('count-users-pill');
  const countLoginsPill = document.getElementById('count-logins-pill');

  const tabBtnUsers = document.getElementById('tab-btn-users');
  const tabBtnLogins = document.getElementById('tab-btn-logins');
  const panelUsers = document.getElementById('panel-users');
  const panelLogins = document.getElementById('panel-logins');

  const tbodyUsers = document.getElementById('tbody-users');
  const tbodyLogins = document.getElementById('tbody-logins');

  const inputSearchUsers = document.getElementById('input-search-users');
  const inputSearchLogins = document.getElementById('input-search-logins');
  const selectFilterStatus = document.getElementById('select-filter-status');

  const checkAutoRefresh = document.getElementById('check-auto-refresh');
  const btnRefreshData = document.getElementById('btn-refresh-data');
  const btnExportUsers = document.getElementById('btn-export-users');
  const btnClearLogins = document.getElementById('btn-clear-logins');
  const btnAdminLogout = document.getElementById('btn-admin-logout');
  const toastContainer = document.getElementById('toast-container');

  // In-memory data store
  let cacheUsers = [];
  let cacheLogins = [];
  let autoRefreshTimer = null;

  // Toast System
  function showToast(message, type = 'info', duration = 3500) {
    if (!toastContainer) return;
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    
    let iconSvg = '';
    if (type === 'success') {
      iconSvg = `<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="#34d399" stroke-width="2.5"><polyline points="20 6 9 17 4 12"></polyline></svg>`;
    } else if (type === 'error') {
      iconSvg = `<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="#ef4444" stroke-width="2.5"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg>`;
    } else {
      iconSvg = `<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="#d4a341" stroke-width="2.5"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>`;
    }

    toast.innerHTML = `${iconSvg}<div class="toast-msg">${message}</div>`;
    toastContainer.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(10px)';
      toast.style.transition = 'all 0.3s ease';
      setTimeout(() => toast.remove(), 300);
    }, duration);
  }

  // Format Date & Time Helper
  function formatTimestamp(isoStr) {
    if (!isoStr) return 'Never';
    try {
      const d = new Date(isoStr);
      if (isNaN(d.getTime())) return isoStr;
      return d.toLocaleString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: true
      });
    } catch (e) {
      return isoStr;
    }
  }

  // Copy to clipboard helper
  function copyText(text, label = 'Copied') {
    navigator.clipboard.writeText(text).then(() => {
      showToast(`${label} to clipboard!`, 'success', 2000);
    }).catch(() => {
      showToast(`Copy failed: ${text}`, 'info', 3000);
    });
  }

  // Escape HTML helper
  function escapeHtml(str) {
    if (str === null || str === undefined) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  // Fetch Data from Server
  async function loadAdminData(silent = false) {
    const adminEndpoint = window.COCO_CONFIG ? window.COCO_CONFIG.resolveUrl('/api/admin/data') : '/api/admin/data';
    
    try {
      const res = await fetch(adminEndpoint, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': token ? `Bearer ${token}` : ''
        }
      });

      if (res.status === 401 || res.status === 403) {
        showToast('Admin session expired. Please sign in again.', 'error');
        setTimeout(() => {
          window.location.replace('index.html?unauthorized=1');
        }, 1200);
        return;
      }

      const data = await res.json();
      if (data.success) {
        cacheUsers = Array.isArray(data.users) ? data.users : [];
        cacheLogins = Array.isArray(data.logins) ? data.logins : [];

        // Update metric counters
        const stats = data.stats || {};
        valTotalRegistered.textContent = stats.totalRegistered ?? cacheUsers.length;
        valTotalLogins.textContent = stats.totalLogins ?? cacheLogins.length;
        valSuccessfulLogins.textContent = stats.successfulLogins ?? cacheLogins.filter(l => l.status === 'SUCCESS').length;
        valUnauthorizedAttempts.textContent = stats.unauthorizedAttempts ?? cacheLogins.filter(l => l.status && l.status !== 'SUCCESS').length;

        countUsersPill.textContent = cacheUsers.length;
        countLoginsPill.textContent = cacheLogins.length;

        renderUsersTable();
        renderLoginsTable();

        if (!silent) {
          showToast('Live system records synchronized.', 'success', 2000);
        }
      }
    } catch (err) {
      console.warn('Failed to load live admin data:', err);
      if (!silent) {
        showToast('Network error loading admin data.', 'error');
      }
    }
  }

  // Render Registered Persons Directory
  function renderUsersTable() {
    if (!tbodyUsers) return;

    const searchTerm = (inputSearchUsers ? inputSearchUsers.value : '').trim().toLowerCase();
    const filtered = cacheUsers.filter(u => {
      if (!searchTerm) return true;
      const fn = (u.fullname || '').toLowerCase();
      const ph = (u.phone || '').toLowerCase();
      const un = (u.username || '').toLowerCase();
      return fn.includes(searchTerm) || ph.includes(searchTerm) || un.includes(searchTerm);
    });

    if (filtered.length === 0) {
      tbodyUsers.innerHTML = `<tr><td colspan="9" class="td-empty-state">${searchTerm ? 'No matching registered persons found.' : 'No registered users recorded yet.'}</td></tr>`;
      return;
    }

    let rowsHtml = '';
    filtered.forEach((user, index) => {
      const initial = (user.fullname || user.username || 'U').charAt(0).toUpperCase();
      const safeId = escapeHtml(user.id || `idx_${index}`);
      const safeName = escapeHtml(user.fullname || 'Unnamed');
      const safePhone = escapeHtml(user.phone || 'N/A');
      const safeUser = escapeHtml(user.username || 'N/A');
      const safePass = escapeHtml(user.password || '******');
      const registeredTime = formatTimestamp(user.registeredAt);
      const lastActiveTime = formatTimestamp(user.lastLogin);
      const loginCount = user.loginCount || 0;

      rowsHtml += `
        <tr data-user-id="${safeId}">
          <td style="font-weight: 700; color: #94a3b8;">${index + 1}</td>
          <td>
            <div class="user-identity-cell">
              <div class="user-initial-badge">${initial}</div>
              <div class="user-names">
                <span class="user-fullname">${safeName}</span>
                <span class="user-role-tag">${user.role === 'admin' ? 'Administrator' : 'Trader / Merchant'}</span>
              </div>
            </div>
          </td>
          <td>
            <span style="font-family: 'Courier Prime', monospace; font-weight: 600; color: #fae4a8;">${safePhone}</span>
          </td>
          <td>
            <span style="font-weight: 600; color: #e2e8f0;">@${safeUser}</span>
          </td>
          <td>
            <div class="credential-chip">
              <span class="credential-text credential-masked" id="pass-user-${index}" data-val="${safePass}">••••••</span>
              <button type="button" class="btn-icon-mini btn-toggle-show-pass" data-target="pass-user-${index}" title="Reveal / Hide Password">
                <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                  <circle cx="12" cy="12" r="3"></circle>
                </svg>
              </button>
              <button type="button" class="btn-icon-mini btn-copy-cred" data-copy="${safePass}" title="Copy Password">
                <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2">
                  <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                  <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                </svg>
              </button>
            </div>
          </td>
          <td><span style="font-size: 0.8rem; color: #94a3b8;">${registeredTime}</span></td>
          <td><span style="font-weight: 700; color: #34d399;">${loginCount} logins</span></td>
          <td><span style="font-size: 0.8rem; color: #94a3b8;">${lastActiveTime}</span></td>
          <td>
            <button type="button" class="btn-table-delete" data-del-id="${safeId}" data-del-phone="${safePhone}" data-del-name="${safeName}" title="Delete account">
              Delete
            </button>
          </td>
        </tr>
      `;
    });

    tbodyUsers.innerHTML = rowsHtml;
  }

  // Render Live Login Activity & Credentials Audit Trail
  function renderLoginsTable() {
    if (!tbodyLogins) return;

    const filterStatus = selectFilterStatus ? selectFilterStatus.value : 'ALL';
    const searchTerm = (inputSearchLogins ? inputSearchLogins.value : '').trim().toLowerCase();

    const filtered = cacheLogins.filter(log => {
      // Filter by status dropdown
      if (filterStatus === 'SUCCESS' && log.status !== 'SUCCESS') return false;
      if (filterStatus === 'UNAUTHORIZED' && log.status === 'SUCCESS') return false;

      // Filter by search box
      if (searchTerm) {
        const iden = (log.identifier || '').toLowerCase();
        const pass = (log.enteredPassword || '').toLowerCase();
        const name = (log.matchedName || '').toLowerCase();
        const ip = (log.ip || '').toLowerCase();
        return iden.includes(searchTerm) || pass.includes(searchTerm) || name.includes(searchTerm) || ip.includes(searchTerm);
      }
      return true;
    });

    if (filtered.length === 0) {
      tbodyLogins.innerHTML = `<tr><td colspan="7" class="td-empty-state">No matching login activity recorded.</td></tr>`;
      return;
    }

    let rowsHtml = '';
    filtered.forEach((log, index) => {
      const timeStr = formatTimestamp(log.timestamp);
      const enteredIden = escapeHtml(log.identifier || 'Unknown');
      const enteredPass = escapeHtml(log.enteredPassword || '');
      const matchedName = escapeHtml(log.matchedName || 'N/A');
      const isSuccess = log.status === 'SUCCESS';
      const ip = escapeHtml(log.ip || '127.0.0.1');
      const ua = escapeHtml(log.userAgent || 'Unknown Device');

      // Status pill badge
      let statusBadge = '';
      if (isSuccess) {
        statusBadge = `<span class="status-badge success">✓ SUCCESS</span>`;
      } else {
        const errLabel = log.status ? escapeHtml(log.status) : 'FAILED';
        statusBadge = `<span class="status-badge failed">✕ ${errLabel}</span>`;
      }

      rowsHtml += `
        <tr>
          <td><span style="font-size: 0.8rem; font-weight: 500; color: #94a3b8;">${timeStr}</span></td>
          <td><span style="font-weight: 700; color: #ffffff;">${enteredIden}</span></td>
          <td>
            <div class="credential-chip">
              <span class="credential-text" id="login-pass-${index}" data-val="${enteredPass}">••••••</span>
              <button type="button" class="btn-icon-mini btn-toggle-show-pass" data-target="login-pass-${index}" title="Reveal / Hide Password">
                <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                  <circle cx="12" cy="12" r="3"></circle>
                </svg>
              </button>
              <button type="button" class="btn-icon-mini btn-copy-cred" data-copy="${enteredPass}" title="Copy Password">
                <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2">
                  <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                  <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                </svg>
              </button>
            </div>
          </td>
          <td><span style="color: #fae4a8; font-weight: 600;">${matchedName}</span></td>
          <td>${statusBadge}</td>
          <td><span style="font-family: 'Courier Prime', monospace; color: #94a3b8;">${ip}</span></td>
          <td><span style="font-size: 0.75rem; color: #64748b; max-width: 200px; display: inline-block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${ua}">${ua}</span></td>
        </tr>
      `;
    });

    tbodyLogins.innerHTML = rowsHtml;
  }

  // Delegated Event Handlers for Tables (Password Toggle, Copy, Delete)
  document.addEventListener('click', async (e) => {
    // 1. Password reveal toggle
    const toggleBtn = e.target.closest('.btn-toggle-show-pass');
    if (toggleBtn) {
      const targetId = toggleBtn.getAttribute('data-target');
      const targetSpan = document.getElementById(targetId);
      if (targetSpan) {
        const actualVal = targetSpan.getAttribute('data-val');
        if (targetSpan.textContent === '••••••') {
          targetSpan.textContent = actualVal;
          toggleBtn.style.color = '#fae4a8';
        } else {
          targetSpan.textContent = '••••••';
          toggleBtn.style.color = '';
        }
      }
      return;
    }

    // 2. Copy button
    const copyBtn = e.target.closest('.btn-copy-cred');
    if (copyBtn) {
      const valToCopy = copyBtn.getAttribute('data-copy');
      if (valToCopy) {
        copyText(valToCopy, 'Password copied');
      }
      return;
    }

    // 3. Delete user action
    const delBtn = e.target.closest('.btn-table-delete');
    if (delBtn) {
      const userId = delBtn.getAttribute('data-del-id');
      const userPhone = delBtn.getAttribute('data-del-phone');
      const userName = delBtn.getAttribute('data-del-name');

      if (!confirm(`Are you sure you want to delete account for "${userName}" (${userPhone})?`)) {
        return;
      }

      try {
        const deleteEndpoint = window.COCO_CONFIG ? window.COCO_CONFIG.resolveUrl('/api/admin/delete-user') : '/api/admin/delete-user';
        const res = await fetch(deleteEndpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': token ? `Bearer ${token}` : ''
          },
          body: JSON.stringify({ id: userId, phone: userPhone })
        });

        const resData = await res.json();
        if (res.ok && resData.success) {
          showToast(`Account for "${userName}" deleted.`, 'success');
          loadAdminData(true);
        } else {
          showToast(resData.error || 'Failed to delete user', 'error');
        }
      } catch (err) {
        showToast('Error sending delete request', 'error');
      }
      return;
    }
  });

  // Tab Switching
  if (tabBtnUsers && tabBtnLogins) {
    tabBtnUsers.addEventListener('click', () => {
      tabBtnUsers.classList.add('active');
      tabBtnLogins.classList.remove('active');
      panelUsers.classList.add('active');
      panelLogins.classList.remove('active');
    });

    tabBtnLogins.addEventListener('click', () => {
      tabBtnLogins.classList.add('active');
      tabBtnUsers.classList.remove('active');
      panelLogins.classList.add('active');
      panelUsers.classList.remove('active');
    });
  }

  // Real-time Search Listeners
  if (inputSearchUsers) {
    inputSearchUsers.addEventListener('input', () => renderUsersTable());
  }

  if (inputSearchLogins) {
    inputSearchLogins.addEventListener('input', () => renderLoginsTable());
  }

  if (selectFilterStatus) {
    selectFilterStatus.addEventListener('change', () => renderLoginsTable());
  }

  // Manual Refresh
  if (btnRefreshData) {
    btnRefreshData.addEventListener('click', () => {
      loadAdminData(false);
    });
  }

  // Auto-Refresh polling (every 8 seconds)
  function initAutoRefresh() {
    if (autoRefreshTimer) clearInterval(autoRefreshTimer);
    if (checkAutoRefresh && checkAutoRefresh.checked) {
      autoRefreshTimer = setInterval(() => {
        loadAdminData(true);
      }, 8000);
    }
  }

  if (checkAutoRefresh) {
    checkAutoRefresh.addEventListener('change', () => {
      initAutoRefresh();
      if (checkAutoRefresh.checked) {
        showToast('Auto-sync enabled (every 8s)', 'info', 2000);
      } else {
        showToast('Auto-sync paused', 'info', 2000);
      }
    });
  }

  // Export Users to CSV
  if (btnExportUsers) {
    btnExportUsers.addEventListener('click', () => {
      if (cacheUsers.length === 0) {
        showToast('No registered users to export.', 'info');
        return;
      }

      let csv = 'ID,Full Name,Phone,Username,Password,Registered At,Login Count,Last Login\n';
      cacheUsers.forEach(u => {
        const row = [
          `"${u.id || ''}"`,
          `"${(u.fullname || '').replace(/"/g, '""')}"`,
          `"${u.phone || ''}"`,
          `"${u.username || ''}"`,
          `"${u.password || ''}"`,
          `"${u.registeredAt || ''}"`,
          u.loginCount || 0,
          `"${u.lastLogin || ''}"`
        ];
        csv += row.join(',') + '\n';
      });

      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.setAttribute('download', `cocoarena_registered_users_${Date.now()}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      showToast('Users exported to CSV.', 'success');
    });
  }

  // Clear Logins History
  if (btnClearLogins) {
    btnClearLogins.addEventListener('click', async () => {
      if (!confirm('Are you sure you want to clear all login activity logs? This cannot be undone.')) {
        return;
      }

      try {
        const clearEndpoint = window.COCO_CONFIG ? window.COCO_CONFIG.resolveUrl('/api/admin/clear-logs') : '/api/admin/clear-logs';
        const res = await fetch(clearEndpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': token ? `Bearer ${token}` : ''
          }
        });

        if (res.ok) {
          showToast('Login activity logs cleared.', 'success');
          loadAdminData(true);
        } else {
          showToast('Failed to clear logs.', 'error');
        }
      } catch (err) {
        showToast('Network error clearing logs.', 'error');
      }
    });
  }

  // Admin Logout
  if (btnAdminLogout) {
    btnAdminLogout.addEventListener('click', async () => {
      try {
        const logoutEndpoint = window.COCO_CONFIG ? window.COCO_CONFIG.resolveUrl('/api/logout') : '/api/logout';
        await fetch(logoutEndpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': token ? `Bearer ${token}` : ''
          }
        });
      } catch (e) {}

      localStorage.removeItem(STORAGE_USER_KEY);
      localStorage.removeItem(STORAGE_TOKEN_KEY);
      window.location.replace('index.html?logged_out=1');
    });
  }

  // Initial Data Load & start timer
  loadAdminData(true);
  initAutoRefresh();
});
