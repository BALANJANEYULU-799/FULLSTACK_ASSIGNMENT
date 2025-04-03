import express from "express";
import cors from "cors";
import multer from "multer";
import axios from "axios";
import fs from "fs/promises";
import dotenv from "dotenv";
import { promisify } from "util";
import libre from "libreoffice-convert";
import bcrypt from "bcrypt";
import admin from "firebase-admin";
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { Server } from 'socket.io';
import http from 'http';

dotenv.config();
const app = express();
const server = http.createServer(app);
const io = new Server(server);
const port = 5000;
const upload = multer({ dest: "uploads/" });
const API_KEY = process.env.GOOGLE_CLOUD_VISION_API_KEY;
const libreConvert = promisify(libre.convert);
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Create uploads directory if it doesn't exist
try {
    await fs.mkdir('uploads', { recursive: true });
    console.log('Uploads directory created/verified');
} catch (error) {
    console.error('Error creating uploads directory:', error);
}

// Initialize Firebase Admin
let db;
try {
    const serviceAccount = JSON.parse(await fs.readFile('./anusasana-firebase-adminsdk-fbsvc-e84efefe15.json'));
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
    db = admin.firestore();
    console.log('Firebase initialized successfully');
} catch (error) {
    console.error('Error initializing Firebase:', error);
    process.exit(1);
}

// Set up EJS
app.set('view engine', 'ejs');
app.set('views', join(__dirname, 'views'));
app.use(express.static(join(__dirname, 'public')));

app.use(express.json());
app.use(cors());

// Socket.IO connection handling
io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  socket.on('join', (userId) => {
    socket.join(userId);
    console.log(`User ${userId} joined room ${userId}`);
  });

  socket.on('message', async (data) => {
    try {
      const { senderId, receiverId, text } = data;
      
      // Save message to Firestore
      await db.collection('messages').add({
        senderId,
        receiverId,
        text,
        timestamp: admin.firestore.FieldValue.serverTimestamp()
      });

      // Emit message to receiver
      io.to(receiverId).emit('newMessage', {
        senderId,
        text,
        timestamp: new Date()
      });
    } catch (error) {
      console.error('Message error:', error);
    }
  });

  // Handle support chat messages
  socket.on('supportMessage', async (data) => {
    try {
      const { userId, text } = data;
      
      // Save support message to Firestore
      await db.collection('supportMessages').add({
        userId,
        text,
        isFromUser: true,
        timestamp: admin.firestore.FieldValue.serverTimestamp()
      });

      // Auto-respond with a helpful message
      setTimeout(async () => {
        const responses = [
          "How can I help you with your learning today?",
          "That's an interesting question! Let me find some resources for you.",
          "I understand your concern. Let me connect you with a teacher.",
          "Have you checked the assignments section for this topic?",
          "Great progress! Keep up the good work."
        ];
        
        const responseText = responses[Math.floor(Math.random() * responses.length)];
        
        // Save auto-response to Firestore
        await db.collection('supportMessages').add({
          userId,
          text: responseText,
          isFromUser: false,
          timestamp: admin.firestore.FieldValue.serverTimestamp()
        });
        
        // Send response back to the user
        socket.emit('supportResponse', {
          text: responseText,
          timestamp: new Date()
        });
      }, 1000);
    } catch (error) {
      console.error('Support message error:', error);
    }
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
  });
});

// Routes
app.get('/', (req, res) => {
  res.render('index');
});

