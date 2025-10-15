// @ts-nocheck
// Health Activity Heatmap
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

class HealthDashboard {
  constructor() {
    this.data = {};
    this.tooltip = null;
    this.metrics = ['sleep', 'steps', 'activity', 'mood'];
    this.supabase = null;
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
    this.initWidgetStack();
  }

  async fetchAllMetrics() {
    // Fetch all metrics by paginating through results
    let allMetrics = [];
    let from = 0;
    const limit = 1000;
    let hasMore = true;

    while (hasMore) {
      const { data, error } = await this.supabase
        .from('metrics')
        .select('*')
        .range(from, from + limit - 1);

      if (error) {
        return { data: null, error };
      }

      if (data && data.length > 0) {
        allMetrics = allMetrics.concat(data);
        from += limit;
        hasMore = data.length === limit;
      } else {
        hasMore = false;
      }
    }

    return { data: allMetrics, error: null };
  }

  async loadData() {
    try {
      // Initialize Supabase client
      const SUPABASE_URL = 'https://zlugshfwlwfsugzedezg.supabase.co';
      const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpsdWdzaGZ3bHdmc3VnemVkZXpnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA1MDY1ODksImV4cCI6MjA3NjA4MjU4OX0.GYfsmO4WVo1BArlwJIAGj2oTdTQSS-VbOITTSM522OE';

      this.supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

      // Fetch data from Supabase
      // Note: Supabase has a default limit of 1000 records, so we need to paginate or fetch separately
      const [metricsResult, sleepResult, stateOfMindResult] = await Promise.all([
        this.fetchAllMetrics(),
        this.supabase.from('sleep_analysis').select('*'),
        this.supabase.from('state_of_mind').select('*')
      ]);

      if (metricsResult.error) throw metricsResult.error;
      if (sleepResult.error) throw sleepResult.error;
      if (stateOfMindResult.error) throw stateOfMindResult.error;

      // Transform Supabase data to the format expected by the dashboard
      this.data = this.transformSupabaseData(
        metricsResult.data || [],
        sleepResult.data || [],
        stateOfMindResult.data || []
      );

      console.log('Data loaded from Supabase successfully');
    } catch (error) {
      console.error('Error loading data from Supabase:', error);
      console.log('Falling back to sample-data.json');

      try {
        // Fallback to sample-data.json
        const response = await fetch('sample-data.json');
        if (response.ok) {
          const rawData = await response.json();
          if (rawData.data && rawData.data.metrics) {
            this.data = this.transformGoogleDriveData(rawData);
          } else {
            this.data = rawData;
          }
        } else {
          this.data = this.generateMockData();
        }
      } catch (fallbackError) {
        console.log('Using mock data');
        this.data = this.generateMockData();
      }
    }
  }

