"use client";

import { useState, useEffect } from "react";
import { Toaster, toast } from "react-hot-toast";
import { db } from "../../../lib/firebase";
import {
  collection,
  getDocs,
  addDoc,
  deleteDoc,
  doc,
  updateDoc,
} from "firebase/firestore";
import { addCuratedQuestions } from "../../../utils/curated-questions";
import { AVAILABLE_ROLES, UserRole } from "../../../utils/whitelist";

interface Question {
  id: string;
  question: string;
  options: string[];
  correctAnswers: number[];
  isMultiSelect: boolean;
  role: UserRole;
}

export default function QuestionsPage() {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeRole, setActiveRole] = useState<UserRole>("frontend");
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [newQuestion, setNewQuestion] = useState({
    question: "",
    options: ["", "", "", ""],
    correctAnswers: [] as number[],
    isMultiSelect: false,
    role: "frontend" as UserRole,
  });
  const [editingQuestion, setEditingQuestion] = useState<Question | null>(null);

  useEffect(() => {
    const fetchQuestions = async () => {
      setIsLoading(true);
      try {
        const querySnapshot = await getDocs(collection(db, "questions"));
        const questionsData = querySnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as Question[];
        setQuestions(questionsData);
      } catch (error) {
        console.error("Error fetching questions:", error);
        toast.error("Failed to load questions");
      } finally {
        setIsLoading(false);
      }
    };
    fetchQuestions();
  }, []);

  const handleAddQuestion = async () => {
    try {
      if (!newQuestion.question.trim()) {
        toast.error("Please enter a question");
        return;
      }
      if (newQuestion.correctAnswers.length === 0) {
        toast.error("Please select at least one correct answer");
        return;
      }

      const docRef = await addDoc(collection(db, "questions"), newQuestion);
      setQuestions([...questions, { ...newQuestion, id: docRef.id }]);
      toast.success("Question added successfully!");
      setIsAddModalOpen(false);
      setNewQuestion({
        question: "",
        options: ["", "", "", ""],
        correctAnswers: [],
        isMultiSelect: false,
        role: activeRole,
      });
    } catch (error) {
      console.error("Error adding question:", error);
      toast.error("Failed to add question");
    }
  };

  const handleUpdateQuestion = async () => {
    if (!editingQuestion) return;
    try {
      await updateDoc(doc(db, "questions", editingQuestion.id), editingQuestion as any);
      setQuestions(questions.map((q) => (q.id === editingQuestion.id ? editingQuestion : q)));
      toast.success("Question updated successfully!");
      setIsEditModalOpen(false);
      setEditingQuestion(null);
    } catch (error) {
      console.error("Error updating question:", error);
      toast.error("Failed to update question");
    }
  };

  const handleDeleteQuestion = async (id: string) => {
    try {
      await deleteDoc(doc(db, "questions", id));
      setQuestions(questions.filter((q) => q.id !== id));
      toast.success("Question deleted successfully!");
    } catch (error) {
      console.error("Error deleting question:", error);
      toast.error("Failed to delete question");
    }
  };

  const openEditModal = (question: Question) => {
    setEditingQuestion(question);
    setIsEditModalOpen(true);
  };

  const handleInsertCuratedQuestions = async () => {
    const confirmed = window.confirm(
      "This will add 20 curated questions to your database. Continue?"
    );
    if (!confirmed) return;

    setIsLoading(true);
    const result = await addCuratedQuestions(activeRole);
    setIsLoading(false);

    if (result.success) {
      toast.success(`Successfully added ${result.count} questions!`);
      const querySnapshot = await getDocs(collection(db, "questions"));
      const questionsData = querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Question[];
      setQuestions(questionsData);
    } else {
      toast.error(result.message || "Failed to add questions");
    }
  };

  const filteredQuestions = questions.filter((q) => q.role === activeRole || !q.role);

  return (
    <div className="max-w-7xl">
      
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-semibold text-gray-900">Hiring Questions</h1>
        <button
          onClick={() => {
            setNewQuestion({
              question: "",
              options: ["", "", "", ""],
              correctAnswers: [],
              isMultiSelect: false,
              role: activeRole,
            });
            setIsAddModalOpen(true);
          }}
          className="px-4 py-2 bg-gray-900 hover:bg-gray-800 text-white text-sm font-medium rounded-lg transition-colors"
        >
          Add Question
        </button>
      </div>

      {/* Role Tabs */}
      <div className="mb-6 border-b border-gray-200">
        <div className="flex gap-4">
          {AVAILABLE_ROLES.map((role) => {
            const count = questions.filter((q) => q.role === role.value || (!q.role && role.value === "frontend")).length;
            return (
              <button
                key={role.value}
                onClick={() => setActiveRole(role.value)}
                className={`px-4 py-3 font-medium transition-all ${
                  activeRole === role.value
                    ? "text-gray-900 border-b-2 border-gray-900"
                    : "text-gray-600 hover:text-gray-900"
                }`}
              >
                {role.label}
                <span className="ml-2 px-2 py-0.5 bg-gray-100 text-gray-700 rounded-full text-xs">
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex justify-end mb-4">
        <button
          onClick={handleInsertCuratedQuestions}
          disabled={isLoading}
          className="px-4 py-2 border border-gray-300 hover:bg-gray-50 text-gray-700 text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
        >
          {isLoading ? "Adding..." : "Insert 20 Sample Questions"}
        </button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-gray-900 border-t-transparent"></div>
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
          {filteredQuestions.length === 0 ? (
            <div className="p-8 text-center text-gray-600">
              <p className="mb-4">No questions for {AVAILABLE_ROLES.find((r) => r.value === activeRole)?.label} yet.</p>
              <button
                onClick={() => {
                  setNewQuestion({
                    question: "",
                    options: ["", "", "", ""],
                    correctAnswers: [],
                    isMultiSelect: false,
                    role: activeRole,
                  });
                  setIsAddModalOpen(true);
                }}
                className="px-4 py-2 bg-gray-900 hover:bg-gray-800 text-white text-sm rounded-lg"
              >
                Add First Question
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase">Question</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase">Type</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-600 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filteredQuestions.map((question) => (
                    <tr key={question.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm text-gray-900">{question.question}</td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-purple-100 text-purple-800">
                          {question.isMultiSelect ? "Multiple" : "Single"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => openEditModal(question)}
                          className="text-sm text-gray-600 hover:text-gray-900 mr-4"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDeleteQuestion(question.id)}
                          className="text-sm text-red-600 hover:text-red-700"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Add Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Add Question</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Question</label>
                <input
                  type="text"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900"
                  value={newQuestion.question}
                  onChange={(e) => setNewQuestion({ ...newQuestion, question: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Options</label>
                {newQuestion.options.map((option, index) => (
                  <input
                    key={index}
                    type="text"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900 mb-2"
                    placeholder={`Option ${index + 1}`}
                    value={option}
                    onChange={(e) => {
                      const newOptions = [...newQuestion.options];
                      newOptions[index] = e.target.value;
                      setNewQuestion({ ...newQuestion, options: newOptions });
                    }}
                  />
                ))}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Correct Answer(s)</label>
                <div className="space-y-2">
                  {newQuestion.options.map((option, index) => (
                    <label key={index} className="flex items-center text-gray-700">
                      <input
                        type="checkbox"
                        className="mr-2"
                        checked={newQuestion.correctAnswers.includes(index)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setNewQuestion({
                              ...newQuestion,
                              correctAnswers: [...newQuestion.correctAnswers, index],
                            });
                          } else {
                            setNewQuestion({
                              ...newQuestion,
                              correctAnswers: newQuestion.correctAnswers.filter((i) => i !== index),
                            });
                          }
                        }}
                      />
                      {option || `Option ${index + 1}`}
                    </label>
                  ))}
                </div>
              </div>
              <div>
                <label className="flex items-center text-gray-700">
                  <input
                    type="checkbox"
                    className="mr-2"
                    checked={newQuestion.isMultiSelect}
                    onChange={(e) => setNewQuestion({ ...newQuestion, isMultiSelect: e.target.checked })}
                  />
                  Allow multiple selections
                </label>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={handleAddQuestion}
                className="flex-1 px-4 py-2 bg-gray-900 hover:bg-gray-800 text-white text-sm font-medium rounded-lg transition-colors"
              >
                Add Question
              </button>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="flex-1 px-4 py-2 border border-gray-300 hover:bg-gray-50 text-gray-700 text-sm font-medium rounded-lg transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {isEditModalOpen && editingQuestion && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Edit Question</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Question</label>
                <input
                  type="text"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900"
                  value={editingQuestion.question}
                  onChange={(e) => setEditingQuestion({ ...editingQuestion, question: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Options</label>
                {editingQuestion.options.map((option, index) => (
                  <input
                    key={index}
                    type="text"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900 mb-2"
                    placeholder={`Option ${index + 1}`}
                    value={option}
                    onChange={(e) => {
                      const newOptions = [...editingQuestion.options];
                      newOptions[index] = e.target.value;
                      setEditingQuestion({ ...editingQuestion, options: newOptions });
                    }}
                  />
                ))}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Correct Answer(s)</label>
                <div className="space-y-2">
                  {editingQuestion.options.map((option, index) => (
                    <label key={index} className="flex items-center text-gray-700">
                      <input
                        type="checkbox"
                        className="mr-2"
                        checked={editingQuestion.correctAnswers.includes(index)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setEditingQuestion({
                              ...editingQuestion,
                              correctAnswers: [...editingQuestion.correctAnswers, index],
                            });
                          } else {
                            setEditingQuestion({
                              ...editingQuestion,
                              correctAnswers: editingQuestion.correctAnswers.filter((i) => i !== index),
                            });
                          }
                        }}
                      />
                      {option || `Option ${index + 1}`}
                    </label>
                  ))}
                </div>
              </div>
              <div>
                <label className="flex items-center text-gray-700">
                  <input
                    type="checkbox"
                    className="mr-2"
                    checked={editingQuestion.isMultiSelect}
                    onChange={(e) => setEditingQuestion({ ...editingQuestion, isMultiSelect: e.target.checked })}
                  />
                  Allow multiple selections
                </label>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={handleUpdateQuestion}
                className="flex-1 px-4 py-2 bg-gray-900 hover:bg-gray-800 text-white text-sm font-medium rounded-lg transition-colors"
              >
                Update
              </button>
              <button
                onClick={() => setIsEditModalOpen(false)}
                className="flex-1 px-4 py-2 border border-gray-300 hover:bg-gray-50 text-gray-700 text-sm font-medium rounded-lg transition-colors"
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
