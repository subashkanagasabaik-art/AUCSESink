const SUPABASE_URL = 'https://zhztngpbktenikhjyyym.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_NLsdXQzjsYuy5gIvWAFsuA_nMLATr3l';
const { createClient } = supabase;
const db = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

let currentUser = null;

// --- AUTH MODE SWITCHER ---
function switchFormMode(mode) {
  const modeInput = document.getElementById('auth-mode');
  if (modeInput) modeInput.value = mode;

  const fName = document.getElementById('field-fullname');
  const fRoll = document.getElementById('field-rollno');
  const fPass = document.getElementById('field-password');
  const fDept = document.getElementById('field-dept');
  const fYear = document.getElementById('field-year');
  const btn = document.getElementById('auth-btn');
  const title = document.getElementById('auth-title');
  const subtitle = document.getElementById('auth-subtitle');

  const linkReg = document.getElementById('switch-to-register');
  const linkLogin = document.getElementById('switch-to-login');

  if (mode === 'login') {
    if (title) title.innerText = 'Student Login';
    if (subtitle) subtitle.innerText = 'Enter your roll number and password to access your portal.';
    if (fName) fName.style.display = 'none'; 
    if (fRoll) fRoll.style.display = 'block'; 
    if (fPass) fPass.style.display = 'block';
    if (fDept) fDept.style.display = 'none'; 
    if (fYear) fYear.style.display = 'none';
    if (btn) btn.innerText = 'Sign In';
    if (linkReg) linkReg.style.display = 'block'; 
    if (linkLogin) linkLogin.style.display = 'none';
  } else if (mode === 'register') {
    if (title) title.innerText = 'One-Time Registration';
    if (subtitle) subtitle.innerText = 'Register your student credentials once.';
    if (fName) fName.style.display = 'block'; 
    if (fRoll) fRoll.style.display = 'block'; 
    if (fPass) fPass.style.display = 'block';
    if (fDept) fDept.style.display = 'block'; 
    if (fYear) fYear.style.display = 'block';
    if (btn) btn.innerText = 'Complete Registration';
    if (linkReg) linkReg.style.display = 'none'; 
    if (linkLogin) linkLogin.style.display = 'block';
  }
}

// --- ADMIN PORTAL MODAL CONTROLS ---
function openAdminPortalModal() {
  const modal = document.getElementById('admin-portal-modal');
  if (modal) modal.style.display = 'flex';
}

function closeAdminPortalModal() {
  const modal = document.getElementById('admin-portal-modal');
  if (modal) modal.style.display = 'none';
}

// --- CENTRAL ADMIN CHECK FUNCTION ---
function isAdmin() {
  const session = JSON.parse(localStorage.getItem('portal_session') || '{}');
  return session.isAdmin === true || session.role === 'admin' || ['representative', 'president', 'secretary', 'executive'].includes(session.role);
}

// --- HANDLE ADMIN AUTHENTICATION ---
// --- HANDLE ADMIN AUTHENTICATION VIA SUPABASE DATABASE ---
async function handleAdminAuthAction(e) {
  e.preventDefault();
  const name = document.getElementById('portal-admin-name').value.trim();
  const passkey = document.getElementById('portal-admin-passkey').value.trim();
  const roleType = document.getElementById('portal-admin-role').value;
  const scope = document.getElementById('portal-admin-scope').value;

  if (!name || !passkey) {
    return alert('Please enter both your name and passkey.');
  }

  // Query Supabase admin_users table using your exact column names
  const { data, error } = await db
    .from('admin_users')
    .select('*')
    .eq('full_name', name)
    .eq('passkey', passkey)
    .single();

  if (error || !data) {
    return alert('Invalid official name or custom security passkey! (Make sure the name and password match a row in Supabase)');
  }

  const sessionData = {
    name: data.full_name,
    role: data.role_type || roleType,
    deptScope: data.department_scope || scope,
    isAdmin: true
  };

  localStorage.setItem('portal_session', JSON.stringify(sessionData));
  alert(`Welcome, ${data.name} (${(data.role_type || roleType).toUpperCase()})! Access granted.`);
  
  window.location.href = sessionData.deptScope === 'all' ? 'index.html' : `${sessionData.deptScope}.html`;
}

