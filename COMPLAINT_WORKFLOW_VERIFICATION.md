# Complaint Verification Workflow - Complete Guide

## Overview
This document explains the complete complaint resolution and notification workflow implemented in EchoVote, with proper authorization controls for district and state officers.

## Workflow Stages

### 1. Complaint Submission
- **Who**: Citizens (anonymous or registered)
- **Status**: `SUBMITTED`
- **Action**: Citizen submits complaint with details, location, and category

### 2. Assignment (State Officer)
- **Who**: State Officer
- **Status**: Still `SUBMITTED`
- **Action**: State officer assigns unassigned complaints to district officers
- **Location**: State Officer Dashboard → Unassigned Complaints section

### 3. Acknowledgment (District Officer)
- **Who**: District Officer
- **Status**: `SUBMITTED` → `IN_PROGRESS`
- **Action**: District officer acknowledges complaint and starts working
- **Button**: "✅ Acknowledge & Start Work"
- **Location**: District Officer Dashboard → Pending tab

### 4. Work Progress (District Officer)
- **Who**: District Officer  
- **Status**: `IN_PROGRESS`
- **Available Actions**:
  - **Submit Proof of Work**: Upload photos and work details
  - **Notify Citizen**: Send progress updates to citizen
  - **Mark as Resolved**: When work is complete
- **Buttons**: 
  - "📸 Submit Proof of Work"
  - "📢 Notify Citizen (Progress Update)"
  - "✔️ Mark as Resolved"

### 5. Resolution (District Officer)
- **Who**: District Officer
- **Status**: `IN_PROGRESS` → `RESOLVED`
- **Action**: District officer marks complaint as resolved after completing work
- **Important**: 
  - Must have submitted at least one proof of work
  - Cannot notify citizen about completion at this stage
  - Complaint awaits state officer verification

### 6. State Officer Verification
- **Who**: State Officer
- **Status**: `RESOLVED` → `CLOSED` (if approved) or `RESOLVED` → `IN_PROGRESS` (if rejected)
- **Action**: State officer reviews proof of work and either:
  - **Approves**: Complaint is closed permanently
  - **Rejects**: Sent back to district officer for rework
- **Location**: State Officer Dashboard → Awaiting Verification section
- **Optional**: Notify citizen upon closure

### 7. Final Closure
- **Who**: State Officer (only)
- **Status**: `CLOSED`
- **Action**: State officer closes complaint and optionally notifies citizen
- **Notification**: State officer can send final notification to citizen

## Authorization Matrix

| Action | District Officer | State Officer |
|--------|------------------|---------------|
| Acknowledge Complaint | ✅ (only assigned complaints) | ❌ |
| Submit Proof of Work | ✅ (while in progress) | ❌ |
| Mark as Resolved | ✅ (after proof submitted) | ❌ |
| Notify Citizen (Progress) | ✅ (only during IN_PROGRESS) | ❌ |
| Notify Citizen (After Resolved) | ❌ (blocked until state verifies) | ✅ |
| Verify & Close Complaint | ❌ | ✅ |
| Assign Complaint | ❌ | ✅ |

## API Endpoints

### District Officer Actions
1. **Acknowledge**: `POST /api/officer/complaints/[id]/acknowledge`
2. **Submit Proof**: `POST /api/officer/complaints/[id]/submit-proof`
3. **Update Status**: `POST /api/officer/complaints/[id]/status`
4. **Notify Citizen**: `POST /api/officer/complaints/[id]/notify`

### State Officer Actions
1. **Verify & Close**: `POST /api/officer/complaints/[id]/verify-and-close`
2. **Assign Complaint**: `POST /api/officer/assign-complaint`
3. **Dashboard Data**: `GET /api/officer/state-dashboard`

## Notification Rules

### District Officer Notifications
- **Allowed**: During `IN_PROGRESS` or `ACKNOWLEDGED` status
- **Purpose**: Send progress updates to citizens
- **Restriction**: Cannot notify after marking as `RESOLVED`
- **Message**: Prefixed with "📢 Citizen Notification from [Officer Name] (Progress Update)"

### State Officer Notifications
- **Allowed**: After verifying `RESOLVED` complaints (setting to `CLOSED`)
- **Purpose**: Final notification about complaint closure
- **Restriction**: Should only notify when closing complaints
- **Message**: Sent as part of verify-and-close action
- **Optional**: State officer can choose whether to notify citizen

## UI Components

### District Officer Dashboard
**File**: `/src/app/dashboard/officer/district/page.tsx`

**Features**:
- Statistics overview (total, pending, acknowledged, in progress, resolved)
- Analytics (category breakdown, priority distribution, performance metrics)
- Complaint tabs: Pending, Acknowledged, In Progress, Resolved
- Action buttons based on complaint status
- Status indicators for resolved and closed complaints

**Status Messages**:
- **IN_PROGRESS**: Shows action buttons (Proof, Resolve, Notify)
- **RESOLVED**: "⏳ Awaiting state officer verification - Cannot notify citizen until verified"
- **CLOSED**: "✓ Complaint closed by state officer"

### State Officer Dashboard  
**File**: `/src/app/dashboard/officer/state/page.tsx`

