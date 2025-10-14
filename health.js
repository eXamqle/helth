// Health Activity Heatmap
class HealthDashboard {
  constructor() {
    this.currentMetric = 'sleep';
    this.data = {};
    this.tooltip = null;
    this.init();
  }

  async init() {
    await this.loadData();
    this.createTooltip();
    this.setupEventListeners();
    this.renderHeatmap();
  }

  async loadData() {
    try {
      // Try to load from sample-data.json first
      const response = await fetch('sample-data.json');
      if (response.ok) {
        this.data = await response.json();
      } else {
        // Fallback to generating mock data
        this.data = this.generateMockData();
      }
    } catch (error) {
      console.log('Using mock data');
      this.data = this.generateMockData();
    }
  }

  generateMockData() {
    const data = {};
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 364); // Last ~52 weeks

    let currentDate = new Date(startDate);

    while (currentDate <= endDate) {
      const dateStr = currentDate.toISOString().split('T')[0];

      // Generate realistic random data
      data[dateStr] = {
        sleep: Math.floor(Math.random() * 40) + 60, // 60-100
        steps: Math.floor(Math.random() * 12000) + 2000, // 2000-14000
        activity: Math.floor(Math.random() * 60) + 10 // 10-70 minutes
      };

      currentDate.setDate(currentDate.getDate() + 1);
    }

    return data;
  }

  createTooltip() {
    this.tooltip = document.createElement('div');
    this.tooltip.className = 'heatmap-tooltip';
    document.body.appendChild(this.tooltip);
  }

  setupEventListeners() {
    // Metric toggle buttons
    const buttons = document.querySelectorAll('.metric-btn');
    buttons.forEach(btn => {
      btn.addEventListener('click', () => {
        buttons.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.currentMetric = btn.dataset.metric;
        this.renderHeatmap();
      });
    });
  }

  getIntensityLevel(value, metric) {
    if (!value && value !== 0) return 0;

    switch(metric) {
      case 'sleep':
        if (value >= 90) return 4;
        if (value >= 75) return 3;
        if (value >= 60) return 2;
        if (value > 0) return 1;
        return 0;

      case 'steps':
        if (value >= 10000) return 4;
        if (value >= 7500) return 3;
        if (value >= 5000) return 2;
        if (value >= 2500) return 1;
        return 0;

      case 'activity':
        if (value >= 45) return 4;
        if (value >= 30) return 3;
        if (value >= 15) return 2;
        if (value > 0) return 1;
        return 0;

      default:
        return 0;
    }
  }

  formatValue(value, metric) {
    if (!value && value !== 0) return 'No data';

    switch(metric) {
      case 'sleep':
        return `${value} score`;
      case 'steps':
        return `${value.toLocaleString()} steps`;
      case 'activity':
        return `${value} minutes`;
      default:
        return value;
    }
  }

  renderHeatmap() {
    const grid = document.getElementById('heatmap-grid');
    const monthsContainer = document.getElementById('heatmap-months');
    const legendColors = document.getElementById('legend-colors');

    grid.innerHTML = '';
    monthsContainer.innerHTML = '';
    legendColors.innerHTML = '';

    // Calculate date range (52 weeks back from today)
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 364);

    // Adjust to start on a Monday
    const startDay = startDate.getDay();
    if (startDay !== 1) {
      const daysToMonday = startDay === 0 ? -6 : -(startDay - 1);
      startDate.setDate(startDate.getDate() + daysToMonday);
    }

    // Track months for labels
    let currentMonth = -1;
    let monthLabels = [];
    let weekCount = 0;

    // Generate squares
    let currentDate = new Date(startDate);
    const squares = [];

    while (currentDate <= endDate) {
      const dateStr = currentDate.toISOString().split('T')[0];
      const dayData = this.data[dateStr];
      const value = dayData ? dayData[this.currentMetric] : null;
      const intensity = this.getIntensityLevel(value, this.currentMetric);

      const square = document.createElement('div');
      square.className = `heatmap-square ${this.currentMetric}-${intensity}`;
      square.dataset.date = dateStr;
      square.dataset.value = value !== null ? value : '';

      // Hover events
      square.addEventListener('mouseenter', (e) => this.showTooltip(e, dateStr, value));
      square.addEventListener('mouseleave', () => this.hideTooltip());
      square.addEventListener('mousemove', (e) => this.updateTooltipPosition(e));

      // Track month changes for labels
      const month = currentDate.getMonth();
      if (month !== currentMonth) {
        currentMonth = month;
        monthLabels.push({ month, weekIndex: weekCount });
      }

      squares.push(square);

      // Increment week count on Sundays
      if (currentDate.getDay() === 0) {
        weekCount++;
      }

      currentDate.setDate(currentDate.getDate() + 1);
    }

    // Add squares to grid
    squares.forEach(square => grid.appendChild(square));

    // Render month labels
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const totalWeeks = Math.ceil(squares.length / 7);

    // Create month label spans based on week positions
    for (let i = 0; i < monthLabels.length; i++) {
      const label = monthLabels[i];
      const span = document.createElement('span');
      span.textContent = monthNames[label.month];
      span.style.gridColumn = `${label.weekIndex + 1}`;
      monthsContainer.appendChild(span);
    }

    // Update legend colors
    for (let i = 0; i <= 4; i++) {
      const square = document.createElement('div');
      square.className = `legend-square ${this.currentMetric}-${i}`;
      legendColors.appendChild(square);
    }
  }

  showTooltip(event, date, value) {
    const formattedDate = new Date(date + 'T00:00:00').toLocaleDateString('en-US', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });

    const metricName = this.currentMetric.charAt(0).toUpperCase() + this.currentMetric.slice(1);
    const formattedValue = this.formatValue(value, this.currentMetric);

    this.tooltip.innerHTML = `
      <strong>${formattedDate}</strong><br>
      ${metricName}: ${formattedValue}
    `;

    this.tooltip.classList.add('show');
    this.updateTooltipPosition(event);
  }

  updateTooltipPosition(event) {
    const x = event.clientX;
    const y = event.clientY;

    // Position tooltip above and to the right of cursor
    this.tooltip.style.left = `${x + 15}px`;
    this.tooltip.style.top = `${y - 15}px`;
  }

  hideTooltip() {
    this.tooltip.classList.remove('show');
  }
}

// Initialize dashboard when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    window.healthDashboard = new HealthDashboard();
  });
} else {
  window.healthDashboard = new HealthDashboard();
}