// --- HANDLE STUDENT AUTH ACTIONS ---
async function handleAuthAction(e) {
  e.preventDefault();
  const modeInput = document.getElementById('auth-mode');
  const mode = modeInput ? modeInput.value : 'login';

  if (mode === 'register') {
    const fullName = document.getElementById('reg-name').value.trim();
    const rollNo = document.getElementById('input-rollno').value.trim();
    const password = document.getElementById('input-pass').value.trim();
    const department = document.getElementById('reg-dept').value;
    const academicYear = document.getElementById('reg-year').value;

    if (!fullName || !rollNo || !password) return alert('Please fill out all fields.');

    const { error } = await db.from('students').insert([{
      roll_no: rollNo, full_name: fullName, password: password, department: department, academic_year: academicYear
    }]);

    if (error) return alert('Registration failed (Roll number may already exist): ' + error.message);

    alert('Registration successful! You can now sign in.');
    switchFormMode('login');
  } 
  else if (mode === 'login') {
    const rollNo = document.getElementById('input-rollno').value.trim();
    const password = document.getElementById('input-pass').value.trim();

    const { data, error } = await db.from('students').select('*').eq('roll_no', rollNo).eq('password', password).single();

    if (error || !data) return alert('Invalid Roll Number or Password!');

    const sessionData = {
      name: data.full_name, role: 'student', rollNo: data.roll_no, department: data.department, academicYear: data.academic_year
    };
    localStorage.setItem('portal_session', JSON.stringify(sessionData));
    window.location.href = `${data.department}.html`;
  }
}

function handleLogout() {
  localStorage.removeItem('portal_session');
  window.location.href = 'index.html';
}

// --- POST LOADING & DATABASE HELPERS ---
async function loadAllPosts() {
  const path = window.location.pathname;
  let query = db.from('posts').select('*').order('created_at', { ascending: true });

  if (path.includes('cse.html')) {
    query = query.eq('department', 'cse');
  } else if (path.includes('ds.html')) {
    query = query.eq('department', 'ds');
  } else if (path.includes('aiml.html')) {
    query = query.eq('department', 'aiml');
  } else {
    query = query.eq('department', 'dashboard');
  }

  const { data, error } = await query;
  if (error) {
    console.error('Error loading posts:', error);
    return;
  }

  const eventList = document.getElementById('events-list');
  if (eventList) eventList.innerHTML = '';

  if (data) {
    data.forEach(post => appendPostToDOM(post));
  }

  if (!path.includes('cse.html') && !path.includes('ds.html') && !path.includes('aiml.html')) {
    loadGeneralDiscussions();
  }
}

async function loadGeneralDiscussions() {
  const { data, error } = await db
    .from('general_discussions')
    .select('*')
    .order('created_at', { ascending: true });

  if (error) {
    console.error('Error loading general discussions:', error);
    return;
  }

  const commentsList = document.getElementById('comments-dashboard');
  if (commentsList) {
    commentsList.innerHTML = '';
    if (data) {
      data.forEach(item => {
        const li = document.createElement('li');
        li.className = 'feed-item';
        li.innerHTML = `
          <div class="feed-header">
            <span class="feed-author">${item.author_name}</span>
            <span>${new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
          </div>
          <p style="font-size: 0.9rem; margin-top: 4px; color: var(--text-muted);">${item.content}</p>
        `;
        commentsList.prepend(li);
      });
    }
  }
}

async function insertPostToDB(department, academic_year, category, title, content, image_url = null) {
  const { error } = await db.from('posts').insert([{
    department, academic_year, category, title, content, image_url, author_name: `${currentUser.name} (${currentUser.role.toUpperCase()})`
  }]);
  if (error) alert('Error publishing: ' + error.message);
}

