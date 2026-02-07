// تقارير مع رسوم بيانية صغيرة (sparklines) لكل كرت باستخدام Chart.js
// يتوقع أن يعيد /api/reports أو ملف JSON البنية التالية:
// { "students": 120, "students_history": [100,110,115,120], "lessons": 35, "lessons_history": [...], ... }

(function(){
  const dataUrls = ['/api/reports', 'assets/data/report-data.json'];
  const keys = ["students","lessons","stories","words","courses","teachers","notifications"];

  function formatNumber(n){ return typeof n === 'number' ? n.toLocaleString() : n; }

  function getColor(key){
    switch(key){
      case 'students': return '#7C5DFA';
      case 'lessons': return '#FF4C61';
      case 'stories': return '#4BDE97';
      case 'words': return '#487FFF';
      case 'courses': return '#FACC15';
      case 'teachers': return '#43A9D4';
      default: return '#6B7280';
    }
  }

  function renderSparkline(canvasId, series, color){
    const el = document.getElementById(canvasId);
    if(!el) return;
    // clear previous chart if exists
    if(el._chart) { el._chart.destroy(); el._chart = null; }

    // ensure there's at least 2 points
    if(!Array.isArray(series) || series.length === 0) series = [0,0];
    if(series.length === 1) series = [series[0]-1 || 0, series[0]];

    const ctx = el.getContext('2d');
    el.width = el.clientWidth;
    el.height = 40;

    el._chart = new Chart(ctx, {
      type: 'line',
      data: {
        labels: series.map((v,i)=>i+1),
        datasets: [{
          data: series,
          borderColor: color,
          backgroundColor: hexToRgba(color,0.12),
          fill: true,
          pointRadius: 0,
          borderWidth: 2,
          tension: 0.35
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: { x: { display: false }, y: { display: false } },
        elements: { line: { borderCapStyle: 'round' } }
      }
    });
  }

  function hexToRgba(hex, alpha){
    const c = hex.replace('#','');
    const bigint = parseInt(c,16);
    const r = (bigint >> 16) & 255;
    const g = (bigint >> 8) & 255;
    const b = bigint & 255;
    return 'rgba('+r+','+g+','+b+','+alpha+')';
  }

  function computeChange(history, fallbackValue){
    if(Array.isArray(history) && history.length>=2){
      const last = history[history.length-1];
      const prev = history[history.length-2] || last;
      if(prev === 0) return 0;
      return Math.round(((last - prev) / prev) * 100 * 10) / 10; // one decimal
    }
    return null;
  }

  function fillData(data){
    keys.forEach(k=>{
      const valEl = document.querySelector('.stats-value[data-key="'+k+'"], .report-value[data-key="'+k+'"]');
      if(valEl && data[k] !== undefined) valEl.textContent = formatNumber(data[k]);

      const changeSpan = document.querySelector('[data-key-change="'+k+'"]');
      const history = data[k+'_history'] || data[k+'History'] || null;
      const changeVal = (data[k+'_change'] !== undefined) ? data[k+'_change'] : computeChange(history, data[k]);
      if(changeSpan){
        if(changeVal === null || changeVal === undefined) { changeSpan.textContent = ''; changeSpan.classList.remove('trend-up','trend-down'); }
        else { changeSpan.textContent = (changeVal>0?'+':'')+changeVal+'%'; changeSpan.classList.toggle('trend-up', changeVal>=0); changeSpan.classList.toggle('trend-down', changeVal<0); }
      }

      const canvasId = 'spark-'+k;
      const series = Array.isArray(history) && history.length ? history : (data[k] ? [Math.max(0, data[k]-2), Math.max(0, data[k]-1), data[k]] : [0,0]);
      renderSparkline(canvasId, series, getColor(k));
    });
  }

  function load(){
    fetch(dataUrls[0], {cache:'no-store'})
      .then(r=>{ if(!r.ok) throw new Error('no api'); return r.json(); })
      .then(fillData)
      .catch(()=> fetch(dataUrls[1]).then(r=>r.json()).then(fillData).catch(err=>console.error('Reports load error', err)));
  }

  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', load);
  else load();
})();