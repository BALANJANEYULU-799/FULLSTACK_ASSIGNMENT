// Socket.IO connection
const socket = io();

// Global variables
let currentUser = null;
let currentRole = null;

// UI Functions
function switchScreen(screenId) {
    // Hide all screens
    document.querySelectorAll('.screen').forEach(screen => {
        screen.classList.remove('active');
    });
    
    // Show selected screen
    const screen = document.getElementById(screenId);
    if (screen) {
        screen.classList.add('active');
        
        // Hide chat button on home, login and register screens
        if (screenId === 'home-screen' || screenId === 'login-screen' || screenId === 'register-screen') {
            if (document.getElementById('open-chat')) {
                document.getElementById('open-chat').style.display = 'none';
            }
            if (document.getElementById('floating-chat')) {
                document.getElementById('floating-chat').classList.remove('active');
            }
        } else {
            // Show chat button on dashboard screens
            if (document.getElementById('open-chat')) {
                document.getElementById('open-chat').style.display = 'flex';
            }
        }
        
        // Load data based on screen
        if (screenId === 'student-dashboard') {
            loadStudentDashboard();
        } else if (screenId === 'teacher-dashboard') {
            loadTeacherDashboard();
        }
    }
}

function toggleCard(cardHeader) {
    const content = cardHeader.nextElementSibling;
    const isVisible = content.style.display === 'block';
    
    // Close all other cards first (optional)
    // document.querySelectorAll('.card-content').forEach(c => {
    //     c.style.display = 'none';
    // });
    
    content.style.display = isVisible ? 'none' : 'block';
    
    // Toggle arrow icon
    const icon = cardHeader.querySelector('.fa-chevron-down, .toggle-icon i');
    if (icon) {
        icon.classList.toggle('fa-chevron-down');
        icon.classList.toggle('fa-chevron-up');
    }
    
    cardHeader.classList.toggle('active');
}

function showStudentSection(sectionId) {
    // Hide all sections
    document.querySelectorAll('.content-panel').forEach(panel => {
        panel.classList.remove('active');
    });
    
    // Highlight selected sidebar item
    document.querySelectorAll('.sidebar li').forEach(item => {
        item.classList.remove('active');
    });
    document.querySelector(`.sidebar li[onclick="showStudentSection('${sectionId}')"]`).classList.add('active');
    
    // Show selected section
    const section = document.getElementById(`student-${sectionId}`);
    if (section) {
        section.classList.add('active');
        loadStudentData(sectionId);
    }
}

function showTeacherSection(sectionId) {
    // Hide all sections
    document.querySelectorAll('.content-panel').forEach(panel => {
        panel.classList.remove('active');
    });
    
    // Highlight selected sidebar item
    document.querySelectorAll('.sidebar li').forEach(item => {
        item.classList.remove('active');
    });
    document.querySelector(`.sidebar li[onclick="showTeacherSection('${sectionId}')"]`).classList.add('active');
    
    // Show selected section
    const section = document.getElementById(`teacher-${sectionId}`);
    if (section) {
        section.classList.add('active');
        loadTeacherData(sectionId);
    }
}

// Helper Functions
function generateStudentId(name, timestamp) {
    const prefix = "STU";
    const randomDigits = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    return `${prefix}-${randomDigits}`;
}

function generateTeacherId(name, timestamp) {
    const prefix = "TCH";
    const randomDigits = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    return `${prefix}-${randomDigits}`;
}

// Add animation classes to elements
function addAnimations() {
    const animatableElements = document.querySelectorAll('.card, .highlight-card, .analytics-card, .auth-panel, .overview-item');
    animatableElements.forEach((el, index) => {
        el.classList.add('animate-in');
        el.style.animationDelay = `${index * 0.1}s`;
    });
}

// Simple debugging function to check server connectivity
async function checkServerConnection() {
    try {
        console.log('Testing server connection...');
        const response = await fetch('/api/healthcheck', {
            method: 'GET',
            headers: {
                'Accept': 'application/json'
            }
        });
        
        if (response.ok) {
            const data = await response.json();
            console.log('Server connection successful!', data);
            return true;
        } else {
            console.error('Server returned error:', response.status, response.statusText);
            return false;
        }
    } catch (error) {
        console.error('Server connection failed:', error);
        alert('Cannot connect to server. Please check your connection and try again.');
        return false;
    }
}

// Authentication Functions
async function handleRegister(event) {
    event.preventDefault();
    
    console.log('Starting registration process...');
    
    // Prepare UI for registration process
    const authMessage = document.getElementById('auth-message');
    authMessage.textContent = '';
    authMessage.className = 'auth-message';
    
    const submitBtn = document.getElementById('register-btn');
    const spinner = submitBtn.querySelector('.spinner');
    spinner.classList.remove('hidden');
    submitBtn.disabled = true;
    
    try {
        // Check server connectivity first
        console.log('Checking server connectivity...');
        const isConnected = await checkServerConnection();
        if (!isConnected) {
            throw new Error('Cannot connect to server. Please check your internet connection and try again.');
        }
        
        // Get form data
        const form = event.target;
        const formData = new FormData(form);
        
        // Extract form fields
        const name = formData.get('name');
        const email = formData.get('email');
        const password = formData.get('password');
        const role = formData.get('role');
        const college = formData.get('college');
        
        // Validate all fields are filled
        if (!name || !email || !password || !role || !college) {
            throw new Error('All fields are required. Please fill in all the fields.');
        }
        
        // Generate timestamp
        const timestamp = Date.now();
        
        // Generate ID based on role
        const uniqueId = role === 'student' 
            ? generateStudentId(name, timestamp) 
            : generateTeacherId(name, timestamp);
        
        // Create user data object
        const userData = {
            name,
            email,
            password,
            role,
            college,
            uniqueId,
            createdAt: timestamp
        };

        console.log('Sending registration data to server...');
        
        // Send registration request
        const response = await fetch('/api/register', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(userData)
        });
        
        // Parse response
        const data = await response.json();
        
        // Handle successful registration
        if (response.ok) {
            console.log('Registration successful!', data);
            
            // Show success message
            authMessage.textContent = `Registration successful! Your ${role.toUpperCase()} ID is ${uniqueId}. You can now login.`;
            authMessage.classList.add('success');
            
            // Reset form
            form.reset();
            
            // Transition to login screen
            setTimeout(() => {
                console.log('Transitioning to login screen...');
                const registerScreen = document.getElementById('register-screen');
                registerScreen.classList.add('fade-out');
                
                setTimeout(() => {
                    switchScreen('login-screen');
                    document.getElementById('login-screen').classList.add('fade-in');
                    
                    // Auto-fill email for convenience
                    const loginEmailInput = document.querySelector('#login-form input[name="email"]');
                    if (loginEmailInput) {
                        loginEmailInput.value = email;
                    }
                }, 500);
            }, 2000);
        } else {
            // Handle registration errors
            console.error('Registration failed:', data);
            throw new Error(data.error || 'Registration failed. Please try again later.');
        }
    } catch (error) {
        // Handle all errors
        console.error('Registration error:', error);
        authMessage.textContent = error.message || 'Registration failed. Please try again later.';
        authMessage.classList.add('error');
        shakeElement(document.getElementById('register-form'));
    } finally {
        // Reset UI
        spinner.classList.add('hidden');
        submitBtn.disabled = false;
    }
}

async function handleLogin(event) {
    event.preventDefault();
    
    console.log('Starting login process...');
    
    // Prepare UI for login process
    const loginMessage = document.getElementById('login-message');
    loginMessage.textContent = '';
    loginMessage.className = 'auth-message';
    
    const submitBtn = document.getElementById('login-btn');
    const spinner = submitBtn.querySelector('.spinner');
    spinner.classList.remove('hidden');
    submitBtn.disabled = true;
    
    try {
        // Check server connectivity first
        console.log('Checking server connectivity...');
        const isConnected = await checkServerConnection();
        if (!isConnected) {
            throw new Error('Cannot connect to server. Please check your internet connection and try again.');
        }
        
        // Get form data
        const form = event.target;
        const formData = new FormData(form);
        
        // Extract form fields
        const email = formData.get('email');
        const password = formData.get('password');
        
        // Validate fields
        if (!email || !password) {
            throw new Error('Email and password are required.');
        }
        
        // Create login data object
        const userData = { email, password };
        
        console.log('Sending login request to server...');
        
        // Send login request
        const response = await fetch('/api/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(userData)
        });

        // Handle response errors
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Login failed. Please check your credentials and try again.');
        }
        
        // Parse successful response
        const data = await response.json();
        console.log('Login successful!', data);
        
        // Store user data
        currentUser = data.user;
        currentRole = data.user.role;
        
        // Store token in localStorage
        if (data.token) {
            localStorage.setItem('authToken', data.token);
            console.log('Auth token stored in localStorage');
        }
        
        // Show temporary success message
        loginMessage.textContent = 'Login successful! Redirecting to your dashboard...';
        loginMessage.classList.add('success');
        
        // Join socket room
        console.log('Joining socket room...');
        socket.emit('join', currentUser.id);
        
        // Reset form
        form.reset();
        
        // Transition to appropriate dashboard
        setTimeout(() => {
            const loginScreen = document.getElementById('login-screen');
            loginScreen.classList.add('fade-out');
            
            // Determine which dashboard to show
            if (currentRole === 'student') {
                console.log('Transitioning to student dashboard...');
                setTimeout(() => {
                    document.getElementById('student-dashboard-name').textContent = currentUser.name;
                    document.getElementById('student-profile-name').textContent = currentUser.name;
                    document.getElementById('student-profile-college').textContent = currentUser.college;
                    document.getElementById('student-profile-id').textContent = currentUser.uniqueId || 'Not Available';
                    
                    switchScreen('student-dashboard');
                    document.getElementById('student-dashboard').classList.add('fade-in');
                    loadStudentData();
                    addAnimations();
                }, 500);
            } else {
                console.log('Transitioning to teacher dashboard...');
                setTimeout(() => {
                    document.getElementById('teacher-dashboard-name').textContent = currentUser.name;
                    document.getElementById('teacher-profile-name').textContent = currentUser.name;
                    document.getElementById('teacher-profile-college').textContent = currentUser.college;
                    document.getElementById('teacher-profile-id').textContent = currentUser.uniqueId || 'Not Available';
                    
                    switchScreen('teacher-dashboard');
                    document.getElementById('teacher-dashboard').classList.add('fade-in');
                    loadTeacherData();
                    addAnimations();
                }, 500);
            }
        }, 1500);
    } catch (error) {
        // Handle all errors
        console.error('Login error:', error);
        loginMessage.textContent = error.message || 'Login failed. Please try again later.';
        loginMessage.classList.add('error');
        shakeElement(document.getElementById('login-form'));
    } finally {
        // Reset UI
        spinner.classList.add('hidden');
        submitBtn.disabled = false;
    }
}

function showDashboard(role) {
    switchScreen(`${role}-dashboard`);
    updateDashboardInfo();
    loadDashboardData();
}

function updateDashboardInfo() {
    if (currentRole === 'student') {
        document.getElementById('student-dashboard-name').textContent = currentUser.name;
        document.getElementById('student-profile-name').textContent = currentUser.name;
        document.getElementById('student-profile-college').textContent = currentUser.college;
    } else {
        document.getElementById('teacher-dashboard-name').textContent = currentUser.name;
    }
}

async function loadDashboardData() {
    if (!currentUser) return;

    try {
        // Load assignments
        const assignmentsResponse = await fetch('/assignments');
        const assignments = await assignmentsResponse.json();
        displayAssignments(assignments);

        // Load messages
        const messagesResponse = await fetch('/messages');
        const messages = await messagesResponse.json();
        displayMessages(messages);

        // Load announcements
        const announcementsResponse = await fetch('/announcements');
        const announcements = await announcementsResponse.json();
        displayAnnouncements(announcements);
    } catch (error) {
        console.error('Error loading dashboard data:', error);
    }
}

function displayAssignments(assignments) {
    const container = document.getElementById('assignments-list');
    container.innerHTML = assignments.map(assignment => `
        <div class="assignment">
            <h4>${assignment.name}</h4>
            <p>${assignment.text}</p>
            <small>Due: ${new Date(assignment.submittedAt).toLocaleDateString()}</small>
        </div>
    `).join('');
}

function displayMessages(messages) {
    const container = document.getElementById('messages-list');
    container.innerHTML = messages.map(message => `
        <div class="message">
            <p>${message.text}</p>
            <small>${new Date(message.timestamp).toLocaleString()}</small>
        </div>
    `).join('');
}

function displayAnnouncements(announcements) {
    const container = document.getElementById('announcements-list');
    container.innerHTML = announcements.map(announcement => `
        <div class="announcement">
            <p>${announcement.text}</p>
            <small>${new Date(announcement.timestamp).toLocaleString()}</small>
        </div>
    `).join('');
}