// --- GENERAL DISCUSSION COMMENT POSTING ---
async function postDashboardComment() {
  const textInput = document.getElementById('text-dashboard');
  const text = textInput ? textInput.value.trim() : '';
  
  if (!text) {
    return alert('Please write a message before posting.');
  }

  if (!currentUser) {
    return alert('You must be logged in to post comments.');
  }

  const { error } = await db.from('general_discussions').insert([{
    content: text,
    author_name: `${currentUser.name} (${currentUser.role.toUpperCase()})`
  }]);

  if (error) {
    return alert('Error posting comment: ' + error.message);
  }

  if (textInput) textInput.value = '';
  loadGeneralDiscussions();
}

// --- ADMIN POSTER & EVENT PUBLISHING WITH FILE UPLOAD ---
async function publishEventWithImage() {
  if (currentUser.role === 'student') {
    return alert('Only administrators can publish announcements.');
  }
  
  const title = document.getElementById('event-title').value.trim();
  const desc = document.getElementById('event-desc').value.trim();
  const fileInput = document.getElementById('event-file-input');
  const file = fileInput ? fileInput.files[0] : null;

  if (!title || !desc) {
    return alert('Please fill in both the event title and description.');
  }

  let publicImageUrl = null;

  if (file) {
    const fileExt = file.name.split('.').pop();
    const fileName = `${Date.now()}.${fileExt}`;
    const filePath = `${fileName}`;

    const { error: uploadError } = await db.storage
      .from('posters')
      .upload(filePath, file);

    if (uploadError) {
      return alert('Error uploading image file: ' + uploadError.message);
    }

    const { data: publicUrlData } = db.storage
      .from('posters')
      .getPublicUrl(filePath);

    publicImageUrl = publicUrlData.publicUrl;
  }

  await insertPostToDB('dashboard', 'all', 'event', title, desc, publicImageUrl);
  
  document.getElementById('event-title').value = '';
  document.getElementById('event-desc').value = '';
  if (fileInput) fileInput.value = '';
  
  alert('Event poster and announcement published successfully!');
  loadAllPosts();
}

async function postNote(key, dept, yr) {
  const type = document.getElementById(`type-note-${key}`).value;
  const text = document.getElementById(`text-note-${key}`).value.trim();
  if (!text) return alert('Write notes or thoughts');
  await insertPostToDB(dept, yr, type, null, text);
  document.getElementById(`text-note-${key}`).value = '';
}

async function postClassMessage(key, dept, yr) {
  const text = document.getElementById(`comm-text-${key}`).value.trim();
  if (!text) return alert('Write message');
  await insertPostToDB(dept, yr, 'class_comm', null, text);
  document.getElementById(`comm-text-${key}`).value = '';
}

function appendPostToDOM(post) {
  let targetListId = '';
  
  if (post.category === 'event' || post.department === 'dashboard') {
    targetListId = 'events-list';
  } else if (post.category === 'notes' || post.category === 'opinion') {
    targetListId = `notes-${post.department}-${post.academic_year}`;
  } else if (post.category === 'class_comm') {
    targetListId = `comm-${post.department}-${post.academic_year}`;
  }

  const list = document.getElementById(targetListId);
  if (!list) return;

  // Check if image_url points to an image file or a PDF file
  let mediaHTML = '';
  if (post.image_url) {
    const urlLower = post.image_url.toLowerCase();
    const isImage = urlLower.endsWith('.jpg') || urlLower.endsWith('.jpeg') || urlLower.endsWith('.png') || urlLower.endsWith('.webp') || urlLower.endsWith('.gif');

    if (isImage) {
      mediaHTML = `
        <div style="margin-top: 10px; text-align: center; background: #000; border-radius: 10px; overflow: hidden;">
          <img src="${post.image_url}" style="width: 100%; max-height: 320px; object-fit: contain; display: block;" alt="Uploaded Poster"/>
        </div>`;
    } else {
      mediaHTML = `
        <div style="margin-top: 8px;">
          <a href="${post.image_url}" target="_blank" class="pdf-download-btn">
            📄 Download / View Attached PDF
          </a>
        </div>`;
    }
  }

  const li = document.createElement('li');
  li.className = 'feed-item';
  li.innerHTML = `
    <div class="feed-header">
      <span class="feed-author" style="font-weight:600; font-size:0.85rem; color:var(--text-main);">${post.author_name}</span>
      <span style="font-size:0.75rem; color:var(--text-muted);">${new Date(post.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
    </div>
    ${post.title ? `<strong style="font-size:0.95rem; color:var(--text-main); display:block; margin: 4px 0;">${post.title}</strong>` : ''}
    <p style="font-size: 0.85rem; margin-top: 4px; color: var(--text-muted); line-height: 1.4;">${post.content}</p>
    ${mediaHTML}
  `;
  
  list.prepend(li);
}

