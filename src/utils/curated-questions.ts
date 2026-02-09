export const curatedFrontendQuestions = [
  {
    question: "What is the Virtual DOM in React?",
    options: [
      "A lightweight copy of the actual DOM kept in memory",
      "A database for storing component state",
      "A CSS framework for styling components",
      "A testing library for React applications",
    ],
    correctAnswers: [0],
    isMultiSelect: false,
    role: "frontend" as const,
  },
  {
    question: "Which hooks are used for side effects in React?",
    options: ["useState", "useEffect", "useLayoutEffect", "useContext"],
    correctAnswers: [1, 2],
    isMultiSelect: true,
    role: "frontend" as const,
  },
  {
    question: "What is the purpose of React.memo()?",
    options: [
      "To memoize expensive calculations",
      "To prevent unnecessary re-renders of functional components",
      "To store data in local storage",
      "To create class components",
    ],
    correctAnswers: [1],
    isMultiSelect: false,
    role: "frontend" as const,
  },
  {
    question:
      "Which CSS properties trigger layout reflow? (Select all that apply)",
    options: ["width", "height", "color", "transform"],
    correctAnswers: [0, 1],
    isMultiSelect: true,
    role: "frontend" as const,
  },
  {
    question: "What is the difference between '==' and '===' in JavaScript?",
    options: [
      "'==' checks value only, '===' checks value and type",
      "They are exactly the same",
      "'===' is faster than '=='",
      "'==' is deprecated in modern JavaScript",
    ],
    correctAnswers: [0],
    isMultiSelect: false,
    role: "frontend" as const,
  },
  {
    question: "What is a closure in JavaScript?",
    options: [
      "A function that has access to variables in its outer scope",
      "A way to close browser windows",
      "A method to end loops early",
      "A CSS property for hiding elements",
    ],
    correctAnswers: [0],
    isMultiSelect: false,
    role: "frontend" as const,
  },
  {
    question:
      "Which of the following are valid ways to create a React component?",
    options: [
      "Function component",
      "Class component",
      "Arrow function component",
      "Object component",
    ],
    correctAnswers: [0, 1, 2],
    isMultiSelect: true,
    role: "frontend" as const,
  },
  {
    question: "What is the purpose of the 'key' prop in React lists?",
    options: [
      "To encrypt data",
      "To help React identify which items have changed",
      "To style list items",
      "To sort the list",
    ],
    correctAnswers: [1],
    isMultiSelect: false,
    role: "frontend" as const,
  },
  {
    question: "What does CSS specificity determine?",
    options: [
      "Which CSS rule is applied when multiple rules target the same element",
      "How fast CSS loads",
      "The size of CSS files",
      "Browser compatibility",
    ],
    correctAnswers: [0],
    isMultiSelect: false,
    role: "frontend" as const,
  },
  {
    question: "Which array methods do NOT mutate the original array?",
    options: ["map()", "push()", "filter()", "splice()"],
    correctAnswers: [0, 2],
    isMultiSelect: true,
    role: "frontend" as const,
  },
  {
    question: "What is the purpose of useCallback hook?",
    options: [
      "To memoize callback functions",
      "To make API calls",
      "To handle form submissions",
      "To create custom hooks",
    ],
    correctAnswers: [0],
    isMultiSelect: false,
    role: "frontend" as const,
  },
  {
    question: "What is event bubbling in JavaScript?",
    options: [
      "Events propagate from child to parent elements",
      "Events create bubbles on the screen",
      "Events are cancelled automatically",
      "Events only work on button clicks",
    ],
    correctAnswers: [0],
    isMultiSelect: false,
    role: "frontend" as const,
  },
  {
    question: "Which HTTP methods are idempotent? (Select all that apply)",
    options: ["GET", "POST", "PUT", "DELETE"],
    correctAnswers: [0, 2, 3],
    isMultiSelect: true,
    role: "frontend" as const,
  },
  {
    question: "What is the purpose of React Context?",
    options: [
      "To share data across components without prop drilling",
      "To style components",
      "To handle routing",
      "To make API calls",
    ],
    correctAnswers: [0],
    isMultiSelect: false,
    role: "frontend" as const,
  },
  {
    question: "What is the box model in CSS?",
    options: [
      "Content, padding, border, and margin",
      "Only width and height",
      "A 3D rendering technique",
      "A JavaScript framework",
    ],
    correctAnswers: [0],
    isMultiSelect: false,
    role: "frontend" as const,
  },
  {
    question: "Which statements about async/await are true?",
    options: [
      "async functions always return a Promise",
      "await can only be used inside async functions",
      "await blocks the entire application",
      "async/await is syntactic sugar over Promises",
    ],
    correctAnswers: [0, 1, 3],
    isMultiSelect: true,
    role: "frontend" as const,
  },
  {
    question: "What is the purpose of useReducer hook?",
    options: [
      "To manage complex state logic",
      "To reduce file size",
      "To optimize performance",
      "To handle routing",
    ],
    correctAnswers: [0],
    isMultiSelect: false,
    role: "frontend" as const,
  },
  {
    question: "What is CORS (Cross-Origin Resource Sharing)?",
    options: [
      "A security mechanism that restricts cross-origin HTTP requests",
      "A CSS framework",
      "A React library",
      "A database technology",
    ],
    correctAnswers: [0],
    isMultiSelect: false,
    role: "frontend" as const,
  },
  {
    question: "Which CSS units are relative? (Select all that apply)",
    options: ["em", "px", "rem", "%"],
    correctAnswers: [0, 2, 3],
    isMultiSelect: true,
    role: "frontend" as const,
  },
  {
    question: "What is the purpose of React.StrictMode?",
    options: [
      "To highlight potential problems in the application",
      "To enforce strict typing",
      "To improve performance",
      "To enable production mode",
    ],
    correctAnswers: [0],
    isMultiSelect: false,
    role: "frontend" as const,
  },
];

