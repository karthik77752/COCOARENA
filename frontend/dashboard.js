/**
 * COCOARENA - Multi-Trader Coconut Billing Dashboard Logic
 * Supporting 3 authentic businesses:
 * 1. VISHNUDATTA COCONUT (Picture 2)
 * 2. SRI KRISHNA COCONUTS (Picture 3)
 * 3. SRI KRISHNA TRADERS (PDF Page 1)
 */

document.addEventListener('DOMContentLoaded', () => {

  // ==========================================================
  // 1. Session & Storage Keys
  // ==========================================================
  const STORAGE_USER_KEY = 'vishnudatta_active_user';
  const STORAGE_BILLS_KEY = 'cocoarena_saved_bills';

  let currentActiveTrader = 'VISHNUDATTA COCONUT';
  let currentEditingBillId = null;
  let currentSheetScale = 1;

  // Number to Indian Words Helper
  function numberToIndianWords(num) {
    const a = [
      '', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten',
      'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'
    ];
    const b = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

    num = Math.floor(Math.abs(num));
    if (num === 0) return 'Zero';

    function convertGroup(n) {
      let str = '';
      if (n > 99) {
        str += a[Math.floor(n / 100)] + ' Hundred ';
        n %= 100;
      }
      if (n > 19) {
        str += b[Math.floor(n / 10)] + ' ' + a[n % 10];
      } else if (n > 0) {
        str += a[n];
      }
      return str.trim();
    }

    let words = '';
    const crore = Math.floor(num / 10000000);
    num %= 10000000;
    const lakh = Math.floor(num / 100000);
    num %= 100000;
    const thousand = Math.floor(num / 1000);
    num %= 1000;
    const remainder = num;

    if (crore > 0) words += convertGroup(crore) + ' Crore ';
    if (lakh > 0) words += convertGroup(lakh) + ' Lakh ';
    if (thousand > 0) words += convertGroup(thousand) + ' Thousand ';
    if (remainder > 0) words += convertGroup(remainder);

    return words.trim();
  }

  function formatIndianCurrency(num) {
    const n = Number(num) || 0;
    return n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  // Parse Indian formatted numbers
  function parseCleanNum(val) {
    if (!val) return 0;
    const cleaned = val.toString().replace(/,/g, '').replace(/[^0-9.-]/g, '');
    const n = parseFloat(cleaned);
    return isNaN(n) ? 0 : n;
  }

  // ==========================================================
  // 2. Tab Navigation: Existing Bills vs Create New Bill
  // ==========================================================
  const tabExistingBills = document.getElementById('tab-existing-bills');
  const tabCreateBill = document.getElementById('tab-create-bill');
  const paneExistingBills = document.getElementById('pane-existing-bills');
  const paneCreateBill = document.getElementById('pane-create-bill');

  function switchTab(tabKey) {
    if (tabKey === 'existing') {
      if (traderWorkspaceScreen) traderWorkspaceScreen.classList.remove('is-fullpage');
      tabExistingBills.classList.add('active');
      tabCreateBill.classList.remove('active');
      paneExistingBills.classList.add('active');
      paneCreateBill.classList.remove('active');
      renderBillsTable();
    } else {
      tabCreateBill.classList.add('active');
      tabExistingBills.classList.remove('active');
      paneCreateBill.classList.add('active');
      paneExistingBills.classList.remove('active');
      // Default to trader selection step if no active trader selected
      if (!currentEditingBillId && !currentActiveTrader) {
        showTraderSelectionStep();
      }
    }
  }

  if (tabExistingBills) tabExistingBills.addEventListener('click', () => switchTab('existing'));
  if (tabCreateBill) tabCreateBill.addEventListener('click', () => switchTab('create'));

  const btnQuickNewBill = document.getElementById('btn-quick-new-bill');
  if (btnQuickNewBill) {
    btnQuickNewBill.addEventListener('click', () => {
      showTraderSelectionStep();
      switchTab('create');
    });
  }

  const btnCreateFirstBill = document.getElementById('btn-create-first-bill');
  if (btnCreateFirstBill) {
    btnCreateFirstBill.addEventListener('click', () => {
      showTraderSelectionStep();
      switchTab('create');
    });
  }

  // Logout button
  const btnLogout = document.getElementById('btn-logout');
  if (btnLogout) {
    btnLogout.addEventListener('click', () => {
      localStorage.removeItem(STORAGE_USER_KEY);
      window.location.href = 'index.html';
    });
  }

  // ==========================================================
  // 3. Multi-Trader Selection (Step 1 -> Step 2)
  // ==========================================================
  const traderPickerScreen = document.getElementById('trader-picker-screen');
  const traderWorkspaceScreen = document.getElementById('trader-workspace-screen');
  const activeTraderPill = document.getElementById('active-trader-pill');
  const activeTraderIcon = document.getElementById('active-trader-icon');
  const activeTraderName = document.getElementById('active-trader-name');
  const btnChangeTrader = document.getElementById('btn-change-trader');

  const cardSelectVd = document.getElementById('card-select-vd');
  const btnSelectVd = document.getElementById('btn-select-vd');
  const cardSelectSkc = document.getElementById('card-select-skc');
  const btnSelectSkc = document.getElementById('btn-select-skc');
  const cardSelectSkt = document.getElementById('card-select-skt');
  const btnSelectSkt = document.getElementById('btn-select-skt');

  const sheetVishnudatta = document.getElementById('sheet-vishnudatta');
  const sheetSriKrishnaCoconuts = document.getElementById('sheet-srikrishna-coconuts');
  const sheetSriKrishnaTraders = document.getElementById('sheet-srikrishna-traders');

  function showTraderSelectionStep() {
    if (traderWorkspaceScreen) {
      traderWorkspaceScreen.classList.remove('is-fullpage');
      traderWorkspaceScreen.style.display = 'none';
    }
    if (traderPickerScreen) {
      traderPickerScreen.style.display = 'block';
    }
  }

  function selectTrader(traderKey, isEdit = false) {
    currentActiveTrader = traderKey;
    if (traderPickerScreen) traderPickerScreen.style.display = 'none';
    if (traderWorkspaceScreen) {
      traderWorkspaceScreen.style.display = 'flex';
      traderWorkspaceScreen.classList.add('is-fullpage');
      traderWorkspaceScreen.scrollTop = 0;
    }
    window.scrollTo({ top: 0, behavior: 'instant' });

    // Hide all sheets
    [sheetVishnudatta, sheetSriKrishnaCoconuts, sheetSriKrishnaTraders].forEach(s => {
      if (s) s.style.display = 'none';
    });

    if (traderKey === 'VISHNUDATTA COCONUT') {
      activeTraderIcon.textContent = '🌴';
      activeTraderName.textContent = 'VISHNUDATTA COCONUT';
      activeTraderPill.className = 'trader-active-pill pill-vd';
      if (sheetVishnudatta) sheetVishnudatta.style.display = 'block';
      if (!isEdit) initVishnudattaSheet();
    } else if (traderKey === 'SRI KRISHNA COCONUTS') {
      activeTraderIcon.textContent = '🥥';
      activeTraderName.textContent = 'SRI KRISHNA COCONUTS';
      activeTraderPill.className = 'trader-active-pill pill-sk';
      if (sheetSriKrishnaCoconuts) sheetSriKrishnaCoconuts.style.display = 'block';
      if (!isEdit) initSriKrishnaCoconutsSheet();
    } else if (traderKey === 'SRI KRISHNA TRADERS') {
      activeTraderIcon.textContent = '🌾';
      activeTraderName.textContent = 'SRI KRISHNA TRADERS';
      activeTraderPill.className = 'trader-active-pill pill-skt';
      if (sheetSriKrishnaTraders) sheetSriKrishnaTraders.style.display = 'block';
      if (!isEdit) initSriKrishnaTradersSheet();
    }

    if (!isEdit) {
      showToast(`Selected: ${traderKey}`, 'success');
    }
  }

  if (cardSelectVd) cardSelectVd.addEventListener('click', () => selectTrader('VISHNUDATTA COCONUT'));
  if (btnSelectVd) btnSelectVd.addEventListener('click', (e) => { e.stopPropagation(); selectTrader('VISHNUDATTA COCONUT'); });

  if (cardSelectSkc) cardSelectSkc.addEventListener('click', () => selectTrader('SRI KRISHNA COCONUTS'));
  if (btnSelectSkc) btnSelectSkc.addEventListener('click', (e) => { e.stopPropagation(); selectTrader('SRI KRISHNA COCONUTS'); });

  if (cardSelectSkt) cardSelectSkt.addEventListener('click', () => selectTrader('SRI KRISHNA TRADERS'));
  if (btnSelectSkt) btnSelectSkt.addEventListener('click', (e) => { e.stopPropagation(); selectTrader('SRI KRISHNA TRADERS'); });

  if (btnChangeTrader) {
    btnChangeTrader.addEventListener('click', showTraderSelectionStep);
  }

  // ==========================================================
  // 4. Live Calculation Logic for Each Sheet
  // ==========================================================

  // --- SHEET 1: VISHNUDATTA COCONUT (Picture 2) ---
  function initVishnudattaSheet() {
    const today = getTodayFormatted();
    const nextNo = getNextBillNo('VISHNUDATTA COCONUT');
    document.getElementById('vd-date').value = today;
    document.getElementById('vd-bill-no').value = nextNo;
    document.getElementById('vd-despatched-on').value = today;
    document.getElementById('vd-from').value = 'PODALADA';
    calculateVishnudatta();
  }

  function calculateVishnudatta() {
    const qty1 = parseCleanNum(document.getElementById('vd-qty-1').value);
    const rate1 = parseCleanNum(document.getElementById('vd-rate-1').value);
    let amt1 = 0;
    if (qty1 > 0 && rate1 > 0) {
      amt1 = rate1 > 50 ? Math.round((qty1 * rate1) / 100) : Math.round(qty1 * rate1);
      document.getElementById('vd-amount-rs-1').value = formatIndianCurrency(amt1).split('.')[0];
      document.getElementById('vd-amount-ps-1').value = '00';
    }

    const qty2 = parseCleanNum(document.getElementById('vd-qty-2').value);
    const rate2 = parseCleanNum(document.getElementById('vd-rate-2').value);
    let amt2 = 0;
    if (qty2 > 0 && rate2 > 0) {
      amt2 = rate2 > 50 ? Math.round((qty2 * rate2) / 100) : Math.round(qty2 * rate2);
      document.getElementById('vd-amount-rs-2').value = formatIndianCurrency(amt2).split('.')[0];
      document.getElementById('vd-amount-ps-2').value = '00';
    }

    const totalQty = qty1 + qty2;
    if (totalQty > 0) {
      document.getElementById('vd-total-qty').value = totalQty.toString();
    }

    const actualCost = amt1 + amt2;
    document.getElementById('vd-actual-cost').value = formatIndianCurrency(actualCost);

    const grading = Math.round(actualCost * 0.01);
    if (!document.getElementById('vd-grading-charges').dataset.userModified) {
      document.getElementById('vd-grading-charges').value = formatIndianCurrency(grading);
    }

    const exp = parseCleanNum(document.getElementById('vd-expenses').value);
    const comm = parseCleanNum(document.getElementById('vd-commission').value);
    const ins = parseCleanNum(document.getElementById('vd-insurance').value);
    const adv = parseCleanNum(document.getElementById('vd-lorry-advance').value);

    const gradingVal = parseCleanNum(document.getElementById('vd-grading-charges').value);
    const subtotal = actualCost + gradingVal + exp + comm + ins;
    const grand = subtotal; // Grand total follows actual bill convention

    document.getElementById('vd-grand-total').value = formatIndianCurrency(grand);
    document.getElementById('vd-words-rupees').value = numberToIndianWords(grand);
    document.getElementById('vd-words-paise').value = 'Zero';
  }

  // --- SHEET 2: SRI KRISHNA COCONUTS (Picture 3) ---
  function initSriKrishnaCoconutsSheet() {
    const today = getTodayFormatted();
    const nextNo = getNextBillNo('SRI KRISHNA COCONUTS');
    document.getElementById('skc-date').value = today;
    document.getElementById('skc-bill-no').value = nextNo;
    document.getElementById('skc-despatched-on').value = today;
    document.getElementById('skc-from').value = 'MEDICHARLAPALEM';
    calculateSriKrishnaCoconuts();
  }

  function calculateSriKrishnaCoconuts() {
    const qty1 = parseCleanNum(document.getElementById('skc-qty-1').value);
    const rate1 = parseCleanNum(document.getElementById('skc-rate-1').value);
    let amt1 = 0;
    if (qty1 > 0 && rate1 > 0) {
      amt1 = rate1 > 50 ? Math.round((qty1 * rate1) / 100) : Math.round(qty1 * rate1);
      document.getElementById('skc-amount-rs-1').value = formatIndianCurrency(amt1).split('.')[0];
      document.getElementById('skc-amount-ps-1').value = '00';
    }

    if (qty1 > 0) {
      document.getElementById('skc-total-qty').value = qty1.toString();
    }

    const actualCost = amt1;
    document.getElementById('skc-actual-cost').value = formatIndianCurrency(actualCost);

    const grading = Math.round(actualCost * 0.01);
    if (!document.getElementById('skc-grading-charges').dataset.userModified) {
      document.getElementById('skc-grading-charges').value = formatIndianCurrency(grading);
    }

    const gradingVal = parseCleanNum(document.getElementById('skc-grading-charges').value);
    const packing = parseCleanNum(document.getElementById('skc-packing-material').value);
    const overhead = parseCleanNum(document.getElementById('skc-overhead-charges').value);
    const postage = parseCleanNum(document.getElementById('skc-postage').value);
    const comm = parseCleanNum(document.getElementById('skc-commission').value);
    const ins = parseCleanNum(document.getElementById('skc-insurance').value);
    const adv = parseCleanNum(document.getElementById('skc-lorry-advance').value);

    const subtotal = actualCost + gradingVal + packing + overhead + postage + comm + ins;
    const grand = subtotal + adv; // Exact Picture 3 summation: 891716 + 57400 = 949116

    document.getElementById('skc-grand-total').value = formatIndianCurrency(grand);
    document.getElementById('skc-words-rupees').value = numberToIndianWords(grand);
    document.getElementById('skc-words-paise').value = 'Zero';
  }

  // --- SHEET 3: SRI KRISHNA TRADERS (PDF Page 1) ---
  function initSriKrishnaTradersSheet() {
    const today = getTodayFormatted();
    const nextNo = getNextBillNo('SRI KRISHNA TRADERS');
    document.getElementById('skt-date').value = today;
    document.getElementById('skt-bill-no').value = nextNo;
    document.getElementById('skt-despatched-on').value = today;
    document.getElementById('skt-from').value = 'PODALADA';
    calculateSriKrishnaTraders();
  }

  function calculateSriKrishnaTraders() {
    const qty1 = parseCleanNum(document.getElementById('skt-qty-1').value);
    const rate1 = parseCleanNum(document.getElementById('skt-rate-1').value);
    let amt1 = 0;
    if (qty1 > 0 && rate1 > 0) {
      amt1 = rate1 > 50 ? Math.round((qty1 * rate1) / 100) : Math.round(qty1 * rate1);
      document.getElementById('skt-amount-rs-1').value = formatIndianCurrency(amt1).split('.')[0];
      document.getElementById('skt-amount-ps-1').value = '00';
    }

    if (qty1 > 0) {
      document.getElementById('skt-total-qty').value = qty1.toString();
    }

    const actualCost = amt1;
    document.getElementById('skt-actual-cost').value = formatIndianCurrency(actualCost);

    const grading = Math.round(actualCost * 0.01);
    if (!document.getElementById('skt-grading-charges').dataset.userModified) {
      document.getElementById('skt-grading-charges').value = formatIndianCurrency(grading);
    }

    const gradingVal = parseCleanNum(document.getElementById('skt-grading-charges').value);
    const exp = parseCleanNum(document.getElementById('skt-expenses').value);
    const comm = parseCleanNum(document.getElementById('skt-commission').value);
    const ins = parseCleanNum(document.getElementById('skt-insurance').value);
    const adv = parseCleanNum(document.getElementById('skt-lorry-advance').value);

    const grand = actualCost + gradingVal + exp + comm + ins;

    document.getElementById('skt-grand-total').value = formatIndianCurrency(grand);
    document.getElementById('skt-words-rupees').value = numberToIndianWords(grand);
    document.getElementById('skt-words-paise').value = 'Zero';
  }

  // Attach live calculation listeners
  ['vd-qty-1', 'vd-rate-1', 'vd-qty-2', 'vd-rate-2', 'vd-expenses', 'vd-commission', 'vd-insurance', 'vd-lorry-advance'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.addEventListener('input', calculateVishnudatta);
  });
  const vdGrading = document.getElementById('vd-grading-charges');
  if (vdGrading) {
    vdGrading.addEventListener('input', (e) => {
      e.target.dataset.userModified = 'true';
      calculateVishnudatta();
    });
  }

  ['skc-qty-1', 'skc-rate-1', 'skc-packing-material', 'skc-overhead-charges', 'skc-postage', 'skc-commission', 'skc-insurance', 'skc-lorry-advance'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.addEventListener('input', calculateSriKrishnaCoconuts);
  });
  const skcGrading = document.getElementById('skc-grading-charges');
  if (skcGrading) {
    skcGrading.addEventListener('input', (e) => {
      e.target.dataset.userModified = 'true';
      calculateSriKrishnaCoconuts();
    });
  }

  ['skt-qty-1', 'skt-rate-1', 'skt-expenses', 'skt-commission', 'skt-insurance', 'skt-lorry-advance'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.addEventListener('input', calculateSriKrishnaTraders);
  });
  const sktGrading = document.getElementById('skt-grading-charges');
  if (sktGrading) {
    sktGrading.addEventListener('input', (e) => {
      e.target.dataset.userModified = 'true';
      calculateSriKrishnaTraders();
    });
  }

  // Helper date & next bill
  function getTodayFormatted() {
    const d = new Date();
    const dd = String(d.getDate()).padStart(2, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const yyyy = d.getFullYear();
    return `${dd}/${mm}/${yyyy}`;
  }

  function getNextBillNo(company) {
    const bills = getStoredBills().filter(b => b.company === company);
    if (bills.length === 0) return '101';
    const max = bills.reduce((acc, b) => {
      const n = parseInt(b.billNo, 10);
      return !isNaN(n) && n > acc ? n : acc;
    }, 0);
    return (max + 1).toString();
  }

  // ==========================================================
  // 5. Save, Refresh, Download PDF & Print
  // ==========================================================
  const btnSaveBill = document.getElementById('btn-save-bill');
  const btnRefreshBill = document.getElementById('btn-refresh-bill');
  const btnDownloadBillPdf = document.getElementById('btn-download-bill-pdf');
  const btnPrintBillSheet = document.getElementById('btn-print-bill-sheet');

  function collectActiveBillData() {
    const now = new Date().toISOString();
    let billObj = {
      id: currentEditingBillId || ('bill_' + Date.now()),
      company: currentActiveTrader,
      savedAt: now
    };

    if (currentActiveTrader === 'VISHNUDATTA COCONUT') {
      billObj.billNo = document.getElementById('vd-bill-no').value.trim() || '---';
      billObj.date = document.getElementById('vd-date').value.trim();
      billObj.formattedDate = billObj.date;
      billObj.messers = document.getElementById('vd-messers').value.trim() || 'Cash Sale';
      billObj.gstin = document.getElementById('vd-gstin').value.trim();
      billObj.lorryNo = document.getElementById('vd-lorry-no').value.trim();
      billObj.grossQty = parseCleanNum(document.getElementById('vd-total-qty').value);
      billObj.grandTotal = parseCleanNum(document.getElementById('vd-grand-total').value);
      billObj.formData = {};
      sheetVishnudatta.querySelectorAll('.pen-input').forEach(inp => {
        if (inp.id) billObj.formData[inp.id] = inp.value;
      });
    } else if (currentActiveTrader === 'SRI KRISHNA COCONUTS') {
      billObj.billNo = document.getElementById('skc-bill-no').value.trim() || '---';
      billObj.date = document.getElementById('skc-date').value.trim();
      billObj.formattedDate = billObj.date;
      billObj.messers = document.getElementById('skc-messers').value.trim() || 'Cash Sale';
      billObj.gstin = document.getElementById('skc-gstin').value.trim();
      billObj.lorryNo = document.getElementById('skc-lorry-no').value.trim();
      billObj.grossQty = parseCleanNum(document.getElementById('skc-total-qty').value);
      billObj.grandTotal = parseCleanNum(document.getElementById('skc-grand-total').value);
      billObj.formData = {};
      sheetSriKrishnaCoconuts.querySelectorAll('.pen-input').forEach(inp => {
        if (inp.id) billObj.formData[inp.id] = inp.value;
      });
    } else if (currentActiveTrader === 'SRI KRISHNA TRADERS') {
      billObj.billNo = document.getElementById('skt-bill-no').value.trim() || '---';
      billObj.date = document.getElementById('skt-date').value.trim();
      billObj.formattedDate = billObj.date;
      billObj.messers = document.getElementById('skt-messers').value.trim() || 'Cash Sale';
      billObj.gstin = document.getElementById('skt-gstin').value.trim();
      billObj.lorryNo = document.getElementById('skt-lorry-no').value.trim();
      billObj.grossQty = parseCleanNum(document.getElementById('skt-total-qty').value);
      billObj.grandTotal = parseCleanNum(document.getElementById('skt-grand-total').value);
      billObj.formData = {};
      sheetSriKrishnaTraders.querySelectorAll('.pen-input').forEach(inp => {
        if (inp.id) billObj.formData[inp.id] = inp.value;
      });
    }

    return billObj;
  }

  if (btnSaveBill) {
    btnSaveBill.addEventListener('click', () => {
      const bill = collectActiveBillData();
      const bills = getStoredBills();
      const existingIdx = bills.findIndex(b => b.id === bill.id);
      if (existingIdx >= 0) {
        bills[existingIdx] = bill;
      } else {
        bills.push(bill);
      }
      saveBills(bills);
      currentEditingBillId = null;
      showToast(`Bill #${bill.billNo} for ${bill.company} saved successfully!`, 'success');
      switchTab('existing');
    });
  }

  if (btnRefreshBill) {
    btnRefreshBill.addEventListener('click', () => {
      currentEditingBillId = null;
      if (currentActiveTrader === 'VISHNUDATTA COCONUT') initVishnudattaSheet();
      else if (currentActiveTrader === 'SRI KRISHNA COCONUTS') initSriKrishnaCoconutsSheet();
      else if (currentActiveTrader === 'SRI KRISHNA TRADERS') initSriKrishnaTradersSheet();
      showToast('Form refreshed for a brand new bill.', 'info');
    });
  }

  function getActiveSheetElement() {
    if (currentActiveTrader === 'VISHNUDATTA COCONUT') return sheetVishnudatta;
    if (currentActiveTrader === 'SRI KRISHNA COCONUTS') return sheetSriKrishnaCoconuts;
    return sheetSriKrishnaTraders;
  }

  // Pixel-perfect PDF Download via html2pdf.js
  if (btnDownloadBillPdf) {
    btnDownloadBillPdf.addEventListener('click', () => {
      const activeSheet = getActiveSheetElement();
      if (!activeSheet) return;

      const billNo = (currentActiveTrader === 'VISHNUDATTA COCONUT')
        ? (document.getElementById('vd-bill-no').value || 'bill')
        : (currentActiveTrader === 'SRI KRISHNA COCONUTS' ? (document.getElementById('skc-bill-no').value || 'bill') : (document.getElementById('skt-bill-no').value || 'bill'));

      const filename = `${currentActiveTrader.replace(/\s+/g, '_')}_Bill_${billNo}.pdf`;
      showToast('Generating official PDF...', 'info');

      const opt = {
        margin: [5, 5, 5, 5],
        filename: filename,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true, logging: false },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
      };

      if (window.html2pdf) {
        window.html2pdf().set(opt).from(activeSheet).save()
          .then(() => showToast('PDF downloaded successfully!', 'success'))
          .catch(() => window.print());
      } else {
        window.print();
      }
    });
  }

  // ==========================================================
  // 5b. Downside Action Toolbar Controls (Bottom of Editor)
  // ==========================================================
  const btnBottomChangeTrader = document.getElementById('btn-bottom-change-trader');
  const btnBottomSaveBill = document.getElementById('btn-bottom-save-bill');
  const btnBottomRefreshBill = document.getElementById('btn-bottom-refresh-bill');
  const btnBottomScrollTop = document.getElementById('btn-bottom-scroll-top');

  if (btnBottomChangeTrader) {
    btnBottomChangeTrader.addEventListener('click', showTraderSelectionStep);
  }

  if (btnBottomSaveBill && btnSaveBill) {
    btnBottomSaveBill.addEventListener('click', () => {
      btnSaveBill.click();
    });
  }

  if (btnBottomRefreshBill && btnRefreshBill) {
    btnBottomRefreshBill.addEventListener('click', () => {
      btnRefreshBill.click();
    });
  }

  if (btnBottomScrollTop) {
    btnBottomScrollTop.addEventListener('click', () => {
      if (traderWorkspaceScreen) {
        traderWorkspaceScreen.scrollTo({ top: 0, behavior: 'smooth' });
      }
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }

  // ==========================================================
  // 6. Responsive Zoom Controls (Mobile & Desktop)
  // ==========================================================
  const btnZoomOut = document.getElementById('btn-zoom-out');
  const btnZoomIn = document.getElementById('btn-zoom-in');
  const btnZoomFit = document.getElementById('btn-zoom-fit');
  const labelZoom = document.getElementById('label-zoom');

  function updateSheetZoom(scale) {
    currentSheetScale = Math.min(Math.max(scale, 0.45), 1.3);
    const activeSheet = getActiveSheetElement();
    if (activeSheet) {
      activeSheet.style.setProperty('--sheet-scale', currentSheetScale);
    }
    if (labelZoom) labelZoom.textContent = `${Math.round(currentSheetScale * 100)}%`;
  }

  if (btnZoomOut) btnZoomOut.addEventListener('click', () => updateSheetZoom(currentSheetScale - 0.1));
  if (btnZoomIn) btnZoomIn.addEventListener('click', () => updateSheetZoom(currentSheetScale + 0.1));
  if (btnZoomFit) {
    btnZoomFit.addEventListener('click', () => {
      const scrollContainer = document.getElementById('sheet-scroll-container');
      if (scrollContainer) {
        const containerWidth = scrollContainer.clientWidth - 20;
        const targetScale = Math.min(1, containerWidth / 820);
        updateSheetZoom(targetScale);
      }
    });
  }

  // Auto-fit on mobile initial load
  if (window.innerWidth <= 860) {
    const targetScale = Math.max(0.5, (window.innerWidth - 24) / 820);
    updateSheetZoom(targetScale);
  }

  // ==========================================================
  // 7. Bills Storage & Sync
  // ==========================================================
  function getStoredBills() {
    try {
      const data = localStorage.getItem(STORAGE_BILLS_KEY);
      if (!data) return [];
      const parsed = JSON.parse(data);
      return Array.isArray(parsed) ? parsed : [];
    } catch (e) {
      return [];
    }
  }

  function saveBills(bills) {
    try {
      localStorage.setItem(STORAGE_BILLS_KEY, JSON.stringify(bills));
    } catch (e) {}

    const billsEndpoint = window.COCO_CONFIG ? window.COCO_CONFIG.resolveUrl('/api/bills') : '/api/bills';
    if (billsEndpoint) {
      fetch(billsEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bills)
      }).catch(() => {});
    }
  }

  function syncFromServer() {
    const billsEndpoint = window.COCO_CONFIG ? window.COCO_CONFIG.resolveUrl('/api/bills') : '/api/bills';
    if (!billsEndpoint) return;
    fetch(billsEndpoint)
      .then(res => res.json())
      .then(serverBills => {
        if (Array.isArray(serverBills) && serverBills.length > 0) {
          saveBills(serverBills);
          renderBillsTable();
        }
      })
      .catch(() => {});
  }
  syncFromServer();

  // ==========================================================
  // 8. Company Filtering System (3 Businesses)
  // ==========================================================
  let currentCompanyFilter = 'all';

  const filterCompanyAll = document.getElementById('filter-company-all');
  const filterCompanyVd = document.getElementById('filter-company-vd');
  const filterCompanySkc = document.getElementById('filter-company-skc');
  const filterCompanySkt = document.getElementById('filter-company-skt');

  function setCompanyFilter(companyKey) {
    currentCompanyFilter = companyKey;
    [filterCompanyAll, filterCompanyVd, filterCompanySkc, filterCompanySkt].forEach(btn => {
      if (!btn) return;
      if (btn.dataset.company === companyKey) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });
    renderBillsTable(searchBillsInput ? searchBillsInput.value : '');
  }

  if (filterCompanyAll) filterCompanyAll.addEventListener('click', () => setCompanyFilter('all'));
  if (filterCompanyVd) filterCompanyVd.addEventListener('click', () => setCompanyFilter('VISHNUDATTA COCONUT'));
  if (filterCompanySkc) filterCompanySkc.addEventListener('click', () => setCompanyFilter('SRI KRISHNA COCONUTS'));
  if (filterCompanySkt) filterCompanySkt.addEventListener('click', () => setCompanyFilter('SRI KRISHNA TRADERS'));

  // ==========================================================
  // 9. Sorting & Render Existing Bills Table
  // ==========================================================
  const sortBillsSelect = document.getElementById('sort-bills-select');
  const searchBillsInput = document.getElementById('search-bills-input');
  const tbodyExistingBills = document.getElementById('tbody-existing-bills');
  const emptyBillsState = document.getElementById('empty-bills-state');
  const badgeExistingCount = document.getElementById('badge-existing-count');
  const badgeCountAll = document.getElementById('badge-count-all');
  const badgeCountVd = document.getElementById('badge-count-vd');
  const badgeCountSkc = document.getElementById('badge-count-skc');
  const badgeCountSkt = document.getElementById('badge-count-skt');

  function sortBillsList(bills, sortMode = 'newest') {
    return [...bills].sort((a, b) => {
      if (sortMode === 'newest') return new Date(b.savedAt || b.date || 0) - new Date(a.savedAt || a.date || 0);
      if (sortMode === 'oldest') return new Date(a.savedAt || a.date || 0) - new Date(b.savedAt || b.date || 0);
      if (sortMode === 'bill-desc') return (parseInt(b.billNo, 10) || 0) - (parseInt(a.billNo, 10) || 0);
      if (sortMode === 'bill-asc') return (parseInt(a.billNo, 10) || 0) - (parseInt(b.billNo, 10) || 0);
      if (sortMode === 'amount-desc') return (parseFloat(b.grandTotal) || 0) - (parseFloat(a.grandTotal) || 0);
      return 0;
    });
  }

  if (sortBillsSelect) {
    sortBillsSelect.addEventListener('change', () => {
      renderBillsTable(searchBillsInput ? searchBillsInput.value : '');
    });
  }

  function renderBillsTable(filterQuery = '') {
    const rawBills = getStoredBills();

    const countVd = rawBills.filter(b => b.company === 'VISHNUDATTA COCONUT').length;
    const countSkc = rawBills.filter(b => b.company === 'SRI KRISHNA COCONUTS').length;
    const countSkt = rawBills.filter(b => b.company === 'SRI KRISHNA TRADERS').length;

    if (badgeCountAll) badgeCountAll.textContent = rawBills.length;
    if (badgeCountVd) badgeCountVd.textContent = countVd;
    if (badgeCountSkc) badgeCountSkc.textContent = countSkc;
    if (badgeCountSkt) badgeCountSkt.textContent = countSkt;
    if (badgeExistingCount) badgeExistingCount.textContent = rawBills.length;

    let displayedBills = rawBills;
    if (currentCompanyFilter !== 'all') {
      displayedBills = displayedBills.filter(b => b.company === currentCompanyFilter);
    }

    if (filterQuery && filterQuery.trim()) {
      const q = filterQuery.toLowerCase().trim();
      displayedBills = displayedBills.filter(b => {
        return (
          (b.billNo && b.billNo.toString().toLowerCase().includes(q)) ||
          (b.messers && b.messers.toLowerCase().includes(q)) ||
          (b.company && b.company.toLowerCase().includes(q)) ||
          (b.date && b.date.toLowerCase().includes(q))
        );
      });
    }

    const sortMode = sortBillsSelect ? sortBillsSelect.value : 'newest';
    displayedBills = sortBillsList(displayedBills, sortMode);

    if (!tbodyExistingBills) return;
    tbodyExistingBills.innerHTML = '';

    if (displayedBills.length === 0) {
      if (emptyBillsState) emptyBillsState.style.display = 'block';
      const tbl = document.getElementById('table-existing-bills');
      if (tbl) tbl.style.display = 'none';
      return;
    }

    if (emptyBillsState) emptyBillsState.style.display = 'none';
    const tbl = document.getElementById('table-existing-bills');
    if (tbl) tbl.style.display = 'table';

    displayedBills.forEach(bill => {
      const tr = document.createElement('tr');
      let badgeClass = 'company-badge-vd';
      let badgeIcon = '🌴';
      if (bill.company === 'SRI KRISHNA COCONUTS') {
        badgeClass = 'company-badge-skc';
        badgeIcon = '🥥';
      } else if (bill.company === 'SRI KRISHNA TRADERS') {
        badgeClass = 'company-badge-skt';
        badgeIcon = '🌾';
      }

      tr.innerHTML = `
        <td class="td-bill-no">
          <span class="bill-no-pill">#${bill.billNo || '---'}</span>
        </td>
        <td class="td-company">
          <span class="company-badge ${badgeClass}">${badgeIcon} ${bill.company || 'VISHNUDATTA COCONUT'}</span>
        </td>
        <td class="td-date">${bill.formattedDate || bill.date || '---'}</td>
        <td class="td-messers">
          <strong>${bill.messers || 'Direct Cash Sale'}</strong>
        </td>
        <td class="td-coconuts">${Number(bill.grossQty || 0).toLocaleString('en-IN')}</td>
        <td class="td-amount">₹ ${formatIndianCurrency(bill.grandTotal || 0)}</td>
        <td class="td-actions">
          <div class="table-actions-group">
            <button type="button" class="btn-tbl-action btn-tbl-view" data-id="${bill.id}" title="View / Print">
              👁️ View
            </button>
            <button type="button" class="btn-tbl-action btn-tbl-edit" data-id="${bill.id}" title="Edit Bill">
              ✏️ Edit
            </button>
            <button type="button" class="btn-tbl-action btn-tbl-delete" data-id="${bill.id}" title="Delete Bill">
              🗑️ Delete
            </button>
          </div>
        </td>
      `;
      tbodyExistingBills.appendChild(tr);
    });

    // Attach listeners
    tbodyExistingBills.querySelectorAll('.btn-tbl-view').forEach(btn => {
      btn.addEventListener('click', () => openViewModal(btn.dataset.id));
    });

    tbodyExistingBills.querySelectorAll('.btn-tbl-edit').forEach(btn => {
      btn.addEventListener('click', () => loadBillForEditing(btn.dataset.id));
    });

    tbodyExistingBills.querySelectorAll('.btn-tbl-delete').forEach(btn => {
      btn.addEventListener('click', () => deleteBill(btn.dataset.id));
    });
  }

  if (searchBillsInput) {
    searchBillsInput.addEventListener('input', (e) => {
      renderBillsTable(e.target.value);
    });
  }

  // ==========================================================
  // 10. Load Bill for Editing
  // ==========================================================
  function loadBillForEditing(billId) {
    const bills = getStoredBills();
    const bill = bills.find(b => b.id === billId);
    if (!bill) return;

    currentEditingBillId = bill.id;
    selectTrader(bill.company || 'VISHNUDATTA COCONUT', true);

    const sheetEl = getActiveSheetElement();
    if (sheetEl && bill.formData) {
      Object.keys(bill.formData).forEach(id => {
        const inp = document.getElementById(id);
        if (inp) inp.value = bill.formData[id];
      });
    }

    switchTab('create');
    showToast(`Loaded Bill #${bill.billNo} (${bill.company}) for editing.`, 'info');
  }

  // Delete bill
  function deleteBill(billId) {
    const bills = getStoredBills();
    const bill = bills.find(b => b.id === billId);
    if (!bill) return;

    const confirmed = window.confirm(`Permanently delete Bill #${bill.billNo} for ${bill.messers || 'this buyer'} (${bill.company})?`);
    if (!confirmed) return;

    const updated = bills.filter(b => b.id !== billId);
    saveBills(updated);
    renderBillsTable();
    showToast(`Bill #${bill.billNo} has been deleted.`, 'info');
  }

  // ==========================================================
  // 11. View Modal
  // ==========================================================
  const billModalOverlay = document.getElementById('bill-modal-overlay');
  const btnModalClose = document.getElementById('btn-modal-close');
  const modalBillMeta = document.getElementById('modal-bill-meta');
  const modalSheetViewport = document.getElementById('modal-sheet-viewport');
  const btnModalPrint = document.getElementById('btn-modal-print');

  function openViewModal(billId) {
    const bills = getStoredBills();
    const bill = bills.find(b => b.id === billId);
    if (!bill || !billModalOverlay) return;

    if (modalBillMeta) modalBillMeta.textContent = `#${bill.billNo} • ${bill.company}`;

    // Clone the exact authentic sheet for that company
    let sourceSheet = sheetVishnudatta;
    if (bill.company === 'SRI KRISHNA COCONUTS') sourceSheet = sheetSriKrishnaCoconuts;
    else if (bill.company === 'SRI KRISHNA TRADERS') sourceSheet = sheetSriKrishnaTraders;

    if (sourceSheet && modalSheetViewport) {
      const clone = sourceSheet.cloneNode(true);
      clone.style.display = 'block';
      clone.style.boxShadow = 'none';
      clone.style.border = 'none';

      // Populate clone with saved formData
      if (bill.formData) {
        Object.keys(bill.formData).forEach(id => {
          const inp = clone.querySelector(`#${id}`);
          if (inp) {
            inp.value = bill.formData[id];
            inp.setAttribute('readonly', 'true');
          }
        });
      }

      modalSheetViewport.innerHTML = '';
      modalSheetViewport.appendChild(clone);
    }

    billModalOverlay.classList.add('active');
  }

  function closeViewModal() {
    if (billModalOverlay) billModalOverlay.classList.remove('active');
  }

  if (btnModalClose) btnModalClose.addEventListener('click', closeViewModal);
  if (billModalOverlay) {
    billModalOverlay.addEventListener('click', (e) => {
      if (e.target === billModalOverlay) closeViewModal();
    });
  }

  if (btnModalPrint) {
    btnModalPrint.addEventListener('click', () => {
      window.print();
    });
  }

  // Toast System
  const toastContainer = document.getElementById('toast-container');
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

  // Initial setup
  renderBillsTable();
});