function triggerNotification(msg) {
  const toast = document.getElementById('notification-toast');
  if (!toast) return;
  toast.innerText = msg;
  toast.style.display = 'block';
  setTimeout(() => { toast.style.display = 'none'; }, 5000);
}

// --- FETCH LIVE GLOBAL TECH NEWS ---
async function fetchLiveExternalNews() {
  const newsList = document.getElementById('external-news-list');
  if (!newsList) return;

  try {
    const rssUrl = 'https://api.rss2json.com/v1/api.json?rss_url=https://techcrunch.com/feed/';
    const response = await fetch(rssUrl);
    const data = await response.json();

    if (data.status === 'ok') {
      newsList.innerHTML = '';
      data.items.slice(0, 4).forEach(item => {
        const li = document.createElement('li');
        li.className = 'feed-item';
        li.innerHTML = `
          <div class="feed-header">
            <span>TechCrunch</span>
            <span>${new Date(item.pubDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
          </div>
          <a href="${item.link}" target="_blank" style="font-weight: 600; color: var(--text-main); text-decoration: none; font-size: 0.9rem;">${item.title}</a>
          <p style="font-size: 0.82rem; color: var(--text-muted); margin-top: 4px;">${item.description.replace(/<[^>]*>?/gm, '').substring(0, 85)}...</p>
        `;
        newsList.appendChild(li);
      });
    }
  } catch (err) {
    console.error('Failed to fetch live news:', err);
    newsList.innerHTML = '<li>Unable to load live news feed at the moment.</li>';
  }
}

// --- AUTO-DELETE EXPIRED RECORDS CLEANUP ROUTINE ---
async function cleanupExpiredData() {
  const today = new Date().toISOString().split('T')[0];
  try {
    await Promise.all([
      db.from('campus_events').delete().lt('expires_at', today),
      db.from('achievements').delete().lt('expires_at', today),
      db.from('placements').delete().lt('expires_at', today)
    ]);
  } catch (err) {
    console.warn("Cleanup warning:", err);
  }
}

// --- ADMIN MANAGEMENT ACTIONS WITH EXPIRATION DATE ---
async function addAdminEvent() {
  const badge = document.getElementById('event-badge').value.trim();
  const title = document.getElementById('event-title-input').value.trim();
  const description = document.getElementById('event-desc-input').value.trim();
  const expiresAt = document.getElementById('event-expiry').value;

  if (!title || !description || !expiresAt) {
    alert('Please fill in all event fields and select an expiration date.');
    return;
  }

  const { error } = await db.from('campus_events').insert([
    { badge: badge || 'Event', title, description, expires_at: expiresAt }
  ]);

  if (error) {
    alert('Error publishing event: ' + error.message);
  } else {
    alert('Campus Event added with expiration date: ' + expiresAt);
    document.getElementById('event-badge').value = '';
    document.getElementById('event-title-input').value = '';
    document.getElementById('event-desc-input').value = '';
    document.getElementById('event-expiry').value = '';
    loadDynamicCarousels();
  }
}

