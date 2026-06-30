═══════════════════════════════════════════════════════════════════════
Create a> ANNUAL GOALS SYSTEM (NORTH STAR GOALS)
═══════════════════════════════════════════════════════════════════════

OBJECTIVE: Create annual goals system - sacred space for users to define 
yearly transformational directions, keep them visible, and review at year-end.

PHILOSOPHY: Goals ≠ tasks/projects. They are NORTH STARS - directions of 
who you want to become. Minimalist, no gamification, no auto-progress. 
Just: define → remember → review.

═══════════════════════════════════════════════════════════════════════
PART 1: DATA STRUCTURE
═══════════════════════════════════════════════════════════════════════

SCHEMA:
{
  id: "uuid",
  user_id: "uuid",
  year: 2026,
  text: "Become fluent in Spanish" (10-100 chars),
  order: 1-10,
  status: "pending" | "completed" | "partial" | "not_completed",
  created_at: timestamp,
  reviewed_at: null | timestamp
}

RULES:
- Max 10 goals per user per year
- Status = "pending" until Dec 31st passes
- No duplicates (same text in same year)

═══════════════════════════════════════════════════════════════════════
PART 2: MENU BUTTON (HIGHLIGHTED)
═══════════════════════════════════════════════════════════════════════

LOCATION: Top of sidebar menu, SEPARATED from other items

VISUAL:
┌─────────────────────────────────────────┐
│  [X]  MENU                              │
├─────────────────────────────────────────┤
│                                         │
│  ╔═══════════════════════════════════╗ │
│  ║      🎯 2026 GOALS                ║ │
│  ║   "Your North Stars"              ║ │
│  ╚═══════════════════════════════════╝ │
│                                         │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ │
│                                         │
│  🏠 Home                                │
│  📅 Calendar                            │
│  🆘 Rescue                              │
│  📊 Dashboard                           │
│  ⏰ Deadlines                           │
│  🎫 License                             │
│  ⚙️ Settings                            │
│  📖 Theory                              │
└─────────────────────────────────────────┘

CSS (Differentiated):
.menu-goals {
  height: 120px;
  background: linear-gradient(135deg, #FF6B35 0%, #F44336 100%);
  border: 3px solid rgba(255, 215, 0, 0.5);
  border-radius: 16px;
  padding: 24px;
  margin: 16px;
  text-align: center;
  box-shadow: 0 6px 20px rgba(255, 107, 53, 0.4);
  cursor: pointer;
  transition: all 0.3s ease;
}

.menu-goals:hover {
  transform: translateY(-4px) scale(1.02);
  box-shadow: 0 8px 24px rgba(255, 107, 53, 0.5);
}

.menu-goals-title {
  font-size: 18px;
  font-weight: 700;
  color: white;
  text-transform: uppercase;
}

.menu-goals-subtitle {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.9);
  font-style: italic;
}

═══════════════════════════════════════════════════════════════════════
PART 3: MAIN SCREEN (During Year)
═══════════════════════════════════════════════════════════════════════

LAYOUT:
┌─────────────────────────────────────────┐
│  [←]  🎯 2026 GOALS                [✏️] │
├─────────────────────────────────────────┤
│  "Goals are directions, not tasks."    │
│                                         │
│  MY GOALS FOR 2026                     │
│                                         │
│  1. Become fluent in Spanish           │
│     🟡 In progress                     │
│                                         │
│  2. Publish my first book              │
│     🟡 In progress                     │
│                                         │
│  3. Run a half marathon                │
│     🟡 In progress                     │
│                                         │
│  💡 Your goals stay visible all year.  │
│  Look at them regularly to stay on     │
│  track. At year-end, you'll review     │
│  each one.                              │
│                                         │
│  [+ ADD GOAL] (3/10)                   │
└─────────────────────────────────────────┘

INSPIRATIONAL QUOTES (Random):
1. "Goals are directions, not tasks. Who do you want to become?"
2. "Stars guide, but you choose the path."
3. "One year of focus can change a lifetime."
4. "Great transformations begin with clear intentions."
5. "Your goals reveal your deepest values."
6. "The future belongs to those who believe in their goals."
7. "Don't count the days. Make the days count."
8. "Goals are dreams with a review date."
9. "Who you are today vs who you want to be in 365 days?"
10. "Clarity of direction is half the journey."

═══════════════════════════════════════════════════════════════════════
PART 4: ADD GOAL MODAL
═══════════════════════════════════════════════════════════════════════

