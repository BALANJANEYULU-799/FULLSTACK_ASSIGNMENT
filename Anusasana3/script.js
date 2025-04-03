const SERVER_URL = 'http://localhost:5000';
const state = { currentUser: null };

function switchScreen(screenId) {
    document.querySelectorAll('.screen').forEach(screen => {
        screen.classList.toggle('active', screen.id === screenId);
    });
}

function showMessage(elementId, message, type) {
    const element = document.getElementById(elementId);
    if (element) {
        element.textContent = message;
        element.className = `auth-message ${type}`;
        element.classList.add('show');
        setTimeout(() => element.classList.remove('show'), 5000);
    }
}

function toggleSpinner(buttonId, show) {
    const button = document.getElementById(buttonId);
    if (button) {
        button.disabled = show;
        const spinner = button.querySelector('.spinner');
        if (spinner) spinner.classList.toggle('hidden', !show);
        button.childNodes[0].textContent = show ? 'Processing...' : (buttonId === 'register-btn' ? 'Register' : 'Login');
    }
}

function logout() {
    state.currentUser = null;
    localStorage.removeItem('currentUser');
    switchScreen('home-screen');
}

async function handleRegister(event) {
    event.preventDefault();
    const nameEl = document.getElementById('reg-name');
    const emailEl = document.getElementById('reg-email');
    const passwordEl = document.getElementById('reg-password');
    const roleEl = document.getElementById('reg-role');
    const collegeEl = document.getElementById('reg-college');

    if (!nameEl || !emailEl || !passwordEl || !roleEl || !collegeEl) {
        showMessage('auth-message', 'Error: Form elements missing.', 'error');
        return;
    }

    const name = nameEl.value.trim();
    const email = emailEl.value.trim();
    const password = passwordEl.value;
    const role = roleEl.value;
    const college = collegeEl.value.trim();

    if (!name || !email || !password || !role || !college) {
        showMessage('auth-message', 'Error: All fields are required.', 'error');
        return;
    }

    toggleSpinner('register-btn', true);
    try {
        const response = await fetch(`${SERVER_URL}/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, email, password, role, college })
        });
        if (!response.ok) throw new Error((await response.json()).error || 'Registration failed');
        showMessage('auth-message', 'Registration successful! Please login.', 'success');
        setTimeout(() => switchScreen('login-screen'), 2000);
    } catch (error) {
        console.error('Register Error:', error);
        showMessage('auth-message', `Error: ${error.message}`, 'error');
    } finally {
        toggleSpinner('register-btn', false);
    }
}

async function handleLogin(event) {
    event.preventDefault();
    const emailEl = document.getElementById('login-email');
    const passwordEl = document.getElementById('login-password');

    if (!emailEl || !passwordEl) {
        showMessage('login-message', 'Error: Form elements missing.', 'error');
        return;
    }

    const email = emailEl.value.trim();
    const password = passwordEl.value;

    if (!email || !password) {
        showMessage('login-message', 'Error: All fields are required.', 'error');
        return;
    }

    toggleSpinner('login-btn', true);
    try {
        const response = await fetch(`${SERVER_URL}/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });
        if (!response.ok) throw new Error((await response.json()).error || 'Login failed');
        const userData = await response.json();
        state.currentUser = userData;
        localStorage.setItem('currentUser', JSON.stringify(userData));
        showMessage('login-message', 'Login successful!', 'success');
        setTimeout(() => {
            switchScreen(`${userData.role}-dashboard`);
            const dashboardNameEl = document.getElementById(`${userData.role}-dashboard-name`);
            if (dashboardNameEl) dashboardNameEl.textContent = userData.name;
        }, 1000);
    } catch (error) {
        console.error('Login Error:', error);
        showMessage('login-message', `Login failed: ${error.message}`, 'error');
    } finally {
        toggleSpinner('login-btn', false);
    }
}

// Real Dashboard Functions
async function submitAssignment(event) {
    event.preventDefault();
    const name = document.getElementById('assignment-name').value.trim();
    const file = document.getElementById('assignment-file').files[0];
    if (!name || !file) {
        showMessage('student-assignments-list', 'Error: All fields required.', 'error');
        return;
    }

    const formData = new FormData();
    formData.append('file', file);
    formData.append('name', name);
    formData.append('studentId', state.currentUser.uid);

    try {
        const response = await fetch(`${SERVER_URL}/extract-text`, {
            method: 'POST',
            body: formData
        });
        const { text } = await response.json();
        await fetch(`${SERVER_URL}/assignments`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, text, studentId: state.currentUser.uid })
        });
        showMessage('student-assignments-list', 'Assignment submitted!', 'success');
    } catch (error) {
        console.error('Assignment Error:', error);
        showMessage('student-assignments-list', `Error: ${error.message}`, 'error');
    }
}

async function sendMessage(event) {
    event.preventDefault();
    const text = document.getElementById('message-text').value.trim();
    if (!text) return;

    try {
        await fetch(`${SERVER_URL}/messages`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text, senderId: state.currentUser.uid, timestamp: new Date().toISOString() })
        });
        document.getElementById('message-text').value = '';
        showMessage('student-messages-list', 'Message sent!', 'success');
    } catch (error) {
        console.error('Message Error:', error);
    }
}