async function addAdminAchievement() {
  const category = document.getElementById('ach-category').value.trim();
  const title = document.getElementById('ach-title').value.trim();
  const description = document.getElementById('ach-desc').value.trim();
  const expiresAt = document.getElementById('ach-expiry').value;

  if (!title || !description || !expiresAt) {
    alert('Please fill in all achievement fields and select an expiration date.');
    return;
  }

  const { error } = await db.from('achievements').insert([
    { category: category || 'Award', title, description, expires_at: expiresAt }
  ]);

  if (error) {
    alert('Error publishing achievement: ' + error.message);
  } else {
    alert('Achievement added with expiration date: ' + expiresAt);
    document.getElementById('ach-category').value = '';
    document.getElementById('ach-title').value = '';
    document.getElementById('ach-desc').value = '';
    document.getElementById('ach-expiry').value = '';
    loadDynamicCarousels();
  }
}

async function addAdminPlacement() {
  const company_name = document.getElementById('place-company').value.trim();
  const role = document.getElementById('place-role').value.trim();
  const package = document.getElementById('place-package').value.trim();
  const deadline = document.getElementById('place-deadline').value.trim();
  const expiresAt = document.getElementById('place-expiry').value;

  if (!company_name || !role || !package || !expiresAt) {
    alert('Please fill in all required fields and select an expiration date.');
    return;
  }

  const { error } = await db.from('placements').insert([
    { company_name, role, package, deadline, expires_at: expiresAt }
  ]);

  if (error) {
    alert('Error publishing hiring drive: ' + error.message);
  } else {
    alert('Hiring drive published with expiration date: ' + expiresAt);
    document.getElementById('place-company').value = '';
    document.getElementById('place-role').value = '';
    document.getElementById('place-package').value = '';
    document.getElementById('place-deadline').value = '';
    document.getElementById('place-expiry').value = '';
    loadPlacementDrives();
  }
}

// --- LOAD DYNAMIC SCROLLING CAROUSELS ON HOME PAGE (WITH ADMIN DELETE BUTTONS) ---
async function loadDynamicCarousels() {
  await cleanupExpiredData();
  const today = new Date().toISOString().split('T')[0];
  const isAdminUser = currentUser && currentUser.role !== 'student';

  // 1. Load Campus Events Carousel
  const eventsContainer = document.getElementById('dynamic-events-scroll');
  if (eventsContainer) {
    const { data } = await db.from('campus_events')
      .select('*')
      .gte('expires_at', today)
      .order('created_at', { ascending: false });

    if (data && data.length > 0) {
      eventsContainer.innerHTML = '';
      data.forEach(ev => {
        const item = document.createElement('div');
        item.className = 'scroll-item';
        item.innerHTML = `
          <span class="badge badge-event">${ev.badge}</span>
          <h4>${ev.title}</h4>
          <p style="font-size: 0.85rem; color: var(--text-muted);">${ev.description}</p>
          ${isAdminUser ? `<button onclick="deleteAdminItem('campus_events', '${ev.id}')" style="margin-top:8px; background:#ef4444; color:#fff; border:none; padding:4px 8px; border-radius:6px; font-size:0.75rem; cursor:pointer;">🗑️ Delete</button>` : ''}
        `;
        eventsContainer.appendChild(item);
      });
    }
  }

  // 2. Load Achievements Carousel
  const achContainer = document.getElementById('dynamic-achievements-scroll');
  if (achContainer) {
    const { data } = await db.from('achievements')
      .select('*')
      .gte('expires_at', today)
      .order('created_at', { ascending: false });

    if (data && data.length > 0) {
      achContainer.innerHTML = '';
      data.forEach(ac => {
        const item = document.createElement('div');
        item.className = 'scroll-item';
        item.innerHTML = `
          <span class="badge" style="background: #dbeafe; color: #1e40af">${ac.category}</span>
          <h4>${ac.title}</h4>
          <p style="font-size: 0.85rem; color: var(--text-muted);">${ac.description}</p>
          ${isAdminUser ? `<button onclick="deleteAdminItem('achievements', '${ac.id}')" style="margin-top:8px; background:#ef4444; color:#fff; border:none; padding:4px 8px; border-radius:6px; font-size:0.75rem; cursor:pointer;">🗑️ Delete</button>` : ''}
        `;
        achContainer.appendChild(item);
      });
    }
  }
}

