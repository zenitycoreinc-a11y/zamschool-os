# API Documentation

ZamSchool OS API documentation for developers.

## Base URL

```
Development: http://localhost:3000/api
Production: https://your-domain.com/api
```

## Authentication

All API endpoints require authentication via JWT token in the Authorization header:

```http
Authorization: Bearer <your-jwt-token>
```

### Obtaining a Token

1. Send OTP to user's email/phone
2. Verify OTP code
3. Receive JWT token

## Endpoints

### Authentication

#### POST /auth/send-otp

Send OTP code to user.

**Request:**
```json
{
  "email": "user@example.com",
  "role": "teacher"
}
```

**Response:**
```json
{
  "success": true,
  "message": "OTP sent successfully"
}
```

#### POST /auth/verify-otp

Verify OTP and receive JWT token.

**Request:**
```json
{
  "email": "user@example.com",
  "otpCode": "123456"
}
```

**Response:**
```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "role": "teacher"
  }
}
```

### Users

#### GET /users/profile

Get current user profile.

**Response:**
```json
{
  "id": "uuid",
  "email": "user@example.com",
  "role": "teacher",
  "profile": {
    "firstName": "John",
    "lastName": "Doe",
    "phone": "+1234567890"
  }
}
```

#### PUT /users/profile

Update user profile.

**Request:**
```json
{
  "firstName": "Jane",
  "lastName": "Doe",
  "phone": "+0987654321"
}
```

### Students

#### GET /students

List all students (Admin/Teacher only).

**Query Parameters:**
- `page` (number): Page number
- `limit` (number): Items per page
- `classId` (string): Filter by class
- `search` (string): Search by name or admission number

**Response:**
```json
{
  "data": [
    {
      "id": "uuid",
      "admissionNumber": "STD001",
      "firstName": "Alice",
      "lastName": "Smith",
      "classId": "uuid",
      "className": "Grade 10A"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 100
  }
}
```

#### GET /students/:id

Get student details.

**Response:**
```json
{
  "id": "uuid",
  "admissionNumber": "STD001",
  "firstName": "Alice",
  "lastName": "Smith",
  "dateOfBirth": "2008-05-15",
  "classId": "uuid",
  "parentIds": ["uuid1", "uuid2"],
  "attendance": {
    "present": 180,
    "absent": 10,
    "late": 5
  }
}
```

### Attendance

#### GET /attendance

Get attendance records.

**Query Parameters:**
- `classId` (string): Class ID
- `date` (string): Date (YYYY-MM-DD)
- `studentId` (string): Student ID

**Response:**
```json
{
  "date": "2024-01-15",
  "classId": "uuid",
  "records": [
    {
      "studentId": "uuid",
      "studentName": "Alice Smith",
      "status": "present",
      "timestamp": "2024-01-15T08:00:00Z"
    }
  ]
}
```

#### POST /attendance

Mark attendance.

**Request:**
```json
{
  "classId": "uuid",
  "date": "2024-01-15",
  "records": [
    {
      "studentId": "uuid",
      "status": "present"
    },
    {
      "studentId": "uuid2",
      "status": "absent"
    }
  ]
}
```

### Assignments

#### GET /assignments

List assignments.

**Query Parameters:**
- `classId` (string): Filter by class
- `subjectId` (string): Filter by subject
- `status` (string): pending, submitted, graded

**Response:**
```json
{
  "data": [
    {
      "id": "uuid",
      "title": "Math Homework Chapter 5",
      "description": "Complete exercises 1-10",
      "dueDate": "2024-01-20T23:59:59Z",
      "classId": "uuid",
      "subjectId": "uuid",
      "status": "pending"
    }
  ]
}
```

#### POST /assignments

Create assignment (Teacher only).

**Request:**
```json
{
  "title": "Math Homework Chapter 5",
  "description": "Complete exercises 1-10",
  "classId": "uuid",
  "subjectId": "uuid",
  "dueDate": "2024-01-20T23:59:59Z",
  "maxScore": 100
}
```

#### POST /assignments/:id/submit

Submit assignment (Student only).

**Request:**
```json
{
  "content": "My answers...",
  "fileUrls": ["https://..."]
}
```

#### POST /assignments/:id/grade

Grade assignment (Teacher only).

**Request:**
```json
{
  "submissionId": "uuid",
  "score": 85,
  "feedback": "Good work!"
}
```

### Results

#### GET /results

Get student results.

**Query Parameters:**
- `studentId` (string): Student ID
- `termId` (string): Term ID
- `classId` (string): Class ID

**Response:**
```json
{
  "studentId": "uuid",
  "studentName": "Alice Smith",
  "term": "Term 1",
  "subjects": [
    {
      "subjectId": "uuid",
      "subjectName": "Mathematics",
      "score": 85,
      "grade": "A",
      "remarks": "Excellent"
    }
  ],
  "average": 82.5,
  "position": 5,
  "totalStudents": 30
}
```