**Features**:
- Statistics: Total district officers, free officers, unassigned, assigned, awaiting verification
- Officer management: Free and busy officers list
- Complaint assignment: Select complaint and officer, add deadline and instructions
- Verification panel: Review proof of work, approve/reject with comments
- Optional citizen notification upon closure

**Sections**:
1. **Free Officers**: Available for assignment
2. **Busy Officers**: Currently handling complaints
3. **Unassigned Complaints**: Need assignment to district officers
4. **Assigned Complaints**: Currently being worked on
5. **Awaiting Verification**: Resolved complaints ready for state officer review

## Status Workflow Diagram

```
SUBMITTED (Citizen files complaint)
    ↓
[State Officer assigns to District Officer]
    ↓
IN_PROGRESS (District Officer acknowledges)
    ↓
[District Officer can: Submit Proof, Notify Citizen, Continue Work]
    ↓
RESOLVED (District Officer marks complete)
    ↓
[State Officer reviews proof of work]
    ↓
    ├─→ CLOSED (State Officer approves) ← Final state, can notify citizen
    └─→ IN_PROGRESS (State Officer rejects) ← Back to district officer
```

## Key Business Rules

1. **District officers cannot close complaints** - Only state officers can set status to `CLOSED`
2. **District officers cannot notify after resolving** - Prevents premature completion notifications
3. **State officers must verify before closure** - Ensures quality control
4. **Proof of work is mandatory** - District officers should submit evidence before resolving
5. **Single source of truth** - Status field determines available actions, not derived flags
6. **Hierarchical approval** - Maintains chain of command (District → State)

## Testing the Workflow

### Test Scenario 1: Normal Flow
1. Login as Amit Patel (District Officer) - `amit.patel@gov.in` / `password123`
2. Navigate to District Officer Dashboard
3. Find a SUBMITTED complaint in Pending tab
4. Click "✅ Acknowledge & Start Work"
5. Click "📸 Submit Proof of Work" - Add description, work details, photos
6. Click "📢 Notify Citizen (Progress Update)" - Send progress message
7. Click "✔️ Mark as Resolved" - When work complete
8. Logout

9. Login as Rajesh Kumar (State Officer) - `rajesh.kumar@gov.in` / `password123`
10. Navigate to State Officer Dashboard
11. Find complaint in "Awaiting Verification" section
12. Click "Review & Verify" button
13. Review proof of work submitted
14. Add verification comments (optional)
15. Check "📢 Notify citizen upon closure" if desired
16. Add notification message
17. Click "✓ Approve and Close Complaint"
18. Verify complaint is now CLOSED

### Test Scenario 2: Rejection Flow
Follow steps 1-8 from above, then:
9-12. Same as above
13. Add rejection comments
14. Click "✗ Reject Resolution"
15. Verify complaint is back to IN_PROGRESS
16. District officer can see it again and rework

## Security Considerations

- **Token-based authentication**: All API routes require valid JWT Bearer token
- **Role validation**: Endpoints check userType (government_officer) and adminLevel (DISTRICT/STATE)
- **Assignment verification**: District officers can only act on complaints assigned to them
- **Status-based authorization**: Actions blocked if complaint not in appropriate status
- **State officer override**: Only state officers can verify and close complaints

## Database Models

### Complaint Schema
```typescript
status: ComplaintStatus (SUBMITTED | ACKNOWLEDGED | IN_PROGRESS | RESOLVED | CLOSED | REJECTED)
proofOfWork: [{
  description: string,
  workDetails: string,
  photos: string[],
  submittedBy: ObjectId,
  submittedAt: Date
}]
resolution: {
  resolvedAt: Date,
  resolvedBy: ObjectId,
  resolutionNotes: string,
  verifiedBy: ObjectId,
  verifiedAt: Date,
  verificationNotes: string,
  verificationRequired: boolean
}
statusHistory: [{
  status: ComplaintStatus,
  updatedBy: ObjectId,
  comments: string,
  updatedAt: Date
}]
```

## Future Enhancements

1. **Email/SMS Integration**: Real notifications instead of just status history
2. **Push Notifications**: Real-time updates for citizens and officers
3. **Escalation Timers**: Auto-escalate if not resolved within deadline
4. **Citizen Feedback**: Allow citizens to rate resolution quality
5. **Analytics Dashboard**: Track officer performance over time
6. **Attachment Management**: Better photo upload and storage system
7. **Mobile App**: Dedicated apps for citizens and officers
8. **Multi-language Support**: Notifications in regional languages

## Troubleshooting

### Issue: "Cannot notify citizen" error
**Cause**: District officer trying to notify after marking resolved
**Solution**: District officers can only notify during IN_PROGRESS status

### Issue: "Not authorized to close complaint" error
**Cause**: District officer trying to close complaint directly
**Solution**: Only state officers can close complaints after verification

### Issue: Buttons not showing
**Cause**: Status check logic incorrect
**Solution**: Verify complaint.status field matches expected values (lowercase)

### Issue: State officer can't see resolved complaints
**Cause**: API not returning resolved complaints
**Solution**: Check state-dashboard route includes resolvedComplaints query

## Contact & Support

For questions or issues with the workflow:
- Check API route console logs for detailed error messages
- Review browser console for frontend errors
- Check MongoDB for complaint status and history
- Verify user adminLevel and assignment in database

---

**Last Updated**: January 2025
**Version**: 1.0
**Author**: EchoVote Development Team