// --- FETCH AND DISPLAY PLACEMENT & HIRING DRIVES (WITH ADMIN DELETE BUTTONS) ---
async function loadPlacementDrives() {
  const placementsList = document.getElementById('placements-list');
  if (!placementsList) return;

  const today = new Date().toISOString().split('T')[0];
  const isAdminUser = currentUser && currentUser.role !== 'student';

  const { data, error } = await db.from('placements')
    .select('*')
    .gte('expires_at', today)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error loading placements:', error);
    placementsList.innerHTML = '<li>Error loading active hiring drives.</li>';
    return;
  }

  placementsList.innerHTML = '';

  if (!data || data.length === 0) {
    placementsList.innerHTML = '<li>No active hiring drives at the moment.</li>';
    return;
  }

  data.forEach(drive => {
    const li = document.createElement('li');
    li.className = 'feed-item';
    li.innerHTML = `
      <div class="feed-header">
        <strong style="color:var(--text-main); font-size:1rem;">${drive.company_name}</strong>
        <span style="background:#e0f2fe; color:#0369a1; padding:2px 6px; border-radius:4px; font-weight:600;">${drive.package}</span>
      </div>
      <p style="font-size: 0.9rem; margin-top: 4px; color: var(--text-muted);"><strong>Role:</strong> ${drive.role}</p>
      <p style="font-size: 0.8rem; color: #dc2626; margin-top: 2px;"><strong>Deadline:</strong> ${drive.deadline}</p>
      ${isAdminUser ? `<button onclick="deleteAdminItem('placements', '${drive.id}')" style="margin-top:8px; background:#ef4444; color:#fff; border:none; padding:4px 8px; border-radius:6px; font-size:0.75rem; cursor:pointer;">🗑️ Delete Drive</button>` : ''}
    `;
    placementsList.appendChild(li);
  });
}

// --- ADMIN DELETE ITEM FUNCTION ---
async function deleteAdminItem(table, id) {
  if (!confirm("Are you sure you want to delete this item?")) return;

  const { error } = await db.from(table).delete().eq('id', id);

  if (error) {
    alert("Error deleting item: " + error.message);
  } else {
    alert("Item deleted successfully!");
    if (table === 'campus_events' || table === 'achievements') {
      loadDynamicCarousels();
    } else if (table === 'placements') {
      loadPlacementDrives();
    }
  }
}