app.post('/api/register', async (req, res) => {
    console.log('Registration request received:', {
        ...req.body,
        password: req.body.password ? '***' : undefined
    });
    
    try {
        const { name, email, password, role, college, uniqueId, createdAt } = req.body;

        // Validate required fields
        if (!name || !email || !password || !role || !college) {
            console.log('Registration validation failed: Missing required fields');
            return res.status(400).json({ error: 'All fields are required' });
        }

        // Check if user already exists
        const userRef = db.collection('users').where('email', '==', email);
        const snapshot = await userRef.get();

        if (!snapshot.empty) {
            console.log('Registration failed: Email already exists');
            return res.status(400).json({ error: 'User with this email already exists' });
        }

        // Hash password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);
        console.log('Password hashed successfully');

        // Create user with uniqueId
        const newUser = {
            name,
            email,
            password: hashedPassword,
            role,
            college,
            uniqueId: uniqueId || `${role.substring(0, 3).toUpperCase()}-${Date.now().toString().substring(7)}`,
            createdAt: createdAt || Date.now()
        };

        console.log('Creating new user document:', {
            ...newUser,
            password: '***'
        });

        const userRecord = await db.collection('users').add(newUser);
        console.log('User created successfully with ID:', userRecord.id);
        
        // Return success without sensitive info
        res.status(201).json({ 
            success: true, 
            message: 'User registered successfully', 
            userId: userRecord.id,
            user: {
                id: userRecord.id,
                name,
                email,
                role,
                college,
                uniqueId: newUser.uniqueId
            }
        });
    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({ error: 'Failed to register user: ' + error.message });
    }
});

