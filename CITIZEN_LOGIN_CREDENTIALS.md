# Citizen Login Credentials - EchoVote

## Overview
This document contains the login credentials for all citizen test accounts in the EchoVote system. Each citizen is assigned to a specific district/block and has complaints associated with their location.

## Common Password
**All citizens use the same password:** `Citizen@123`

---

## Citizen Accounts by Location

### Mumbai - Andheri
1. **Ramesh Gupta**
   - Email: `ramesh.gupta@gmail.com`
   - Phone: +91-9876543220
   - Location: Andheri, Mumbai, Maharashtra
   - Complaints: Road maintenance, water supply, traffic issues in Andheri

2. **Meera Iyer**
   - Email: `meera.iyer@gmail.com`
   - Phone: +91-9876543225
   - Location: Andheri, Mumbai, Maharashtra
   - Complaints: Local area issues in Andheri

3. **Amit Kulkarni**
   - Email: `amit.kulkarni@gmail.com`
   - Phone: +91-9876543232
   - Location: Andheri, Mumbai, Maharashtra
   - Complaints: Infrastructure and public services in Andheri

---

### Mumbai - Bandra
4. **Anil Mehta**
   - Email: `anil.mehta@gmail.com`
   - Phone: +91-9876543222
   - Location: Bandra, Mumbai, Maharashtra
   - Complaints: Waste management, water supply, traffic management in Bandra

5. **Vikram Patel**
   - Email: `vikram.patel@gmail.com`
   - Phone: +91-9876543226
   - Location: Bandra, Mumbai, Maharashtra
   - Complaints: Public services in Bandra

6. **Pooja Nair**
   - Email: `pooja.nair@gmail.com`
   - Phone: +91-9876543233
   - Location: Bandra, Mumbai, Maharashtra
   - Complaints: Local area issues in Bandra

---

### Mumbai - Borivali
7. **Priya Desai**
   - Email: `priya.desai@gmail.com`
   - Phone: +91-9876543223
   - Location: Borivali, Mumbai, Maharashtra
   - Complaints: Electricity, street lights, public services in Borivali

8. **Deepak Joshi**
   - Email: `deepak.joshi@gmail.com`
   - Phone: +91-9876543230
   - Location: Borivali, Mumbai, Maharashtra
   - Complaints: Local infrastructure issues in Borivali

---

### Pune - Kothrud
9. **Sunita Rao**
   - Email: `sunita.rao@gmail.com`
   - Phone: +91-9876543221
   - Location: Kothrud, Pune, Maharashtra
   - Complaints: Infrastructure, education, water supply in Kothrud/Pune

10. **Rajesh Sharma**
    - Email: `rajesh.sharma@gmail.com`
    - Phone: +91-9876543224
    - Location: Kothrud, Pune, Maharashtra
    - Complaints: Public parks, infrastructure in Kothrud/Pune

---

### Pune (General)
11. **Neha Verma**
    - Email: `neha.verma@gmail.com`
    - Phone: +91-9876543231
    - Location: Pune, Maharashtra
    - Complaints: Various civic issues in Pune

---

### Nagpur
12. **Anjali Reddy**
    - Email: `anjali.reddy@gmail.com`
    - Phone: +91-9876543227
    - Location: Nagpur, Maharashtra
    - Complaints: Road maintenance, healthcare issues in Nagpur

---

### Nashik
13. **Suresh Kumar**
    - Email: `suresh.kumar@gmail.com`
    - Phone: +91-9876543228
    - Location: Nashik, Maharashtra
    - Complaints: Healthcare, electricity issues in Nashik

---

### Thane
14. **Kavita Singh**
    - Email: `kavita.singh@gmail.com`
    - Phone: +91-9876543229
    - Location: Thane, Maharashtra
    - Complaints: Infrastructure, environment issues in Thane

15. **Rahul Deshmukh**
    - Email: `rahul.deshmukh@gmail.com`
    - Phone: +91-9876543234
    - Location: Thane, Maharashtra
    - Complaints: Industrial area issues in Thane

---

## Quick Test Scenarios

### Scenario 1: Mumbai Citizen - Local Complaint
- **Login as:** `ramesh.gupta@gmail.com` / `Citizen@123`
- **View:** Complaints in Andheri area
- **Test:** Submit new complaint, track existing complaints, vote on public complaints

### Scenario 2: Pune Citizen - Infrastructure Issues
- **Login as:** `sunita.rao@gmail.com` / `Citizen@123`
- **View:** Complaints in Kothrud/Pune area
- **Test:** View complaint status, check officer responses

### Scenario 3: Multi-District Comparison
- **Login as Mumbai citizens** to see Mumbai complaints
- **Login as Pune citizens** to see Pune complaints
- **Compare:** Response times, officer assignments, resolution rates

---

## Features to Test with Citizen Accounts