// --- INITIALIZATION & DEPARTMENT ACCESS GATEKEEPING ---
document.addEventListener("DOMContentLoaded", () => {
  const savedSession = localStorage.getItem('portal_session');
  const modal = document.getElementById('auth-modal');

  if (!savedSession) {
    if (modal) modal.style.display = 'flex';
    return;
  }

  currentUser = JSON.parse(savedSession);
  if (modal) modal.style.display = 'none';

  // Display user name and role on UI
  document.querySelectorAll('#user-display-name').forEach(el => el.innerText = currentUser.name);
  document.querySelectorAll('#user-display-role').forEach(el => {
    el.innerText = currentUser.role === 'student' 
      ? `${currentUser.department.toUpperCase()} - ${currentUser.academicYear} YR` 
      : `${currentUser.role.toUpperCase()} (${currentUser.deptScope ? currentUser.deptScope.toUpperCase() : 'ALL'})`;
  });

  // Show admin event controls if user has officer/admin role
  if (currentUser.role !== 'student') {
    const adminControls = document.getElementById('admin-event-controls');
    if (adminControls) adminControls.style.display = 'block';
  }

  // --- STRICT ACCESS RESTRICTION RULE ---
  const path = window.location.pathname;

  if (currentUser.role === 'student') {
    if (path.includes('cse.html') && currentUser.department !== 'cse') {
      window.location.href = `${currentUser.department}.html`;
    }
    if (path.includes('ds.html') && currentUser.department !== 'ds') {
      window.location.href = `${currentUser.department}.html`;
    }
    if (path.includes('aiml.html') && currentUser.department !== 'aiml') {
      window.location.href = `${currentUser.department}.html`;
    }
  } 
  else if (currentUser.deptScope && currentUser.deptScope !== 'all') {
    if (path.includes('cse.html') && currentUser.deptScope !== 'cse') {
      window.location.href = `${currentUser.deptScope}.html`;
    }
    if (path.includes('ds.html') && currentUser.deptScope !== 'ds') {
      window.location.href = `${currentUser.deptScope}.html`;
    }
    if (path.includes('aiml.html') && currentUser.deptScope !== 'aiml') {
      window.location.href = `${currentUser.deptScope}.html`;
    }
  }

  // Load application data
  loadAllPosts();
  loadPlacementDrives();
  loadDynamicCarousels();
  fetchLiveExternalNews();
});
// --- SECURE DEPARTMENT & ROLE CHECK FOR POSTING ---
function canUserPostToDepartment(targetDept, targetYear) {
  if (!currentUser) return false;

  // Global admins/officers with 'all' scope can post anywhere
  if (currentUser.role !== 'student' && currentUser.deptScope === 'all') {
    return true;
  }

  // Department-specific officers can post in their own department
  if (currentUser.role !== 'student' && currentUser.deptScope === targetDept) {
    return true;
  }

  // Regular students can only post within their registered department and year
  if (currentUser.role === 'student') {
    return currentUser.department === targetDept && currentUser.academicYear === targetYear;
  }

  return false;
}