// Student Functions
async function loadStudentData(section) {
    console.log(`Loading student data for section: ${section}`);
    
    // If no currentUser, don't attempt to load data
    if (!currentUser) {
        console.warn('No current user, cannot load student data');
        return;
    }
    
    const studentId = currentUser.id;
    
    // Show loading state in the relevant container
    const containerMap = {
        'assignments': 'student-assignments-list',
        'grades': 'student-grades-list',
        'classes': 'student-classes-list',
        'messages': 'student-messages-list',
        'announcements': 'student-announcements-list',
        'doubts': 'doubt-response',
        'calendar': 'student-calendar-list',
        'overview': null // Overview uses multiple containers
    };
    
    const containerId = containerMap[section];
    if (containerId) {
        const container = document.getElementById(containerId);
        if (container) {
            container.innerHTML = `
                <div class="loading-spinner">
                    <div class="spinner"></div>
                    <p>Loading ${section}...</p>
                </div>
            `;
        }
    }
    
    try {
        switch(section) {
            case 'assignments':
                // In a real app, fetch assignments from server
                // const assignmentsResponse = await fetch(`/api/student/${studentId}/assignments`);
                // const assignments = await assignmentsResponse.json();
                
                // Simulate data for demo
                await simulateDelay(800);
                const assignments = [
                    { 
                        id: 'asgn1', 
                        name: 'Physics Assignment 1', 
                        subject: 'Science',
                        submittedAt: new Date().toISOString(),
                        status: 'graded',
                        grade: 85,
                        feedback: 'Good work on the problem solving section. Review Newton\'s laws.'
                    },
                    { 
                        id: 'asgn2', 
                        name: 'Literature Essay', 
                        subject: 'English',
                        dueDate: new Date(Date.now() + 86400000 * 2).toISOString(), // 2 days from now
                        status: 'pending'
                    }
                ];
                
                updateStudentAssignments(assignments);
                break;
                
            case 'grades':
                // Simulate grades data
                await simulateDelay(600);
                updateGradesDisplay();
                break;
                
            case 'classes':
                // Simulate classes data
                await simulateDelay(700);
                const classes = [
                    { 
                        id: 'cls1', 
                        name: 'Advanced Physics', 
                        teacher: 'Dr. Richard Feynman',
                        schedule: 'Mon, Wed, Fri - 10:00 AM',
                        progress: 65
                    },
                    { 
                        id: 'cls2', 
                        name: 'English Literature', 
                        teacher: 'Prof. Jane Austin',
                        schedule: 'Tue, Thu - 2:00 PM',
                        progress: 78
                    }
                ];
                
                updateStudentClasses(classes);
                break;
                
            case 'messages':
                // Simulate messages data
                await simulateDelay(500);
                const messages = [
                    { 
                        id: 'msg1', 
                        from: 'Dr. Richard Feynman', 
                        fromId: 'TCH-1234',
                        message: 'Your recent assignment was excellent. Let\'s discuss your approach during the next class.',
                        timestamp: new Date(Date.now() - 86400000).toISOString(), // 1 day ago
                        read: true
                    },
                    { 
                        id: 'msg2', 
                        from: 'Prof. Jane Austin', 
                        fromId: 'TCH-5678',
                        message: 'Please remember to submit your analysis of "Pride and Prejudice" by Friday.',
                        timestamp: new Date(Date.now() - 3600000 * 3).toISOString(), // 3 hours ago
                        read: false
                    }
                ];
                
                updateStudentMessages(messages);
                break;
                
            case 'announcements':
                // Simulate announcements data
                await simulateDelay(400);
                const announcements = [
                    { 
                        id: 'ann1', 
                        from: 'Dean of Students', 
                        title: 'End of Semester Schedule',
                        message: 'Please note that the final examination schedule has been posted. All students should check their exam times.',
                        timestamp: new Date(Date.now() - 86400000 * 2).toISOString(), // 2 days ago
                        important: true
                    },
                    { 
                        id: 'ann2', 
                        from: 'Student Affairs', 
                        title: 'Campus Resources',
                        message: 'The library will have extended hours during finals week. The writing center is also available for assistance.',
                        timestamp: new Date(Date.now() - 86400000 * 5).toISOString(), // 5 days ago
                        important: false
                    }
                ];
                
                updateStudentAnnouncements(announcements);
                break;
                
            case 'doubts':
                // Nothing to load initially, but ensure the form is reset
                const doubtTextarea = document.getElementById('doubt-text');
                if (doubtTextarea) doubtTextarea.value = '';
                
                // Load previous doubts if needed
                await simulateDelay(300);
                const doubts = [
                    { 
                        id: 'dbt1', 
                        question: 'Can you explain the difference between velocity and acceleration?',
                        answer: 'Velocity is the rate of change of position with respect to time, while acceleration is the rate of change of velocity with respect to time.',
                        timestamp: new Date(Date.now() - 86400000 * 3).toISOString(), // 3 days ago
                        status: 'resolved'
                    },
                    { 
                        id: 'dbt2', 
                        question: 'How do I analyze a character\'s motivations in a literary text?',
                        timestamp: new Date(Date.now() - 86400000).toISOString(), // 1 day ago
                        status: 'pending'
                    }
                ];
                
                updateStudentDoubts(doubts);
                break;
                
            case 'calendar':
                // Simulate calendar data
                await simulateDelay(600);
                const today = new Date();
                const events = [
                    { 
                        id: 'evt1', 
                        title: 'Physics Exam', 
                        date: new Date(today.getFullYear(), today.getMonth(), today.getDate() + 5).toISOString(),
                        type: 'exam',
                        location: 'Hall A'
                    },
                    { 
                        id: 'evt2', 
                        title: 'Literature Essay Due', 
                        date: new Date(today.getFullYear(), today.getMonth(), today.getDate() + 2).toISOString(),
                        type: 'assignment'
                    },
                    { 
                        id: 'evt3', 
                        title: 'Science Club Meeting', 
                        date: new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1).toISOString(),
                        type: 'event',
                        location: 'Lab 203'
                    }
                ];
                
                updateStudentCalendar(events);
                break;
                
            case 'overview':
                // Load summary data for overview
                await simulateDelay(500);
                const overviewData = {
                    totalAssignments: 15,
                    submittedAssignments: 12,
                    averageScore: 87,
                    upcomingEvents: 3,
                    unreadMessages: 2
                };
                
                updateStudentOverview(overviewData);
                break;
                
            default:
                console.log('Unknown section:', section);
        }
    } catch (error) {
        console.error(`Error loading data for ${section}:`, error);
        const container = document.getElementById(containerMap[section]);
        if (container) {
            container.innerHTML = `<div class="error-message">Failed to load ${section}. Please try again.</div>`;
        }
    }
}

// Update student assignments display
function updateStudentAssignments(assignments) {
    const container = document.getElementById('student-assignments-list');
    if (!container) return;
    
    if (assignments.length === 0) {
        container.innerHTML = '<div class="info-text">No assignments found.</div>';
        return;
    }
    
    container.innerHTML = '';
    
    assignments.forEach(assignment => {
        const card = document.createElement('div');
        card.className = 'submission-card';
        
        const header = document.createElement('div');
        header.className = 'submission-header';
        
        const title = document.createElement('div');
        title.className = 'submission-title';
        title.textContent = assignment.name;
        
        let statusClass = 'status-pending';
        if (assignment.status === 'graded' || assignment.status === 'auto-graded') {
            statusClass = 'status-graded';
        } else if (assignment.status === 'auto-graded') {
            statusClass = 'status-auto-graded';
        }
        
        const status = document.createElement('div');
        status.className = `submission-status ${statusClass}`;
        status.textContent = assignment.status.charAt(0).toUpperCase() + assignment.status.slice(1);
        
        header.appendChild(title);
        header.appendChild(status);
        card.appendChild(header);
        
        // Information grid
        const info = document.createElement('div');
        info.className = 'submission-info';
        
        // Subject
        if (assignment.subject) {
            const subjectItem = document.createElement('div');
            subjectItem.className = 'submission-info-item';
            
            const subjectLabel = document.createElement('div');
            subjectLabel.className = 'submission-info-label';
            subjectLabel.textContent = 'Subject';
            
            const subjectValue = document.createElement('div');
            subjectValue.className = 'submission-info-value';
            subjectValue.textContent = assignment.subject;
            
            subjectItem.appendChild(subjectLabel);
            subjectItem.appendChild(subjectValue);
            info.appendChild(subjectItem);
        }
        
        // Due date or submission date
        if (assignment.submittedAt || assignment.dueDate) {
            const dateItem = document.createElement('div');
            dateItem.className = 'submission-info-item';
            
            const dateLabel = document.createElement('div');
            dateLabel.className = 'submission-info-label';
            dateLabel.textContent = assignment.submittedAt ? 'Submitted' : 'Due';
            
            const dateValue = document.createElement('div');
            dateValue.className = 'submission-info-value';
            
            const date = new Date(assignment.submittedAt || assignment.dueDate);
            dateValue.textContent = date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
            
            dateItem.appendChild(dateLabel);
            dateItem.appendChild(dateValue);
            info.appendChild(dateItem);
        }
        
        // Grade if available
        if (assignment.grade) {
            const gradeItem = document.createElement('div');
            gradeItem.className = 'submission-info-item';
            
            const gradeLabel = document.createElement('div');
            gradeLabel.className = 'submission-info-label';
            gradeLabel.textContent = 'Grade';
            
            const gradeValue = document.createElement('div');
            gradeValue.className = 'submission-info-value';
            gradeValue.textContent = assignment.grade + '/100';
            
            gradeItem.appendChild(gradeLabel);
            gradeItem.appendChild(gradeValue);
            info.appendChild(gradeItem);
        }
        
        card.appendChild(info);
        
        // Feedback if available
        if (assignment.feedback) {
            const feedbackSection = document.createElement('div');
            feedbackSection.className = 'submission-feedback';
            feedbackSection.innerHTML = `
                <h4><i class="fas fa-comment"></i> Feedback</h4>
                <p>${assignment.feedback}</p>
            `;
            card.appendChild(feedbackSection);
        }
        
        // Action buttons
        const actions = document.createElement('div');
        actions.className = 'submission-actions';
        
        if (assignment.status === 'pending') {
            // Submission button
            const submitBtn = document.createElement('button');
            submitBtn.className = 'btn btn-primary';
            submitBtn.innerHTML = '<i class="fas fa-paper-plane"></i> Submit';
            submitBtn.addEventListener('click', () => {
                // Fill in the submission form with this assignment
                const nameInput = document.getElementById('assignment-name');
                if (nameInput) nameInput.value = assignment.name;
                
                // Scroll to submission form
                const form = document.getElementById('submit-assignment-form');
                if (form) {
                    form.scrollIntoView({ behavior: 'smooth' });
                    
                    // Highlight the form
                    form.classList.add('highlight-form');
                    setTimeout(() => {
                        form.classList.remove('highlight-form');
                    }, 2000);
                }
            });
            actions.appendChild(submitBtn);
        } else {
            // View button
            const viewBtn = document.createElement('button');
            viewBtn.className = 'btn btn-primary';
            viewBtn.innerHTML = '<i class="fas fa-eye"></i> View';
            viewBtn.addEventListener('click', () => viewSubmission(assignment.id, 'student'));
            actions.appendChild(viewBtn);
        }
        
        card.appendChild(actions);
        container.appendChild(card);
    });
}

// Update student messages display
function updateStudentMessages(messages) {
    const container = document.getElementById('student-messages-list');
    if (!container) return;
    
    // Hide loading spinner if present
    const loadingSpinner = document.getElementById('student-messages-loading');
    if (loadingSpinner) {
        loadingSpinner.style.display = 'none';
    }
    
    if (messages.length === 0) {
        container.innerHTML = '<div class="info-text">No messages found.</div>';
        return;
    }
    
    // Sort messages by timestamp (newest first)
    messages.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    
    // Create messages list
    const messagesList = document.createElement('div');
    messagesList.className = 'messages-list';
    
    messages.forEach(message => {
        const messageCard = document.createElement('div');
        messageCard.className = `message-card ${message.read ? 'read' : 'unread'}`;
        
        const date = new Date(message.timestamp);
        const formattedDate = date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
        
        messageCard.innerHTML = `
            <div class="message-header">
                <div class="message-from">
                    <i class="fas fa-user-circle"></i>
                    <span>${message.from}</span>
                    ${message.fromId ? `<span class="message-id">(${message.fromId})</span>` : ''}
                </div>
                <div class="message-time">
                    <i class="fas fa-clock"></i>
                    <span>${formattedDate}</span>
                </div>
            </div>
            <div class="message-content">
                <p>${message.message}</p>
            </div>
            <div class="message-actions">
                <button class="btn btn-sm" onclick="replyToMessage('${message.fromId}')">
                    <i class="fas fa-reply"></i> Reply
                </button>
                ${!message.read ? `
                <button class="btn btn-sm btn-primary" onclick="markAsRead('${message.id}')">
                    <i class="fas fa-check"></i> Mark as Read
                </button>
                ` : ''}
            </div>
        `;
        
        messagesList.appendChild(messageCard);
    });
    
    // Clear container and append new messages
    container.innerHTML = '';
    container.appendChild(messagesList);
}

// Update student announcements display
function updateStudentAnnouncements(announcements) {
    const container = document.getElementById('student-announcements-list');
    if (!container) return;
    
    if (announcements.length === 0) {
        container.innerHTML = '<div class="info-text">No announcements found.</div>';
        return;
    }
    
    // Sort announcements by timestamp (newest first)
    announcements.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    
    container.innerHTML = '';
    
    announcements.forEach(announcement => {
        const date = new Date(announcement.timestamp);
        const formattedDate = date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
        
        const card = document.createElement('div');
        card.className = `announcement-card ${announcement.important ? 'important' : ''}`;
        
        card.innerHTML = `
            <div class="announcement-header">
                <div class="announcement-title">
                    ${announcement.important ? '<i class="fas fa-exclamation-circle"></i> ' : ''}
                    ${announcement.title || 'Announcement'}
                </div>
                <div class="announcement-meta">
                    <span class="announcement-from">${announcement.from}</span>
                    <span class="announcement-time">${formattedDate}</span>
                </div>
            </div>
            <div class="announcement-content">
                <p>${announcement.message}</p>
            </div>
        `;
        
        container.appendChild(card);
    });
}

// Update student doubts display
function updateStudentDoubts(doubts) {
    const container = document.getElementById('doubt-response');
    if (!container) return;
    
    if (doubts.length === 0) {
        container.innerHTML = '<div class="info-text">You haven\'t asked any questions yet.</div>';
        return;
    }
    
    // Sort doubts by timestamp (newest first)
    doubts.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    
    container.innerHTML = '<h4>Your Questions</h4>';
    
    doubts.forEach(doubt => {
        const date = new Date(doubt.timestamp);
        const formattedDate = date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
        
        const card = document.createElement('div');
        card.className = `doubt-card ${doubt.status}`;
        
        let statusText = 'Pending';
        let statusIcon = 'clock';
        
        if (doubt.status === 'resolved') {
            statusText = 'Resolved';
            statusIcon = 'check-circle';
        }
        
        card.innerHTML = `
            <div class="doubt-header">
                <div class="doubt-status-${doubt.status}">
                    <i class="fas fa-${statusIcon}"></i> ${statusText}
                </div>
                <div class="doubt-time">${formattedDate}</div>
            </div>
            <div class="doubt-content">
                <div class="doubt-question">
                    <h5>Question:</h5>
                    <p>${doubt.question}</p>
                </div>
                ${doubt.answer ? `
                <div class="doubt-answer">
                    <h5>Answer:</h5>
                    <p>${doubt.answer}</p>
                </div>
                ` : ''}
            </div>
        `;
        
        container.appendChild(card);
    });
}

