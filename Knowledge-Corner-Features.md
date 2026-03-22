# Knowledge Corner - Feature Guide

The Knowledge Corner is a daily quiz feature within the Sringeri Devotee Services app. It provides educational content about the Peetham's heritage and tests devotees' knowledge through interactive quizzes.

---

## For Devotees

### Daily Quiz
- A new quiz is published each day, accessible from the **Knowledge** tab in the bottom navigation bar.
- Each quiz has a **publish date** — it appears as "Today's Quiz" on that date.
- Devotees must be signed in to participate.

### Study Materials
Before taking the quiz, devotees can study the topic through rich content:
- **Text content** with formatted descriptions (supports links and styling)
- **Video lessons** (YouTube embeds or direct video links)
- **Audio clips** with a built-in player
- **Image gallery** with swipeable photos

### Taking a Quiz
- Questions are presented one at a time in a step-by-step flow.
- **Single-choice** questions use radio buttons; **multiple-choice** questions use checkboxes.
- Progress dots at the top show which questions have been answered.
- Each quiz can only be attempted **once** — no retakes allowed.

### Results & Review
- After submitting, devotees see their **score** (e.g., 4 out of 5).
- A **Review mode** lets them go through each question to see which answers were correct or incorrect.
- Correct answer options are hidden from the quiz data until after submission (prevents cheating).

### Sharing
- Quizzes can be shared with others using the **Share** button.
- On mobile, this opens the native share sheet; on desktop, it copies the quiz link to the clipboard.
- Shared links lead directly to that specific quiz (e.g., `/knowledge/42`).

### Past Quizzes
- A **Past Quizzes** section lets devotees browse and attempt quizzes from previous days they may have missed.
- Already-attempted quizzes show the score earned.

### My Scores
- The **My Scores** tab shows a history of all quiz attempts with the quiz title, date, and score.

---

## Gamification

### Streaks
- A **daily streak** counter (flame icon) tracks how many consecutive days a devotee has taken a quiz.
- The streak resets if a day is missed.
- Streak calculation is based on India Standard Time (IST) to ensure consistency.

### Badges
Devotees earn badges as they participate. There are 7 badges:

| Badge | Name | How to Earn |
|-------|------|-------------|
| First Steps | first_steps | Complete your first quiz |
| Perfect Score | perfect_score | Score 100% on any quiz |
| Quiz Explorer | quiz_explorer | Attempt 10 quizzes |
| Knowledge Seeker | knowledge_seeker | Attempt 25 quizzes |
| Week Warrior | week_warrior | Maintain a 7-day streak |
| Fortnight Scholar | fortnight_scholar | Maintain a 14-day streak |
| Month Master | month_master | Maintain a 30-day streak |

- **Celebration animation** plays when a new badge is earned after submitting a quiz.
- Earned badges are displayed as full cards with the badge name, description, and date earned.
- Unearned badges appear in an "Up Next" section with progress bars showing how close the devotee is.

---

## For Administrators

### Accessing the Admin Panel
- Navigate to `/admin/quizzes` and sign in with an authorized admin account.
- Admin access is controlled by a list of approved user IDs configured on the server.

### Creating a Quiz
1. Click **New Quiz**.
2. Fill in the details:
   - **Title** and **Subtitle** (e.g., "Adi Shankaracharya" / "Life and Teachings")
   - **Description** — supports markdown formatting for rich text
   - **Video URL** — YouTube link or direct video URL (optional)
   - **Audio URL** — direct link to an audio file (optional)
   - **Image URLs** — one URL per line for the image gallery (optional)
   - **Publish Date** — the date this quiz will appear as "Today's Quiz"
   - **Active toggle** — enable or disable the quiz
3. Save the quiz, then add questions.

### Managing Questions
- Add questions with multiple options each.
- Mark one or more options as correct (supports both single and multiple correct answers).
- Questions are saved in bulk for efficiency.
- Questions can be added, removed, or reordered at any time.

### Editing & Deleting
- Existing quizzes can be edited (content, dates, questions) at any time.
- Quizzes can be deleted if needed.

---

## Launch Gate

### How It Works
- Before the app is inaugurated, all visitors see a **Coming Soon** page.
- The `/fastline` page remains accessible even before launch.
- An admin navigates to `/admin/launch`, signs in, and presses the **Inaugurate** button to open the app.
- After launch, visiting `/admin/launch` redirects straight to the app.

### Resetting the Launch
- If needed, an admin can visit `/admin/launch/reset` to put the app back into Coming Soon mode.
- This is a separate page so it cannot be accidentally triggered during a ceremony.

---

## Technical Notes
- All quiz data is stored in PostgreSQL (quizzes, questions, attempts, badges).
- Firebase Authentication is required for all quiz features.
- Answer correctness is stripped from API responses for unattempted quizzes to prevent cheating.
- Badge awarding includes a self-healing mechanism — missed badges are retroactively awarded when the gamification data is loaded.
