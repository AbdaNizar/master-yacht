const mongoose = require('mongoose');

const recommendationSchema = new mongoose.Schema({
    user: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'User', 
        required: true,
        index: true 
    },
    yacht: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'Yacht', 
        required: true 
    },
    score: { 
        type: Number, 
        required: true,
        min: 0,
        max: 100 
    },
    reasons: [{
        type: String,
        required: true
    }],
    aiAnalysis: {
        sentimentScore: { type: Number },
        keyPositives: [{ type: String }],
        keyNegatives: [{ type: String }],
        summary: { type: String },
        topReviews: [{
            clientName: { type: String },
            rating: { type: Number },
            comment: { type: String },
            date: { type: Date }
        }]
    },
    basedOnReviews: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Review'
    }],
    status: {
        type: String,
        enum: ['pending', 'sent', 'viewed', 'dismissed'],
        default: 'pending'
    },
    notificationSent: { 
        type: Boolean, 
        default: false 
    },
    emailSent: { 
        type: Boolean, 
        default: false 
    },
    viewedAt: { 
        type: Date 
    },
    dismissedAt: { 
        type: Date 
    }
}, { 
    timestamps: true 
});

recommendationSchema.index({ user: 1, status: 1 });
recommendationSchema.index({ createdAt: -1 });

module.exports = mongoose.model('Recommendation', recommendationSchema);