### Messages

#### GET /messages

Get user messages.

**Query Parameters:**
- `folder` (string): inbox, sent, trash
- `page` (number): Page number

**Response:**
```json
{
  "data": [
    {
      "id": "uuid",
      "from": {
        "id": "uuid",
        "name": "John Doe"
      },
      "to": [
        {
          "id": "uuid",
          "name": "Jane Smith"
        }
      ],
      "subject": "Meeting Tomorrow",
      "body": "Let's meet at 10 AM...",
      "read": false,
      "createdAt": "2024-01-15T09:00:00Z"
    }
  ]
}
```

#### POST /messages

Send message.

**Request:**
```json
{
  "to": ["uuid1", "uuid2"],
  "subject": "Meeting Tomorrow",
  "body": "Let's meet at 10 AM..."
}
```

### Payments

#### GET /payments

Get payment records (Bursar/Admin only).

**Query Parameters:**
- `studentId` (string): Student ID
- `status` (string): paid, pending, overdue
- `termId` (string): Term ID

**Response:**
```json
{
  "data": [
    {
      "id": "uuid",
      "studentId": "uuid",
      "studentName": "Alice Smith",
      "amount": 5000,
      "paidAmount": 5000,
      "status": "paid",
      "dueDate": "2024-01-31",
      "paidAt": "2024-01-15T10:00:00Z"
    }
  ]
}
```

#### POST /payments

Record payment (Bursar only).

**Request:**
```json
{
  "studentId": "uuid",
  "amount": 5000,
  "paymentMethod": "cash",
  "reference": "PAY001",
  "notes": "Term 1 fees"
}
```

### Events

#### GET /events

Get school events.

**Query Parameters:**
- `startDate` (string): Start date
- `endDate` (string): End date
- `type` (string): event type

**Response:**
```json
{
  "data": [
    {
      "id": "uuid",
      "title": "Sports Day",
      "description": "Annual sports competition",
      "startDate": "2024-02-15T08:00:00Z",
      "endDate": "2024-02-15T17:00:00Z",
      "location": "School Field",
      "type": "sports"
    }
  ]
}
```

#### POST /events

Create event (Admin only).

**Request:**
```json
{
  "title": "Sports Day",
  "description": "Annual sports competition",
  "startDate": "2024-02-15T08:00:00Z",
  "endDate": "2024-02-15T17:00:00Z",
  "location": "School Field",
  "type": "sports"
}
```

## Error Responses

All errors follow this format:

```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human readable message",
    "details": {}
  }
}
```

### Common Error Codes

- `UNAUTHORIZED`: Invalid or missing authentication token
- `FORBIDDEN`: User doesn't have permission
- `NOT_FOUND`: Resource not found
- `VALIDATION_ERROR`: Invalid request data
- `SERVER_ERROR`: Internal server error

## Rate Limiting

API requests are rate limited:

- **Authentication endpoints**: 5 requests per minute
- **General endpoints**: 100 requests per minute
- **Bulk operations**: 10 requests per minute

Rate limit headers are included in responses:

```http
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1642234567
```

## Webhooks

ZamSchool OS supports webhooks for real-time notifications.

### Available Events

- `student.enrolled`: New student enrollment
- `attendance.marked`: Attendance marked
- `assignment.submitted`: Assignment submitted
- `result.published`: Results published
- `payment.received`: Payment received

### Webhook Payload

```json
{
  "event": "assignment.submitted",
  "timestamp": "2024-01-15T10:00:00Z",
  "data": {
    "assignmentId": "uuid",
    "studentId": "uuid",
    "submittedAt": "2024-01-15T10:00:00Z"
  }
}
```

## SDK Examples

### JavaScript/TypeScript

```typescript
import { ZamSchoolClient } from 'zamschool-sdk';

const client = new ZamSchoolClient({
  baseUrl: 'https://your-domain.com/api',
  token: 'your-jwt-token'
});

// Get student profile
const student = await client.students.get('student-id');

// Mark attendance
await client.attendance.mark({
  classId: 'class-id',
  records: [
    { studentId: 'std1', status: 'present' },
    { studentId: 'std2', status: 'absent' }
  ]
});
```

### Python

```python
import requests

BASE_URL = 'https://your-domain.com/api'
TOKEN = 'your-jwt-token'

headers = {'Authorization': f'Bearer {TOKEN}'}

# Get student profile
response = requests.get(
    f'{BASE_URL}/students/student-id',
    headers=headers
)
student = response.json()
```

---

For more information, see the [README.md](../README.md) and [CONTRIBUTING.md](../CONTRIBUTING.md).
