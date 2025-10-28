#!/bin/bash

# Test Enhanced Complaint Detail Page
# Tests the API endpoint with citizen login

BASE_URL="http://localhost:3000"

echo "=== Testing Enhanced Complaint Detail Page ==="
echo ""

# Login as Ramesh Gupta
echo "Step 1: Logging in as ramesh.gupta@gmail.com..."
LOGIN_RESPONSE=$(curl -s -X POST "$BASE_URL/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "ramesh.gupta@gmail.com",
    "password": "Citizen@123"
  }')

TOKEN=$(echo "$LOGIN_RESPONSE" | python3 -c "import sys, json; print(json.load(sys.stdin).get('token', ''))")

if [ -z "$TOKEN" ]; then
  echo "❌ Login failed"
  echo "$LOGIN_RESPONSE"
  exit 1
fi

echo "✅ Login successful"
echo ""

# Get complaint details
TICKET="EVMAMUM1761671787563PKQG"
echo "Step 2: Fetching complaint details for $TICKET..."
COMPLAINT_RESPONSE=$(curl -s "$BASE_URL/api/complaints/$TICKET" \
  -H "Authorization: Bearer $TOKEN")

echo "$COMPLAINT_RESPONSE" | python3 -m json.tool > /tmp/complaint-detail.json

echo "✅ Complaint fetched"
echo ""

# Display key information
echo "=== Complaint Information ==="
python3 << 'EOF'
import json
with open('/tmp/complaint-detail.json', 'r') as f:
    data = json.load(f)
    
    if 'error' in data:
        print(f"❌ Error: {data['error']}")
    else:
        print(f"Ticket: {data.get('ticketNumber', 'N/A')}")
        print(f"Status: {data.get('status', 'N/A')}")
        print(f"Title: {data.get('title', 'N/A')}")
        print()
        
        # Officer info
        officer = data.get('assignedOfficer')
        if officer:
            print("=== Assigned Officer ===")
            print(f"Name: {officer.get('name', 'N/A')}")
            print(f"Designation: {officer.get('designation', 'N/A')}")
            print(f"Employee ID: {officer.get('employeeId', 'N/A')}")
            print(f"Contact: {officer.get('contact', 'N/A')}")
            print()
        
        # Assignment details
        assignment = data.get('assignmentDetails')
        if assignment:
            print("=== Assignment Details ===")
            print(f"Assigned By: {assignment.get('assignedBy', {}).get('name', 'N/A')}")
            print(f"Assigned At: {assignment.get('assignedAt', 'N/A')}")
            print()
        
        # Proof of work
        proofs = data.get('proofOfWork', [])
        if proofs:
            print(f"=== Proof of Work ({len(proofs)} items) ===")
            for i, proof in enumerate(proofs, 1):
                print(f"Proof {i}:")
                print(f"  Description: {proof.get('description', 'N/A')}")
                print(f"  Work Details: {proof.get('workDetails', 'N/A')}")
                photos = proof.get('photos', [])
                if photos:
                    print(f"  Photos: {len(photos)} attached")
                print()
        
        # Resolution
        resolution = data.get('resolution')
        if resolution:
            print("=== Resolution ===")
            print(f"Description: {resolution.get('description', 'N/A')}")
            print(f"Resolved By: {resolution.get('resolvedBy', {}).get('name', 'N/A')}")
            print(f"Resolved At: {resolution.get('resolvedAt', 'N/A')}")
            verified = data.get('verificationDetails')
            if verified:
                print(f"Verified By: {verified.get('verifiedBy', {}).get('name', 'N/A')}")
                print(f"Verified At: {verified.get('verifiedAt', 'N/A')}")
            print()
        
        # Feedback
        feedback = data.get('feedback')
        if feedback:
            print("=== Citizen Feedback ===")
            print(f"Rating: {feedback.get('rating', 'N/A')}/5")
            print(f"Comments: {feedback.get('comments', 'N/A')}")
            print(f"Submitted: {feedback.get('submittedAt', 'N/A')}")
        else:
            print("=== Citizen Feedback ===")
            print("No feedback submitted yet")
EOF

echo ""
echo "Full response saved to: /tmp/complaint-detail.json"
echo ""

# Test feedback submission (if not already submitted)
echo "Step 3: Testing feedback submission..."
FEEDBACK_RESPONSE=$(curl -s -X POST "$BASE_URL/api/complaints/$TICKET/feedback" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "rating": 5,
    "comments": "Excellent work! The pothole was fixed quickly and professionally. Very satisfied with the government response."
  }')

echo "$FEEDBACK_RESPONSE" | python3 -m json.tool

echo ""
echo "=== Test Complete ==="