LAYOUT:
┌─────────────────────────────────────────┐
│  NEW GOAL FOR 2026                   [X]│
├─────────────────────────────────────────┤
│  What's your goal for this year?       │
│  ┌───────────────────────────────────┐ │
│  │ Ex: Become fluent in Spanish      │ │
│  │ 0/100 characters                  │ │
│  └───────────────────────────────────┘ │
│                                         │
│  💡 TIPS FOR GOOD GOALS                │
│                                         │
│  ✅ Write TRANSFORMATIONS              │
│  (who you want to become)              │
│  • "Become fluent in Spanish"          │
│  • "Build a healthy body"              │
│  • "Develop financial mindset"         │
│                                         │
│  ❌ Avoid TASKS or NUMBERS             │
│  • "Read 24 books" → Task              │
│  • "Go to gym 3x/week" → Habit         │
│                                         │
│  [ADD GOAL]                            │
└─────────────────────────────────────────┘

VALIDATIONS:
- 10-100 characters
- No duplicates
- Max 10 goals/year

═══════════════════════════════════════════════════════════════════════
PART 5: EDIT MODE
═══════════════════════════════════════════════════════════════════════

Click [✏️] button:

┌─────────────────────────────────────────┐
│  [←]  🎯 2026 GOALS          [💾 SAVE]  │
├─────────────────────────────────────────┤
│  MY GOALS FOR 2026 (Edit mode)         │
│                                         │
│  1. [✏️] Become fluent in Spanish [🗑️] │
│  2. [✏️] Publish my first book    [🗑️] │
│  3. [✏️] Run a half marathon      [🗑️] │
│                                         │
│  [+ ADD GOAL]                          │
│  [CANCEL]              [💾 SAVE]       │
└─────────────────────────────────────────┘

[✏️] = Edit text inline
[🗑️] = Delete (with confirmation)
[💾 SAVE] = Save all changes

═══════════════════════════════════════════════════════════════════════
PART 6: YEAR-END REVIEW (After Dec 31)
═══════════════════════════════════════════════════════════════════════

Starting Jan 1st:

┌─────────────────────────────────────────┐
│  [←]  🎯 2026 GOALS REVIEW              │
├─────────────────────────────────────────┤
│  🎊 The year 2026 has ended!           │
│  Time to review your goals.            │
│                                         │
│  Be honest with yourself.              │
│  No shame in not completing.           │
│  Only learning.                         │
│                                         │
│  1. Become fluent in Spanish           │
│     ○ ✅ Completed                     │
│     ○ 🟡 Partially                     │
│     ● ❌ Not completed                 │
│                                         │
│  2. Publish my first book              │
│     ● ✅ Completed                     │
│     ○ 🟡 Partially                     │
│     ○ ❌ Not completed                 │
│                                         │
│  ⚠️ Mark ALL goals before saving       │
│                                         │
│  [💾 SAVE REVIEW]                      │
└─────────────────────────────────────────┘

AFTER SAVING → Summary screen:

┌─────────────────────────────────────────┐
│  [←]  🎊 2026 SUMMARY                   │
├─────────────────────────────────────────┤
│  ╔═══════════════════════════════════╗ │
│  ║  YOUR 2026 GOALS                  ║ │
│  ║  ✅ 2 Completed    (40%)          ║ │
│  ║  🟡 2 Partial      (40%)          ║ │
│  ║  ❌ 1 Not done     (20%)          ║ │
│  ╚═══════════════════════════════════╝ │
│                                         │
│  ACHIEVEMENTS                          │
│  ✅ Publish my first book              │
│  ✅ AWS certification                   │
│                                         │
│  PARTIAL PROGRESS                      │
│  🟡 Run a half marathon                │
│                                         │
│  FOR 2027                              │
│  ❌ Become fluent in Spanish           │
│     (Consider trying again!)           │
│                                         │
│  💬 REFLECTION                          │
│  "40% full completion is excellent.    │
│   Most people abandon 100% of goals.   │
│   You persevered. Continue in 2027."   │
│                                         │
│  [📂 ARCHIVE 2026]                     │
│  [🎯 CREATE 2027 GOALS]                │
└─────────────────────────────────────────┘

═══════════════════════════════════════════════════════════════════════
PART 7: ARCHIVE
═══════════════════════════════════════════════════════════════════════

Button on main screen: [📂 VIEW PAST YEARS]

┌─────────────────────────────────────────┐
│  [←]  📂 GOALS ARCHIVE                  │
├─────────────────────────────────────────┤
│  📅 2026 (5 goals)                     │
│  ✅ 2 completed (40%)                  │
│  [VIEW DETAILS]                        │
│                                         │
│  📅 2025 (7 goals)                     │
│  ✅ 4 completed (57%)                  │
│  [VIEW DETAILS]                        │
└─────────────────────────────────────────┘

