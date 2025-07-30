# HadalHub - Barashada Afka Ingiriisiga

Barnaamij dhamaystiran oo loogu talagalay barashada afka Ingiriisiga oo isku daray waxbarasho habaysan iyo is-dhexgal bulsheed toos ah iyada oo loo marayo sheekaysiga la shariikayaasha iyo doodaha kooxaha.

## 🌟 Project Overview

This platform creates an immersive environment where users can:
- Learn grammar and vocabulary through structured lessons
- Practice with random partners via text and voice chat
- Participate in evening group debates
- Track progress through daily quizzes and statistics

### Core Philosophy
The platform solves the biggest challenge in language learning: **lack of real conversation practice**. Most language apps focus on grammar exercises but fail to provide authentic speaking opportunities. This platform bridges that gap through genuine human interaction.

## 🏗️ Architecture

### Frontend
- **Framework**: React.js with Vite
- **Styling**: Tailwind CSS v3
- **Routing**: React Router DOM
- **Icons**: Lucide React
- **Authentication**: Supabase Auth UI

### Backend
- **Database**: Supabase (PostgreSQL)
- **Authentication**: Supabase Auth
- **Real-time**: Supabase Realtime
- **File Storage**: Supabase Storage (for voice messages)

## 📊 Database Schema

### Core Tables

#### `users`
User profiles and progress tracking
```sql
- id (UUID, Primary Key)
- email (TEXT, Unique)
- display_name (TEXT)
- english_level (ENUM: beginner, intermediate, advanced)
- status (ENUM: active, suspended, banned)
- daily_matches_used (INTEGER, default: 0)
- groups_created_today (INTEGER, default: 0)
- total_lessons_completed (INTEGER, default: 0)
- total_quizzes_passed (INTEGER, default: 0)
- current_streak (INTEGER, default: 0)
- longest_streak (INTEGER, default: 0)
- last_activity (TIMESTAMP)
- created_at (TIMESTAMP)
```

#### `lessons`
Educational content organized by level and type
```sql
- id (UUID, Primary Key)
- title (TEXT)
- level (ENUM: beginner, intermediate, advanced)
- type (ENUM: grammar, vocabulary, phrases)
- order_index (INTEGER)
- content (JSONB) - Structured lesson content
- is_active (BOOLEAN, default: true)
- created_at (TIMESTAMP)
```

#### `quizzes`
Daily quizzes and assessments
```sql
- id (UUID, Primary Key)
- lesson_id (UUID, Foreign Key)
- level (ENUM: beginner, intermediate, advanced)
- title (TEXT)
- questions (JSONB) - Array of question objects
- passing_score (INTEGER, default: 80)
- max_attempts (INTEGER, default: 3)
- is_daily (BOOLEAN, default: false)
- created_at (TIMESTAMP)
```

#### `chat_sessions`
Random partner and group chat sessions
```sql
- id (UUID, Primary Key)
- type (ENUM: random_partner, group_debate)
- status (ENUM: waiting, active, completed, expired)
- participants (UUID[]) - Array of user IDs
- max_participants (INTEGER, default: 2)
- created_by (UUID, Foreign Key)
- expires_at (TIMESTAMP) - 24 hours for partners, end of night for groups
- group_id (UUID, Foreign Key)
- metadata (JSONB)
- created_at (TIMESTAMP)
```

#### `messages`
Text and voice messages
```sql
- id (UUID, Primary Key)
- chat_session_id (UUID, Foreign Key)
- sender_id (UUID, Foreign Key)
- content (TEXT) - Text content or voice transcript
- message_type (ENUM: text, voice)
- voice_file_url (TEXT) - URL to voice file in storage
- voice_duration (INTEGER) - Duration in seconds
- reactions (JSONB) - User reactions
- is_edited (BOOLEAN, default: false)
- created_at (TIMESTAMP)
```

#### `groups`
Night debate rooms
```sql
- id (UUID, Primary Key)
- name (TEXT)
- level (ENUM: beginner, intermediate, advanced)
- topic_id (UUID, Foreign Key)
- host_id (UUID, Foreign Key)
- participants (UUID[])
- max_participants (INTEGER, default: 10)
- status (ENUM: waiting, active, full, closed)
- chat_session_id (UUID, Foreign Key)
- scheduled_start (TIMESTAMP) - 8 PM local time
- scheduled_end (TIMESTAMP) - 11 PM local time
- created_at (TIMESTAMP)
```

