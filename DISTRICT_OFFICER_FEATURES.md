# District Officer Dashboard - Complete Feature Guide

## Overview
The District Officer Dashboard is a comprehensive complaint management system designed for district-level government officers to efficiently manage, track, and resolve citizen complaints within their jurisdiction.

## 🎯 Core Features

### 1. **Complaint Management**
- View all complaints assigned to the district officer
- Categorized into 4 tabs:
  - **Pending**: Complaints awaiting acknowledgment
  - **Acknowledged**: Complaints acknowledged but work not yet completed
  - **In Progress**: Active complaints being worked on
  - **Resolved**: Completed complaints awaiting verification

### 2. **Acknowledge Complaints**
District officers can acknowledge complaints to indicate they've started working on them:
- Click "Acknowledge" button on pending complaints
- Add optional acknowledgment message
- Status automatically updates to "IN_PROGRESS"
- Message is logged in complaint history
- Citizen and superior officers are notified

**API Endpoint**: `POST /api/officer/complaints/[id]/acknowledge`
```json
{
  "message": "Work will begin shortly. Team has been deployed."
}
```

### 3. **Submit Proof of Work**
After completing work, officers must submit proof before marking as resolved:
- Click "Submit Proof of Work" button
- Required fields:
  - **Description of Work Done** (required)
  - **Detailed Work Report** (required)
  - **Photo URLs** (optional, comma-separated)
- Automatically marks complaint as RESOLVED
- Updates status history
- Sends notification to state officer for verification

**API Endpoint**: `POST /api/officer/complaints/[id]/submit-proof`
```json
{
  "description": "Pothole repaired with asphalt filling",
  "workDetails": "Work completed on DD/MM/YYYY. Materials used: 50kg asphalt, 2 workers deployed. Area: 10 sq meters.",
  "photosUrls": ["https://example.com/before.jpg", "https://example.com/after.jpg"]
}
```

## 📊 Analytics Dashboard

### Performance Metrics
1. **Completion Rate**: Percentage of resolved vs. total complaints
2. **On-Time Resolution Rate**: Percentage of complaints resolved before deadline
3. **Average Resolution Time**: Mean days taken to resolve complaints
4. **Oldest Complaint**: Days since oldest unresolved complaint was submitted
5. **Recent Activity**: New complaints and resolutions in last 7 days
6. **Daily Average**: Average complaints received per day

### Category Breakdown
- Visual breakdown of complaints by category (Road Maintenance, Water Supply, etc.)
- Shows pending, in-progress, and resolved counts per category
- Resolution rate percentage and progress bar for each category

### Priority Distribution
- Visual representation of complaints by priority level:
  - 🔴 **CRITICAL**: Urgent, life-threatening issues
  - 🟠 **HIGH**: Important but not immediately dangerous
  - 🟡 **MEDIUM**: Standard priority
  - 🟢 **LOW**: Minor issues

### Workload by Location
- Breakdown of complaints by block/area
- Shows total, pending, and resolved counts per location
- Progress bars indicating resolution rate
- Helps identify areas needing more attention

## 🎨 UI Features

### Complaint Cards
Each complaint card displays:
- **Ticket Number**: Unique identifier (e.g., MH-MUM-20231028-1234)
- **Priority Badge**: Color-coded priority level
- **Status Badge**: Current workflow status
- **Deadline Status**: Overdue/Urgent/On Track indicators
- **Title & Description**: Complaint details (truncated)
- **Metadata**: Category, location, days open
- **Action Buttons**: Context-sensitive based on status

### Status Indicators
- ⏱️ **Pending Acknowledgment**: Yellow badge
- ✓ **Work in Progress**: Green badge
- 📸 **Proof Submitted**: Blue badge with count
- 🎯 **Awaiting Verification**: Purple badge

### Deadline Tracking
- 🔴 **OVERDUE**: Red badge - deadline passed
- 🟠 **URGENT**: Orange badge - 2 days or less remaining
- 🟡 **APPROACHING**: Yellow badge - 3-5 days remaining
- 🟢 **ON_TRACK**: Green badge - more than 5 days remaining

## 📈 Statistics Overview

### Main Dashboard Statistics
1. **Total Assigned**: All complaints assigned to officer
2. **Pending**: Awaiting acknowledgment
3. **In Progress**: Active work ongoing
4. **Resolved**: Work completed, awaiting verification
5. **Overdue**: Past deadline
6. **Urgent**: Approaching deadline (2 days or less)
7. **With Proof**: Complaints with proof of work submitted
8. **Acknowledged**: Complaints officer has acknowledged

