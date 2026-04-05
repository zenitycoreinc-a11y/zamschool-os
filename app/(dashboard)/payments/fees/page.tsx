"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { FileText, Plus, Search, Edit, Trash2, Calendar, DollarSign, Users, CheckCircle } from "lucide-react";
import { format } from "date-fns";

type FeeRecord = {
  id?: number;
  name: string;
  description: string;
  amount: number;
  currency: string;
  due_date: string;
  frequency: string;
  applicable_to: string;
  is_active: boolean;
  student_count?: number;
  paid_count?: number;
  created_at?: string;
};

export default function PaymentsFees() {
  const [fees, setFees] = useState<FeeRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingFee, setEditingFee] = useState<FeeRecord | null>(null);

  useEffect(() => {
    const loadFees = async () => {
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

        // Mock fees data for now
        const mockFees = [
          {
            id: 1,
            name: "Tuition Fee - Term 1",
            description: "Regular tuition fee for the first term",
            amount: 2500,
            currency: "ZMW",
            due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
            frequency: "termly",
            applicable_to: "all_students",
            is_active: true,
            student_count: 150,
            paid_count: 120,
            created_at: new Date().toISOString(),
          },
          {
            id: 2,
            name: "Lab Fee",
            description: "Science laboratory equipment and materials",
            amount: 500,
            currency: "ZMW",
            due_date: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString(),
            frequency: "once",
            applicable_to: "science_students",
            is_active: true,
            student_count: 45,
            paid_count: 30,
            created_at: new Date().toISOString(),
          },
          {
            id: 3,
            name: "Sports Fee",
            description: "Sports equipment and activities",
            amount: 300,
            currency: "ZMW",
            due_date: new Date(Date.now() + 45 * 24 * 60 * 60 * 1000).toISOString(),
            frequency: "termly",
            applicable_to: "all_students",
            is_active: true,
            student_count: 150,
            paid_count: 80,
            created_at: new Date().toISOString(),
          },
          {
            id: 4,
            name: "Library Fee",
            description: "Library resources and materials",
            amount: 200,
            currency: "ZMW",
            due_date: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString(),
            frequency: "annually",
            applicable_to: "all_students",
            is_active: false,
            student_count: 150,
            paid_count: 150,
            created_at: new Date().toISOString(),
          },
        ];

        setFees(mockFees);
      } catch (error) {
        console.error("Error loading fees:", error);
      } finally {
        setLoading(false);
      }
    };

    loadFees();
  }, []);

  const filteredFees = fees.filter(fee =>
    fee.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    fee.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getPaidCount = (fee: FeeRecord) => fee.paid_count ?? 0;
  const getStudentCount = (fee: FeeRecord) => fee.student_count ?? 0;
  const getProgressPercent = (fee: FeeRecord) => {
    const totalStudents = getStudentCount(fee);
    if (totalStudents <= 0) return 0;
    return (getPaidCount(fee) / totalStudents) * 100;
  };

  const handleAddFee = () => {
    setEditingFee({
      name: "",
      description: "",
      amount: 0,
      currency: "ZMW",
      due_date: "",
      frequency: "termly",
      applicable_to: "all_students",
      is_active: true,
    });
    setShowAddForm(true);
  };

  const handleEditFee = (fee: FeeRecord) => {
    setEditingFee(fee);
    setShowAddForm(true);
  };

  const handleSaveFee = async () => {
    // TODO: Implement fee saving
    console.log("Saving fee:", editingFee);
    setShowAddForm(false);
    setEditingFee(null);
  };

  const handleDeleteFee = async (feeId: number | undefined) => {
    if (typeof feeId !== "number") return;
    // TODO: Implement fee deletion
    console.log("Deleting fee:", feeId);
  };

  const getFrequencyLabel = (frequency: string) => {
    switch (frequency) {
      case "once": return "One-time";
      case "monthly": return "Monthly";
      case "termly": return "Termly";
      case "annually": return "Annually";
      default: return frequency;
    }
  };

  const getApplicableToLabel = (applicableTo: string) => {
    switch (applicableTo) {
      case "all_students": return "All Students";
      case "science_students": return "Science Students";
      case "arts_students": return "Arts Students";
      default: return applicableTo;
    }
  };

  if (loading) {
    return (
      <div className="flex-1 p-4 flex items-center justify-center">
        <div className="text-gray-500">Loading fees...</div>
      </div>
    );
  }

  return (
    <div className="flex-1 p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Fee Management</h1>
        <p className="text-gray-600">Create and manage school fees and payment structures</p>
      </div>

      {/* Search and Actions */}
      <div className="flex flex-col lg:flex-row gap-4 mb-6">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
          <input
            type="text"
            placeholder="Search fees..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        
        <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
          <Plus className="w-4 h-4" />
          Add Fee
        </button>
      </div>

      {/* Fees Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        {filteredFees.map((fee) => (
          <div key={fee.id} className="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-lg transition-shadow">
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-gray-900 mb-1">{fee.name}</h3>
                <p className="text-sm text-gray-600 line-clamp-2">{fee.description}</p>
              </div>
              <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                fee.is_active ? "bg-green-100" : "bg-gray-100"
              }`}>
                <DollarSign className={`w-5 h-5 ${fee.is_active ? "text-green-600" : "text-gray-400"}`} />
              </div>
            </div>

            <div className="space-y-3 mb-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500">Amount</span>
                <span className="font-semibold text-gray-900">ZMW {fee.amount.toLocaleString()}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500">Frequency</span>
                <span className="text-sm text-gray-900">{getFrequencyLabel(fee.frequency)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500">Due Date</span>
                <span className="text-sm text-gray-900">
                  {format(new Date(fee.due_date), "MMM d, yyyy")}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500">Applicable To</span>
                <span className="text-sm text-gray-900">{getApplicableToLabel(fee.applicable_to)}</span>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="mb-4">
              <div className="flex items-center justify-between text-sm mb-1">
                <span className="text-gray-600">Payment Progress</span>
                <span className="text-gray-900 font-medium">
                  {getPaidCount(fee)}/{getStudentCount(fee)}
                </span>
              </div>
              <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-green-600 transition-all"
                  style={{ width: `${getProgressPercent(fee)}%` }}
                />
              </div>
            </div>

            {/* Status Badge */}
            <div className="flex items-center justify-between mb-4">
              <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                fee.is_active 
                  ? "bg-green-100 text-green-700" 
                  : "bg-gray-100 text-gray-700"
              }`}>
                {fee.is_active ? "Active" : "Inactive"}
              </span>
              <div className="flex items-center gap-1 text-xs text-gray-500">
                <Users className="w-3 h-3" />
                {getStudentCount(fee)} students
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2">
              <button 
                onClick={() => handleEditFee(fee)}
                className="flex-1 px-3 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700"
              >
                Edit
              </button>
              <button 
                onClick={() => handleDeleteFee(fee.id)}
                className="flex-1 px-3 py-2 border border-gray-200 text-gray-700 text-sm rounded-lg hover:bg-gray-50"
              >
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>

      {filteredFees.length === 0 && (
        <div className="text-center py-12">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <FileText className="w-8 h-8 text-gray-400" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No fees found</h3>
          <p className="text-gray-500 mb-4">
            {searchTerm ? "Try adjusting your search terms" : "Create your first fee to get started"}
          </p>
          {!searchTerm && (
            <button 
              onClick={handleAddFee}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Add Fee
            </button>
          )}
        </div>
      )}

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg p-4 border border-gray-200">
          <p className="text-sm text-gray-600">Total Fees</p>
          <p className="text-xl font-bold text-gray-900">{fees.length}</p>
        </div>
        <div className="bg-white rounded-lg p-4 border border-gray-200">
          <p className="text-sm text-gray-600">Active Fees</p>
          <p className="text-xl font-bold text-green-600">
            {fees.filter(f => f.is_active).length}
          </p>
        </div>
        <div className="bg-white rounded-lg p-4 border border-gray-200">
          <p className="text-sm text-gray-600">Total Revenue Potential</p>
          <p className="text-xl font-bold text-blue-600">
            ZMW {fees.reduce((sum, f) => sum + (f.amount * getStudentCount(f)), 0).toLocaleString()}
          </p>
        </div>
        <div className="bg-white rounded-lg p-4 border border-gray-200">
          <p className="text-sm text-gray-600">Collected Amount</p>
          <p className="text-xl font-bold text-green-600">
            ZMW {fees.reduce((sum, f) => sum + (f.amount * getPaidCount(f)), 0).toLocaleString()}
          </p>
        </div>
      </div>

      {/* Add/Edit Fee Modal */}
      {showAddForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md">
            <h2 className="text-xl font-bold text-gray-900 mb-4">
              {editingFee?.id ? "Edit Fee" : "Add New Fee"}
            </h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Fee Name</label>
                <input
                  type="text"
                  value={editingFee?.name || ""}
                  onChange={(e) => setEditingFee((prev) => (prev ? { ...prev, name: e.target.value } : prev))}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  value={editingFee?.description || ""}
                  onChange={(e) => setEditingFee((prev) => (prev ? { ...prev, description: e.target.value } : prev))}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={3}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Amount (ZMW)</label>
                <input
                  type="number"
                  value={editingFee?.amount || ""}
                  onChange={(e) => setEditingFee((prev) => (prev ? { ...prev, amount: Number.parseFloat(e.target.value) || 0 } : prev))}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Due Date</label>
                <input
                  type="date"
                  value={editingFee?.due_date?.split('T')[0] || ""}
                  onChange={(e) => setEditingFee((prev) => (prev ? { ...prev, due_date: e.target.value } : prev))}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Frequency</label>
                <select
                  value={editingFee?.frequency || "termly"}
                  onChange={(e) => setEditingFee((prev) => (prev ? { ...prev, frequency: e.target.value } : prev))}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="once">One-time</option>
                  <option value="monthly">Monthly</option>
                  <option value="termly">Termly</option>
                  <option value="annually">Annually</option>
                </select>
              </div>
            </div>
            
            <div className="flex gap-3 mt-6">
              <button
                onClick={handleSaveFee}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                {editingFee?.id ? "Update Fee" : "Create Fee"}
              </button>
              <button
                onClick={() => setShowAddForm(false)}
                className="flex-1 px-4 py-2 border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