### 1. **View Your Complaints**
- Navigate to "My Complaints" dashboard
- See all complaints filed by you
- Track status changes and officer responses

### 2. **Submit New Complaint**
- File a new complaint with title, description, category
- Upload photos (if enabled)
- Set priority level

### 3. **Public Complaints Feed**
- Browse all public complaints in your area
- Upvote complaints you support
- Add comments to complaints

### 4. **Track Officer Actions**
- See which officer is assigned
- View acknowledgment status
- Check proof of work submitted
- Read notifications from officers

### 5. **Receive Notifications**
- Progress updates from district officers
- Final closure notifications from state officers
- Status change alerts

---

## Complaint Categories Available

- **Road Maintenance** - Potholes, damaged roads, cave-ins
- **Water Supply** - Pipeline issues, water shortage, contamination
- **Waste Management** - Garbage collection, overflowing bins
- **Electricity** - Power outages, transformer issues, street lights
- **Healthcare** - PHC medicine shortage, hospital equipment
- **Infrastructure** - Bridges, buildings, public facilities
- **Traffic Management** - Signal issues, safety concerns
- **Public Transport** - Bus services, shelters
- **Sanitation** - Sewage overflow, public toilets
- **Education** - School buildings, library facilities
- **Public Parks** - Maintenance, equipment safety
- **Environment** - Industrial pollution, noise

---

## Complaint Status Flow (from Citizen Perspective)

```
SUBMITTED (You filed the complaint)
    ↓
ACKNOWLEDGED (Officer acknowledged - you'll see notification)
    ↓
IN_PROGRESS (Officer is working - may receive progress updates)
    ↓
RESOLVED (Officer marked complete - awaiting verification)
    ↓
CLOSED (State officer verified and closed - final notification)
```

---

## Support & Feedback

### If You Face Issues:
1. **Cannot login?** Check email spelling and use password: `Citizen@123`
2. **No complaints showing?** Check the district/location filter
3. **Cannot submit complaint?** Ensure all required fields are filled
4. **Status not updating?** Refresh the page or logout/login again

### Report Issues:
- Check console logs in browser (F12 → Console)
- Verify you're logged in with correct user type (citizen)
- Ensure complaint is in your jurisdiction

---

## Testing Workflows

### Test 1: Complete Citizen Journey
1. Login as `ramesh.gupta@gmail.com`
2. Submit a new road maintenance complaint
3. Wait for officer acknowledgment
4. Receive progress update notification
5. View proof of work submitted by officer
6. Get final closure notification from state officer

### Test 2: Public Engagement
1. Login as any citizen
2. Browse public complaints feed
3. Upvote complaints you support
4. Add helpful comments
5. Track trending issues in your area

### Test 3: Multi-Citizen Scenario
1. Multiple citizens file complaints about the same issue
2. All citizens upvote each other's complaints
3. Officer acknowledges all related complaints
4. Citizens receive coordinated updates
5. All complaints closed together

---

**Last Updated:** October 28, 2025  
**Total Citizens:** 15 accounts  
**Total Complaints:** 28 complaints assigned to these citizens  
**Default Password:** Citizen@123  

---

## Quick Reference Table

| Name | Email | District | Block | Primary Issues |
|------|-------|----------|-------|----------------|
| Ramesh Gupta | ramesh.gupta@gmail.com | Mumbai | Andheri | Road, Water, Traffic |
| Sunita Rao | sunita.rao@gmail.com | Pune | Kothrud | Infrastructure, Education |
| Anil Mehta | anil.mehta@gmail.com | Mumbai | Bandra | Waste, Water, Traffic |
| Priya Desai | priya.desai@gmail.com | Mumbai | Borivali | Electricity, Lights |
| Rajesh Sharma | rajesh.sharma@gmail.com | Pune | Kothrud | Parks, Infrastructure |
| Meera Iyer | meera.iyer@gmail.com | Mumbai | Andheri | Local Services |
| Vikram Patel | vikram.patel@gmail.com | Mumbai | Bandra | Public Services |
| Anjali Reddy | anjali.reddy@gmail.com | Nagpur | - | Road, Healthcare |
| Suresh Kumar | suresh.kumar@gmail.com | Nashik | - | Healthcare, Electricity |
| Kavita Singh | kavita.singh@gmail.com | Thane | - | Infrastructure, Environment |
| Deepak Joshi | deepak.joshi@gmail.com | Mumbai | Borivali | Infrastructure |
| Neha Verma | neha.verma@gmail.com | Pune | - | Civic Issues |
| Amit Kulkarni | amit.kulkarni@gmail.com | Mumbai | Andheri | Infrastructure, Services |
| Pooja Nair | pooja.nair@gmail.com | Mumbai | Bandra | Local Issues |
| Rahul Deshmukh | rahul.deshmukh@gmail.com | Thane | - | Industrial Issues |