// Backend Questions
export const curatedBackendQuestions = [
  {
    question: "What is the purpose of an API Gateway?",
    options: [
      "To route requests to appropriate microservices",
      "To store database credentials",
      "To compile backend code",
      "To design user interfaces",
    ],
    correctAnswers: [0],
    isMultiSelect: false,
    role: "backend" as const,
  },
  {
    question: "Which HTTP status codes indicate client errors?",
    options: ["2xx", "3xx", "4xx", "5xx"],
    correctAnswers: [2],
    isMultiSelect: false,
    role: "backend" as const,
  },
  {
    question: "What is database normalization?",
    options: [
      "Organizing data to reduce redundancy",
      "Making databases faster",
      "Encrypting database content",
      "Backing up databases",
    ],
    correctAnswers: [0],
    isMultiSelect: false,
    role: "backend" as const,
  },
  {
    question: "What is REST?",
    options: [
      "Representational State Transfer",
      "Remote Execution Service Tool",
      "Rapid Enterprise System Technology",
      "Resource Encryption Standard",
    ],
    correctAnswers: [0],
    isMultiSelect: false,
    role: "backend" as const,
  },
  {
    question: "Which database type is MongoDB?",
    options: ["Relational", "NoSQL", "Graph", "Time-series"],
    correctAnswers: [1],
    isMultiSelect: false,
    role: "backend" as const,
  },
  {
    question: "What is middleware in Express.js?",
    options: [
      "Functions that execute during request-response cycle",
      "Database connection layer",
      "Frontend routing system",
      "CSS preprocessor",
    ],
    correctAnswers: [0],
    isMultiSelect: false,
    role: "backend" as const,
  },
  {
    question: "What is JWT used for?",
    options: [
      "Authentication and authorization",
      "Database queries",
      "File compression",
      "Image processing",
    ],
    correctAnswers: [0],
    isMultiSelect: false,
    role: "backend" as const,
  },
  {
    question: "What is the purpose of indexing in databases?",
    options: [
      "To speed up query performance",
      "To encrypt data",
      "To backup data",
      "To compress data",
    ],
    correctAnswers: [0],
    isMultiSelect: false,
    role: "backend" as const,
  },
  {
    question: "What is a microservice architecture?",
    options: [
      "Breaking application into small, independent services",
      "Using very small servers",
      "Minimizing code size",
      "A type of database",
    ],
    correctAnswers: [0],
    isMultiSelect: false,
    role: "backend" as const,
  },
  {
    question: "What is SQL injection?",
    options: [
      "A security vulnerability in database queries",
      "A way to optimize queries",
      "A database backup method",
      "A query language feature",
    ],
    correctAnswers: [0],
    isMultiSelect: false,
    role: "backend" as const,
  },
  {
    question: "What is caching?",
    options: [
      "Storing frequently accessed data in fast storage",
      "Deleting old data",
      "Encrypting sensitive data",
      "Compressing files",
    ],
    correctAnswers: [0],
    isMultiSelect: false,
    role: "backend" as const,
  },
  {
    question: "What is a transaction in databases?",
    options: [
      "A sequence of operations performed as a single unit",
      "A type of query",
      "A backup operation",
      "A user login",
    ],
    correctAnswers: [0],
    isMultiSelect: false,
    role: "backend" as const,
  },
  {
    question: "What is load balancing?",
    options: [
      "Distributing traffic across multiple servers",
      "Reducing code size",
      "Optimizing database queries",
      "Compressing images",
    ],
    correctAnswers: [0],
    isMultiSelect: false,
    role: "backend" as const,
  },
  {
    question: "What is GraphQL?",
    options: [
      "A query language for APIs",
      "A graph database",
      "A charting library",
      "A CSS framework",
    ],
    correctAnswers: [0],
    isMultiSelect: false,
    role: "backend" as const,
  },
  {
    question: "What is Docker?",
    options: [
      "A containerization platform",
      "A database system",
      "A programming language",
      "A web server",
    ],
    correctAnswers: [0],
    isMultiSelect: false,
    role: "backend" as const,
  },
  {
    question: "What is ACID in databases?",
    options: [
      "Atomicity, Consistency, Isolation, Durability",
      "Advanced Caching and Indexing Design",
      "Automated Compression and Integrity Detection",
      "Application Control and Interface Development",
    ],
    correctAnswers: [0],
    isMultiSelect: false,
    role: "backend" as const,
  },
  {
    question: "What is a foreign key?",
    options: [
      "A field that links to primary key in another table",
      "An encrypted password",
      "A backup key",
      "A special index type",
    ],
    correctAnswers: [0],
    isMultiSelect: false,
    role: "backend" as const,
  },
  {
    question: "What is rate limiting?",
    options: [
      "Controlling the number of requests a client can make",
      "Limiting database size",
      "Reducing code complexity",
      "Compressing responses",
    ],
    correctAnswers: [0],
    isMultiSelect: false,
    role: "backend" as const,
  },
  {
    question: "What is WebSocket?",
    options: [
      "A protocol for real-time bidirectional communication",
      "A type of HTTP request",
      "A database connection",
      "A security feature",
    ],
    correctAnswers: [0],
    isMultiSelect: false,
    role: "backend" as const,
  },
  {
    question: "What is ORM?",
    options: [
      "Object-Relational Mapping",
      "Online Resource Manager",
      "Optimized Request Method",
      "Operational Risk Management",
    ],
    correctAnswers: [0],
    isMultiSelect: false,
    role: "backend" as const,
  },
];

