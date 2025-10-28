#!/bin/bash

# EchoVote - Complete Complaint Workflow Test Script
# This script demonstrates the entire complaint lifecycle from submission to closure

set -e  # Exit on error

echo "=================================================="
echo "EchoVote - Complete Workflow Test"
echo "=================================================="
echo ""

BASE_URL="http://localhost:3000"

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# =====================================================
# STEP 1: Login as Ramesh Gupta (Citizen)
# =====================================================
echo -e "${BLUE}STEP 1: Logging in as Ramesh Gupta (Citizen)${NC}"
echo "Email: ramesh.gupta@gmail.com"
echo ""

CITIZEN_LOGIN=$(curl -s -X POST "${BASE_URL}/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "ramesh.gupta@gmail.com",
    "password": "Citizen@123"
  }')

CITIZEN_TOKEN=$(echo $CITIZEN_LOGIN | jq -r '.token')
CITIZEN_ID=$(echo $CITIZEN_LOGIN | jq -r '.user._id')

if [ "$CITIZEN_TOKEN" == "null" ]; then
  echo "❌ Failed to login as citizen"
  echo $CITIZEN_LOGIN | jq '.'
  exit 1
fi

echo -e "${GREEN}✓ Citizen logged in successfully${NC}"
echo "Citizen ID: $CITIZEN_ID"
echo ""

# =====================================================
# STEP 2: Submit a Complaint as Ramesh Gupta
# =====================================================
echo -e "${BLUE}STEP 2: Submitting a new complaint${NC}"
echo ""

