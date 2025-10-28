#!/bin/bash

# EchoVote - Complete Workflow Test Script
# This script demonstrates the full complaint resolution workflow

BASE_URL="http://localhost:3000"
echo "🚀 EchoVote Complete Workflow Test"
echo "=================================="
echo ""

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Test credentials
STATE_EMAIL="rajesh.kumar@gov.in"
STATE_PASS="Officer@123"
DISTRICT_EMAIL="amit.patel@gov.in"
DISTRICT_PASS="Officer@123"

echo "${BLUE}Step 1: Login as State Officer${NC}"
echo "Email: $STATE_EMAIL"
STATE_TOKEN=$(curl -s -X POST "$BASE_URL/api/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$STATE_EMAIL\",\"password\":\"$STATE_PASS\"}" | jq -r '.token')

if [ "$STATE_TOKEN" != "null" ] && [ -n "$STATE_TOKEN" ]; then
    echo "${GREEN}✓ State officer login successful${NC}"
else
    echo "${RED}✗ State officer login failed${NC}"
    exit 1
fi
echo ""

echo "${BLUE}Step 2: Fetch State Dashboard${NC}"
STATE_DASHBOARD=$(curl -s -X GET "$BASE_URL/api/officer/state-dashboard" \
  -H "Authorization: Bearer $STATE_TOKEN")

UNASSIGNED_COUNT=$(echo $STATE_DASHBOARD | jq '.statistics.unassignedComplaints')
RESOLVED_COUNT=$(echo $STATE_DASHBOARD | jq '.statistics.resolvedComplaints')
FREE_OFFICERS=$(echo $STATE_DASHBOARD | jq '.statistics.freeOfficers')

echo "📊 Unassigned Complaints: $UNASSIGNED_COUNT"
echo "📊 Resolved (Awaiting Verification): $RESOLVED_COUNT"
echo "👥 Free District Officers: $FREE_OFFICERS"
echo ""

if [ "$UNASSIGNED_COUNT" -gt 0 ]; then
    echo "${BLUE}Step 3: Get First Unassigned Complaint${NC}"
    COMPLAINT_ID=$(echo $STATE_DASHBOARD | jq -r '.unassignedComplaints[0]._id')
    COMPLAINT_TICKET=$(echo $STATE_DASHBOARD | jq -r '.unassignedComplaints[0].ticketNumber')
    echo "📝 Complaint: $COMPLAINT_TICKET"
    echo "🆔 ID: $COMPLAINT_ID"
    echo ""

    if [ "$FREE_OFFICERS" -gt 0 ]; then
        OFFICER_ID=$(echo $STATE_DASHBOARD | jq -r '.freeOfficers[0]._id')
        OFFICER_NAME=$(echo $STATE_DASHBOARD | jq -r '.freeOfficers[0].name')
        
        echo "${BLUE}Step 4: Assign Complaint to District Officer${NC}"
        echo "👤 Assigning to: $OFFICER_NAME"
        
        # Calculate deadline (7 days from now)
        DEADLINE=$(date -u -v+7d +"%Y-%m-%d")
        
        ASSIGN_RESULT=$(curl -s -X POST "$BASE_URL/api/officer/assign-complaint" \
          -H "Authorization: Bearer $STATE_TOKEN" \
          -H "Content-Type: application/json" \
          -d "{\"complaintId\":\"$COMPLAINT_ID\",\"officerId\":\"$OFFICER_ID\",\"deadline\":\"$DEADLINE\",\"instructions\":\"Please resolve within 7 days\"}")
        
        if echo $ASSIGN_RESULT | jq -e '.message' > /dev/null; then
            echo "${GREEN}✓ Complaint assigned successfully${NC}"
            echo "⏰ Deadline: $DEADLINE"
        else
            echo "${RED}✗ Assignment failed${NC}"
        fi
        echo ""
    fi
fi

echo "${BLUE}Step 5: Login as District Officer${NC}"
echo "Email: $DISTRICT_EMAIL"
DISTRICT_TOKEN=$(curl -s -X POST "$BASE_URL/api/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$DISTRICT_EMAIL\",\"password\":\"$DISTRICT_PASS\"}" | jq -r '.token')

if [ "$DISTRICT_TOKEN" != "null" ] && [ -n "$DISTRICT_TOKEN" ]; then
    echo "${GREEN}✓ District officer login successful${NC}"
else
    echo "${RED}✗ District officer login failed${NC}"
    exit 1
fi
echo ""

echo "${BLUE}Step 6: Fetch District Dashboard${NC}"
DISTRICT_DASHBOARD=$(curl -s -X GET "$BASE_URL/api/officer/district-dashboard" \
  -H "Authorization: Bearer $DISTRICT_TOKEN")

PENDING_COUNT=$(echo $DISTRICT_DASHBOARD | jq '.statistics.pendingAcknowledgment')
IN_PROGRESS_COUNT=$(echo $DISTRICT_DASHBOARD | jq '.statistics.inProgress')

echo "📊 Pending Acknowledgment: $PENDING_COUNT"
echo "📊 In Progress: $IN_PROGRESS_COUNT"
echo ""