// Helper function to mark a message as read
async function markAsRead(messageId) {
    try {
        // In a real app, send to server
        // const response = await fetch(`/api/messages/${messageId}/read`, {
        //     method: 'PUT'
        // });
        
        // Simulate server response
        await simulateDelay(500);
        
        // Update the UI
        const messageCard = document.querySelector(`.message-card[data-id="${messageId}"]`);
        if (messageCard) {
            messageCard.classList.remove('unread');
            messageCard.classList.add('read');
            
            // Remove the mark as read button
            const markReadBtn = messageCard.querySelector('button[onclick^="markAsRead"]');
            if (markReadBtn) {
                markReadBtn.remove();
            }
        }
        
        showToast('Message marked as read', 'success');
        
    } catch (error) {
        console.error('Error marking message as read:', error);
        showToast('Failed to mark message as read', 'error');
    }
}

// Teacher Functions
async function loadTeacherData(section) {
    console.log(`Loading teacher data for section: ${section}`);
    
    // If no currentUser, don't attempt to load data
    if (!currentUser) {
        console.warn('No current user, cannot load teacher data');
        return;
    }
    
    const teacherId = currentUser.id;
    
    // Show loading state in the relevant container
    const containerMap = {
        'tasks': null, // This is a form section
        'submissions': 'teacher-assignments-list',
        'ocr-settings': null, // This is a form section
        'classes': null, // This is a form section
        'announcements': 'teacher-announcements-list',
        'messages': 'teacher-messages-list',
        'doubts': 'teacher-doubts-list',
        'analytics': null, // Multiple containers
        'students': 'students-list'
    };
    
    const containerId = containerMap[section];
    if (containerId) {
        const container = document.getElementById(containerId);
        if (container) {
            container.innerHTML = `
                <div class="loading-spinner">
                    <div class="spinner"></div>
                    <p>Loading ${section}...</p>
                </div>
            `;
        }
    }
    
    try {
        switch(section) {
            case 'tasks':
                // Nothing to load, just ensure form is reset
                const taskForm = document.querySelector('#teacher-tasks form');
                if (taskForm) taskForm.reset();
                break;
                
            case 'submissions':
                // Initialize filters
                const statusFilter = document.getElementById('submission-status-filter');
                const subjectFilter = document.getElementById('submission-subject-filter');
                
                if (statusFilter && !statusFilter.hasAttribute('data-initialized')) {
                    statusFilter.setAttribute('data-initialized', 'true');
                    statusFilter.addEventListener('change', searchStudentSubmissions);
                }
                
                if (subjectFilter && !subjectFilter.hasAttribute('data-initialized')) {
                    subjectFilter.setAttribute('data-initialized', 'true');
                    subjectFilter.addEventListener('change', searchStudentSubmissions);
                }
                
                // Clear previous searches
                const submissionsContainer = document.getElementById('teacher-assignments-list');
                if (submissionsContainer) {
                    submissionsContainer.innerHTML = '<div class="info-text">Enter a student ID to view their submissions.</div>';
                }
                break;
                
            case 'ocr-settings':
                initializeOcrSettingsForm();
                break;
                
            case 'classes':
                // Nothing to load, just ensure form is reset
                const classForm = document.querySelector('#teacher-classes form');
                if (classForm) classForm.reset();
                break;
                
            case 'announcements':
                // In a real app, fetch announcements from server
                // const announcementsResponse = await fetch(`/api/teacher/${teacherId}/announcements`);
                // const announcements = await announcementsResponse.json();
                
                // Simulate announcement form reset
                const announcementForm = document.querySelector('#teacher-announcements form');
                if (announcementForm) announcementForm.reset();
                
                // Simulate data for demo
                await simulateDelay(400);
                const announcements = [
                    { 
                        id: 'ann1', 
                        text: 'Final exam topics have been posted. Please review the syllabus.',
                        timestamp: new Date(Date.now() - 86400000).toISOString(), // 1 day ago
                        audience: 'All Students'
                    },
                    { 
                        id: 'ann2', 
                        text: 'Office hours will be extended next week for exam preparation.',
                        timestamp: new Date(Date.now() - 86400000 * 3).toISOString(), // 3 days ago
                        audience: 'Advanced Physics Students'
                    }
                ];
                
                updateTeacherAnnouncements(announcements);
                break;
                
            case 'messages':
                // In a real app, fetch messages from server
                // const messagesResponse = await fetch(`/api/teacher/${teacherId}/messages`);
                // const messages = await messagesResponse.json();
                
                // Simulate data for demo
                await simulateDelay(500);
                const messages = [
                    { 
                        id: 'msg1', 
                        from: 'John Smith', 
                        fromId: 'STU-1234',
                        message: 'I had a question about the homework assignment. Can we discuss during office hours?',
                        timestamp: new Date(Date.now() - 86400000).toISOString(), // 1 day ago
                        read: true
                    },
                    { 
                        id: 'msg2', 
                        from: 'Sarah Johnson', 
                        fromId: 'STU-5678',
                        message: 'Thank you for the feedback on my last paper. I\'ve incorporated your suggestions.',
                        timestamp: new Date(Date.now() - 3600000 * 5).toISOString(), // 5 hours ago
                        read: false
                    }
                ];
                
                updateTeacherMessages(messages);
                break;
                
            case 'doubts':
                // In a real app, fetch doubts from server
                // const doubtsResponse = await fetch(`/api/teacher/${teacherId}/doubts`);
                // const doubts = await doubtsResponse.json();
                
                // Simulate data for demo
                await simulateDelay(600);
                const doubts = [
                    { 
                        id: 'dbt1', 
                        student: 'John Smith',
                        studentId: 'STU-1234',
                        question: 'Can you explain how to solve the partial differential equation from last class?',
                        timestamp: new Date(Date.now() - 86400000 * 2).toISOString(), // 2 days ago
                        status: 'pending'
                    },
                    { 
                        id: 'dbt2', 
                        student: 'Maria Garcia',
                        studentId: 'STU-9012',
                        question: 'I\'m having trouble understanding how to interpret the results from our lab experiment.',
                        timestamp: new Date(Date.now() - 86400000 * 1).toISOString(), // 1 day ago
                        status: 'pending'
                    }
                ];
                
                updateTeacherDoubts(doubts);
                break;
                
            case 'analytics':
                // In a real app, fetch analytics from server
                // const analyticsResponse = await fetch(`/api/teacher/${teacherId}/analytics`);
                // const analytics = await analyticsResponse.json();
                
                // Simulate data for demo
                await simulateDelay(700);
                const analytics = {
                    totalStudents: 45,
                    activeAssignments: 3,
                    completionRate: 78,
                    averageGrade: 82,
                    studentEngagement: 'High'
                };
                
                updateTeacherAnalytics(analytics);
                break;
                
            case 'students':
                loadStudents();
                break;
                
            default:
                console.log('Unknown section:', section);
        }
    } catch (error) {
        console.error(`Error loading data for ${section}:`, error);
        const container = document.getElementById(containerMap[section]);
        if (container) {
            container.innerHTML = `<div class="error-message">Failed to load ${section}. Please try again.</div>`;
        }
    }
}

function updateTeacherAssignments(assignments) {
    const container = document.getElementById('teacher-assignments-list');
    if (!container) return;
    
    container.innerHTML = assignments.map(assignment => `
        <div class="card">
            <div class="card-header">
                <h4>${assignment.name}</h4>
                <span>Student: ${assignment.studentName}</span>
            </div>
            <div class="card-content">
                <p>${assignment.text}</p>
                <button class="small-btn" onclick="gradeSubmission('${assignment.id}')">Grade</button>
            </div>
        </div>
    `).join('');
}

function updateTeacherMessages(messages) {
    const container = document.getElementById('teacher-messages-list');
    if (!container) return;
    
    container.innerHTML = messages.map(message => `
        <div class="card">
            <div class="card-header">
                <h4>${message.senderId === currentUser.id ? 'Sent to: ' + (message.receiverName || message.receiverId) : 'From: ' + (message.senderName || message.senderId)}</h4>
                <span>${new Date(message.timestamp).toLocaleString()}</span>
            </div>
            <div class="card-content">
                <p>${message.text}</p>
                ${message.senderId !== currentUser.id ? `<button class="small-btn" onclick="replyToMessage('${message.senderId}')">Reply</button>` : ''}
            </div>
        </div>
    `).join('');
}

function updateTeacherAnnouncements(announcements) {
    const container = document.getElementById('teacher-announcements-list');
    if (!container) return;
    
    container.innerHTML = announcements
        .filter(a => a.teacherId === currentUser.id)
        .map(announcement => `
            <div class="card">
                <div class="card-header">
                    <h4>Your Announcement</h4>
                    <span>${new Date(announcement.timestamp).toLocaleString()}</span>
                </div>
                <div class="card-content">
                    <p>${announcement.text}</p>
                </div>
            </div>
        `).join('');
}

function updateTeacherDoubts(doubts) {
    const container = document.getElementById('teacher-doubts-list');
    if (!container) return;
    
    container.innerHTML = doubts.map(doubt => `
        <div class="card">
            <div class="card-header">
                <h4>Doubt from ${doubt.studentName || doubt.studentId}</h4>
                <span>Status: ${doubt.status}</span>
            </div>
            <div class="card-content">
                <p>${doubt.text}</p>
                ${doubt.status === 'pending' ? `<button class="small-btn" onclick="resolveDoubt('${doubt.id}')">Resolve</button>` : ''}
                <button class="small-btn" onclick="replyToStudent('${doubt.studentId}')">Reply</button>
            </div>
        </div>
    `).join('');
}

// Form Submission Functions
async function submitAssignment(event) {
    event.preventDefault();
    
    const nameInput = document.getElementById('assignment-name');
    const subjectSelect = document.getElementById('assignment-subject');
    const fileInput = document.getElementById('assignment-file');
    const submitButton = event.target.querySelector('button[type="submit"]');
    const spinner = submitButton.querySelector('.spinner');
    
    // Validate inputs
    if (!nameInput.value.trim()) {
        showToast('Please enter an assignment name', 'error');
        nameInput.focus();
        return;
    }
    
    if (!subjectSelect.value || subjectSelect.value === "") {
        showToast('Please select a subject', 'error');
        subjectSelect.focus();
        return;
    }
    
    if (!fileInput.files.length) {
        showToast('Please select a file to upload', 'error');
        return;
    }
    
    // Show loading state
    submitButton.disabled = true;
    spinner.classList.remove('hidden');
    
    try {
        // Create form data for file upload
        const formData = new FormData();
        formData.append('name', nameInput.value.trim());
        formData.append('subject', subjectSelect.value);
        formData.append('assignmentFile', fileInput.files[0]);
        formData.append('studentId', currentUser.id);
        
        // In a real application, you would send this to the server
        // const response = await fetch('/api/submit-assignment', {
        //     method: 'POST',
        //     body: formData
        // });
        
        // Simulate server response for demo
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Simulate OCR processing
        simulateOcrProcessing(fileInput.files[0]);
        
        // Reset form
        nameInput.value = '';
        subjectSelect.value = '';
        fileInput.value = '';
        
        // Clear preview
        const previewContainer = document.getElementById('upload-preview');
        if (previewContainer) {
            previewContainer.innerHTML = '';
        }
        
        // Show success message
        showToast('Assignment submitted successfully! OCR processing has started.', 'success');
        
        // Refresh assignments list
        loadStudentData('assignments');
        
    } catch (error) {
        console.error('Error submitting assignment:', error);
        showToast('Failed to submit assignment. Please try again.', 'error');
    } finally {
        // Reset button state
        submitButton.disabled = false;
        spinner.classList.add('hidden');
    }
}

// Simulate OCR processing for demo purposes
function simulateOcrProcessing(file) {
    // In a real application, this would be done on the server with actual OCR
    
    // Simulate reading the image and extracting text
    setTimeout(() => {
        // Create a simulated submission with OCR results
        const submission = {
            id: 'sub_' + Date.now(),
            name: document.getElementById('assignment-name').value,
            subject: document.getElementById('assignment-subject').value,
            studentId: currentUser.id,
            studentName: currentUser.name,
            submittedAt: new Date().toISOString(),
            status: 'auto-graded',
            grade: Math.floor(Math.random() * 31) + 70, // Random grade between 70-100
            ocrResults: {
                extractedText: "This is a simulated OCR extraction of the handwritten text.",
                detectedKeywords: [
                    { keyword: "formula", matched: true },
                    { keyword: "equation", matched: true },
                    { keyword: "velocity", matched: false },
                    { keyword: "calculation", matched: true }
                ],
                confidence: 0.87
            },
            feedback: "Automatically graded. Good understanding of concepts. Make sure to include more detailed explanations."
        };
        
        // In a real app, this would be saved to the database
        
        // Update the UI to show the graded assignment
        const assignmentsList = document.getElementById('student-assignments-list');
        if (assignmentsList) {
            const submissionCard = createSubmissionCard(submission, 'student');
            assignmentsList.appendChild(submissionCard);
        }
        
        // Update grades display
        updateGradesDisplay();
        
        // Show notification
        showToast('Your assignment has been automatically graded!', 'success');
        
    }, 5000); // Simulate processing time
}

