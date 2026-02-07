document.addEventListener('DOMContentLoaded', () => {

    async function fetchDashboardData(){
        const urls = ['/api/reports','assets/data/report-data.json'];
        for(const u of urls){
            try{
                const r = await fetch(u, {cache:'no-store'});
                if(!r.ok) throw new Error('no');
                const j = await r.json();
                return j;
            }catch(e){ /* try next */ }
        }
        return null;
    }

    function formatNumber(n){ return typeof n === 'number' ? n.toLocaleString() : n; }

    (async function init(){
        const data = await fetchDashboardData();

        // Doughtnut - Traffic
        const trafficChart = document.getElementById('trafficChart');
        const defaultTrafficLabels = ['بحث عضوي','إحالات','وسائل التواصل الاجتماعي'];
        const defaultTrafficValues = [4305, 482, 859];
        const trafficLabels = (data && data.traffic && Array.isArray(data.traffic.labels)) ? data.traffic.labels : defaultTrafficLabels;
        const trafficValues = (data && data.traffic && Array.isArray(data.traffic.values)) ? data.traffic.values : defaultTrafficValues;
        const trafficColors = ['#43A9D4', '#68D137', '#7256C5'];

        if(trafficChart){
            if(trafficChart._chart){ trafficChart._chart.destroy(); }
            trafficChart._chart = new Chart(trafficChart.getContext('2d'), {
                type: 'doughnut',
                data: {
                    labels: trafficLabels,
                    datasets: [{ data: trafficValues, backgroundColor: trafficColors, borderWidth: 0 }]
                },
                options: { responsive: true, plugins: { legend: { display: false } }, cutout: '70%' }
            });

            // update legend numbers inside .traffic-legend
            const rows = document.querySelectorAll('.traffic-legend table tbody tr');
            rows.forEach((r,i)=>{
                const valSpan = r.querySelector('td:nth-child(2) span');
                if(valSpan) valSpan.textContent = formatNumber(trafficValues[i] ?? 0);
            });
        }

        // Bar chart - conversions
        const barChart = document.getElementById('barChart');
        const conv = data && data.conversions ? data.conversions : null;
        const defaultConv = {
            labels: ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct'],
            datasets: [
                { label:'Segment 1', data:[35, 28, 34, 32, 40, 20, 45, 25, 30, 35], backgroundColor:'#7256C5' },
                { label:'Segment 2', data:[45, 35, 45, 48, 50, 40, 55, 42, 35, 40], backgroundColor:'#68D137' }
            ]
        };

        const convLabels = conv && Array.isArray(conv.labels) ? conv.labels : defaultConv.labels;
        const convDatasets = conv && Array.isArray(conv.datasets) ? conv.datasets : defaultConv.datasets;

        if(barChart){
            if(barChart._chart) { barChart._chart.destroy(); }
            barChart._chart = new Chart(barChart.getContext('2d'), {
                type: 'bar',
                data: { labels: convLabels, datasets: convDatasets.map(ds => ({...ds, barThickness:20, borderRadius:8})) },
                options: {
                    responsive: true,
                    plugins: { legend: { display: false }, tooltip: { enabled: true } },
                    scales: { x: { stacked: true, grid: { display: false } }, y: { grid: { display: true }, ticks: { display: false } } }
                }
            });
        }

    })();

});