// Data Questions
export const curatedDataQuestions = [
  {
    question: "What is ETL in data engineering?",
    options: [
      "Extract, Transform, Load",
      "Encrypt, Transfer, Log",
      "Execute, Test, Launch",
      "Evaluate, Track, Learn",
    ],
    correctAnswers: [0],
    isMultiSelect: false,
    role: "data" as const,
  },
  {
    question: "Which SQL clause is used to filter grouped data?",
    options: ["WHERE", "HAVING", "GROUP BY", "ORDER BY"],
    correctAnswers: [1],
    isMultiSelect: false,
    role: "data" as const,
  },
  {
    question: "What is a data warehouse?",
    options: [
      "A centralized repository for storing large amounts of structured data",
      "A physical storage facility",
      "A type of database backup",
      "A cloud storage service",
    ],
    correctAnswers: [0],
    isMultiSelect: false,
    role: "data" as const,
  },
  {
    question: "What is a JOIN in SQL?",
    options: [
      "Combining rows from two or more tables",
      "Adding new columns",
      "Deleting records",
      "Creating indexes",
    ],
    correctAnswers: [0],
    isMultiSelect: false,
    role: "data" as const,
  },
  {
    question: "What is data normalization?",
    options: [
      "Organizing data to reduce redundancy",
      "Converting data to normal distribution",
      "Encrypting sensitive data",
      "Compressing data files",
    ],
    correctAnswers: [0],
    isMultiSelect: false,
    role: "data" as const,
  },
  {
    question: "What is a primary key?",
    options: [
      "A unique identifier for each record",
      "The first column in a table",
      "An encrypted password",
      "A backup key",
    ],
    correctAnswers: [0],
    isMultiSelect: false,
    role: "data" as const,
  },
  {
    question: "What is Big Data?",
    options: [
      "Extremely large datasets that require special processing",
      "Data stored on large servers",
      "Encrypted data",
      "Compressed data",
    ],
    correctAnswers: [0],
    isMultiSelect: false,
    role: "data" as const,
  },
  {
    question: "What is Apache Spark?",
    options: [
      "A distributed data processing engine",
      "A database system",
      "A web server",
      "A programming language",
    ],
    correctAnswers: [0],
    isMultiSelect: false,
    role: "data" as const,
  },
  {
    question: "What is data mining?",
    options: [
      "Discovering patterns in large datasets",
      "Extracting data from databases",
      "Encrypting data",
      "Backing up data",
    ],
    correctAnswers: [0],
    isMultiSelect: false,
    role: "data" as const,
  },
  {
    question: "What is a data lake?",
    options: [
      "A storage repository for raw data in native format",
      "A type of database",
      "A backup system",
      "A data visualization tool",
    ],
    correctAnswers: [0],
    isMultiSelect: false,
    role: "data" as const,
  },
  {
    question: "What is pandas in Python?",
    options: [
      "A data manipulation library",
      "A web framework",
      "A database system",
      "A testing tool",
    ],
    correctAnswers: [0],
    isMultiSelect: false,
    role: "data" as const,
  },
  {
    question: "What is a data pipeline?",
    options: [
      "A series of data processing steps",
      "A type of database connection",
      "A backup system",
      "A visualization tool",
    ],
    correctAnswers: [0],
    isMultiSelect: false,
    role: "data" as const,
  },
  {
    question: "What is SQL?",
    options: [
      "Structured Query Language",
      "Simple Question Language",
      "System Quality Level",
      "Standard Query Library",
    ],
    correctAnswers: [0],
    isMultiSelect: false,
    role: "data" as const,
  },
  {
    question: "What is data visualization?",
    options: [
      "Representing data graphically",
      "Storing data visually",
      "Encrypting data",
      "Compressing data",
    ],
    correctAnswers: [0],
    isMultiSelect: false,
    role: "data" as const,
  },
  {
    question: "What is a NoSQL database?",
    options: [
      "A non-relational database",
      "A database without SQL support",
      "A deprecated database type",
      "A cloud-only database",
    ],
    correctAnswers: [0],
    isMultiSelect: false,
    role: "data" as const,
  },
  {
    question: "What is data cleaning?",
    options: [
      "Removing errors and inconsistencies from data",
      "Deleting old data",
      "Encrypting data",
      "Compressing data",
    ],
    correctAnswers: [0],
    isMultiSelect: false,
    role: "data" as const,
  },
  {
    question: "What is a data schema?",
    options: [
      "The structure and organization of data",
      "A backup plan",
      "An encryption method",
      "A compression algorithm",
    ],
    correctAnswers: [0],
    isMultiSelect: false,
    role: "data" as const,
  },
  {
    question: "What is machine learning?",
    options: [
      "Algorithms that learn from data",
      "Manual data entry",
      "Database optimization",
      "Data encryption",
    ],
    correctAnswers: [0],
    isMultiSelect: false,
    role: "data" as const,
  },
  {
    question: "What is data aggregation?",
    options: [
      "Combining data from multiple sources",
      "Deleting duplicate data",
      "Encrypting data",
      "Backing up data",
    ],
    correctAnswers: [0],
    isMultiSelect: false,
    role: "data" as const,
  },
  {
    question: "What is a data model?",
    options: [
      "An abstract representation of data structure",
      "A physical storage device",
      "A backup system",
      "A visualization tool",
    ],
    correctAnswers: [0],
    isMultiSelect: false,
    role: "data" as const,
  },
];