// Create a submission card for display
function createSubmissionCard(submission, userType = 'student') {
    const card = document.createElement('div');
    card.className = 'submission-card';
    card.id = `submission-${submission.id}`;
    
    const header = document.createElement('div');
    header.className = 'submission-header';
    
    const title = document.createElement('div');
    title.className = 'submission-title';
    title.textContent = submission.name;
    
    const status = document.createElement('div');
    status.className = `submission-status status-${submission.status.toLowerCase().replace(' ', '-')}`;
    status.textContent = submission.status.charAt(0).toUpperCase() + submission.status.slice(1);
    
    header.appendChild(title);
    header.appendChild(status);
    card.appendChild(header);
    
    // Information grid
    const info = document.createElement('div');
    info.className = 'submission-info';
    
    // Subject
    const subjectItem = document.createElement('div');
    subjectItem.className = 'submission-info-item';
    const subjectLabel = document.createElement('div');
    subjectLabel.className = 'submission-info-label';
    subjectLabel.textContent = 'Subject';
    const subjectValue = document.createElement('div');
    subjectValue.className = 'submission-info-value';
    subjectValue.textContent = submission.subject;
    subjectItem.appendChild(subjectLabel);
    subjectItem.appendChild(subjectValue);
    info.appendChild(subjectItem);
    
    // Date
    const dateItem = document.createElement('div');
    dateItem.className = 'submission-info-item';
    const dateLabel = document.createElement('div');
    dateLabel.className = 'submission-info-label';
    dateLabel.textContent = 'Submitted';
    const dateValue = document.createElement('div');
    dateValue.className = 'submission-info-value';
    const date = new Date(submission.submittedAt);
    dateValue.textContent = date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
    dateItem.appendChild(dateLabel);
    dateItem.appendChild(dateValue);
    info.appendChild(dateItem);
    
    // Grade if available
    if (submission.grade) {
        const gradeItem = document.createElement('div');
        gradeItem.className = 'submission-info-item';
        const gradeLabel = document.createElement('div');
        gradeLabel.className = 'submission-info-label';
        gradeLabel.textContent = 'Grade';
        const gradeValue = document.createElement('div');
        gradeValue.className = 'submission-info-value';
        gradeValue.textContent = submission.grade + '/100';
        gradeItem.appendChild(gradeLabel);
        gradeItem.appendChild(gradeValue);
        info.appendChild(gradeItem);
    }
    
    card.appendChild(info);
    
    // OCR Results if available and auto-graded
    if (submission.ocrResults && userType === 'student' && submission.status === 'auto-graded') {
        const ocrSection = document.createElement('div');
        ocrSection.className = 'ocr-results';
        
        const ocrTitle = document.createElement('h4');
        ocrTitle.innerHTML = '<i class="fas fa-robot"></i> OCR Analysis Results';
        ocrSection.appendChild(ocrTitle);
        
        const ocrText = document.createElement('div');
        ocrText.className = 'ocr-text';
        ocrText.textContent = submission.ocrResults.extractedText;
        ocrSection.appendChild(ocrText);
        
        // Keywords section
        if (submission.ocrResults.detectedKeywords && submission.ocrResults.detectedKeywords.length > 0) {
            const keywordsContainer = document.createElement('div');
            keywordsContainer.className = 'detected-keywords';
            
            const keywordsTitle = document.createElement('h5');
            keywordsTitle.textContent = 'Detected Keywords:';
            keywordsContainer.appendChild(keywordsTitle);
            
            submission.ocrResults.detectedKeywords.forEach(keyword => {
                const keywordChip = document.createElement('span');
                keywordChip.className = `keyword-chip ${keyword.matched ? 'matched-keyword' : 'missed-keyword'}`;
                keywordChip.textContent = keyword.keyword;
                keywordsContainer.appendChild(keywordChip);
            });
            
            ocrSection.appendChild(keywordsContainer);
        }
        
        card.appendChild(ocrSection);
    }
    
    // Feedback if available
    if (submission.feedback) {
        const feedbackSection = document.createElement('div');
        feedbackSection.className = 'submission-feedback';
        feedbackSection.innerHTML = `<h4><i class="fas fa-comment"></i> Feedback</h4><p>${submission.feedback}</p>`;
        card.appendChild(feedbackSection);
    }
    
    // Buttons for actions based on user type and status
    const actions = document.createElement('div');
    actions.className = 'submission-actions';
    
    if (userType === 'student') {
        const viewBtn = document.createElement('button');
        viewBtn.className = 'btn btn-primary';
        viewBtn.innerHTML = '<i class="fas fa-eye"></i> View Submission';
        viewBtn.addEventListener('click', () => viewSubmission(submission.id));
        actions.appendChild(viewBtn);
    } else if (userType === 'teacher') {
        // For teacher view
        if (submission.status === 'pending' || submission.status === 'auto-graded') {
            const gradeBtn = document.createElement('button');
            gradeBtn.className = 'btn btn-primary';
            gradeBtn.innerHTML = '<i class="fas fa-check"></i> Grade Submission';
            gradeBtn.addEventListener('click', () => gradeSubmission(submission.id));
            actions.appendChild(gradeBtn);
        }
        
        const viewBtn = document.createElement('button');
        viewBtn.className = 'btn btn-primary';
        viewBtn.innerHTML = '<i class="fas fa-eye"></i> View Submission';
        viewBtn.addEventListener('click', () => viewSubmission(submission.id, 'teacher'));
        actions.appendChild(viewBtn);
    }
    
    card.appendChild(actions);
    
    return card;
}

// Show toast notification
function showToast(message, type = 'info') {
    // Check if toast container exists, create if not
    let toastContainer = document.querySelector('.toast-container');
    if (!toastContainer) {
        toastContainer = document.createElement('div');
        toastContainer.className = 'toast-container';
        document.body.appendChild(toastContainer);
    }
    
    // Create toast element
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `
        <div class="toast-icon">
            <i class="fas fa-${type === 'error' ? 'exclamation-circle' : type === 'success' ? 'check-circle' : 'info-circle'}"></i>
        </div>
        <div class="toast-message">${message}</div>
    `;
    
    // Add to container
    toastContainer.appendChild(toast);
    
    // Animate in
    setTimeout(() => {
        toast.classList.add('show');
    }, 10);
    
    // Remove after delay
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => {
            toast.remove();
        }, 300);
    }, 5000);
}

// Update grades display
function updateGradesDisplay() {
    // This would fetch the actual grades from the server in a real app
    
    // Simulate some grades for demo
    const grades = [
        { subject: 'Mathematics', grade: 85 },
        { subject: 'Science', grade: 92 },
        { subject: 'English', grade: 78 },
        { subject: 'History', grade: 88 }
    ];
    
    // Calculate average
    const average = grades.reduce((total, grade) => total + grade.grade, 0) / grades.length;
    
    // Update overview grade circle
    const overallGradeElement = document.getElementById('overall-grade');
    if (overallGradeElement) {
        overallGradeElement.textContent = Math.round(average);
    }
    
    // Update completed assignments
    const completedElement = document.getElementById('completed-assignments');
    if (completedElement) {
        completedElement.textContent = grades.length;
    }
    
    // Update total assignments
    const totalElement = document.getElementById('total-grade-assignments');
    if (totalElement) {
        totalElement.textContent = grades.length + 2; // Assuming 2 pending
    }
    
    // Update average score
    const averageElement = document.getElementById('average-grade-score');
    if (averageElement) {
        averageElement.textContent = Math.round(average);
    }
    
    // Update grades list
    const gradesList = document.getElementById('student-grades-list');
    if (gradesList) {
        gradesList.innerHTML = '';
        
        grades.forEach(grade => {
            const gradeCard = document.createElement('div');
            gradeCard.className = 'grade-item';
            gradeCard.innerHTML = `
                <div class="grade-subject">${grade.subject}</div>
                <div class="grade-value">${grade.grade}/100</div>
                <div class="grade-bar">
                    <div class="grade-progress" style="width: ${grade.grade}%"></div>
                </div>
            `;
            gradesList.appendChild(gradeCard);
        });
    }
}

// Function to look up a user by ID
async function lookupReceiverById(userType = 'teacher') {
    const isTeacher = userType === 'teacher';
    const receiverId = document.getElementById(isTeacher ? 'teacher-receiver-id' : 'student-receiver-id').value.trim();
    const receiverInfo = document.getElementById(isTeacher ? 'teacher-receiver-info' : 'student-receiver-info');
    
    if (!receiverId) {
        receiverInfo.textContent = 'Please enter a receiver ID';
        receiverInfo.classList.add('error');
        return;
    }
    
    try {
        receiverInfo.textContent = 'Looking up...';
        receiverInfo.classList.remove('error', 'success');
        
        const isStudentId = receiverId.startsWith('STU-');
        const isTeacherId = receiverId.startsWith('TCH-');
        let endpoint;
        
        if (isStudentId) {
            endpoint = `/api/students/${receiverId}`;
        } else if (isTeacherId) {
            endpoint = `/api/teachers/${receiverId}`;
        } else {
            throw new Error('Invalid ID format');
        }
        
        const response = await fetch(endpoint);
        
        if (!response.ok) {
            throw new Error('User not found');
        }
        
        const userData = await response.json();
        
        receiverInfo.innerHTML = `<span class="highlight">Found:</span> ${userData.name} (${userData.role}) from ${userData.college}`;
        receiverInfo.classList.add('success');
        
        // Enable send button
        document.getElementById(isTeacher ? 'teacher-send-message-btn' : 'student-send-message-btn').disabled = false;
    } catch (error) {
        receiverInfo.textContent = error.message || 'User lookup failed';
        receiverInfo.classList.add('error');
        
        // Disable send button
        document.getElementById(isTeacher ? 'teacher-send-message-btn' : 'student-send-message-btn').disabled = true;
    }
}

// Message Functions
async function handleSendMessage(event) {
    event.preventDefault();
    
    // Determine if this is from teacher or student form
    const isTeacherForm = event.target.id === 'teacher-send-message-form';
    const spinner = document.querySelector(`#${isTeacherForm ? 'teacher' : 'student'}-send-message-btn .spinner`);
    const receiverIdElement = document.getElementById(isTeacherForm ? 'teacher-receiver-id' : 'student-receiver-id');
    const messageElement = document.getElementById(isTeacherForm ? 'teacher-message' : 'student-message');
    const messageStatus = document.getElementById(isTeacherForm ? 'teacher-message-status' : 'student-message-status');
    
    spinner.classList.remove('hidden');
    
    try {
        const receiverId = receiverIdElement.value.trim();
        if (!receiverId) {
            alert('Please enter a receiver ID');
            spinner.classList.add('hidden');
            return;
        }
        
        // First validate if the receiver ID exists
        const isStudent = receiverId.startsWith('STU-');
        const isTeacher = receiverId.startsWith('TCH-');
        
        let receiverData;
        
        if (isStudent) {
            const response = await fetch(`/api/students/${receiverId}`);
            if (!response.ok) {
                throw new Error('Student not found');
            }
            receiverData = await response.json();
        } else if (isTeacher) {
            const response = await fetch(`/api/teachers/${receiverId}`);
            if (!response.ok) {
                throw new Error('Teacher not found');
            }
            receiverData = await response.json();
        } else {
            throw new Error('Invalid receiver ID format');
        }
        
        const messageText = messageElement.value;
        
        // Create message object
        const message = {
            senderId: currentUser.id,
            senderName: currentUser.name,
            senderRole: currentUser.role,
            senderUniqueId: currentUser.uniqueId,
            receiverId: receiverData.id,
            receiverName: receiverData.name,
            receiverRole: isStudent ? 'student' : 'teacher',
            receiverUniqueId: receiverId,
            text: messageText,
            timestamp: Date.now(),
            read: false
        };

        // Send message to server
        const response = await fetch('/api/messages', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(message)
        });

        if (response.ok) {
            // Clear form and show success message
            event.target.reset();
            
            // Emit socket event
            socket.emit('message', message);
            
            // Show success message with animation
            messageStatus.textContent = `Message sent to ${receiverData.name} successfully!`;
            messageStatus.classList.add('success');
            messageStatus.classList.add('fade-in');
            
            // Refresh messages
            if (currentRole === 'student') {
                loadStudentMessages();
            } else {
                loadTeacherMessages();
            }
            
            // Clear success message after delay
            setTimeout(() => {
                messageStatus.classList.remove('fade-in');
                messageStatus.classList.add('fade-out');
                setTimeout(() => {
                    messageStatus.textContent = '';
                    messageStatus.classList.remove('success', 'fade-out');
                }, 500);
            }, 3000);
        } else {
            const data = await response.json();
            throw new Error(data.error || 'Failed to send message');
        }
    } catch (error) {
        console.error('Message error:', error);
        messageStatus.textContent = error.message || 'Failed to send message';
        messageStatus.classList.add('error');
        shakeElement(event.target);
        
        // Clear error message after delay
        setTimeout(() => {
            messageStatus.classList.remove('error');
            messageStatus.textContent = '';
        }, 3000);
    } finally {
        spinner.classList.add('hidden');
    }
}

// UI Enhancement Functions
function addMessageEventListeners() {
    // Add event listener for receiver ID lookup
    const teacherReceiverIdInput = document.getElementById('teacher-receiver-id');
    if (teacherReceiverIdInput) {
        teacherReceiverIdInput.addEventListener('blur', () => lookupReceiverById('teacher'));
        
        // Add keypress event for better UX
        teacherReceiverIdInput.addEventListener('keypress', function(event) {
            if (event.key === 'Enter') {
                event.preventDefault();
                lookupReceiverById('teacher');
            }
        });
    }
    
    const studentReceiverIdInput = document.getElementById('student-receiver-id');
    if (studentReceiverIdInput) {
        studentReceiverIdInput.addEventListener('blur', () => lookupReceiverById('student'));
        
        // Add keypress event for better UX
        studentReceiverIdInput.addEventListener('keypress', function(event) {
            if (event.key === 'Enter') {
                event.preventDefault();
                lookupReceiverById('student');
            }
        });
    }
    
    // Add event listener for send message forms
    const teacherSendMessageForm = document.getElementById('teacher-send-message-form');
    if (teacherSendMessageForm) {
        teacherSendMessageForm.addEventListener('submit', handleSendMessage);
    }
    
    const studentSendMessageForm = document.getElementById('student-send-message-form');
    if (studentSendMessageForm) {
        studentSendMessageForm.addEventListener('submit', handleSendMessage);
    }
}

