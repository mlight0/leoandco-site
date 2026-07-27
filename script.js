async function loadCSV(url){
  const res = await fetch(url); const text = await res.text();
  return new Promise((resolve)=> Papa.parse(text,{header:true,skipEmptyLines:true,complete: r=>resolve(r.data)}));
}

function num(x){ const n = parseFloat(x); return isNaN(n)?0:n }
function pct(x){ return (x*100).toFixed(1)+"%" }

(async function(){
  const runs = await loadCSV('data/run_summary.csv');
  const vins = await loadCSV('data/vin_sample.csv');

  // KPIs
  const vehicles_built = runs.reduce((a,r)=>a+num(r.vehicles_built),0);
  const good = runs.reduce((a,r)=>a+num(r.good_vehicles),0);
  const scrap = runs.reduce((a,r)=>a+num(r.scrap_vehicles),0);
  const avgOEE = runs.reduce((a,r)=>a+num(r.oee),0)/Math.max(1,runs.length);
  document.getElementById('kpi-built').textContent = vehicles_built.toLocaleString();
  document.getElementById('kpi-good').textContent = good.toLocaleString();
  document.getElementById('kpi-scrap').textContent = scrap.toLocaleString();
  document.getElementById('kpi-oee').textContent = pct(avgOEE);

  // OEE by week (date)
  const byDate = runs.map(r=>({x:r.date, y: num(r.oee)})).sort((a,b)=> a.x.localeCompare(b.x));
  new Chart(document.getElementById('oeeChart'),{
    type:'line', data:{ datasets:[{label:'OEE', data:byDate, borderColor:'#2a6a50', backgroundColor:'rgba(42,106,80,0.2)', tension:0.2}]},
    options:{ parsing:false, scales:{ y:{ ticks:{ callback:v=> (v*100)+'%' }, min:0, max:1 }, x:{ ticks:{ autoSkip:true, maxTicksLimit:8 } } }, plugins:{ legend:{display:false} } }
  });

  // Top defects
  const defectMap = new Map();
  for(const r of runs){
    const items = String(r.top_defects||'').split(';').map(s=>s.trim()).filter(Boolean);
    for(const it of items){
      const [name,countStr] = it.split(':');
      const c = num(countStr||'1');
      defectMap.set(name,(defectMap.get(name)||0)+c);
    }
  }
  const top = Array.from(defectMap.entries()).sort((a,b)=>b[1]-a[1]).slice(0,8);
  const ul = document.getElementById('defects-list');
  ul.innerHTML = top.map(([k,v])=>`<li>${k}: <strong>${v}</strong></li>`).join('') || '<li>No defects recorded</li>';

  // VIN table
  const tbody = document.querySelector('#vin-table tbody');
  function renderVIN(rows){
    tbody.innerHTML = rows.map(r=>`<tr><td>${r.vin}</td><td>${r.build_date}</td><td>${r.model}</td><td>${r.trim}</td><td>${r.line}</td><td>${r.shift}</td><td>${r.status}</td><td>${r.defects||''}</td><td>${r.torque_test_pass}</td><td>${r.leak_test_pass}</td></tr>`).join('');
  }
  renderVIN(vins);

  document.getElementById('apply').addEventListener('click',()=>{
    const m = document.getElementById('f-model').value.toLowerCase();
    const s = document.getElementById('f-status').value;
    const filtered = vins.filter(v=>(!m || String(v.model).toLowerCase().includes(m)) && (!s || v.status===s));
    renderVIN(filtered);
  });
})();
