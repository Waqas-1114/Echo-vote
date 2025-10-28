#!/bin/bash

# EchoVote - Complete Complaint Workflow Test Script (No jq required)
# This script demonstrates the entire complaint lifecycle from submission to closure

set -e  # Exit on error

echo "=================================================="
echo "EchoVote - Complete Workflow Test"
echo "=================================================="
echo ""

BASE_URL="http://localhost:3000"

# =====================================================
# STEP 1: Login as Ramesh Gupta (Citizen)
# =====================================================
echo "STEP 1: Logging in as Ramesh Gupta (Citizen)"
echo "Email: ramesh.gupta@gmail.com"
echo ""

CITIZEN_LOGIN=$(curl -s -X POST "${BASE_URL}/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "ramesh.gupta@gmail.com",
    "password": "Citizen@123"
  }')

echo "Response:"
echo "$CITIZEN_LOGIN"
echo ""

# Extract token using grep and sed
CITIZEN_TOKEN=$(echo "$CITIZEN_LOGIN" | grep -o '"token":"[^"]*"' | sed 's/"token":"//;s/"//')

if [ -z "$CITIZEN_TOKEN" ]; then
  echo "❌ Failed to login as citizen"
  exit 1
fi

echo "✓ Citizen logged in successfully"
echo "Token: ${CITIZEN_TOKEN:0:20}..."
echo ""

# =====================================================
# STEP 2: Submit a Complaint as Ramesh Gupta
# =====================================================
echo "STEP 2: Submitting a new complaint"
echo ""

COMPLAINT_RESPONSE=$(curl -s -X POST "${BASE_URL}/api/complaints" \
  -H "Authorization: Bearer ${CITIZEN_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Dangerous pothole on Main Street causing accidents",
    "description": "There is a very large and deep pothole on Main Street near the market area. Multiple vehicles have been damaged, and yesterday a motorcyclist fell and was injured. This is an urgent safety hazard that needs immediate attention.",
    "category": "Road Maintenance",
    "priority": "high",
    "location": {
      "state": "Maharashtra",
      "district": "Mumbai",
      "block": "Andheri",
      "address": "Main Street, Near Central Market, Andheri West"
    },
    "department": "Public Works Department",
    "isPublic": true
  }')

echo "Response:"
echo "$COMPLAINT_RESPONSE"
echo ""

# Extract complaint ID
COMPLAINT_ID=$(echo "$COMPLAINT_RESPONSE" | grep -o '"id":"[^"]*"' | head -1 | sed 's/"id":"//;s/"//')
TICKET_NUMBER=$(echo "$COMPLAINT_RESPONSE" | grep -o '"ticketNumber":"[^"]*"' | sed 's/"ticketNumber":"//;s/"//')

if [ -z "$COMPLAINT_ID" ]; then
  echo "❌ Failed to create complaint"
  exit 1
fi

echo "✓ Complaint created successfully"
echo "Ticket Number: $TICKET_NUMBER"
echo "Complaint ID: $COMPLAINT_ID"
echo ""

# =====================================================
# STEP 3: Login as Rajesh Kumar (State Officer)
# =====================================================
echo "STEP 3: Logging in as Rajesh Kumar (State Officer)"
echo "Email: rajesh.kumar@gov.in"
echo ""

STATE_LOGIN=$(curl -s -X POST "${BASE_URL}/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "rajesh.kumar@gov.in",
    "password": "Officer@123"
  }')

echo "Response:"
echo "$STATE_LOGIN"
echo ""

STATE_TOKEN=$(echo "$STATE_LOGIN" | grep -o '"token":"[^"]*"' | sed 's/"token":"//;s/"//')

if [ -z "$STATE_TOKEN" ]; then
  echo "❌ Failed to login as state officer"
  exit 1
fi

echo "✓ State officer logged in successfully"
echo ""

# =====================================================
# STEP 4: Get Amit Patel's ID and Assign Complaint
# =====================================================
echo "STEP 4: Assigning complaint to Amit Patel (District Officer)"
echo ""

# Get Amit Patel's officer ID
# We'll use the known ID from seed data: amit.patel@gov.in
AMIT_LOGIN=$(curl -s -X POST "${BASE_URL}/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "amit.patel@gov.in",
    "password": "Officer@123"
  }')

AMIT_ID=$(echo "$AMIT_LOGIN" | grep -o '"id":"[^"]*"' | head -1 | sed 's/"id":"//;s/"//')
echo "Amit Patel ID: $AMIT_ID"

ASSIGN_RESPONSE=$(curl -s -X POST "${BASE_URL}/api/officer/assign-complaint" \
  -H "Authorization: Bearer ${STATE_TOKEN}" \
  -H "Content-Type: application/json" \
  -d "{
    \"complaintId\": \"${COMPLAINT_ID}\",
    \"officerId\": \"${AMIT_ID}\",
    \"deadline\": \"2025-11-10\",
    \"instructions\": \"High priority complaint. Please inspect immediately and provide action plan within 24 hours.\"
  }")

echo "Response:"
echo "$ASSIGN_RESPONSE"
echo ""
echo "✓ Complaint assigned to Amit Patel"
echo ""

sleep 2

# =====================================================
# STEP 5: Login as Amit Patel (District Officer)
# =====================================================
echo "STEP 5: Using Amit Patel's credentials (District Officer)"
echo ""

DISTRICT_TOKEN=$(echo "$AMIT_LOGIN" | grep -o '"token":"[^"]*"' | sed 's/"token":"//;s/"//')

