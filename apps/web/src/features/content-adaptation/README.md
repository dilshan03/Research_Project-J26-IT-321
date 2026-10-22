# Content Adaptation - Review & Edit Feature

**Purpose & Details:**
This feature allows teachers to review and edit learning content before it is published to the platform.

## How It Works

### 1. Backend Process
- When a content creator submits new content, it is flagged as "pending review" (status: `pending`).
- It is assigned to an appropriate reviewer based on domain, grade, and language.
- The reviewer can access the content via the "Review Queue" page.
- The content is temporarily stored in a separate collection (`pending-content`) to distinguish it from published content.
- The backend exposes an endpoint `api/admin/content/review-queue` to list and retrieve these pending items.
- Once a reviewer approves (publishes) or rejects (deletes) content, it is moved to the appropriate collection (`content` or deleted from `pending-content`).

### 2. Frontend Components

#### Review Queue Page (`ReviewQueue.tsx`)
- Fetches pending content from the backend using the `useReviewQueue` hook.
- Displays a list of items with filtering options:
    - **Domain**: Mathematics, Sinhala, Environment
    - **Language**: Sinhala, Tamil, English
    - **Grade**: Grade 1-5
    - **Status**: All, Pending, Approved, Rejected
- Each item shows:
    - **Title**
    - **Domain**
    - **Language**
    - **Grade**
    - **Status**
    - **Actions**: "Review & Edit" button
- Clicking "Review & Edit" opens the content editor for that specific item.
- A "Review Info" column displays metadata about the review process ( reviewer name, date, status change notes).

#### Content Editor Modal (`ContentEditorModal.tsx`)
- A modal component used for both creating and editing content.
- For review, it loads the content data from the `pending-content` collection.
- Fields include:
    - **Title**
    - **Summary**
    - **Body**
    - **Category**
    - **Lesson Details** (Grade, Domain, Language)
    - **Associated Activities** (displays related activities)
    - **Multimedia** (for uploading or linking media files)
- Supports **Draft Mode**: Content can be saved as a draft without publishing.
- Supports **Preview Mode**: Allows preview of the content as it would appear to students.
- **Publish Action**: On review, pressing "Publish" moves the content to the main `content` collection and removes it from `pending-content`.
- **Delete Action**: Removes the content from the `pending-content` collection.
- **Approval Notes**: Includes an optional `approvalNotes` field to add comments about the review decision.

## Development Notes

### Testing
To test the review feature, you need to create or submit content that has a status of "pending".

**1. Creating Pending Content Manually**
If you need to manually add content to the review queue for testing purposes, you can insert a document directly into the `pending-content` collection in MongoDB.

**Insert into MongoDB:**
```bash
# Using mongoimport
mongoimport --db mathquest_db --collection pending-content \
  --jsonArray --file /path/to/your/pending-content.json

# Or directly in the mongo shell
use mathquest_db
db.pending-content.insertMany([
  {
    "domain": "Environment",
    "language": "Sinhala",
    "grade": 1,
    "title": "පರಿಸර ಅಧ್ಯයනය - සාම්පල් අන්තර්ගතය",
    "summary": "පරිසරය පිළිබඳ මූලික සංකල්ප",
    "body": "මෙය සමාලෝචනය සහ සංස්කරණය සඳහා සාම්පල් අන්තර්ගතයකි.",
    "category": "lesson",
    "lessonDetails": {
      "gradeLevel": 1,
      "domain": "environment",
      "language": "sinhala"
    },
    "associatedActivities": [],
    "multimedia": [],
    "status": "pending",
    "createdAt": "2024-10-23T10:00:00Z",
    "updatedAt": "2024-10-23T10:00:00Z"
  }
])
```

**Example Pending Content JSON:**
```json
[
  {
    "domain": "Environment",
    "language": "Sinhala",
    "grade": 1,
    "title": "පළමුවන ශ්‍රේණිය - පරිසරය (සමාලෝචනයට)",
    "summary": "පරිසරය පිළිබඳ මූලික හැඳින්වීමක්",
    "body": "මෙම අන්තර්ගතය ගුරුවරුන්ගේ සමාලෝචනයෙන් පසු පළ කිරීමට නියමිතයි. අද දවසේ අපි පරිසරය ගැන ඉගෙන ගනිමු. පරිසරය යනු අපට වටේ තියෙන හැම දේමයි...",
    "category": "lesson",
    "lessonDetails": {
      "gradeLevel": 1,
      "domain": "environment",
      "language": "sinhala"
    },
    "associatedActivities": [],
    "multimedia": [],
    "status": "pending",
    "createdAt": "2024-01-15T10:00:00Z",
    "updatedAt": "2024-01-15T10:00:00Z"
  }
]
```

**Expected Result:**
- The content will appear in the **Review Queue** page.
- Reviewers can then **Review & Edit** the content.
- After editing, they can **Publish** it to the main content collection or **Delete** it.
