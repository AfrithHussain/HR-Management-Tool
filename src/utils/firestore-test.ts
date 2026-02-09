import { db, auth } from "../lib/firebase";
import { collection, getDocs, addDoc } from "firebase/firestore";

export const testFirestoreConnection = async () => {
  console.log("🔍 Testing Firestore Connection...");

  // Check auth state
  console.log("Auth user:", auth.currentUser);

  try {
    // Test 1: Simple collection read
    console.log("📚 Testing questions collection...");
    const questionsSnapshot = await getDocs(collection(db, "questions"));
    console.log(
      "✅ Questions collection accessible:",
      questionsSnapshot.size,
      "documents"
    );

    // Test 2: Test submissions collection
    console.log("📝 Testing submissions collection...");
    const submissionsSnapshot = await getDocs(collection(db, "submissions"));
    console.log(
      "✅ Submissions collection accessible:",
      submissionsSnapshot.size,
      "documents"
    );

    return { success: true, message: "Firestore connection working" };
  } catch (error: any) {
    console.error("❌ Firestore Error:", error);
    console.error("Error code:", error.code);
    console.error("Error message:", error.message);

    // Specific error handling
    if (error.code === "permission-denied") {
      return {
        success: false,
        message: "Permission denied - check Firestore security rules",
        error: error.code,
      };
    } else if (error.code === "unauthenticated") {
      return {
        success: false,
        message: "User not authenticated - please sign in first",
        error: error.code,
      };
    } else {
      return {
        success: false,
        message: `Firestore error: ${error.message}`,
        error: error.code,
      };
    }
  }
};

export const addTestQuestions = async () => {
  console.log("📝 Adding test questions to Firestore...");

  const testQuestions = [
    {
      question: "What does HTML stand for?",
      options: [
        "Hyper Text Markup Language",
        "High Tech Modern Language",
        "Home Tool Markup Language",
        "Hyperlinks and Text Markup Language",
      ],
      correctAnswers: [0],
      isMultiSelect: false,
    },
    {
      question:
        "Which of the following are JavaScript frameworks? (Select all that apply)",
      options: ["React", "Angular", "Django", "Vue.js"],
      correctAnswers: [0, 1, 3],
      isMultiSelect: true,
    },
    {
      question:
        "What is the correct syntax for referring to an external script called 'app.js'?",
      options: [
        "<script href='app.js'>",
        "<script name='app.js'>",
        "<script src='app.js'>",
        "<script file='app.js'>",
      ],
      correctAnswers: [2],
      isMultiSelect: false,
    },
    {
      question: "Which CSS property is used to change the text color?",
      options: ["text-color", "color", "font-color", "text-style"],
      correctAnswers: [1],
      isMultiSelect: false,
    },
    {
      question: "What are valid HTTP methods? (Select all that apply)",
      options: ["GET", "POST", "FETCH", "DELETE"],
      correctAnswers: [0, 1, 3],
      isMultiSelect: true,
    },
  ];

  try {
    const addedQuestions = [];
    for (const question of testQuestions) {
      const docRef = await addDoc(collection(db, "questions"), question);
      addedQuestions.push({ id: docRef.id, ...question });
      console.log(
        `✅ Added question: "${question.question}" (ID: ${docRef.id})`
      );
    }

    console.log(
      `🎉 Successfully added ${addedQuestions.length} test questions!`
    );
    return { success: true, questions: addedQuestions };
  } catch (error: any) {
    console.error("❌ Error adding test questions:", error);
    return {
      success: false,
      message: `Failed to add questions: ${error.message}`,
      error: error.code,
    };
  }
};
