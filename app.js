const BIS = (() => {
  const KEY = 'sto_nino_bis_v4';
  const LEGACY_KEY = 'sto_nino_bis_v3';
  const SESSION = 'sto_nino_admin_session_v4';
  const SESSION_TTL = 2 * 60 * 60 * 1000;
  const ADMIN_USERNAME = 'stonino';
  const ADMIN_PASSWORD = 'admin123';
  const DEFAULT_USER = ADMIN_USERNAME;
  const now = () => new Date().toISOString();
  const uid = (prefix='ID') => `${prefix}-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2,7).toUpperCase()}`;
  const esc = v => String(v ?? '').replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  const cssStatus = s => ({Submitted:'blue',Processing:'amber',Approved:'green','Ready for Pickup':'green',Released:'green',Rejected:'red',Open:'blue','In Review':'amber',Resolved:'green'}[s] || 'gray');
  let formSubmissionLock = false;
  let lastModalId = null;
  const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i;
  const normalizeText = value => String(value ?? '').trim().replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g,'');
  const normalizePhone = value => String(value ?? '').trim().replace(/[^0-9+()\-\s]/g,'').replace(/\s+/g,' ');
  function validPhone(value){ const digits=String(value||'').replace(/\D/g,''); return digits.length>=7 && digits.length<=15; }
  function setFormBusy(form,busy){
    if(!form) return;
    const button=form.querySelector('button[type="submit"]');
    if(!button)return;
    if(busy){ button.dataset.originalText=button.textContent.trim(); button.classList.add('is-loading'); button.textContent='Submitting…'; button.disabled=true; }
    else { button.classList.remove('is-loading'); button.textContent=button.dataset.originalText||button.dataset.submitLabel||'Submit'; button.disabled=false; }
  }
  function markFormTouched(form){ form?.querySelectorAll('input,select,textarea').forEach(el=>el.addEventListener('blur',()=>el.classList.add('touched'),{once:false})); }
  function wireCounter(id,counterId,max){ const el=document.getElementById(id),counter=document.getElementById(counterId); if(!el||!counter)return; const update=()=>counter.textContent=String(el.value.length); el.addEventListener('input',update); update(); }
  function showConfirmation({type,reference,email}){
    const concern=type==='concern';
    const set=(id,value)=>{const el=document.getElementById(id);if(el)el.textContent=value;};
    set('confirmationKicker',concern?'CONCERN RECEIVED':'REQUEST RECEIVED');
    set('confirmationTitle',concern?'Thank you. Your concern was submitted.':'Thank you. Your document request was submitted.');
    set('confirmationText',concern?'Keep the reference number below and contact the barangay office if you need to follow up.':'Keep the reference number below and contact the barangay office if you need to follow up.');
    set('confirmationRef',reference);
    set('confirmationEmail',email);
    openModal('confirmationModal');
  }

  const seed = {
    settings: {
      siteName:'Barangay Sto. Niño', city:'City of San Fernando, Pampanga', province:'Pampanga', country:'Philippines', zip:'2000',
      badge:'OFFICIAL BARANGAY INFORMATION & SERVICE PORTAL', heroTitle:'Serbisyo publiko, mas simple at mas maaasahan.',
      heroText:'Access barangay services, announcements, emergency information, and community updates in one professional online portal.',
      address:'Star St., San Fernando, Pampanga, Philippines, 2000', phone:'0962 564 7938', email:'', website:'skstonino.com', facebook:'',
      officeHours:'Always open online · Barangay office hours may vary',
      aboutTitle:'A modern community information hub',
      aboutText:'This portal organizes official barangay information and selected public services into one clear, mobile-friendly platform for residents and visitors.',
      requestIntro:'Choose a service, complete the form, and provide accurate contact details so barangay staff can reach you if needed.',
      footerText:'Official information portal for Barangay Sto. Niño, City of San Fernando, Pampanga.',
      faqs:[
        {q:'How do I request a document?',a:'Choose a service, complete the form, and submit accurate contact details so staff can contact you if they need more information.'},
        {q:'What happens after I submit?',a:'The request appears in the barangay administrator dashboard for review. Staff can approve, reject, or mark the request ready for pickup.'},
        {q:'How can I follow up?',a:'Keep your reference number and contact the barangay office when asking about your request or report.'},
        {q:'Can I submit a concern?',a:'Yes. Use Report a Concern and provide accurate contact details so barangay staff can review the matter.'}
      ],
      logo:'assets/barangay-logo.jpg', orgChart:'assets/organizational-chart.jpg',
    },
    services: [
      ['Barangay Clearance','Official clearance for employment, legal, school, and other transactions.','1–3 working days','Varies','POPULAR'],
      ['Barangay Business Clearance','Barangay-level clearance for businesses applying for or renewing permits.','1–3 working days','Varies','BUSINESS'],
      ['Certificate of Residency','Certification confirming that the requester resides in the barangay.','1–2 working days','Varies','CERTIFICATE'],
      ['Certificate of Indigency','Certification commonly used for assistance, scholarship, medical, or social-service applications.','1–2 working days','Varies','SOCIAL SERVICE'],
      ['First Time Jobseeker Certificate','For eligible first-time jobseekers requesting qualifying government documents.','1–2 working days','Subject to eligibility','JOBSEEKER'],
      ['Certificate of Good Moral Character','Certification for school, work, or other legitimate transactions.','1–2 working days','Varies','CERTIFICATE'],
      ['Certificate of Low / No Income','Certification that may support financial assistance, scholarship, or similar applications.','1–2 working days','Varies','SOCIAL SERVICE'],
      ['Certificate of Solo Parent','Supporting certification for Solo Parent ID and related applications.','1–3 working days','Varies','FAMILY'],
      ['Certificate of Cohabitation','Certification for partners who have been living together in the community.','1–3 working days','Varies','CERTIFICATE'],
      ['Blotter Report','Barangay record for an incident, dispute, complaint, or related report.','Same day / subject to review','Varies','PEACE & ORDER'],
      ['Certification to File Action (CFA)','Certification for cases that may proceed to court after barangay conciliation requirements are met.','Subject to process','Varies','LEGAL / KP']
    ].map((x,i)=>({id:`S${i+1}`,name:x[0],description:x[1],turnaround:x[2],fee:x[3],label:x[4],active:true})),
    officials: [
      ['Hon. Janino P. Padilla','Punong Barangay','Barangay Executive'],
      ['Hon. Arjay Dasalla','Kagawad — Health and Sanitation','Barangay Council'],
      ['Hon. Felicito N. Broqueza','Kagawad — Budget and Appropriation','Barangay Council'],
      ['Hon. Evelyn B. Manabat','Kagawad — Women, Senior Citizen and PWD','Barangay Council'],
      ['Hon. Porfirio A. Palcon','Kagawad — Public Works and Infrastructure','Barangay Council'],
      ['Hon. Lawrence L. Mangune','Kagawad — Peace and Order','Barangay Council'],
      ['Hon. Arnold F. Broqueza','Kagawad — Environment and Agriculture','Barangay Council'],
      ['Hon. Andrian M. Dumas','Kagawad — Education','Barangay Council'],
      ['Hon. Gian Lorenzo M. Lopez','SK Chairman — Committee on Youth Development and Sports','Sangguniang Kabataan'],
      ['Hon. Arienna L. Cauba','SK Kagawad','Sangguniang Kabataan'],
      ['Hon. Mark Rojhen O. Caasi','SK Kagawad','Sangguniang Kabataan'],
      ['Hon. Rev P. Maniago','SK Kagawad','Sangguniang Kabataan'],
      ['Hon. Madeline M. Magbanua','SK Kagawad','Sangguniang Kabataan'],
      ['Hon. Kim Edgra N. Ocampo','SK Kagawad','Sangguniang Kabataan'],
      ['Robert John M. Yabut Jr.','Barangay Secretary','Barangay Staff'],
      ['Florentina M. Broqueza','Barangay Treasurer','Barangay Staff'],
      ['Elmer M. Broqueza','Barangay Clerk','Barangay Staff'],
      ['Rachelle M. Dagdag','Barangay Clerk','Barangay Staff']
    ].map((x,i)=>({id:`O${i+1}`,name:x[0],position:x[1],group:x[2]})),
    announcements: [],
    emergency: [
      {id:'E1',name:'Barangay Hall / Office',phone:'0962 564 7938',description:'Main barangay contact',order:1},
      {id:'E2',name:'Police / PNP Assistance',phone:'911',description:'Emergency police assistance',order:2},
      {id:'E3',name:'Fire / Rescue / BFP',phone:'911',description:'Fire and rescue emergency',order:3},
      {id:'E4',name:'Medical Emergency',phone:'911',description:'Immediate medical assistance',order:4}
    ],
    requests:[], concerns:[], audit:[], admin:{username:DEFAULT_USER}
  };

  function clone(x){ return JSON.parse(JSON.stringify(x)); }
  function storageGet(key){ try { return localStorage.getItem(key); } catch { return null; } }
  function storageSet(key,value){ try { localStorage.setItem(key,value); return true; } catch { return false; } }
  function firebaseEnabled(){ return !!(window.BIS_FIREBASE_ENABLED && window.BIS_FIREBASE_DB); }
  function firebasePayload(data){
    const safe=clone(data);
    delete safe.admin;
    return safe;
  }
  let firebaseWriteTimer=null;
  let remoteMonitorStarted=false;
  let previousRemoteCounts=null;
  let notificationAudioContext=null;
  let notificationSoundEnabled=storageGet('sto_nino_notification_sound')!=='off';

  function unlockNotificationAudio(){
    if(!notificationSoundEnabled) return;
    try{
      const AudioContextClass=window.AudioContext||window.webkitAudioContext;
      if(!AudioContextClass) return;
      if(!notificationAudioContext) notificationAudioContext=new AudioContextClass();
      if(notificationAudioContext.state==='suspended') notificationAudioContext.resume().catch(()=>{});
    }catch(error){ console.debug('[BIS] Notification audio is not available in this browser.',error); }
  }
  function playNotificationSound(){
    if(!notificationSoundEnabled) return;
    unlockNotificationAudio();
    const ctx=notificationAudioContext;
    if(!ctx) return;
    const play=()=>{
      try{
        const start=ctx.currentTime+0.015;
        [880,1174].forEach((frequency,index)=>{
          const osc=ctx.createOscillator(),gain=ctx.createGain(),t=start+index*0.16;
          osc.type='sine';osc.frequency.setValueAtTime(frequency,t);
          gain.gain.setValueAtTime(0.0001,t);gain.gain.exponentialRampToValueAtTime(0.13,t+0.025);gain.gain.exponentialRampToValueAtTime(0.0001,t+0.13);
          osc.connect(gain);gain.connect(ctx.destination);osc.start(t);osc.stop(t+0.14);
        });
      }catch(error){ console.debug('[BIS] Could not play notification sound.',error); }
    };
    if(ctx.state==='suspended') ctx.resume().then(play).catch(()=>{}); else play();
  }
  function startNotificationMonitor(){
    if(remoteMonitorStarted||!firebaseEnabled()) return;
    remoteMonitorStarted=true;
    window.BIS_FIREBASE_DB.ref('portalData').on('value',snapshot=>{
      const remote=snapshot.val()||{};
      const counts={requests:Array.isArray(remote.requests)?remote.requests.length:Object.keys(remote.requests||{}).length,
        concerns:Array.isArray(remote.concerns)?remote.concerns.length:Object.keys(remote.concerns||{}).length};
      if(!previousRemoteCounts){previousRemoteCounts=counts;return;}
      const newRequests=Math.max(0,counts.requests-previousRemoteCounts.requests);
      const newConcerns=Math.max(0,counts.concerns-previousRemoteCounts.concerns);
      previousRemoteCounts=counts;
      if(newRequests||newConcerns){
        playNotificationSound();
        const parts=[];
        if(newRequests)parts.push(`${newRequests} new service request${newRequests===1?'':'s'}`);
        if(newConcerns)parts.push(`${newConcerns} new community concern${newConcerns===1?'':'s'}`);
        toast(`${parts.join(' and ')} received.`, 'success');
        if('Notification' in window&&Notification.permission==='granted'){
          try{new Notification('Barangay Sto. Niño',{body:parts.join(' and ')+'. Open the administrator portal to review.'});}catch{}
        }
      }
    },error=>console.warn('[BIS] Live notification monitor could not read data.',error));
  }
  function bindSoundControls(){
    const state=document.getElementById('soundState'),toggle=document.getElementById('soundToggleBtn');
    const update=()=>{if(state)state.textContent=notificationSoundEnabled?'Sound alerts are ON':'Sound alerts are OFF';if(toggle)toggle.textContent=notificationSoundEnabled?'Turn sound off':'Turn sound on';};
    update();
    toggle?.addEventListener('click',()=>{notificationSoundEnabled=!notificationSoundEnabled;storageSet('sto_nino_notification_sound',notificationSoundEnabled?'on':'off');if(notificationSoundEnabled)unlockNotificationAudio();update();toast(notificationSoundEnabled?'Sound alerts enabled on this device.':'Sound alerts disabled on this device.');});
    document.getElementById('testSoundBtn')?.addEventListener('click',()=>{if(!notificationSoundEnabled){notificationSoundEnabled=true;storageSet('sto_nino_notification_sound','on');update();}unlockNotificationAudio();playNotificationSound();});
    document.getElementById('enableBrowserNoticeBtn')?.addEventListener('click',async()=>{
      if(!('Notification' in window)){toast('Browser notifications are not supported here.','error');return;}
      try{const permission=await Notification.requestPermission();toast(permission==='granted'?'Browser notifications enabled.':'Browser notification permission was not granted.',permission==='granted'?'success':'error');}
      catch{toast('Could not request browser notification permission.','error');}
    });
  }
  function queueFirebaseSave(data){
    if(!firebaseEnabled()) return;
    clearTimeout(firebaseWriteTimer);
    firebaseWriteTimer=setTimeout(async()=>{
      try {
        await window.BIS_FIREBASE_DB.ref('portalData').set(firebasePayload(data));
        window.dispatchEvent(new CustomEvent('bis:firebase-saved'));
      }catch(error){
        console.warn('[BIS] Firebase save failed; local data remains available.',error);
        window.dispatchEvent(new CustomEvent('bis:firebase-error',{detail:error}));
      }
    },250);
  }
  async function syncFromFirebase(){
    if(!firebaseEnabled()) return false;
    try{
      const snapshot=await window.BIS_FIREBASE_DB.ref('portalData').once('value');
      const remote=snapshot.val();
      if(!remote || typeof remote!=='object'){
        queueFirebaseSave(load());
        return false;
      }
      const local=load();
      const merged={...local,...remote,settings:{...local.settings,...(remote.settings||{})},admin:local.admin};
      delete merged.settings.emailjs;
      if(/status updates and approval notices|status notifications/i.test(String(merged.settings.requestIntro||''))) merged.settings.requestIntro=seed.settings.requestIntro;
      if(Array.isArray(merged.settings.faqs)){
        merged.settings.faqs=merged.settings.faqs.map(item=>{
          const question=String(item?.q||'').trim().toLowerCase(),answer=String(item?.a||'');
          if(question==='will i receive an email?') return clone(seed.settings.faqs[2]);
          if(question==='how do i request a document?'&&/send status notifications/i.test(answer)) return clone(seed.settings.faqs[0]);
          return item;
        });
      }
      storageSet(KEY,JSON.stringify(merged));
      return true;
    }catch(error){
      console.warn('[BIS] Firebase read failed; continuing with local data.',error);
      return false;
    }
  }
  function load(){
    try {
      const current = storageGet(KEY);
      if(current) return JSON.parse(current);
      const legacy = storageGet(LEGACY_KEY);
      if(legacy){
        const migrated = JSON.parse(legacy);
        storageSet(KEY, JSON.stringify(migrated));
        return migrated;
      }
      return clone(seed);
    } catch { return clone(seed); }
  }
  function save(data){
    const ok=storageSet(KEY, JSON.stringify(data));
    if(!ok){
      toast('Unable to save changes. Browser storage may be full. Remove a large uploaded image and try again.','error');
      return false;
    }
    queueFirebaseSave(data);
    return true;
  }
  function db(){
    const d = load();
    d.settings ||= clone(seed.settings);
    // Remove settings left by the retired server-side email feature.
    delete d.settings.emailjs;
    d.settings.faqs = Array.isArray(d.settings.faqs) ? d.settings.faqs : clone(seed.settings.faqs);
    d.services = Array.isArray(d.services) ? d.services : clone(seed.services);
    d.officials = Array.isArray(d.officials) ? d.officials : clone(seed.officials);
    d.announcements = Array.isArray(d.announcements) ? d.announcements : [];
    d.emergency = Array.isArray(d.emergency) ? d.emergency : clone(seed.emergency);
    d.requests = Array.isArray(d.requests) ? d.requests : [];
    d.concerns = Array.isArray(d.concerns) ? d.concerns : [];
    d.audit = Array.isArray(d.audit) ? d.audit : [];
    d.admin ||= {};
    d.admin.username = DEFAULT_USER;
    // Never persist a password or password hash in portal data.
    delete d.admin.password;
    delete d.admin.passwordHash;
    return d;
  }
  function currentAdminName(){
    try{const raw=sessionStorage.getItem(SESSION);const session=raw?JSON.parse(raw):null;return session?.username||DEFAULT_USER;}catch{return DEFAULT_USER;}
  }
  function log(action,details){ const d=db(); d.audit.unshift({id:uid('LOG'),action,details,created_at:now(),user:currentAdminName()}); d.audit=d.audit.slice(0,300); save(d); }
  function toast(message,type='success'){ const box=document.getElementById('toast'); if(!box)return; box.className=`toast show ${type}`; box.textContent=message; clearTimeout(window.__toast); window.__toast=setTimeout(()=>box.classList.remove('show'),4200); }
  function openModal(id){ const el=document.getElementById(id); if(!el)return; lastModalId=id; el.classList.add('open'); document.body.classList.add('modal-open'); el.setAttribute('aria-hidden','false'); const card=el.querySelector('.modal-card'); if(card)card.scrollTop=0; setTimeout(()=>{const first=el.querySelector('input,select,textarea,button:not(.close)'); first?.focus();},80); }
  function closeModal(id){ const el=document.getElementById(id); if(!el)return; el.classList.remove('open'); el.setAttribute('aria-hidden','true'); const other=[...document.querySelectorAll('.modal.open')].filter(x=>x!==el); if(!other.length)document.body.classList.remove('modal-open'); }
  function fmt(s){ try{return new Date(s).toLocaleString('en-PH',{year:'numeric',month:'short',day:'numeric',hour:'numeric',minute:'2-digit'});}catch{return s;} }
  function officialAvatar(o,extraClass=''){
    const initials=String(o?.name||'').replace('Hon. ','').split(' ').map(x=>x[0]).filter(Boolean).slice(0,2).join('').toUpperCase();
    if(o?.photo) return `<div class="official-avatar photo-avatar ${extraClass}"><img src="${esc(o.photo)}" alt="${esc(o.name||'Official')} profile photo" loading="lazy"></div>`;
    return `<div class="official-avatar ${extraClass}">${esc(initials)}</div>`;
  }
  function initialsForName(name){return String(name||'').replace('Hon. ','').split(' ').map(x=>x[0]).filter(Boolean).slice(0,2).join('').toUpperCase();}
  function setOfficialPhotoPreview(photo,name=''){
    const img=document.getElementById('officialPhotoPreview'),fallback=document.getElementById('officialPhotoInitials'),hidden=document.getElementById('officialPhotoValue');
    if(hidden)hidden.value=photo||'';
    if(img){img.src=photo||'';img.hidden=!photo;}
    if(fallback){fallback.textContent=initialsForName(name)||'PHOTO';fallback.hidden=!!photo;}
  }
  function compressOfficialPhoto(file){
    return new Promise((resolve,reject)=>{
      if(!file||!/^image\/(jpeg|png|webp)$/i.test(file.type)){reject(new Error('Choose a JPG, PNG, or WebP image.'));return;}
      if(file.size>8*1024*1024){reject(new Error('The original photo must be smaller than 8 MB.'));return;}
      const reader=new FileReader();
      reader.onerror=()=>reject(new Error('Could not read that picture.'));
      reader.onload=()=>{
        const image=new Image();
        image.onerror=()=>reject(new Error('That image could not be opened.'));
        image.onload=()=>{
          try{
            const size=400,canvas=document.createElement('canvas');canvas.width=size;canvas.height=size;
            const ctx=canvas.getContext('2d');if(!ctx)throw new Error('Image editing is not supported in this browser.');
            const side=Math.min(image.width,image.height),sx=(image.width-side)/2,sy=(image.height-side)/2;
            ctx.fillStyle='#ffffff';ctx.fillRect(0,0,size,size);ctx.drawImage(image,sx,sy,side,side,0,0,size,size);
            let result=canvas.toDataURL('image/jpeg',0.78);
            for(const quality of [0.68,0.58,0.48]){if(result.length<=145000)break;result=canvas.toDataURL('image/jpeg',quality);}
            if(result.length>175000)throw new Error('Photo is still too large after compression. Try another picture.');
            resolve(result);
          }catch(error){reject(error);}
        };
        image.src=String(reader.result||'');
      };
      reader.readAsDataURL(file);
    });
  }
  function scrollReveal(){
    const els=document.querySelectorAll('.reveal:not(.revealed)');
    if(!els.length) return;
    if(window.__revealObserver) window.__revealObserver.disconnect();
    if(!('IntersectionObserver' in window)){ els.forEach(el=>el.classList.add('revealed')); return; }
    const io = new IntersectionObserver(entries=>entries.forEach(e=>{if(e.isIntersecting){e.target.classList.add('revealed');io.unobserve(e.target)}}),{threshold:.08});
    window.__revealObserver=io; els.forEach(el=>io.observe(el));
  }

  function publicRender(){
    const d=db(),s=d.settings;
    document.title=`${s.siteName} | ${s.city}`;
    const set=(id,val)=>{const e=document.getElementById(id);if(e)e.textContent=val;};
    const setHtml=(id,html)=>{const e=document.getElementById(id);if(e)e.innerHTML=html;};
    document.querySelectorAll('[data-site-name]').forEach(e=>e.textContent=s.siteName);
    document.querySelectorAll('[data-city]').forEach(e=>e.textContent=s.city);
    document.querySelectorAll('[data-phone]').forEach(e=>{e.textContent=s.phone;e.setAttribute('href',`tel:${s.phone.replace(/\D/g,'')}`)});
    document.querySelectorAll('[data-email]').forEach(e=>{e.textContent=s.email||'Not published';if(s.email)e.setAttribute('href',`mailto:${s.email}`);else e.removeAttribute('href')});
    document.querySelectorAll('[data-address]').forEach(e=>e.textContent=s.address);
    document.querySelectorAll('[data-website]').forEach(e=>{e.textContent=s.website||'Not published';if(s.website)e.setAttribute('href',/^https?:/i.test(s.website)?s.website:`https://${s.website}`);else e.removeAttribute('href')});
    const logo=document.getElementById('mainLogo'); if(logo)logo.src=s.logo; const heroLogo=document.getElementById('heroLogo'); if(heroLogo)heroLogo.src=s.logo;
    const leader=d.officials.find(o=>/punong barangay/i.test(o.position)) || d.officials[0];
    document.querySelectorAll('[data-punong]').forEach(e=>e.textContent=leader?.name||'');
    const heroBadge=document.getElementById('heroBadge');if(heroBadge)heroBadge.textContent=s.badge;
    const heroTitle=document.getElementById('heroTitle'); if(heroTitle) heroTitle.textContent=s.heroTitle;set('heroText',s.heroText);set('aboutTitle',s.aboutTitle);set('aboutText',s.aboutText);set('requestIntroText',s.requestIntro);set('footerText',s.footerText);set('officeHours',s.officeHours);
    const services = d.services.filter(x=>x.active!==false);
    set('serviceCount',services.length);
    setHtml('serviceGrid',services.map((x,i)=>`<article class="service-card reveal"><div class="service-number">${String(i+1).padStart(2,'0')}</div><div class="service-label">${esc(x.label)}</div><h3>${esc(x.name)}</h3><p>${esc(x.description)}</p><div class="service-meta"><span>⏱ ${esc(x.turnaround)}</span><span>₱ ${esc(x.fee)}</span></div><button class="btn small-btn" onclick="BIS.startServiceRequest('${esc(x.id)}')">Request Service <span>→</span></button></article>`).join(''));
    setHtml('announcementGrid', d.announcements.length ? d.announcements.slice().sort((a,b)=>b.created_at.localeCompare(a.created_at)).map(a=>`<article class="announcement-card reveal"><div class="announcement-date">${esc(fmt(a.created_at))}</div><h3>${esc(a.title)}</h3><p>${esc(a.content)}</p><div class="announcement-by">Posted by ${esc(a.posted_by||'Barangay Administration')}</div></article>`).join('') : `<div class="empty-state reveal"><div class="empty-icon">◌</div><h3>No announcements yet</h3><p>Important barangay notices will appear here.</p></div>`);
    setHtml('emergencyGrid',d.emergency.slice().sort((a,b)=>Number(a.order)-Number(b.order)).map(e=>`<article class="emergency-card reveal"><div class="emergency-icon">☎</div><div><h3>${esc(e.name)}</h3><a href="tel:${esc(e.phone.replace(/\D/g,''))}">${esc(e.phone)}</a><p>${esc(e.description)}</p></div></article>`).join(''));
    setHtml('officialGrid',d.officials.map(o=>`<article class="official-card reveal">${officialAvatar(o)}<div><span>${esc(o.position)}</span><h3>${esc(o.name)}</h3><p>${esc(o.group)}</p></div></article>`).join(''));
    const org=document.getElementById('orgChart');if(org)org.src=s.orgChart;
    const counts={requests:d.requests.length,ann:d.announcements.length,services:services.length,concerns:d.concerns.length};
    Object.entries(counts).forEach(([k,v])=>document.querySelectorAll(`[data-count="${k}"]`).forEach(e=>e.textContent=v));
    setHtml('faqGrid',(s.faqs||[]).filter(x=>x?.q&&x?.a).map((x,i)=>`<details class="faq reveal"><summary>${i+1}. ${esc(x.q)}</summary><p>${esc(x.a)}</p></details>`).join('') || `<div class="empty-state reveal"><div class="empty-icon">?</div><h3>No FAQs published</h3><p>The administrator can add frequently asked questions from Website Content.</p></div>`);
    scrollReveal();
  }

  function serviceById(id){return db().services.find(x=>x.id===id);}
  function populateRequestServices(){const sel=document.getElementById('reqService');if(!sel)return;sel.innerHTML=db().services.filter(x=>x.active!==false).map(x=>`<option value="${esc(x.id)}">${esc(x.name)}</option>`).join(''); if(!sel.value&&sel.options.length)sel.selectedIndex=0; updateSelectedService();}
  function startServiceRequest(id){
    const service=serviceById(id),form=document.getElementById('requestForm'); if(!service||!form)return;
    const sel=document.getElementById('reqService');
    sel.innerHTML=db().services.filter(x=>x.active!==false).map(x=>`<option value="${esc(x.id)}">${esc(x.name)}</option>`).join(''); sel.value=id;
    document.getElementById('selectedService').textContent=service.name; document.getElementById('selectedServiceHelp').textContent=service.description;
    openModal('requestModal'); setTimeout(()=>document.getElementById('reqName')?.focus(),120);
  }
  function updateSelectedService(){ const sel=document.getElementById('reqService'); if(!sel)return; const x=serviceById(sel.value); const title=document.getElementById('selectedService'),help=document.getElementById('selectedServiceHelp'); if(!title||!help)return; if(x){title.textContent=x.name;help.textContent=x.description;}else{title.textContent='Select a service';help.textContent='Your request will be reviewed by the barangay administrator.';} }
  async function submitRequest(ev){
    ev.preventDefault();
    if(formSubmissionLock)return;
    const form=ev.target;
    if(!form.reportValidity()){ form.querySelector(':invalid')?.focus(); toast('Please complete the highlighted required fields.','error'); return; }
    const d=db(),f=new FormData(form);
    const service=serviceById(f.get('service'));
    if(!service || service.active===false){toast('That service is no longer available. Please choose another service.','error');populateRequestServices();return;}
    const name=normalizeText(f.get('name')), email=normalizeText(f.get('email')).toLowerCase(), phone=normalizePhone(f.get('phone')), purpose=normalizeText(f.get('purpose')), details=normalizeText(f.get('details'));
    if(name.length<2||purpose.length<3){toast('Please enter a valid name and purpose.','error');return;}
    if(!EMAIL_RE.test(email)){toast('Please enter a valid email address.','error');return;}
    if(!validPhone(phone)){toast('Please enter a valid contact number.','error');return;}
    formSubmissionLock=true; setFormBusy(form,true);
    try{
      const ref=uid('REQ');
      const r={id:ref,reference_no:ref,requester_name:name,requester_email:email,requester_phone:phone,request_type:service.name,purpose,details,status:'Submitted',admin_note:'',created_at:now(),updated_at:now()};
      d.requests.unshift(r);
      if(!save(d)){toast('We could not save your request. Please try again.','error');return;}
      log('SUBMIT_REQUEST',`${service.name} · ${ref}`);
      form.reset();
      document.getElementById('selectedService').textContent='Select a service';
      document.getElementById('selectedServiceHelp').textContent='Your request will be reviewed by the barangay administrator.';
      closeModal('requestModal');
      showConfirmation({type:'request',reference:ref,email});
      publicRender();
    } finally { formSubmissionLock=false; setFormBusy(form,false); }
  }

  async function submitConcern(ev){
    ev.preventDefault();
    if(formSubmissionLock)return;
    const form=ev.target;
    if(!form.reportValidity()){ form.querySelector(':invalid')?.focus(); toast('Please complete the highlighted required fields.','error'); return; }
    const d=db(),f=new FormData(form);
    const name=normalizeText(f.get('name')), email=normalizeText(f.get('email')).toLowerCase(), phone=normalizePhone(f.get('phone')), category=normalizeText(f.get('category')), subject=normalizeText(f.get('subject')), location=normalizeText(f.get('location')), message=normalizeText(f.get('message'));
    if(name.length<2||subject.length<3||location.length<3||message.length<20){toast('Please provide complete and specific concern details.','error');return;}
    if(!EMAIL_RE.test(email)){toast('Please enter a valid email address.','error');return;}
    if(phone && !validPhone(phone)){toast('Please enter a valid contact number or leave it blank.','error');return;}
    formSubmissionLock=true; setFormBusy(form,true);
    try{
      const ref=uid('CON');
      const c={id:ref,reference_no:ref,requester_name:name,requester_email:email,requester_phone:phone,category,subject,location,message,status:'Open',response:'',created_at:now(),updated_at:now()};
      d.concerns.unshift(c);
      if(!save(d)){toast('We could not save your concern. Please try again.','error');return;}
      log('SUBMIT_CONCERN',`${category} · ${subject} · ${ref}`);
      form.reset();
      closeModal('concernModal');
      showConfirmation({type:'concern',reference:ref,email});
      publicRender();
    } finally { formSubmissionLock=false; setFormBusy(form,false); }
  }

  function setSession(username=DEFAULT_USER){
    sessionStorage.setItem(SESSION,JSON.stringify({authenticated:true,username,expires:Date.now()+SESSION_TTL}));
  }
  function isAdmin(){
    try{
      const raw=sessionStorage.getItem(SESSION),session=raw?JSON.parse(raw):null;
      if(!session?.authenticated||session.username!==ADMIN_USERNAME||Number(session.expires)<Date.now()){
        sessionStorage.removeItem(SESSION);
        return false;
      }
      return true;
    }catch{return false;}
  }
  async function login(ev){
    ev.preventDefault();
    const username=String(document.getElementById('adminUser')?.value||'').trim().toLowerCase();
    const password=String(document.getElementById('adminPass')?.value||'');
    const error=document.getElementById('loginError');
    if(error){error.textContent='Incorrect username or password.';error.classList.remove('show');}
    if(!username||!password)return;
    const form=document.getElementById('loginForm'),submit=form?.querySelector('button[type="submit"]');
    if(submit){submit.disabled=true;submit.dataset.originalText=submit.textContent;submit.textContent='Signing in…';}
    try{
      if(username!==ADMIN_USERNAME||password!==ADMIN_PASSWORD){
        if(error){error.textContent='Incorrect username or password. Please try again.';error.classList.add('show');}
        return;
      }
      setSession(username);
      if(!isAdmin())throw new Error('Session storage is unavailable. Please enable browser storage and try again.');
      await syncFromFirebase();
      showAdmin();
    }catch(loginError){
      sessionStorage.removeItem(SESSION);
      console.warn('[BIS] Admin sign-in failed.',loginError);
      if(error){error.textContent=loginError?.message||'Unable to start the administrator session. Please reload and try again.';error.classList.add('show');}
    }finally{if(submit){submit.disabled=false;submit.textContent=submit.dataset.originalText||'Sign In to Admin Portal →';}}
  }
  function logout(){
    sessionStorage.removeItem(SESSION);
    if(window.__revealObserver)window.__revealObserver.disconnect();
    location.href='admin.html';
  }


  function adminShell(page,title,content){
    document.title=`Admin · ${title}`;const view=document.getElementById('adminApp'); if(!view)return;
    const d=db(); view.innerHTML=`<div class="admin-layout"><aside class="admin-sidebar" id="side"><div class="admin-brand"><img src="${esc(d.settings.logo)}" alt="Barangay logo"><div><strong>Barangay Sto. Niño</strong><small>Administrator Portal</small></div></div><nav>${[['dashboard','⌂','Dashboard'],['requests','▣','Service Requests'],['concerns','⚑','Community Concerns'],['content','✦','Website Content'],['announcements','◉','Announcements'],['services','◈','Services'],['officials','♟','Officials'],['emergency','☎','Emergency'],['qrcode','▦','Website QR Code'],['security','⚿','Admin Security'],['audit','◌','Audit Logs']].map(x=>`<button class="admin-nav ${page===x[0]?'active':''}" data-page="${x[0]}"><span>${x[1]}</span>${x[2]}</button>`).join('')}</nav><div class="admin-side-bottom"><div class="admin-user"><strong>${esc(currentAdminName()||d.admin.username)}</strong><span>Administrator</span></div><button class="logout-btn" onclick="BIS.logout()">Sign out</button><a href="index.html" class="back-site">↗ Open public website</a></div></aside><main class="admin-main"><header class="admin-top"><div class="top-left"><button class="mobile-side" onclick="document.getElementById('side').classList.toggle('open')">☰</button><div><span class="eyebrow-mini">ADMINISTRATOR</span><h1>${esc(title)}</h1></div></div><div class="admin-date">${esc(new Date().toLocaleDateString('en-PH',{weekday:'short',month:'short',day:'numeric',year:'numeric'}))}</div></header><section class="admin-content">${content}</section></main></div>`;
    view.querySelectorAll('[data-page]').forEach(b=>b.onclick=()=>{showAdminPage(b.dataset.page);document.getElementById('side')?.classList.remove('open');});
  }

  function statCard(label,n,icon){return `<div class="admin-stat"><span class="stat-icon">${icon}</span><div><small>${esc(label)}</small><strong>${n}</strong></div></div>`;}
  function dashboard(){const d=db(),pending=d.requests.filter(r=>['Submitted','Processing'].includes(r.status)).length,approved=d.requests.filter(r=>r.status==='Approved').length,open=d.concerns.filter(c=>c.status!=='Resolved').length;return `<div class="admin-stats">${statCard('Total Requests',d.requests.length,'▣')}${statCard('For Review',pending,'◷')}${statCard('Approved',approved,'✓')}${statCard('Open Concerns',open,'⚑')}</div><article class="admin-card sound-settings"><div><span class="eyebrow-mini">LIVE ALERTS</span><h3>Incoming request notifications</h3><p id="soundState">Sound alerts are loading…</p><small>Sound plays when this admin session detects newly submitted service requests or community concerns.</small></div><div class="sound-actions"><button class="btn-admin" type="button" id="soundToggleBtn">Turn sound off</button><button class="btn-admin secondary" type="button" id="testSoundBtn">Test sound</button><button class="link-btn" type="button" id="enableBrowserNoticeBtn">Enable browser notifications</button></div></article><div class="admin-grid-2"><article class="admin-card hero-admin"><div><span class="eyebrow-mini">CONTROL CENTER</span><h2>Manage the entire public website from one place.</h2><p>Edit homepage text, services, officials, emergency numbers, announcements, and incoming requests without touching the code.</p><button class="btn-admin" onclick="BIS.showAdminPage('content')">Edit Website Content →</button></div><div class="pulse-orb">✦</div></article><article class="admin-card"><div class="admin-card-head"><div><span class="eyebrow-mini">RECENT REQUESTS</span><h2>Latest activity</h2></div><button class="link-btn" onclick="BIS.showAdminPage('requests')">View all</button></div>${d.requests.slice(0,5).map(r=>`<div class="activity-item"><div><strong>${esc(r.reference_no)}</strong><span>${esc(r.requester_name)} · ${esc(r.request_type)}</span></div><em class="badge ${cssStatus(r.status)}">${esc(r.status)}</em></div>`).join('')||'<div class="empty-admin">No requests yet.</div>'}</article></div>`;}

  function requestsPage(){const d=db();return `<div class="page-intro"><div><span class="eyebrow-mini">PUBLIC SERVICE</span><h2>Service Requests</h2><p>Review submitted documents, requester details, administrative notes, and request statuses.</p></div><div class="admin-page-count">${d.requests.length} request${d.requests.length===1?'':'s'}</div></div><div class="admin-card table-card"><div class="toolbar"><input id="requestSearch" placeholder="Search reference, requester, email, service, or purpose…"><select id="requestFilter"><option value="">All statuses</option><option>Submitted</option><option>Processing</option><option>Approved</option><option>Ready for Pickup</option><option>Released</option><option>Rejected</option></select></div><div class="table-wrap"><table class="admin-table"><thead><tr><th>Request</th><th>Requester</th><th>Service / Purpose</th><th>Status</th><th>Update</th></tr></thead><tbody id="requestRows">${renderRequestRows(d.requests)}</tbody></table></div></div>`;}
  function renderRequestRows(items){return items.length?items.map(r=>`<tr data-search="${esc((r.reference_no+' '+r.requester_name+' '+r.requester_email+' '+r.request_type+' '+r.purpose+' '+(r.details||'')).toLowerCase())}"><td><strong>${esc(r.reference_no)}</strong><small>${esc(fmt(r.created_at))}</small></td><td><strong>${esc(r.requester_name)}</strong><small>${esc(r.requester_email)}<br>${esc(r.requester_phone)}</small></td><td><strong>${esc(r.request_type)}</strong><small>${esc(r.purpose)}${r.details?`<br><b>Details:</b> ${esc(r.details)}`:''}</small></td><td><span class="badge ${cssStatus(r.status)}">${esc(r.status)}</span><small>${esc(r.admin_note||'')}</small></td><td><div class="inline-edit"><select data-r-status="${r.id}"><option>Submitted</option><option>Processing</option><option>Approved</option><option>Ready for Pickup</option><option>Released</option><option>Rejected</option></select><input data-r-note="${r.id}" maxlength="600" value="${esc(r.admin_note||'')}" placeholder="Admin note"><button class="btn-admin compact" data-save-r="${r.id}">Save</button></div></td></tr>`).join(''):'<tr><td colspan="5"><div class="empty-admin">No service requests found.</div></td></tr>';}
  function bindRequests(){document.querySelectorAll('[data-r-status]').forEach(s=>{const r=db().requests.find(x=>x.id===s.dataset.rStatus);if(r)s.value=r.status;});document.querySelectorAll('[data-save-r]').forEach(b=>b.onclick=async()=>{const d=db(),r=d.requests.find(x=>x.id===b.dataset.saveR);if(!r)return;const old=r.status,newStatus=document.querySelector(`[data-r-status="${r.id}"]`)?.value||r.status,note=normalizeText(document.querySelector(`[data-r-note="${r.id}"]`)?.value);if(old===newStatus&&String(r.admin_note||'')===note){toast('No changes to save.');return;}r.status=newStatus;r.admin_note=note;r.updated_at=now();if(!save(d)){toast('Unable to save the request update.','error');return;}log('UPDATE_REQUEST',`${r.reference_no}: ${old} → ${newStatus}`);b.disabled=true;b.textContent='Saving…';showAdminPage('requests');toast('Request status saved.');});document.getElementById('requestSearch')?.addEventListener('input',filterRequests);document.getElementById('requestFilter')?.addEventListener('change',filterRequests);}
  function filterRequests(){const search=document.getElementById('requestSearch'),select=document.getElementById('requestFilter'); if(!search||!select)return; const q=(search.value||'').toLowerCase(),f=select.value;document.querySelectorAll('#requestRows tr[data-search]').forEach(tr=>{const okq=!q||tr.dataset.search.includes(q),status=tr.querySelector('.badge')?.textContent||'';tr.style.display=okq&&(!f||status===f)?'':'none';});}

  function concernsPage(){const d=db();return `<div class="page-intro"><div><span class="eyebrow-mini">COMMUNITY VOICE</span><h2>Community Concerns</h2><p>Review reports, locations, contact details, and staff responses.</p></div><div class="admin-page-count">${d.concerns.length} report${d.concerns.length===1?'':'s'}</div></div><div class="admin-card table-card"><div class="toolbar"><input id="concernSearch" placeholder="Search reference, subject, category, location, or resident…"><select id="concernFilter"><option value="">All statuses</option><option>Open</option><option>In Review</option><option>Resolved</option></select></div><div class="cards-stack concern-stack" id="concernRows">${d.concerns.map(c=>`<article class="admin-card concern-card" data-concern-search="${esc([c.reference_no,c.requester_name,c.subject,c.category,c.location].join(' ').toLowerCase())}"><div class="concern-head"><div><span class="eyebrow-mini">${esc(c.reference_no||c.id)} · ${esc(fmt(c.created_at))}</span><h3>${esc(c.subject)}</h3><div class="concern-meta"><span>${esc(c.category||'Other')}</span><span>📍 ${esc(c.location||'Not provided')}</span></div><p>${esc(c.message)}</p><small>${esc(c.requester_name)} · ${esc(c.requester_email)}${c.requester_phone?` · ${esc(c.requester_phone)}`:''}</small></div><span class="badge ${cssStatus(c.status)} concern-status">${esc(c.status)}</span></div><div class="edit-grid"><label>Status<select data-c-status="${c.id}"><option>Open</option><option>In Review</option><option>Resolved</option></select></label><label>Response<input data-c-response="${c.id}" value="${esc(c.response||'')}" maxlength="600" placeholder="Response for the resident"></label></div><div class="concern-actions"><small>Last updated ${esc(fmt(c.updated_at||c.created_at))}</small><button class="btn-admin compact" data-save-c="${c.id}">Save concern update</button></div></article>`).join('')||'<div class="empty-admin">No community concerns submitted yet.</div>'}</div></div>`;}
  function bindConcerns(){document.querySelectorAll('[data-c-status]').forEach(s=>{const c=db().concerns.find(x=>x.id===s.dataset.cStatus);if(c)s.value=c.status;});document.querySelectorAll('[data-save-c]').forEach(b=>b.onclick=async()=>{const d=db(),c=d.concerns.find(x=>x.id===b.dataset.saveC);if(!c)return;const old=c.status,newStatus=document.querySelector(`[data-c-status="${c.id}"]`)?.value||c.status,response=normalizeText(document.querySelector(`[data-c-response="${c.id}"]`)?.value);const changed=old!==newStatus||response!==String(c.response||'');if(!changed){toast('No changes to save.');return;}c.status=newStatus;c.response=response;c.updated_at=now();if(!save(d)){toast('Unable to save the concern update.','error');return;}log('UPDATE_CONCERN',`${c.reference_no||c.id}: ${old} → ${newStatus}`);b.disabled=true;b.textContent='Saving…';showAdminPage('concerns');toast('Concern update saved.');});document.getElementById('concernSearch')?.addEventListener('input',filterConcerns);document.getElementById('concernFilter')?.addEventListener('change',filterConcerns);}
  function filterConcerns(){const search=document.getElementById('concernSearch'),filter=document.getElementById('concernFilter');if(!search||!filter)return;const q=search.value.trim().toLowerCase(),f=filter.value;document.querySelectorAll('#concernRows .concern-card').forEach(card=>{const matchText=!q||card.dataset.concernSearch.includes(q),status=card.querySelector('.concern-status')?.textContent.trim()||'';card.style.display=matchText&&(!f||status===f)?'':'none';});}

  function contentPage(){const d=db(),s=d.settings;return `<div class="page-intro"><div><span class="eyebrow-mini">EDITOR</span><h2>Website Content</h2><p>Everything shown below is editable and saved to this browser's data store.</p></div></div><form id="contentForm" class="admin-card form-card"><div class="editor-section"><div class="editor-title"><span>01</span><div><h3>Brand & Homepage</h3><p>Core identity and hero content.</p></div></div><div class="form-grid"><label>Barangay Name<input name="siteName" value="${esc(s.siteName)}"></label><label>City / Municipality<input name="city" value="${esc(s.city)}"></label><label class="wide">Hero Badge<input name="badge" value="${esc(s.badge)}"></label><label class="wide">Hero Title<input name="heroTitle" value="${esc(s.heroTitle)}"></label><label class="wide">Hero Description<textarea name="heroText">${esc(s.heroText)}</textarea></label></div></div><div class="editor-section"><div class="editor-title"><span>02</span><div><h3>About the Barangay</h3><p>About text and office information.</p></div></div><div class="form-grid"><label>About Title<input name="aboutTitle" value="${esc(s.aboutTitle)}"></label><label>Office Hours<input name="officeHours" value="${esc(s.officeHours)}"></label><label class="wide">About Text<textarea name="aboutText">${esc(s.aboutText)}</textarea></label><label class="wide">Request Instructions<textarea name="requestIntro">${esc(s.requestIntro)}</textarea></label></div></div><div class="editor-section"><div class="editor-title"><span>03</span><div><h3>Contact & Links</h3><p>Publicly displayed contact information.</p></div></div><div class="form-grid"><label>Address<input name="address" value="${esc(s.address)}"></label><label>Phone<input name="phone" value="${esc(s.phone)}"></label><label>Email<input type="email" name="email" value="${esc(s.email||'')}"></label><label>Website<input name="website" value="${esc(s.website||'')}"></label><label>Facebook URL<input name="facebook" value="${esc(s.facebook||'')}"></label><label class="wide">Footer Text<textarea name="footerText">${esc(s.footerText)}</textarea></label></div></div><div class="editor-section"><div class="editor-title"><span>04</span><div><h3>Branding Images</h3><p>Replace the logo or organizational chart image.</p></div></div><div class="upload-row"><div class="upload-box"><img src="${esc(s.logo)}" alt="Logo"><label>Upload Logo<input type="file" id="logoUpload" accept="image/*"></label></div><div class="upload-box wide-upload"><img src="${esc(s.orgChart)}" alt="Organizational chart"><label>Upload Organizational Chart<input type="file" id="orgUpload" accept="image/*"></label></div></div></div><div class="editor-section"><div class="editor-title"><span>05</span><div><h3>Frequently Asked Questions</h3><p>Edit the questions shown on the public website.</p></div></div><div class="faq-editor-grid">${(s.faqs||[]).slice(0,6).map((f,i)=>`<div class="faq-edit-item"><strong>FAQ ${i+1}</strong><input name="faq_q_${i}" value="${esc(f.q)}" placeholder="Question"><textarea name="faq_a_${i}" placeholder="Answer">${esc(f.a)}</textarea></div>`).join('')}</div></div><button class="btn-admin big" type="submit">Save All Website Content</button></form>`;}
  async function bindContent(){
    document.getElementById('contentForm').onsubmit=async e=>{
      e.preventDefault();
      const btn=e.target.querySelector('button[type="submit"]'); if(btn){btn.disabled=true;btn.textContent='Saving…';}
      try{
        const d=db(),fd=new FormData(e.target),s=d.settings;
        for(const [k,v] of fd.entries()) s[k]=String(v);
        s.faqs=Array.from({length:6},(_,i)=>({q:String(fd.get(`faq_q_${i}`)||'').trim(),a:String(fd.get(`faq_a_${i}`)||'').trim()})).filter(x=>x.q&&x.a);
        const files=[['logoUpload','logo'],['orgUpload','orgChart']];
        for(const [id,key] of files){
          const file=document.getElementById(id)?.files?.[0];
          if(file){ if(file.size>900*1024) throw new Error('Please use an image smaller than 900 KB.'); s[key]=await fileToData(file); }
        }
        if(!save(d)) throw new Error('Browser storage is full.');
        log('UPDATE_CONTENT','Updated public website content'); publicRender(); showAdminPage('content'); toast('Website content saved successfully.');
      }catch(err){toast(err.message||'Unable to save website content.','error');}finally{if(btn){btn.disabled=false;btn.textContent='Save All Website Content';}}
    };
  }
  const fileToData=file=>new Promise((resolve,reject)=>{
    const r=new FileReader(); r.onload=()=>resolve(r.result); r.onerror=()=>reject(new Error('The image could not be read.')); r.readAsDataURL(file);
  });

  function servicesPage(){const d=db();return `<div class="page-intro"><div><span class="eyebrow-mini">SERVICE CATALOG</span><h2>Barangay Services</h2><p>Add, edit, hide, or remove the public online services.</p></div><button class="btn-admin" onclick="BIS.openServiceEditor()">+ Add Service</button></div><div class="service-admin-grid">${d.services.map((s,i)=>`<article class="admin-card service-admin-card"><div class="service-number">${String(i+1).padStart(2,'0')}</div><span class="badge ${s.active!==false?'green':'gray'}">${s.active!==false?'VISIBLE':'HIDDEN'}</span><h3>${esc(s.name)}</h3><p>${esc(s.description)}</p><div class="meta-admin"><span>${esc(s.turnaround)}</span><span>₱ ${esc(s.fee)}</span></div><div class="card-actions"><button class="link-btn" data-edit-service="${s.id}">Edit</button><button class="link-btn danger-text" data-delete-service="${s.id}">Delete</button></div></article>`).join('')}</div>${serviceEditorModal()}`;}
  function serviceEditorModal(){return `<div class="admin-modal" id="serviceEditor"><div class="admin-modal-inner"><button class="modal-x" onclick="BIS.closeModal('serviceEditor')">×</button><span class="eyebrow-mini">SERVICE EDITOR</span><h3 id="serviceModalTitle">Add service</h3><form id="serviceEditorForm"><input type="hidden" name="id"><label>Service Name<input name="name" required></label><label>Description<textarea name="description" required></textarea></label><div class="form-grid"><label>Processing Time<input name="turnaround" required></label><label>Fee / Note<input name="fee" required></label><label>Label<input name="label" required></label><label class="check-field"><input type="checkbox" name="active" checked> Visible on website</label></div><button class="btn-admin big" type="submit">Save Service</button></form></div></div>`;}
  function bindServices(){document.querySelectorAll('[data-edit-service]').forEach(b=>b.onclick=()=>{const s=db().services.find(x=>x.id===b.dataset.editService);const f=document.getElementById('serviceEditorForm');Object.entries(s).forEach(([k,v])=>{const el=f.elements[k];if(el)k==='active'?el.checked=v!==false:el.value=v;});document.getElementById('serviceModalTitle').textContent='Edit service';openModal('serviceEditor');});document.querySelectorAll('[data-delete-service]').forEach(b=>b.onclick=()=>{const d=db();if(confirm('Delete this service from the public catalog?')){d.services=d.services.filter(x=>x.id!==b.dataset.deleteService);save(d);log('DELETE_SERVICE',b.dataset.deleteService);showAdminPage('services');}});document.getElementById('serviceEditorForm').onsubmit=e=>{e.preventDefault();const d=db(),fd=new FormData(e.target);const item={id:fd.get('id')||uid('SVC'),name:fd.get('name').trim(),description:fd.get('description').trim(),turnaround:fd.get('turnaround').trim(),fee:fd.get('fee').trim(),label:fd.get('label').trim(),active:fd.get('active')==='on'};const idx=d.services.findIndex(x=>x.id===item.id);if(idx>=0)d.services[idx]=item;else d.services.push(item);save(d);log('SAVE_SERVICE',item.name);closeModal('serviceEditor');showAdminPage('services');};}

  function officialsPage(){const d=db();return `<div class="page-intro"><div><span class="eyebrow-mini">LEADERSHIP</span><h2>Barangay Officials</h2><p>Manage official details and the profile photos shown on the public website.</p></div><button class="btn-admin" onclick="BIS.openOfficialEditor()">+ Add Official</button></div><div class="official-admin-grid">${d.officials.map(o=>`<article class="admin-card official-admin">${officialAvatar(o)}<div class="official-copy"><span>${esc(o.position)}</span><h3>${esc(o.name)}</h3><p>${esc(o.group)}</p></div><div class="card-actions"><button class="link-btn" data-edit-official="${o.id}">Edit</button><button class="link-btn danger-text" data-delete-official="${o.id}">Delete</button></div></article>`).join('')}</div>${officialEditorModal()}`;}
  function officialEditorModal(){return `<div class="admin-modal" id="officialEditor"><div class="admin-modal-inner"><button class="modal-x" onclick="BIS.closeModal('officialEditor')">×</button><span class="eyebrow-mini">OFFICIAL EDITOR</span><h3 id="officialModalTitle">Add official</h3><form id="officialEditorForm"><input type="hidden" name="id"><input type="hidden" id="officialPhotoValue" name="photo"><div class="official-photo-editor"><div class="official-photo-preview"><img id="officialPhotoPreview" alt="Selected profile photo preview" hidden><span id="officialPhotoInitials">PHOTO</span></div><div class="official-photo-controls"><label class="photo-pick-label" for="officialPhotoInput">Choose profile picture</label><input id="officialPhotoInput" type="file" accept="image/jpeg,image/png,image/webp"><button class="link-btn danger-text" type="button" id="removeOfficialPhotoBtn">Remove picture</button><small>JPG, PNG, or WebP. Images are center-cropped and compressed to save space.</small></div></div><label>Full Name<input name="name" id="officialNameInput" required></label><label>Position / Committee<input name="position" required></label><label>Group<input name="group" required></label><button class="btn-admin big" type="submit">Save Official</button></form></div></div>`;}
  function bindOfficials(){
    const form=document.getElementById('officialEditorForm'),fileInput=document.getElementById('officialPhotoInput'),nameInput=document.getElementById('officialNameInput');
    document.querySelectorAll('[data-edit-official]').forEach(b=>b.onclick=()=>{
      const o=db().officials.find(x=>x.id===b.dataset.editOfficial);if(!o)return;
      form.reset();form.elements.id.value=o.id;form.elements.name.value=o.name;form.elements.position.value=o.position;form.elements.group.value=o.group;
      setOfficialPhotoPreview(o.photo||'',o.name);document.getElementById('officialModalTitle').textContent='Edit official';openModal('officialEditor');
    });
    document.querySelectorAll('[data-delete-official]').forEach(b=>b.onclick=()=>{if(confirm('Delete this official?')){const d=db();d.officials=d.officials.filter(x=>x.id!==b.dataset.deleteOfficial);save(d);log('DELETE_OFFICIAL',b.dataset.deleteOfficial);showAdminPage('officials');}});
    nameInput?.addEventListener('input',()=>{const fallback=document.getElementById('officialPhotoInitials');if(fallback&&!document.getElementById('officialPhotoValue')?.value)fallback.textContent=initialsForName(nameInput.value)||'PHOTO';});
    fileInput?.addEventListener('change',async()=>{const file=fileInput.files?.[0];if(!file)return;const choose=document.querySelector('.photo-pick-label');if(choose){choose.textContent='Processing photo…';choose.setAttribute('aria-busy','true');}
      try{const photo=await compressOfficialPhoto(file);setOfficialPhotoPreview(photo,nameInput?.value||'');toast('Profile picture ready. Save the official to publish it.');}
      catch(error){toast(error.message||'Could not process that photo.','error');fileInput.value='';}
      finally{if(choose){choose.textContent='Choose profile picture';choose.removeAttribute('aria-busy');}}
    });
    document.getElementById('removeOfficialPhotoBtn')?.addEventListener('click',()=>{setOfficialPhotoPreview('',nameInput?.value||'');if(fileInput)fileInput.value='';});
    form.onsubmit=e=>{e.preventDefault();const d=db(),fd=new FormData(e.target),item={id:fd.get('id')||uid('OFF'),name:fd.get('name').trim(),position:fd.get('position').trim(),group:fd.get('group').trim(),photo:String(fd.get('photo')||'')},i=d.officials.findIndex(x=>x.id===item.id);if(i>=0)d.officials[i]=item;else d.officials.push(item);if(!save(d))return;log('SAVE_OFFICIAL',item.name);closeModal('officialEditor');showAdminPage('officials');toast('Official details saved.');};
  }

  function emergencyPage(){const d=db();return `<div class="page-intro"><div><span class="eyebrow-mini">EMERGENCY DIRECTORY</span><h2>Emergency Contacts</h2><p>Edit the phone numbers and descriptions residents see on the public site.</p></div><button class="btn-admin" onclick="BIS.openEmergencyEditor()">+ Add Contact</button></div><div class="emergency-admin-grid">${d.emergency.map(e=>`<article class="admin-card emergency-admin"><div class="emergency-icon">☎</div><div><h3>${esc(e.name)}</h3><a href="tel:${esc(e.phone.replace(/\D/g,''))}">${esc(e.phone)}</a><p>${esc(e.description)}</p></div><div class="card-actions"><button class="link-btn" data-edit-emg="${e.id}">Edit</button><button class="link-btn danger-text" data-delete-emg="${e.id}">Delete</button></div></article>`).join('')}</div>${emergencyEditorModal()}`;}
  function emergencyEditorModal(){return `<div class="admin-modal" id="emergencyEditor"><div class="admin-modal-inner"><button class="modal-x" onclick="BIS.closeModal('emergencyEditor')">×</button><span class="eyebrow-mini">EMERGENCY CONTACT</span><h3>Edit emergency contact</h3><form id="emergencyEditorForm"><input type="hidden" name="id"><label>Name<input name="name" required></label><label>Phone<input name="phone" required></label><label>Description<input name="description" required></label><label>Display Order<input name="order" type="number" value="1" required></label><button class="btn-admin big" type="submit">Save Contact</button></form></div></div>`;}
  function bindEmergency(){document.querySelectorAll('[data-edit-emg]').forEach(b=>b.onclick=()=>{const e=db().emergency.find(x=>x.id===b.dataset.editEmg),f=document.getElementById('emergencyEditorForm');if(!e||!f)return;f.elements.id.value=e.id;f.elements.name.value=e.name;f.elements.phone.value=e.phone;f.elements.description.value=e.description;f.elements.order.value=e.order;openModal('emergencyEditor');});document.querySelectorAll('[data-delete-emg]').forEach(b=>b.onclick=()=>{if(confirm('Delete this emergency contact?')){const d=db();d.emergency=d.emergency.filter(x=>x.id!==b.dataset.deleteEmg);save(d);log('DELETE_EMERGENCY',b.dataset.deleteEmg);showAdminPage('emergency');}});document.getElementById('emergencyEditorForm').onsubmit=e=>{e.preventDefault();const d=db(),fd=new FormData(e.target),item={id:fd.get('id')||uid('EMG'),name:fd.get('name').trim(),phone:fd.get('phone').trim(),description:fd.get('description').trim(),order:Number(fd.get('order')||1)},i=d.emergency.findIndex(x=>x.id===item.id);if(i>=0)d.emergency[i]=item;else d.emergency.push(item);save(d);log('SAVE_EMERGENCY',item.name);closeModal('emergencyEditor');showAdminPage('emergency');};}
  function announcementsPage(){const d=db();return `<div class="page-intro"><div><span class="eyebrow-mini">PUBLIC UPDATES</span><h2>Announcements</h2><p>Publish important notices that appear immediately on the public website.</p></div></div><div class="admin-grid-2"><form id="announcementForm" class="admin-card form-card"><div class="editor-title"><span>+</span><div><h3>New announcement</h3><p>Keep residents informed.</p></div></div><label>Title<input name="title" required></label><label>Message<textarea name="content" required></textarea></label><button class="btn-admin" type="submit">Publish Announcement</button></form><div class="admin-card"><div class="admin-card-head"><div><span class="eyebrow-mini">PUBLISHED</span><h2>Recent announcements</h2></div></div>${d.announcements.map(a=>`<div class="announcement-admin"><div><strong>${esc(a.title)}</strong><span>${esc(fmt(a.created_at))}</span><p>${esc(a.content)}</p></div><button class="link-btn danger-text" data-delete-ann="${a.id}">Delete</button></div>`).join('')||'<div class="empty-admin">No announcements yet.</div>'}</div></div>`;}
  function bindAnnouncements(){document.getElementById('announcementForm').onsubmit=e=>{e.preventDefault();const d=db(),f=new FormData(e.target),a={id:uid('ANN'),title:f.get('title').trim(),content:f.get('content').trim(),posted_by:d.admin.username,created_at:now()};d.announcements.unshift(a);save(d);log('ADD_ANNOUNCEMENT',a.title);e.target.reset();showAdminPage('announcements');toast('Announcement published successfully.');};document.querySelectorAll('[data-delete-ann]').forEach(b=>b.onclick=()=>{if(confirm('Delete this announcement?')){const d=db();d.announcements=d.announcements.filter(x=>x.id!==b.dataset.deleteAnn);save(d);log('DELETE_ANNOUNCEMENT',b.dataset.deleteAnn);showAdminPage('announcements');}});}


  function qrPage(){const target=new URL('index.html',window.location.href).href;return `<div class="page-intro"><div><span class="eyebrow-mini">SHARE THE PUBLIC PORTAL</span><h2>Website QR Code</h2><p>Generate and download a QR image that residents can scan to open the public barangay website.</p></div></div><div class="qr-layout"><section class="admin-card qr-card"><div class="editor-title"><span>▦</span><div><h3>Public website QR</h3><p>Use the published HTTPS website URL when printing this QR for public display.</p></div></div><label for="qrTargetUrl">Website URL</label><input id="qrTargetUrl" class="qr-url-input" type="url" value="${esc(target)}" required><div id="qrCanvas" class="qr-canvas" role="img" aria-label="Website QR code"></div><p id="qrMessage" class="qr-message">QR code is being generated…</p><div class="qr-actions"><button id="generateQrBtn" type="button" class="btn-admin secondary">Regenerate QR</button><button id="downloadQrBtn" type="button" class="btn-admin">Download QR as PNG</button></div></section><aside class="admin-card qr-help"><h3>Before you download</h3><p>Open this admin page from your deployed Firebase Hosting address, then confirm the URL begins with <code>https://</code> and points to the public website—not <code>admin.html</code>.</p><p>After downloading, scan the PNG with another phone to verify it opens the correct public page before printing or sharing it.</p><div class="notice-box">QR generation requires an internet connection to load the QR library the first time.</div></aside></div>`;}
  function bindQrPage(){
    const area=document.getElementById('qrCanvas'),urlInput=document.getElementById('qrTargetUrl'),message=document.getElementById('qrMessage');if(!area||!urlInput)return;
    const generate=()=>{const value=String(urlInput.value||'').trim();area.innerHTML='';if(!/^https?:\/\//i.test(value)){message.textContent='Enter a valid website URL first.';return;}if(!window.QRCode){message.textContent='QR library did not load. Check your internet connection and reload this page.';return;}try{new QRCode(area,{text:value,width:260,height:260,colorDark:'#083f31',colorLight:'#ffffff',correctLevel:QRCode.CorrectLevel.H});message.textContent='QR generated for: '+value;}catch(error){message.textContent='Could not generate the QR code. Check the website URL.';}};
    document.getElementById('generateQrBtn')?.addEventListener('click',generate);
    document.getElementById('downloadQrBtn')?.addEventListener('click',()=>{const canvas=area.querySelector('canvas'),img=area.querySelector('img');let data='';try{if(canvas)data=canvas.toDataURL('image/png');else if(img?.src)data=img.src;}catch{}if(!data){toast('Generate the QR code first.','error');return;}const a=document.createElement('a');a.href=data;a.download='barangay-sto-nino-website-qr.png';document.body.appendChild(a);a.click();a.remove();toast('QR code PNG download started.');});
    generate();
  }

  function securityPage(){
    return `<div class="page-intro"><div><span class="eyebrow-mini">ACCESS CONTROL</span><h2>Admin Security</h2><p>Legacy administrator sign-in has been restored.</p></div></div><section class="admin-card narrow-card"><div class="editor-title"><span>✓</span><div><h3>Administrator session</h3><p>${esc(currentAdminName())} · session expires after two hours</p></div></div><p>Sign out when you finish using this device. Access is limited by a browser session and is not server-side authentication.</p><div class="warning-box">The current Realtime Database rules allow public read/write access to <code>/portalData</code> to preserve the existing website and forms. Do not store sensitive resident information until server-side authentication and restrictive database rules are implemented.</div></section>`;
  }
  function auditPage(){const d=db();return `<div class="page-intro"><div><span class="eyebrow-mini">ACCOUNTABILITY</span><h2>Audit Logs</h2><p>Recent administrative actions stored in the browser.</p></div></div><div class="admin-card table-card"><div class="table-wrap"><table class="admin-table"><thead><tr><th>Date</th><th>Action</th><th>Details</th><th>User</th></tr></thead><tbody>${d.audit.map(x=>`<tr><td>${esc(fmt(x.created_at))}</td><td><span class="badge blue">${esc(x.action)}</span></td><td>${esc(x.details)}</td><td>${esc(x.user||'admin')}</td></tr>`).join('')||'<tr><td colspan="4"><div class="empty-admin">No audit logs yet.</div></td></tr>'}</tbody></table></div></div>`;}

  function showAdminPage(page='dashboard'){
    if(!isAdmin()){location.href='admin.html';return;}
    const pages={dashboard:['Dashboard',dashboard],requests:['Service Requests',requestsPage],concerns:['Community Concerns',concernsPage],content:['Website Content',contentPage],announcements:['Announcements',announcementsPage],services:['Services',servicesPage],officials:['Barangay Officials',officialsPage],emergency:['Emergency Contacts',emergencyPage],qrcode:['Website QR Code',qrPage],security:['Admin Security',securityPage],audit:['Audit Logs',auditPage]};const p=pages[page]||pages.dashboard;adminShell(page,p[0],p[1]());
    const bind={requests:bindRequests,concerns:bindConcerns,content:bindContent,services:bindServices,officials:bindOfficials,emergency:bindEmergency,announcements:bindAnnouncements}[page];if(bind)bind();if(page==='dashboard')bindSoundControls();if(page==='qrcode')bindQrPage();
  }
  function showAdmin(){document.getElementById('loginView').classList.add('hidden');document.getElementById('adminApp').classList.remove('hidden');showAdminPage('dashboard');startNotificationMonitor();}
  function openServiceEditor(){const f=document.getElementById('serviceEditorForm');f.reset();f.elements.id.value='';openModal('serviceEditor');}
  function openOfficialEditor(){const f=document.getElementById('officialEditorForm');f.reset();f.elements.id.value='';document.getElementById('officialModalTitle').textContent='Add official';setOfficialPhotoPreview('', '');openModal('officialEditor');}
  function openEmergencyEditor(){const f=document.getElementById('emergencyEditorForm');f.reset();f.elements.id.value='';openModal('emergencyEditor');}

  function initPublic(){
    publicRender(); populateRequestServices();
    syncFromFirebase().then(changed=>{ if(changed){ publicRender(); populateRequestServices(); } });
    const requestForm=document.getElementById('requestForm'),concernForm=document.getElementById('concernForm');
    requestForm?.addEventListener('submit',submitRequest);
    concernForm?.addEventListener('submit',submitConcern);
    markFormTouched(requestForm); markFormTouched(concernForm);
    wireCounter('reqDetails','reqDetailsCount',1200);
    wireCounter('concernMessage','concernMessageCount',1600);
    document.getElementById('reqService')?.addEventListener('change',updateSelectedService);
    document.querySelectorAll('.modal').forEach(m=>{m.setAttribute('aria-hidden','true');m.addEventListener('click',e=>{if(e.target===m)closeModal(m.id)});});
    document.addEventListener('keydown',e=>{if(e.key==='Escape')document.querySelectorAll('.modal.open').forEach(m=>closeModal(m.id));if(e.key==='Tab'){const modal=document.querySelector('.modal.open');if(!modal)return;const focusables=[...modal.querySelectorAll('button,input,select,textarea,[href]')].filter(x=>!x.disabled&&x.offsetParent!==null);if(!focusables.length)return;const first=focusables[0],last=focusables[focusables.length-1];if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}}});
    const menu=document.getElementById('menuBtn'),nav=document.getElementById('navLinks');
    menu?.addEventListener('click',()=>{nav?.classList.toggle('open'); menu.setAttribute('aria-expanded',String(nav?.classList.contains('open')))});
    nav?.querySelectorAll('a').forEach(a=>a.addEventListener('click',()=>nav.classList.remove('open')));
    scrollReveal();
  }
  function initAdmin(){
    const form=document.getElementById('loginForm');
    document.addEventListener('pointerdown',unlockNotificationAudio,{once:true});
    form?.addEventListener('submit',login);
    document.getElementById('adminUser')?.addEventListener('input',()=>document.getElementById('loginError')?.classList.remove('show'));
    document.getElementById('adminPass')?.addEventListener('input',()=>document.getElementById('loginError')?.classList.remove('show'));
    if(isAdmin()){
      syncFromFirebase().finally(showAdmin);
    }else{
      sessionStorage.removeItem(SESSION);
      document.getElementById('loginView')?.classList.remove('hidden');
      document.getElementById('adminApp')?.classList.add('hidden');
    }
    window.setInterval(()=>{if(document.getElementById('adminApp')?.children.length && !isAdmin())location.href='admin.html';},60000);
  }
  return {initPublic,initAdmin,openModal,closeModal,startServiceRequest,showAdminPage,openServiceEditor,openOfficialEditor,openEmergencyEditor,logout};
})();