app.post('/api/login', async (req, res) => {
    console.log('Login request received:', {
        email: req.body.email,
        password: req.body.password ? '***' : undefined
    });
    
    try {
        const { email, password } = req.body;
        
        // Validate required fields
        if (!email || !password) {
            console.log('Login validation failed: Missing email or password');
            return res.status(400).json({ error: 'Email and password are required' });
        }
        
        // Find user by email
        console.log('Looking up user by email');
        const userRef = db.collection('users').where('email', '==', email);
        const snapshot = await userRef.get();
        
        if (snapshot.empty) {
            console.log('Login failed: User not found');
            return res.status(401).json({ error: 'Invalid credentials' });
        }
        
        const userData = snapshot.docs[0].data();
        const userId = snapshot.docs[0].id;
        console.log('User found:', userId);
        
        // Verify password
        console.log('Verifying password');
        const isPasswordValid = await bcrypt.compare(password, userData.password);
        
        if (!isPasswordValid) {
            console.log('Login failed: Invalid password');
            return res.status(401).json({ error: 'Invalid credentials' });
        }
        
        console.log('Password verification successful');
        
        // Generate custom token
        console.log('Generating auth token');
        const customToken = await admin.auth().createCustomToken(userId);
        
        res.status(200).json({
            success: true,
            message: 'Login successful',
            token: customToken,
            user: {
                id: userId,
                name: userData.name,
                email: userData.email,
                role: userData.role,
                college: userData.college,
                uniqueId: userData.uniqueId
            }
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Failed to login: ' + error.message });
    }
});

// Get student by ID
app.get('/api/students/:uniqueId', async (req, res) => {
    try {
        const { uniqueId } = req.params;
        
        // Find user by uniqueId
        const userRef = db.collection('users').where('uniqueId', '==', uniqueId).where('role', '==', 'student');
        const snapshot = await userRef.get();
        
        if (snapshot.empty) {
            return res.status(404).json({ error: 'Student not found' });
        }
        
        const studentData = snapshot.docs[0].data();
        const studentId = snapshot.docs[0].id;
        
        // Return student data without sensitive info
        res.status(200).json({
            id: studentId,
            name: studentData.name,
            email: studentData.email,
            college: studentData.college,
            uniqueId: studentData.uniqueId
        });
    } catch (error) {
        console.error('Error fetching student:', error);
        res.status(500).json({ error: 'Failed to fetch student data' });
    }
});

// Get teacher by ID
app.get('/api/teachers/:uniqueId', async (req, res) => {
    try {
        const { uniqueId } = req.params;
        
        // Find user by uniqueId
        const userRef = db.collection('users').where('uniqueId', '==', uniqueId).where('role', '==', 'teacher');
        const snapshot = await userRef.get();
        
        if (snapshot.empty) {
            return res.status(404).json({ error: 'Teacher not found' });
        }
        
        const teacherData = snapshot.docs[0].data();
        const teacherId = snapshot.docs[0].id;
        
        // Return teacher data without sensitive info
        res.status(200).json({
            id: teacherId,
            name: teacherData.name,
            email: teacherData.email,
            college: teacherData.college,
            uniqueId: teacherData.uniqueId
        });
    } catch (error) {
        console.error('Error fetching teacher:', error);
        res.status(500).json({ error: 'Failed to fetch teacher data' });
    }
});

// Assignment routes
app.get('/assignments', async (req, res) => {
  try {
    const assignmentsSnapshot = await db.collection('assignments').get();
    const assignments = [];
    assignmentsSnapshot.forEach(doc => {
      assignments.push({ id: doc.id, ...doc.data() });
    });
    res.json(assignments);
  } catch (error) {
    console.error('Error fetching assignments:', error);
    res.status(500).json({ error: 'Failed to fetch assignments' });
  }
});

app.post('/assignments', async (req, res) => {
  const { name, text, studentId } = req.body;
  if (!name || !text || !studentId) {
    return res.status(400).json({ error: 'Name, text, and studentId are required' });
  }

  try {
    const assignmentRef = await db.collection('assignments').add({
      name,
      text,
      studentId,
      submittedAt: new Date()
    });
    
    const assignmentDoc = await assignmentRef.get();
    res.status(201).json({ id: assignmentRef.id, ...assignmentDoc.data() });
  } catch (error) {
    console.error('Error creating assignment:', error);
    res.status(500).json({ error: 'Failed to create assignment' });
  }
});

// Message routes
app.get('/messages', async (req, res) => {
  try {
    const messagesSnapshot = await db.collection('messages').orderBy('timestamp', 'desc').limit(50).get();
    const messages = [];
    messagesSnapshot.forEach(doc => {
      messages.push({ id: doc.id, ...doc.data() });
    });
    res.json(messages);
  } catch (error) {
    console.error('Error fetching messages:', error);
    res.status(500).json({ error: 'Failed to fetch messages' });
  }
});

// Doubt routes
app.get('/doubts', async (req, res) => {
  try {
    const doubtsSnapshot = await db.collection('doubts').get();
    const doubts = [];
    doubtsSnapshot.forEach(doc => {
      doubts.push({ id: doc.id, ...doc.data() });
    });
    res.json(doubts);
  } catch (error) {
    console.error('Error fetching doubts:', error);
    res.status(500).json({ error: 'Failed to fetch doubts' });
  }
});

app.post('/doubts', async (req, res) => {
  const { text, studentId, status } = req.body;
  if (!text || !studentId || !status) {
    return res.status(400).json({ error: 'Text, studentId, and status are required' });
  }

  try {
    const doubtRef = await db.collection('doubts').add({
      text,
      studentId,
      status,
      createdAt: new Date()
    });
    
    const doubtDoc = await doubtRef.get();
    res.status(201).json({ id: doubtRef.id, ...doubtDoc.data() });
  } catch (error) {
    console.error('Error creating doubt:', error);
    res.status(500).json({ error: 'Failed to create doubt' });
  }
});

// Task routes
app.get('/tasks', async (req, res) => {
  try {
    const tasksSnapshot = await db.collection('tasks').get();
    const tasks = [];
    tasksSnapshot.forEach(doc => {
      tasks.push({ id: doc.id, ...doc.data() });
    });
    res.json(tasks);
  } catch (error) {
    console.error('Error fetching tasks:', error);
    res.status(500).json({ error: 'Failed to fetch tasks' });
  }
});

app.post('/tasks', async (req, res) => {
  const { name, dueDate, teacherId } = req.body;
  if (!name || !dueDate || !teacherId) {
    return res.status(400).json({ error: 'Name, dueDate, and teacherId are required' });
  }

  try {
    const taskRef = await db.collection('tasks').add({
      name,
      dueDate,
      teacherId,
      createdAt: new Date()
    });
    
    const taskDoc = await taskRef.get();
    res.status(201).json({ id: taskRef.id, ...taskDoc.data() });
  } catch (error) {
    console.error('Error creating task:', error);
    res.status(500).json({ error: 'Failed to create task' });
  }
});

// Class routes
app.get('/classes', async (req, res) => {
  try {
    const classesSnapshot = await db.collection('classes').get();
    const classes = [];
    classesSnapshot.forEach(doc => {
      classes.push({ id: doc.id, ...doc.data() });
    });
    res.json(classes);
  } catch (error) {
    console.error('Error fetching classes:', error);
    res.status(500).json({ error: 'Failed to fetch classes' });
  }
});

app.post('/classes', async (req, res) => {
  const { title, teacherId } = req.body;
  if (!title || !teacherId) {
    return res.status(400).json({ error: 'Title and teacherId are required' });
  }

  try {
    const classRef = await db.collection('classes').add({
      title,
      teacherId,
      createdAt: new Date()
    });
    
    const classDoc = await classRef.get();
    res.status(201).json({ id: classRef.id, ...classDoc.data() });
  } catch (error) {
    console.error('Error creating class:', error);
    res.status(500).json({ error: 'Failed to create class' });
  }
});

// Announcement routes
app.get('/announcements', async (req, res) => {
  try {
    const announcementsSnapshot = await db.collection('announcements').orderBy('timestamp', 'desc').get();
    const announcements = [];
    announcementsSnapshot.forEach(doc => {
      announcements.push({ id: doc.id, ...doc.data() });
    });
    res.json(announcements);
  } catch (error) {
    console.error('Error fetching announcements:', error);
    res.status(500).json({ error: 'Failed to fetch announcements' });
  }
});

app.post('/announcements', async (req, res) => {
  const { text, teacherId, timestamp } = req.body;
  if (!text || !teacherId || !timestamp) {
    return res.status(400).json({ error: 'Text, teacherId, and timestamp are required' });
  }

  try {
    const announcementRef = await db.collection('announcements').add({
      text,
      teacherId,
      timestamp: new Date()
    });
    
    const announcementDoc = await announcementRef.get();
    res.status(201).json({ id: announcementRef.id, ...announcementDoc.data() });
  } catch (error) {
    console.error('Error creating announcement:', error);
    res.status(500).json({ error: 'Failed to create announcement' });
  }
});

app.post('/grok/v1/chat', (req, res) => {
    const { message, context } = req.body;
    if (!message || !context) {
        return res.status(400).json({ error: 'Message and context are required' });
    }
    res.json({ response: `Mock response to: ${message} (Context: ${context})` }); // Replace with real AI logic if desired
});

app.post("/extract-text", upload.single("file"), async (req, res) => {
    try {
        const { path, mimetype, originalname } = req.file;
        console.log('Extracting text from file:', path, 'Type:', mimetype);
        let extractedText = "Unsupported file format.";

        if (mimetype.startsWith("image/")) {
            extractedText = await processImage(path);
        } else if (mimetype === "application/pdf") {
            extractedText = await processPDF(path);
        } else if (mimetype === "application/vnd.oasis.opendocument.text") {
            extractedText = await processODT(path);
        } else if (mimetype === "text/plain") {
            extractedText = await fs.readFile(path, "utf-8");
        }

        await fs.unlink(path);
        res.json({ filename: originalname, text: extractedText });
    } catch (error) {
        console.error('Extract Text Error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Support Chat messages
app.get('/api/support-messages/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    
    // Fetch support messages for the user
    const messagesSnapshot = await db.collection('supportMessages')
      .where('userId', '==', userId)
      .orderBy('timestamp', 'asc')
      .get();
    
    const messages = [];
    messagesSnapshot.forEach(doc => {
      const data = doc.data();
      messages.push({
        id: doc.id,
        text: data.text,
        isFromUser: data.isFromUser,
        timestamp: data.timestamp?.toDate()
      });
    });
    
    res.json(messages);
  } catch (error) {
    console.error('Error fetching support messages:', error);
    res.status(500).json({ error: 'Failed to fetch support messages' });
  }
});

// Get messages for a user
app.get('/api/messages/:userId', async (req, res) => {
    try {
        const { userId } = req.params;
        
        // Get messages where user is sender or receiver
        const messagesRef = db.collection('messages');
        const sentSnapshot = await messagesRef.where('senderId', '==', userId).get();
        const receivedSnapshot = await messagesRef.where('receiverId', '==', userId).get();
        
        const messages = [];
        
        // Add sent messages
        sentSnapshot.forEach(doc => {
            messages.push({
                id: doc.id,
                ...doc.data(),
                isSent: true
            });
        });
        
        // Add received messages
        receivedSnapshot.forEach(doc => {
            messages.push({
                id: doc.id,
                ...doc.data(),
                isSent: false
            });
        });
        
        // Sort by timestamp in descending order
        messages.sort((a, b) => b.timestamp - a.timestamp);
        
        res.status(200).json(messages);
    } catch (error) {
        console.error('Error fetching messages:', error);
        res.status(500).json({ error: 'Failed to fetch messages' });
    }
});

// Send a message
app.post('/api/messages', async (req, res) => {
    try {
        const message = req.body;
        
        // Validate required fields
        if (!message.senderId || !message.receiverId || !message.text) {
            return res.status(400).json({ error: 'Missing required fields' });
        }
        
        // Add timestamp if not provided
        if (!message.timestamp) {
            message.timestamp = Date.now();
        }
        
        // Create message in database
        const messageRef = await db.collection('messages').add(message);
        
        res.status(201).json({
            id: messageRef.id,
            ...message,
            success: true
        });
    } catch (error) {
        console.error('Error sending message:', error);
        res.status(500).json({ error: 'Failed to send message' });
    }
});

// Get all students (for teachers)
app.get('/api/students', async (req, res) => {
    try {
        const studentsRef = db.collection('users').where('role', '==', 'student');
        const snapshot = await studentsRef.get();
        
        if (snapshot.empty) {
            return res.status(200).json([]);
        }
        
        const students = [];
        snapshot.forEach(doc => {
            const studentData = doc.data();
            students.push({
                id: doc.id,
                name: studentData.name,
                email: studentData.email,
                college: studentData.college,
                uniqueId: studentData.uniqueId
            });
        });
        
        res.status(200).json(students);
    } catch (error) {
        console.error('Error fetching students:', error);
        res.status(500).json({ error: 'Failed to fetch students' });
    }
});

// Get all teachers (for students)
app.get('/api/teachers', async (req, res) => {
    try {
        const teachersRef = db.collection('users').where('role', '==', 'teacher');
        const snapshot = await teachersRef.get();
        
        if (snapshot.empty) {
            return res.status(200).json([]);
        }
        
        const teachers = [];
        snapshot.forEach(doc => {
            const teacherData = doc.data();
            teachers.push({
                id: doc.id,
                name: teacherData.name,
                email: teacherData.email,
                college: teacherData.college,
                uniqueId: teacherData.uniqueId
            });
        });
        
        res.status(200).json(teachers);
    } catch (error) {
        console.error('Error fetching teachers:', error);
        res.status(500).json({ error: 'Failed to fetch teachers' });
    }
});

// Test API endpoint for debugging
app.get('/api/test', (req, res) => {
    console.log('Test API endpoint accessed');
    res.status(200).json({ 
        success: true, 
        message: 'Server is running properly',
        timestamp: new Date().toISOString()
    });
});

// Modified server check in script.js
app.get('/api/healthcheck', (req, res) => {
    res.status(200).json({ 
        status: 'healthy',
        message: 'Server is running properly',
        timestamp: new Date().toISOString()
    });
});

app.use((err, req, res, next) => {
    console.error('Server Error:', err);
    res.status(500).json({ 
        error: 'Internal server error',
        message: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
});

// Start server
server.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
}).on('error', (err) => {
    console.error('Server failed to start:', err);
    process.exit(1);
});