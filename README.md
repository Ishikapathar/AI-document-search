# AI Document Search - Meet Enzo! 🤖

A smart AI assistant powered by LangChain and LangGraph that searches through your PDF documents and answers questions with personality. Upload your documents, and Enzo will help you find exactly what you need!

## ✨ Special Features

- **Meet Enzo**: Your friendly AI assistant with a unique personality
- **Cute Nicknames**: Enzo gives you a personalized nickname when you introduce yourself
- **Navy Blue Theme**: Beautiful dark blue gradient interface with smooth animations
- **Message Editing**: Edit your previous messages with a single click
- **Smart PDF Switching**: Automatically clears old documents when uploading new ones
- **Real-time Chat**: Streaming responses with source citations
- **New Conversation Button**: Quickly start fresh conversations

## 🚀 Quick Start

### Prerequisites

- Node.js v18 or higher
- Yarn package manager
- OpenAI API key
- Supabase account (for vector storage)

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/Ishikapathar/AI-document-search.git
   cd AI-document-search
   ```

2. Install dependencies:
   ```bash
   yarn install
   ```

3. Set up environment variables:

   **Backend** (`backend/.env`):
   ```env
   OPENAI_API_KEY=your-openai-api-key
   SUPABASE_URL=your-supabase-url
   SUPABASE_SERVICE_ROLE_KEY=your-supabase-key
   LANGCHAIN_TRACING_V2=true
   LANGCHAIN_PROJECT=ai-document-search
   ```

   **Frontend** (`frontend/.env`):
   ```env
   NEXT_PUBLIC_LANGGRAPH_API_URL=http://localhost:2024
   LANGGRAPH_INGESTION_ASSISTANT_ID=ingestion_graph
   LANGGRAPH_RETRIEVAL_ASSISTANT_ID=retrieval_graph
   LANGCHAIN_TRACING_V2=true
   ```

4. Set up Supabase:
   - Create a Supabase project
   - Run the SQL setup script in `backend/supabase-setup.sql`
   - This creates the `documents` table and `match_documents` function

5. Start the backend:
   ```bash
   cd backend
   npx @langchain/langgraph-cli dev
   ```

6. Start the frontend (in a new terminal):
   ```bash
   cd frontend
   yarn dev
   ```

7. Open http://localhost:3000 and meet Enzo!

## 🎯 How to Use Enzo

1. **Upload PDFs**: Click the paperclip icon and select your PDF documents (max 5 files, 10MB each)
2. **Ask Questions**: Type your question about the documents
3. **Get Smart Answers**: Enzo will search through your documents and provide answers with source citations
4. **Edit Messages**: Click the edit icon (✏️) on any of your messages to modify them
5. **New Conversation**: Click "New Conversation" in the header to start fresh with new documents

### Pro Tips:
- Introduce yourself to get a cute nickname from Enzo! Try "My name is Sarah"
- Ask "What's your name?" to meet Enzo properly
- Use the "New Conversation" button when switching between different document sets
- Click "View Sources" to see which parts of the document Enzo used for the answer

---

## 🛠️ Technical Architecture

### Backend (LangGraph + TypeScript)
- **Ingestion Graph**: Processes PDFs, extracts text, generates embeddings, stores in Supabase
- **Retrieval Graph**: Handles queries, retrieves relevant documents, generates answers
- **Auto Database Cleanup**: Clears old documents before ingesting new ones

### Frontend (Next.js + React)
- **Navy Blue Theme**: Custom gradient background (blue-950 → blue-900 → slate-900)
- **Scrollable Messages**: Optimized container with overflow handling
- **Message Editing**: In-place editing with save/cancel functionality
- **File Upload**: Drag & drop or click to upload PDFs

### Tech Stack
- **Backend**: Node.js, TypeScript, LangGraph, LangChain
- **Frontend**: Next.js 14, React, Tailwind CSS, shadcn/ui
- **Database**: Supabase (PostgreSQL + pgvector)
- **AI**: OpenAI GPT models, text-embedding-3-small
- **Monitoring**: LangSmith (optional but recommended)

### System Flow
```
1. User uploads PDF → Ingestion Graph
2. PDF parsed → Text extracted → Embeddings generated
3. Embeddings stored in Supabase vector database
4. User asks question → Retrieval Graph
5. Relevant documents retrieved → LLM generates answer
6. Answer streamed to UI with source citations
```

---

## 🎨 Customization

### Change Enzo's Personality
Edit `backend/src/retrieval_graph/prompts.ts`:
```typescript
You are Enzo, a friendly assistant...
```

### Modify UI Colors
Edit `frontend/app/page.tsx`:
```typescript
className="min-h-screen bg-gradient-to-br from-blue-950 via-blue-900 to-slate-900"
```

### Adjust Document Limits
Edit `frontend/app/api/ingest/route.ts`:
- Change `MAX_FILES` for file count limit
- Change `MAX_FILE_SIZE` for size limit

### Configure Retrieval Settings
Edit `frontend/constants/graphConfigs.ts`:
- `k`: Number of documents to retrieve (default: 3)
- Model providers and vector store settings

---

## 🐛 Troubleshooting

### Backend won't start
- Check Node.js version: `node --version` (needs v18+)
- Verify `.env` file exists in `backend/` directory
- Ensure OpenAI API key is valid and has credits

### Frontend can't connect to backend
- Check `NEXT_PUBLIC_LANGGRAPH_API_URL` in `frontend/.env`
- Verify backend is running on port 2024
- Check terminal for backend errors

### PDF upload fails
- Ensure file is under 10MB
- Check file is a valid PDF
- Verify Supabase connection is working

### Enzo uses old PDF data
- Click "New Conversation" button to clear state
- Backend automatically clears database on new uploads
- Restart backend if issue persists

### Messages not scrolling
- Already fixed! Messages container has `overflow-y-auto`
- If issue persists, clear browser cache

---

## 🚢 Deployment

### Backend Deployment
- Deploy to LangGraph Cloud: [Guide](https://langchain-ai.github.io/langgraph/cloud/quick_start/)
- Or self-host: [Guide](https://langchain-ai.github.io/langgraph/how-tos/deploy-self-hosted/)

### Frontend Deployment
- Deploy to Vercel (recommended): `vercel deploy`
- Or Netlify, Railway, etc.
- Update `NEXT_PUBLIC_LANGGRAPH_API_URL` to your deployed backend URL

---

## 📝 Commands Reference

### Stop All Services
```powershell
taskkill /F /IM node.exe
```

### Start Backend
```powershell
cd backend
npx @langchain/langgraph-cli dev
```

### Start Frontend
```powershell
cd frontend
yarn dev
```

---

## 🤝 Contributing

Feel free to fork this project and make it your own! If you add cool features, consider sharing them back.

---

## 📚 Learn More

- [LangChain Documentation](https://js.langchain.com/docs/)
- [LangGraph Documentation](https://langchain-ai.github.io/langgraph/)
- [Supabase Vector Store Guide](https://js.langchain.com/docs/integrations/vectorstores/supabase/)
- [Next.js Documentation](https://nextjs.org/docs)

---

## 📄 License

This project is based on the [Learning LangChain](https://www.oreilly.com/library/view/learning-langchain/9781098167271/) book example, customized with unique features and styling.

---

**Made with ❤️ by Ishikapathar**

*Powered by OpenAI, LangChain, LangGraph, and Supabase*

