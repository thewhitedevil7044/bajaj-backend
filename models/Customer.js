const mongoose = require('mongoose');

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

module.exports = mongoose.model('Customer', customerSchema);