// Android Questions
export const curatedAndroidQuestions = [
  {
    question: "What is an Activity in Android?",
    options: [
      "A single screen with a user interface",
      "A background service",
      "A database table",
      "A network request",
    ],
    correctAnswers: [0],
    isMultiSelect: false,
    role: "android" as const,
  },
  {
    question: "Which layout is most efficient for complex UIs in Android?",
    options: [
      "LinearLayout",
      "RelativeLayout",
      "ConstraintLayout",
      "FrameLayout",
    ],
    correctAnswers: [2],
    isMultiSelect: false,
    role: "android" as const,
  },
  {
    question: "What is the Android Manifest file used for?",
    options: [
      "Declaring app components and permissions",
      "Storing user data",
      "Compiling code",
      "Designing layouts",
    ],
    correctAnswers: [0],
    isMultiSelect: false,
    role: "android" as const,
  },
];

// QA Questions
export const curatedQAQuestions = [
  {
    question: "What is regression testing?",
    options: [
      "Testing to ensure new changes don't break existing functionality",
      "Testing only new features",
      "Testing database performance",
      "Testing user interface design",
    ],
    correctAnswers: [0],
    isMultiSelect: false,
    role: "qa" as const,
  },
  {
    question: "Which testing approach tests individual units of code?",
    options: [
      "Integration testing",
      "Unit testing",
      "System testing",
      "Acceptance testing",
    ],
    correctAnswers: [1],
    isMultiSelect: false,
    role: "qa" as const,
  },
  {
    question: "What is the purpose of test automation?",
    options: [
      "To execute tests automatically and repeatedly",
      "To replace manual testers",
      "To write code faster",
      "To design test cases",
    ],
    correctAnswers: [0],
    isMultiSelect: false,
    role: "qa" as const,
  },
];