  transformSupabaseData(metrics, sleepAnalysis, stateOfMind) {
    const transformed = {};

    console.log('Transforming Supabase data...');
    console.log('Metrics count:', metrics.length);
    console.log('Sleep analysis count:', sleepAnalysis.length);
    console.log('State of mind count:', stateOfMind.length);

    // Sample metrics to debug
    const sampleMetrics = metrics.slice(0, 10);
    console.log('Sample metrics:', sampleMetrics.map(m => ({ date: m.date, name: m.metric_name, qty: m.quantity })));

    // Process metrics (steps, exercise)
    let stepCount = 0;
    let activityCount = 0;

    metrics.forEach(metric => {
      const date = this.parseDate(metric.date);
      if (!transformed[date]) transformed[date] = {};

      if (metric.metric_name === 'step_count') {
        transformed[date].steps = Math.round(metric.quantity);
        stepCount++;
        if (stepCount <= 5) {
          console.log(`Added steps for ${date}: ${transformed[date].steps} (from ${metric.date})`);
        }
      } else if (metric.metric_name === 'apple_exercise_time') {
        transformed[date].activity = Math.round(metric.quantity);
        activityCount++;
        if (activityCount <= 5) {
          console.log(`Added activity for ${date}: ${transformed[date].activity}`);
        }
      }
    });

    console.log(`Total steps entries added: ${stepCount}`);
    console.log(`Total activity entries added: ${activityCount}`);

    // Process sleep analysis
    sleepAnalysis.forEach(entry => {
      const date = this.parseDate(entry.date);
      if (!transformed[date]) transformed[date] = {};

      // Convert total_sleep (hours) to a score (0-100)
      // Assume 8 hours = 100, scale proportionally
      const sleepScore = Math.min(100, Math.round((entry.total_sleep / 8) * 100));
      transformed[date].sleep = sleepScore;
    });

    // Process state of mind
    stateOfMind.forEach(entry => {
      const date = this.parseDate(entry.start_time);
      if (!transformed[date]) transformed[date] = {};

      // Convert valence (-1 to 1) to mood scale (1-7)
      // -1 = 1 (Very Unpleasant), 0 = 4 (Neutral), 1 = 7 (Very Pleasant)
      const moodScore = Math.round(((entry.valence + 1) / 2) * 6) + 1;
      transformed[date].mood = Math.max(1, Math.min(7, moodScore));
    });

    // Find dates with steps data to debug
    const datesWithSteps = Object.keys(transformed).filter(date => transformed[date].steps);
    console.log('Dates with steps:', datesWithSteps.length);
    console.log('First 5 dates with steps:', datesWithSteps.slice(0, 5));
    console.log('Last 5 dates with steps:', datesWithSteps.slice(-5));

    console.log('Transformed data sample:', Object.keys(transformed).slice(0, 5).map(k => ({ date: k, data: transformed[k] })));
    console.log('Total dates with data:', Object.keys(transformed).length);

    return transformed;
  }

  transformGoogleDriveData(rawData) {
    const transformed = {};

    // Extract metrics data
    if (rawData.data && rawData.data.metrics) {
      rawData.data.metrics.forEach(metric => {
        if (metric.name === 'sleep_analysis') {
          // Process sleep data
          metric.data.forEach(entry => {
            const date = this.parseDate(entry.date);
            if (!transformed[date]) transformed[date] = {};
            // Convert totalSleep hours to a score (0-100)
            // Assume 8 hours = 100, scale proportionally
            const sleepScore = Math.min(100, Math.round((entry.totalSleep / 8) * 100));
            transformed[date].sleep = sleepScore;
          });
        } else if (metric.name === 'step_count') {
          // Process step data
          metric.data.forEach(entry => {
            const date = this.parseDate(entry.date);
            if (!transformed[date]) transformed[date] = {};
            transformed[date].steps = Math.round(entry.qty);
          });
        } else if (metric.name === 'apple_exercise_time') {
          // Process activity data
          metric.data.forEach(entry => {
            const date = this.parseDate(entry.date);
            if (!transformed[date]) transformed[date] = {};
            transformed[date].activity = entry.qty;
          });
        }
      });
    }

    // Extract state of mind data
    if (rawData.data && rawData.data.stateOfMind) {
      rawData.data.stateOfMind.forEach(entry => {
        const date = this.parseDate(entry.start);
        if (!transformed[date]) transformed[date] = {};

        // Convert valence (-1 to 1) to mood scale (1-7)
        // -1 = 1 (Very Unpleasant), 0 = 4 (Neutral), 1 = 7 (Very Pleasant)
        const moodScore = Math.round(((entry.valence + 1) / 2) * 6) + 1;
        transformed[date].mood = Math.max(1, Math.min(7, moodScore));
      });
    }

    return transformed;
  }

