// Weather app - mock weather display
const AppWeather = {
  render(container) {
    const cities = [
      { name: 'San Francisco', temp: 18, condition: 'Partly Cloudy', icon: '⛅', high: 22, low: 14 },
      { name: 'New York', temp: 25, condition: 'Sunny', icon: '☀️', high: 28, low: 20 },
      { name: 'London', temp: 15, condition: 'Rain', icon: '🌧️', high: 17, low: 12 },
      { name: 'Tokyo', temp: 28, condition: 'Clear', icon: '🌙', high: 30, low: 24 },
      { name: 'Sydney', temp: 12, condition: 'Windy', icon: '💨', high: 16, low: 9 },
    ];

    container.innerHTML = `
      <div style="margin-bottom:16px;">
        <input type="text" id="weather-search" class="app-input" placeholder="Search for a city..." style="width:100%;">
      </div>
      <div id="weather-cities">
        ${cities.map(c => `
          <div class="weather-city" style="display:flex;align-items:center;padding:14px;border-radius:10px;margin-bottom:8px;background:rgba(0,0,0,0.03);cursor:default;">
            <span style="font-size:36px;margin-right:14px;">${c.icon}</span>
            <div style="flex:1;">
              <div style="font-weight:600;font-size:15px;">${c.name}</div>
              <div style="font-size:12px;color:#666;">${c.condition}</div>
            </div>
            <div style="text-align:right;">
              <div style="font-size:28px;font-weight:300;">${c.temp}°</div>
              <div style="font-size:12px;color:#666;">H:${c.high}° L:${c.low}°</div>
            </div>
          </div>
        `).join('')}
      </div>
    `;
  }
};
