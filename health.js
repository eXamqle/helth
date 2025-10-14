// @ts-nocheck
// Health Activity Heatmap
class HealthDashboard {
  constructor() {
    this.data = {};
    this.tooltip = null;
    this.metrics = ['sleep', 'steps', 'activity'];
    this.init();
  }

  async init() {
    await this.loadData();
    this.createTooltip();
    this.renderAllHeatmaps();
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
    endDate.setHours(0, 0, 0, 0);
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - 6);
    startDate.setHours(0, 0, 0, 0);

    let currentDate = new Date(startDate);

    while (currentDate <= endDate) {
      const dateStr = currentDate.toISOString().split('T')[0];

      data[dateStr] = {
        sleep: Math.floor(Math.random() * 40) + 60,
        steps: Math.floor(Math.random() * 12000) + 2000,
        activity: Math.floor(Math.random() * 60) + 10
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

  renderAllHeatmaps() {
    this.metrics.forEach(metric => {
      this.renderHeatmap(metric);
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

  renderHeatmap(metric) {
    const grid = document.getElementById(`heatmap-grid-${metric}`);
    const monthsContainer = document.getElementById(`heatmap-months-${metric}`);
    const legendColors = document.getElementById(`legend-colors-${metric}`);
    const daysContainer = document.getElementById(`heatmap-days-${metric}`);

    if (!grid || !monthsContainer || !legendColors || !daysContainer) return;

    grid.innerHTML = '';
    monthsContainer.innerHTML = '';
    legendColors.innerHTML = '';
    daysContainer.innerHTML = '';

    // Calculate date range (6 months back from today)
    const endDate = new Date();
    endDate.setHours(0, 0, 0, 0);
    endDate.setDate(endDate.getDate() + 1); // Add 1 day to include today

    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - 6);
    startDate.setHours(0, 0, 0, 0);

    // Work backwards from today: find the Monday of the week containing today
    const todayDay = endDate.getDay();
    const daysFromMonday = todayDay === 0 ? 6 : todayDay - 1;

    const thisWeekMonday = new Date(endDate);
    thisWeekMonday.setDate(thisWeekMonday.getDate() - daysFromMonday);

    // Go back 25 more weeks (26 weeks total)
    const paddedStartDate = new Date(thisWeekMonday);
    paddedStartDate.setDate(paddedStartDate.getDate() - (25 * 7));

    const paddedEndDate = new Date(endDate);

    // Track months for labels and days
    let currentMonth = -1;
    let monthLabels = [];
    let weekCount = 0;
    let daysInGrid = new Set();

    // Generate squares organized by weeks (Mon-Sun)
    const squares = [];
    let currentDate = new Date(paddedStartDate);

    let totalDays = 0;
    while (currentDate <= paddedEndDate) {
      const dateStr = currentDate.toISOString().split('T')[0];
      const dayData = this.data[dateStr];
      const dayOfWeek = currentDate.getDay();

      totalDays++;
      // Track which days of the week are present in the grid
      daysInGrid.add(dayOfWeek);

      // If date is before our data starts or after today, show as empty
      const isBeforeData = currentDate < startDate;
      const isAfterToday = currentDate > endDate;
      const value = (isBeforeData || isAfterToday || !dayData) ? null : dayData[metric];
      const intensity = this.getIntensityLevel(value, metric);

      const square = document.createElement('div');
      square.className = `heatmap-square ${metric}-${intensity}`;
      square.dataset.date = dateStr;
      square.dataset.value = value !== null ? value : '';
      square.dataset.metric = metric;

      // Hover events
      square.addEventListener('mouseenter', (e) => this.showTooltip(e, dateStr, value, metric));
      square.addEventListener('mouseleave', () => this.hideTooltip());
      square.addEventListener('mousemove', (e) => this.updateTooltipPosition(e));

      // Track month changes for labels - check if this is the first day of the week (Monday)
      const month = currentDate.getMonth();
      if (month !== currentMonth && dayOfWeek === 1) {
        currentMonth = month;
        monthLabels.push({ month, weekIndex: weekCount });
      }

      squares.push(square);

      // Increment week count after Sunday (day 0)
      if (dayOfWeek === 0) {
        weekCount++;
      }

      currentDate.setDate(currentDate.getDate() + 1);
    }

    // Add squares to grid
    squares.forEach(square => grid.appendChild(square));

    // Render day labels dynamically based on which days are in the grid
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    // Monday-first order (1=Mon, 2=Tue, ..., 6=Sat, 0=Sun)
    const dayOrder = [1, 2, 3, 4, 5, 6, 0]; // Mon through Sun

    dayOrder.forEach(dayIndex => {
      if (daysInGrid.has(dayIndex)) {
        const span = document.createElement('span');
        span.textContent = dayNames[dayIndex];
        daysContainer.appendChild(span);
      }
    });

    // Render month labels
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

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
      square.className = `legend-square ${metric}-${i}`;
      legendColors.appendChild(square);
    }
  }

  /**
   * @param {MouseEvent} event
   * @param {string} date
   * @param {number|null} value
   * @param {string} metric
   */
  showTooltip(event, date, value, metric) {
    const formattedDate = new Date(date + 'T00:00:00').toLocaleDateString('en-US', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });

    const metricName = metric.charAt(0).toUpperCase() + metric.slice(1);
    const formattedValue = this.formatValue(value, metric);

    if (this.tooltip) {
      this.tooltip.innerHTML = `
        <strong>${formattedDate}</strong><br>
        ${metricName}: ${formattedValue}
      `;

      this.tooltip.classList.add('show');
    }
    this.updateTooltipPosition(event);
  }

  /**
   * @param {MouseEvent} event
   */
  updateTooltipPosition(event) {
    if (this.tooltip) {
      const x = event.clientX;
      const y = event.clientY;

      // Position tooltip above and to the right of cursor
      this.tooltip.style.left = `${x + 15}px`;
      this.tooltip.style.top = `${y - 15}px`;
    }
  }

  hideTooltip() {
    if (this.tooltip) {
      this.tooltip.classList.remove('show');
    }
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