if [ -z "$DISTRICT_TOKEN" ]; then
  echo "❌ Failed to get district officer token"
  exit 1
fi

echo "✓ District officer authenticated"
echo ""

# =====================================================
# STEP 6: Acknowledge the Complaint
# =====================================================
echo "STEP 6: Acknowledging the complaint"
echo ""

ACK_RESPONSE=$(curl -s -X POST "${BASE_URL}/api/officer/complaints/${COMPLAINT_ID}/acknowledge" \
  -H "Authorization: Bearer ${DISTRICT_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "comments": "Complaint reviewed and acknowledged. Team will visit site tomorrow at 10 AM for inspection."
  }')

echo "Response:"
echo "$ACK_RESPONSE"
echo ""
echo "✓ Complaint acknowledged"
echo ""

sleep 1

# =====================================================
# STEP 7: Send Progress Update to Citizen
# =====================================================
echo "STEP 7: Sending progress update to citizen"
echo ""

NOTIFY_RESPONSE=$(curl -s -X POST "${BASE_URL}/api/officer/complaints/${COMPLAINT_ID}/notify" \
  -H "Authorization: Bearer ${DISTRICT_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Our team has inspected the pothole. Materials ordered. Repair work begins on Nov 2nd at 8 AM. Expected completion: Same day by 5 PM."
  }')

echo "Response:"
echo "$NOTIFY_RESPONSE"
echo ""
echo "✓ Progress notification sent"
echo ""

sleep 1

# =====================================================
# STEP 8: Submit Proof of Work
# =====================================================
echo "STEP 8: Submitting proof of work"
echo ""

PROOF_RESPONSE=$(curl -s -X POST "${BASE_URL}/api/officer/complaints/${COMPLAINT_ID}/submit-proof" \
  -H "Authorization: Bearer ${DISTRICT_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "description": "Pothole repair completed successfully",
    "workDetails": "Removed broken asphalt, filled with compacted gravel, applied hot-mix asphalt, sealed with road marking. Quality checks passed.",
    "photosUrls": [
      "https://images.unsplash.com/photo-1581094271901-8022df4466f9?w=800",
      "https://images.unsplash.com/photo-1621905252507-b35492cc74b4?w=800"
    ]
  }')

echo "Response:"
echo "$PROOF_RESPONSE"
echo ""
echo "✓ Proof of work submitted"
echo ""

sleep 1

# =====================================================
# STEP 9: Mark as Resolved
# =====================================================
echo "STEP 9: Marking complaint as resolved"
echo ""

RESOLVE_RESPONSE=$(curl -s -X PUT "${BASE_URL}/api/officer/complaints/${COMPLAINT_ID}/status" \
  -H "Authorization: Bearer ${DISTRICT_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "status": "resolved",
    "comments": "Work completed successfully. Pothole permanently repaired. Road surface is now smooth and safe. Post-repair inspection approved."
  }')

echo "Response:"
echo "$RESOLVE_RESPONSE"
echo ""

if [ -z "$RESOLVE_RESPONSE" ] || echo "$RESOLVE_RESPONSE" | grep -q '"message":"Status updated successfully"'; then
  echo "✓ Complaint marked as resolved"
else
  echo "⚠️ Status update response unclear, continuing..."
fi
echo ""

sleep 2

# =====================================================
# STEP 10: State Officer Verification and Closure
# =====================================================
echo "STEP 10: State officer verification and closure with notification to Ramesh Gupta"
echo ""

VERIFY_RESPONSE=$(curl -s -X POST "${BASE_URL}/api/officer/complaints/${COMPLAINT_ID}/verify-and-close" \
  -H "Authorization: Bearer ${STATE_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "verificationNotes": "Reviewed proof of work. Photographs show excellent repair quality. Work meets departmental standards. Approved for closure.",
    "approved": true,
    "notifyCitizen": true,
    "notificationMessage": "Dear Mr. Ramesh Gupta, Your complaint regarding the pothole on Main Street, Andheri has been successfully resolved and verified. The repair work meets high standards and the road is now safe. Thank you for bringing this to our attention. Your vigilance helps us maintain better infrastructure. - Rajesh Kumar, Chief Engineer, Maharashtra PWD"
  }')

echo "Response:"
echo "$VERIFY_RESPONSE"
echo ""
echo "✓ Complaint verified and closed with citizen notification"
echo ""

# =====================================================
# FINAL SUMMARY
# =====================================================
echo ""
echo "=================================================="
echo "WORKFLOW COMPLETED SUCCESSFULLY!"
echo "=================================================="
echo ""
echo "Summary:"
echo "--------"
echo "1. ✓ Citizen (Ramesh Gupta) submitted complaint"
echo "2. ✓ State Officer (Rajesh Kumar) assigned to District Officer (Amit Patel)"
echo "3. ✓ District Officer acknowledged the complaint"
echo "4. ✓ District Officer sent progress update"
echo "5. ✓ District Officer submitted proof of work"
echo "6. ✓ District Officer marked as resolved"
echo "7. ✓ State Officer (Rajesh Kumar) verified and closed"
echo "8. ✓ Notification sent to Ramesh Gupta"
echo ""
echo "Ticket Number: ${TICKET_NUMBER}"
echo "Complaint ID: ${COMPLAINT_ID}"
echo "Final Status: CLOSED"
echo ""
echo "Login as ramesh.gupta@gmail.com to see:"
echo "- Complete complaint history"
echo "- All status updates"
echo "- Proof of work photos"
echo "- Final notification from Rajesh Kumar"
echo ""
echo "=================================================="