#### `debate_topics`
Topics for group debates
```sql
- id (UUID, Primary Key)
- title (TEXT)
- description (TEXT)
- level (ENUM: beginner, intermediate, advanced)
- is_active (BOOLEAN, default: true)
- usage_count (INTEGER, default: 0)
- created_by (UUID, Foreign Key)
- created_at (TIMESTAMP)
```

### Supporting Tables
- `user_quiz_attempts` - Quiz performance tracking
- `user_lesson_progress` - Learning progress monitoring
- `match_queue` - Random partner matching system
- `user_reports` - Moderation and safety reporting
- `group_join_requests` - Topic agreement tracking
- `admin_users` - Admin role management

## 🔐 Security Features

### Row Level Security (RLS)
All tables have RLS enabled with comprehensive policies:
- Users can only access their own data
- Chat participants can view messages in their sessions
- Group members can see group information
- Admins have elevated permissions for content management

### Authentication
- Email/password signup with no email confirmation required
- Immediate platform access after registration
- JWT-based session management
- Secure password reset functionality

## 🚀 Key Features

### Learning System
- **Three Levels**: Beginner, Intermediate, Advanced
- **Content Types**: Grammar lessons, vocabulary sets, practical phrases
- **Daily Quizzes**: 5-10 questions per level with 80% passing score
- **Progress Tracking**: Lessons completed, quizzes passed, learning streaks

### Random Partner Chat
- **Daily Limit**: 5 matches per user
- **Smart Matching**: Compatible English levels
- **Privacy**: Auto-delete after 24 hours
- **Communication**: Text and voice messages only (no video)

### Night Debate Groups
- **Fresh Topics**: New debate topics posted daily
- **Level Separation**: Beginner, Intermediate, Advanced
- **Group Limits**: Max 5 groups per level, 10 users per group
- **Topic Agreement**: Users must agree to debate topic before joining
- **Host Privileges**: Group creators can moderate discussions

### Admin Panel
- **User Management**: View, suspend, or ban users
- **Content Management**: Add/edit lessons and debate topics
- **Moderation**: Review reports and manage community
- **Analytics**: Platform usage statistics and insights

## 🎨 UI/UX Design

### Design System
- **Theme**: Dark mode with `bg-gray-900` backgrounds
- **Typography**: Clean, readable fonts with proper hierarchy
- **Colors**: Blue accent (`bg-blue-600`) for primary actions
- **Layout**: Flexbox and Grid for responsive design
- **Components**: Rounded corners (`rounded-xl`), subtle shadows (`shadow-xl`)

### Navigation Structure
```
Homepage
├── Hero Section (Welcome message)
├── How It Works (3-step process)
└── Join Now (Call-to-action)

Dashboard (After Login)
├── Learn Section (Lessons & Quizzes)
├── Random Partner Chat (5 daily matches)
├── Night Debate Groups (Evening schedule)
├── My Progress (Statistics)
└── Settings (Profile management)

Group List Page
├── Filter by Level
├── Available Groups (with participant counts)
├── Join Buttons (with topic agreement modal)
└── Create Group (if eligible)

Chat Interface
├── Message History (with timestamps)
├── Voice/Text Input
├── Reaction Buttons
└── Report/Block Options
```

## 📱 User Experience Flow

### New User Journey
1. **Signup**: Email/password registration (no confirmation needed)
2. **Level Selection**: Choose English level (Beginner/Intermediate/Advanced)
3. **Dashboard**: Overview of available features
4. **First Lesson**: Complete introductory content
5. **Daily Quiz**: Test knowledge with level-appropriate questions
6. **Random Match**: Request first partner conversation
7. **Group Debate**: Join evening discussion (optional)

### Daily Usage Pattern
1. **Morning/Anytime**: Complete lessons and take daily quiz
2. **Throughout Day**: Use random partner matches (up to 5)
3. **Evening**: Join group debates (8-11 PM)
4. **Progress Review**: Check statistics and achievements

## 🔧 Technical Implementation

### Database Functions
- `find_random_partner()` - Smart matching algorithm
- `create_partner_chat()` - Initialize chat sessions
- `request_random_match()` - Handle match requests with queuing
- `create_debate_group()` - Group creation with validation
- `can_user_create_group()` - Check creation eligibility
- `join_group()` - Group joining with capacity checks
- `cleanup_expired_chats()` - Automatic data cleanup
- `get_user_stats()` - Comprehensive user statistics

### Real-time Features
- **Live Chat**: Instant message delivery via Supabase Realtime
- **Presence Indicators**: Show who's online in groups
- **Group Updates**: Real-time participant counts
- **Match Notifications**: Instant partner match alerts

