# Frontend Intern Screening Quiz System

## Overview

This document outlines the plan for building a frontend intern screening quiz system using Next.js, Firebase, and Tailwind CSS. The system will have two user roles: candidates and admins, with different levels of access and functionality.

## Features

### Implemented Features

*   **Google Authentication:** Users can log in with their Google account.
*   **Role-based Access Control:**
    *   Admins (users with `@greedygame.com` email addresses) are redirected to the admin dashboard.
    *   Candidates (all other users) are redirected to the quiz page.

### Planned Features

*   **Quiz:**
    *   Candidates can take a multiple-choice quiz.
    *   The quiz will support both single and multiple-select questions.
    *   A progress bar will show the candidate's progress.
    *   Scores will be calculated and saved to Firestore upon submission.
*   **Admin Dashboard:**
    *   **Submissions:**
        *   View a list of all candidate submissions.
        *   Filter submissions by status.
        *   Search for submissions by email.
        *   View detailed submission information, including answers.
        *   Update the status of a submission.
        *   Add notes to a submission.
    *   **Questions:**
        *   View a list of all quiz questions.
        *   Add, edit, and delete questions.
        *   Reorder questions using drag-and-drop.

## Implementation Plan

1.  **Project Structure:** Create the necessary directories and files for the project.
2.  **Firebase Integration:** Add the Firebase configuration to the project.
3.  **Authentication:** Implement Google login and create a middleware for role-based redirection.
4.  **Quiz Page:** Build the quiz page for candidates to take the test.
5.  **Admin Pages:** Create the admin dashboard for managing questions and reviewing submissions.