  parseDate(dateString) {
    // Handle various date formats from the data
    // "2025-10-01 00:00:00 +0200" or "2025-10-08T18:29:08Z" or "2025-10-14T22:00:00+00:00"
    // Extract just the date part to avoid timezone conversion issues

    if (!dateString) return null;

    const dateMatch = dateString.match(/^(\d{4}-\d{2}-\d{2})/);
    if (dateMatch) {
      return dateMatch[1];
    }

    // Fallback to original logic for other formats
    const date = new Date(dateString);
    return date.toISOString().split('T')[0];
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

    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - 6);
    startDate.setHours(0, 0, 0, 0);

    // Work backwards from today: find the Sunday of the week containing today
    const todayDay = endDate.getDay();
    const daysFromSunday = todayDay; // Sunday = 0, so no adjustment needed

    const thisWeekSunday = new Date(endDate);
    thisWeekSunday.setDate(thisWeekSunday.getDate() - daysFromSunday);

    // Go back 25 more weeks (26 weeks total)
    const paddedStartDate = new Date(thisWeekSunday);
    paddedStartDate.setDate(paddedStartDate.getDate() - (25 * 7));

    const paddedEndDate = new Date(endDate);

    // Track months for labels and days
    let monthLabels = [];
    let weekCount = 0;
    let columnIndex = 0;
    let daysInGrid = new Set();

    // Generate squares organized by weeks (Sun-Sat)
    const squares = [];
    let currentDate = new Date(paddedStartDate);

    let totalDays = 0;
    let totalValue = 0;
    let daysWithData = 0;

    while (currentDate <= paddedEndDate) {
      // Use local date string to avoid timezone issues
      const year = currentDate.getFullYear();
      const month = String(currentDate.getMonth() + 1).padStart(2, '0');
      const day = String(currentDate.getDate()).padStart(2, '0');
      const dateStr = `${year}-${month}-${day}`;
      const dayData = this.data[dateStr];
      const dayOfWeek = currentDate.getDay();

      // Increment week count at the start of each week (Sunday = day 0)
      if (dayOfWeek === 0 && totalDays > 0) {
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
        monthLabels.push({ month, columnIndex: weekCount });
      }

      squares.push(square);

      currentDate.setDate(currentDate.getDate() + 1);
    }

    // Add squares to grid
    squares.forEach(square => grid.appendChild(square));

    // Render day labels: Sun at row 0, Mon at row 1, Tue at row 2, etc.
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    // Sunday-first order (0=Sun, 1=Mon, ..., 6=Sat)
    const dayOrder = [0, 1, 2, 3, 4, 5, 6]; // Sun through Sat

    // Show labels for Mon, Wed, Fri (rows 1, 3, 5)
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

    // After rendering, check and fix overflow
    requestAnimationFrame(() => {
      const containerRect = monthsContainer.parentElement.getBoundingClientRect();
      const labels = monthsContainer.querySelectorAll('span');

      labels.forEach((label) => {
        const labelRect = label.getBoundingClientRect();

        // Check if label overflows the right edge
        if (labelRect.right > containerRect.right) {
          // Calculate overflow amount and reposition
          const overflow = labelRect.right - containerRect.right;
          const currentLeft = labelRect.left - containerRect.left;
          const newLeft = Math.max(0, currentLeft - overflow - 5); // 5px padding
          label.style.transform = `translateX(${newLeft - currentLeft}px)`;
        }

        // Check if label overflows the left edge
        if (labelRect.left < containerRect.left) {
          const overflow = containerRect.left - labelRect.left;
          const currentLeft = labelRect.left - containerRect.left;
          label.style.transform = `translateX(${overflow + 5}px)`; // 5px padding
        }
      });
    });

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

      // Get tooltip dimensions
      const tooltipRect = this.tooltip.getBoundingClientRect();
      const tooltipWidth = tooltipRect.width;
      const tooltipHeight = tooltipRect.height;

      // Get viewport dimensions
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;

      // Calculate position with offset
      let left = x + 15;
      let top = y - 15;

      // Check right boundary
      if (left + tooltipWidth > viewportWidth) {
        left = x - tooltipWidth - 15;
      }