// Event Listeners
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM loaded, initializing application...');
    
    // Initialize UI elements
    console.log('Setting up event listeners for UI elements');
    
    // Home screen buttons
    const homeButtons = document.querySelectorAll('#home-screen button');
    homeButtons.forEach(button => {
        button.addEventListener('click', function() {
            console.log('Home screen button clicked:', this.textContent.trim());
        });
    });
    
    // Register form
    console.log('Looking for register form...');
    const registerForm = document.getElementById('register-form');
    if (registerForm) {
        console.log('Register form found, attaching event listener');
        registerForm.addEventListener('submit', function(event) {
            console.log('Register form submitted');
            event.preventDefault();
            
            // Disable the submit button to prevent double-submissions
            const submitButton = this.querySelector('button[type="submit"]');
            if (submitButton) {
                submitButton.disabled = true;
                setTimeout(() => {
                    submitButton.disabled = false;
                }, 2000);
            }
            
            handleRegister(event);
        });
    } else {
        console.error('Register form not found in DOM');
    }

    // Login form
    console.log('Looking for login form...');
    const loginForm = document.getElementById('login-form');
    if (loginForm) {
        console.log('Login form found, attaching event listener');
        loginForm.addEventListener('submit', function(event) {
            console.log('Login form submitted');
            event.preventDefault();
            
            // Disable the submit button to prevent double-submissions
            const submitButton = this.querySelector('button[type="submit"]');
            if (submitButton) {
                submitButton.disabled = true;
                setTimeout(() => {
                    submitButton.disabled = false;
                }, 2000);
            }
            
            handleLogin(event);
        });
    } else {
        console.error('Login form not found in DOM');
    }
    
    // Test authentication mechanisms on startup
    console.log('Testing authentication mechanisms...');
    checkServerConnection().then(isConnected => {
        if (isConnected) {
            console.log('Server connection test successful');
        } else {
            console.error('Server connection test failed');
        }
    });
    
    // Initialize functionality
    initializeChat();
    initializeUI();

    // Add message event listeners
    addMessageEventListeners();
});

// Initialize UI elements
function initializeUI() {
    // Add click event listeners for card headers
    document.querySelectorAll('.card-header').forEach(header => {
        header.addEventListener('click', function() {
            const cardContent = this.nextElementSibling;
            if (cardContent) {
                // Toggle display
                if (cardContent.style.display === 'none' || !cardContent.style.display) {
                    cardContent.style.display = 'block';
                    this.classList.add('active');
                } else {
                    cardContent.style.display = 'none';
                    this.classList.remove('active');
                }
            }
        });
    });

    // Initialize all card contents to be displayed by default
    document.querySelectorAll('.card-content').forEach(content => {
        content.style.display = 'block';
    });
}

// Search functions for teacher dashboard
function searchStudentMessages() {
    const studentId = document.getElementById('student-id-search').value.trim();
    if (!studentId) {
        alert('Please enter a student ID');
        return;
    }

    // Filter messages by student ID and display them
    fetch('/messages')
        .then(res => res.json())
        .then(messages => {
            const filteredMessages = messages.filter(msg => 
                msg.senderId === studentId || msg.receiverId === studentId
            );
            updateTeacherMessages(filteredMessages, studentId);
        })
        .catch(error => {
            console.error('Error fetching messages:', error);
            alert('Failed to fetch messages');
        });
}

function updateTeacherMessages(messages, filterStudentId = null) {
    const container = document.getElementById('teacher-messages-list');
    if (!container) return;
    
    if (messages.length === 0) {
        container.innerHTML = '<p class="no-results">No messages found.</p>';
        return;
    }
    
    let filteredMessages = messages;
    if (filterStudentId) {
        filteredMessages = messages.filter(m => 
            m.senderId === filterStudentId || m.receiverId === filterStudentId
        );
    }
    
    container.innerHTML = filteredMessages.map(message => `
        <div class="card">
            <div class="card-header">
                <h4>${message.senderId === currentUser.id ? 'Sent to: ' + (message.receiverName || message.receiverId) : 'From: ' + (message.senderName || message.senderId)}</h4>
                <span>${new Date(message.timestamp).toLocaleString()}</span>
            </div>
            <div class="card-content">
                <p>${message.text}</p>
                ${message.senderId !== currentUser.id ? `<button class="small-btn" onclick="replyToMessage('${message.senderId}')">Reply</button>` : ''}
            </div>
        </div>
    `).join('');
}

function replyToMessage(studentId) {
    // Set the receiver ID in the form
    const receiverIdInput = document.getElementById('receiver-id');
    if (receiverIdInput) {
        receiverIdInput.value = studentId;
        // Focus on the message textarea
        document.getElementById('teacher-message-text').focus();
    }
}

function searchStudentDoubts() {
    const studentId = document.getElementById('doubt-student-id-search').value.trim();
    if (!studentId) {
        alert('Please enter a student ID');
        return;
    }

    // Filter doubts by student ID and display them
    fetch('/doubts')
        .then(res => res.json())
        .then(doubts => {
            const filteredDoubts = doubts.filter(doubt => doubt.studentId === studentId);
            updateTeacherDoubts(filteredDoubts, studentId);
        })
        .catch(error => {
            console.error('Error fetching doubts:', error);
            alert('Failed to fetch doubts');
        });
}

function updateTeacherDoubts(doubts, filterStudentId = null) {
    const container = document.getElementById('teacher-doubts-list');
    if (!container) return;
    
    if (doubts.length === 0) {
        container.innerHTML = '<p class="no-results">No doubts found.</p>';
        return;
    }
    
    let filteredDoubts = doubts;
    if (filterStudentId) {
        filteredDoubts = doubts.filter(d => d.studentId === filterStudentId);
    }
    
    container.innerHTML = filteredDoubts.map(doubt => `
        <div class="card">
            <div class="card-header">
                <h4>Doubt from ${doubt.studentName || doubt.studentId}</h4>
                <span>Status: ${doubt.status}</span>
            </div>
            <div class="card-content">
                <p>${doubt.text}</p>
                ${doubt.status === 'pending' ? `<button class="small-btn" onclick="resolveDoubt('${doubt.id}')">Resolve</button>` : ''}
                <button class="small-btn" onclick="replyToStudent('${doubt.studentId}')">Reply</button>
            </div>
        </div>
    `).join('');
}

function replyToStudent(studentId) {
    // Switch to messages tab
    showTeacherSection('messages');
    
    // Set the receiver ID in the form
    const receiverIdInput = document.getElementById('receiver-id');
    if (receiverIdInput) {
        receiverIdInput.value = studentId;
        // Focus on the message textarea
        document.getElementById('teacher-message-text').focus();
    }
}