// --- SECURE PDF NOTE UPLOAD & POSTING FUNCTION ---
async function postNoteWithPDF(key, dept, yr) {
  if (!canUserPostToDepartment(dept, yr)) {
    return alert(`Access Denied: You do not have permission to post notes for ${dept.toUpperCase()} Year ${yr}.`);
  }

  const typeElement = document.getElementById(`type-note-${key}`);
  const textElement = document.getElementById(`text-note-${key}`);
  const fileInput = document.getElementById(`file-${key}`);
  
  const type = typeElement ? typeElement.value : 'notes';
  const text = textElement ? textElement.value.trim() : '';
  const file = fileInput && fileInput.files.length > 0 ? fileInput.files.length[0] || fileInput.files[0] : null;

  if (!text && !file) {
    return alert('Please provide text descriptions or select a file to upload.');
  }

  let publicFileUrl = null;

  if (file) {
    const fileExt = file.name.split('.').pop().toLowerCase();
    const fileName = `${dept}_${yr}_${Date.now()}.${fileExt}`;
    
    // Upload file to Supabase Storage bucket 'notes-storage'
    const { error: uploadError } = await db.storage
      .from('notes-storage')
      .upload(fileName, file);

    if (uploadError) {
      return alert('Error uploading file: ' + uploadError.message);
    }

    const { data: publicUrlData } = db.storage
      .from('notes-storage')
      .getPublicUrl(fileName);

    publicFileUrl = publicUrlData.publicUrl;
  }

  const auditMetadata = `[Updated by: ${currentUser.name} (${currentUser.role.toUpperCase()}) on ${new Date().toLocaleString()}]`;
  const finalContent = `${text || 'Study Document Update'}<br><span style="font-size:0.75rem; color:#94a3b8; display:block; margin-top:4px;">${auditMetadata}</span>`;

  const { error: dbError } = await db.from('posts').insert([{
    department: dept,
    academic_year: yr,
    category: type,
    title: file ? file.name : 'Study Notes Update',
    content: finalContent,
    image_url: publicFileUrl,
    author_name: `${currentUser.name} (${currentUser.role.toUpperCase()})`
  }]);

  if (dbError) {
    return alert('Error saving post: ' + dbError.message);
  }

  if (textElement) textElement.value = '';
  if (fileInput) fileInput.value = '';
  
  alert('Published successfully!');
  loadAllPosts();
}
// --- UPDATE `appendPostToDOM` TO RENDER PDF ATTACHMENTS ---
function appendPostToDOM(post) {
  let targetListId = '';
  
  if (post.category === 'event' || post.department === 'dashboard') {
    targetListId = 'events-list';
  } else if (post.category === 'notes' || post.category === 'opinion') {
    targetListId = `notes-${post.department}-${post.academic_year}`;
  } else if (post.category === 'class_comm') {
    targetListId = `comm-${post.department}-${post.academic_year}`;
  }

  const list = document.getElementById(targetListId);
  if (!list) return;

  let mediaHTML = '';
  if (post.image_url) {
    const urlLower = post.image_url.toLowerCase();
    const isImage = urlLower.endsWith('.jpg') || urlLower.endsWith('.jpeg') || urlLower.endsWith('.png') || urlLower.endsWith('.webp') || urlLower.endsWith('.gif') || urlLower.includes('image');

    if (isImage) {
      // Display the image visibly on the dashboard + include a download button option
      mediaHTML = `
        <div style="margin-top: 10px;">
          <a href="${post.image_url}" target="_blank" title="Click to view full size">
            <img src="${post.image_url}" style="width: 100%; max-height: 360px; object-fit: cover; border-radius: 8px; display: block; border: 1px solid rgba(255,255,255,0.1);" alt="Event Poster"/>
          </a>
          <div style="margin-top: 6px; text-align: right;">
            <a href="${post.image_url}" target="_blank" download class="pdf-download-btn" style="font-size: 0.75rem; padding: 4px 10px; background: #334155; display: inline-block;">
              ⬇️ Download Poster
            </a>
          </div>
        </div>`;
    } else {
      // Render PDF download button
      mediaHTML = `
        <div style="margin-top: 8px;">
          <a href="${post.image_url}" target="_blank" class="pdf-download-btn">
            📄 Download / View Attached PDF
          </a>
        </div>`;
    }
  }

  const li = document.createElement('li');
  li.className = 'feed-item';
  li.innerHTML = `
    <div class="feed-header">
      <span class="feed-author" style="font-weight:600; font-size:0.85rem; color:var(--text-main);">${post.author_name}</span>
      <span style="font-size:0.75rem; color:var(--text-muted);">${new Date(post.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
    </div>
    ${post.title ? `<strong style="font-size:0.95rem; color:var(--text-main); display:block; margin: 4px 0;">${post.title}</strong>` : ''}
    <p style="font-size: 0.85rem; margin-top: 4px; color: var(--text-muted); line-height: 1.4;">${post.content}</p>
    ${mediaHTML}
  `;
  
  list.prepend(li);
}
window.addEventListener('DOMContentLoaded', () => {
  VANTA.BIRDS({
    el: "body", // Target element selector (can be "body" or a specific container ID like "#hero")
    mouseControls: true,
    touchControls: true,
    gyroControls: false,
    minHeight: 200.00,
    minWidth: 200.00,
    scale: 1.00,
    scaleMobile: 1.00,
    backgroundColor: 0x0f172a, // Matches your deep dark blue theme background
    color1: 0xff3366,          // Primary bird color (pinkish red)
    color2: 0xff6699,          // Secondary bird color
    birdSize: 1.20,
    speedLimit: 4.00,
    separation: 50.00,
    alignment: 50.00,
    cohesion: 50.00,
    quantity: 3.00             // Number of birds/polygons flocking
  });
});