      // Check left boundary
      if (left < 0) {
        left = 10;
      }

      // Check bottom boundary
      if (top + tooltipHeight > viewportHeight) {
        top = y - tooltipHeight - 15;
      }

      // Check top boundary
      if (top < 0) {
        top = y + 15;
      }

      this.tooltip.style.left = `${left}px`;
      this.tooltip.style.top = `${top}px`;
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
        labels.push(`${ranges[level]}: ${count} days (${percentage}%)`);
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
                const count = context.parsed;
                const percentage = ((count / total) * 100).toFixed(1);
                return `${context.label.split(':')[0]}: ${count} days (${percentage}%)`;
              }
            }
          }
        }
      }
    });
  }

  initWidgetStack() {
    const slides = document.querySelectorAll('.widget-slide');
    const indicatorsContainer = document.getElementById('widget-indicators');
    const prevBtn = document.getElementById('prev-widget');
    const nextBtn = document.getElementById('next-widget');
    const titleElement = document.getElementById('widget-title');

    if (!slides.length || !indicatorsContainer) return;

    let currentIndex = 0;
    const metricNames = {
      sleep: 'Sleep',
      steps: 'Steps',
      activity: 'Activity',
      mood: 'Mood'
    };

    // Create indicators
    slides.forEach((slide, index) => {
      const indicator = document.createElement('div');
      indicator.className = 'widget-indicator';
      if (index === 0) indicator.classList.add('active');

      const metric = slide.dataset.metric;
      indicator.title = `${metricNames[metric]} Distribution`;

      indicator.addEventListener('click', () => {
        goToSlide(index);
      });

      indicatorsContainer.appendChild(indicator);
    });

    const indicators = indicatorsContainer.querySelectorAll('.widget-indicator');

    function goToSlide(index) {
      // Remove active class from current slide and indicator
      slides[currentIndex].classList.remove('active');
      indicators[currentIndex].classList.remove('active');

      // Add active class to new slide and indicator
      currentIndex = index;
      slides[currentIndex].classList.add('active');
      indicators[currentIndex].classList.add('active');

      // Update title
      if (titleElement) {
        const metric = slides[currentIndex].dataset.metric;
        titleElement.textContent = `${metricNames[metric]} Distribution`;
      }
    }

    function nextSlide() {
      const nextIndex = (currentIndex + 1) % slides.length;
      goToSlide(nextIndex);
    }

    function prevSlide() {
      const prevIndex = (currentIndex - 1 + slides.length) % slides.length;
      goToSlide(prevIndex);
    }

    // Navigation buttons
    if (nextBtn) {
      nextBtn.addEventListener('click', nextSlide);
    }

    if (prevBtn) {
      prevBtn.addEventListener('click', prevSlide);
    }

    // Touch/swipe support
    let touchStartX = 0;
    let touchEndX = 0;
    const container = document.querySelector('.widget-container');

    if (container) {
      container.addEventListener('touchstart', (e) => {
        touchStartX = e.changedTouches[0].screenX;
      }, { passive: true });

      container.addEventListener('touchend', (e) => {
        touchEndX = e.changedTouches[0].screenX;
        handleSwipe();
      }, { passive: true });

      function handleSwipe() {
        const swipeThreshold = 50;
        const diff = touchStartX - touchEndX;

        if (Math.abs(diff) > swipeThreshold) {
          if (diff > 0) {
            // Swipe left - next slide
            nextSlide();
          } else {
            // Swipe right - previous slide
            prevSlide();
          }
        }
      }
    }

    // Keyboard navigation
    document.addEventListener('keydown', (e) => {
      // Only handle arrow keys when the widget stack section is visible
      const widgetStack = document.querySelector('.widget-stack');
      if (!widgetStack) return;

      if (e.key === 'ArrowLeft') {
        prevSlide();
      } else if (e.key === 'ArrowRight') {
        nextSlide();
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