async function askDoubt(event) {
    event.preventDefault();
    const text = document.getElementById('doubt-text').value.trim();
    if (!text) return;

    try {
        await fetch(`${SERVER_URL}/doubts`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text, studentId: state.currentUser.uid, status: 'pending' })
        });
        document.getElementById('doubt-text').value = '';
        showMessage('doubt-response', 'Doubt submitted!', 'success');
    } catch (error) {
        console.error('Doubt Error:', error);
    }
}

async function assignTask(event) {
    event.preventDefault();
    const name = document.getElementById('task-name').value.trim();
    const dueDate = document.getElementById('task-due-date').value;
    if (!name || !dueDate) return;

    try {
        await fetch(`${SERVER_URL}/tasks`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, dueDate, teacherId: state.currentUser.uid })
        });
        document.getElementById('task-name').value = '';
        document.getElementById('task-due-date').value = '';
        showMessage('teacher-tasks', 'Task assigned!', 'success');
    } catch (error) {
        console.error('Task Error:', error);
    }
}

async function uploadClass(event) {
    event.preventDefault();
    const title = document.getElementById('class-title').value.trim();
    if (!title) return;

    try {
        await fetch(`${SERVER_URL}/classes`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ title, teacherId: state.currentUser.uid })
        });
        document.getElementById('class-title').value = '';
        showMessage('teacher-classes', 'Class uploaded!', 'success');
    } catch (error) {
        console.error('Class Error:', error);
    }
}

async function postAnnouncement(event) {
    event.preventDefault();
    const text = document.getElementById('announcement-text').value.trim();
    if (!text) return;

    try {
        await fetch(`${SERVER_URL}/announcements`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text, teacherId: state.currentUser.uid, timestamp: new Date().toISOString() })
        });
        document.getElementById('announcement-text').value = '';
        showMessage('teacher-announcements', 'Announcement posted!', 'success');
    } catch (error) {
        console.error('Announcement Error:', error);
    }
}

async function sendBulkMessage(event) {
    event.preventDefault();
    const text = document.getElementById('bulk-message-text').value.trim();
    if (!text) return;

    try {
        await fetch(`${SERVER_URL}/messages`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text, senderId: state.currentUser.uid, isBulk: true, timestamp: new Date().toISOString() })
        });
        document.getElementById('bulk-message-text').value = '';
        showMessage('teacher-messages-list', 'Bulk message sent!', 'success');
    } catch (error) {
        console.error('Bulk Message Error:', error);
    }
}

function toggleChatbot() {
    document.getElementById('chatbot').classList.toggle('hidden');
}

async function sendChatMessage(event) {
    event.preventDefault();
    const input = document.getElementById('chat-input');
    const message = input.value.trim();
    if (!message) return;

    const messagesDiv = document.getElementById('chatbot-messages');
    messagesDiv.innerHTML += `<div class="chat-message">You: ${message}</div>`;
    input.value = '';

    try {
        const response = await fetch(`${SERVER_URL}/grok/v1/chat`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message, context: 'user query' })
        });
        const { response: reply } = await response.json();
        messagesDiv.innerHTML += `<div class="chat-message">Assistant: ${reply}</div>`;
        messagesDiv.scrollTop = messagesDiv.scrollHeight;
    } catch (error) {
        console.error('Chat Error:', error);
    }
}

function toggleCard(header) {
    const content = header.nextElementSibling;
    content.style.display = content.style.display === 'none' ? 'block' : 'none';
}

function selectMentor() {
    const select = document.getElementById('student-mentor-select');
    console.log('Mentor selected:', select.value);
}

function showStudentSection(section) {
    document.querySelectorAll('#student-dashboard .content-panel').forEach(panel => {
        panel.classList.toggle('active', panel.id === `student-${section}`);
    });
    document.querySelectorAll('#student-dashboard .sidebar li').forEach(li => {
        li.classList.toggle('active', li.onclick.toString().includes(section));
    });
}

function showTeacherSection(section) {
    document.querySelectorAll('#teacher-dashboard .content-panel').forEach(panel => {
        panel.classList.toggle('active', panel.id === `teacher-${section}`);
    });
    document.querySelectorAll('#teacher-dashboard .sidebar li').forEach(li => {
        li.classList.toggle('active', li.onclick.toString().includes(section));
    });
}

// Event Listeners
document.querySelector('#register-screen .dashboard-form')?.addEventListener('submit', handleRegister);
document.querySelector('#login-screen .dashboard-form')?.addEventListener('submit', handleLogin);
document.querySelector('#student-assignments form')?.addEventListener('submit', submitAssignment);
document.querySelector('#student-messages form')?.addEventListener('submit', sendMessage);
document.querySelector('#student-doubts form')?.addEventListener('submit', askDoubt);
document.querySelector('#teacher-tasks form')?.addEventListener('submit', assignTask);
document.querySelector('#teacher-classes form')?.addEventListener('submit', uploadClass);
document.querySelector('#teacher-announcements form')?.addEventListener('submit', postAnnouncement);
document.querySelector('#teacher-messages form')?.addEventListener('submit', sendBulkMessage);
document.querySelector('.chatbot-form')?.addEventListener('submit', sendChatMessage);

// Initialize
const storedUser = localStorage.getItem('currentUser');
if (storedUser) {
    state.currentUser = JSON.parse(storedUser);
    switchScreen(`${state.currentUser.role}-dashboard`);
    document.getElementById(`${state.currentUser.role}-dashboard-name`).textContent = state.currentUser.name;
} else {
    switchScreen('home-screen');
}