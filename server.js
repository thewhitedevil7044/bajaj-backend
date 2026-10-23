const dotenv = require('dotenv');
dotenv.config();

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const app = express();
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// ==========================================
// DATABASE CONNECTION & SCHEMAS
// ==========================================
mongoose.connect(process.env.MONGO_URI)
  .then(async () => {
      console.log("✅ MongoDB Connected Successfully!");
      await seedAdmins(); 
  })
  .catch((err) => console.log("❌ MongoDB Error: ", err.message));

const adminSchema = new mongoose.Schema({
    adminId: { type: String, unique: true, required: true },
    username: { type: String, unique: true, required: true },
    password: { type: String, required: true }
});
const Admin = mongoose.model('Admin', adminSchema);

const customerSchema = new mongoose.Schema({
    app_no: { type: String, unique: true, required: true },
    created_by: { type: String, required: true },
    name: String,
    father_name: String,
    mobile: String,
    email: String,
    dob: String,
    employment: String,
    city: String,
    address: String,
    pan: String,
    aadhaar: String,
    kyc_status: String,
    loan_type: String,
    amount: Number,
    rate: Number,
    interest_method: String,
    tenure: Number,
    fee: Number,
    status: String,
    acc_no: String,
    ifsc: String,
    bank_name: String,
    photo: String
}, { timestamps: true });
const Customer = mongoose.model('Customer', customerSchema);

// Default 21 Admins Database mein daalne ka function
async function seedAdmins() {
    const count = await Admin.countDocuments();
    if (count === 0) {
        const salt = await bcrypt.genSalt(10);
        const hashedPass = await bcrypt.hash('pass123', salt);

        for (let i = 1; i <= 21; i++) {
            let username = i < 10 ? `admin0${i}` : `admin${i}`;
            let professionalId = `BAJ${7153920 + i}`; 
            await Admin.create({ 
                adminId: professionalId, 
                username: username, 
                password: hashedPass 
            });
        }
        console.log("✅ 21 Admins created in Database!");
    }
}

// ==========================================
// MIDDLEWARE (Security)
// ==========================================
function verifyToken(req, res, next) {
    const token = req.headers['authorization'];
    if (!token) return res.status(401).json({ message: "Access Denied. Please Login." });
    
    try {
        const verified = jwt.verify(token, process.env.JWT_SECRET);
        req.admin = verified;
        next();
    } catch (err) {
        res.status(400).json({ message: "Invalid Token" });
    }
}

// ==========================================
// API ROUTES
// ==========================================

// 1. Admin Login
app.post('/api/admin/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        
        const admin = await Admin.findOne({ username });
        if (!admin) return res.status(400).json({ message: "Invalid Credentials" });

        const validPass = await bcrypt.compare(password, admin.password);
        if (!validPass) return res.status(400).json({ message: "Invalid Credentials" });

        const token = jwt.sign({ id: admin.adminId }, process.env.JWT_SECRET, { expiresIn: '1d' });
        res.json({ token, adminId: admin.adminId, message: "Login Success" });
    } catch (err) {
        console.log("❌ LOGIN ERROR:", err.message);
        res.status(500).json({ error: err.message });
    }
});

// 2. Admin List (Super Admin ke liye)
app.get('/api/admin/list', async (req, res) => {
    try {
        const admins = await Admin.find({}, '-password');
        res.json(admins);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 3. Admin Update (Super Admin ke liye)
app.put('/api/admin/update/:id', async (req, res) => {
    try {
        const { id } = req.params; // Yahan ab MongoDB ki lambi ID aayegi
        const { username, password } = req.body;

        const updateData = {};
        if (username) updateData.username = username;
        if (password) {
            const salt = await bcrypt.genSalt(10);
            updateData.password = await bcrypt.hash(password, salt);
        }

        // _id se dhundho (adminId se nahi)
        const updatedAdmin = await Admin.findByIdAndUpdate(id, updateData, { new: true });

        if (!updatedAdmin) return res.status(404).json({ message: "Admin not found" });
        res.json({ success: true, message: "Admin Updated Successfully!" });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 4. Customer Create
app.post('/api/customer/create', verifyToken, async (req, res) => {
    try {
        const newCustomer = new Customer({ 
            ...req.body, 
            created_by: req.admin.id 
        });
        await newCustomer.save();
        res.json({ success: true, message: "Customer Saved Successfully" });
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

// 5. Get Customers (Sirf apne)
app.get('/api/customers', verifyToken, async (req, res) => {
    try {
        const customers = await Customer.find({ created_by: req.admin.id });
        res.json(customers);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 6. Search Customer (Public)
app.get('/api/customer/search/:app_no', async (req, res) => {
    try {
        const customer = await Customer.findOne({ app_no: req.params.app_no });
        if (!customer) return res.status(404).json({ message: "Application not found" });
        res.json(customer);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 7. Update Customer (Edit)
app.put('/api/customer/update/:app_no', verifyToken, async (req, res) => {
    try {
        const { app_no } = req.params;
        const updateData = req.body;

        const updatedCustomer = await Customer.findOneAndUpdate(
            { app_no: app_no, created_by: req.admin.id }, 
            updateData, 
            { new: true }
        );

        if (!updatedCustomer) {
            return res.status(404).json({ message: "Customer not found or no permission." });
        }
        res.json({ success: true, message: "Customer Updated Successfully!", data: updatedCustomer });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ==========================================
// SERVER START (Sabse Niche)
// ==========================================
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
});