import { collection, addDoc } from "firebase/firestore";
import { db } from "../lib/firebase";
import { UserRole } from "./whitelist";

export const addCuratedQuestions = async (role: UserRole = "frontend") => {
  let questionsToAdd;
  let roleName;

  switch (role) {
    case "backend":
      questionsToAdd = curatedBackendQuestions;
      roleName = "Backend";
      break;
    case "data":
      questionsToAdd = curatedDataQuestions;
      roleName = "Data";
      break;
    case "android":
      questionsToAdd = curatedAndroidQuestions;
      roleName = "Android";
      break;
    case "qa":
      questionsToAdd = curatedQAQuestions;
      roleName = "QA";
      break;
    default:
      questionsToAdd = curatedFrontendQuestions;
      roleName = "Frontend";
  }

  console.log(
    `📝 Adding ${questionsToAdd.length} curated ${roleName} questions...`
  );

  try {
    const addedQuestions = [];
    for (const question of questionsToAdd) {
      const docRef = await addDoc(collection(db, "questions"), question);
      addedQuestions.push({ id: docRef.id, ...question });
      console.log(`✅ Added: "${question.question}" (ID: ${docRef.id})`);
    }

    console.log(
      `🎉 Successfully added ${addedQuestions.length} curated ${roleName} questions!`
    );
    return {
      success: true,
      count: addedQuestions.length,
      questions: addedQuestions,
    };
  } catch (error: any) {
    console.error("❌ Error adding curated questions:", error);
    return {
      success: false,
      message: `Failed to add questions: ${error.message}`,
      error: error.code,
    };
  }
};
