// @ts-nocheck
// Health Activity Heatmap
class HealthDashboard {
  constructor() {
    this.data = {};
    this.tooltip = null;
    this.metrics = ['sleep', 'steps', 'activity', 'mood'];
    this.init();
  }

  async init() {
    await this.loadData();
    this.createTooltip();
    this.renderAllHeatmaps();
    this.renderLineChart();
    this.renderPieChart('sleep');
    this.renderPieChart('steps');
    this.renderPieChart('activity');
    this.renderPieChart('mood');
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
        sleep: Math.floor(Math.random() * 50) + 50,  // 50-100 range
        steps: Math.floor(Math.random() * 15000) + 2000,  // 2000-17000 range
        activity: Math.floor(Math.random() * 70) + 10,  // 10-80 range
        mood: Math.floor(Math.random() * 7) + 1  // 1-7 scale
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
        if (value >= 95) return 8;  // 100-95
        if (value >= 90) return 7;  // 95-90
        if (value >= 85) return 6;  // 90-85
        if (value >= 80) return 5;  // 85-80
        if (value >= 75) return 4;  // 80-75
        if (value >= 65) return 3;  // 75-65
        if (value >= 55) return 2;  // 65-55
        if (value >= 50) return 1;  // 55-50
        return 0;

      case 'steps':
        if (value >= 15000) return 8;
        if (value >= 12500) return 7;
        if (value >= 10000) return 6;
        if (value >= 7500) return 5;
        if (value >= 5000) return 4;
        if (value >= 3500) return 3;
        if (value >= 2000) return 2;
        if (value > 0) return 1;
        return 0;

      case 'activity':
        if (value >= 70) return 8;
        if (value >= 60) return 7;
        if (value >= 50) return 6;
        if (value >= 40) return 5;
        if (value >= 30) return 4;
        if (value >= 20) return 3;
        if (value >= 10) return 2;
        if (value > 0) return 1;
        return 0;

      case 'mood':
        // Mood is 1-7 scale, return as-is
        if (value >= 1 && value <= 7) return value;
        return 0;

      default:
        return 0;
    }
  }

  getLegendRanges(metric) {
    switch(metric) {
      case 'sleep':
        return [
          'No data',
          '50-54',
          '55-64',
          '65-74',
          '75-79',
          '80-84',
          '85-89',
          '90-94',
          '95-100'
        ];

      case 'steps':
        return [
          'No data',
          '1-1,999',
          '2,000-3,499',
          '3,500-4,999',
          '5,000-7,499',
          '7,500-9,999',
          '10,000-12,499',
          '12,500-14,999',
          '15,000+'
        ];

      case 'activity':
        return [
          'No data',
          '1-9 min',
          '10-19 min',
          '20-29 min',
          '30-39 min',
          '40-49 min',
          '50-59 min',
          '60-69 min',
          '70+ min'
        ];

      case 'mood':
        return [
          'No data',
          'Very Unpleasant',
          'Unpleasant',
          'Slightly Unpleasant',
          'Neutral',
          'Slightly Pleasant',
          'Pleasant',
          'Very Pleasant'
        ];

      default:
        return ['No data', 'Low', 'Medium', 'High', 'Very High'];
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
      case 'mood':
        const moodLabels = ['', 'Very Unpleasant', 'Unpleasant', 'Slightly Unpleasant', 'Neutral', 'Slightly Pleasant', 'Pleasant', 'Very Pleasant'];
        return moodLabels[value] || value;
      default:
        return value;
    }
  }

  renderHeatmap(metric) {
    const grid = document.getElementById(`heatmap-grid-${metric}`);
    const monthsContainer = document.getElementById(`heatmap-months-${metric}`);
    const legendColors = document.getElementById(`legend-colors-${metric}`);
    const daysContainer = document.getElementById(`heatmap-days-${metric}`);
    const averageElement = document.getElementById(`average-${metric}`);

    if (!grid || !monthsContainer || !legendColors || !daysContainer) return;

    grid.innerHTML = '';
    monthsContainer.innerHTML = '';
    legendColors.innerHTML = '';
    daysContainer.innerHTML = '';

    // Calculate date range (6 months back from today)
    const endDate = new Date();
    endDate.setHours(0, 0, 0, 0);
    endDate.setDate(endDate.getDate() + 1);

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
    let monthLabels = [];
    let weekCount = 0;
    let columnIndex = 0;
    let daysInGrid = new Set();

    // Generate squares organized by weeks (Mon-Sun)
    const squares = [];
    let currentDate = new Date(paddedStartDate);

    let totalDays = 0;
    let totalValue = 0;
    let daysWithData = 0;

    while (currentDate <= paddedEndDate) {
      const dateStr = currentDate.toISOString().split('T')[0];
      const dayData = this.data[dateStr];
      const dayOfWeek = currentDate.getDay();

      // Increment week count at the start of each week (Monday = day 1)
      if (dayOfWeek === 1 && totalDays > 0) {
        weekCount++;
      }

      totalDays++;
      // Track which days of the week are present in the grid
      daysInGrid.add(dayOfWeek);

      // If date is before our data starts or after today, show as empty
      const isBeforeData = currentDate < startDate;
      const isAfterToday = currentDate > endDate;
      const value = (isBeforeData || isAfterToday || !dayData) ? null : dayData[metric];
      const intensity = this.getIntensityLevel(value, metric);

      // Track average calculation (only for dates with data within range)
      if (!isBeforeData && !isAfterToday && dayData && dayData[metric] !== null && dayData[metric] !== undefined) {
        totalValue += dayData[metric];
        daysWithData++;
      }

      const square = document.createElement('div');
      square.className = `heatmap-square ${metric}-${intensity}`;
      square.dataset.date = dateStr;
      square.dataset.value = value !== null ? value : '';
      square.dataset.metric = metric;

      // Hover events
      square.addEventListener('mouseenter', (e) => this.showTooltip(e, dateStr, value, metric));
      square.addEventListener('mouseleave', () => this.hideTooltip());
      square.addEventListener('mousemove', (e) => this.updateTooltipPosition(e));

      // Track month changes for labels - place label at the 1st day of each month
      const dateOfMonth = currentDate.getDate();
      if (dateOfMonth === 1) {
        const month = currentDate.getMonth();
        // If 1st falls on Sunday (day 0), it appears at top of column but needs next column's label
        const adjustedColumn = dayOfWeek === 0 ? weekCount + 1 : weekCount;
        monthLabels.push({ month, columnIndex: adjustedColumn });
      }

      squares.push(square);

      currentDate.setDate(currentDate.getDate() + 1);
    }

    // Add squares to grid
    squares.forEach(square => grid.appendChild(square));

    // Render day labels: Mon at row 2, Wed at row 4, Fri at row 6
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    // Monday-first order (1=Mon, 2=Tue, ..., 6=Sat, 0=Sun)
    const dayOrder = [1, 2, 3, 4, 5, 6, 0]; // Mon through Sun

    // Row indices: 0=empty, 1=Mon, 2=empty, 3=Wed, 4=empty, 5=Fri, 6=empty
    let rowIndex = 0;
    dayOrder.forEach(dayIndex => {
      if (daysInGrid.has(dayIndex)) {
        const span = document.createElement('span');
        // Show Mon at rowIndex 1, Wed at 3, Fri at 5
        if (rowIndex === 1) {
          span.textContent = dayNames[1]; // Mon
        } else if (rowIndex === 3) {
          span.textContent = dayNames[3]; // Wed
        } else if (rowIndex === 5) {
          span.textContent = dayNames[5]; // Fri
        } else {
          span.textContent = ''; // Empty label for other rows
        }
        daysContainer.appendChild(span);
        rowIndex++;
      }
    });

    // Render month labels
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

    // Create month label spans based on week positions
    for (let i = 0; i < monthLabels.length; i++) {
      const label = monthLabels[i];
      const span = document.createElement('span');
      span.textContent = monthNames[label.month];
      span.style.gridColumn = `${label.columnIndex + 1}`;
      monthsContainer.appendChild(span);
    }

    // Update legend colors with tooltips
    const legendRanges = this.getLegendRanges(metric);
    const maxLevel = metric === 'mood' ? 7 : 8;  // All metrics now have 8 levels (7 data + 1 no-data)

    for (let i = 0; i <= maxLevel; i++) {
      const square = document.createElement('div');
      square.className = `legend-square ${metric}-${i}`;
      square.title = legendRanges[i];

      // Add hover/click tooltip functionality
      square.addEventListener('mouseenter', (e) => {
        if (this.tooltip) {
          this.tooltip.innerHTML = `<strong>${legendRanges[i]}</strong>`;
          this.tooltip.classList.add('show');
          this.updateTooltipPosition(e);
        }
      });
      square.addEventListener('mouseleave', () => this.hideTooltip());
      square.addEventListener('mousemove', (e) => this.updateTooltipPosition(e));

      legendColors.appendChild(square);
    }

    // Calculate and display average
    if (averageElement && daysWithData > 0) {
      const average = totalValue / daysWithData;
      let formattedAverage;

      switch(metric) {
        case 'sleep':
          formattedAverage = `Avg: ${Math.round(average)}`;
          break;
        case 'steps':
          formattedAverage = `Avg: ${Math.round(average).toLocaleString()}`;
          break;
        case 'activity':
          formattedAverage = `Avg: ${Math.round(average)} min`;
          break;
        case 'mood':
          const moodLabels = ['', 'Very Unpleasant', 'Unpleasant', 'Slightly Unpleasant', 'Neutral', 'Slightly Pleasant', 'Pleasant', 'Very Pleasant'];
          const roundedAvg = Math.round(average);
          formattedAverage = `Avg: ${moodLabels[roundedAvg] || roundedAvg}`;
          break;
        default:
          formattedAverage = `Avg: ${Math.round(average)}`;
      }

      averageElement.textContent = formattedAverage;
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

  renderLineChart() {
    const canvas = document.getElementById('line-chart');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');

    // Get last 30 days of data
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 30);

    const labels = [];
    const sleepData = [];
    const stepsData = [];
    const activityData = [];
    const moodData = [];

    let currentDate = new Date(startDate);
    while (currentDate <= endDate) {
      const dateStr = currentDate.toISOString().split('T')[0];
      const dayData = this.data[dateStr];

      labels.push(currentDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }));
      sleepData.push(dayData ? dayData.sleep : null);
      stepsData.push(dayData ? dayData.steps / 100 : null); // Scale down for visibility
      activityData.push(dayData ? dayData.activity : null);
      moodData.push(dayData ? dayData.mood * 10 : null); // Scale up for visibility

      currentDate.setDate(currentDate.getDate() + 1);
    }

    new Chart(ctx, {
      type: 'line',
      data: {
        labels: labels,
        datasets: [
          {
            label: 'Sleep Score',
            data: sleepData,
            borderColor: '#7992f5',
            backgroundColor: 'rgba(121, 146, 245, 0.1)',
            tension: 0.4
          },
          {
            label: 'Steps (÷100)',
            data: stepsData,
            borderColor: '#26a641',
            backgroundColor: 'rgba(38, 166, 65, 0.1)',
            tension: 0.4
          },
          {
            label: 'Activity (min)',
            data: activityData,
            borderColor: '#fb923c',
            backgroundColor: 'rgba(251, 146, 60, 0.1)',
            tension: 0.4
          },
          {
            label: 'Mood (×10)',
            data: moodData,
            borderColor: '#ffd600',
            backgroundColor: 'rgba(255, 214, 0, 0.1)',
            tension: 0.4
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            labels: {
              color: '#b6b6bb'
            }
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            ticks: {
              color: '#b6b6bb'
            },
            grid: {
              color: 'rgba(182, 182, 187, 0.1)'
            }
          },
          x: {
            ticks: {
              color: '#b6b6bb',
              maxRotation: 45,
              minRotation: 45
            },
            grid: {
              color: 'rgba(182, 182, 187, 0.1)'
            }
          }
        }
      }
    });
  }

  renderPieChart(metric) {
    const canvas = document.getElementById(`pie-chart-${metric}`);
    if (!canvas) return;

    const ctx = canvas.getContext('2d');

    // Calculate distribution percentages
    const maxLevel = metric === 'mood' ? 7 : 8;
    const levelCounts = Array(maxLevel + 1).fill(0);
    const totalDays = Object.keys(this.data).length;

    Object.values(this.data).forEach(day => {
      if (day[metric]) {
        const level = this.getIntensityLevel(day[metric], metric);
        levelCounts[level]++;
      }
    });

    // Get colors for this metric
    const colorMaps = {
      sleep: ['#28272d', '#303470', '#323c7d', '#3d4f9e', '#4e65cd', '#5f7ae6', '#7992f5', '#a6b5f9', '#d2dcff'],
      steps: ['#28272d', '#0a3318', '#0e4429', '#00581e', '#006d32', '#128a3f', '#26a641', '#39d353', '#57ff78'],
      activity: ['#28272d', '#5a1e0a', '#7c2d12', '#9a3412', '#c2410c', '#ea580c', '#fb923c', '#fdba74', '#fed7aa'],
      mood: ['#28272d', '#2d187c', '#013ebe', '#0060bb', '#3c9da8', '#2d9800', '#ffd600', '#fe7530']
    };

    // Convert counts to percentages and create labels
    const labels = [];
    const data = [];
    const colors = colorMaps[metric];
    const ranges = this.getLegendRanges(metric);

    levelCounts.forEach((count, level) => {
      if (count > 0) {
        const percentage = ((count / totalDays) * 100).toFixed(1);
        labels.push(`${ranges[level]}: ${percentage}%`);
        data.push(count);
      }
    });

    // Get metric display name
    const metricNames = {
      sleep: 'Sleep Score',
      steps: 'Steps',
      activity: 'Activity',
      mood: 'State of Mind'
    };

    new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: labels,
        datasets: [{
          data: data,
          backgroundColor: colors.filter((_, i) => levelCounts[i] > 0),
          borderColor: '#2d333b',
          borderWidth: 2
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'bottom',
            labels: {
              color: '#b6b6bb',
              padding: 8,
              font: {
                size: 10
              },
              boxWidth: 12
            }
          },
          tooltip: {
            callbacks: {
              label: function(context) {
                const total = context.dataset.data.reduce((a, b) => a + b, 0);
                const percentage = ((context.parsed / total) * 100).toFixed(1);
                return `${context.label.split(':')[0]}: ${percentage}%`;
              }
            }
          }
        }
      }
    });
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