if [ "$PENDING_COUNT" -gt 0 ]; then
    PENDING_COMPLAINT_ID=$(echo $DISTRICT_DASHBOARD | jq -r '.complaints.pending[0]._id')
    PENDING_TICKET=$(echo $DISTRICT_DASHBOARD | jq -r '.complaints.pending[0].ticketNumber')
    
    echo "${BLUE}Step 7: Acknowledge Complaint${NC}"
    echo "📝 Complaint: $PENDING_TICKET"
    
    ACK_RESULT=$(curl -s -X POST "$BASE_URL/api/officer/complaints/$PENDING_COMPLAINT_ID/acknowledge" \
      -H "Authorization: Bearer $DISTRICT_TOKEN" \
      -H "Content-Type: application/json" \
      -d '{"message":"Acknowledged. Work will begin immediately."}')
    
    if echo $ACK_RESULT | jq -e '.message' > /dev/null; then
        echo "${GREEN}✓ Complaint acknowledged${NC}"
    else
        echo "${RED}✗ Acknowledgment failed${NC}"
    fi
    echo ""
    
    echo "${YELLOW}⏳ Simulating work in progress...${NC}"
    sleep 2
    echo ""
    
    echo "${BLUE}Step 8: Submit Proof of Work${NC}"
    
    PROOF_RESULT=$(curl -s -X POST "$BASE_URL/api/officer/complaints/$PENDING_COMPLAINT_ID/submit-proof" \
      -H "Authorization: Bearer $DISTRICT_TOKEN" \
      -H "Content-Type: application/json" \
      -d '{
        "description":"Road pothole filled with concrete",
        "workDetails":"Used 2 bags of cement, 3 bags of sand, and asphalt mix. Team of 4 workers completed work in 3 hours. Area: 2m x 1m.",
        "photosUrls":["https://example.com/before.jpg","https://example.com/after.jpg"]
      }')
    
    if echo $PROOF_RESULT | jq -e '.message' > /dev/null; then
        echo "${GREEN}✓ Proof of work submitted${NC}"
        echo "📸 Photos attached: 2"
        echo "📄 Status: RESOLVED (Awaiting state verification)"
    else
        echo "${RED}✗ Proof submission failed${NC}"
    fi
    echo ""
fi

echo "${BLUE}Step 9: State Officer Verifies Resolution${NC}"
echo "Fetching updated state dashboard..."

STATE_DASHBOARD_2=$(curl -s -X GET "$BASE_URL/api/officer/state-dashboard" \
  -H "Authorization: Bearer $STATE_TOKEN")

RESOLVED_COUNT_2=$(echo $STATE_DASHBOARD_2 | jq '.statistics.resolvedComplaints')

if [ "$RESOLVED_COUNT_2" -gt 0 ]; then
    RESOLVED_COMPLAINT_ID=$(echo $STATE_DASHBOARD_2 | jq -r '.resolvedComplaints[0]._id')
    RESOLVED_TICKET=$(echo $STATE_DASHBOARD_2 | jq -r '.resolvedComplaints[0].ticketNumber')
    
    echo "📝 Complaint to verify: $RESOLVED_TICKET"
    echo "🆔 ID: $RESOLVED_COMPLAINT_ID"
    echo ""
    echo "${YELLOW}Choose action:${NC}"
    echo "1) Approve and Close"
    echo "2) Reject and Send Back"
    read -p "Enter choice (1 or 2): " CHOICE
    
    if [ "$CHOICE" = "1" ]; then
        echo "${BLUE}Approving complaint...${NC}"
        VERIFY_RESULT=$(curl -s -X POST "$BASE_URL/api/officer/complaints/$RESOLVED_COMPLAINT_ID/verify-resolution" \
          -H "Authorization: Bearer $STATE_TOKEN" \
          -H "Content-Type: application/json" \
          -d '{"approved":true,"comments":"Work verified and approved. Good job!"}')
        
        if echo $VERIFY_RESULT | jq -e '.message' > /dev/null; then
            echo "${GREEN}✓ Complaint closed successfully!${NC}"
            echo "📄 Status: CLOSED"
        else
            echo "${RED}✗ Verification failed${NC}"
        fi
    elif [ "$CHOICE" = "2" ]; then
        echo "${BLUE}Rejecting resolution...${NC}"
        VERIFY_RESULT=$(curl -s -X POST "$BASE_URL/api/officer/complaints/$RESOLVED_COMPLAINT_ID/verify-resolution" \
          -H "Authorization: Bearer $STATE_TOKEN" \
          -H "Content-Type: application/json" \
          -d '{"approved":false,"comments":"Photos are not clear. Please resubmit with better evidence."}')
        
        if echo $VERIFY_RESULT | jq -e '.message' > /dev/null; then
            echo "${YELLOW}⚠ Resolution rejected - sent back to district officer${NC}"
            echo "📄 Status: IN_PROGRESS"
        else
            echo "${RED}✗ Rejection failed${NC}"
        fi
    fi
else
    echo "${YELLOW}No resolved complaints to verify${NC}"
fi

echo ""
echo "=================================="
echo "${GREEN}✓ Workflow test complete!${NC}"
echo ""
echo "📱 Next Steps:"
echo "1. Visit http://localhost:3000/dashboard/officer/state"
echo "2. Visit http://localhost:3000/dashboard/officer/district"
echo "3. Test the full UI workflow"
