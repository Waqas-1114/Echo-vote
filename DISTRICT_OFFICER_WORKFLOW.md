# District Officer Complaint Management Workflow

## Overview
This document outlines the complete workflow for district officers to manage and resolve complaints in the EchoVote system.

---

## 🔄 Complaint Lifecycle for District Officers

### 1. **Receive Assignment**
- Complaints are assigned by State Level Officers
- Officer receives notification of new assignment
- View complaint details including:
  - Ticket number
  - Description and category
  - Location details
  - Priority level
  - Due date (if assigned)

---

### 2. **Acknowledge Complaint**

**Endpoint:** `POST /api/officer/complaints/[id]/acknowledge`

**Purpose:** Acknowledge that you've received and reviewed the complaint

**Request Body:**
```json
{
  "message": "Acknowledged. Field visit scheduled for tomorrow."
}
```

**What Happens:**
- Status changes from `SUBMITTED` → `IN_PROGRESS`
- Status history updated with acknowledgment
- Timestamp recorded

---

### 3. **Submit Progress Updates & Proof of Work**

**Endpoint:** `POST /api/officer/complaints/[id]/submit-proof`

#### A. **Progress Update (Work in Progress)**

**Request Body:**
```json
{
  "description": "Road repair work has begun. 50% complete.",
  "workDetails": "Filled potholes on main stretch. Awaiting materials for final layer.",
  "photosUrls": [
    "/uploads/proof-of-work/[id]/photo1.jpg",
    "/uploads/proof-of-work/[id]/photo2.jpg"
  ],
  "markAsResolved": false,
  "estimatedCompletionDate": "2025-11-05"
}
```

**What Happens:**
- Proof of work added to complaint record
- Status history updated with progress
- Photos attached as evidence
- Due date can be updated if needed

#### B. **Mark as Resolved (Work Completed)**

**Request Body:**
```json
{
  "description": "Road repair completed successfully",
  "workDetails": "All potholes filled, new asphalt layer applied. Road marking done. Quality inspection passed.",
  "photosUrls": [
    "/uploads/proof-of-work/[id]/before.jpg",
    "/uploads/proof-of-work/[id]/during.jpg",
    "/uploads/proof-of-work/[id]/after.jpg"
  ],
  "markAsResolved": true
}
```

**Requirements:**
- ✅ At least one proof photo is **REQUIRED**
- ✅ Detailed work description
- ✅ Comprehensive work details

**What Happens:**
- Status changes to `RESOLVED`
- Resolution timestamp recorded
- Checks if completed before deadline
- Marks as requiring State Officer verification
- Status history updated with completion details

---

### 4. **Upload Proof Photos**

**Endpoint:** `POST /api/officer/complaints/[id]/upload-proof-photos`

**Method:** FormData upload

**Usage:**
```javascript
const formData = new FormData();
formData.append('photos', file1);
formData.append('photos', file2);
// ... up to 10 photos

fetch('/api/officer/complaints/[id]/upload-proof-photos', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`
  },
  body: formData
});
```

**Specifications:**
- Maximum 10 photos per upload
- Image files only (jpg, png, gif, webp)
- Maximum 5MB per photo
- Photos stored at: `/uploads/proof-of-work/[complaintId]/`

**Response:**
```json
{
  "message": "Photos uploaded successfully",
  "urls": [
    "/uploads/proof-of-work/[id]/timestamp-photo1.jpg",
    "/uploads/proof-of-work/[id]/timestamp-photo2.jpg"
  ]
}
```

Use these URLs in the `photosUrls` field when submitting proof.

---

## 📊 Dashboard Analytics

**Endpoint:** `GET /api/officer/district-dashboard`

**Returns:**
```json
{
  "officer": {
    "name": "Officer Name",
    "designation": "Executive Engineer",
    "department": "Public Works Department"
  },
  "assignedComplaints": [...],
  "statistics": {
    "total": 25,
    "inProgress": 15,
    "resolved": 8,
    "overdue": 2,
    "completedBeforeDeadline": 6,
    "averageResolutionTime": 5.2
  }
}
```

---

## 🎯 Best Practices

### 1. **Timely Acknowledgment**
- Acknowledge complaints within 24 hours of assignment
- Provide realistic estimated completion dates

### 2. **Regular Updates**
- Submit progress updates every 2-3 days
- Include photos at each major milestone
- Be transparent about delays or challenges

### 3. **Quality Documentation**
- Take clear "before" photos immediately
- Document the work process with "during" photos
- Capture detailed "after" photos from multiple angles
- Include close-ups of specific repairs

### 4. **Proof of Work Guidelines**
- **Description:** Brief summary (1-2 sentences)
- **Work Details:** Comprehensive details including:
  - Materials used
  - Techniques applied
  - Quality checks performed
  - Team members involved
  - Any challenges overcome

### 5. **Photo Guidelines**
- Well-lit, clear images
- Include reference points (landmarks, street signs)
- Show scale when relevant
- Multiple angles of completed work
- Include any inspection certificates or approvals

### 6. **Deadline Management**
- Review deadlines regularly
- Request extensions early if needed
- Prioritize critical/high-priority complaints
- Communicate proactively about potential delays

---

## ⚠️ Important Notes

1. **Verification Required:** When you mark a complaint as resolved, it goes to the State Level Officer for verification and final closure.

2. **Photo Evidence:** For resolved complaints, proof photos are mandatory. This ensures transparency and accountability.

3. **Status Flow:**
   ```
   SUBMITTED → ACKNOWLEDGED → IN_PROGRESS → RESOLVED → CLOSED
                    ↓              ↓              ↓
              (by District)  (by District)  (by State)
   ```

4. **Cannot Edit After Resolution:** Once marked as resolved, you cannot modify the complaint. Contact the State Officer if corrections are needed.

5. **Performance Tracking:** Your work completion rate, average resolution time, and deadline adherence are tracked and visible to supervisors.

---

## 🔐 API Authentication

All endpoints require Bearer token authentication:

```
Authorization: Bearer <your-jwt-token>
```

---

## 📞 Support

If you encounter issues:
1. Check your internet connection
2. Verify you have the correct permissions
3. Contact your State Level Officer
4. For technical issues, contact system administrator

---

## 🚀 Quick Start Example

```javascript
// 1. Acknowledge complaint
await fetch('/api/officer/complaints/123/acknowledge', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer <token>',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    message: 'Acknowledged and assigned team'
  })
});

// 2. Upload photos
const formData = new FormData();
formData.append('photos', photoFile1);
formData.append('photos', photoFile2);

const uploadRes = await fetch('/api/officer/complaints/123/upload-proof-photos', {
  method: 'POST',
  headers: { 'Authorization': 'Bearer <token>' },
  body: formData
});

const { urls } = await uploadRes.json();

// 3. Submit proof and resolve
await fetch('/api/officer/complaints/123/submit-proof', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer <token>',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    description: 'Work completed successfully',
    workDetails: 'Detailed description of work performed...',
    photosUrls: urls,
    markAsResolved: true
  })
});
```

---

**Version:** 1.0  
**Last Updated:** October 28, 2025  
**Document Owner:** EchoVote Development Team
