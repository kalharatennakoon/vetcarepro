# VetCare Pro - API Testing Guide

## Quick Reference

### Test Credentials
- **Email:** `testadmin@propet.lk`
- **Password:** `Test@123`

### Current Token
```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjo1LCJ1c2VybmFtZSI6InRlc3RhZG1pbiIsImVtYWlsIjoidGVzdGFkbWluQHByb3BldC5sayIsInJvbGUiOiJhZG1pbiIsImZ1bGxfbmFtZSI6IlRlc3QgQWRtaW4gVXNlciIsImlhdCI6MTc2NzE5MTQ3MCwiZXhwIjoxNzY3Nzk2MjcwfQ.lVR-5u8wshqmaNH0fu_dxSO7oTsObfj2JY95PdQ3soo
```

---

## Health Check

### Backend Server Health
```bash
curl http://localhost:5001/health
```
✅ Backend server is running on port 5001

### Frontend Server
```bash
curl http://localhost:5173
```
✅ Frontend is running on port 5173

---

## Authentication Testing

### 1. Login (Get Token)
```bash
curl -X POST http://localhost:5001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"testadmin","password":"Test@123"}' | jq
```

**Expected Response:**
- ✅ User data (admin role, active status)
- ✅ JWT token for authentication

### 2. Get Current User Info
```bash
curl http://localhost:5001/api/auth/me \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjo1LCJ1c2VybmFtZSI6InRlc3RhZG1pbiIsImVtYWlsIjoidGVzdGFkbWluQHByb3BldC5sayIsInJvbGUiOiJhZG1pbiIsImZ1bGxfbmFtZSI6IlRlc3QgQWRtaW4gVXNlciIsImlhdCI6MTc2NzE5MTQ3MCwiZXhwIjoxNzY3Nzk2MjcwfQ.lVR-5u8wshqmaNH0fu_dxSO7oTsObfj2JY95PdQ3soo"
```

### 3. Get All Users
```bash
curl http://localhost:5001/api/users \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjo1LCJ1c2VybmFtZSI6InRlc3RhZG1pbiIsImVtYWlsIjoidGVzdGFkbWluQHByb3BldC5sayIsInJvbGUiOiJhZG1pbiIsImZ1bGxfbmFtZSI6IlRlc3QgQWRtaW4gVXNlciIsImlhdCI6MTc2NzE5MjAyMywiZXhwIjoxNzY3Nzk2ODIzfQ.MFoqzfdmUvQSmAS4gKKtWLl1goKOmPGybYDc-HErbqg" | jq
```

**Result:** ✅ JWT authentication works! The protected endpoint returned all 5 users in the database.

---

## Frontend Authentication Test

### Manual Test Steps
1. Open browser: `http://localhost:5173`
2. Enter credentials:
   - **Username:** `testadmin`
   - **Password:** `Test@123`
3. Click **Login**

**Expected Behavior:**
- ✅ Successfully redirected to `/dashboard`
- ✅ Token stored in localStorage
- ✅ User data available in AuthContext
- ✅ Protected routes accessible

**Result:** 🎉 Authentication system working end-to-end!

---

## Customer API Testing

### Terminal Testing

#### 1. Get All Customers
```bash
curl -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjo1LCJ1c2VybmFtZSI6InRlc3RhZG1pbiIsImVtYWlsIjoidGVzdGFkbWluQHByb3BldC5sayIsInJvbGUiOiJhZG1pbiIsImZ1bGxfbmFtZSI6IlRlc3QgQWRtaW4gVXNlciIsImlhdCI6MTc2NzE5MTQ3MCwiZXhwIjoxNzY3Nzk2MjcwfQ.lVR-5u8wshqmaNH0fu_dxSO7oTsObfj2JY95PdQ3soo" \
  http://localhost:5001/api/customers | jq
```

#### 2. Search Customers
```bash
curl -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjo1LCJ1c2VybmFtZSI6InRlc3RhZG1pbiIsImVtYWlsIjoidGVzdGFkbWluQHByb3BldC5sayIsInJvbGUiOiJhZG1pbiIsImZ1bGxfbmFtZSI6IlRlc3QgQWRtaW4gVXNlciIsImlhdCI6MTc2NzE5MTQ3MCwiZXhwIjoxNzY3Nzk2MjcwfQ.lVR-5u8wshqmaNH0fu_dxSO7oTsObfj2JY95PdQ3soo" \
  "http://localhost:5001/api/customers?search=john" | jq
```

#### 3. Get Single Customer
```bash
curl -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjo1LCJ1c2VybmFtZSI6InRlc3RhZG1pbiIsImVtYWlsIjoidGVzdGFkbWluQHByb3BldC5sayIsInJvbGUiOiJhZG1pbiIsImZ1bGxfbmFtZSI6IlRlc3QgQWRtaW4gVXNlciIsImlhdCI6MTc2NzE5MTQ3MCwiZXhwIjoxNzY3Nzk2MjcwfQ.lVR-5u8wshqmaNH0fu_dxSO7oTsObfj2JY95PdQ3soo" \
  http://localhost:5001/api/customers/1 | jq
```

#### 4. Create Customer
```bash
curl -X POST http://localhost:5001/api/customers \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -H "Content-Type: application/json" \
  -d '{
    "first_name": "Jane",
    "last_name": "Smith",
    "phone": "+94772345678",
    "email": "jane.smith@example.com",
    "address": "456 Oak Avenue",
    "city": "Kandy",
    "postal_code": "20000",
    "nic": "987654321V",
    "emergency_contact": "John Smith",
    "emergency_phone": "+94773456789",
    "preferred_contact_method": "phone",
    "notes": "Prefers morning appointments"
  }' | jq
```

