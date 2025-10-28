#!/usr/bin/env python3
import sys
import json

data = json.load(sys.stdin)
complaint = data.get('complaint', {})

print('=== COMPLAINT DETAILS TEST ===\n')
print(f'Ticket: {complaint.get("ticketNumber")}')
print(f'Status: {complaint.get("status")}')

print('\n=== ASSIGNED OFFICER ===')
officer = complaint.get('assignedTo', {}).get('officers', [{}])[0]
print(f'Name: {officer.get("profile", {}).get("name")}')
print(f'Designation: {officer.get("governmentDetails", {}).get("designation")}')
print(f'Employee ID: {officer.get("governmentDetails", {}).get("employeeId")}')
print(f'Phone: {officer.get("profile", {}).get("phone")}')

print('\n=== PROOF OF WORK ===')
pow_list = complaint.get('proofOfWork', [])
print(f'Count: {len(pow_list)}')
if pow_list:
    print(f'Description: {pow_list[0].get("description")}')
    print(f'Work Details: {pow_list[0].get("workDetails")[:80]}...')
    print(f'Photos: {len(pow_list[0].get("photos", []))} photos')

print('\n=== RESOLUTION ===')
resolution = complaint.get('resolution')
if resolution:
    print(f'Resolved By: {resolution.get("resolvedBy", {}).get("profile", {}).get("name")}')
    print(f'Verified By: {resolution.get("verifiedBy", {}).get("profile", {}).get("name")}')
    print(f'Verified At: {resolution.get("verifiedAt")}')

print('\n=== FEEDBACK ===')
feedback = complaint.get('feedback')
if feedback:
    print(json.dumps(feedback, indent=2))
else:
    print('No feedback found')
