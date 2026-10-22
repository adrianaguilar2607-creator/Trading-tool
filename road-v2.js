
// Mis Visitas v2: tiempos de conducción bajo demanda, guardados exclusivamente en este dispositivo.
// Uso puntual del servidor público OSRM para pruebas. No hay consulta en segundo plano.
const roadAPI='https://router.project-osrm.org/table/v1/driving/';
const legacyTravelMinutes=travelMinutes;
function roadLocations(s){
  return [{id:'base',lat:Number(s.settings.originLat),lon:Number(s.settings.originLon)}]
    .concat(s.buildings.map(b=>({id:b.id,lat:Number(b.lat),lon:Number(b.lon)})).sort((a,b)=>a.id.localeCompare(b.id)));
}
function roadFingerprint(s){return JSON.stringify(roadLocations(s).map(p=>[p.id,p.lat.toFixed(6),p.lon.toFixed(6)]));}
function currentRoadMatrix(){
  if(!store||!store.roadMatrix||store.roadMatrix.version!==2)return null;
  const m=store.roadMatrix;
  if(m.fingerprint!==roadFingerprint(store)||m.ids.length!==store.buildings.length+1)return null;
  return m;
}
travelMinutes=function(a,b,s){
  if(a&&b&&a.id&&a.id===b.id)return 0;
  const m=currentRoadMatrix();
  if(!m)return legacyTravelMinutes(a,b,s);
  const from=a?.id||'base',to=b?.id||'base',i=m.ids.indexOf(from),j=m.ids.indexOf(to);
  if(i<0||j<0)return legacyTravelMinutes(a,b,s);
  const sec=m.durations?.[i]?.[j];
  if(typeof sec!=='number'||!Number.isFinite(sec))return legacyTravelMinutes(a,b,s);
  return Math.max(1,Math.ceil(sec/60+Math.max(0,Number(s.driveBufferMinutes)||0)));
};
const roadPanel=document.createElement('div');
roadPanel.id='roadPanel';
roadPanel.className='panel';
roadPanel.innerHTML='<strong>🚗 Optimización por carretera</strong><p id="roadInfo" class="muted"></p><button type="button" class="primary full" id="buildRoadMatrix">Calcular tiempos reales por carretera</button><p class="muted" style="margin-bottom:0">Descarga una vez los tiempos entre edificios, los guarda en este iPhone y vuelve a calcular tus rutas. Necesita internet solo al descargar o actualizar. Sin tráfico en directo. Datos de rutas: <a href="https://project-osrm.org/" target="_blank" rel="noopener" style="text-decoration:underline">OSRM / OpenStreetMap</a>. Se envían coordenadas, no nombres ni RAE.</p>';
const roadAgenda=document.getElementById('agendaList');
if(roadAgenda)roadAgenda.parentNode.insertBefore(roadPanel,roadAgenda);
function setRoadInfo(){
  const m=currentRoadMatrix(),el=document.getElementById('roadInfo'),btn=document.getElementById('buildRoadMatrix');
  if(!el||!btn)return;
  const uncertain=store?store.buildings.filter(b=>!['manual','osm_revisada'].includes(b.geocodeQuality)).length:0;
  if(m){
    const when=new Date(m.fetchedAt).toLocaleDateString('es-ES');
    el.textContent='Matriz por calles activa: '+m.ids.length+' puntos, '+when+'. '+
      (uncertain?'Hay '+uncertain+' direcciones con coordenadas orientativas. Revisa las entradas en Edificios.':'Coordenadas revisadas.');
    btn.textContent='↻ Actualizar tiempos de carretera';
  }else{
    el.textContent='Se usan distancias aproximadas. '+(store?'Hay '+uncertain+' ubicaciones sin revisión manual.':'Importa primero tu inventario.')+' Confirma los puntos dudosos antes de activar la matriz.';
    btn.textContent='Calcular tiempos por carretera (una vez)';
  }
}
const originalRenderAgenda=renderAgenda;
renderAgenda=function(){originalRenderAgenda();setRoadInfo(); if(!store)return;
  const m=currentRoadMatrix(),box=document.getElementById('dayInfo'),entries=(store.planEntries||[]).filter(e=>e.day===selectedDate).sort((a,b)=>a.shiftIndex-b.shiftIndex||a.start.localeCompare(b.start));
  if(!m||!box||!entries.length)return;
  let previous='base',shift=-1,seconds=0,metres=0;
  for(const e of entries){
    if(shift!==e.shiftIndex&&shift!==-1){
      const i=m.ids.indexOf(previous),j=m.ids.indexOf('base');
      if(i>=0&&j>=0){seconds+=Number(m.durations?.[i]?.[j])||0;metres+=Number(m.distances?.[i]?.[j])||0;}
      previous='base';
    }
    shift=e.shiftIndex;
    const i=m.ids.indexOf(previous),j=m.ids.indexOf(e.buildingId);
    if(i>=0&&j>=0){seconds+=Number(m.durations?.[i]?.[j])||0;metres+=Number(m.distances?.[i]?.[j])||0;}
    previous=e.buildingId;
  }
  if(previous!=='base'){
    const i=m.ids.indexOf(previous),j=m.ids.indexOf('base');
    if(i>=0&&j>=0){seconds+=Number(m.durations?.[i]?.[j])||0;metres+=Number(m.distances?.[i]?.[j])||0;}
  }
  const stat=document.createElement('div');stat.className='notice';stat.style.background='#eff3f8';
  stat.textContent='🚗 Recorrido estimado por calles: '+(metres/1000).toFixed(1)+' km · '+Math.round(seconds/60)+' min de conducción sin tráfico ni márgenes. Incluye regreso a la base por cada turno.';
  box.appendChild(stat);
};
const originalRenderBuildings=renderBuildings;
renderBuildings=function(){
  originalRenderBuildings();
  if(!store)return;
  for(const b of store.buildings){
    const editor=document.getElementById('eb-'+b.id);
    if(!editor)continue;
    const lbl=document.createElement('div');lbl.className='wide muted';lbl.style.fontSize='12px';
    lbl.textContent=b.geocodeQuality==='manual'?'Ubicación corregida manualmente':
      b.geocodeQuality==='osm_revisada'?'Resultado de OpenStreetMap aceptado; comprueba el acceso exacto':
      'Coordenadas orientativas. Conviene revisar el portal.';
    editor.appendChild(lbl);
    const geo=document.createElement('button');
    geo.className='secondary';geo.type='button';geo.dataset.findcoords=b.id;
    geo.textContent='📍 Buscar coordenadas de esta dirección (internet)';
    editor.appendChild(geo);
  }
};
const oldRenderAll=renderAll;
renderAll=function(){oldRenderAll();setRoadInfo()};
async function getRoadMatrix(){
  if(!store)throw Error('Primero importa el inventario');
  const points=roadLocations(store);
  if(points.some(p=>!Number.isFinite(p.lat)||!Number.isFinite(p.lon)))throw Error('Hay coordenadas inválidas');
  const message='La aplicación enviará las coordenadas de '+points.length+' puntos al servicio público de rutas OSRM, una única vez. No enviará clientes ni RAE. Algunas coordenadas aún son orientativas. ¿Quieres continuar?';
  if(!confirm(message))return;
  const btn=document.getElementById('buildRoadMatrix');btn.disabled=true;
  const label=document.getElementById('roadInfo');label.textContent='Consultando red viaria (una solicitud). Mantén esta pantalla abierta.';
  const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),25000);
  try{
    const coords=points.map(p=>p.lon.toFixed(6)+','+p.lat.toFixed(6)).join(';');
    const response=await fetch(roadAPI+coords+'?annotations=duration,distance',{signal:controller.signal,headers:{'Accept':'application/json'}});
    if(!response.ok)throw Error('El servicio respondió '+response.status);
    const data=await response.json(),n=points.length;
    const good=x=>Array.isArray(x)&&x.length===n&&x.every(r=>Array.isArray(r)&&r.length===n);
    if(data.code!=='Ok'||!good(data.durations)||!good(data.distances))throw Error('El servicio devolvió datos incompletos');
    let valid=0;
    for(let i=0;i<n;i++)for(let j=0;j<n;j++){
      const sec=data.durations[i][j],mt=data.distances[i][j];
      if((sec===null||Number.isFinite(sec)&&sec>=0&&sec<36000)&&(mt===null||Number.isFinite(mt)&&mt>=0&&mt<500000))valid++;
      else throw Error('Matriz con valores inválidos');
    }
    if(valid!==n*n)throw Error('Matriz incompleta');
    store.roadMatrix={version:2,provider:'OSRM / OpenStreetMap',fetchedAt:new Date().toISOString(),
      ids:points.map(p=>p.id),fingerprint:roadFingerprint(store),durations:data.durations,distances:data.distances};
    autoPlan(store,nextWorkday(dateMadrid()),50);persist();renderAll();
    toast('Rutas por carretera activadas y guardadas en este iPhone');
  }finally{clearTimeout(timeout);btn.disabled=false;setRoadInfo();}
}
document.getElementById('buildRoadMatrix')?.addEventListener('click',async()=>{try{await getRoadMatrix()}catch(e){toast('Sin matriz nueva: '+e.message);setRoadInfo();}});
let geocodeBusy=false,geocodeLast=0;
document.addEventListener('click',async e=>{
  const element=e.target.closest('button[data-findcoords]');if(!element)return;
  if(geocodeBusy){toast('Termina la búsqueda anterior');return;}
  const b=store?.buildings?.find(x=>x.id===element.dataset.findcoords);if(!b)return;
  if(!confirm('Se enviará solo la dirección '+b.address+' a OpenStreetMap para buscar sus coordenadas. No se enviarán clientes ni RAE. ¿Continuar?'))return;
  geocodeBusy=true;element.disabled=true;
  try{
    const delay=Math.max(0,1300-(Date.now()-geocodeLast));if(delay)await new Promise(r=>setTimeout(r,delay));
    geocodeLast=Date.now();
    const query=b.address.replace(/\([^)]*\)/g,'').replace(/[–—]/g,'-')+', Barcelona, Catalunya, España';
    const endpoint='https://nominatim.openstreetmap.org/search?format=jsonv2&limit=3&countrycodes=es&q='+encodeURIComponent(query);
    const resp=await fetch(endpoint,{headers:{Accept:'application/json'},referrerPolicy:'strict-origin-when-cross-origin'});
    if(!resp.ok)throw Error('Geocodificador: '+resp.status);
    const options=(await resp.json()).filter(r=>Number(r.lat)>41.25&&Number(r.lat)<41.65&&Number(r.lon)>1.9&&Number(r.lon)<2.35);
    if(!options.length)throw Error('No he encontrado esa dirección. Conserva las coordenadas actuales o corrígelas manualmente.');
    const pick=prompt('Resultados de OpenStreetMap (pueden ser inexactos):\n'+options.map((x,i)=>(i+1)+'. '+String(x.display_name).slice(0,150)).join('\n')+'\n\nEscribe el número que corresponde al edificio:', '1');
    if(pick===null)return;
    const result=options[Number(pick)-1];
    if(!result)throw Error('Elige un resultado válido');
    if(!confirm('Usar latitud '+Number(result.lat).toFixed(6)+' y longitud '+Number(result.lon).toFixed(6)+'?\nVerifica la entrada real en el mapa.'))return;
    mutateLocal('building',{id:b.id,lat:Number(result.lat),lon:Number(result.lon)});
    const target=store.buildings.find(x=>x.id===b.id);target.geocodeQuality='osm_revisada';
    persist();renderAll();
    toast('Punto actualizado. La matriz de carreteras deberá recalcularse');
  }catch(error){toast('Búsqueda: '+error.message)}finally{geocodeBusy=false;element.disabled=false;}
});