## 🔄 Workflow

### Standard Complaint Lifecycle
```
1. SUBMITTED (by citizen)
   ↓
2. ASSIGNED (by state officer to district officer)
   ↓
3. ACKNOWLEDGED (district officer starts work)
   ↓
4. IN_PROGRESS (work ongoing)
   ↓
5. RESOLVED (proof submitted by district officer)
   ↓
6. VERIFIED (state officer verifies completion)
   ↓
7. CLOSED (complaint fully resolved)
```

### District Officer Actions
1. **View Dashboard**: See all assigned complaints with analytics
2. **Acknowledge Complaint**: Confirm receipt and start work
3. **Work on Complaint**: Resolve the issue on ground
4. **Submit Proof**: Upload work completion proof
5. **Wait for Verification**: State officer reviews and verifies

## 🎯 Best Practices

### For District Officers
1. **Acknowledge Promptly**: Acknowledge complaints within 24 hours
2. **Update Regularly**: Keep status history updated
3. **Detailed Reports**: Provide comprehensive work details
4. **Photo Evidence**: Always include before/after photos when possible
5. **Prioritize Critical**: Focus on CRITICAL and HIGH priority first
6. **Monitor Deadlines**: Address overdue and urgent complaints immediately

### For Photo Documentation
- Include before and after photos
- Ensure photos are clear and well-lit
- Show work area from multiple angles
- Include date/time stamps if possible
- Upload to stable hosting (consider government servers)

## 🔐 Security & Access

### Authentication
- JWT token-based authentication
- Role-based access control (only government officers)
- Admin level verification (must be DISTRICT level)

### Authorization
- Officers can only view their assigned complaints
- Cannot acknowledge complaints not assigned to them
- Cannot modify other officers' work

## 📱 Responsive Design
- Mobile-friendly interface
- Grid layouts adapt to screen size
- Touch-friendly buttons and forms
- Optimized for tablets and phones

## 🚀 API Endpoints Used

### Dashboard Data
```
GET /api/officer/district-dashboard
Authorization: Bearer <token>
```

### Acknowledge Complaint
```
POST /api/officer/complaints/[id]/acknowledge
Authorization: Bearer <token>
Content-Type: application/json

{
  "message": "Optional acknowledgment message"
}
```

### Submit Proof of Work
```
POST /api/officer/complaints/[id]/submit-proof
Authorization: Bearer <token>
Content-Type: application/json

{
  "description": "Brief description of work done",
  "workDetails": "Detailed work report",
  "photosUrls": ["url1", "url2"]
}
```

## 📊 Analytics Calculations

### Completion Rate
```
(Total Resolved / Total Complaints) × 100
```

### On-Time Resolution Rate
```
(Resolutions Before Deadline / Total Resolved) × 100
```

### Average Resolution Time
```
Sum of (days open for all resolved complaints) / Total Resolved
```

### Category Resolution Rate
```
(Resolved in Category / Total in Category) × 100
```

## 🎨 Color Coding System

### Priority Colors
- **CRITICAL**: Red (`text-red-600 bg-red-50`)
- **HIGH**: Orange (`text-orange-600 bg-orange-50`)
- **MEDIUM**: Yellow (`text-yellow-600 bg-yellow-50`)
- **LOW**: Green (`text-green-600 bg-green-50`)

### Status Colors
- **Pending**: Yellow
- **Acknowledged**: Green
- **In Progress**: Orange
- **Resolved**: Purple
- **Closed**: Blue

## 💡 Tips for Effective Use

1. **Morning Routine**: Start day by checking overdue and urgent complaints
2. **Bulk Actions**: Acknowledge multiple complaints in one session
3. **Analytics Review**: Check analytics weekly to identify trends
4. **Location Focus**: Use workload by location to plan field visits
5. **Documentation**: Keep detailed records for accountability
6. **Communication**: Use acknowledgment messages to set expectations
7. **Photo Quality**: Ensure proof photos are high quality and relevant

## 🔮 Future Enhancements (Planned)
- Real-time notifications for new assignments
- Bulk acknowledgment feature
- Export analytics to PDF/Excel
- Mobile app for field work
- Offline mode for proof submission
- Integration with GPS for location verification
- Team management for sub-assignments
- Citizen feedback on resolution quality

## 📞 Support
For technical issues or feature requests, contact the EchoVote development team.