Click [VIEW DETAILS] → Read-only view of that year

═══════════════════════════════════════════════════════════════════════
PART 8: THEORY (New Topic)
═══════════════════════════════════════════════════════════════════════

Add to Theory screen:

📘 ANNUAL GOALS vs DOPAMINE     [+]

EXPANDED:
┌─────────────────────────────────────────┐
│  WHY ANNUAL GOALS MATTER                │
│                                         │
│  Short-term dopamine (scrolling,       │
│  notifications) hijacks your attention │
│  from what really matters.             │
│                                         │
│  Annual goals are ANCHORS - north      │
│  stars that remind you what you're     │
│  building.                              │
│                                         │
│  GOALS ≠ TASKS ≠ HABITS                │
│                                         │
│  TASK: "Read 24 books"                 │
│  → Specific, measurable, executable    │
│                                         │
│  HABIT: "Go to gym 3x/week"            │
│  → Repeated routine                    │
│                                         │
│  GOAL: "Become an avid reader"         │
│  → Identity transformation             │
│                                         │
│  Goal = DIRECTION                      │
│  Task = ACTION                         │
│  Habit = SYSTEM                        │
│                                         │
│  HOW TO USE GOALS IN STORA             │
│                                         │
│  1. DEFINE (January)                   │
│  Set 5-7 transformational goals        │
│                                         │
│  2. REMEMBER (During year)             │
│  Look at goals weekly. Ask:            │
│  "Do my actions move me toward         │
│   my goals?"                            │
│                                         │
│  3. REVIEW (December)                  │
│  Review with brutal honesty:           │
│  ✅ Completed: You BECAME this         │
│  🟡 Partial: Progressed                │
│  ❌ Not done: Be honest                │
│                                         │
│  GOALS PROTECT FROM DOPAMINE HOLE      │
│                                         │
│  When in a dopamine hole, you lost     │
│  DIRECTION. Looking at goals =         │
│  reconnecting with purpose.            │
└─────────────────────────────────────────┘

═══════════════════════════════════════════════════════════════════════
PART 9: API ENDPOINTS
═══════════════════════════════════════════════════════════════════════

GET    /api/goals?year=2026          → List goals
POST   /api/goals                    → Create goal
PATCH  /api/goals/:id                → Edit text
DELETE /api/goals/:id                → Delete goal
PATCH  /api/goals/:id/review         → Mark status (only after Dec 31)
GET    /api/goals/years              → List archived years
GET    /api/goals/stats/:year        → Stats for specific year

═══════════════════════════════════════════════════════════════════════
PART 10: CHECKLIST
═══════════════════════════════════════════════════════════════════════

DATABASE:
☐ Create `goals` table with schema
☐ Indexes: user_id + year, user_id + year + status
☐ Constraint: UNIQUE (user_id, year, text)

BACKEND:
☐ All endpoints listed above
☐ Validation: 10-100 chars, max 10/year, no duplicates
☐ Year-end logic: allow review only after Dec 31

FRONTEND - MENU:
☐ Highlighted button (gradient, 120px height, gold border)
☐ Divider below
☐ Dynamic year (auto-updates Jan 1)

FRONTEND - MAIN SCREEN:
☐ Header with edit button
☐ Random inspirational quote
☐ Goals list (1-10)
☐ Status "🟡 In progress"
☐ Add button (if < 10)

FRONTEND - ADD MODAL:
☐ Textarea (10-100 chars)
☐ Character counter
☐ Tips section (good vs bad examples)
☐ Validations

FRONTEND - EDIT MODE:
☐ [✏️] and [🗑️] buttons per goal
☐ Inline editing
☐ Delete confirmation
☐ Save all changes

FRONTEND - REVIEW:
☐ Detect if year ended (after Dec 31)
☐ Radio buttons ✅/🟡/❌
☐ Validation: all marked
☐ Save review button

FRONTEND - SUMMARY:
☐ Stats card
☐ Lists by status
☐ Reflection message (dynamic by %)
☐ Archive and create new buttons

FRONTEND - ARCHIVE:
☐ List past years with stats
☐ Read-only detail view

THEORY:
☐ Add "Annual Goals vs Dopamine" topic

TESTS:
☐ Create/edit/delete goals
☐ Max 10 limit
☐ Duplicate validation
☐ Year-end review flow
☐ Archive viewing
☐ Menu button highlights correctly

═══════════════════════════════════════════════════════════════════════
END OF PROMPT
═══════════════════════════════════════════════════════════════════════

RESULT: Complete Annual Goals system in English, minimalist design, 
no gamification, maximum 10 goals, year-end review ritual, archive of 
past years, highlighted menu button.
```