#### 5. Update Customer
```bash
curl -X PUT http://localhost:5001/api/customers/1 \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -H "Content-Type: application/json" \
  -d '{
    "first_name": "Jane Updated",
    "city": "Galle"
  }' | jq
```

#### 6. Delete Customer (Soft Delete)
```bash
curl -X DELETE http://localhost:5001/api/customers/1 \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" | jq
```

---

## Pet API Testing

### Get All Pets
```bash
curl -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjo1LCJ1c2VybmFtZSI6InRlc3RhZG1pbiIsImVtYWlsIjoidGVzdGFkbWluQHByb3BldC5sayIsInJvbGUiOiJhZG1pbiIsImZ1bGxfbmFtZSI6IlRlc3QgQWRtaW4gVXNlciIsImlhdCI6MTc2NzE5MTQ3MCwiZXhwIjoxNzY3Nzk2MjcwfQ.lVR-5u8wshqmaNH0fu_dxSO7oTsObfj2JY95PdQ3soo" \
  http://localhost:5001/api/pets | jq
```

---

## Browser Console Testing

### Setup (Required Once Per Session)

**Step 1:** Open browser to `http://localhost:5173` and press **F12** to open DevTools Console.

**Step 2:** Check if token exists:
```javascript
console.log('Token:', window.token);
```
> If it returns `undefined`, login first.

**Step 3:** Login (if needed):
```javascript
fetch('http://localhost:5001/api/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    username: 'testadmin',
    password: 'Test@123'
  })
})
.then(res => res.json())
.then(data => {
  console.log('✅ Logged in!');
  window.token = data.data.token;
  console.log('Token:', window.token);
});
```

### Customer API Tests

**Get All Customers:**
```javascript
fetch('http://localhost:5001/api/customers', {
  headers: {
    'Authorization': `Bearer ${window.token}`
  }
})
.then(res => res.json())
.then(data => {
  console.log('✅ Customers:', data);
});
```

**Create Customer:**
```javascript
fetch('http://localhost:5001/api/customers', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${window.token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    first_name: 'John',
    last_name: 'Doe',
    phone: '+94771234567',
    email: 'john.doe@example.com',
    city: 'Colombo'
  })
})
.then(res => res.json())
.then(data => {
  console.log('✅ Customer Created:', data);
  if (data.status === 'success') {
    window.lastCustomerId = data.data.customer.customer_id;
  }
});
```

**Get Single Customer:**
```javascript
fetch(`http://localhost:5001/api/customers/${window.lastCustomerId || 1}`, {
  headers: {
    'Authorization': `Bearer ${window.token}`
  }
})
.then(res => res.json())
.then(data => {
  console.log('✅ Customer Details:', data);
});
```

**Update Customer:**
```javascript
fetch(`http://localhost:5001/api/customers/${window.lastCustomerId || 1}`, {
  method: 'PUT',
  headers: {
    'Authorization': `Bearer ${window.token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    city: 'Galle',
    notes: 'Updated from browser console!'
  })
})
.then(res => res.json())
.then(data => {
  console.log('✅ Customer Updated:', data);
});
```

---

## Notes

- **Token Expiry:** Tokens expire after 7 days. Get a new token if you see 401 errors.
- **Browser Token:** `window.token` is cleared when you refresh the page - login again if needed.
- **Port Numbers:**
  - Backend: `5001`
  - Frontend: `5173`
- **Replace `YOUR_TOKEN_HERE`** with your actual token in commands.

---

## Test Results Summary

✅ Backend server health check  
✅ Frontend server running  
✅ Login authentication working  
✅ JWT token generation and validation  
✅ Protected route access control  
✅ Customer CRUD operations  
✅ Pet API endpoints  
✅ End-to-end authentication flow  

**Status:** All systems operational! 🎉


--- Manual Test Checklist

Customer Management:
- [x] Navigate to /customers
- [x] Click "Add Customer" button
- [x] Fill form and submit
- [x] View customer details
- [x] Click "Edit Customer"
- [x] Update information
- [x] Verify changes saved

Pet Management:
- [x] Create pet for existing customer
- [x] View pet details
- [x] Edit pet information
- [x] View medical history tab
- [x] View vaccinations tab

Navigation:
- [x] All sidebar links work
- [ ] Breadcrumb navigation works
- [x] Back buttons work correctly


Authentication:
- [x] Login with admin user
- [x] Logout
- [x] Login with receptionist
- [x] Verify role restrictions


---

View Appointments
- [x] Navigate to /appointments
- [x] Verify empty state shows if no appointments
- [x] Check filter controls are visible

Create Appointment
- [x] Click "Schedule Appointment"
- [x] Select customer (should load their pets)
- [x] Select pet
- [x] Fill in date, time, type
- [x] Add reason for visit
- [x] Submit form
- [x] Verify appointment appears in list

Edit Appointment
- [x]Click "Edit" on an appointment
- [x]Modify details
- [x]Save changes
- [x]Verify updates reflected

Status Updates
- [x]Click "Confirm" on scheduled appointment
- [x]Click "Start" on confirmed appointment
- [x]Click "Complete" on in-progress appointment
- [x]Verify status badges update correctly

Filtering
- [x]Filter by date
- [x]Filter by status
- [x]Clear filters
- [x]Verify results update

Delete Appointment (Admin only)
- [x]Login as admin
- [x]Click delete
- [x]Confirm deletion
- [x]Verify appointment removed