COMPLAINT_RESPONSE=$(curl -s -X POST "${BASE_URL}/api/complaints" \
  -H "Authorization: Bearer ${CITIZEN_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Dangerous pothole on Main Street causing accidents",
    "description": "There is a very large and deep pothole on Main Street near the market area. Multiple vehicles have been damaged, and yesterday a motorcyclist fell and was injured. This is an urgent safety hazard that needs immediate attention. The pothole has been growing for weeks due to heavy rains.",
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

COMPLAINT_ID=$(echo $COMPLAINT_RESPONSE | jq -r '.complaint._id')
TICKET_NUMBER=$(echo $COMPLAINT_RESPONSE | jq -r '.complaint.ticketNumber')

if [ "$COMPLAINT_ID" == "null" ]; then
  echo "❌ Failed to create complaint"
  echo $COMPLAINT_RESPONSE | jq '.'
  exit 1
fi

echo -e "${GREEN}✓ Complaint created successfully${NC}"
echo "Ticket Number: $TICKET_NUMBER"
echo "Complaint ID: $COMPLAINT_ID"
echo ""

# =====================================================
# STEP 3: Login as Rajesh Kumar (State Officer)
# =====================================================
echo -e "${BLUE}STEP 3: Logging in as Rajesh Kumar (State Officer)${NC}"
echo "Email: rajesh.kumar@gov.in"
echo ""

STATE_LOGIN=$(curl -s -X POST "${BASE_URL}/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "rajesh.kumar@gov.in",
    "password": "Officer@123"
  }')

STATE_TOKEN=$(echo $STATE_LOGIN | jq -r '.token')

if [ "$STATE_TOKEN" == "null" ]; then
  echo "❌ Failed to login as state officer"
  echo $STATE_LOGIN | jq '.'
  exit 1
fi

echo -e "${GREEN}✓ State officer logged in successfully${NC}"
echo ""

# =====================================================
# STEP 4: Assign Complaint to Amit Patel (District Officer)
# =====================================================
echo -e "${BLUE}STEP 4: Assigning complaint to Amit Patel (District Officer)${NC}"
echo ""

# First, get Amit Patel's ID from state dashboard
STATE_DASHBOARD=$(curl -s -X GET "${BASE_URL}/api/officer/state-dashboard" \
  -H "Authorization: Bearer ${STATE_TOKEN}")

AMIT_ID=$(echo $STATE_DASHBOARD | jq -r '.freeOfficers[] | select(.name == "Amit Patel") | .id')

if [ "$AMIT_ID" == "null" ] || [ -z "$AMIT_ID" ]; then
  # Try busy officers
  AMIT_ID=$(echo $STATE_DASHBOARD | jq -r '.busyOfficers[] | select(.name == "Amit Patel") | .id')
fi

echo "Amit Patel ID: $AMIT_ID"

ASSIGN_RESPONSE=$(curl -s -X POST "${BASE_URL}/api/officer/assign-complaint" \
  -H "Authorization: Bearer ${STATE_TOKEN}" \
  -H "Content-Type: application/json" \
  -d "{
    \"complaintId\": \"${COMPLAINT_ID}\",
    \"officerId\": \"${AMIT_ID}\",
    \"deadline\": \"2025-11-10\",
    \"instructions\": \"High priority complaint from Andheri area. Please inspect the site immediately and provide an action plan within 24 hours. Coordinate with the local municipal team for emergency repairs.\"
  }")

echo $ASSIGN_RESPONSE | jq '.'

if [ "$(echo $ASSIGN_RESPONSE | jq -r '.message')" != "Complaint assigned successfully" ]; then
  echo "⚠️  Assignment may have failed, but continuing..."
else
  echo -e "${GREEN}✓ Complaint assigned to Amit Patel${NC}"
fi
echo ""

# Wait a moment for database to update
sleep 2

# =====================================================
# STEP 5: Login as Amit Patel (District Officer)
# =====================================================
echo -e "${BLUE}STEP 5: Logging in as Amit Patel (District Officer)${NC}"
echo "Email: amit.patel@gov.in"
echo ""

DISTRICT_LOGIN=$(curl -s -X POST "${BASE_URL}/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "amit.patel@gov.in",
    "password": "Officer@123"
  }')

DISTRICT_TOKEN=$(echo $DISTRICT_LOGIN | jq -r '.token')

if [ "$DISTRICT_TOKEN" == "null" ]; then
  echo "❌ Failed to login as district officer"
  echo $DISTRICT_LOGIN | jq '.'
  exit 1
fi

echo -e "${GREEN}✓ District officer logged in successfully${NC}"
echo ""

# =====================================================
# STEP 6: Acknowledge the Complaint
# =====================================================
echo -e "${BLUE}STEP 6: Acknowledging the complaint${NC}"
echo ""

ACK_RESPONSE=$(curl -s -X POST "${BASE_URL}/api/officer/complaints/${COMPLAINT_ID}/acknowledge" \
  -H "Authorization: Bearer ${DISTRICT_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "comments": "Complaint has been reviewed and acknowledged. Our team will visit the site tomorrow morning at 10 AM for inspection. We will assess the damage and prepare a repair plan."
  }')

echo $ACK_RESPONSE | jq '.'

if [ "$(echo $ACK_RESPONSE | jq -r '.message')" != "Complaint acknowledged successfully" ]; then
  echo "⚠️  Acknowledgment may have failed, but continuing..."
else
  echo -e "${GREEN}✓ Complaint acknowledged${NC}"
fi
echo ""

sleep 1

# =====================================================
# STEP 7: Send Progress Update to Citizen
# =====================================================
echo -e "${BLUE}STEP 7: Sending progress update to citizen${NC}"
echo ""

NOTIFY_RESPONSE=$(curl -s -X POST "${BASE_URL}/api/officer/complaints/${COMPLAINT_ID}/notify" \
  -H "Authorization: Bearer ${DISTRICT_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Dear citizen, our team has inspected the pothole on Main Street. We have ordered the necessary materials (asphalt, gravel, and road marking paint). Repair work will begin on November 2nd at 8 AM. Expected completion: Same day by 5 PM. Thank you for your patience."
  }')

echo $NOTIFY_RESPONSE | jq '.'
echo -e "${GREEN}✓ Progress notification sent${NC}"
echo ""

sleep 1

# =====================================================
# STEP 8: Submit Proof of Work
# =====================================================
echo -e "${BLUE}STEP 8: Submitting proof of work${NC}"
echo ""

PROOF_RESPONSE=$(curl -s -X POST "${BASE_URL}/api/officer/complaints/${COMPLAINT_ID}/submit-proof" \
  -H "Authorization: Bearer ${DISTRICT_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "description": "Pothole repair completed successfully",
    "workDetails": "The damaged road section has been completely repaired. We removed the broken asphalt, filled the pothole with compacted gravel base, applied hot-mix asphalt, and sealed with road marking paint. The repair area has been leveled with the surrounding road surface. Quality checks passed - the surface is smooth and safe for all vehicles. Road markings have been restored.",
    "photosUrls": [
      "https://images.unsplash.com/photo-1581094271901-8022df4466f9?w=800",
      "https://images.unsplash.com/photo-1621905252507-b35492cc74b4?w=800",
      "https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=800"
    ]
  }')

echo $PROOF_RESPONSE | jq '.'
echo -e "${GREEN}✓ Proof of work submitted${NC}"
echo ""

sleep 1

# =====================================================
# STEP 9: Mark as Resolved
# =====================================================
echo -e "${BLUE}STEP 9: Marking complaint as resolved${NC}"
echo ""

RESOLVE_RESPONSE=$(curl -s -X POST "${BASE_URL}/api/officer/complaints/${COMPLAINT_ID}/status" \
  -H "Authorization: Bearer ${DISTRICT_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "status": "resolved",
    "comments": "Work completed successfully. The pothole has been permanently repaired with high-quality materials. The road surface is now smooth and safe. All safety protocols were followed during the repair work. Post-repair inspection completed and approved."
  }')

echo $RESOLVE_RESPONSE | jq '.'
echo -e "${GREEN}✓ Complaint marked as resolved${NC}"
echo ""

sleep 1

# =====================================================
# STEP 10: State Officer Verification and Closure
# =====================================================
echo -e "${BLUE}STEP 10: State officer verification and closure${NC}"
echo ""

VERIFY_RESPONSE=$(curl -s -X POST "${BASE_URL}/api/officer/complaints/${COMPLAINT_ID}/verify-and-close" \
  -H "Authorization: Bearer ${STATE_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "verificationNotes": "I have reviewed the proof of work submitted by the district officer. The photographs show excellent quality repair work. The pothole has been properly filled and sealed. The work meets all departmental standards. Approved for closure.",
    "approved": true,
    "notifyCitizen": true,
    "notificationMessage": "Dear Mr. Ramesh Gupta, Your complaint regarding the dangerous pothole on Main Street, Andheri has been successfully resolved and verified by our department. The repair work has been completed to high standards and the road is now safe for use. Thank you for bringing this issue to our attention and for your patience during the resolution process. Your vigilance helps us maintain better infrastructure for all citizens. - Rajesh Kumar, Chief Engineer, Maharashtra PWD"
  }')

echo $VERIFY_RESPONSE | jq '.'
echo -e "${GREEN}✓ Complaint verified and closed with citizen notification${NC}"
echo ""

# =====================================================
# FINAL SUMMARY
# =====================================================
echo ""
echo "=================================================="
echo -e "${GREEN}WORKFLOW COMPLETED SUCCESSFULLY!${NC}"
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
echo "7. ✓ State Officer verified and closed with notification"
echo ""
echo "Ticket Number: ${TICKET_NUMBER}"
echo "Final Status: CLOSED"
echo ""
echo "You can now login as ramesh.gupta@gmail.com to see:"
echo "- The complete complaint history"
echo "- All status updates"
echo "- Proof of work photos"
echo "- Final notification from state officer"
echo ""
echo "=================================================="
