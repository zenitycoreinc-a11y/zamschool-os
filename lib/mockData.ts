export const mockTeachers = [
  {
    id: "1",
    employee_id: "EMP-001",
    name: "John Phiri",
    email: "john.phiri@school.com",
    avatar_url: "https://picsum.photos/seed/teacher1/200/200",
    phone: "+260 971 234 567",
    subjects: ["Mathematics", "Physics"],
    classes: ["10A", "11B"],
    address: "Lusaka, Zambia",
    status: "ACTIVE",
  },
  {
    id: "2",
    employee_id: "EMP-002",
    name: "Sarah Mwansa",
    email: "sarah.mwansa@school.com",
    avatar_url: "https://picsum.photos/seed/teacher2/200/200",
    phone: "+260 965 987 654",
    subjects: ["English", "Literature"],
    classes: ["9C", "12A"],
    address: "Kitwe, Zambia",
    status: "ACTIVE",
  },
  {
    id: "3",
    employee_id: "EMP-003",
    name: "Michael Banda",
    email: "michael.banda@school.com",
    avatar_url: "https://picsum.photos/seed/teacher3/200/200",
    phone: "+260 955 111 222",
    subjects: ["Biology", "Chemistry"],
    classes: ["11A", "12C"],
    address: "Ndola, Zambia",
    status: "INACTIVE",
  },
];

export const mockStudents = [
  {
    id: "1",
    admission_number: "STU-1001",
    name: "Alice Zulu",
    email: "alice.zulu@student.com",
    avatar_url: "https://picsum.photos/seed/student1/200/200",
    phone: "+260 971 000 111",
    grade: "Grade 10",
    class: "10A",
    address: "Lusaka, Zambia",
    status: "ACTIVE",
  },
  {
    id: "2",
    admission_number: "STU-1002",
    name: "Bob Mumba",
    email: "bob.mumba@student.com",
    avatar_url: "https://picsum.photos/seed/student2/200/200",
    phone: "+260 971 000 222",
    grade: "Grade 11",
    class: "11B",
    address: "Lusaka, Zambia",
    status: "ACTIVE",
  },
];

export const mockAnnouncements = [
  {
    id: "1",
    title: "School Reopening Date",
    content: "The school will reopen for the second term on Monday, May 5th, 2025.",
    date: "2025-04-15",
    target_role: "ALL",
  },
  {
    id: "2",
    title: "PTA Meeting",
    content: "There will be a PTA meeting this Saturday at 10:00 AM in the school hall.",
    date: "2025-04-20",
    target_role: "PARENT",
  },
];

export const mockAttendance = [
  {
    id: "1",
    studentName: "Alice Zulu",
    date: "2025-04-25",
    status: "PRESENT",
    class: "10A",
  },
  {
    id: "2",
    studentName: "Bob Mumba",
    date: "2025-04-25",
    status: "ABSENT",
    class: "11B",
  },
];
