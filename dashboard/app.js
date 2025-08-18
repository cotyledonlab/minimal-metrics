class MinimalMetrics {
  constructor() {
    this.currentPeriod = '7d';
    this.updateInterval = null;
    this.currentExportType = null;
    
    this.init();
  }
  
  init() {
    this.setupEventListeners();
    this.setupTheme();
    this.loadData();
    this.startRealTimeUpdates();
  }
  
  setupEventListeners() {
    const periodSelect = document.getElementById('periodSelect');
    const themeToggle = document.getElementById('themeToggle');
    const refreshBtn = document.getElementById('refreshBtn');
    const exportAllBtn = document.getElementById('exportAllBtn');
    const modal = document.getElementById('exportModal');
    const modalClose = modal.querySelector('.modal-close');
    
    periodSelect.addEventListener('change', (e) => {
      this.currentPeriod = e.target.value;
      this.loadData();
    });
    
    themeToggle.addEventListener('click', () => {
      this.toggleTheme();
    });
    
    refreshBtn.addEventListener('click', () => {
      this.loadData();
    });
    
    exportAllBtn.addEventListener('click', () => {
      this.currentExportType = 'overview';
      this.showExportModal();
    });
    
    document.querySelectorAll('.export-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        this.currentExportType = e.target.dataset.type;
        this.showExportModal();
      });
    });
    
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        this.hideExportModal();
      }
    });
    
    modalClose.addEventListener('click', () => {
      this.hideExportModal();
    });
    
    document.querySelectorAll('.export-option').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const format = e.target.dataset.format;
        this.exportData(this.currentExportType, format);
        this.hideExportModal();
      });
    });
  }
  
  setupTheme() {
    const savedTheme = localStorage.getItem('mm-theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const theme = savedTheme || (prefersDark ? 'dark' : 'light');
    
    document.documentElement.setAttribute('data-theme', theme);
    this.updateThemeToggle(theme);
  }
  
  toggleTheme() {
    const current = document.documentElement.getAttribute('data-theme');
    const next = current === 'dark' ? 'light' : 'dark';
    
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem('mm-theme', next);
    this.updateThemeToggle(next);
  }
  
  updateThemeToggle(theme) {
    const toggle = document.getElementById('themeToggle');
    toggle.textContent = theme === 'dark' ? '☀️' : '🌙';
  }
  
  async loadData() {
    try {
      await Promise.all([
        this.loadRealTimeData(),
        this.loadOverviewData(),
        this.loadHourlyData(),
        this.loadTopPages(),
        this.loadTopReferrers(),
        this.loadCountries()
      ]);
    } catch (error) {
      console.error('Failed to load data:', error);
      this.showError('Failed to load analytics data');
    }
  }
  
  async loadRealTimeData() {
    const response = await fetch('/api/stats/realtime');
    const data = await response.json();
    
    document.getElementById('activeVisitors').textContent = data.active_visitors || 0;
  }
  
  async loadOverviewData() {
    const response = await fetch(`/api/stats/overview?period=${this.currentPeriod}`);
    const data = await response.json();
    
    document.getElementById('pageViews').textContent = this.formatNumber(data.page_views || 0);
    document.getElementById('uniqueVisitors').textContent = this.formatNumber(data.unique_visitors || 0);
    
    const avgPages = data.unique_visitors > 0 
      ? (data.page_views / data.unique_visitors).toFixed(1)
      : '0';
    document.getElementById('avgPages').textContent = avgPages;
  }
  
  async loadHourlyData() {
    const today = new Date().toISOString().split('T')[0];
    const response = await fetch(`/api/stats/hourly?date=${today}`);
    const data = await response.json();
    
    this.renderHourlyChart(data.hours || []);
  }
  
  async loadTopPages() {
    const response = await fetch(`/api/stats/pages?period=${this.currentPeriod}&limit=10`);
    const data = await response.json();
    
    this.renderDataList('topPages', data.pages || [], (item) => ({
      label: this.formatPath(item.page_url),
      value: this.formatNumber(item.views)
    }));
  }
  
  async loadTopReferrers() {
    const response = await fetch(`/api/stats/referrers?period=${this.currentPeriod}&limit=10`);
    const data = await response.json();
    
    this.renderDataList('topReferrers', data.referrers || [], (item) => ({
      label: item.referrer || 'Direct',
      value: this.formatNumber(item.visits)
    }));
  }
  
  async loadCountries() {
    const response = await fetch(`/api/stats/countries?period=${this.currentPeriod}`);
    const data = await response.json();
    
    this.renderDataList('topCountries', data.countries || [], (item) => ({
      label: item.country || 'Unknown',
      value: this.formatNumber(item.visits)
    }));
  }
  
  renderHourlyChart(hours) {
    const chart = document.getElementById('hourlyChart');
    const maxViews = Math.max(...hours.map(h => h.page_views), 1);
    
    chart.innerHTML = hours.map(hour => {
      const height = (hour.page_views / maxViews) * 100;
      const time = `${hour.hour}:00`;
      
      return `
        <div class="chart-bar" style="height: ${height}%">
          <div class="chart-tooltip">
            ${time}<br>
            ${hour.page_views} views<br>
            ${hour.unique_visitors} visitors
          </div>
        </div>
      `;
    }).join('');
  }
  
  renderDataList(elementId, items, formatter) {
    const container = document.getElementById(elementId);
    
    if (items.length === 0) {
      container.innerHTML = '<div class="loading">No data available</div>';
      return;
    }
    
    container.innerHTML = items.map(item => {
      const formatted = formatter(item);
      return `
        <div class="data-item">
          <div class="data-label" title="${formatted.label}">${formatted.label}</div>
          <div class="data-value">${formatted.value}</div>
        </div>
      `;
    }).join('');
  }
  
  formatNumber(num) {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + 'M';
    } else if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'K';
    }
    return num.toString();
  }
  
  formatPath(path) {
    if (!path || path === '/') return 'Homepage';
    if (path.length > 40) {
      return path.substring(0, 37) + '...';
    }
    return path;
  }
  
  startRealTimeUpdates() {
    this.updateInterval = setInterval(() => {
      this.loadRealTimeData();
    }, 30000);
  }
  
  stopRealTimeUpdates() {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
    }
  }
  
  showExportModal() {
    document.getElementById('exportModal').classList.add('active');
  }
  
  hideExportModal() {
    document.getElementById('exportModal').classList.remove('active');
  }
  
  async exportData(type, format) {
    try {
      const url = `/api/export?type=${type}&format=${format}&period=${this.currentPeriod}`;
      const response = await fetch(url);
      
      if (!response.ok) throw new Error('Export failed');
      
      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      
      link.href = downloadUrl;
      link.download = `minimal-metrics-${type}-${this.currentPeriod}.${format}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      window.URL.revokeObjectURL(downloadUrl);
    } catch (error) {
      console.error('Export failed:', error);
      this.showError('Failed to export data');
    }
  }
  
  showError(message) {
    const toast = document.createElement('div');
    toast.className = 'toast error';
    toast.textContent = message;
    toast.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: var(--danger);
      color: white;
      padding: 1rem;
      border-radius: 0.5rem;
      z-index: 1001;
      animation: slideIn 0.3s ease;
    `;
    
    document.body.appendChild(toast);
    
    setTimeout(() => {
      toast.style.animation = 'slideOut 0.3s ease';
      setTimeout(() => {
        if (toast.parentNode) {
          document.body.removeChild(toast);
        }
      }, 300);
    }, 3000);
  }
}

document.addEventListener('DOMContentLoaded', () => {
  new MinimalMetrics();
});

document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    window.mm?.stopRealTimeUpdates();
  } else {
    window.mm?.startRealTimeUpdates();
  }
});

const style = document.createElement('style');
style.textContent = `
  @keyframes slideIn {
    from { transform: translateX(100%); opacity: 0; }
    to { transform: translateX(0); opacity: 1; }
  }
  
  @keyframes slideOut {
    from { transform: translateX(0); opacity: 1; }
    to { transform: translateX(100%); opacity: 0; }
  }
`;
document.head.appendChild(style);