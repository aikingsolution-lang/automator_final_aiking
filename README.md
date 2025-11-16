# Automator Final

**World's Most Advanced AI Career System** 🚀

Automator Final is a comprehensive AI-powered career platform designed to revolutionize the job search experience. Our platform combines cutting-edge artificial intelligence with user-friendly interfaces to help job seekers apply faster, get more interviews, and grow their skills.

## 🌟 Key Features

### For Job Seekers
- **🚀 AI-Powered Job Applications**: Automated form filling and application submission
- **📄 ATS-Optimized Resume Builder**: Create resumes that pass Applicant Tracking Systems
- **🎯 Skill Gap Analysis**: Identify missing skills and get personalized learning recommendations
- **🤖 AI Interview Coach**: Practice interviews with real-time feedback and analysis
- **📧 Automated Email Outreach**: Send personalized emails to recruiters
- **📊 Resume Scoring**: Get detailed ATS compatibility scores
- **🎓 Learning Paths**: Structured courses to improve your skills

### For HR Professionals
- **👥 Talent Pool Management**: Comprehensive candidate database with advanced filtering
- **📋 Resume Parsing**: Automatically extract and analyze candidate information
- **🔍 Candidate Matching**: AI-powered job description to candidate matching
- **📈 Analytics Dashboard**: Track recruitment metrics and candidate progress
- **💬 Interview Management**: Schedule and conduct AI-assisted interviews
- **🎯 Skill Assessment**: Evaluate candidate skills with AI-powered tests

## 🛠️ Technology Stack

### Frontend
- **Framework**: Next.js 15 (React 18)
- **Styling**: TailwindCSS
- **UI Components**: Radix UI, Lucide React
- **State Management**: Zustand
- **Animations**: Framer Motion

### Backend
- **Runtime**: Node.js
- **Database**: Firebase Firestore
- **Authentication**: Firebase Auth
- **Storage**: Firebase Storage
- **Email Service**: Nodemailer

### AI/ML
- **Language Model**: Google Gemini API
- **PDF Processing**: pdf2json, pdf-parse
- **Text Analysis**: Custom AI prompts for resume parsing and skill extraction

## 📁 Project Structure

```
automator_final/
├── app/                          # Next.js App Router
│   ├── api/                      # API routes
│   │   ├── parseresume/         # Resume parsing endpoint
│   │   ├── sendemails/          # Email sending endpoint
│   │   └── ...
│   ├── hr/                      # HR dashboard pages
│   ├── interview/               # Interview system
│   ├── course/                  # Learning courses
│   ├── atsresume/              # ATS resume builder
│   └── ...
├── components/                   # Reusable UI components
│   ├── home/                    # Homepage components
│   ├── hr/                      # HR-specific components
│   ├── interview/               # Interview components
│   ├── resume_templates/        # Resume templates
│   └── ui/                      # Base UI components
├── lib/                         # Utility libraries
├── types/                       # TypeScript type definitions
├── firebase/                    # Firebase configuration
├── data/                        # Static data files
└── public/                      # Static assets
```

## 🚀 Getting Started

### Prerequisites

- Node.js (version 18 or higher)
- npm or yarn
- Firebase account (for backend services)
- Google Gemini API key

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/automator_final.git
   cd automator_final
   ```

2. **Install dependencies**
   ```bash
   npm install
   # or
   yarn install
   ```

3. **Set up environment variables**
   Create a `.env.local` file in the root directory:
   ```env
   # Firebase Configuration
   NEXT_PUBLIC_FIREBASE_API_KEY=your_firebase_api_key
   NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_firebase_auth_domain
   NEXT_PUBLIC_FIREBASE_DATABASE_URL=your_firebase_database_url
   NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_firebase_project_id
   NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_firebase_storage_bucket
   NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_firebase_messaging_sender_id
   NEXT_PUBLIC_FIREBASE_APP_ID=your_firebase_app_id
   NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=your_firebase_measurement_id

   # Google Gemini API
   NEXT_PUBLIC_GEMINI_API_KEY=your_gemini_api_key

   # Email Configuration
   NEXT_PUBLIC_GMAIL_USER=your_gmail_user
   NEXT_PUBLIC_GMAIL_PASS=your_gmail_app_password
   NEXT_PUBLIC_RECIPIENT_EMAIL=your_recipient_email
   ```

4. **Run the development server**
   ```bash
   npm run dev
   # or
   yarn dev
   ```

5. **Open your browser**
   Navigate to [http://localhost:3000](http://localhost:3000)

## 🎯 Usage

### For Job Seekers

1. **Sign up/Login** to create your account
2. **Upload your Gemini Key** to get started with AI analysis
2. **Upload your resume** to complete your account.
3. **Complete your profile** with job preferences and target roles
4. **Get skill recommendations** based on real job listings
5. **Practice interviews** with our AI coach
6. **Apply to jobs** using our automated application system

### For HR Professionals

1. **Access the HR dashboard** at `/hr`
2. **Upload candidate resumes** for bulk processing
3. **Search and filter** candidates in the talent pool
4. **Match candidates** to job descriptions using AI
5. **Schedule interviews** and get AI-powered insights
6. **Manage recruitment** pipeline efficiently

## 📊 API Endpoints

### Resume Processing
- `POST /api/parseresume` - Parse and analyze resume files
- `GET /api/skills` - Get skill recommendations
- `POST /api/location` - Location-based job suggestions

### Communication
- `POST /api/sendemails` - Send automated emails
- `POST /api/sendmessage` - Send messages to candidates

### Analysis
- `GET /api/youtube` - Get learning video recommendations
- `POST /api/gemini` - AI-powered analysis endpoints

## 🎨 Features Deep Dive

### AI Resume Parser
- Extracts personal information, skills, experience, and education
- Calculates ATS compatibility scores
- Provides improvement suggestions
- Supports multiple file formats

### Interview System
- AI-generated questions based on job roles
- Real-time speech recognition and analysis
- Video recording and playback
- Comprehensive feedback and scoring

### Learning Platform
- Personalized learning paths
- Video tutorials and courses
- Progress tracking
- Skill assessments and quizzes

### HR Dashboard
- Advanced candidate search and filtering
- Bulk resume processing
- Interview scheduling and management
- Analytics and reporting

## 🔧 Configuration

### Firebase Setup
1. Create a Firebase project at [console.firebase.google.com](https://console.firebase.google.com)
2. Enable Authentication, Firestore, and Storage
3. Add your Firebase configuration to `.env.local`

### Google Gemini API
1. Get an API key from [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Add the key to your environment variables

## 🚀 Deployment

### Vercel (Recommended)
1. Push your code to GitHub
2. Connect your repository to Vercel
3. Add environment variables in Vercel dashboard
4. Deploy automatically

### Other Platforms
The application can be deployed on any platform that supports Next.js:
- Netlify
- AWS Amplify
- Heroku
- Railway

## 🤝 Contributing

We welcome contributions! Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 👥 Team

**Suman Bera** - Project Lead & Developer

## 🙏 Acknowledgments

- Google Gemini for AI capabilities
- Firebase for backend infrastructure
- Radix UI for component library
- TailwindCSS for styling system
- All contributors and users who make this project possible

## 📞 Support

If you encounter any issues or have questions:
- Create an issue on GitHub
- Contact us through the application
- Email: contact@jobformautomator.com

---

**Ready to revolutionize your career? Get started with Automator Final today!** 🚀

*"The future doesn't wait. Neither do you."*
