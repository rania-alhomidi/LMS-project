(function(){
  const DATA_URL = 'assets/data/admin-activity.json';
  const tableBody = document.querySelector('#activityTable tbody');
  const searchInput = document.getElementById('search');
  const filterUser = document.getElementById('filterUser');
  const filterType = document.getElementById('filterType');
  const dateFrom = document.getElementById('dateFrom');
  const dateTo = document.getElementById('dateTo');
  const exportBtn = document.getElementById('exportCsv');
  const kpiTotal = document.getElementById('kpiTotal');
  const kpiTopUser = document.getElementById('kpiTopUser');
  const kpiAddsToday = document.getElementById('kpiAddsToday');
  const kpiDeletesToday = document.getElementById('kpiDeletesToday');
  const actionsBarCtx = document.getElementById('actionsBar') && document.getElementById('actionsBar').getContext('2d');
  const typePieCtx = document.getElementById('typePie') && document.getElementById('typePie').getContext('2d');
  let barChart = null; let pieChart = null;
  let data = [];

  async function load(){
    try{
      const res = await fetch(DATA_URL);
      data = await res.json();
      populateFilters();
      render();
    }catch(e){
      console.warn('تعذر تحميل JSON، سيتم استخدام بيانات الجدول الموجودة كنسخة احتياطية.', e);
      // fallback: parse existing table rows in DOM
      data = parseTableRows();
      populateFilters();
      render();
    }
  }

  function parseTableRows(){
    const rows = [];
    const trs = Array.from(document.querySelectorAll('#activityTable tbody tr'));
    trs.forEach(tr=>{
      const cells = tr.querySelectorAll('td');
      if(cells.length >=5){
        rows.push({
          user: cells[0].textContent.trim(),
          action: cells[1].textContent.trim(),
          entity: cells[2].textContent.trim(),
          description: cells[3].textContent.trim(),
          timestamp: normalizeTimestamp(cells[4].textContent.trim())
        });
      }
    });
    return rows;
  }

  function normalizeTimestamp(text){
    // try to convert 'YYYY-MM-DD HH:MM' to ISO; if fails, return now
    const m = text.match(/^(\d{4}-\d{2}-\d{2})\s*(\d{2}:\d{2})?/);
    if(m){
      const date = m[1]; const time = m[2] || '00:00';
      return new Date(date + 'T' + time + ':00Z').toISOString();
    }
    return new Date().toISOString();
  }

  function populateFilters(){
    const users = [...new Set(data.map(x=>x.user))];
    users.forEach(u=>{
      const opt = document.createElement('option');
      opt.value = u; opt.textContent = u; filterUser.appendChild(opt);
    });
  }

  function matches(item){
    const q = searchInput.value.trim().toLowerCase();
    if(q){
      if(!(item.user.toLowerCase().includes(q) || item.description.toLowerCase().includes(q) || item.entity.toLowerCase().includes(q))) return false;
    }
    if(filterUser.value && item.user !== filterUser.value) return false;
    if(filterType.value && item.action !== filterType.value) return false;
    if(dateFrom.value){
      if(new Date(item.timestamp) < new Date(dateFrom.value)) return false;
    }
    if(dateTo.value){
      const end = new Date(dateTo.value); end.setDate(end.getDate()+1);
      if(new Date(item.timestamp) >= end) return false;
    }
    return true;
  }

  function render(){
    tableBody.innerHTML = '';
    const rows = data.filter(matches).sort((a,b)=> new Date(b.timestamp) - new Date(a.timestamp));
    if(rows.length === 0){
      tableBody.innerHTML = '<tr><td colspan="5">لا توجد نتائج</td></tr>';
      updateKpis([]);
      updateCharts([]);
      return;
    }
    rows.forEach(r=>{
      const tr = document.createElement('tr');
      tr.innerHTML = `<td>${r.user}</td><td>${r.action}</td><td>${r.entity}</td><td>${r.description}</td><td>${new Date(r.timestamp).toLocaleString()}</td>`;
      tableBody.appendChild(tr);
    });
    updateKpis(rows);
    updateCharts(rows);
  }

  function updateKpis(rows){
    const list = rows.length ? rows : data;
    animateNumber(kpiTotal, list.length);
    const counts = {};
    list.forEach(r=> counts[r.user] = (counts[r.user]||0)+1);
    const topUser = Object.keys(counts).sort((a,b)=> counts[b]-counts[a])[0] || '-';
    // brief highlight when top user changes
    if(kpiTopUser.textContent !== topUser){ kpiTopUser.classList.remove('fade-update'); void kpiTopUser.offsetWidth; kpiTopUser.textContent = topUser; kpiTopUser.classList.add('fade-update'); }
    const today = new Date().toISOString().slice(0,10);
    animateNumber(kpiAddsToday, list.filter(r=> r.action === 'إضافة' && r.timestamp.slice(0,10) === today).length);
    animateNumber(kpiDeletesToday, list.filter(r=> r.action === 'حذف' && r.timestamp.slice(0,10) === today).length);
  }

  // animate numbers from current to target
  function animateNumber(el, target){
    if(!el) return;
    const start = parseInt(el.textContent.replace(/[^0-9]/g,'')) || 0;
    const duration = 700;
    const startTime = performance.now();
    function step(now){
      const progress = Math.min((now - startTime)/duration, 1);
      const value = Math.floor(start + (target - start) * easeOutCubic(progress));
      el.textContent = value;
      if(progress < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }

  function easeOutCubic(t){ return 1 - Math.pow(1 - t, 3); }

  function updateCharts(rows){
    const list = rows.length ? rows : data;
    // Bar: count per day (last 7 days)
    const days = [];
    for(let i=6;i>=0;i--){ const d = new Date(); d.setDate(d.getDate()-i); days.push(d.toISOString().slice(0,10)); }
    const byDay = days.map(day => list.filter(r=> r.timestamp.slice(0,10) === day).length);

    // Pie: by action type
    const types = {};
    list.forEach(r=> types[r.action] = (types[r.action]||0)+1);
    const pieLabels = Object.keys(types);
    const pieData = pieLabels.map(l=> types[l]);

    if(actionsBarCtx){
      if(barChart) { barChart.data.labels = days; barChart.data.datasets[0].data = byDay; barChart.update(); }
      else {
        barChart = new Chart(actionsBarCtx, {
          type: 'bar', data: { labels: days, datasets:[{ label:'نشاطات', backgroundColor:'#4e73df', data: byDay }] }, options:{ responsive:true, maintainAspectRatio:true, scales: { y: { beginAtZero: true } } }
        });
      }
    }

    if(typePieCtx){
      if(pieChart){ pieChart.data.labels = pieLabels; pieChart.data.datasets[0].data = pieData; pieChart.update(); }
      else {
        pieChart = new Chart(typePieCtx, { type:'pie', data:{ labels: pieLabels, datasets:[{ data: pieData, backgroundColor: ['#1cc88a','#36b9cc','#f6c23e','#e74a3b'] }] }, options:{ responsive:true, maintainAspectRatio:true } });
      }
    }
  }

  function exportCSV(){
    const rows = data.filter(matches).map(r=> [r.user, r.action, r.entity, r.description, r.timestamp]);
    let csv = 'المستخدم,الحدث,الكيان,الوصف,الزمن\n';
    rows.forEach(r=>{ csv += r.map(cell=> '"' + String(cell).replace(/"/g,'""') + '"').join(',') + '\n'; });
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'admin-activity.csv'; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
  }

  [searchInput, filterUser, filterType, dateFrom, dateTo].forEach(el=> el.addEventListener('input', render));
  exportBtn.addEventListener('click', exportCSV);
  load();
})();
