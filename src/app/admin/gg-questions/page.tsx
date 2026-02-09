"use client";

import { useState, useEffect, useRef } from "react";
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

// --- Configuration ---
const GG_ROLES = [
  { value: "plug", label: "Plug" },
 
];

interface GGQuestion {
  id: string;
  question: string;
  options: string[];
  correctAnswers: number[];
  isMultiSelect: boolean;
  difficulty: "Easy" | "Medium" | "Hard";
  role: string;
  moduleName?: string;
  sourceFile?: string;
}

export default function GGQuestionsPage() {
  const [questions, setQuestions] = useState<GGQuestion[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Navigation State
  const [activeRole, setActiveRole] = useState("plug");
  const [activeModule, setActiveModule] = useState<string>("All");

  // Modal States
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  
  // AI & Upload State
  const [isProcessingDocs, setIsProcessingDocs] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [newModuleNameInput, setNewModuleNameInput] = useState(""); 
  const [customInstructions, setCustomInstructions] = useState("");
  const [selectedFiles, setSelectedFiles] = useState<FileList | null>(null);

  // Form States
  const [newQuestion, setNewQuestion] = useState({
    question: "",
    options: ["", "", "", ""],
    correctAnswers: [] as number[],
    isMultiSelect: false,
    difficulty: "Medium" as "Easy" | "Medium" | "Hard",
    role: "plug",
    moduleName: ""
  });
  const [editingQuestion, setEditingQuestion] = useState<GGQuestion | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // --- 1. Fetch Data ---
  useEffect(() => {
    const fetchQuestions = async () => {
      setIsLoading(true);
      try {
        const querySnapshot = await getDocs(collection(db, "gg-questions"));
        const questionsData = querySnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as GGQuestion[];
        setQuestions(questionsData);
      } catch (error) {
        toast.error("Failed to load questions.");
      } finally {
        setIsLoading(false);
      }
    };
    fetchQuestions();
  }, []);

  // --- 2. Module Logic (Smart Sorting & Numbering) ---
  const roleQuestions = questions.filter(q => q.role === activeRole);
  
  const uniqueModules = Array.from(new Set(roleQuestions.map(q => q.moduleName || "General")))
    .sort((a, b) => {
        if (a === "General") return 1;
        if (b === "General") return -1;
        const numA = parseInt(a.match(/Module (\d+):/)?.[1] || "999");
        const numB = parseInt(b.match(/Module (\d+):/)?.[1] || "999");
        return numA - numB;
    });

  const availableModules = ["All", ...uniqueModules];

  const getNextModuleNumber = () => {
    const allModules = questions.map(q => q.moduleName || "").filter(Boolean);
    const numbers = allModules.map(name => {
        const match = name.match(/Module (\d+):/);
        return match ? parseInt(match[1]) : 0;
    });
    return (Math.max(0, ...numbers) + 1);
  };

  // --- Handlers ---
  const handleAddQuestion = async () => {
    try {
      if (!newQuestion.question.trim()) return toast.error("Enter a question");
      const docData = {
        ...newQuestion,
        role: activeRole,
        moduleName: activeModule === "All" ? uniqueModules[0] || "Module 1: General" : activeModule
      };
      const docRef = await addDoc(collection(db, "gg-questions"), docData);
      setQuestions([...questions, { ...docData, id: docRef.id }]);
      toast.success("Question added!");
      setIsAddModalOpen(false);
    } catch (error) {
      toast.error("Failed to save.");
    }
  };

  const handleUpdateQuestion = async () => {
    if (!editingQuestion) return;
    try {
      await updateDoc(doc(db, "gg-questions", editingQuestion.id), editingQuestion as any);
      setQuestions(questions.map((q) => (q.id === editingQuestion.id ? editingQuestion : q)));
      toast.success("Updated!");
      setIsEditModalOpen(false);
    } catch (error) {
      toast.error("Failed to update.");
    }
  };

  const handleDeleteQuestion = async (id: string) => {
    try {
      await deleteDoc(doc(db, "gg-questions", id));
      setQuestions(questions.filter((q) => q.id !== id));
      toast.success("Deleted!");
    } catch (error) {
      toast.error("Failed to delete.");
    }
  };

  const handleFilesSelected = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    
    // Merge with existing files instead of replacing
    if (selectedFiles) {
      const existingFiles = Array.from(selectedFiles);
      const newFiles = Array.from(files);
      const allFiles = [...existingFiles, ...newFiles];
      
      // Create a new FileList-like object
      const dataTransfer = new DataTransfer();
      allFiles.forEach(file => dataTransfer.items.add(file));
      setSelectedFiles(dataTransfer.files);
    } else {
      setSelectedFiles(files);
    }
    
    // Auto-generate title from first file if empty
    if (!newModuleNameInput && files.length >= 1) {
        const name = files[0].name.replace(/\.[^/.]+$/, "").replace(/[-_]/g, " ");
        setNewModuleNameInput(name.replace(/\b\w/g, l => l.toUpperCase()));
    }
  };

  const handleRemoveFile = (indexToRemove: number) => {
    if (!selectedFiles) return;
    
    const filesArray = Array.from(selectedFiles);
    const filteredFiles = filesArray.filter((_, idx) => idx !== indexToRemove);
    
    if (filteredFiles.length === 0) {
      setSelectedFiles(null);
    } else {
      const dataTransfer = new DataTransfer();
      filteredFiles.forEach(file => dataTransfer.items.add(file));
      setSelectedFiles(dataTransfer.files);
    }
  };

  const handleGenerate = async () => {
    if (!selectedFiles || selectedFiles.length === 0) return toast.error("Please upload a file first");
    const nextNum = getNextModuleNumber();
    const userTitle = newModuleNameInput.trim() || "Untitled";
    const fullModuleName = `Module ${nextNum}: ${userTitle}`;
    setIsProcessingDocs(true);
    try {
        const formData = new FormData();
        formData.append("role", activeRole);
        formData.append("moduleName", fullModuleName);
        if (customInstructions.trim()) {
            formData.append("customInstructions", customInstructions.trim());
        }
        for (let i = 0; i < selectedFiles.length; i++) {
            if (selectedFiles[i].size > 0) formData.append("documents", selectedFiles[i]);
        }
        const response = await fetch('/api/gg-questions', { method: 'POST', body: formData });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "Generation failed");
        const generatedQuestions = data.questions;
        const savedQuestions: GGQuestion[] = [];
        for (const q of generatedQuestions) {
            const docData = { ...q, role: activeRole, moduleName: fullModuleName };
            const docRef = await addDoc(collection(db, "gg-questions"), docData);
            savedQuestions.push({ ...docData, id: docRef.id });
        }
        setQuestions(prev => [...prev, ...savedQuestions]);
        setActiveModule(fullModuleName);
        toast.success(`Created "${fullModuleName}"!`);
        setIsUploadModalOpen(false);
        setNewModuleNameInput("");
        setCustomInstructions("");
        setSelectedFiles(null);
    } catch (error) {
        toast.error("AI Generation failed.");
    } finally {
        setIsProcessingDocs(false);
    }
  };

  const getDifficultyColor = (diff: string) => {
    switch(diff) {
        case "Easy": return "bg-green-500/10 text-green-400 border-green-500/20";
        case "Medium": return "bg-yellow-500/10 text-yellow-400 border-yellow-500/20";
        case "Hard": return "bg-red-500/10 text-red-400 border-red-500/20";
        default: return "bg-gray-700 text-gray-400";
    }
  };

  // --- Filter and Structured Sorting Logic ---
  const filteredQuestions = questions
    .filter((q) => {
      const roleMatch = q.role === activeRole;
      const moduleMatch = activeModule === "All" || (q.moduleName || "General") === activeModule;
      return roleMatch && moduleMatch;
    })
    .sort((a, b) => {
      // Prioritize Module Order in the list view
      const nameA = a.moduleName || "General";
      const nameB = b.moduleName || "General";
      
      if (nameA === nameB) return 0;
      if (nameA === "General") return 1;
      if (nameB === "General") return -1;

      const numA = parseInt(nameA.match(/Module (\d+):/)?.[1] || "999");
      const numB = parseInt(nameB.match(/Module (\d+):/)?.[1] || "999");

      return numA - numB;
    });

  return (
    <>
      <Toaster />
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-white">GG Questions</h1>
      </div>

      {/* Role Tabs */}
      <div className="mb-4 flex gap-6 border-b border-gray-700 pb-2">
        {GG_ROLES.map((role) => (
          <button
            key={role.value}
            onClick={() => { setActiveRole(role.value); setActiveModule("All"); }}
            className={`text-lg font-medium transition-all px-2 py-1 ${activeRole === role.value ? "text-white border-b-2 border-emerald-500" : "text-gray-500 hover:text-gray-300"}`}
          >
            {role.label}
          </button>
        ))}
      </div>

      {/* Module Tabs */}
      <div className="mb-6 flex flex-wrap gap-2 items-center ">
        <span className="text-gray-500 text-sm mr-2 uppercase tracking-wide font-semibold">Modules:</span>
        {availableModules.map((mod) => (
            <button
                key={mod}
                onClick={() => setActiveModule(mod)}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all border ${
                    activeModule === mod 
                    ? "bg-emerald-500/10 border-emerald-500/50 text-emerald-400" 
                    : "bg-gray-800 border-gray-700 text-gray-400 hover:bg-gray-750"
                }`}
            >
                {mod}
            </button>
        ))}
        <div className="flex items-center justify-end w-full">
            <button 
            onClick={() => setIsUploadModalOpen(true)}
           className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-all ml-2"
        >
        + New Module
        </button>
        <button
          onClick={() => {
            setNewQuestion({
              question: "",
              options: ["", "", "", ""],
              correctAnswers: [],
              isMultiSelect: false,
              difficulty: "Medium",
              role: activeRole,
              moduleName: activeModule === "All" ? uniqueModules[0] || "Module 1: General" : activeModule
            });
            setIsAddModalOpen(true);
          }}
          className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-all ml-2"
        >
          + Add Question
        </button>
        </div>
      </div>

      {/* Data Table */}
      {isLoading ? (
        <div className="text-center py-20"><div className="animate-spin rounded-full h-10 w-10 border-4 border-gray-700 border-t-emerald-500 mx-auto"></div></div>
      ) : (
        <div className="bg-gray-900/40 border border-gray-800 rounded-xl overflow-hidden shadow-2xl">
          {filteredQuestions.length === 0 ? (
            <div className="p-16 text-center text-gray-500 flex flex-col items-center">
                <div className="w-16 h-16 bg-gray-800 rounded-full flex items-center justify-center mb-4 text-2xl">📂</div>
                <p className="text-lg text-gray-300 font-medium">No questions in this module.</p>
                <button onClick={() => setIsUploadModalOpen(true)} className="mt-4 px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-md border border-gray-700 transition-colors">Generate with AI</button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-900/80 backdrop-blur border-b border-gray-800">
                  <tr className="text-left text-gray-400 text-xs uppercase tracking-wider">
                    <th className="p-4 font-medium">Question Details</th>
                    <th className="p-4 font-medium w-48">Difficulty</th>
                    <th className="p-4 font-medium text-right w-32">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800">
                  {filteredQuestions.map((q) => (
                    <tr key={q.id} className="hover:bg-gray-800/30 transition-colors group">
                      <td className="p-4 align-top">
                        <p className="text-gray-200 font-medium mb-1 text-base">{q.question}</p>
                        <div className="flex items-center gap-2 mt-2 flex-wrap">
                            <span className="text-xs text-indigo-300 bg-indigo-500/10 px-2 py-0.5 rounded border border-indigo-500/20 font-mono tracking-tighter">
                              {q.moduleName || "General"}
                            </span>
                            {q.sourceFile && (
                              <span className="text-xs text-purple-300 bg-purple-500/10 px-2 py-0.5 rounded border border-purple-500/20 font-mono tracking-tighter" title="Source document">
                                📄 {q.sourceFile}
                              </span>
                            )}
                        </div>
                      </td>
                      <td className="p-4 align-top">
                        <div className="flex flex-col gap-2">
                            <span className={`px-2 py-1 text-xs rounded border w-fit font-medium ${getDifficultyColor(q.difficulty)}`}>
                                {q.difficulty || "Medium"}
                            </span>
                        </div>
                      </td>
                      <td className="p-4 text-right align-top">
                        <div className="flex justify-end gap-3 opacity-60 group-hover:opacity-100 transition-opacity">
                            <button onClick={() => { setEditingQuestion(q); setIsEditModalOpen(true); }} className="text-blue-400 hover:text-blue-300 text-sm font-medium">Edit</button>
                            <button onClick={() => handleDeleteQuestion(q.id)} className="text-red-400 hover:text-red-300 text-sm font-medium">Delete</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* --- UPLOAD MODAL --- */}
      {isUploadModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-gray-900 border border-gray-700 p-6 rounded-2xl shadow-2xl w-full max-w-2xl text-center relative">
                <div className="mb-3 relative z-10">
                    <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-3 shadow-lg shadow-indigo-500/20">
                        <span className="text-2xl">📚</span>
                    </div>
                    <h2 className="text-xl font-bold text-white mb-1">Create Module {getNextModuleNumber()}</h2>
                    <p className="text-gray-400 text-xs">Upload one or multiple documents for this module.</p>
                    <p className="text-indigo-400 text-xs mt-0.5">💡 Multiple files will be distributed proportionally</p>
                </div>
                {isProcessingDocs ? (
                    <div className="py-6 space-y-3">
                        <div className="animate-spin rounded-full h-10 w-10 border-4 border-gray-700 border-t-indigo-500 mx-auto"></div>
                        <p className="text-indigo-400 text-sm font-medium animate-pulse">
                            {selectedFiles && selectedFiles.length > 1 
                                ? `Generating questions from ${selectedFiles.length} documents separately...` 
                                : "Reading Docs & Writing Questions..."
                            }
                        </p>
                        {selectedFiles && selectedFiles.length > 1 && (
                            <p className="text-gray-500 text-xs">
                                Each document will contribute proportionally to the question set
                            </p>
                        )}
                    </div>
                ) : (
                    <div className="space-y-3 relative z-10">
                        {/* File Upload Area */}
                        <div 
                            className={`border-2 border-dashed rounded-xl p-1 cursor-pointer transition-all group ${isDragging ? "border-emerald-500 bg-emerald-500/5" : "border-gray-700 hover:border-indigo-500 hover:bg-gray-800/50"}`}
                            onClick={() => fileInputRef.current?.click()}
                            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                            onDragLeave={(e) => { e.preventDefault(); setIsDragging(false); }}
                            onDrop={(e) => { 
                                e.preventDefault(); 
                                setIsDragging(false);
                                handleFilesSelected(e.dataTransfer.files); 
                            }}
                        >
                            <div className="text-3xl mb-2 group-hover:scale-110 transition-transform">
                                {selectedFiles && selectedFiles.length > 1 ? "📚" : "📄"}
                            </div>
                            <p className="text-gray-300 text-sm font-medium mb-1">
                                {selectedFiles 
                                    ? `${selectedFiles.length} file${selectedFiles.length > 1 ? 's' : ''} selected` 
                                    : "Click or Drag Files Here"
                                }
                            </p>
                            <p className="text-xs text-gray-500">
                                Supports PDF, TXT, MD • Multiple files allowed
                            </p>
                            <input 
                                type="file" 
                                ref={fileInputRef} 
                                className="hidden" 
                                multiple 
                                accept=".pdf,.txt,.md"
                                onChange={(e) => handleFilesSelected(e.target.files)} 
                            />
                        </div>

                        {/* Selected Files List */}
                        {selectedFiles && selectedFiles.length > 0 && (
                            <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-3 overflow-y-auto max-h-[20vh]">
                                <div className="flex items-center justify-between mb-2">
                                    <h3 className="text-xs font-semibold text-gray-300">Selected Files</h3>
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            fileInputRef.current?.click();
                                        }}
                                        className="text-xs text-indigo-400 hover:text-indigo-300 font-medium flex items-center gap-1"
                                    >
                                        <span>+</span>
                                        <span>Add More</span>
                                    </button>
                                </div>
                                <div className="max-h-40 overflow-y-auto space-y-1.5">
                                    {Array.from(selectedFiles).map((file, idx) => (
                                        <div key={idx} className="flex items-center justify-between bg-gray-900/50 px-2.5 py-2 rounded-lg group hover:bg-gray-900/80 transition-colors">
                                            <div className="flex items-center gap-2 flex-1 min-w-0">
                                                <span className="text-base flex-shrink-0">
                                                    {file.name.endsWith('.pdf') ? '📕' : file.name.endsWith('.md') ? '📘' : '📄'}
                                                </span>
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-xs text-gray-300 truncate">{file.name}</p>
                                                    <p className="text-xs text-gray-500">{(file.size / 1024).toFixed(1)} KB</p>
                                                </div>
                                            </div>
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleRemoveFile(idx);
                                                }}
                                                className="ml-2 text-red-400 hover:text-red-300 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
                                                title="Remove file"
                                            >
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                                </svg>
                                            </button>
                                        </div>
                                    ))}
                                </div>
                                {selectedFiles.length > 1 && (
                                    <p className="text-xs text-indigo-400 mt-2 text-center">
                                        All {selectedFiles.length} files will be analyzed together
                                    </p>
                                )}
                            </div>
                        )}
                        
                        <div className="text-left">
                            <label className="text-xs text-gray-500 mb-1 block font-medium">
                                Module Title <span className="text-red-400">*</span>
                            </label>
                            <input 
                                type="text" 
                                placeholder="e.g., React Hooks, API Integration"
                                className="w-full p-2.5 text-sm bg-gray-950 border border-gray-700 rounded-lg text-white outline-none focus:border-indigo-500 transition-all placeholder:text-gray-600"
                                value={newModuleNameInput}
                                onChange={(e) => setNewModuleNameInput(e.target.value)}
                            />
                            <p className="text-xs text-gray-500 mt-1">
                                Will become "Module {getNextModuleNumber()}: {newModuleNameInput || "Your Title"}"
                            </p>
                        </div>
                        
                        <div className="text-left">
                            <label className="text-xs text-gray-500 mb-1 block font-medium">
                                Custom Instructions <span className="text-gray-600">(Optional)</span>
                            </label>
                            
                            <textarea 
                                placeholder="e.g., 2 questions from first file and 8 from second file, make them all hard"
                                className="w-full p-2.5 text-sm bg-gray-950 border border-gray-700 rounded-lg text-white outline-none focus:border-indigo-500 transition-all placeholder:text-gray-600 resize-none"
                                rows={3}
                                value={customInstructions}
                                onChange={(e) => setCustomInstructions(e.target.value)}
                            />
                            
                        </div>
                        
                        <div className="flex gap-2 pt-2">
                            <button 
                                onClick={() => {
                                    setIsUploadModalOpen(false);
                                    setSelectedFiles(null);
                                    setNewModuleNameInput("");
                                }} 
                                className="flex-1 py-2.5 text-sm bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg font-medium transition-colors"
                            >
                                Cancel
                            </button>
                            <button 
                                onClick={handleGenerate} 
                                disabled={!selectedFiles || !newModuleNameInput.trim()} 
                                className="flex-1 py-2.5 text-sm bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
                            >
                                <span>✨</span>
                                <span>Generate Questions</span>
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
      )}

      {/* --- ADD MODAL --- */}
      {isAddModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 border border-gray-700 p-8 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <h2 className="text-2xl font-bold mb-6 text-white">Add Question</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2 text-gray-300">Question</label>
                <input
                  type="text"
                  className="w-full p-3 bg-gray-900 border border-gray-600 rounded-lg text-white focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none"
                  value={newQuestion.question}
                  onChange={(e) => setNewQuestion({ ...newQuestion, question: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2 text-gray-300">Module Name</label>
                <input
                  type="text"
                  className="w-full p-3 bg-gray-900 border border-gray-600 rounded-lg text-white focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none"
                  value={newQuestion.moduleName}
                  onChange={(e) => setNewQuestion({ ...newQuestion, moduleName: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2 text-gray-300">Options</label>
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
                <label className="block text-sm font-medium mb-2 text-gray-300">Correct Answer(s)</label>
                <div className="space-y-2">
                  {newQuestion.options.map((option, index) => (
                    <label key={index} className="flex items-center text-gray-300 hover:text-white cursor-pointer">
                      <input
                        type="checkbox"
                        className="mr-3 w-4 h-4 text-emerald-500 bg-gray-700 border-gray-600 rounded focus:ring-emerald-500"
                        checked={newQuestion.correctAnswers.includes(index)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setNewQuestion({ ...newQuestion, correctAnswers: [...newQuestion.correctAnswers, index] });
                          } else {
                            setNewQuestion({ ...newQuestion, correctAnswers: newQuestion.correctAnswers.filter((i) => i !== index) });
                          }
                        }}
                      />
                      {option || `Option ${index + 1}`}
                    </label>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2 text-gray-300">Difficulty</label>
                <select
                  className="w-full p-3 bg-gray-900 border border-gray-600 rounded-lg text-white focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none"
                  value={newQuestion.difficulty}
                  onChange={(e) => setNewQuestion({ ...newQuestion, difficulty: e.target.value as "Easy" | "Medium" | "Hard" })}
                >
                  <option value="Easy">Easy</option>
                  <option value="Medium">Medium</option>
                  <option value="Hard">Hard</option>
                </select>
              </div>
              <div>
                <label className="flex items-center text-gray-300 hover:text-white cursor-pointer">
                  <input
                    type="checkbox"
                    className="mr-3 w-4 h-4 text-emerald-500 bg-gray-700 border-gray-600 rounded focus:ring-emerald-500"
                    checked={newQuestion.isMultiSelect}
                    onChange={(e) => setNewQuestion({ ...newQuestion, isMultiSelect: e.target.checked })}
                  />
                  Allow multiple selections
                </label>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={handleAddQuestion} className="px-6 py-3 bg-gradient-to-r from-emerald-500 to-blue-500 hover:from-emerald-600 hover:to-blue-600 text-white rounded-lg font-semibold transition-all">Add Question</button>
              <button onClick={() => setIsAddModalOpen(false)} className="px-6 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-lg font-semibold transition-all">Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* --- EDIT MODAL --- */}
      {isEditModalOpen && editingQuestion && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 border border-gray-700 p-8 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <h2 className="text-2xl font-bold mb-6 text-white">Edit Question</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2 text-gray-300">Question</label>
                <input
                  type="text"
                  className="w-full p-3 bg-gray-900 border border-gray-600 rounded-lg text-white focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none"
                  value={editingQuestion.question}
                  onChange={(e) => setEditingQuestion({ ...editingQuestion, question: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2 text-gray-300">Module Name</label>
                <input
                  type="text"
                  className="w-full p-3 bg-gray-900 border border-gray-600 rounded-lg text-white focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none"
                  value={editingQuestion.moduleName || ""}
                  onChange={(e) => setEditingQuestion({ ...editingQuestion, moduleName: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2 text-gray-300">Options</label>
                {editingQuestion.options.map((option, index) => (
                  <input
                    key={index}
                    type="text"
                    className="w-full p-3 bg-gray-900 border border-gray-600 rounded-lg text-white focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none mb-2"
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
                <label className="block text-sm font-medium mb-2 text-gray-300">Correct Answer(s)</label>
                <div className="space-y-2">
                  {editingQuestion.options.map((option, index) => (
                    <label key={index} className="flex items-center text-gray-300 hover:text-white cursor-pointer">
                      <input
                        type="checkbox"
                        className="mr-3 w-4 h-4 text-emerald-500 bg-gray-700 border-gray-600 rounded focus:ring-emerald-500"
                        checked={editingQuestion.correctAnswers.includes(index)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setEditingQuestion({ ...editingQuestion, correctAnswers: [...editingQuestion.correctAnswers, index] });
                          } else {
                            setEditingQuestion({ ...editingQuestion, correctAnswers: editingQuestion.correctAnswers.filter((i) => i !== index) });
                          }
                        }}
                      />
                      {option || `Option ${index + 1}`}
                    </label>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2 text-gray-300">Difficulty</label>
                <select
                  className="w-full p-3 bg-gray-900 border border-gray-600 rounded-lg text-white focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none"
                  value={editingQuestion.difficulty || "Medium"}
                  onChange={(e) => setEditingQuestion({ ...editingQuestion, difficulty: e.target.value as "Easy" | "Medium" | "Hard" })}
                >
                  <option value="Easy">Easy</option>
                  <option value="Medium">Medium</option>
                  <option value="Hard">Hard</option>
                </select>
              </div>
              <div>
                <label className="flex items-center text-gray-300 hover:text-white cursor-pointer">
                  <input
                    type="checkbox"
                    className="mr-3 w-4 h-4 text-emerald-500 bg-gray-700 border-gray-600 rounded focus:ring-emerald-500"
                    checked={editingQuestion.isMultiSelect}
                    onChange={(e) => setEditingQuestion({ ...editingQuestion, isMultiSelect: e.target.checked })}
                  />
                  Allow multiple selections
                </label>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={handleUpdateQuestion} className="px-6 py-3 bg-gradient-to-r from-emerald-500 to-blue-500 hover:from-emerald-600 hover:to-blue-600 text-white rounded-lg font-semibold transition-all">Update Question</button>
              <button onClick={() => setIsEditModalOpen(false)} className="px-6 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-lg font-semibold transition-all">Cancel</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}