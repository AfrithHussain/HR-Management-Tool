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
        toast.error(
          "Failed to load questions. Please check your Firestore connection."
        );
      } finally {
        setIsLoading(false);
      }
    };
    fetchQuestions();
  }, []);

  const handleAddQuestion = async () => {
    try {
      // Add validation
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
      toast.error("Failed to add question. Please try again.");
    }
  };

  const handleUpdateQuestion = async () => {
    if (!editingQuestion) return;
    try {
      await updateDoc(
        doc(db, "questions", editingQuestion.id),
        editingQuestion as any
      );
      setQuestions(
        questions.map((q) =>
          q.id === editingQuestion.id ? editingQuestion : q
        )
      );
      toast.success("Question updated successfully!");
      setIsEditModalOpen(false);
      setEditingQuestion(null);
    } catch (error) {
      console.error("Error updating question:", error);
      toast.error("Failed to update question. Please try again.");
    }
  };

  const handleDeleteQuestion = async (id: string) => {
    try {
      await deleteDoc(doc(db, "questions", id));
      setQuestions(questions.filter((q) => q.id !== id));
      toast.success("Question deleted successfully!");
    } catch (error) {
      console.error("Error deleting question:", error);
      toast.error("Failed to delete question. Please try again.");
    }
  };

  const openEditModal = (question: Question) => {
    setEditingQuestion(question);
    setIsEditModalOpen(true);
  };

  const handleInsertCuratedQuestions = async () => {
    const confirmed = window.confirm(
      "This will add 20 curated frontend/React questions to your database. Continue?"
    );
    if (!confirmed) return;

    setIsLoading(true);
    const result = await addCuratedQuestions(activeRole);
    setIsLoading(false);

    if (result.success) {
      toast.success(
        `Successfully added ${result.count} curated ${
          AVAILABLE_ROLES.find((r) => r.value === activeRole)?.label
        } questions!`
      );
      // Refresh the questions list
      const querySnapshot = await getDocs(collection(db, "questions"));
      const questionsData = querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Question[];
      setQuestions(questionsData);
    } else {
      toast.error(result.message || "Failed to add curated questions");
    }
  };

  const filteredQuestions = questions.filter(
    (q) => q.role === activeRole || !q.role
  );

  return (
    <>
      <Toaster />
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-white">Questions</h1>
      </div>

      {/* Role Tabs */}
      <div className="mb-6 border-b border-gray-700">
        <div className="flex gap-2 overflow-x-auto">
          {AVAILABLE_ROLES.map((role) => {
            const count = questions.filter(
              (q) =>
                q.role === role.value || (!q.role && role.value === "frontend")
            ).length;
            return (
              <button
                key={role.value}
                onClick={() => setActiveRole(role.value)}
                className={`px-4 py-3 font-medium transition-all whitespace-nowrap ${
                  activeRole === role.value
                    ? "text-emerald-400 border-b-2 border-emerald-400"
                    : "text-gray-400 hover:text-gray-300"
                }`}
              >
                {role.label}
                <span className="ml-2 px-2 py-0.5 bg-gray-700 rounded-full text-xs">
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Tab Actions */}
      <div className="flex justify-end gap-2 mb-4">
        {activeRole === "frontend" ? (
          <button
            onClick={handleInsertCuratedQuestions}
            disabled={isLoading}
            className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 transition-all"
          >
            {isLoading ? "Adding..." : "Insert 20 Sample Questions"}
          </button>
        ) : (
          <button
            onClick={handleInsertCuratedQuestions}
            disabled={isLoading}
            className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 transition-all"
          >
            {isLoading
              ? "Adding..."
              : `Insert 20 Sample ${
                  AVAILABLE_ROLES.find((r) => r.value === activeRole)?.label
                } Questions`}
          </button>
        )}
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
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-all"
        >
          + Add Question
        </button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-gray-700 border-t-emerald-500"></div>
        </div>
      ) : (
        <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-xl shadow-2xl overflow-hidden">
          {filteredQuestions.length === 0 ? (
            <div className="p-8 text-center text-gray-400">
              <p className="mb-4">
                No questions for{" "}
                {AVAILABLE_ROLES.find((r) => r.value === activeRole)?.label}{" "}
                yet.
              </p>
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
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                Add First Question
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-900/50">
                  <tr className="border-b border-gray-700">
                    <th className="p-4 text-left text-gray-300 font-semibold">
                      Question
                    </th>
                    <th className="p-4 text-left text-gray-300 font-semibold">
                      Type
                    </th>
                    <th className="p-4 text-left text-gray-300 font-semibold">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredQuestions.map((question) => (
                    <tr
                      key={question.id}
                      className="border-b border-gray-700 hover:bg-gray-700/30 transition-colors"
                    >
                      <td className="p-4 text-gray-200">{question.question}</td>
                      <td className="p-4">
                        <span className="px-2 py-1 bg-purple-500/20 text-purple-400 text-xs rounded">
                          {question.isMultiSelect ? "Multiple" : "Single"}
                        </span>
                      </td>
                      <td className="p-4">
                        <button
                          onClick={() => openEditModal(question)}
                          className="text-blue-400 hover:text-blue-300 mr-4 font-medium"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDeleteQuestion(question.id)}
                          className="text-red-400 hover:text-red-300 font-medium"
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

      {isAddModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 border border-gray-700 p-8 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <h2 className="text-2xl font-bold mb-6 text-white">Add Question</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2 text-gray-300">
                  Question
                </label>
                <input
                  type="text"
                  className="w-full p-3 bg-gray-900 border border-gray-600 rounded-lg text-white focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none"
                  value={newQuestion.question}
                  onChange={(e) =>
                    setNewQuestion({ ...newQuestion, question: e.target.value })
                  }
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2 text-gray-300">
                  Options
                </label>
                {newQuestion.options.map((option, index) => (
                  <input
                    key={index}
                    type="text"
                    className="w-full p-3 bg-gray-900 border border-gray-600 rounded-lg text-white focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none mb-2"
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
                <label className="block text-sm font-medium mb-2 text-gray-300">
                  Correct Answer(s)
                </label>
                <div className="space-y-2">
                  {newQuestion.options.map((option, index) => (
                    <label
                      key={index}
                      className="flex items-center text-gray-300 hover:text-white cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        className="mr-3 w-4 h-4 text-emerald-500 bg-gray-700 border-gray-600 rounded focus:ring-emerald-500"
                        checked={newQuestion.correctAnswers.includes(index)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setNewQuestion({
                              ...newQuestion,
                              correctAnswers: [
                                ...newQuestion.correctAnswers,
                                index,
                              ],
                            });
                          } else {
                            setNewQuestion({
                              ...newQuestion,
                              correctAnswers: newQuestion.correctAnswers.filter(
                                (i) => i !== index
                              ),
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
                <label className="flex items-center text-gray-300 hover:text-white cursor-pointer">
                  <input
                    type="checkbox"
                    className="mr-3 w-4 h-4 text-emerald-500 bg-gray-700 border-gray-600 rounded focus:ring-emerald-500"
                    checked={newQuestion.isMultiSelect}
                    onChange={(e) =>
                      setNewQuestion({
                        ...newQuestion,
                        isMultiSelect: e.target.checked,
                      })
                    }
                  />
                  Allow multiple selections
                </label>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={handleAddQuestion}
                className="px-6 py-3 bg-gradient-to-r from-emerald-500 to-blue-500 hover:from-emerald-600 hover:to-blue-600 text-white rounded-lg font-semibold transition-all"
              >
                Add Question
              </button>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="px-6 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-lg font-semibold transition-all"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {isEditModalOpen && editingQuestion && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 border border-gray-700 p-8 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <h2 className="text-2xl font-bold mb-6 text-white">
              Edit Question
            </h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2 text-gray-300">
                  Question
                </label>
                <input
                  type="text"
                  className="w-full p-3 bg-gray-900 border border-gray-600 rounded-lg text-white focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none"
                  value={editingQuestion.question}
                  onChange={(e) =>
                    setEditingQuestion({
                      ...editingQuestion,
                      question: e.target.value,
                    })
                  }
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">
                  Options
                </label>
                {editingQuestion.options.map((option, index) => (
                  <input
                    key={index}
                    type="text"
                    className="w-full p-2 border rounded-md mb-2"
                    placeholder={`Option ${index + 1}`}
                    value={option}
                    onChange={(e) => {
                      const newOptions = [...editingQuestion.options];
                      newOptions[index] = e.target.value;
                      setEditingQuestion({
                        ...editingQuestion,
                        options: newOptions,
                      });
                    }}
                  />
                ))}
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">
                  Correct Answer(s)
                </label>
                <div className="space-y-2">
                  {editingQuestion.options.map((option, index) => (
                    <label key={index} className="flex items-center">
                      <input
                        type="checkbox"
                        className="mr-2"
                        checked={editingQuestion.correctAnswers.includes(index)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setEditingQuestion({
                              ...editingQuestion,
                              correctAnswers: [
                                ...editingQuestion.correctAnswers,
                                index,
                              ],
                            });
                          } else {
                            setEditingQuestion({
                              ...editingQuestion,
                              correctAnswers:
                                editingQuestion.correctAnswers.filter(
                                  (i) => i !== index
                                ),
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
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    className="mr-2"
                    checked={editingQuestion.isMultiSelect}
                    onChange={(e) =>
                      setEditingQuestion({
                        ...editingQuestion,
                        isMultiSelect: e.target.checked,
                      })
                    }
                  />
                  Allow multiple selections
                </label>
              </div>
            </div>
            <div className="flex gap-2 mt-4">
              <button
                onClick={handleUpdateQuestion}
                className="px-4 py-2 bg-blue-600 text-white rounded-md"
              >
                Update
              </button>
              <button
                onClick={() => setIsEditModalOpen(false)}
                className="px-4 py-2 bg-gray-300 text-gray-800 rounded-md"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