async function resolveDoubt(doubtId) {
    try {
        const response = await fetch(`/api/doubts/${doubtId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ status: 'resolved' })
        });
        
        if (response.ok) {
            // Refresh the doubts list
            loadTeacherData('doubts');
        } else {
            alert('Failed to resolve doubt');
        }
    } catch (error) {
        console.error('Error resolving doubt:', error);
        alert('Error resolving doubt');
    }
}

// Utility function to add shake animation to element
function shakeElement(element) {
    element.classList.add('shake');
    setTimeout(() => {
        element.classList.remove('shake');
    }, 500);
}

// Function to search student submissions
function searchStudentSubmissions() {
    const searchInput = document.getElementById('submission-student-id-search');
    const statusFilter = document.getElementById('submission-status-filter');
    const subjectFilter = document.getElementById('submission-subject-filter');
    
    if (!searchInput) return;
    
    const studentId = searchInput.value.trim();
    const status = statusFilter ? statusFilter.value : 'all';
    const subject = subjectFilter ? subjectFilter.value : 'all';
    
    // In a real app, this would make an API request with the filters
    // For demo purposes, we'll simulate it
    
    const submissionsContainer = document.getElementById('teacher-assignments-list');
    
    if (!submissionsContainer) return;
    
    // Show loading state
    submissionsContainer.innerHTML = `
        <div class="loading-spinner">
            <div class="spinner"></div>
            <p>Searching submissions...</p>
        </div>
    `;
    
    setTimeout(() => {
        // Simulate fetching submissions
        let submissions = [
            {
                id: 'sub_123',
                name: 'Physics Assignment 1',
                subject: 'science',
                studentId: 'STU-1234',
                studentName: 'John Doe',
                submittedAt: '2023-10-15T14:30:00Z',
                status: 'pending',
                ocrResults: {
                    extractedText: "This is a simulated OCR extraction of the handwritten text for assignment 1.",
                    detectedKeywords: [
                        { keyword: "formula", matched: true },
                        { keyword: "equation", matched: false }
                    ],
                    confidence: 0.82
                }
            },
            {
                id: 'sub_124',
                name: 'Math Homework',
                subject: 'mathematics',
                studentId: 'STU-2345',
                studentName: 'Jane Smith',
                submittedAt: '2023-10-16T10:15:00Z',
                status: 'auto-graded',
                grade: 85,
                ocrResults: {
                    extractedText: "This is a simulated OCR extraction of the handwritten text for math homework.",
                    detectedKeywords: [
                        { keyword: "theorem", matched: true },
                        { keyword: "proof", matched: true },
                        { keyword: "equation", matched: true }
                    ],
                    confidence: 0.91
                },
                feedback: "Good work on the proofs. Make sure to show all steps in your calculations."
            },
            {
                id: 'sub_125',
                name: 'English Essay',
                subject: 'english',
                studentId: 'STU-1234',
                studentName: 'John Doe',
                submittedAt: '2023-10-14T09:45:00Z',
                status: 'graded',
                grade: 92,
                ocrResults: {
                    extractedText: "This is a simulated OCR extraction of the handwritten text for English essay.",
                    detectedKeywords: [
                        { keyword: "analysis", matched: true },
                        { keyword: "character", matched: true },
                        { keyword: "theme", matched: true }
                    ],
                    confidence: 0.88
                },
                feedback: "Excellent analysis of the characters and themes. Your writing shows deep understanding."
            }
        ];
        
        // Filter submissions based on search criteria
        if (studentId) {
            submissions = submissions.filter(sub => sub.studentId.includes(studentId));
        }
        
        if (status && status !== 'all') {
            submissions = submissions.filter(sub => sub.status === status);
        }
        
        if (subject && subject !== 'all') {
            submissions = submissions.filter(sub => sub.subject === subject);
        }
        
        // Clear loading state
        submissionsContainer.innerHTML = '';
        
        if (submissions.length === 0) {
            submissionsContainer.innerHTML = '<div class="no-results">No submissions found matching your search criteria.</div>';
            return;
        }
        
        // Create submission cards
        submissions.forEach(submission => {
            const submissionCard = createSubmissionCard(submission, 'teacher');
            submissionsContainer.appendChild(submissionCard);
        });
        
    }, 1000); // Simulate API delay
}

// Function to grade a submission
function gradeSubmission(submissionId) {
    // In a real app, this would open a grading interface
    // For demo purposes, we'll just show a modal dialog
    
    // Find the submission card
    const submissionCard = document.getElementById(`submission-${submissionId}`);
    
    if (!submissionCard) return;
    
    // Check if grading section already exists
    let gradingSection = submissionCard.querySelector('.submission-grading');
    
    if (gradingSection) {
        // Toggle visibility if it exists
        gradingSection.style.display = gradingSection.style.display === 'none' ? 'block' : 'none';
        return;
    }
    
    // Create grading section
    gradingSection = document.createElement('div');
    gradingSection.className = 'submission-grading';
    gradingSection.innerHTML = `
        <h4><i class="fas fa-check-circle"></i> Grade Submission</h4>
        
        <div class="grade-input">
            <label for="grade-${submissionId}">Score:</label>
            <input type="number" id="grade-${submissionId}" min="0" max="100" value="85">
            <span>/100</span>
        </div>
        
        <div class="feedback-input">
            <label for="feedback-${submissionId}">Feedback:</label>
            <textarea id="feedback-${submissionId}" placeholder="Provide feedback to the student..."></textarea>
        </div>
        
        <div class="submission-actions" style="margin-top: 15px;">
            <button class="btn btn-primary" onclick="submitGrade('${submissionId}')">
                <i class="fas fa-save"></i> Save Grade
            </button>
            <button class="btn" onclick="document.querySelector('.submission-grading').style.display='none'">
                <i class="fas fa-times"></i> Cancel
            </button>
        </div>
    `;
    
    submissionCard.appendChild(gradingSection);
}

// Function to submit a grade
function submitGrade(submissionId) {
    const gradeInput = document.getElementById(`grade-${submissionId}`);
    const feedbackInput = document.getElementById(`feedback-${submissionId}`);
    
    if (!gradeInput || !feedbackInput) return;
    
    const grade = parseInt(gradeInput.value);
    const feedback = feedbackInput.value.trim();
    
    if (isNaN(grade) || grade < 0 || grade > 100) {
        showToast('Please enter a valid grade between 0 and 100', 'error');
        return;
    }
    
    // In a real app, this would send the grade to the server
    // For demo purposes, we'll just update the UI
    
    const submissionCard = document.getElementById(`submission-${submissionId}`);
    
    if (!submissionCard) return;
    
    // Update status
    const statusElement = submissionCard.querySelector('.submission-status');
    if (statusElement) {
        statusElement.className = 'submission-status status-graded';
        statusElement.textContent = 'Graded';
    }
    
    // Update or add grade info
    let gradeInfoItem = submissionCard.querySelector('.submission-info-item:nth-child(3)');
    
    if (!gradeInfoItem) {
        const infoSection = submissionCard.querySelector('.submission-info');
        
        if (infoSection) {
            gradeInfoItem = document.createElement('div');
            gradeInfoItem.className = 'submission-info-item';
            
            const gradeLabel = document.createElement('div');
            gradeLabel.className = 'submission-info-label';
            gradeLabel.textContent = 'Grade';
            
            const gradeValue = document.createElement('div');
            gradeValue.className = 'submission-info-value';
            gradeValue.textContent = `${grade}/100`;
            
            gradeInfoItem.appendChild(gradeLabel);
            gradeInfoItem.appendChild(gradeValue);
            
            infoSection.appendChild(gradeInfoItem);
        }
    } else {
        const gradeValue = gradeInfoItem.querySelector('.submission-info-value');
        if (gradeValue) {
            gradeValue.textContent = `${grade}/100`;
        }
    }
    
    // Update or add feedback
    let feedbackSection = submissionCard.querySelector('.submission-feedback');
    
    if (!feedbackSection) {
        feedbackSection = document.createElement('div');
        feedbackSection.className = 'submission-feedback';
        feedbackSection.innerHTML = `<h4><i class="fas fa-comment"></i> Feedback</h4><p>${feedback}</p>`;
        
        // Insert before actions
        const actionsSection = submissionCard.querySelector('.submission-actions');
        submissionCard.insertBefore(feedbackSection, actionsSection);
    } else {
        feedbackSection.querySelector('p').textContent = feedback;
    }
    
    // Remove grading section
    const gradingSection = submissionCard.querySelector('.submission-grading');
    if (gradingSection) {
        gradingSection.remove();
    }
    
    // Show success message
    showToast('Grade submitted successfully', 'success');
}

// Function to view a submission
function viewSubmission(submissionId, userType = 'student') {
    // In a real app, this would open a detailed view
    // For demo purposes, we'll just log to console
    console.log(`Viewing submission ${submissionId} as ${userType}`);
    
    // Show a toast message
    showToast('Viewing submission details would open in a modal in the full application', 'info');
}

// Initialize OCR settings form
function initializeOcrSettingsForm() {
    const form = document.getElementById('ocr-settings-form');
    const thresholdInput = document.getElementById('review-threshold');
    const thresholdValue = document.getElementById('threshold-value');
    
    if (!form || !thresholdInput || !thresholdValue) return;
    
    // Update threshold value display
    thresholdInput.addEventListener('input', function() {
        thresholdValue.textContent = `${this.value}%`;
    });
    
    // Handle form submission
    form.addEventListener('submit', function(event) {
        event.preventDefault();
        
        // Get form values
        const ocrMode = document.getElementById('default-ocr-mode').value;
        const tolerance = document.getElementById('default-tolerance').value;
        const autoFeedback = document.getElementById('auto-feedback').checked;
        const threshold = thresholdInput.value;
        
        // In a real app, this would save the settings to the server
        
        // Show success message
        showToast('OCR settings saved successfully', 'success');
    });
    
    // Initialize tabs for subject keywords
    const tabs = document.querySelectorAll('.tab');
    const tabContents = document.querySelectorAll('.tab-content');
    
    tabs.forEach(tab => {
        tab.addEventListener('click', function() {
            // Remove active class from all tabs
            tabs.forEach(t => t.classList.remove('active'));
            
            // Add active class to clicked tab
            this.classList.add('active');
            
            // Show corresponding tab content
            const subject = this.getAttribute('data-subject');
            
            tabContents.forEach(content => {
                content.classList.remove('active');
            });
            
            document.getElementById(`${subject}-keywords`).classList.add('active');
        });
    });
}

// Load the list of students for the teacher
async function loadStudents() {
    const studentsContainer = document.getElementById('students-list');
    
    if (!studentsContainer) return;
    
    // Show loading state
    studentsContainer.innerHTML = `
        <div class="loading-spinner">
            <div class="spinner"></div>
            <p>Loading students...</p>
        </div>
    `;
    
    try {
        // In a real app, fetch students from the server
        // const response = await fetch('/api/students', {
        //     headers: {
        //         'Authorization': `Bearer ${localStorage.getItem('token')}`
        //     }
        // });
        // const data = await response.json();
        
        // Simulate fetching students for demo
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        const students = [
            { id: 'STU-1234', name: 'John Doe', college: 'ABC University', status: 'active', completionRate: 85 },
            { id: 'STU-2345', name: 'Jane Smith', college: 'XYZ College', status: 'active', completionRate: 92 },
            { id: 'STU-3456', name: 'Mike Johnson', college: 'ABC University', status: 'inactive', completionRate: 65 },
            { id: 'STU-4567', name: 'Sarah Williams', college: 'DEF Institute', status: 'active', completionRate: 78 },
            { id: 'STU-5678', name: 'Alex Brown', college: 'XYZ College', status: 'active', completionRate: 88 }
        ];
        
        // Clear loading state
        studentsContainer.innerHTML = '';
        
        if (students.length === 0) {
            studentsContainer.innerHTML = '<div class="no-results">No students found</div>';
            return;
        }
        
        // Create student cards
        students.forEach(student => {
            const studentCard = createStudentCard(student);
            studentsContainer.appendChild(studentCard);
        });
        
        // Initialize student performance chart
        initializeStudentPerformanceChart(students);
        
    } catch (error) {
        console.error('Error loading students:', error);
        studentsContainer.innerHTML = '<div class="no-results">Failed to load students. Please try again.</div>';
    }
}

// Create a student card
function createStudentCard(student) {
    const card = document.createElement('div');
    card.className = 'student-card';
    
    // Create student info section
    const info = document.createElement('div');
    info.className = 'student-info';
    
    // Avatar with initials
    const avatar = document.createElement('div');
    avatar.className = 'student-avatar';
    const initials = student.name.split(' ').map(n => n[0]).join('').toUpperCase();
    avatar.textContent = initials;
    
    // Student details
    const details = document.createElement('div');
    details.className = 'student-details';
    details.innerHTML = `
        <div class="student-name">${student.name}</div>
        <div class="student-id">${student.id}</div>
    `;
    
    info.appendChild(avatar);
    info.appendChild(details);
    
    // Create actions section
    const actions = document.createElement('div');
    actions.className = 'student-actions';
    
    // Message button
    const messageBtn = document.createElement('button');
    messageBtn.innerHTML = '<i class="fas fa-envelope"></i>';
    messageBtn.title = 'Send Message';
    messageBtn.addEventListener('click', () => {
        // Set the student ID in the message form
        const receiverInput = document.getElementById('teacher-receiver-id');
        if (receiverInput) {
            receiverInput.value = student.id;
            // Trigger the lookup to update the info
            lookupReceiverById('teacher');
        }
        // Switch to messages tab
        showTeacherSection('messages');
    });
    actions.appendChild(messageBtn);
    
    // Assign task button
    const assignBtn = document.createElement('button');
    assignBtn.innerHTML = '<i class="fas fa-tasks"></i>';
    assignBtn.title = 'Assign Task';
    assignBtn.addEventListener('click', () => {
        // Set the student ID in the task form
        const studentIdInput = document.getElementById('task-student-id');
        if (studentIdInput) {
            studentIdInput.value = student.id;
        }
        // Switch to tasks tab
        showTeacherSection('tasks');
    });
    actions.appendChild(assignBtn);
    
    // View submissions button
    const viewBtn = document.createElement('button');
    viewBtn.innerHTML = '<i class="fas fa-file-alt"></i>';
    viewBtn.title = 'View Submissions';
    viewBtn.addEventListener('click', () => {
        // Set the student ID in the search form
        const searchInput = document.getElementById('submission-student-id-search');
        if (searchInput) {
            searchInput.value = student.id;
            // Trigger the search
            searchStudentSubmissions();
        }
        // Switch to submissions tab
        showTeacherSection('submissions');
    });
    actions.appendChild(viewBtn);
    
    // Add sections to card
    card.appendChild(info);
    card.appendChild(actions);
    
    return card;
}

// Search for students
function searchStudents() {
    const searchInput = document.getElementById('student-directory-search');
    if (!searchInput) return;
    
    const query = searchInput.value.trim().toLowerCase();
    const studentCards = document.querySelectorAll('.student-card');
    
    let found = false;
    
    studentCards.forEach(card => {
        const name = card.querySelector('.student-name').textContent.toLowerCase();
        const id = card.querySelector('.student-id').textContent.toLowerCase();
        
        if (name.includes(query) || id.includes(query) || query === '') {
            card.style.display = 'flex';
            found = true;
        } else {
            card.style.display = 'none';
        }
    });
    
    // Show no results message if needed
    const noResultsElement = document.querySelector('#students-list .no-results');
    
    if (!found && !noResultsElement) {
        const noResults = document.createElement('div');
        noResults.className = 'no-results';
        noResults.textContent = 'No students found matching your search.';
        document.getElementById('students-list').appendChild(noResults);
    } else if (found && noResultsElement) {
        noResultsElement.remove();
    }
}

// Initialize student performance chart
function initializeStudentPerformanceChart(students) {
    // This would use a charting library like Chart.js in a real application
    const chartContainer = document.getElementById('student-performance-chart');
    
    if (!chartContainer) return;
    
    // For the demo, just show a message that the chart would be here
    chartContainer.innerHTML = `
        <div style="text-align: center; padding: 50px 0;">
            <i class="fas fa-chart-bar" style="font-size: 48px; color: var(--primary-gold); margin-bottom: 20px;"></i>
            <p>Student Performance Chart would be displayed here using Chart.js</p>
            <p>Showing performance metrics for ${students.length} students</p>
        </div>
    `;
}

// Toggle chat box visibility
function toggleChatBox() {
    const chatBox = document.getElementById('floating-chat');
    if (chatBox) {
        chatBox.classList.toggle('active');
        
        if (chatBox.classList.contains('active')) {
            initializeChat();
        }
    }
}

// Initialize chat functionality
function initializeChat() {
    const chatMessages = document.getElementById('chat-messages');
    const chatForm = document.getElementById('chat-form');
    const chatInput = document.getElementById('chat-input');
    
    // Clear previous messages
    if (chatMessages) {
        // Keep previous messages or clear them
        // chatMessages.innerHTML = '';
        
        // Add welcome message if chat is empty
        if (chatMessages.childNodes.length === 0) {
            addChatMessage('Welcome to Anusasana support! How can I help you today?', 'incoming');
        }
    }
    
    // Set up event listeners if not already set
    if (chatForm && !chatForm.hasAttribute('data-initialized')) {
        chatForm.setAttribute('data-initialized', 'true');
        
        chatForm.addEventListener('submit', function(event) {
            event.preventDefault();
            
            if (chatInput && chatInput.value.trim() !== '') {
                const message = chatInput.value.trim();
                
                // Add user message to chat
                addChatMessage(message, 'outgoing');
                
                // Clear input
                chatInput.value = '';
                
                // Process message and get response
                processUserMessage(message);
            }
        });
    }
    
    // Set up minimize and close buttons
    const minimizeBtn = document.getElementById('minimize-chat');
    const closeBtn = document.getElementById('close-chat');
    
    if (minimizeBtn && !minimizeBtn.hasAttribute('data-initialized')) {
        minimizeBtn.setAttribute('data-initialized', 'true');
        minimizeBtn.addEventListener('click', function() {
            const chatBox = document.getElementById('floating-chat');
            chatBox.classList.toggle('minimized');
        });
    }
    
    if (closeBtn && !closeBtn.hasAttribute('data-initialized')) {
        closeBtn.setAttribute('data-initialized', 'true');
        closeBtn.addEventListener('click', function() {
            const chatBox = document.getElementById('floating-chat');
            chatBox.classList.remove('active');
        });
    }
    
    // Initialize open chat button
    const openChatBtn = document.getElementById('open-chat');
    
    if (openChatBtn && !openChatBtn.hasAttribute('data-initialized')) {
        openChatBtn.setAttribute('data-initialized', 'true');
        openChatBtn.addEventListener('click', toggleChatBox);
    }
}

// Add a message to the chat
function addChatMessage(message, type) {
    const chatMessages = document.getElementById('chat-messages');
    
    if (chatMessages) {
        const messageElement = document.createElement('div');
        messageElement.className = `chat-message ${type}`;
        messageElement.textContent = message;
        
        chatMessages.appendChild(messageElement);
        
        // Scroll to bottom
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }
}

// Process user message and generate a response
function processUserMessage(message) {
    // Simple keyword-based responses for now
    // This would be replaced with more advanced AI in a real application
    setTimeout(() => {
        let response = "I'm sorry, I don't understand. Can you please rephrase your question?";
        
        const lowerMessage = message.toLowerCase();
        
        if (lowerMessage.includes('hello') || lowerMessage.includes('hi') || lowerMessage.includes('hey')) {
            response = `Hello ${currentUser ? currentUser.name : 'there'}! How can I help you today?`;
        } 
        else if (lowerMessage.includes('assignment') && lowerMessage.includes('submit')) {
            response = "To submit an assignment, go to the Assignments tab and click on 'Submit New Assignment'. Upload your handwritten work and our OCR system will help grade it.";
        }
        else if (lowerMessage.includes('ocr') || lowerMessage.includes('grade')) {
            response = "Our OCR system can automatically recognize and grade your handwritten assignments. Teachers provide keywords that the system looks for in your submissions.";
        }
        else if (lowerMessage.includes('message') && lowerMessage.includes('teacher')) {
            response = "To send a message to your teacher, go to the Messages tab, enter your teacher's ID, and type your message.";
        }
        else if (lowerMessage.includes('doubt') || lowerMessage.includes('question')) {
            response = "You can ask doubts by going to the 'Ask a Doubt' section. Your teachers will be notified and can respond to your queries.";
        }
        else if (lowerMessage.includes('thank')) {
            response = "You're welcome! Is there anything else I can help you with?";
        }
        
        // Add bot response
        addChatMessage(response, 'incoming');
        
    }, 1000); // Simulate thinking time
}

// Initialize UI elements when the DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    // Set up event listeners for the chat box
    initializeChat();
    
    // Hide chat button on home screen initially
    if (document.getElementById('open-chat')) {
        document.getElementById('open-chat').style.display = 'none';
    }
    
    // Add event listener for the open chat button
    const openChatBtn = document.getElementById('open-chat');
    if (openChatBtn) {
        openChatBtn.addEventListener('click', toggleChatBox);
    }
    
    // Add event listeners for file upload preview
    const assignmentFileInput = document.getElementById('assignment-file');
    if (assignmentFileInput) {
        assignmentFileInput.addEventListener('change', function(event) {
            const file = event.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = function(e) {
                    const previewContainer = document.getElementById('upload-preview');
                    if (previewContainer) {
                        previewContainer.innerHTML = '';
                        const img = document.createElement('img');
                        img.src = e.target.result;
                        img.alt = 'Assignment Preview';
                        previewContainer.appendChild(img);
                    }
                };
                reader.readAsDataURL(file);
            }
        });
    }
}); 

// Initialize everything when document is ready
document.addEventListener('DOMContentLoaded', function() {
    // Set up event listeners for forms
    setupFormListeners();
    
    // Initialize UI elements for specific pages
    initializeDashboardUI();
    
    // Set up chat functionality
    initializeChat();
    
    // Initialize sliders and toggles
    initializeInputControls();
    
    // Set up the review threshold slider in OCR settings
    const thresholdSlider = document.getElementById('review-threshold');
    const thresholdValue = document.getElementById('threshold-value');
    
    if (thresholdSlider && thresholdValue) {
        thresholdSlider.addEventListener('input', function() {
            thresholdValue.textContent = this.value + '%';
        });
    }
    
    // Initialize card toggles
    document.querySelectorAll('.card-header').forEach(header => {
        header.addEventListener('click', function() {
            toggleCard(this);
        });
    });
    
    // Make sure chat is only visible on dashboards
    updateChatVisibility();
});

// Setup form listeners
function setupFormListeners() {
    // Register form
    const registerForm = document.getElementById('register-form');
    if (registerForm) {
        registerForm.addEventListener('submit', handleRegister);
    }
    
    // Login form
    const loginForm = document.getElementById('login-form');
    if (loginForm) {
        loginForm.addEventListener('submit', handleLogin);
    }
    
    // Assignment submission form
    const submitAssignmentForm = document.getElementById('submit-assignment-form');
    if (submitAssignmentForm) {
        submitAssignmentForm.addEventListener('submit', submitAssignment);
    }
    
    // Teacher forms
    const taskForm = document.querySelector('form[onsubmit="assignTask(event); return false;"]');
    if (taskForm) {
        taskForm.addEventListener('submit', function(event) {
            event.preventDefault();
            assignTask(event);
        });
    }
    
    // OCR settings form
    const ocrSettingsForm = document.getElementById('ocr-settings-form');
    if (ocrSettingsForm) {
        ocrSettingsForm.addEventListener('submit', function(event) {
            event.preventDefault();
            
            // Get form values
            const ocrMode = document.getElementById('default-ocr-mode').value;
            const tolerance = document.getElementById('default-tolerance').value;
            const autoFeedback = document.getElementById('auto-feedback').checked;
            const threshold = document.getElementById('review-threshold').value;
            
            // In a real app, this would save the settings to the server
            
            // Show success message
            showToast('OCR settings saved successfully', 'success');
        });
    }
}

// Initialize dashboard UI elements
function initializeDashboardUI() {
    // File upload preview
    const assignmentFileInput = document.getElementById('assignment-file');
    if (assignmentFileInput) {
        assignmentFileInput.addEventListener('change', function(event) {
            const file = event.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = function(e) {
                    const previewContainer = document.getElementById('upload-preview');
                    if (previewContainer) {
                        previewContainer.innerHTML = '';
                        const img = document.createElement('img');
                        img.src = e.target.result;
                        img.alt = 'Assignment Preview';
                        previewContainer.appendChild(img);
                    }
                };
                reader.readAsDataURL(file);
            }
        });
    }
    
    // Sidebar active item highlighting
    const studentSidebar = document.querySelector('#student-dashboard .sidebar');
    if (studentSidebar) {
        studentSidebar.querySelectorAll('li').forEach(item => {
            item.addEventListener('click', function() {
                studentSidebar.querySelectorAll('li').forEach(i => i.classList.remove('active'));
                this.classList.add('active');
            });
        });
    }
    
    const teacherSidebar = document.querySelector('#teacher-dashboard .sidebar');
    if (teacherSidebar) {
        teacherSidebar.querySelectorAll('li').forEach(item => {
            item.addEventListener('click', function() {
                teacherSidebar.querySelectorAll('li').forEach(i => i.classList.remove('active'));
                this.classList.add('active');
            });
        });
    }
    
    // Initialize tabs
    document.querySelectorAll('.tab').forEach(tab => {
        tab.addEventListener('click', function() {
            const subject = this.getAttribute('data-subject');
            const parent = this.parentElement;
            
            // Remove active class from all tabs
            parent.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
            
            // Add active class to this tab
            this.classList.add('active');
            
            // Show corresponding content
            const tabContents = this.closest('.card-content').querySelectorAll('.tab-content');
            tabContents.forEach(content => {
                content.classList.remove('active');
            });
            
            document.getElementById(`${subject}-keywords`).classList.add('active');
        });
    });
}

// Initialize input controls like sliders and toggles
function initializeInputControls() {
    // OCR settings toggles
    const toggleSwitches = document.querySelectorAll('.toggle-switch input[type="checkbox"]');
    toggleSwitches.forEach(toggle => {
        toggle.addEventListener('change', function() {
            const label = this.nextElementSibling;
            if (this.checked) {
                label.classList.add('active');
            } else {
                label.classList.remove('active');
            }
        });
    });
}

// Update chat visibility based on current screen
function updateChatVisibility() {
    const openChatBtn = document.getElementById('open-chat');
    const chatBox = document.getElementById('floating-chat');
    
    if (!openChatBtn || !chatBox) return;
    
    // Check if we're on a dashboard screen
    const isOnDashboard = 
        document.getElementById('student-dashboard').classList.contains('active') || 
        document.getElementById('teacher-dashboard').classList.contains('active');
    
    if (isOnDashboard) {
        openChatBtn.style.display = 'flex';
    } else {
        openChatBtn.style.display = 'none';
        chatBox.classList.remove('active');
    }
}

// Function to ask a doubt
async function askDoubt(event) {
    event.preventDefault();
    
    const doubtText = document.getElementById('doubt-text');
    const doubtResponse = document.getElementById('doubt-response');
    
    if (!doubtText || !doubtText.value.trim()) {
        showToast('Please enter your question', 'error');
        return;
    }
    
    if (!doubtResponse) return;
    
    // Show loading state
    doubtResponse.innerHTML = `
        <div class="loading-spinner">
            <div class="spinner"></div>
            <p>Submitting your question...</p>
        </div>
    `;
    
    try {
        // In a real app, send to server
        // const response = await fetch('/api/doubts/ask', {
        //     method: 'POST',
        //     headers: {
        //         'Content-Type': 'application/json'
        //     },
        //     body: JSON.stringify({
        //         studentId: currentUser.id,
        //         question: doubtText.value.trim()
        //     })
        // });
        
        // Simulate server response
        await simulateDelay(1500);
        
        // Update the UI
        doubtResponse.innerHTML = `
            <div class="doubt-success">
                <i class="fas fa-check-circle"></i>
                <h4>Question Submitted</h4>
                <p>Your question has been submitted to your teacher. You will receive a notification when they respond.</p>
                <div class="doubt-preview">
                    <p><strong>Your question:</strong></p>
                    <p class="question-text">${doubtText.value.trim()}</p>
                </div>
            </div>
        `;
        
        // Clear the input
        doubtText.value = '';
        
        // Show success message
        showToast('Question submitted successfully', 'success');
        
        // In a real app, refresh doubts list
        // setTimeout(() => {
        //     loadStudentData('doubts');
        // }, 1000);
        
    } catch (error) {
        console.error('Error submitting doubt:', error);
        
        // Show error message
        doubtResponse.innerHTML = `
            <div class="doubt-error">
                <i class="fas fa-exclamation-circle"></i>
                <h4>Submission Failed</h4>
                <p>There was an error submitting your question. Please try again.</p>
                <button class="btn btn-primary" onclick="retrySubmitDoubt()">Try Again</button>
            </div>
        `;
        
        showToast('Failed to submit question', 'error');
    }
}

// Function to retry submitting a doubt
function retrySubmitDoubt() {
    const doubtText = document.getElementById('doubt-text');
    const doubtResponse = document.getElementById('doubt-response');
    
    if (doubtResponse) {
        doubtResponse.innerHTML = '';
    }
    
    // Focus on the doubt text area
    if (doubtText) {
        doubtText.focus();
    }
}

// OCR Correction System for Grading Assignments
function initOCRSystem() {
    console.log("Initializing OCR System for grading");
    
    // Set up the OCR interface in the teacher submissions section
    const submissionsContainer = document.getElementById('teacher-submissions-container');
    if (!submissionsContainer) return;
    
    // Add OCR correction interface to the top of submissions section
    const ocrInterface = document.createElement('div');
    ocrInterface.className = 'ocr-interface card';
    ocrInterface.innerHTML = `
        <h3><i class="fas fa-magic"></i> OCR Grading Assistant</h3>
        <p>Upload student submissions for automated grading with OCR text recognition.</p>
        <div class="upload-area">
            <input type="file" id="ocr-file-input" accept="image/*" multiple>
            <label for="ocr-file-input">
                <i class="fas fa-cloud-upload-alt"></i>
                <span>Drop files here or click to upload</span>
            </label>
        </div>
        <div id="ocr-results-container" class="ocr-results-container" style="display: none;">
            <h4>OCR Results</h4>
            <div id="ocr-text-preview" class="ocr-text-preview"></div>
            <div class="ocr-correction-tools">
                <h5>Correction Tools</h5>
                <div class="correction-actions">
                    <button id="ocr-accept-btn" class="btn btn-primary btn-sm">
                        <i class="fas fa-check"></i> Accept
                    </button>
                    <button id="ocr-edit-btn" class="btn btn-secondary btn-sm">
                        <i class="fas fa-edit"></i> Edit Text
                    </button>
                    <button id="ocr-cancel-btn" class="btn btn-danger btn-sm">
                        <i class="fas fa-times"></i> Cancel
                    </button>
                </div>
                <div id="ocr-edit-area" class="ocr-edit-area" style="display: none;">
                    <textarea id="ocr-edited-text" class="ocr-edited-text"></textarea>
                    <button id="ocr-save-edit-btn" class="btn btn-primary btn-sm">Save Changes</button>
                </div>
            </div>
        </div>
        <div id="ocr-grading-area" class="ocr-grading-area" style="display: none;">
            <h4>Grade Submission</h4>
            <div class="grade-input-group">
                <label for="ocr-grade-input">Grade:</label>
                <input type="number" id="ocr-grade-input" min="0" max="100" placeholder="Enter grade">
            </div>
            <div class="grade-input-group">
                <label for="ocr-feedback-input">Feedback:</label>
                <textarea id="ocr-feedback-input" placeholder="Enter feedback"></textarea>
            </div>
            <button id="ocr-submit-grade-btn" class="btn btn-primary">Submit Grade</button>
        </div>
    `;
    
    // Insert at the beginning of the submissions container
    if (submissionsContainer.firstChild) {
        submissionsContainer.insertBefore(ocrInterface, submissionsContainer.firstChild);
    } else {
        submissionsContainer.appendChild(ocrInterface);
    }
    
    // Set up event listeners for OCR functionality
    setupOCREventListeners();
}

function setupOCREventListeners() {
    // File input change handler
    const fileInput = document.getElementById('ocr-file-input');
    if (!fileInput) return;
    
    fileInput.addEventListener('change', (e) => {
        const files = e.target.files;
        if (files.length === 0) return;
        
        // Show loading state
        const resultsContainer = document.getElementById('ocr-results-container');
        const textPreview = document.getElementById('ocr-text-preview');
        
        resultsContainer.style.display = 'block';
        textPreview.innerHTML = '<div class="loading-spinner"></div><p>Processing OCR...</p>';
        
        // Simulate OCR processing
        setTimeout(() => {
            simulateOCRProcessing(files[0]);
        }, 1500);
    });
    
    // OCR edit button
    const editBtn = document.getElementById('ocr-edit-btn');
    if (editBtn) {
        editBtn.addEventListener('click', () => {
            const editArea = document.getElementById('ocr-edit-area');
            const textPreview = document.getElementById('ocr-text-preview');
            const editedText = document.getElementById('ocr-edited-text');
            
            editArea.style.display = 'block';
            editedText.value = textPreview.textContent;
            editedText.focus();
        });
    }
    
    // OCR save edit button
    const saveEditBtn = document.getElementById('ocr-save-edit-btn');
    if (saveEditBtn) {
        saveEditBtn.addEventListener('click', () => {
            const editArea = document.getElementById('ocr-edit-area');
            const textPreview = document.getElementById('ocr-text-preview');
            const editedText = document.getElementById('ocr-edited-text');
            
            textPreview.textContent = editedText.value;
            editArea.style.display = 'none';
        });
    }
    
    // OCR accept button
    const acceptBtn = document.getElementById('ocr-accept-btn');
    if (acceptBtn) {
        acceptBtn.addEventListener('click', () => {
            const gradingArea = document.getElementById('ocr-grading-area');
            gradingArea.style.display = 'block';
        });
    }
    
    // OCR cancel button
    const cancelBtn = document.getElementById('ocr-cancel-btn');
    if (cancelBtn) {
        cancelBtn.addEventListener('click', () => {
            resetOCRInterface();
        });
    }
    
    // OCR submit grade button
    const submitGradeBtn = document.getElementById('ocr-submit-grade-btn');
    if (submitGradeBtn) {
        submitGradeBtn.addEventListener('click', () => {
            const gradeInput = document.getElementById('ocr-grade-input');
            const feedbackInput = document.getElementById('ocr-feedback-input');
            
            if (!gradeInput.value) {
                alert('Please enter a grade');
                return;
            }
            
            // Show success message
            const submissionsContainer = document.getElementById('teacher-submissions-container');
            const successMsg = document.createElement('div');
            successMsg.className = 'alert alert-success';
            successMsg.innerHTML = `
                <i class="fas fa-check-circle"></i>
                <span>Grade submitted successfully! Grade: ${gradeInput.value}/100</span>
            `;
            
            submissionsContainer.insertBefore(successMsg, submissionsContainer.firstChild.nextSibling);
            
            // Automatically remove success message after 5 seconds
            setTimeout(() => {
                successMsg.remove();
            }, 5000);
            
            // Reset OCR interface
            resetOCRInterface();
        });
    }
}

function resetOCRInterface() {
    const resultsContainer = document.getElementById('ocr-results-container');
    const gradingArea = document.getElementById('ocr-grading-area');
    const editArea = document.getElementById('ocr-edit-area');
    const fileInput = document.getElementById('ocr-file-input');
    
    if (resultsContainer) resultsContainer.style.display = 'none';
    if (gradingArea) gradingArea.style.display = 'none';
    if (editArea) editArea.style.display = 'none';
    if (fileInput) fileInput.value = '';
}

function simulateOCRProcessing(file) {
    const textPreview = document.getElementById('ocr-text-preview');
    
    // Create a mock result based on the file name
    const fileName = file.name.toLowerCase();
    let mockText = '';
    
    if (fileName.includes('math')) {
        mockText = `Answer 1: 42\nAnswer 2: x = 7\nAnswer 3: y = 2x + 3\nAnswer 4: z = √16`;
    } else if (fileName.includes('essay') || fileName.includes('english')) {
        mockText = `The Impact of Technology on Education\n\nTechnology has transformed education in numerous ways. Interactive learning platforms, digital textbooks, and online courses have made education more accessible to students around the world.\n\nHowever, there are challenges that come with this digital transformation, including the digital divide and concerns about screen time.`;
    } else if (fileName.includes('science')) {
        mockText = `Experiment Results:\n1. Temperature: 24.5°C\n2. pH Level: 7.2\n3. Reaction time: 45 seconds\n\nConclusion: The catalyst successfully increased the reaction rate as expected.`;
    } else {
        mockText = `Student Submission\n\nThis is a sample text extracted from the uploaded assignment. OCR technology has detected these characters from the image.\n\nThe quality of OCR detection depends on the clarity of the original image.`;
    }
    
    // Display the mock OCR result
    textPreview.textContent = mockText;
}

// Profile Feature for Teachers
function initProfileFeatures() {
    console.log("Initializing profile features");
    
    // Generate and display user IDs
    generateUserIDs();
    
    // Set up profile toggle in both dashboards
    setupProfileToggle();
    
    // Initialize analytics data for teacher dashboard
    if (isTeacher()) {
        initTeacherAnalytics();
    }
}

function generateUserIDs() {
    // Get user type from local storage
    const userType = localStorage.getItem('userType') || 'student';
    const userName = localStorage.getItem('userName') || 'User';
    const userEmail = localStorage.getItem('userEmail') || 'user@example.com';
    
    // Generate a deterministic ID based on email (in a real app, this would come from the database)
    const generateID = (email, prefix) => {
        let hash = 0;
        for (let i = 0; i < email.length; i++) {
            hash = ((hash << 5) - hash) + email.charCodeAt(i);
            hash |= 0; // Convert to 32bit integer
        }
        // Make it positive and limit to 6 digits
        const positiveHash = Math.abs(hash) % 1000000;
        return `${prefix}${positiveHash.toString().padStart(6, '0')}`;
    };
    
    // Set the ID in the appropriate element
    if (userType === 'student') {
        const studentIDElement = document.getElementById('student-id');
        if (studentIDElement) {
            const studentID = generateID(userEmail, 'S');
            studentIDElement.textContent = studentID;
            localStorage.setItem('userID', studentID);
        }
    } else {
        const teacherIDElement = document.getElementById('teacher-id');
        if (teacherIDElement) {
            const teacherID = generateID(userEmail, 'T');
            teacherIDElement.textContent = teacherID;
            localStorage.setItem('userID', teacherID);
        }
    }
    
    // Also update profile info
    updateProfileInfo(userName, userEmail, userType);
}

function updateProfileInfo(name, email, userType) {
    // Update names in UI
    const userNameElements = document.querySelectorAll('.user-name');
    userNameElements.forEach(el => {
        el.textContent = name;
    });
    
    // Update emails in UI
    const userEmailElements = document.querySelectorAll('.user-email');
    userEmailElements.forEach(el => {
        el.textContent = email;
    });
    
    // Update role in UI
    const userRoleElements = document.querySelectorAll('.user-role');
    userRoleElements.forEach(el => {
        el.textContent = userType.charAt(0).toUpperCase() + userType.slice(1);
    });
}

function setupProfileToggle() {
    const profileToggles = document.querySelectorAll('.profile-toggle');
    const profileDropdowns = document.querySelectorAll('.profile-dropdown');
    
    profileToggles.forEach((toggle, index) => {
        toggle.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            
            // Toggle this dropdown
            const dropdown = profileDropdowns[index];
            const isVisible = dropdown.style.display === 'block';
            
            // Hide all dropdowns first
            profileDropdowns.forEach(d => {
                d.style.display = 'none';
            });
            
            // Show this dropdown if it was hidden
            if (!isVisible) {
                dropdown.style.display = 'block';
            }
        });
    });
    
    // Close dropdowns when clicking outside
    document.addEventListener('click', () => {
        profileDropdowns.forEach(dropdown => {
            dropdown.style.display = 'none';
        });
    });
}

function initTeacherAnalytics() {
    const analyticsContainer = document.getElementById('teacher-analytics-container');
    if (!analyticsContainer) return;
    
    // Simulate loading analytics data
    analyticsContainer.innerHTML = '<div class="loading-spinner"></div>';
    
    setTimeout(() => {
        displayTeacherAnalytics();
    }, 1000);
}

function displayTeacherAnalytics() {
    const analyticsContainer = document.getElementById('teacher-analytics-container');
    if (!analyticsContainer) return;
    
    // Create mock analytics data
    const analyticsHTML = `
        <div class="analytics-overview">
            <h3>Class Performance Overview</h3>
            <div class="analytics-grid">
                <div class="analytics-metric">
                    <div class="metric-label">Average Class Grade</div>
                    <div class="metric-value">78%</div>
                    <div class="metric-chart">
                        <div class="chart-bar" style="width: 78%"></div>
                    </div>
                    <div class="engagement-indicator medium">
                        <div class="indicator-dot"></div>
                        <div class="indicator-label">Medium performance</div>
                    </div>
                </div>
                
                <div class="analytics-metric">
                    <div class="metric-label">Assignment Completion Rate</div>
                    <div class="metric-value">92%</div>
                    <div class="metric-chart">
                        <div class="chart-bar" style="width: 92%"></div>
                    </div>
                    <div class="engagement-indicator high">
                        <div class="indicator-dot"></div>
                        <div class="indicator-label">High completion</div>
                    </div>
                </div>
                
                <div class="analytics-metric">
                    <div class="metric-label">Student Engagement</div>
                    <div class="metric-value">65%</div>
                    <div class="metric-chart">
                        <div class="chart-bar" style="width: 65%"></div>
                    </div>
                    <div class="engagement-indicator medium">
                        <div class="indicator-dot"></div>
                        <div class="indicator-label">Medium engagement</div>
                    </div>
                </div>
                
                <div class="analytics-metric">
                    <div class="metric-label">Questions Resolved</div>
                    <div class="metric-value">84%</div>
                    <div class="metric-chart">
                        <div class="chart-bar" style="width: 84%"></div>
                    </div>
                    <div class="engagement-indicator high">
                        <div class="indicator-dot"></div>
                        <div class="indicator-label">High resolution rate</div>
                    </div>
                </div>
            </div>
        </div>
        
        <div class="student-lookup">
            <h3>Student Performance Lookup</h3>
            <div class="search-container">
                <input type="text" id="student-search-input" class="search-input" placeholder="Enter Student ID">
                <button id="lookup-student-btn" class="btn btn-primary">
                    <i class="fas fa-search"></i> Lookup
                </button>
            </div>
            <div id="student-lookup-results" class="lookup-results"></div>
        </div>
    `;
    
    analyticsContainer.innerHTML = analyticsHTML;
    
    // Set up event listener for student lookup
    const lookupBtn = document.getElementById('lookup-student-btn');
    if (lookupBtn) {
        lookupBtn.addEventListener('click', lookupStudentPerformance);
    }
}

function lookupStudentPerformance() {
    const studentID = document.getElementById('student-search-input').value.trim();
    const resultsContainer = document.getElementById('student-lookup-results');
    
    if (!studentID) {
        resultsContainer.innerHTML = `
            <div class="alert alert-warning">
                <i class="fas fa-exclamation-triangle"></i>
                Please enter a Student ID
            </div>
        `;
        return;
    }
    
    // Show loading
    resultsContainer.innerHTML = '<div class="loading-spinner"></div>';
    
    // Simulate API call
    setTimeout(() => {
        // Check if ID starts with S (our format for student IDs)
        if (!studentID.startsWith('S')) {
            resultsContainer.innerHTML = `
                <div class="alert alert-danger">
                    <i class="fas fa-times-circle"></i>
                    Invalid Student ID format. IDs should start with 'S' followed by 6 digits.
                </div>
            `;
            return;
        }
        
        // Mock student data based on ID
        const studentData = {
            id: studentID,
            name: `Student ${studentID.substring(1, 4)}`,
            email: `student${studentID.substring(1, 4)}@example.com`,
            overall_grade: Math.floor(60 + Math.random() * 40),
            assignments_completed: Math.floor(5 + Math.random() * 8),
            total_assignments: 15,
            last_active: "2023-07-15",
            engagement_score: Math.floor(50 + Math.random() * 50),
            strengths: ["Mathematics", "Problem Solving"],
            areas_for_improvement: ["Written Communication", "Group Work"]
        };
        
        // Display student performance
        resultsContainer.innerHTML = `
            <div class="student-profile-card">
                <div class="student-profile-header">
                    <div class="student-avatar">
                        <i class="fas fa-user-graduate"></i>
                    </div>
                    <div class="student-info">
                        <h4>${studentData.name}</h4>
                        <div class="student-contact">
                            <span class="student-id-display">${studentData.id}</span>
                            <span class="student-email-display">${studentData.email}</span>
                        </div>
                    </div>
                </div>
                
                <div class="student-performance-summary">
                    <div class="performance-metric">
                        <div class="metric-label">Overall Grade</div>
                        <div class="metric-value ${studentData.overall_grade >= 80 ? 'good' : (studentData.overall_grade >= 70 ? 'medium' : 'needs-improvement')}">
                            ${studentData.overall_grade}%
                        </div>
                    </div>
                    
                    <div class="performance-metric">
                        <div class="metric-label">Assignments</div>
                        <div class="metric-value">
                            ${studentData.assignments_completed}/${studentData.total_assignments}
                        </div>
                    </div>
                    
                    <div class="performance-metric">
                        <div class="metric-label">Engagement</div>
                        <div class="metric-value ${studentData.engagement_score >= 80 ? 'good' : (studentData.engagement_score >= 60 ? 'medium' : 'needs-improvement')}">
                            ${studentData.engagement_score}%
                        </div>
                    </div>
                    
                    <div class="performance-metric">
                        <div class="metric-label">Last Active</div>
                        <div class="metric-value">
                            ${studentData.last_active}
                        </div>
                    </div>
                </div>
                
                <div class="student-strengths-improvements">
                    <div class="strengths">
                        <h5><i class="fas fa-star"></i> Strengths</h5>
                        <ul>
                            ${studentData.strengths.map(s => `<li>${s}</li>`).join('')}
                        </ul>
                    </div>
                    
                    <div class="improvements">
                        <h5><i class="fas fa-bullseye"></i> Areas for Improvement</h5>
                        <ul>
                            ${studentData.areas_for_improvement.map(a => `<li>${a}</li>`).join('')}
                        </ul>
                    </div>
                </div>
                
                <div class="student-actions">
                    <button class="btn btn-primary btn-sm" onclick="messageStudent('${studentData.id}')">
                        <i class="fas fa-envelope"></i> Message
                    </button>
                    <button class="btn btn-secondary btn-sm" onclick="viewStudentAssignments('${studentData.id}')">
                        <i class="fas fa-tasks"></i> View Assignments
                    </button>
                    <button class="btn btn-info btn-sm" onclick="generateStudentReport('${studentData.id}')">
                        <i class="fas fa-file-alt"></i> Generate Report
                    </button>
                </div>
            </div>
        `;
    }, 1500);
}

function messageStudent(studentId) {
    // Set receiver ID and switch to messages tab
    document.getElementById('receiver-id').value = studentId;
    switchScreen('teacher-messages-screen');
    document.getElementById('message-textarea').focus();
}

function viewStudentAssignments(studentId) {
    // Switch to submissions tab with filtered view
    switchScreen('teacher-submissions-screen');
    alert(`Viewing assignments for Student ID: ${studentId}`);
}

function generateStudentReport(studentId) {
    alert(`Generating performance report for Student ID: ${studentId}. The report will be available for download shortly.`);
    
    // Simulate download delay
    setTimeout(() => {
        alert("Report generated successfully!");
    }, 2000);
}

// Initialize OCR and Profile features after page load
document.addEventListener('DOMContentLoaded', function() {
    // ... existing code ...
    
    // Initialize OCR system for teachers
    if (isTeacher()) {
        initOCRSystem();
    }
    
    // Initialize profile features for all users
    initProfileFeatures();
});

// Helper function to check if current user is a teacher
function isTeacher() {
    return localStorage.getItem('userType') === 'teacher';
}