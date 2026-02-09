const mongoose = require("mongoose");

const AIUsageSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Trabajador',
        required: true
    },
    ticket: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Ticket',
        required: true
    },
    action: {
        type: String,
        enum: ["summary", "suggestion"],
        required: true
    },
    prompt: {
        type: String,
        required: true
    },
    response: {
        type: String,
        required: true
    },
    model: {
        type: String,
        default: "Gemini / Mock-AI"
    },
    timestamp: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model("AIUsage", AIUsageSchema);
