/* Expense Tracker — frontend-only with Chart.js and localStorage */
document.addEventListener('DOMContentLoaded', () => {
(() => {
  const STORAGE_KEY = 'expenses_v1';
  const DEFAULT_CATS = ['Food','Travel','Shopping','Bills','Entertainment','Health','Other'];

  // DOM elements - will be initialized after DOM loads
  let amountEl, categoryEl, dateEl, noteEl, form, txnTable, totalAmountEl, txnCountEl;
  let categoryFilters, searchEl, sortByEl, minAmountEl, maxAmountEl, fromDateEl, toDateEl;
  let clearFiltersEl, applyFiltersEl, clearBtn, themeToggle, exportBtn, importBtn, importFile, currencySelect;

  // Initialize DOM elements
  function initializeElements() {
    amountEl = document.getElementById('amount');
    categoryEl = document.getElementById('category');
    dateEl = document.getElementById('date');
    noteEl = document.getElementById('note');
    form = document.getElementById('expenseForm');
    txnTable = document.getElementById('txnTable');
    totalAmountEl = document.getElementById('totalAmount');
    txnCountEl = document.getElementById('txnCount');
    categoryFilters = document.getElementById('categoryFilters');
    searchEl = document.getElementById('search');
    sortByEl = document.getElementById('sortBy');
    minAmountEl = document.getElementById('minAmount');
    maxAmountEl = document.getElementById('maxAmount');
    fromDateEl = document.getElementById('fromDate');
    toDateEl = document.getElementById('toDate');
    clearFiltersEl = document.getElementById('clearFilters');
    applyFiltersEl = document.getElementById('applyFilters');
    clearBtn = document.getElementById('clearBtn');
    themeToggle = document.getElementById('themeToggle');
    exportBtn = document.getElementById('exportBtn');
    importBtn = document.getElementById('importBtn');
    importFile = document.getElementById('importFile');
    currencySelect = document.getElementById('currencySelect');
    
    console.log('Theme toggle element found:', !!themeToggle);
  }

  // Charts
  let pieChart = null, lineChart = null;

  // state
  let expenses = [];
  let filter = {category: 'All', search: '', sort: 'date_desc', minAmount: '', maxAmount: '', fromDate: '', toDate: ''};
  let selectedCurrency = '$'; // Default currency

  // helpers
  const formatCurrency = v => {
    const currency = selectedCurrency || '$';
    return currency + Number(v).toFixed(2);
  };
  const uid = ()=> Date.now().toString(36) + Math.random().toString(36).slice(2,7);
  
  // Currency management
  function updateCurrency() {
    if (currencySelect) {
      selectedCurrency = currencySelect.value;
    }
    // Ensure we have a valid currency
    if (!selectedCurrency) {
      selectedCurrency = '$';
    }
    
    localStorage.setItem('selectedCurrency', selectedCurrency);
    
    // Update currency indicator in navbar
    const indicator = document.getElementById('currencyIndicator');
    if (indicator) {
      const currencyName = getCurrencyName(selectedCurrency);
      indicator.textContent = selectedCurrency ? `(${selectedCurrency} ${currencyName})` : '(No Symbol)';
    }
    
    // Force immediate update of all currency displays
    const stats = getAdvancedStats();
    
    // Update all currency displays immediately
    if (totalAmountEl) {
      totalAmountEl.textContent = formatCurrency(stats.thisMonthTotal || 0);
    }
    
    const avgAmountEl = document.getElementById('avgAmount');
    if (avgAmountEl) {
      avgAmountEl.textContent = formatCurrency(stats.avgPerTransaction || 0);
    }
    
    const maxTransactionEl = document.getElementById('maxTransaction');
    if (maxTransactionEl) {
      maxTransactionEl.textContent = formatCurrency(stats.maxTransaction || 0);
    }
    
    // Update labels
    const avgLabelEl = document.getElementById('avgLabel');
    if (avgLabelEl) {
      avgLabelEl.textContent = `Avg per ${selectedCurrency} Transaction (${stats.currentCurrencyTransactions})`;
    }
    
    const maxLabelEl = document.getElementById('maxLabel');
    if (maxLabelEl) {
      maxLabelEl.textContent = `Largest ${selectedCurrency} Transaction`;
    }
    
    // Also update all transaction amounts in the table
    renderTable();
    
    // Show notification
    setTimeout(() => {
      try {
        showNotification(`Currency changed to ${selectedCurrency} ${getCurrencyName(selectedCurrency)}`, 'success');
      } catch (error) {
        console.log('Notification error:', error);
      }
    }, 100);
  }
  
  function getCurrencyName(symbol) {
    const currencies = {
      '$': 'USD', '€': 'EUR', '£': 'GBP', '¥': 'JPY',
      '₹': 'INR', '₩': 'KRW', '₽': 'RUB', '₪': 'ILS'
    };
    return currencies[symbol] || '';
  }
  
  function loadCurrency() {
    const saved = localStorage.getItem('selectedCurrency');
    if (saved !== null) {
      selectedCurrency = saved;
      if (currencySelect) {
        currencySelect.value = selectedCurrency;
      }
      updateCurrency(); // Update indicator and initialize all displays
    } else {
      // Set default currency to $ if none saved
      selectedCurrency = '$';
      if (currencySelect) {
        currencySelect.value = '$';
      }
      updateCurrency(); // Initialize displays with default currency
    }
  }
  
  // Function to initialize currency displays
  function initializeCurrencyDisplays() {
    console.log('Initializing currency displays with:', selectedCurrency);
    
    // Initialize all currency displays with default values
    if (totalAmountEl) {
      totalAmountEl.textContent = formatCurrency(0);
      console.log('Initialized totalAmount');
    } else {
      console.error('totalAmountEl not found');
    }
    
    const avgAmountEl = document.getElementById('avgAmount');
    if (avgAmountEl) {
      avgAmountEl.textContent = formatCurrency(0);
      console.log('Initialized avgAmount');
    } else {
      console.error('avgAmountEl not found');
    }
    
    const maxTransactionEl = document.getElementById('maxTransaction');
    if (maxTransactionEl) {
      maxTransactionEl.textContent = formatCurrency(0);
      console.log('Initialized maxTransaction');
    } else {
      console.error('maxTransactionEl not found');
    }
    
    // Update currency indicator
    const indicator = document.getElementById('currencyIndicator');
    if (indicator) {
      const currencyName = getCurrencyName(selectedCurrency);
      indicator.textContent = selectedCurrency ? `(${selectedCurrency} ${currencyName})` : '($)';
      console.log('Initialized currency indicator');
    } else {
      console.error('currencyIndicator not found');
    }
  }
  
  // Export/Import functionality
  function exportData(format = 'json') {
    const data = {
      expenses,
      exportDate: new Date().toISOString(),
      version: '1.0'
    };
    
    if (format === 'csv') {
      const csv = convertToCSV(expenses);
      downloadFile(csv, 'expenses.csv', 'text/csv');
    } else {
      const json = JSON.stringify(data, null, 2);
      downloadFile(json, 'expenses.json', 'application/json');
    }
  }
  
  function convertToCSV(data) {
    const headers = ['Date', 'Amount', 'Category', 'Note', 'Currency'];
    const rows = data.map(exp => [
      exp.date,
      exp.amount,
      exp.category,
      (exp.note || '').replace(/"/g, '""'),
      exp.currency || '$'  // Include currency in export
    ]);
    
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(field => `"${field}"`).join(','))
    ].join('\n');
    
    return csvContent;
  }
  
  function downloadFile(content, filename, mimeType) {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }
  
  function importData(file) {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target.result;
        let importedExpenses = [];
        
        if (file.name.endsWith('.json')) {
          const data = JSON.parse(content);
          importedExpenses = data.expenses || data;
        } else if (file.name.endsWith('.csv')) {
          importedExpenses = parseCSV(content);
        }
        
        // Validate and merge data
        const validExpenses = importedExpenses.filter(exp => 
          exp.amount && exp.category && exp.date
        ).map(exp => ({
          ...exp,
          id: exp.id || uid(),
          amount: Number(exp.amount)
        }));
        
        if (validExpenses.length > 0) {
          expenses = [...expenses, ...validExpenses];
          save();
          render();
          showNotification(`Imported ${validExpenses.length} transactions successfully!`, 'success');
        } else {
          showNotification('No valid transactions found in file.', 'error');
        }
      } catch (error) {
        showNotification('Error importing file: ' + error.message, 'error');
      }
    };
    reader.readAsText(file);
  }
  
  function parseCSV(csv) {
    const lines = csv.trim().split('\n');
    const headers = lines[0].split(',').map(h => h.replace(/"/g, '').trim());
    
    return lines.slice(1).map(line => {
      const values = line.split(',').map(v => v.replace(/"/g, '').trim());
      return {
        date: values[0],
        amount: parseFloat(values[1]),
        category: values[2],
        note: values[3] || '',
        currency: values[4] || '$'  // Include currency from import, default to $ if missing
      };
    });
  }
  
  // Enhanced analytics
  function getAdvancedStats() {
    const now = new Date();
    const thisMonth = now.toISOString().slice(0, 7);
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString().slice(0, 7);
    
    const thisMonthExpenses = expenses.filter(e => e.date.slice(0, 7) === thisMonth);
    const lastMonthExpenses = expenses.filter(e => e.date.slice(0, 7) === lastMonth);
    
    const thisMonthTotal = thisMonthExpenses.reduce((s, e) => s + Number(e.amount), 0);
    const lastMonthTotal = lastMonthExpenses.reduce((s, e) => s + Number(e.amount), 0);
    
    // Filter transactions by currently selected currency for average and max calculations
    const currentCurrencyExpenses = expenses.filter(e => (e.currency || '$') === selectedCurrency);
    
    const avgPerTransaction = currentCurrencyExpenses.length > 0 ? 
      currentCurrencyExpenses.reduce((s, e) => s + Number(e.amount), 0) / currentCurrencyExpenses.length : 0;
    const maxTransaction = currentCurrencyExpenses.length > 0 ? 
      Math.max(...currentCurrencyExpenses.map(e => Number(e.amount))) : 0;
    
    const monthlyChange = lastMonthTotal > 0 ? ((thisMonthTotal - lastMonthTotal) / lastMonthTotal) * 100 : 0;
    
    return {
      thisMonthTotal,
      lastMonthTotal,
      monthlyChange,
      avgPerTransaction,
      maxTransaction,
      totalTransactions: expenses.length,
      currentCurrencyTransactions: currentCurrencyExpenses.length
    };
  }
  
  // Notification system
  function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `alert alert-${type === 'error' ? 'danger' : type === 'success' ? 'success' : 'info'} notification fade-in`;
    notification.style.cssText = 'position:fixed;top:20px;right:20px;z-index:9999;min-width:300px;';
    notification.innerHTML = `
      ${message}
      <button type="button" class="btn-close" onclick="this.parentElement.remove()"></button>
    `;
    document.body.appendChild(notification);
    
    setTimeout(() => {
      if (notification.parentElement) {
        notification.remove();
      }
    }, 5000);
  }

  function load(){
    try{
      const raw = localStorage.getItem(STORAGE_KEY);
      if(!raw){
        // seed with mock data
        const now = new Date();
        const sample = [
          {id:uid(), amount:8.5, category:'Food', date: offsetDate(now, -1), note:'Morning coffee at Starbucks'},
          {id:uid(), amount:24.2, category:'Travel', date: offsetDate(now, -5), note:'Uber ride to downtown'},
          {id:uid(), amount:120.00, category:'Bills', date: offsetDate(now, -20), note:'Monthly electricity bill'},
          {id:uid(), amount:56.4, category:'Shopping', date: offsetDate(now, -40), note:'Programming books from Amazon'},
          {id:uid(), amount:15.0, category:'Food', date: offsetDate(now, -2), note:'Lunch at local restaurant'},
          {id:uid(), amount:45.0, category:'Entertainment', date: offsetDate(now, -3), note:'Movie tickets for weekend'},
        ];
        expenses = sample;
        save();
      } else expenses = JSON.parse(raw);
    }catch(e){ console.error('load error', e); expenses = []; }
  }
  function offsetDate(d, days){ const x=new Date(d); x.setDate(x.getDate()+days); return x.toISOString().slice(0,10); }
  function save(){ localStorage.setItem(STORAGE_KEY, JSON.stringify(expenses)); }

  // render filters
  function renderCategoryFilters(){
    const cats = Array.from(new Set([...DEFAULT_CATS, ...expenses.map(e=>e.category)]));
    categoryFilters.innerHTML = '';
    
    // All button - always show as first button
    const allBtn = el('button','All', ['btn','btn-sm','filter-btn']);
    allBtn.addEventListener('click', ()=>{ filter.category='All'; render(); });
    categoryFilters.appendChild(allBtn);
    
    // Category buttons
    cats.forEach(c=>{
      const btn = el('button', c, ['btn','btn-sm','filter-btn']);
      btn.addEventListener('click', ()=>{ filter.category=c; render(); });
      categoryFilters.appendChild(btn);
    });
  }

  // render table
  function renderTable(){
    const list = applyFilters(expenses.slice());
    txnTable.innerHTML = '';
    
    const filteredCountEl = document.getElementById('filteredCount');
    
    if (list.length === 0) {
      txnTable.innerHTML = `
        <tr><td colspan="5" class="empty-state">
          <div class="h5">📊 No transactions found</div>
          <small>Add your first expense above or adjust your filters</small>
        </td></tr>
      `;
      if (filteredCountEl) filteredCountEl.textContent = '0 transactions';
      return;
    }
    
    // Update filtered count
    if (filteredCountEl) {
      const totalCount = expenses.length;
      const showingText = list.length === totalCount ? 
        `${totalCount} transactions` : 
        `${list.length} of ${totalCount} transactions`;
      filteredCountEl.textContent = showingText;
    }
    
    list.forEach(txn=>{
      const tr = document.createElement('tr');
      tr.classList.add('fade-in');
      const categoryIcon = getCategoryIcon(txn.category);
      
      // Create description cell with explicit styling
      const isDark = document.body.classList.contains('dark');
      const textColor = isDark ? '#ffffff' : '#222';
      
      tr.innerHTML = `
        <td><span class="badge date-badge">${formatDate(txn.date)}</span></td>
        <td class="desc-cell" style="background: ${isDark ? 'rgba(255,255,255,0.02)' : 'transparent'} !important;">
          <div class="transaction-desc" style="color: ${textColor} !important; font-weight: 600 !important; font-size: 0.95rem !important; background: ${isDark ? 'rgba(255,255,255,0.08)' : 'transparent'} !important; padding: 6px 10px !important; border-radius: 4px !important; border: ${isDark ? '1px solid rgba(255,255,255,0.2)' : 'none'} !important;">${escapeHtml(txn.note || 'No description')}</div>
        </td>
        <td><span class="badge category-badge">${categoryIcon} ${escapeHtml(txn.category)}</span></td>
        <td class="text-end" style="background: ${isDark ? 'rgba(255,255,255,0.02)' : 'transparent'} !important;">
          <span class="amount-display ${Number(txn.amount) > 100 ? 'high-amount' : 'low-amount'}" style="color: ${textColor} !important; font-weight: 700 !important; background: ${isDark ? (Number(txn.amount) > 100 ? 'rgba(248,113,113,0.2)' : 'rgba(74,222,128,0.2)') : 'transparent'} !important; padding: 4px 8px !important; border-radius: 4px !important; border: ${isDark ? (Number(txn.amount) > 100 ? '1px solid rgba(248,113,113,0.4)' : '1px solid rgba(74,222,128,0.4)') : 'none'} !important;">${formatCurrency(txn.amount)}</span>
        </td>
        <td class="text-center">
          <div class="btn-group btn-group-sm action-buttons">
            <button data-id="${txn.id}" class="btn btn-outline-primary btn-edit" title="Edit">✏️</button>
            <button data-id="${txn.id}" class="btn btn-outline-danger btn-delete" title="Delete">🗑️</button>
          </div>
        </td>
      `;
      txnTable.appendChild(tr);
    });
    
    // attach event listeners
    txnTable.querySelectorAll('.btn-delete').forEach(b=>b.addEventListener('click', (ev)=>{
      const id = ev.currentTarget.dataset.id;
      if(confirm('🗑️ Delete this transaction?')){ 
        expenses = expenses.filter(x=>x.id!==id); 
        save(); 
        render(); 
        showNotification('Transaction deleted successfully', 'success');
      }
    }));
    
    txnTable.querySelectorAll('.btn-edit').forEach(b=>b.addEventListener('click', (ev)=>{
      const id = ev.currentTarget.dataset.id;
      editTransaction(id);
    }));
  }
  
  function getCategoryIcon(category) {
    const icons = {
      'Food': '🍔', 'Travel': '✈️', 'Shopping': '🛍️', 
      'Bills': '💡', 'Entertainment': '🎬', 'Health': '🏥', 
      'Other': '📝'
    };
    return icons[category] || '📝';
  }
  
  function formatDate(dateStr) {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }
  
  // Track editing state
  let editingTransaction = null;

  function editTransaction(id) {
    const txn = expenses.find(e => e.id === id);
    if (!txn) return;
    
    // Set editing mode
    editingTransaction = { ...txn }; // Store a copy of the original transaction
    
    // Fill form with transaction data
    amountEl.value = txn.amount;
    categoryEl.value = txn.category;
    dateEl.value = txn.date;
    noteEl.value = txn.note || '';
    
    // Set currency selector to match transaction currency
    if (currencySelect && txn.currency) {
      currencySelect.value = txn.currency;
      selectedCurrency = txn.currency;
      updateCurrency();
    }
    
    // Add visual edit mode styling
    const formCard = form.closest('.card');
    if (formCard) {
      formCard.classList.add('edit-mode');
    }
    
    // Update form to show edit mode
    const submitBtn = form.querySelector('button[type="submit"]') || form.querySelector('input[type="submit"]');
    if (submitBtn) {
      submitBtn.textContent = '✏️ Update Transaction';
      submitBtn.className = 'btn btn-warning w-100';
    }
    
    // Add cancel button if it doesn't exist
    let cancelBtn = document.getElementById('cancelEdit');
    if (!cancelBtn) {
      cancelBtn = document.createElement('button');
      cancelBtn.id = 'cancelEdit';
      cancelBtn.type = 'button';
      cancelBtn.className = 'btn btn-secondary w-100 mt-2';
      cancelBtn.textContent = '❌ Cancel Edit';
      cancelBtn.addEventListener('click', cancelEdit);
      submitBtn.parentNode.appendChild(cancelBtn);
    }
    cancelBtn.style.display = 'block';
    
    // Scroll to form and focus amount field
    amountEl.focus();
    amountEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
    
    showNotification('Editing transaction. Make changes and click "Update Transaction" or "Cancel Edit".', 'info');
  }
  
  function cancelEdit() {
    editingTransaction = null;
    
    // Remove visual edit mode styling
    const formCard = form.closest('.card');
    if (formCard) {
      formCard.classList.remove('edit-mode');
    }
    
    // Reset form
    form.reset();
    
    // Reset submit button
    const submitBtn = form.querySelector('button[type="submit"]') || form.querySelector('input[type="submit"]');
    if (submitBtn) {
      submitBtn.textContent = 'Add Expense';
      submitBtn.className = 'btn btn-primary w-100';
    }
    
    // Hide cancel button
    const cancelBtn = document.getElementById('cancelEdit');
    if (cancelBtn) {
      cancelBtn.style.display = 'none';
    }
    
    showNotification('Edit cancelled.', 'info');
  }

  function escapeHtml(s){ return (s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }

  function applyFilters(list){
    // Category filter
    if(filter.category && filter.category!=='All') {
      list = list.filter(x=>x.category===filter.category);
    }
    
    // Search filter
    if(filter.search) {
      const q = filter.search.toLowerCase();
      list = list.filter(x=> 
        (x.note||'').toLowerCase().includes(q) || 
        String(x.amount).includes(q) ||
        x.category.toLowerCase().includes(q)
      );
    }
    
    // Amount range filter
    if(filter.minAmount !== '') {
      list = list.filter(x => Number(x.amount) >= Number(filter.minAmount));
    }
    if(filter.maxAmount !== '') {
      list = list.filter(x => Number(x.amount) <= Number(filter.maxAmount));
    }
    
    // Date range filter
    if(filter.fromDate) {
      list = list.filter(x => x.date >= filter.fromDate);
    }
    if(filter.toDate) {
      list = list.filter(x => x.date <= filter.toDate);
    }
    
    // Sort
    switch(filter.sort){
      case 'date_desc': list.sort((a,b)=> b.date.localeCompare(a.date)); break;
      case 'date_asc': list.sort((a,b)=> a.date.localeCompare(b.date)); break;
      case 'amount_desc': list.sort((a,b)=> b.amount - a.amount); break;
      case 'amount_asc': list.sort((a,b)=> a.amount - b.amount); break;
      case 'category': list.sort((a,b)=> a.category.localeCompare(b.category)); break;
    }
    return list;
  }

  // charts
  function renderCharts(){
    const byCat = DEFAULT_CATS.reduce((acc,c)=>{ acc[c]=0; return acc; }, {});
    expenses.forEach(e=>{ if(!byCat[e.category]) byCat[e.category]=0; byCat[e.category]+=Number(e.amount); });
    const labels = Object.keys(byCat);
    const values = labels.map(l=> byCat[l]);

    const isDark = document.body.classList.contains('dark');
    const textColor = isDark ? '#e6eef8' : '#222';
    const gridColor = isDark ? '#2d3748' : '#dee2e6';

    // Pie chart
    const pieCtx = document.getElementById('pieChart').getContext('2d');
    if(pieChart) pieChart.destroy();
    pieChart = new Chart(pieCtx, {
      type:'pie', 
      data:{ labels, datasets:[{ data: values, backgroundColor:generateColors(labels.length) }]},
      options:{ 
        plugins:{ 
          legend:{ 
            position:'bottom',
            labels: { color: textColor }
          } 
        } 
      }
    });

    // Line chart — monthly totals (last 6 months)
    const months = lastNMonths(6);
    const monthTotals = months.map(m=> expenses.reduce((s,e)=> s + ((e.date.slice(0,7)===m)? Number(e.amount) : 0), 0));
    const lineCtx = document.getElementById('lineChart').getContext('2d');
    if(lineChart) lineChart.destroy();
    const accentColor = getComputedStyle(document.documentElement).getPropertyValue('--accent') || '#0d6efd';
    lineChart = new Chart(lineCtx, { 
      type:'line', 
      data:{ 
        labels: months.map(m=> m.slice(5)), 
        datasets:[{ 
          label:'Spent', 
          data: monthTotals, 
          borderColor: accentColor.trim(), 
          tension: .3, 
          fill:true, 
          backgroundColor: isDark ? 'rgba(125,211,252,0.1)' : 'rgba(13,110,253,0.08)'
        }]
      }, 
      options:{ 
        scales:{ 
          x: { 
            ticks: { color: textColor },
            grid: { color: gridColor }
          },
          y:{ 
            beginAtZero:true,
            ticks: { color: textColor },
            grid: { color: gridColor }
          } 
        }, 
        plugins:{ legend:{ display:false } } 
      } 
    });
  }

  function lastNMonths(n){ const arr=[]; const d=new Date(); for(let i=n-1;i>=0;i--){ const m=new Date(d.getFullYear(), d.getMonth()-i, 1); const mkey = m.toISOString().slice(0,7); arr.push(mkey); } return arr; }

  function generateColors(n){ const palette = ['#ff6384','#36a2eb','#ffcd56','#4bc0c0','#9966ff','#ff9f40','#7cb342','#e57373','#64b5f6']; const out=[]; for(let i=0;i<n;i++) out.push(palette[i%palette.length]); return out; }

  // summary
  function renderSummary(){
    const stats = getAdvancedStats();
    console.log('Rendering summary with currency:', selectedCurrency, 'Stats:', stats); // Debug log
    
    // Ensure we always show currency even for zero values
    totalAmountEl.textContent = formatCurrency(stats.thisMonthTotal || 0);
    txnCountEl.textContent = `${stats.totalTransactions} transactions`;
    
    // Update additional stats if elements exist
    const avgAmountEl = document.getElementById('avgAmount');
    const avgLabelEl = document.getElementById('avgLabel');
    const monthlyChangeEl = document.getElementById('monthlyChange');
    const maxTransactionEl = document.getElementById('maxTransaction');
    const maxLabelEl = document.getElementById('maxLabel');
    
    if (avgAmountEl) {
      avgAmountEl.textContent = formatCurrency(stats.avgPerTransaction || 0);
      console.log('Updated avgAmount to:', formatCurrency(stats.avgPerTransaction || 0)); // Debug log
    }
    
    // Update labels to show currency-specific information
    if (avgLabelEl) {
      const currencyName = getCurrencyName(selectedCurrency);
      avgLabelEl.textContent = `Avg per ${selectedCurrency} Transaction (${stats.currentCurrencyTransactions})`;
    }
    
    if (monthlyChangeEl) {
      const isIncrease = stats.monthlyChange >= 0;
      const changeClass = isIncrease ? 'change-increase' : 'change-decrease';
      const changeIcon = isIncrease ? '↑' : '↓';
      const changeText = stats.monthlyChange === 0 ? '0%' : `${changeIcon} ${Math.abs(stats.monthlyChange).toFixed(1)}%`;
      monthlyChangeEl.innerHTML = `<span class="stats-value ${changeClass}">${changeText}</span>`;
    }
    
    if (maxTransactionEl) {
      maxTransactionEl.textContent = formatCurrency(stats.maxTransaction || 0);
      console.log('Updated maxTransaction to:', formatCurrency(stats.maxTransaction || 0)); // Debug log
    }
    
    if (maxLabelEl) {
      const currencyName = getCurrencyName(selectedCurrency);
      maxLabelEl.textContent = `Largest ${selectedCurrency} Transaction`;
    }
  }

  // events
  function bindEvents(){
    form.addEventListener('submit', (ev)=>{
      ev.preventDefault();
      const amt = parseFloat(amountEl.value);
      if(isNaN(amt) || amt<=0) return alert('Enter valid amount');
      
      if (editingTransaction) {
        // Update existing transaction
        const txIndex = expenses.findIndex(e => e.id === editingTransaction.id);
        if (txIndex !== -1) {
          expenses[txIndex] = {
            id: editingTransaction.id, // Keep original ID
            amount: amt,
            category: categoryEl.value,
            date: dateEl.value || new Date().toISOString().slice(0,10),
            note: noteEl.value,
            currency: selectedCurrency || '$'
          };
          showNotification('Transaction updated successfully!', 'success');
        }
        
        // Reset edit mode
        editingTransaction = null;
        const formCard = form.closest('.card');
        if (formCard) {
          formCard.classList.remove('edit-mode');
        }
        const submitBtn = form.querySelector('button[type="submit"]') || form.querySelector('input[type="submit"]');
        if (submitBtn) {
          submitBtn.textContent = 'Add Expense';
          submitBtn.className = 'btn btn-primary w-100';
        }
        const cancelBtn = document.getElementById('cancelEdit');
        if (cancelBtn) {
          cancelBtn.style.display = 'none';
        }
      } else {
        // Add new transaction
        const tx = { 
          id: uid(), 
          amount: amt, 
          category: categoryEl.value, 
          date: dateEl.value || new Date().toISOString().slice(0,10), 
          note: noteEl.value,
          currency: selectedCurrency || '$'
        };
        expenses.unshift(tx);
        showNotification('Transaction added successfully!', 'success');
      }
      
      save();
      form.reset();
      render();
    });

    searchEl.addEventListener('input', debounce((e)=>{ filter.search = e.target.value.trim(); render(); }, 250));
    sortByEl.addEventListener('change', ()=>{ filter.sort = sortByEl.value; render(); });
    
    // Advanced filter event listeners
    if (minAmountEl) minAmountEl.addEventListener('input', debounce(updateFilters, 300));
    if (maxAmountEl) maxAmountEl.addEventListener('input', debounce(updateFilters, 300));
    if (fromDateEl) fromDateEl.addEventListener('change', updateFilters);
    if (toDateEl) toDateEl.addEventListener('change', updateFilters);
    
    if (clearFiltersEl) {
      clearFiltersEl.addEventListener('click', () => {
        // Reset all filters
        filter = {category: 'All', search: '', sort: 'date_desc', minAmount: '', maxAmount: '', fromDate: '', toDate: ''};
        searchEl.value = '';
        if (minAmountEl) minAmountEl.value = '';
        if (maxAmountEl) maxAmountEl.value = '';
        if (fromDateEl) fromDateEl.value = '';
        if (toDateEl) toDateEl.value = '';
        sortByEl.value = 'date_desc';
        render();
        showNotification('All filters cleared', 'info');
      });
    }
    
    if (applyFiltersEl) {
      applyFiltersEl.addEventListener('click', () => {
        updateFilters();
        showNotification('Filters applied successfully', 'success');
      });
    }
    clearBtn.addEventListener('click', ()=>{ if(confirm('Clear all transactions?')){ expenses=[]; save(); render(); } });

    if (themeToggle) {
      themeToggle.addEventListener('click', ()=>{
        console.log('Theme toggle clicked'); // Debug log
        document.body.classList.toggle('dark');
        const isDark = document.body.classList.contains('dark');
        console.log('Dark mode is now:', isDark); // Debug log
        
        // store preference
        localStorage.setItem('theme_pref', isDark ? 'dark' : 'light');
        
        // Force immediate style update
        if (isDark) {
          document.body.style.background = '#1a1d29';
          document.body.style.color = '#e2e8f0';
          // Update theme toggle button text for feedback
          themeToggle.innerHTML = '☀️';
          themeToggle.title = 'Switch to light mode';
        } else {
          document.body.style.background = '#ffffff';
          document.body.style.color = '#222';
          // Update theme toggle button text for feedback
          themeToggle.innerHTML = '🌗';
          themeToggle.title = 'Switch to dark mode';
        }
        
        // re-render everything with new theme colors
        render();
      });
    } else {
      console.error('Theme toggle button not found!');
    }

    // Currency selector event
    if (currencySelect) {
      console.log('Setting up currency selector event listener');
      
      // Test event
      currencySelect.addEventListener('change', function(event) {
        console.log('Currency changed to:', event.target.value);
        updateCurrency();
      });
      
      console.log('Currency selector value:', currencySelect.value);
    } else {
      console.error('Currency selector not found!');
    }
    
    // initialize theme from storage
    const pref = localStorage.getItem('theme_pref'); 
    console.log('Loaded theme preference:', pref); // Debug log
    if(pref==='dark') {
      document.body.classList.add('dark');
      document.body.style.background = '#1a1d29';
      document.body.style.color = '#e2e8f0';
      if (themeToggle) {
        themeToggle.innerHTML = '☀️';
        themeToggle.title = 'Switch to light mode';
      }
      console.log('Applied dark theme'); // Debug log
    } else {
      if (themeToggle) {
        themeToggle.innerHTML = '🌗';
        themeToggle.title = 'Switch to dark mode';
      }
    }
    
    // Export/Import events
    if (exportBtn) {
      exportBtn.addEventListener('click', () => {
        const format = confirm('Export as CSV? (Cancel for JSON)') ? 'csv' : 'json';
        exportData(format);
        showNotification(`Exported ${expenses.length} transactions as ${format.toUpperCase()}`, 'success');
      });
    }
    
    if (importBtn && importFile) {
      importBtn.addEventListener('click', () => importFile.click());
      importFile.addEventListener('change', (e) => {
        if (e.target.files.length > 0) {
          importData(e.target.files[0]);
          e.target.value = ''; // Reset file input
        }
      });
    }
  }

  function debounce(fn, t){ let to; return (...a)=>{ clearTimeout(to); to = setTimeout(()=>fn(...a), t); }; }
  
  function updateFilters() {
    filter.minAmount = minAmountEl ? minAmountEl.value : '';
    filter.maxAmount = maxAmountEl ? maxAmountEl.value : '';
    filter.fromDate = fromDateEl ? fromDateEl.value : '';
    filter.toDate = toDateEl ? toDateEl.value : '';
    render();
  }

  // render master
  function render(){
    renderCategoryFilters();
    renderTable();
    renderCharts();
    renderSummary();
    // update active filter visuals
    Array.from(categoryFilters.children).forEach(btn=> {
      const isActive = btn.textContent === filter.category || (filter.category === 'All' && btn.textContent === 'All');
      btn.classList.toggle('active', isActive);
      btn.classList.toggle('btn-primary', isActive);
      btn.classList.toggle('btn-outline-secondary', !isActive);
    });
    
    // Force update description and amount visibility in dark mode
    if (document.body.classList.contains('dark')) {
      setTimeout(() => {
        // Fix descriptions
        document.querySelectorAll('.transaction-desc').forEach(desc => {
          desc.style.color = '#ffffff';
          desc.style.background = 'rgba(255, 255, 255, 0.08)';
          desc.style.border = '1px solid rgba(255, 255, 255, 0.2)';
          desc.style.padding = '6px 10px';
          desc.style.borderRadius = '4px';
          desc.style.fontWeight = '600';
        });
        
        // Fix amounts
        document.querySelectorAll('.amount-display').forEach(amount => {
          amount.style.color = '#ffffff';
          amount.style.fontWeight = '700';
          amount.style.padding = '4px 8px';
          amount.style.borderRadius = '4px';
          
          if (amount.classList.contains('high-amount')) {
            amount.style.background = 'rgba(248, 113, 113, 0.2)';
            amount.style.border = '1px solid rgba(248, 113, 113, 0.4)';
          } else {
            amount.style.background = 'rgba(74, 222, 128, 0.2)';
            amount.style.border = '1px solid rgba(74, 222, 128, 0.4)';
          }
        });
      }, 100);
    }
  }

  // utils
  function el(tag,text,cls){ const e=document.createElement(tag); e.textContent = text; if(cls) e.classList.add(...cls); return e; }

  // initialization
  initializeElements();
  load(); 
  loadCurrency(); // Load saved currency preference
  
  // Ensure we have a valid currency before first render
  if (!selectedCurrency) {
    selectedCurrency = '$';
  }
  console.log('Initial currency set to:', selectedCurrency);
  
  // Initialize currency displays
  initializeCurrencyDisplays();
  
  bindEvents(); 
  // ensure default filter is set
  if(!filter.category) filter.category = 'All';
  // set today's date as default
  if(dateEl) dateEl.value = new Date().toISOString().slice(0, 10);
  render();
})();
});