import { mongoose } from '../mongodb.js';

// Read Model Pattern - Denormalized data from Supabase for fast queries
const AnalyticsEventSchema = new mongoose.Schema({
  // Reference to Supabase user
  userId: { type: String, required: true, index: true },
  schoolId: { type: String, required: true, index: true },
  
  // Event data (denormalized for fast reads)
  eventType: { 
    type: String, 
    required: true,
    enum: ['attendance_marked', 'grade_entered', 'announcement_created', 'login', 'payment_made']
  },
  
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  
  // Temporal data
  createdAt: { type: Date, default: Date.now, index: true },
  year: { type: Number, default: () => new Date().getFullYear() },
  month: { type: Number, default: () => new Date().getMonth() + 1 },
  day: { type: Number, default: () => new Date().getDate() }
});

// Indexes for common queries
AnalyticsEventSchema.index({ schoolId: 1, eventType: 1, createdAt: -1 });
AnalyticsEventSchema.index({ userId: 1, createdAt: -1 });
AnalyticsEventSchema.index({ year: 1, month: 1, schoolId: 1 });

export const AnalyticsEvent = mongoose.models.AnalyticsEvent || 
  mongoose.model('AnalyticsEvent', AnalyticsEventSchema);
