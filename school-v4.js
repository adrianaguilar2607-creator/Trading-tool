
// Preferencia de acceso a centros educativos. Todo se guarda localmente.
const SCHOOL_POLICY_VERSION=4;
function isEducationalBuilding(b){
  return /^(escola(?:\s+bressol)?|institut(?:\s|$)|equipamiento educativo|centre educatiu|colegio(?:\s|$)|escuela(?:\s|$))/i.test(String(b?.name||'').trim());
}
function requiresMorning(b){
  if(b.schoolVisitPolicy==='morning')return true;
  if(b.schoolVisitPolicy==='flexible'||b.schoolVisitPolicy==='general')return false;
  return isEducationalBuilding(b);
}
function morningLimit(b){
 const t=typeof b.schoolMorningEnd==='string'?b.schoolMorningEnd:'13:00';
 return /^([01]\d|2[0-3]):[0-5]\d$/.test(t)?Math.min(870,Math.max(600,timeToMin(t))):780;
}
const originalWindowsForSchool=windowsFor;
windowsFor=function(b,date){
  const raw=originalWindowsForSchool(b,date);
  if(!requiresMorning(b))return raw;
  // 08:00 hasta la hora de corte, respetando asimismo el horario público si consta.
  const end=morningLimit(b);
  const base=raw.length?raw:[[480,end]];
  const clipped=base.map(([a,z])=>[Math.max(480,a),Math.min(end,z)]).filter(([a,z])=>z>a);
  // Un intervalo vacío explícito evita interpretar «sin horario» como acceso libre.
  return clipped.length?clipped:[[480,480]];
};
const originalAutoPlanSchool=autoPlan;
autoPlan=function(state,fromDate,horizon=28){
  if(!state||!Array.isArray(state.buildings))return originalAutoPlanSchool(state,fromDate,horizon);
  const replaced=[];
  for(const b of state.buildings){
    if(requiresMorning(b)){
      replaced.push([b,b.enforceHours]);
      b.enforceHours=true;
    }
  }
  try{return originalAutoPlanSchool(state,fromDate,horizon);}
  finally{for(const [b,oldValue] of replaced){
    if(oldValue===undefined)delete b.enforceHours; else b.enforceHours=oldValue;
  }}
};
const originalRenderBuildingsSchool=renderBuildings;
renderBuildings=function(){
  originalRenderBuildingsSchool();
  if(!store)return;
  const n=store.buildings.filter(requiresMorning).length;
  for(const b of store.buildings){
    const card=document.getElementById('eb-'+b.id);
    if(!card)continue;
    const value=b.schoolVisitPolicy||'auto';
    const isSchool=requiresMorning(b);
    const wrapper=document.createElement('div');
    wrapper.className='wide';
    wrapper.innerHTML=
     '<label style="font-weight:700">Acceso técnico · preferencia de turno</label>'+
     '<select id="schoolpref-'+b.id+'">'+
      '<option value="auto">Automático (identificar colegios)</option>'+
      '<option value="morning">Solo mañanas · conserjería</option>'+
      '<option value="flexible">Mañana y tarde confirmadas</option>'+
      '<option value="general">Edificio no escolar · sin preferencia</option>'+
     '</select>'+
     '<label style="margin-top:8px">Hora límite de mañana (para colegios)</label>'+
     '<input id="schoolend-'+b.id+'" type="time" value="'+String(b.schoolMorningEnd||'13:00')+'">'+
     '<small>Por defecto los colegios se planifican de 08:00 a 13:00, dentro de tu horario laboral. Las tardes quedan fuera salvo confirmación expresa; no se altera el horario público del edificio.</small>'+
     '<button class="primary" type="button" data-save-school="'+b.id+'" style="margin-top:8px">Guardar preferencia y recalcular</button>';
    card.appendChild(wrapper);
    const select=wrapper.querySelector('select');
    select.value=value;
    // Marcador visual para distinguir centros afectados incluso con editor cerrado.
    if(isSchool){
      const pill=document.createElement('span');
      pill.className='pill orange';pill.textContent='🏫 Visita de mañana';
      const heading=card.querySelector('.badge-wrap');
      if(heading)heading.appendChild(pill);
    }else if(isEducationalBuilding(b)&&b.schoolVisitPolicy==='flexible'){
      const pill=document.createElement('span');pill.className='pill green';
      pill.textContent='🏫 Tarde confirmada';
      card.querySelector('.badge-wrap')?.appendChild(pill);
    }
  }
};
document.addEventListener('click',event=>{
 const button=event.target.closest('button[data-save-school]');
 if(!button)return;
 const b=store?.buildings?.find(x=>x.id===button.dataset.saveSchool);
 if(!b)return;
 const mode=document.getElementById('schoolpref-'+b.id)?.value;
 const end=document.getElementById('schoolend-'+b.id)?.value;
 if(!['auto','morning','flexible','general'].includes(mode))return toast('Preferencia no válida');
 if(!/^([01]\d|2[0-3]):[0-5]\d$/.test(end)||timeToMin(end)<600||timeToMin(end)>870)
   return toast('La hora límite debe estar entre 10:00 y 14:30');
 if(mode==='auto')delete b.schoolVisitPolicy;else b.schoolVisitPolicy=mode;
 b.schoolMorningEnd=end;
 const from=nextWorkday(dateMadrid());
 try{
  autoPlan(store,from,50);
  store.settings.schoolPolicyVersion=SCHOOL_POLICY_VERSION;
  persist();renderAll();
  toast(requiresMorning(b)?'Centro programado solo por las mañanas':'Acceso actualizado. Rutas recalculadas');
 }catch(error){toast('No se ha podido guardar: '+error.message);}
});
const originalRenderAgendaSchool=renderAgenda;
renderAgenda=function(){
 originalRenderAgendaSchool();
 if(!store)return;
 const n=store.buildings.filter(requiresMorning).length;
 const box=document.getElementById('dayInfo');
 if(box&&n){
   const info=document.createElement('div');
   info.className='notice';
   info.textContent='🏫 '+n+' centros educativos se programan por la mañana (máx. 13:00 por defecto). Puedes confirmar acceso de tarde en Edificios.';
   box.appendChild(info);
 }
};
queueMicrotask(()=>{
 try{
  const live=stored();
  if(!live||live.settings?.schoolPolicyVersion===SCHOOL_POLICY_VERSION)return;
  // Migración solo de planificación futura. No borra RAE, visitas realizadas ni cambios anteriores.
  live.settings.schoolPolicyVersion=SCHOOL_POLICY_VERSION;
  autoPlan(live,nextWorkday(dateMadrid()),50);
  store=live;persist();renderAll();
  toast('Aplicada preferencia de mañanas para colegios');
 }catch(err){console.error('No se pudo aplicar la regla escolar:',err);}
});
