"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Users, Search, Filter, Download, CreditCard, CheckCircle, AlertCircle, Mail, Phone } from "lucide-react";
import { getDisplayName } from "@/lib/profile-utils";
import { format } from "date-fns";

export default function PaymentsStudents() {
  const [students, setStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filter, setFilter] = useState("all"); // all, paid, pending, overdue
  const [selectedStudents, setSelectedStudents] = useState<string[]>([]);

  useEffect(() => {
    const loadStudentPayments = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        // Get school_id from user profile
        const { data: profile } = await supabase
          .from("profiles")
          .select("school_id")
          .eq("id", user.id)
          .single();

        if (!profile?.school_id) return;

        // Get students with their payment summaries
        const { data: studentsData } = await supabase
          .from("payment_summaries")
          .select("*")
          .eq("school_id", profile.school_id)
          .order("first_name");

        // Process students with payment status
        const processedStudents = (studentsData || []).map(student => {
          const hasPendingPayments = student.pending_amount > 0;
          const paymentStatus = hasPendingPayments ? "pending" : "paid";
          
          return {
            ...student,
            paymentStatus,
            lastPaymentDate: student.paid_amount > 0 ? new Date().toISOString() : null,
            // Additional mock data for demo
            phone: "+260 9XX XXX XXX",
            parentEmail: `parent.${student.email}`,
            nextPaymentDue: hasPendingPayments ? new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() : null,
          };
        });

        setStudents(processedStudents);
      } catch (error) {
        console.error("Error loading student payments:", error);
      } finally {
        setLoading(false);
      }
    };

    loadStudentPayments();
  }, []);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "paid": return "text-green-600 bg-green-50";
      case "pending": return "text-orange-600 bg-orange-50";
      case "overdue": return "text-red-600 bg-red-50";
      default: return "text-gray-600 bg-gray-50";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "paid": return CheckCircle;
      case "pending": return AlertCircle;
      case "overdue": return AlertCircle;
      default: return AlertCircle;
    }
  };

  const filteredStudents = students.filter(student => {
    const matchesSearch = 
      getDisplayName(student).toLowerCase().includes(searchTerm.toLowerCase()) ||
      student.email.toLowerCase().includes(searchTerm.toLowerCase());
    
    if (!matchesSearch) return false;
    
    switch (filter) {
      case "paid": return student.pending_amount === 0;
      case "pending": return student.pending_amount > 0;
      case "overdue": return student.pending_amount > 0; // TODO: Add overdue logic
      default: return true;
    }
  });

  const handleSelectStudent = (studentId: string) => {
    setSelectedStudents(prev => 
      prev.includes(studentId) 
        ? prev.filter(id => id !== studentId)
        : [...prev, studentId]
    );
  };

  const handleSelectAll = () => {
    if (selectedStudents.length === filteredStudents.length) {
      setSelectedStudents([]);
    } else {
      setSelectedStudents(filteredStudents.map(s => s.student_id));
    }
  };

  const sendReminders = async () => {
    // TODO: Implement reminder sending
    console.log("Sending reminders to:", selectedStudents);
  };

  if (loading) {
    return (
      <div className="flex-1 p-4 flex items-center justify-center">
        <div className="text-gray-500">Loading student payments...</div>
      </div>
    );
  }

  return (
    <div className="flex-1 p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Student Payments</h1>
        <p className="text-gray-600">Track and manage student payment status</p>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col lg:flex-row gap-4 mb-6">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
          <input
            type="text"
            placeholder="Search students..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        
        <div className="flex gap-2">
          {["all", "paid", "pending", "overdue"].map((filterOption) => (
            <button
              key={filterOption}
              onClick={() => setFilter(filterOption)}
              className={`px-4 py-2 rounded-lg capitalize ${
                filter === filterOption
                  ? "bg-blue-600 text-white"
                  : "bg-white border border-gray-200 text-gray-700 hover:bg-gray-50"
              }`}
            >
              {filterOption}
            </button>
          ))}
        </div>

        <div className="flex gap-2">
          <button className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700">
            <Download className="w-4 h-4" />
            Export
          </button>
          {selectedStudents.length > 0 && (
            <button 
              onClick={sendReminders}
              className="flex items-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700"
            >
              <Mail className="w-4 h-4" />
              Send Reminders ({selectedStudents.length})
            </button>
          )}
        </div>
      </div>

      {/* Students Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left">
                  <input
                    type="checkbox"
                    checked={selectedStudents.length === filteredStudents.length && filteredStudents.length > 0}
                    onChange={handleSelectAll}
                    className="rounded border-gray-300"
                  />
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Student
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Total Amount
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Paid Amount
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Pending Amount
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Next Payment Due
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredStudents.map((student) => {
                const StatusIcon = getStatusIcon(student.paymentStatus);
                const statusColor = getStatusColor(student.paymentStatus);
                const studentName = getDisplayName(student);
                
                return (
                  <tr key={student.student_id} className="hover:bg-gray-50">
                    <td className="px-4 py-4">
                      <input
                        type="checkbox"
                        checked={selectedStudents.includes(student.student_id)}
                        onChange={() => handleSelectStudent(student.student_id)}
                        className="rounded border-gray-300"
                      />
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center">
                        <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center text-xs font-medium text-gray-600 mr-3">
                          {studentName.slice(0, 1).toUpperCase()}
                        </div>
                        <div>
                          <div className="text-sm font-medium text-gray-900">{studentName}</div>
                          <div className="text-xs text-gray-500">{student.email}</div>
                          <div className="text-xs text-gray-500">{student.phone}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        ZMW {student.total_amount.toLocaleString()}
                      </div>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-green-600">
                        ZMW {student.paid_amount.toLocaleString()}
                      </div>
                      <div className="text-xs text-gray-500">{student.paid_payments} payments</div>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-orange-600">
                        ZMW {student.pending_amount.toLocaleString()}
                      </div>
                      <div className="text-xs text-gray-500">{student.pending_payments} pending</div>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full flex items-center gap-1 ${statusColor}`}>
                        <StatusIcon className="w-3 h-3" />
                        {student.paymentStatus}
                      </span>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                      {student.nextPaymentDue ? format(new Date(student.nextPaymentDue), "MMM d, yyyy") : "-"}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <button className="p-1 text-gray-400 hover:text-blue-600">
                          <CreditCard className="w-4 h-4" />
                        </button>
                        <button className="p-1 text-gray-400 hover:text-green-600">
                          <Mail className="w-4 h-4" />
                        </button>
                        <button className="p-1 text-gray-400 hover:text-gray-600">
                          <Phone className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {filteredStudents.length === 0 && (
        <div className="text-center py-12">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Users className="w-8 h-8 text-gray-400" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No students found</h3>
          <p className="text-gray-500 mb-4">
            {searchTerm ? "Try adjusting your search terms" : "No students match the current filter"}
          </p>
        </div>
      )}

      {/* Summary Stats */}
      <div className="mt-6 grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg p-4 border border-gray-200">
          <p className="text-sm text-gray-600">Total Students</p>
          <p className="text-xl font-bold text-gray-900">{filteredStudents.length}</p>
        </div>
        <div className="bg-white rounded-lg p-4 border border-gray-200">
          <p className="text-sm text-gray-600">Fully Paid</p>
          <p className="text-xl font-bold text-green-600">
            {filteredStudents.filter(s => s.pending_amount === 0).length}
          </p>
        </div>
        <div className="bg-white rounded-lg p-4 border border-gray-200">
          <p className="text-sm text-gray-600">Pending Payments</p>
          <p className="text-xl font-bold text-orange-600">
            {filteredStudents.filter(s => s.pending_amount > 0).length}
          </p>
        </div>
        <div className="bg-white rounded-lg p-4 border border-gray-200">
          <p className="text-sm text-gray-600">Total Pending</p>
          <p className="text-xl font-bold text-orange-600">
            ZMW {filteredStudents.reduce((sum, s) => sum + s.pending_amount, 0).toLocaleString()}
          </p>
        </div>
      </div>
    </div>
  );
}