### Voice Message System
- **Recording**: Web Audio API with format conversion
- **Storage**: Supabase Storage with automatic transcription
- **Playback**: Speed controls, seeking, volume adjustment
- **Compression**: Optimized file sizes for performance

## 📈 Content Structure

### Beginner Level (500 core words)
- **Grammar**: Present tense, basic questions, simple sentences
- **Vocabulary**: Greetings, family, colors, numbers, food
- **Debates**: Simple preferences (Cats vs Dogs, Pizza vs Burgers)

### Intermediate Level (1,500 words)
- **Grammar**: Past/future tense, conditionals, comparatives
- **Vocabulary**: Emotions, work, travel, technology
- **Debates**: Nuanced topics (Remote work vs Office, Social media impact)

### Advanced Level (3,000+ words)
- **Grammar**: Perfect tenses, complex conditionals, passive voice
- **Vocabulary**: Academic, business, abstract concepts
- **Debates**: Complex issues (AI creativity, Climate responsibility)

## 🛠️ Development Setup

### Prerequisites
- Node.js (v20.19.0 or higher)
- npm or yarn
- Supabase account

### Installation
```bash
# Clone the repository
git clone <repository-url>
cd hadalhub

# Install dependencies
npm install

# Start development server
npm run dev
```

### Environment Variables
Create a `.env.local` file:
```
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key_here
```

⚠️ **SECURITY NOTE**: Never commit `.env.local` or any files containing API keys to version control.

### Database Setup
The database is already configured with:
- 13 tables with proper relationships
- Row Level Security policies
- Initial content (24 debate topics, 10 lessons, 3 daily quizzes)
- Essential database functions

## 🔄 API Endpoints

### Authentication
- `POST /auth/signup` - User registration
- `POST /auth/signin` - User login
- `POST /auth/signout` - User logout
- `POST /auth/reset-password` - Password reset

### Learning
- `GET /api/lessons?level=beginner` - Get lessons by level
- `GET /api/quizzes/daily?level=intermediate` - Get daily quiz
- `POST /api/quiz-attempts` - Submit quiz answers
- `GET /api/user/progress` - Get learning progress

### Chat System
- `POST /api/match/request` - Request random partner
- `GET /api/chat/sessions` - Get user's chat sessions
- `POST /api/messages` - Send message
- `GET /api/messages?session_id=xxx` - Get chat messages

### Groups
- `GET /api/groups?level=advanced` - Get available groups
- `POST /api/groups` - Create new group
- `POST /api/groups/:id/join` - Join group
- `GET /api/debate-topics?level=beginner` - Get debate topics

## 🎯 Business Logic

### Daily Limits
- **Random Matches**: 5 per user per day (resets at midnight)
- **Group Creation**: 1 per user per day
- **Quiz Attempts**: 3 per quiz with 2-hour cooldown

### Level Restrictions
- **Group Limits**: Maximum 5 groups per English level
- **Matching Compatibility**: 
  - Beginners ↔ Beginners, Intermediates
  - Intermediates ↔ All levels
  - Advanced ↔ Intermediates, Advanced

### Content Management
- **Topic Uniqueness**: No duplicate debate topics per level per night
- **Lesson Progression**: Sequential unlock based on completion
- **Quiz Passing**: 80% score required to advance

## 🔍 Monitoring & Analytics

### User Metrics
- Daily active users
- Lesson completion rates
- Quiz pass rates
- Chat session duration
- Group participation

### Content Performance
- Most popular debate topics
- Lesson effectiveness scores
- Common quiz mistakes
- User progression patterns

### System Health
- Database performance
- Real-time connection stability
- Voice message upload success
- Error rates and response times

## 🚀 Deployment

### Production Checklist
- [ ] Environment variables configured
- [ ] Database migrations applied
- [ ] RLS policies tested
- [ ] Voice storage configured
- [ ] Admin users created
- [ ] Content seeded
- [ ] Performance optimized
- [ ] Security audited

### Scaling Considerations
- Database sharding for user data
- CDN for voice message delivery
- Load balancing for chat servers
- Caching for frequently accessed content

## 🤝 Contributing

### Development Workflow
1. Fork the repository
2. Create feature branch
3. Implement changes with tests
4. Submit pull request
5. Code review and merge

### Code Standards
- ESLint configuration for code quality
- Prettier for consistent formatting
- Component-based architecture
- Comprehensive error handling
- Accessibility compliance

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🆘 Support

For technical support or questions:
- Create an issue in the repository
- Contact the development team
- Check the documentation wiki

---

**Built with ❤️ for English learners worldwide**