const homeEditor=document.createElement('details');
homeEditor.id='homeOriginEditor';homeEditor.className='info-note';homeEditor.style.marginTop='12px';
homeEditor.innerHTML='<summary style="font-weight:700;cursor:pointer">📍 Revisar salida y regreso: Sant Adrià 30</summary><p class="muted">Las coordenadas de la base también son orientativas. Puedes corregirlas manualmente o buscar una propuesta en OpenStreetMap. El cambio recalcula las visitas y deja obsoleta la matriz anterior.</p><div class="form-panel"><label>Dirección de origen y regreso</label><input id="homeAddress" autocomplete="off"><label>Latitud</label><input id="homeLat" inputmode="decimal"><label>Longitud</label><input id="homeLon" inputmode="decimal"><button class="secondary" type="button" id="searchHome">Buscar coordenadas (internet)</button><button class="primary" type="button" id="saveHome">Guardar ubicación de salida</button></div>';
roadPanel.appendChild(homeEditor);
function syncHomeInputs(){
 if(!store)return;
 if(document.activeElement?.closest?.('#homeOriginEditor'))return;
 document.getElementById('homeAddress').value=store.settings.origin;
 document.getElementById('homeLat').value=String(store.settings.originLat);
 document.getElementById('homeLon').value=String(store.settings.originLon);
}
const savedRenderAll=renderAll;
renderAll=function(){savedRenderAll();syncHomeInputs()};
document.getElementById('saveHome').addEventListener('click',()=>{
 if(!store)return;
 const name=document.getElementById('homeAddress').value.trim().slice(0,160),
 lat=Number(document.getElementById('homeLat').value.replace(',','.')),
 lon=Number(document.getElementById('homeLon').value.replace(',','.'));
 if(!name||!(lat>41.25&&lat<41.65&&lon>1.9&&lon<2.35)){toast('Escribe una dirección y coordenadas válidas dentro de Barcelona');return;}
 store.settings.origin=name;store.settings.originLat=lat;store.settings.originLon=lon;
 autoPlan(store,nextWorkday(dateMadrid()),50);persist();renderAll();
 toast('Origen actualizado. Vuelve a calcular tiempos por carretera.');
});
document.getElementById('searchHome').addEventListener('click',async e=>{
 if(!store||geocodeBusy)return;
 const address=document.getElementById('homeAddress').value.trim();
 if(!address)return;
 if(!confirm('Buscar esta dirección en OpenStreetMap: '+address+'? No se envían clientes ni RAE.'))return;
 geocodeBusy=true;e.currentTarget.disabled=true;
 try{
  const delay=Math.max(0,1300-(Date.now()-geocodeLast));if(delay)await new Promise(resolve=>setTimeout(resolve,delay));
  geocodeLast=Date.now();
  const url='https://nominatim.openstreetmap.org/search?format=jsonv2&limit=3&countrycodes=es&q='+encodeURIComponent(address+', Barcelona, Catalunya');
  const res=await fetch(url,{headers:{Accept:'application/json'},referrerPolicy:'strict-origin-when-cross-origin'});
  if(!res.ok)throw Error('Geocodificador '+res.status);
  const choices=(await res.json()).filter(x=>Number(x.lat)>41.25&&Number(x.lat)<41.65&&Number(x.lon)>1.9&&Number(x.lon)<2.35);
  if(!choices.length)throw Error('No se ha encontrado una ubicación válida');
  const choice=prompt('Elige una opción de OpenStreetMap:\n'+choices.map((r,i)=>(i+1)+'. '+String(r.display_name).slice(0,145)).join('\n')+'\n\nNúmero:', '1');
  if(choice===null)return;
  const found=choices[Number(choice)-1];if(!found)throw Error('Selección no válida');
  document.getElementById('homeLat').value=Number(found.lat).toFixed(6);
  document.getElementById('homeLon').value=Number(found.lon).toFixed(6);
  toast('Coordenadas propuestas. Comprueba y pulsa Guardar ubicación de salida.');
 }catch(error){toast(error.message)}finally{geocodeBusy=false;e.currentTarget.disabled=false}
});
